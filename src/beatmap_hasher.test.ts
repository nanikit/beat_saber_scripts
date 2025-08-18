import { arrayBufferToHex, getSha1, getSha1FromLevels } from "./beatmap_hasher.ts";
import { assertEquals } from "./test_deps.ts";

const milkCrownHash = "cfca2fe00bcc418dc9ecf64d92fc01ceec52c375";
const ticTacToeHash = "1dea7777801f76d0a5d0c73b24e83394c006f19f";

Deno.test("getSha1 should get correct hash from v2 map", async () => {
  const [info, plus] = await Promise.all([
    Deno.readFile("test/3036 (Milk Crown on Sonnetica - hexagonial)/info.dat"),
    Deno.readFile("test/3036 (Milk Crown on Sonnetica - hexagonial)/ExpertPlus.dat"),
  ]);

  const sha1 = await getSha1([info, plus]);
  assertEquals(arrayBufferToHex(sha1), milkCrownHash);
});

Deno.test("getSha1FromLevels should get correct hash from v2 map", async () => {
  const sha1 = await getSha1FromLevels("test/3036 (Milk Crown on Sonnetica - hexagonial)");
  assertEquals(arrayBufferToHex(sha1!), milkCrownHash);
});

Deno.test("getSha1 should get correct hash from v4 map", async () => {
  const files = await Promise.all([
    Deno.readFile("test/4685e (Tic! Tac! Toe! - GalaxyMaster)/Info.dat"),
    Deno.readFile("test/4685e (Tic! Tac! Toe! - GalaxyMaster)/AudioData.dat"),
    Deno.readFile("test/4685e (Tic! Tac! Toe! - GalaxyMaster)/ExpertPlusStandard.dat"),
    Deno.readFile("test/4685e (Tic! Tac! Toe! - GalaxyMaster)/LightsFor-ExpertPlusStandard.dat"),
  ]);
  const sha1 = await getSha1(files);
  assertEquals(arrayBufferToHex(sha1), ticTacToeHash);
});

Deno.test("getSha1FromLevels should get correct hash from v4 map", async () => {
  const sha1 = await getSha1FromLevels("test/4685e (Tic! Tac! Toe! - GalaxyMaster)");
  assertEquals(arrayBufferToHex(sha1!), ticTacToeHash);
});
