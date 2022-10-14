import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";
import { BeatsaverMap, getDetailFromId } from "../src/beatsaver.ts";

main();

type Row = { id: string; difficulty?: string; kind: string };

async function main() {
  const text = await Deno.readTextFile("ids.txt");
  const table = text.replaceAll("\r", "").split("\n").map((x) => x.split("\t"));
  await Deno.mkdir("details", { recursive: true });

  const tableFile = "kbsl3_list.md";
  await Deno.writeFile(tableFile, new Uint8Array());

  table.push(["", "", "", "/000"]);
  let kind = "";
  const rows = [] as Row[];
  for (const row of table) {
    if (row[0] !== kind && rows.length) {
      const details = await findDetails(rows.map((row) => row.id));
      const [table, list] = getPlaylist(
        rows.map((r, index) => ({
          detail: details[index],
          difficulty: r.difficulty,
        })),
      );
      (list as any).playlistTitle = `KBSL3 ${kind} draft`;
      await Deno.writeTextFile(
        `kbsl3_${rows[0].kind}.json`,
        JSON.stringify(list, null, 2),
      );
      const text = await Deno.readTextFile(tableFile);
      await Deno.writeTextFile(tableFile, `${text}\n\n${table}`);
      rows.splice(0, rows.length);
    }
    const id = (row[3] as string).match(/\/(\w+)$/)![1];
    rows.push({ id, difficulty: row[2], kind: row[0] });
    kind = row[0];
  }

  console.log("finish");
}

function getPlaylist(maps: { detail: BeatsaverMap; difficulty?: string }[]) {
  for (const map of maps) {
    if (map.detail.versions.length !== 1) {
      throw new Error(
        `Multiple version map found: ${map.detail.id}, ${map.detail.name}`,
      );
    }
  }

  const table = maps.map(({ detail }, index) =>
    [
      detail.name,
      detail.metadata.songAuthorName,
      detail.metadata.levelAuthorName,
      maps[index].difficulty,
      `[${detail.id}](https://beatsaver.com/maps/${detail.id})`,
      `[미리보기](https://skystudioapps.com/bs-viewer/?id=${detail.id})`,
    ].join(" | ")
  ).join("\n");

  return [
    table,
    {
      playlistTitle: "KBSL3 draft",
      playlistAuthor: "KBSL3 map pool team",
      playlistDescription: "",
      customData: {
        AllowDuplicates: false,
      },
      songs: maps.map(({ detail, difficulty }) => ({
        songName: detail.name,
        levelAuthorName: detail.metadata.levelAuthorName,
        hash: detail.versions[0].hash,
        levelid: `custom_level_${detail.versions[0].hash}`,
        difficulties: [
          {
            characteristic: "Standard",
            name: difficulty === "Expert+" ? "ExpertPlus" : difficulty,
          },
        ],
      })),
    },
  ];
}

async function findDetails(
  maps: string[],
): Promise<BeatsaverMap[]> {
  const throttle = pLimit(3);
  const details = await Promise.all(
    maps.map((x) => throttle(() => fetchDetail(x))),
  );
  return details;
}

async function fetchDetail(id: string): Promise<BeatsaverMap> {
  const detailJsonPath = `details/${id}.json`;
  try {
    const json = await Deno.readTextFile(detailJsonPath);
    return JSON.parse(json);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  const detail = await getDetailFromId(id);
  await Deno.writeTextFile(detailJsonPath, JSON.stringify(detail));
  return detail;
}
