import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";
// @deno-types="https://cdn.skypack.dev/fflate/lib/index.d.ts"
import { unzipSync } from "https://cdn.skypack.dev/fflate?min";
import { getMapFromHash } from "../src/beatsaver.ts";

main().catch(console.error);

type Playlist = {
  songs: {
    songName: string;
    hash: string;
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
  const { hash } = song;
  const directory = `DownloadedSongs/${hash.toLowerCase()}`;
  try {
    const file = await Deno.stat(`${directory}/Info.dat`);
    if (file.size > 0) {
      console.log(`Already downloaded: ${song.songName}`);
      return;
    }
  } catch (_error) {
    // File is not exist. continue.
  }

  const info = await throttle(() => getMapFromHash(hash));
  if (info.versions.length !== 1) {
    console.log(`여러 버전 찾음: ${info.name}`);
  }

  const response = await fetch(
    info.versions[info.versions.length - 1].downloadURL,
  );
  const buffer = await response.arrayBuffer();
  const unzipped = unzipSync(new Uint8Array(buffer));

  const writes = [] as Promise<void>[];
  await Deno.mkdir(directory, { recursive: true });

  for (const path of Object.keys(unzipped)) {
    writes.push(Deno.writeFile(`${directory}/${path}`, unzipped[path]));
  }
  await Promise.all(writes);

  console.log(`Downloaded: ${song.songName}`);
}
