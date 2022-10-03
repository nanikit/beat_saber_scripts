import { BeatsaverMap, getDetailFromId } from "../src/beatsaver.ts";

async function getMapIds(ids: string[]) {
  const details = await findDetails(ids);

  if (details.findIndex((x) => x.versions.length !== -1)) {
    throw new Error("Multiple version map found!");
  }

  const table = details.map((detail) =>
    [
      detail.name,
      detail.metadata.songAuthorName,
      detail.metadata.levelAuthorName,
      "Expert+",
      `[${detail.id}](https://beatsaver.com/maps/${detail.id})`,
      `[미리보기](https://skystudioapps.com/bs-viewer/?id=${detail.id})`,
    ].join(" | ")
  ).join("\n");
  await Deno.writeTextFile("list.md", table);

  const playlist = {
    playlistTitle: "KBSL3 draft",
    playlistAuthor: "KBSL3 map pool team",
    playlistDescription: "",
    customData: {
      AllowDuplicates: false,
    },
    songs: details.map((detail) => ({
      songName: detail.name,
      levelAuthorName: detail.metadata.levelAuthorName,
      hash: detail.versions[0].hash,
      levelid: `custom_level_${detail.versions[0].hash}`,
      difficulties: [
        {
          characteristic: "Standard",
          name: "ExpertPlus",
        },
      ],
    })),
  };
  await Deno.writeTextFile("kbsl3_.json", JSON.stringify(playlist, null, 2));
}

async function findDetails(ids: string[]): Promise<BeatsaverMap[]> {
  const detailJsonPath = "details.json";

  try {
    const json = await Deno.readTextFile(detailJsonPath);
    return JSON.parse(json);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  const details = await Promise.all(ids.map(getDetailFromId));
  await Deno.writeTextFile(detailJsonPath, JSON.stringify(details));
  return details;
}

async function main() {
  await getMapIds(Deno.args);
}

main();
