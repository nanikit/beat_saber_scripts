import { expect } from "jsr:@std/expect";
import { getPlayedHashesFromSph } from "./get_played_hashes_from_sph.ts";

Deno.test("When parse my sph file", async (test) => {
  const sph = await Deno.readTextFile("test/SongPlayDataSample.json");
  const hashes = getPlayedHashesFromSph(sph);

  await test.step("it should return played hashes", () => {
    expect(hashes).toEqual([
      "custom_level_DFD262775728017FD9E26261CA4BEDE1383C4884",
      "custom_level_0D5355D0A16B71C2F47693E37EF3C6241FBEDEC3",
    ]);
  });
});
