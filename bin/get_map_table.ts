import { getDetailFromId } from "../src/beatsaver.ts";

async function getMapIds(ids: string[]) {
  for (const id of ids) {
    const detail = await getDetailFromId(id);
    console.log([
      detail.name,
      detail.metadata.songAuthorName,
      detail.metadata.levelAuthorName,
      "Expert+",
      `[${id}](https://beatsaver.com/maps/${id})`,
      `[미리보기](https://skystudioapps.com/bs-viewer/?id=${id})`,
    ].join(" | "));
  }
}

async function main() {
  await getMapIds(Deno.args);
}

main();
