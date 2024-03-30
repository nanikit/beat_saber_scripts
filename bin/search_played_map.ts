import { uniqueBy } from "npm:remeda";
import { BeatsaverMap, getDetailFromId } from "../src/beatsaver.ts";
import {
  BeatleaderScore,
  getBeatleaderPlayer,
  getBeatleaderScore,
  getScoresaberPlayer,
  getScoresaberScore,
  ScoresaberPlayerScore,
} from "../src/leaderboard_api.ts";
import { assertEquals, assertSpyCall, returnsNext, stub } from "../src/test_deps.ts";

type SearchResult = PlayRecord[] | { error: string };

type PlayRecord = {
  source: "BL" | "SS";
  time: Temporal.Instant;
  title: string;
  link: string;
};

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

    try {
      const records = await findPlayerMapRecord(mapId, { beatleader, scoresaber });
      _internals.log(records.join("\n"));
    } catch (error) {
      _internals.log(error.message);
    }
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
    ...(beatleader ? [searchBeatleaderScores(beatleader.id, song).then(formatSearchResult)] : []),
    ...(scoresaber ? [searchScoresaber(scoresaber.id, song).then(formatSearchResult)] : []),
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

  return result.map((x) => `[${x.time}] ${x.source} ${x.title} ${x.link}`).join("\n");
}

async function searchBeatleaderScores(playerId: string, song: BeatsaverMap): Promise<PlayRecord[]> {
  const { songName, songAuthorName, levelAuthorName } = song.metadata;
  const scores = await _internals.getBeatleaderScore(playerId, { search: songName });

  const sameHash = scores.data.filter((x) => x.leaderboard.song.hash === song.versions[0].hash);
  const sameMapper = scores.data.filter((x) => x.leaderboard.song.mapper === levelAuthorName);
  const sameSong = scores.data.filter((x) =>
    x.leaderboard.song.name === songName &&
    x.leaderboard.song.author === songAuthorName
  );

  return uniqueBy([
    ...sameHash.map((x) => toBeatleaderPlayRecord("exact match", x)),
    ...sameMapper.map((x) => toBeatleaderPlayRecord("same mapper", x)),
    ...sameSong.map((x) => toBeatleaderPlayRecord("same song", x)),
  ], (x) => x.link);
}

function toBeatleaderPlayRecord(tag: string, score: BeatleaderScore) {
  return {
    source: "BL" as const,
    time: Temporal.Instant.fromEpochSeconds(Number(score.timeset)),
    title: `${score.leaderboard.song.name} ${tag}`,
    link: `https://www.beatleader.xyz/leaderboard/global/${score.leaderboardId}/${
      Math.ceil(score.rank / 10)
    }`,
  };
}

async function searchScoresaber(playerId: string, song: BeatsaverMap): Promise<SearchResult> {
  const scores: ScoresaberPlayerScore[] = [];
  while (true) {
    const page = await getScoresaberScore(playerId, { search: song.metadata.songName, page: 1 });
    if ("errorMessage" in page) {
      if (scores.length) {
        break;
      } else {
        return { error: page.errorMessage };
      }
    }
    scores.push(...page.playerScores);
    if (page.playerScores.length < 8) {
      break;
    }
  }

  const { songName, songAuthorName, levelAuthorName } = song.metadata;
  const sameHash = scores.filter((x) => x.leaderboard.songHash === song.versions[0].hash);
  const sameMapper = scores.filter((x) => x.leaderboard.levelAuthorName === levelAuthorName);
  const sameSong = scores.filter((x) =>
    x.leaderboard.songName === songName &&
    x.leaderboard.songAuthorName === songAuthorName
  );

  return uniqueBy([
    ...sameHash.map((x) => toScoresaberPlayRecord("exact match", x)),
    ...sameMapper.map((x) => toScoresaberPlayRecord("same mapper", x)),
    ...sameSong.map((x) => toScoresaberPlayRecord("same song", x)),
  ], (x) => x.title);

  function toScoresaberPlayRecord(tag: string, score: ScoresaberPlayerScore): PlayRecord {
    return {
      source: "SS",
      time: Temporal.Instant.from(score.score.timeSet),
      title: `${score.leaderboard.songName} ${tag}`,
      link: `https://scoresaber.com/api/player/${playerId}/scores?page=1&search=${
        encodeURIComponent(songName)
      }&sort=recent`,
    };
  }
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
