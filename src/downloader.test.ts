import { assertEquals } from "./test_deps.ts";
import { downloadAll } from "./downloader.ts";
import { BeatsaverMap } from "./beatsaver.ts";

Deno.test("Given normalized map names", async (test) => {
  const names = `1008d (Gypsytronic - Emir)
100e6 (Flowering - Bloodcloak)
101a0 (Haachama Channel - Light Ai & xtpn)`;
  const info = {
    "1008d": "u0",
    "100e6": "u1",
    "101a0": "u2",
  };
  const reverseInfo = Object.fromEntries(
    Object.entries(info).map(([key, value]) => [value, key]),
  );

  await test.step("when request download all", async (test) => {
    const logs: unknown[] = [];
    const result = downloadAll(names, {
      fetch: ((url: string) => {
        const id = url.split("/").findLast(() => true);
        const tag = info[id as keyof typeof info];
        return {
          headers: {
            get: () => `attachment; filename="${id} (name? - author).zip"`,
          },
          json: () => ({
            id,
            versions: [{ downloadURL: tag }],
          } as BeatsaverMap),
          blob: () => reverseInfo[url as keyof typeof reverseInfo],
        };
      }) as unknown as typeof fetch,
      log: (...objs) => logs.push(objs),
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
            blob: "101a0",
            name: "u2 (name_ - author).zip",
          },
        ]),
      );
      assertEquals(logs, []);
    });
  });
});
