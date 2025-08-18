import { pooledMap } from "jsr:@std/async@^1/pool";
import { arrayBufferToHex, getSha1FromLevels } from "./beatmap_hasher.ts";
import { InfoDat, isV2OrV3, v2ToV4 } from "./info_dat.ts";

export type Duplication = {
  hash: string;
  name: string;
  paths: string[];
};

export async function findDuplicates(customLevelsPath: string): Promise<Duplication[]> {
  const hashMap = new Map<string, string[]>();

  const entries = pooledMap(10, Deno.readDir(customLevelsPath), async (entry) => {
    if (!entry.isDirectory) return;

    const levelPath = `${customLevelsPath}/${entry.name}`;
    const hash = await getSha1FromLevels(levelPath);
    if (!hash) return;

    return { hash: arrayBufferToHex(hash), path: levelPath };
  });

  for await (const entry of entries) {
    if (!entry) continue;

    const { hash, path } = entry;
    const existing = hashMap.get(hash);
    hashMap.set(hash, [...(existing ?? []), path]);
  }

  const duplicates = pooledMap(10, hashMap.entries(), async ([hash, paths]) => {
    if (paths.length === 1) return [];

    const json = await Deno.readTextFile(`${paths[0]}/info.dat`);
    const name = findFlavorName(json, paths);

    return [{ hash, name, paths }];
  });

  return (await Array.fromAsync(duplicates)).flat();
}

export function findFlavorName(json: string, paths: string[]) {
  const info = JSON.parse(json) as InfoDat;
  const v4 = isV2OrV3(info) ? v2ToV4(info) : info;
  const { title } = v4.song;
  const names = paths.map((path) => path.split("/").pop()!);
  const name = names.toSorted(chainComparators(
    (a) => -a.indexOf(`(${title}`),
    (a) => a.indexOf(title) === -1 ? Infinity : a.indexOf(title),
  ))[0];

  if (!name) {
    throw new Error("No name found");
  }
  return name;
}

function chainComparators<T>(...comparators: ((a: T) => number)[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const comparator of comparators) {
      const aResult = comparator(a);
      const bResult = comparator(b);
      if (aResult !== bResult) return aResult - bResult;
    }
    return 0;
  };
}
