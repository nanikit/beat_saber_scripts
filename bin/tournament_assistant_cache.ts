import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";
// @deno-types="https://cdn.skypack.dev/fflate/lib/index.d.ts"
import { unzipSync } from "https://cdn.skypack.dev/fflate?min";
import { getMapFromHash } from "../src/beatsaver.ts";

main().catch(console.error);

type Playlist = {
  songs: {
    songName: string;
    hash: string;
    difficulties: {
      characteristic: "Standard";
      name: "Easy" | "Normal" | "Hard" | "Expert" | "ExpertPlus";
    }[];
  }[];
};

async function main() {
  if (Deno.args.length < 1) {
    console.log("플레이리스트를 드래그해주세요.");
    prompt();
    Deno.exit();
  }

  try {
    const jsons = await Promise.all(Deno.args.map((x) => Deno.readTextFile(x)));
    const songs = jsons.flatMap((x) =>
      JSON.parse(x).songs
    ) as Playlist["songs"];

    await Promise.all(songs.map(download));

    prompt("다운로드가 완료되었습니다.");
  } catch (error) {
    console.error(error);
    prompt("다운로드 중 오류가 발생했습니다");
  }
}

const throttle = pLimit(3);

async function download(song: Playlist["songs"][0]): Promise<void> {
  const hash = song.hash.toLowerCase();
  const directory = `DownloadedSongs/${hash}`;
  try {
    const file = await Deno.stat(`${directory}/Info.dat`);
    if (file.size > 0) {
      console.log(`Already downloaded: ${song.songName}`);
    }
  } catch (_error) {
    await forceDownload(hash, directory);
    console.log(`Downloaded: ${song.songName}`);
  }

  const infoJson = await Deno.readTextFile(`${directory}/Info.dat`);
  const info = JSON.parse(infoJson);
  const beatmaps = [];
  for (const { characteristic, name } of song.difficulties) {
    const mode = info?._difficultyBeatmapSets?.find((x: any) =>
      x._beatmapCharacteristicName === characteristic
    );
    const beatmap = mode._difficultyBeatmaps.find((x: any) =>
      x?._difficulty === name
    ) as {
      _customData?: { _suggestions?: string[]; _requirements?: string[] };
    };
    if (!beatmap) {
      console.error(`해당 난이도가 없습니다: ${song.songName} ${name}`);
      return;
    }
    beatmaps.push(beatmap);
  }
  const requirements = beatmaps.flatMap((x) =>
    x._customData?._requirements ?? []
  );
  const suggestions = beatmaps.flatMap((x) =>
    x._customData?._suggestions ?? []
  );
  if (requirements.length) {
    console.log(`${song.songName} requirements: ${requirements.join(", ")}`);
  }
  if (suggestions.length) {
    console.log(`${song.songName} suggestions: ${suggestions.join(", ")}`);
  }
}

async function forceDownload(hash: string, directory: string) {
  const info = await throttle(() => getMapFromHash(hash));
  if (info.versions.length !== 1) {
    console.log(`여러 버전 찾음: ${info.name}`);
  }

  const downloadUrl = info.versions.find((x) => x.hash === hash)?.downloadURL;
  if (!downloadUrl) {
    throw new Error(`다운로드 URL 미발견: ${hash}`);
  }
  const response = await fetch(downloadUrl);
  const buffer = await response.arrayBuffer();
  const unzipped = unzipSync(new Uint8Array(buffer));

  const writes = [] as Promise<void>[];
  await Deno.mkdir(directory, { recursive: true });

  for (const [path, content] of Object.entries(unzipped)) {
    writes.push(Deno.writeFile(`${directory}/${path}`, content));
  }
  await Promise.all(writes);
}
