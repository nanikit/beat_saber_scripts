import { expect } from "jsr:@std/expect";
import { getPlayedHashesFromSph } from "./get_played_hashes_from_sph.ts";

Deno.test("When parse my sph file", async (test) => {
  const sph = await Deno.readTextFile(Deno.env.get("SPH_PATH")!);
  const hashes = getPlayedHashesFromSph(sph);

  await test.step("it should return played hashes", () => {
    expect(hashes.length).toBeGreaterThan(0);
    console.log(hashes);
  });
});
