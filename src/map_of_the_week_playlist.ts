type MapOfTheWeekData = {
  map: {
    metadata: {
      songName: string;
      levelAuthorName: string;
    };
    versions: {
      hash: string;
    }[];
  };
}[];

if (import.meta.main) {
  main();
}

async function main() {
  const htmls = await Promise.all(
    [...Array(13).keys()].map((idx) => Deno.readTextFile(`tmp/map_of_the_week_${idx + 1}.html`)),
  );

  const maps = htmls.flatMap(extractMapInfo);

  const cover = await readBase64(
    "https://bsaber.com/uploads/communities/beastsaber-logo-fullsize-square.jpg",
  );

  const playlist = {
    playlistTitle: "Map of the Week",
    playlistAuthor: "BeastSaber",
    playlistDescription: "",
    songs: maps.map((x) => ({
      songName: x.songName,
      levelAuthorName: x.levelAuthorName,
      hash: x.hash.toUpperCase(),
      levelid: `custom_level_${x.hash.toUpperCase()}`,
    })),
    image: cover,
  };

  await Deno.writeTextFile("map_of_the_week.json", JSON.stringify(playlist, null, 2));
}

async function readBase64(url: string) {
  const coverResponse = await fetch(url);
  const cover = await coverResponse.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(cover);
    reader.onload = () => resolve(reader.result as string);
  });
}

function extractMapInfo(html: string) {
  const data = html.match(/const data = (\[.*?);\n/)!;
  const dataGet = new Function(`return ${data[1]}[1].data.mapsOfTheWeek`);
  const maps = dataGet() as MapOfTheWeekData;
  return maps.map(({ map }) => {
    const hash = map.versions[0].hash;
    return { hash, ...map.metadata };
  });
}

export async function saveAllMapsOfTheWeek() {
  for (let idx = 1; idx <= 13; idx++) {
    await saveMapOfTheWeek(idx);
  }
}

async function saveMapOfTheWeek(idx: number) {
  const response = await fetch(`https://bsaber.com/maps-of-the-week/${idx}`);
  const html = await response.text();
  await Deno.writeTextFile(`tmp/map_of_the_week_${idx}.html`, html);
}
