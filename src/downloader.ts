import { limitParallelism } from "../deps.ts";
import { BeatsaverMap, getDetailUrlFromId } from "./beatsaver.ts";

const downloadLatest = async (
  id: string,
  { fetch }: {
    fetch: typeof self.fetch;
  },
): Promise<{ name: string; blob: Blob }> => {
  let response = await fetch(getDetailUrlFromId(id));
  const json = await response.json() as BeatsaverMap;
  const { versions } = json;
  if (versions.length !== 1) {
    throw new Error(`not sole version: ${id}`);
  }

  const url = versions![0].downloadURL;
  response = await fetch(url);
  const disposition = response.headers.get("content-disposition");
  let name = disposition!.match(/filename="(.*?)"/)![1];
  name = name.replace(/\?/g, "_");
  const blob = await response.blob();

  return { name, blob };
};

export async function* downloadAll(
  ids: string,
  { fetch: realFetch }: {
    fetch?: typeof self.fetch;
    log?: typeof console.log;
  },
) {
  const fetch = realFetch ?? self.fetch;

  const pattern = /^\s*?([0-9a-f]+)\b/gm;
  const extractedIds = [...ids.matchAll(pattern)].map(([, id]) => id);

  const limiter = limitParallelism(3);
  let tasks = extractedIds.map((id) =>
    limiter(() => downloadLatest(id, { fetch }))
  );

  while (tasks.length > 0) {
    let completePromise: Promise<unknown>;
    try {
      [completePromise] = await Promise.race(
        tasks.map((promise) => promise.then(() => [promise], () => [promise])),
      );
      yield completePromise;
    } catch (error) {
      yield error;
    } finally {
      tasks = tasks.filter((x) => x !== completePromise);
    }
  }
}
