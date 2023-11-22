import dayjs from "npm:dayjs";
import relativeTime from "npm:dayjs/plugin/relativeTime.js";
import { BeatsaverDifficulty, BeatsaverMap, getDetailFromId } from "../src/beatsaver.ts";
import {
  getBeatleaderPlayer,
  getBeatleaderScore,
  getScoresaberPlayer,
  getScoresaberScore,
} from "../src/leaderboard_api.ts";
import { assertEquals, assertSpyCall, returnsNext, stub } from "../src/test_deps.ts";

type SearchResult = PlayRecord[] | { error: string };

type PlayRecord = {
  source: "BL" | "SS";
  time: dayjs.Dayjs;
  title: string;
  link: string;
};

dayjs.extend(relativeTime);

const _internals = {
  getBeatleaderPlayer,
  getScoresaberPlayer,
  getBeatleaderScore,
  getDetailFromId,
  prompt,
  log: console.log,
  exit: Deno.exit,
};

if (import.meta.main) {
  main();
}

async function main() {
  const id = _internals.prompt("Enter player ID:");
  if (!id) {
    return;
  }

  const { beatleader, scoresaber } = await queryPlayer(id);
  if (!beatleader && !scoresaber) {
    _internals.exit(1);
    return;
  }

  if (beatleader) {
    _internals.log(`beatleader nickname: ${beatleader.name}`);
  }
  if (scoresaber) {
    _internals.log(`scoresaber nickname: ${scoresaber.name}`);
  }

  while (true) {
    const mapId = _internals.prompt("Enter map ID:");
    if (!mapId) {
      break;
    }

    const records = await findPlayerMapRecord(mapId, { beatleader, scoresaber });
    _internals.log(records.join("\n"));
  }
}

async function findPlayerMapRecord(
  mapId: string,
  { beatleader, scoresaber }: {
    beatleader?: { id: string; name: string } | null;
    scoresaber?: { id: string; name: string } | null;
  },
) {
  const normalizedId = mapId.trim().toLowerCase();
  if (!normalizedId.match(/^[a-f0-9]{1,6}$/)) {
    return ['Invalid id. Please enter map id like "25629" or "b2e".'];
  }

  const song = await _internals.getDetailFromId(mapId);
  const results = await Promise.all([
    ...(beatleader
      ? [searchBeatleaderScores(beatleader.id, normalizedId).then(formatSearchResult)]
      : []),
    ...(scoresaber ? [searchScoresaber(song, scoresaber).then(formatSearchResult)] : []),
  ]);
  const { songName, songAuthorName, levelAuthorName } = song.metadata;
  const lines = [
    `Map: ${songName} - ${songAuthorName} (${levelAuthorName})`,
    ...results,
  ];

  return lines;
}

function formatSearchResult(result: SearchResult) {
  if ("error" in result) {
    return result.error;
  }

  return result.map((x) => `[${x.time.toISOString()}] ${x.source} ${x.title} ${x.link}`).join("\n");
}

async function searchBeatleaderScores(playerId: string, mapId: string): Promise<PlayRecord[]> {
  const blScores = await _internals.getBeatleaderScore(playerId, { search: mapId });
  const exactScores = blScores?.data.filter((x) => x.leaderboard.song.id === mapId) ?? [];
  return exactScores.map((x) => ({
    source: "BL",
    time: dayjs(Number(x.timeset) * 1000),
    title: x.leaderboard.song.name,
    link: `https://www.beatleader.xyz/leaderboard/global/${x.leaderboardId}`,
  }));
}

async function searchScoresaber(
  song: BeatsaverMap,
  player: { id: string; name: string },
): Promise<SearchResult> {
  const { hash, diffs } = song.versions[0];
  const ordinals = diffs.map((x) => beatsaverDiffToScoreSaberOrdinal(x.difficulty));
  const ssPages = await Promise.all(
    ordinals.map((ordinal) =>
      getScoresaberScore(hash, { search: player.name, difficulty: ordinal })
    ),
  );

  const error = ssPages.find((x) => "errorMessage" in x);
  if (error && "errorMessage" in error) {
    return { error: error.errorMessage };
  }

  const ssScores = ssPages.flatMap((x) => "scores" in x ? x.scores : []).filter((x) =>
    x.leaderboardPlayerInfo.id === player.id
  );

  return ssScores.map((x) => ({
    source: "SS",
    time: dayjs(x.timeSet),
    title: song.metadata.songName,
    link: `https://scoresaber.com/leaderboard/${0}?search=${player.name}`,
  }));
}

async function queryPlayer(playerId: string) {
  const [beatleader, scoresaber] = await Promise.all([
    getValidBeatleaderPlayer(playerId),
    _internals.getScoresaberPlayer(playerId),
  ]);
  return { beatleader, scoresaber };
}

async function getValidBeatleaderPlayer(id: string) {
  try {
    await getBeatleaderScore(id, { search: "" });
    return _internals.getBeatleaderPlayer(id);
  } catch (_error) {
    return null;
  }
}

function beatsaverDiffToScoreSaberOrdinal(difficulty: BeatsaverDifficulty) {
  return ({
    Easy: 1,
    Normal: 3,
    Hard: 5,
    Expert: 7,
    ExpertPlus: 9,
  } as const)[difficulty] ?? 9;
}

Deno.test("When input not exist player ID", async (test) => {
  // deno-lint-ignore no-explicit-any
  const istub = (key: keyof typeof _internals, fn: any) => stub(_internals, key, fn);
  const promptMock = istub("prompt", returnsNext(["not_exist_player_id"]));
  const beatleaderMock = istub(
    "getBeatleaderPlayer",
    returnsNext([Promise.resolve(null)]),
  );
  const scoresaberMock = istub(
    "getScoresaberPlayer",
    returnsNext([Promise.resolve(null)]),
  );
  const exitMock = istub("exit", returnsNext([undefined]));
  await main();

  await test.step("it should exit", () => {
    assertSpyCall(exitMock, 0, { args: [1] });
  });

  promptMock.restore();
  beatleaderMock.restore();
  scoresaberMock.restore();
});

Deno.test("Given valid player and beatmap ID", { sanitizeOps: false }, async (test) => {
  const player = { id: "76561198159100356", name: "nanikit" };
  const mapId = "25629";

  await test.step("when query record", async (test) => {
    const records = await findPlayerMapRecord(mapId, { beatleader: player, scoresaber: player });

    await test.step("it should return play records if exists", () => {
      assertEquals(records.length, 2);
    });
  });
});
