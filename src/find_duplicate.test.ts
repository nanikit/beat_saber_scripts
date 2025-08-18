import { assertArrayIncludes, assertEquals } from "jsr:@std/assert@^1";
import { copy } from "jsr:@std/fs@^1/copy";
import { findDuplicates, findFlavorName } from "./find_duplicate.ts";

Deno.test("find no duplicates on test directory", async () => {
  const duplicates = await findDuplicates("test");

  assertEquals(duplicates.length, 0);
});

Deno.test("find duplicates", async () => {
  const tempDir = await Deno.makeTempDir();
  await copy("test", tempDir, { overwrite: true });
  const duplicateDir = `${tempDir}/duplicates`;
  await copy("test/4685e (Tic! Tac! Toe! - GalaxyMaster)", duplicateDir);

  const duplicates = await findDuplicates(tempDir);

  assertEquals(duplicates.length, 1);

  const duplicate = duplicates[0]!;
  assertEquals(duplicate.paths.length, 2);
  assertEquals(duplicate.name, "4685e (Tic! Tac! Toe! - GalaxyMaster)");
  assertArrayIncludes(duplicate.paths, [
    `${tempDir}/4685e (Tic! Tac! Toe! - GalaxyMaster)`,
    duplicateDir,
  ]);
  assertEquals(duplicate.hash.length, 40); // SHA1 hash is 40 hex characters
});

Deno.test("findFlavorName prioritizes (title pattern", () => {
  const v4Json = JSON.stringify({
    version: "4.0.1",
    song: {
      title: "Tic! Tac! Toe!",
      subTitle: "",
      author: "TAK x Corbin (NEWTYPE)",
    },
  });

  const paths = [
    "/custom/some_other_name",
    "/custom/4685e (Tic! Tac! Toe! - GalaxyMaster)",
    "/custom/Tic! Tac! Toe! (Expert+)",
  ];

  const name = findFlavorName(v4Json, paths);

  // (title 패턴이 있는 것이 우선, 없으면 음수로 처리되어 더 높은 우선순위
  assertEquals(name, "4685e (Tic! Tac! Toe! - GalaxyMaster)");
});

Deno.test("findFlavorName with v2 prioritizes (title pattern", () => {
  const v2Json = JSON.stringify({
    _version: "2.0.0",
    _songName: "Milk Crown on Sonnetica",
    _songSubName: "",
    _songAuthorName: "nameless",
    _levelAuthorName: "Hexagonial",
    _difficultyBeatmapSets: [],
  });

  const paths = [
    "/custom/random_name",
    "/custom/3036 (Milk Crown on Sonnetica - hexagonial)",
    "/custom/Milk Crown",
  ];

  const name = findFlavorName(v2Json, paths);

  // (title 패턴이 있는 것이 우선 선택
  assertEquals(name, "3036 (Milk Crown on Sonnetica - hexagonial)");
});

Deno.test("findFlavorName prefers (title over plain title", () => {
  const json = JSON.stringify({
    version: "4.0.0",
    song: {
      title: "Test Song",
    },
  });

  const paths = [
    "/custom/Test Song at start",
    "/custom/abc (Test Song) - Expert",
    "/custom/xyz Test Song Complete",
  ];

  const name = findFlavorName(json, paths);

  // (title 패턴이 있는 것을 우선 선택
  assertEquals(name, "abc (Test Song) - Expert");
});

Deno.test("findFlavorName falls back to plain title", () => {
  const json = JSON.stringify({
    version: "4.0.0",
    song: {
      title: "Unique Title",
    },
  });

  const paths = [
    "/custom/song_id_123",
    "/custom/Unique Title - Expert",
    "/custom/beatmap_456",
  ];

  const name = findFlavorName(json, paths);

  // (title 패턴이 없으면 plain title 중 가장 앞에 있는 것을 선택
  assertEquals(name, "Unique Title - Expert");
});

Deno.test("findFlavorName compares (title positions - later position wins", () => {
  const json = JSON.stringify({
    version: "4.0.0",
    song: {
      title: "Example Song",
    },
  });

  const paths = [
    "/custom/prefix (Example Song) suffix",
    "/custom/(Example Song) at start",
    "/custom/late (Example Song)",
  ];

  const name = findFlavorName(json, paths);

  // (title 패턴에서 음수를 취하므로 더 큰 index(더 뒤)가 더 작은 음수로 우선순위가 높음
  assertEquals(name, "prefix (Example Song) suffix");
});

Deno.test("findFlavorName compares plain title positions - earlier wins", () => {
  const json = JSON.stringify({
    version: "4.0.0",
    song: {
      title: "Test",
    },
  });

  const paths = [
    "/custom/Test at end",
    "/custom/Middle Test here",
    "/custom/Test",
  ];

  const name = findFlavorName(json, paths);

  // plain title에서는 동일한 index 0이면 첫 번째 것을 선택
  assertEquals(name, "Test at end");
});

Deno.test("findFlavorName handles no matches", () => {
  const json = JSON.stringify({
    version: "4.0.0",
    song: {
      title: "Not Found",
    },
  });

  const paths = [
    "/custom/song_id_123",
    "/custom/beatmap_456",
    "/custom/other_name",
  ];

  const name = findFlavorName(json, paths);

  // 매치가 없으면 첫 번째 경로 선택 (모두 동일한 우선순위)
  assertEquals(name, "song_id_123");
});
