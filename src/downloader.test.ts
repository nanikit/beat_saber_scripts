import { assertEquals } from "./test_deps.ts";
import { downloadAll } from "./downloader.ts";
import { BeatsaverMap } from "./beatsaver.ts";

Deno.test("Given 3 normal and 1 error maps", async (test) => {
  const names = `1008d (Gypsytronic - Emir)
100e6 (Flowering - Bloodcloak)
101a0 (Haachama Channel - Light Ai & xtpn)
23656 (Six_Feet_Under - Wirin)`;
  const info = {
    "1008d": "u0",
    "100e6": "u1",
    "23656": "u2",
  };
  const reverseInfo = Object.fromEntries(
    Object.entries(info).map(([key, value]) => [value, key]),
  );

  await test.step("when request download all", async (test) => {
    const invalid = new Error("invalid url");
    const result = downloadAll(names, {
      fetch: ((url: string) => {
        if (!url) {
          throw invalid;
        }
        const id = url.split("/").findLast(() => true);

        const tag = info[id as keyof typeof info];
        return {
          json: () => ({
            id,
            versions: [{ downloadURL: tag }],
          } as BeatsaverMap),
          blob: () => reverseInfo[url as keyof typeof reverseInfo],
        };
      }) as unknown as typeof fetch,
    });

    await test.step("it should process all of them", async () => {
      const data = [];
      for await (const map of result) {
        data.push(map);
      }

      assertEquals(
        new Set(data),
        new Set([
          {
            blob: "1008d",
            name: "u0 (name_ - author).zip",
          },
          {
            blob: "100e6",
            name: "u1 (name_ - author).zip",
          },
          {
            blob: "23656",
            name: "u2 (name_ - author).zip",
          },
          invalid,
        ]),
      );
    });
  });
});
