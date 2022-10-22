import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";
import { BeatsaverMap, getDetailFromId } from "../src/beatsaver.ts";

main();

type Row = { id: string; difficulty?: string; kind: string };

async function main() {
  const text = await Deno.readTextFile("ids.txt");
  const table = text.replaceAll("\r", "").split("\n");
  await Deno.mkdir("details", { recursive: true });

  const tableFile = "kbsl3_list.md";
  await Deno.writeFile(tableFile, new Uint8Array());

  let previousKind = "";
  const rows = [] as Row[];
  let cover: string | undefined;
  let title: string | undefined;
  let fileName: string | undefined;
  table.push("\t\t\t\t/00");
  for (const row of table) {
    if (row.trim() === "") {
      continue;
    }
    if (row.startsWith("title:")) {
      title = row.replace("title:", "").trim();
      continue;
    }
    if (row.startsWith("name:")) {
      fileName = row.replace("name:", "").trim();
      continue;
    }
    if (row.startsWith("cover:")) {
      const path = row.replace("cover:", "").trim();
      const file = await Deno.readFile(path);
      cover = await uint8ArrayToDataUrl(file);
      cover = cover.replace("data:application/octet-stream;", "");
      continue;
    }

    const [kind, _phase, _title, difficulty, url] = row.split("\t");
    if (kind !== previousKind && rows.length) {
      const details = await findDetails(rows.map((row) => row.id));
      const [table, list] = getPlaylist(
        rows.map((r, index) => ({
          detail: details[index],
          difficulty: r.difficulty,
        })),
      );
      (list as any).playlistTitle = title ?? `KBSL3 ${previousKind} draft`;
      title = undefined;
      if (cover) {
        (list as any).image = cover;
        cover = undefined;
      }
      await Deno.writeTextFile(
        fileName ?? `kbsl3_${rows[0].kind}.json`,
        JSON.stringify(list, null, 2),
      );
      fileName = undefined;

      const text = await Deno.readTextFile(tableFile);
      await Deno.writeTextFile(tableFile, `${text}\n\n${table}`);
      rows.splice(0, rows.length);
    }
    previousKind = kind;
    const id = (url as string).match(/\/(\w+)$/)![1];
    rows.push({ id, difficulty, kind });
  }

  console.log("finish");
}
const uint8ArrayToDataUrl = async (data: Uint8Array) => {
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(new Blob([data]));
  });
  /*
  "data:application/octet-stream;base64,<your base64 data>",
  */
  return dataUrl;
};

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
      detail.metadata.songName,
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
        songName: detail.metadata.songName,
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
