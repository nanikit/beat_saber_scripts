import { InfoDat } from "./info_dat.ts";

export async function getSha1(files: Uint8Array[]) {
  const indices = files.reduce((acc, file) => {
    const last = acc.at(-1) ?? 0;
    acc.push(last + file.length);
    return acc;
  }, [0]);
  const joined = new Uint8Array(indices.at(-1) ?? 0);
  indices.slice(0, -1).forEach((position, i) => joined.set(files[i]!, position));
  const sha1 = await crypto.subtle.digest("SHA-1", joined);
  return sha1;
}

export async function getSha1FromLevels(path: string) {
  try {
    const info = await Deno.readFile(`${path}/info.dat`);
    const files = await readFiles(info, path);
    return getSha1([info, ...files]);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
}

export function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readFiles(info: Uint8Array, path: string) {
  const json = new TextDecoder().decode(info);
  const data = JSON.parse(json) as InfoDat;
  const fileNames = getDataFileNames(data);

  const files = await Promise.all(fileNames.map((name) => Deno.readFile(`${path}/${name}`)));
  return files;
}

function getDataFileNames(data: InfoDat) {
  if ("_difficultyBeatmapSets" in data) {
    return data._difficultyBeatmapSets.flatMap((set) =>
      set._difficultyBeatmaps.map((map) => map._beatmapFilename)
    );
  } else {
    return [
      data.audio.audioDataFilename,
      ...data.difficultyBeatmaps.flatMap((
        map,
      ) => [map.beatmapDataFilename, map.lightshowDataFilename]),
    ];
  }
}
