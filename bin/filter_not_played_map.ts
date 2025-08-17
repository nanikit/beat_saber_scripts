import { configSource } from "https://gist.githubusercontent.com/jeiea/73f585b2d1d568f6e53978ab435aaef3/raw/170037a93d71d62c9a83afcda32bbb0364286ac1/config_source.ts";
import { pooledMap } from "jsr:@std/async@^1/pool";
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import { partition } from "jsr:@std/collections@^1/partition";
import { load } from "jsr:@std/dotenv";
import { arrayBufferToHex, getSha1FromLevels } from "../src/beatmap_hasher.ts";

if (import.meta.main) {
  await moveNotPlayedMap();
}

export async function moveNotPlayedMap() {
  const dotEnv = await load();
  const args = parseArgs(Deno.args, {
    string: ["output", "input", "hash"],
    boolean: ["help"],
    alias: { output: "o", input: "i", hash: "k" },
  });
  const getConfig = configSource({ args, getEnv: Deno.env.get, dotEnv });
  const output = getConfig("output", "BS_UNKNOWN_OUTPUT_PATH");
  const input = getConfig("input", "BS_CUSTOM_LEVEL_PATH");
  const hash = getConfig("hash", "BS_KNOWN_HASH_PATH");
  if (!output || !input || !hash || args.help) {
    console.log(
      `Usage: deno run -A ${Deno.mainModule} -i <input> -o <output> -k <hash>`,
    );
    return;
  }

  const { unknown } = await filterNotPlayedMap({
    customLevelsPath: input,
    knownHashesPath: hash,
  });

  await Promise.all(unknown.map(async ([, name]) => {
    await Deno.rename(`${input}/${name}`, `${output}/${name}`);
    console.log(`Moved ${name}`);
  }));
}

export async function filterNotPlayedMap(
  { customLevelsPath, knownHashesPath }: {
    customLevelsPath: string;
    knownHashesPath: string;
  },
) {
  const knownHashText = await Deno.readTextFile(knownHashesPath);
  const knownHashes = new Set(knownHashText.split(/\r?\n/));
  const levelHashToName = await readCustomLevelHashToName(customLevelsPath);

  const [known, unknown] = partition(levelHashToName.entries(), ([hash]) => knownHashes.has(hash));
  return { known, unknown };
}

async function readCustomLevelHashToName(customLevelsPath: string) {
  const asyncPairs = pooledMap(100, Deno.readDir(customLevelsPath), toNameHashPair);
  const pairs = (await Array.fromAsync(asyncPairs)).flat();
  const hashToName = pairs.reduce(
    (acc, { name, hash }) => (acc.set(hash, name), acc),
    new Map<string, string>(),
  );
  return hashToName;

  async function toNameHashPair(entry: Deno.DirEntry) {
    if (!entry.isDirectory) return [];

    const hash = await getSha1FromLevels(`${customLevelsPath}/${entry.name}`);
    return hash ? [{ name: entry.name, hash: arrayBufferToHex(hash) }] : [];
  }
}
