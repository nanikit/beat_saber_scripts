import { getHashFromQuestName, makeBeatsaverDirectory } from "./renamer.ts";
import { assertEquals } from "./test_deps.ts";
import mapData from "../test/39ea1c7f8ecf7f927e2acd072378bc08c94f230a.json" assert {
  type: "json",
};

Deno.test("Given a quest custom level", async (test) => {
  const customLevelPath =
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Beat Saber\\Beat Saber_Data\\CustomLevels";
  const path =
    `${customLevelPath}\\custom_level_39ea1c7f8ecf7f927e2acd072378bc08c94f230a - Copy`;

  await test.step("when give quest custom level name", async (test) => {
    const hash = getHashFromQuestName(path)!;

    await test.step("it should return full hash", () => {
      assertEquals(hash, "39ea1c7f8ecf7f927e2acd072378bc08c94f230a");
    });
  });

  await test.step("when give beatsaver data", async (test) => {
    const fileName = makeBeatsaverDirectory(mapData, { path: path });

    await test.step("it should return beatsaver download file name", () => {
      assertEquals(
        fileName,
        `${customLevelPath}\\1694f (Ringed Genesis - That_Narwhal)`,
      );
    });
  });
});
