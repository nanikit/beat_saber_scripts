import { assert, assertEquals, assertIsError } from "jsr:@std/assert@^1";
import { restore, stub } from "jsr:@std/testing@^1/mock";
import { BeatsaverMap } from "./beatsaver.ts";
import { downloadAll } from "./downloader.ts";

Deno.test("Given sample maps", async (test) => {
  const maps = [{
    id: "1008d",
    songName: "Gypsytronic",
    levelAuthorName: "Emir",
  }, {
    id: "100e6",
    songName: "Flowering",
    levelAuthorName: "Bloodcloak",
  }];

  stub(globalThis, "fetch", (url) => {
    if (typeof url !== "string") {
      throw new Error("invalid url");
    }
    const id = url.split("/").at(-1);

    const map = maps.find((map) => map.id === id);
    if (!map) {
      throw new Error("invalid url");
    }

    return Promise.resolve({
      json: () => ({
        id,
        metadata: {
          songName: map.songName,
          levelAuthorName: map.levelAuthorName,
        },
        versions: [{ downloadURL: `https://cdn.beatsaver.com/maps/${id}` }],
      } as BeatsaverMap),
      blob: () => new Blob([`${id}`]),
    } as unknown as Response);
  });

  await test.step("when download single map", async (test) => {
    const names = maps.slice(0, 1).map((map) =>
      `${map.id} (${map.songName} - ${map.levelAuthorName})`
    ).join("\n");
    const result = await Array.fromAsync(downloadAll(names));

    await test.step("it should pass name and blob", async () => {
      assertEquals(result.length, 1);

      const map = result[0];
      assert(!(map instanceof Error));
      assertEquals(map.name, "1008d (Gypsytronic - Emir).zip");
      assertEquals(await map.blob.bytes(), new TextEncoder().encode("1008d"));
    });
  });

  await test.step("when download unpublished map", async (test) => {
    const names = "10000 (unpublished - who)";
    const result = await Array.fromAsync(downloadAll(names));

    await test.step("it should pass error", () => {
      assertEquals(result.length, 1);

      const map = result[0];
      assertIsError(map, Error, "id 10000 download failure");
    });
  });

  await test.step("when download multiple maps", async (test) => {
    const names = maps.map((map) => `${map.id} (${map.songName} - ${map.levelAuthorName})`).join(
      "\n",
    );
    const result = await Array.fromAsync(downloadAll(names));

    await test.step("it should pass name and blob", () => {
      assertEquals(result.length, maps.length);

      const names = result.map((map) => map.name);
      assertEquals(
        new Set(names),
        new Set([
          "1008d (Gypsytronic - Emir).zip",
          "100e6 (Flowering - Bloodcloak).zip",
        ]),
      );
    });
  });

  restore();
});
