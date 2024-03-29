import { limitParallelism } from "../deps.ts";
import { getDetailFromId } from "./beatsaver.ts";

const getSafeFileName = (name: string) => {
  // deno-lint-ignore no-control-regex
  return name.replace(/[<>:"\/\\\|\?\*\x00-\x1f]/g, "_");
};

const downloadLatest = async (
  id: string,
  { fetch }: {
    fetch: typeof self.fetch;
  },
): Promise<{ name: string; arrayBuffer: ArrayBuffer }> => {
  const json = await getDetailFromId(id);
  const { metadata, versions } = json;
  if (versions?.length !== 1) {
    throw new Error(`${id} has not sole version: ${JSON.stringify(json)}`);
  }

  const url = versions![0].downloadURL;
  const response = await fetch(url);
  const { songName, levelAuthorName } = metadata;
  let name = `${id} (${songName} - ${levelAuthorName}).zip`;
  name = getSafeFileName(name);
  const arrayBuffer = await response.arrayBuffer();

  return { name, arrayBuffer };
};

export async function* downloadAll(
  ids: string,
  { fetch: realFetch }: {
    fetch?: typeof self.fetch;
  },
) {
  const fetch = realFetch ?? self.fetch;

  const pattern = /^\s*?([0-9a-f]+)\b/gm;
  const extractedIds = [...ids.matchAll(pattern)].map(([, id]) => id);

  const limiter = limitParallelism(3);
  let tasks = extractedIds.map((id) =>
    limiter(async () => {
      try {
        return await downloadLatest(id, { fetch });
      } catch (error) {
        throw new Error(`id ${id} download failure`, { cause: error });
      }
    })
  );

  while (tasks.length > 0) {
    let completePromise: ReturnType<typeof downloadLatest>;
    try {
      [completePromise] = await Promise.race(
        tasks.map((promise) => promise.then(() => [promise], () => [promise])),
      );
      yield completePromise;
    } catch (error) {
      yield error as Error;
    } finally {
      tasks = tasks.filter((x) => x !== completePromise);
    }
  }
}
