import { arrayBufferToHex, getSha1, getSha1FromLevels } from "./beatmap_hasher.ts";
import { assertEquals } from "./test_deps.ts";

const milkCrownHash = "cfca2fe00bcc418dc9ecf64d92fc01ceec52c375";

Deno.test("getSha1(milk crown)", async () => {
  const [info, plus] = await Promise.all([
    Deno.readFile("test/3036/info.dat"),
    Deno.readFile("test/3036/ExpertPlus.dat"),
  ]);

  const sha1 = await getSha1([info, plus]);
  assertEquals(arrayBufferToHex(sha1), milkCrownHash);
});

Deno.test("getSha1FromLevels(milk crown)", async () => {
  const sha1 = await getSha1FromLevels("test/3036");
  assertEquals(arrayBufferToHex(sha1!), milkCrownHash);
});
