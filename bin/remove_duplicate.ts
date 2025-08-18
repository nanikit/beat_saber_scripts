/**
 * Removes duplicate Beat Saber levels by comparing their SHA-1 hashes.
 * When duplicates are found, keeps the one with the preferred naming format.
 */
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import { findDuplicates } from "../src/find_duplicate.ts";

main();

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "dry-run"],
  });

  const customLevelsPath = args._[0];
  if (typeof customLevelsPath !== "string" || args.help) {
    printHelp();
    return;
  }

  console.info(`Scanning for duplicates in: ${customLevelsPath}`);
  await removeDuplicateCommand(customLevelsPath, { dryRun: args["dry-run"] });
}

/**
 * Find duplicates and print them (and delete them if dryRun is false)
 *
 * Example output:
 * ```
 * > 37483 (Moon Halo - Pleo) (keeping)
 *   37483 (Pleo - Moon Halo) (removing)
 * > 3036 (Milk Crown on Sonnetica - hexagonial) (keeping)
 *   3036 (hexagonial - Milk Crown on Sonnetica) (removing)
 * ```
 *
 * @param customLevelsPath - The path to the custom levels directory
 * @param dryRun - If true, print what would be deleted without actually deleting
 */
async function removeDuplicateCommand(customLevelsPath: string, { dryRun }: { dryRun: boolean }) {
  const duplicates = await findDuplicates(customLevelsPath);

  if (duplicates.length === 0) {
    console.info("No duplicate levels found.");
    return;
  }

  console.info(`Found ${duplicates.length} duplicate groups:`);
  console.info("");

  let totalToRemove = 0;

  for (const duplicate of duplicates) {
    const { name, paths } = duplicate;
    const toKeep = paths.find((path) => path.endsWith(name));
    const toRemove = paths.filter((path) => path !== toKeep);

    totalToRemove += toRemove.length;

    console.info(`> ${name} (keeping)`);
    for (const removePath of toRemove) {
      const removeName = removePath.split("/").pop()!;
      console.info(`  ${removeName} (${dryRun ? "would remove" : "removing"})`);

      if (!dryRun) {
        try {
          await Deno.remove(removePath, { recursive: true });
        } catch (error) {
          console.error(`    Failed to remove ${removePath}: ${error}`);
        }
      }
    }
  }

  if (dryRun) {
    console.info(`Dry run complete. Would remove ${totalToRemove} duplicate levels.`);
  } else {
    console.info(`Removed ${totalToRemove} duplicate levels.`);
  }
}

function printHelp() {
  console.info(`Usage: deno run -A ${Deno.mainModule} [--dry-run] <CustomLevels>

Sometimes there are duplicate beat saber levels like this:
37483 (Pleo - Moon Halo) <- in-game downloader's name format
37483 (Moon Halo - Pleo) <- other downloader's name format

This unify the levels to other downloader's name format.

Options:
  --dry-run    Show what would be deleted without actually deleting
  --help       Show this help message`);
}
