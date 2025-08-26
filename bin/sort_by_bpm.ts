/**
 * Sorts Beat Saber levels by BPM and displays BPM and level name.
 */
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import { join } from "jsr:@std/path@^1";
import { InfoDat, isV2OrV3 } from "../src/info_dat.ts";

main();

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help"],
  });

  const customLevelsPath = args._[0];
  if (typeof customLevelsPath !== "string" || args.help) {
    printHelp();
    return;
  }

  console.info(`Sorting levels by BPM in: ${customLevelsPath}`);
  await sortByBpmCommand(customLevelsPath);
}

async function sortByBpmCommand(customLevelsPath: string) {
  const levels: Array<{ name: string; bpm: number }> = [];

  try {
    for await (const dirEntry of Deno.readDir(customLevelsPath)) {
      if (dirEntry.isDirectory) {
        const levelPath = join(customLevelsPath, dirEntry.name);
        const infoDatPath = join(levelPath, "Info.dat");

        try {
          const infoContent = await Deno.readTextFile(infoDatPath);
          const infoDat: InfoDat = JSON.parse(infoContent);

          let bpm: number;
          if (isV2OrV3(infoDat)) {
            bpm = infoDat._beatsPerMinute;
          } else {
            bpm = infoDat.audio.bpm;
          }

          levels.push({
            name: dirEntry.name,
            bpm: bpm,
          });
        } catch {
          // Skip levels without valid Info.dat
        }
      }
    }
  } catch (error) {
    console.error(`Failed to read directory: ${error}`);
    return;
  }

  if (levels.length === 0) {
    console.info("No valid Beat Saber levels found.");
    return;
  }

  // Sort by BPM (ascending)
  levels.sort((a, b) => a.bpm - b.bpm);

  console.info(`Found ${levels.length} levels, sorted by BPM:`);
  console.info("");

  for (const level of levels) {
    console.info(`${level.bpm.toFixed(0).padStart(3)} BPM - ${level.name}`);
  }
}

function printHelp() {
  console.info(`Usage: deno run -A ${Deno.mainModule} <CustomLevels>

Sorts Beat Saber levels by BPM and displays BPM with level names.

Arguments:
  <CustomLevels>  Path to the Beat Saber CustomLevels directory

Options:
  --help          Show this help message`);
}
