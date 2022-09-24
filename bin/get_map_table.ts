import { getDetailFromId } from "../src/beatsaver.ts";

type ScoreboardLevel = {
  name: string;
  diff: string;
  code: string;
  hash: string;
  note: number;
};

async function getMapIds() {
  for (let i = 0; i < 4; i++) {
    const response = await fetch(
      `https://raw.githubusercontent.com/DetegiCE/KBSL3-Qualifiers-Scoreboard/main/data/songs/songs${
        i + 1
      }.json`,
    );
    const json = (await response.json()) as { songs: ScoreboardLevel[] };
    console.log(`Processing index songs${i + 1}.json.`);
    for (const level of json.songs) {
      const detail = await getDetailFromId(level.code);
      console.log([
        level.name,
        detail.metadata.songAuthorName,
        detail.metadata.levelAuthorName,
        level.diff,
        `[${level.code}](https://beatsaver.com/maps/${level.code})`,
        `[미리보기](https://skystudioapps.com/bs-viewer/?id=${level.code})`,
      ].join(" | "));
    }
  }
}

async function main() {
  await getMapIds();
}

main();
