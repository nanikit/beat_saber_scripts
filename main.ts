import { getMapFromHash } from "./src/beatsaver.ts";
import { getHashFromQuestName, makeBeatsaverDirectory } from "./src/renamer.ts";
import { parse } from "./deps.ts";

const rename = async (path: string) => {
  const hash = getHashFromQuestName(path);
  if (!hash) {
    return;
  }

  const map = await getMapFromHash(hash);
  const newPath = makeBeatsaverDirectory(map, { path });
  await Deno.rename(path, newPath);
  return newPath;
};

const main = async () => {
  const paths = Deno.args;
  if (paths.length === 0) {
    console.log("usage: deno main.ts paths...");
  }

  for (const path of paths) {
    const newPath = await rename(path);
    if (newPath) {
      const { name, ext } = parse(newPath);
      console.log(`${path} -> ${name}${ext}`);
    } else {
      console.log(`fail: ${path}`);
    }
  }
};

main().catch(console.error);
