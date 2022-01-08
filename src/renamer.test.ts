import { assertEquals, beforeAll, describe, it } from "./test_deps.ts";
import { getHashFromQuestName, makeBeatsaverDirectory } from "./renamer.ts";
import mapData from "../test/39ea1c7f8ecf7f927e2acd072378bc08c94f230a.json" assert {
  type: "json",
};

describe("Given a quest custom level", () => {
  const customLevelPath =
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Beat Saber\\Beat Saber_Data\\CustomLevels";
  const path =
    `${customLevelPath}\\custom_level_39ea1c7f8ecf7f927e2acd072378bc08c94f230a - Copy`;

  describe("when give quest custom level name", () => {
    let hash: string;

    beforeAll(() => {
      hash = getHashFromQuestName(path)!;
    });

    it("it should return full hash", () => {
      assertEquals(hash, "39ea1c7f8ecf7f927e2acd072378bc08c94f230a");
    });
  });

  describe("when give beatsaver data", () => {
    let fileName: string;

    beforeAll(() => {
      // https://beatsaver.com/api/maps/hash/39ea1c7f8ecf7f927e2acd072378bc08c94f230a
      fileName = makeBeatsaverDirectory(mapData, { path: path });
    });

    it("it should return beatsaver download file name", () => {
      assertEquals(
        fileName,
        `${customLevelPath}\\1694f (Ringed Genesis - That_Narwhal)`,
      );
    });
  });
});
