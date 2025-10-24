import { delay } from "jsr:@std/async@^1/delay";
import { chunk } from "jsr:@std/collections@^1/chunk";
import { BeatsaverMap, getDetailFromIds } from "../src/beatsaver.ts";

if (import.meta.main) {
  main();
}

async function main() {
  const filePath = Deno.args[0];
  if (!filePath) {
    console.error(`Usage: deno -A ${Deno.mainModule} <id>`);
    Deno.exit(1);
  }

  const idText = await Deno.readTextFile(filePath);
  const allIds = idText.replaceAll("\r", "").split("\n").filter((id) => id.trim() !== "");

  using file = await Deno.open(`${filePath}.tsv`, { write: true, create: true, append: true });
  const encoder = new TextEncoderStream();
  encoder.readable.pipeTo(file.writable);
  const writer = encoder.writable.getWriter();

  let isFirst = true;
  for (const ids of chunk(allIds, 20)) {
    if (isFirst) {
      isFirst = false;
    } else {
      await delay(2000);
    }

    let maps: Record<string, BeatsaverMap> | undefined;
    try {
      maps = await getDetailFromIds(ids);
      console.info(`${ids} fetched.`);
    } catch (error) {
      console.error(`${ids} error: ${error}`);
      continue;
    }

    try {
      const lines = Object.values(maps).map(format).join("");
      await writer.write(lines);
    } catch (error) {
      console.error(`${ids} error: ${error}`);
      break;
    }
  }
}

function format(map: BeatsaverMap) {
  const { songName, songAuthorName, levelAuthorName } = map.metadata;
  return `${map.id}\t${songName.trim()} - ${songAuthorName.trim()} (${levelAuthorName.trim()}\n`;
}
