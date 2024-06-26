import ky from "npm:ky";
import { assert, assertEquals } from "../src/test_deps.ts";

export function getBeatleaderPlayer(
  id: string,
): Promise<{ id: string; name: string } | null> {
  return getJsonOrNull(`https://api.beatleader.xyz/player/${id}`);
}

export function getScoresaberPlayer(
  id: string,
): Promise<{ id: string; name: string } | null> {
  return getJsonOrNull(`https://scoresaber.com/api/player/${id}/full`);
}

export function getBeatleaderScore(
  playerId: string,
  { search, page }: { search?: string; page?: number },
): Promise<BeatleaderScorePage> {
  return ky.get(
    `https://api.beatleader.xyz/player/${playerId}/scores?page=${
      page ?? 1
    }&sortBy=date&order=desc&search=${encodeURIComponent(search ?? "")}&count=50`,
  ).json();
}

export async function getScoresaberScore(
  playerId: string,
  { search, page }: { search?: string; page: number },
): Promise<ScoresaberPagedPlayerScore | { errorMessage: string }> {
  const response = await ky.get(`https://scoresaber.com/api/player/${playerId}/scores`, {
    searchParams: {
      page: page ?? 1,
      search: followScoresaberSearchQueryLimit(search),
      sort: "recent",
    },
    throwHttpErrors: false,
  });
  return response.json();
}

// Why they determine by escaped string; sucks: They String must contain at most 32 character(s)
function followScoresaberSearchQueryLimit(search?: string) {
  if (!search) {
    return "";
  }

  for (let i = Math.min(search.length, 32); i > 0; i--) {
    const cut = search.slice(0, i);
    const encoded = encodeURIComponent(cut);
    if (encoded.length < 32) {
      return cut;
    }
  }
  return search;
}

Deno.test("Given cjk search string", async (test) => {
  const search = "破壊前夜のこと";

  await test.step("when follow search query limit", async (test) => {
    const actual = followScoresaberSearchQueryLimit(search);

    await test.step("it should preserve content", () => {
      assert(search.startsWith(actual));
    });
  });
});

async function getJsonOrNull<T>(url: string): Promise<T | null> {
  const response = await ky.get(url, { throwHttpErrors: false });
  if (response.ok) {
    return response.json();
  }
  await response.body?.getReader().cancel();
  return null;
}

Deno.test(
  "Given valid player steam ID",
  { sanitizeOps: false },
  async (test) => {
    const id = "76561198159100356";

    await test.step("when query on Beatleader", async (test) => {
      const player = await getBeatleaderPlayer(id);

      await test.step("it should return player", () => {
        assertEquals(player?.name, "nanikit");
      });
    });

    await test.step("when query on Scoresaber", async (test) => {
      const player = await getScoresaberPlayer(id);

      await test.step("it should return player", () => {
        assertEquals(player?.name, "nanikit");
      });
    });
  },
);

Deno.test(
  "Given invalid player steam ID",
  { sanitizeOps: false },
  async (test) => {
    const id = "76561198159100357";

    await test.step("when query on Beatleader", async (test) => {
      const player = await getBeatleaderPlayer(id);

      await test.step("it should return null", () => {
        assertEquals(player, null);
      });
    });

    await test.step("when query on Scoresaber", async (test) => {
      const player = await getScoresaberPlayer(id);

      await test.step("it should return null", () => {
        assertEquals(player, null);
      });
    });
  },
);

type BeatleaderScorePage = {
  metadata: {
    /** @example 8 */
    itemsPerPage: number;
    /** @example 1 */
    page: number;
    /** @example 1 */
    total: number;
  };
  data: BeatleaderScore[];
};

export type BeatleaderScore = {
  myScore: null;
  leaderboard: BeatleaderLeaderBoard;
  /** @example 0 */
  weight: number;
  /** @example 109.054344 */
  accLeft: number;
  /** @example 109.64363 */
  accRight: number;
  /** @example 9041545 */
  id: number;
  /** @example 775513 */
  baseScore: number;
  /** @example 775513 */
  modifiedScore: number;
  /** @example 0.9045835 */
  accuracy: number;
  /** @example 76561198159100356 */
  playerId: string;
  /** @example 0 */
  pp: number;
  /** @example 0 */
  bonusPp: number;
  /** @example 0 */
  passPP: number;
  /** @example 0 */
  accPP: number;
  /** @example 0 */
  techPP: number;
  /** @example 25 */
  rank: number;
  /** @example KR */
  country: string;
  /** @example 0.95086056 */
  fcAccuracy: number;
  /** @example 0 */
  fcPp: number;
  /** @example https://cdn.replays.beatleader.xyz/76561198159100356-ExpertPlus-Standard-DE09D641463DCC5031A4B271B87C3EF84ECA8DA0.bsor */
  replay: string;
  /** @example  */
  modifiers: string;
  /** @example 5 */
  badCuts: number;
  /** @example 6 */
  missedNotes: number;
  /** @example 0 */
  bombCuts: number;
  /** @example 0 */
  wallsHit: number;
  /** @example 0 */
  pauses: number;
  fullCombo: false;
  /** @example steam,1.29.1_4575554838,0.7.1 */
  platform: string;
  /** @example 327 */
  maxCombo: number;
  /** @example 2 */
  maxStreak: number;
  /** @example 256 */
  hmd: number;
  /** @example 0 */
  controller: number;
  /** @example 358b391 */
  leaderboardId: string;
  /** @example 1694275038 */
  timeset: string;
  /** @example 1694275234 */
  timepost: number;
  /** @example 1 */
  replaysWatched: number;
  /** @example 0 */
  playCount: number;
  /** @example 0 */
  priority: number;
  player: null;
  scoreImprovement: {
    /** @example 8693229 */
    id: number;
    /** @example  */
    timeset: string;
    /** @example 0 */
    score: number;
    /** @example 0 */
    accuracy: number;
    /** @example 0 */
    pp: number;
    /** @example 0 */
    bonusPp: number;
    /** @example 0 */
    rank: number;
    /** @example 0 */
    accRight: number;
    /** @example 0 */
    accLeft: number;
    /** @example 0 */
    averageRankedAccuracy: number;
    /** @example 0 */
    totalPp: number;
    /** @example 0 */
    totalRank: number;
    /** @example 0 */
    badCuts: number;
    /** @example 0 */
    missedNotes: number;
    /** @example 0 */
    bombCuts: number;
    /** @example 0 */
    wallsHit: number;
    /** @example 0 */
    pauses: number;
  };
  rankVoting: null;
  metadata: null;
  offsets: {
    /** @example 8630524 */
    id: number;
    /** @example 277 */
    frames: number;
    /** @example 1060398 */
    notes: number;
    /** @example 1143923 */
    walls: number;
    /** @example 1143928 */
    heights: number;
    /** @example 1143933 */
    pauses: number;
  };
};

type BeatleaderLeaderBoard = {
  /** @example 358b391 */
  id: string;
  song: BeatleaderSong;
  difficulty: {
    /** @example 942807 */
    id: number;
    /** @example 9 */
    value: number;
    /** @example 1 */
    mode: number;
    /** @example ExpertPlus */
    difficultyName: string;
    /** @example Standard */
    modeName: string;
    /** @example 0 */
    status: number;
    modifierValues: {
      /** @example 736729 */
      modifierId: number;
      /** @example 0 */
      da: number;
      /** @example 0.2 */
      fs: number;
      /** @example 0.36 */
      sf: number;
      /** @example -0.3 */
      ss: number;
      /** @example 0.04 */
      gn: number;
      /** @example -0.3 */
      na: number;
      /** @example -0.2 */
      nb: number;
      /** @example -0.5 */
      nf: number;
      /** @example -0.2 */
      no: number;
      /** @example 0 */
      pm: number;
      /** @example 0 */
      sc: number;
      /** @example 0 */
      sa: number;
      /** @example -0.5 */
      op: number;
    };
    modifiersRating: null;
    /** @example 0 */
    nominatedTime: number;
    /** @example 0 */
    qualifiedTime: number;
    /** @example 0 */
    rankedTime: number;
    stars: null;
    /** @example 0.9765202 */
    predictedAcc: number;
    passRating: null;
    accRating: null;
    techRating: null;
    /** @example 0 */
    type: number;
    /** @example 17 */
    njs: number;
    /** @example 5.028 */
    nps: number;
    /** @example 938 */
    notes: number;
    /** @example 305 */
    bombs: number;
    /** @example 128 */
    walls: number;
    /** @example 857315 */
    maxScore: number;
    /** @example 193 */
    duration: number;
    /** @example 32 */
    requirements: number;
  };
  scores: null;
  changes: null;
  qualification: null;
  reweight: null;
  leaderboardGroup: null;
  /** @example 0 */
  plays: number;
};

type BeatleaderSong = {
  /** @example 358b3 */
  id: string;
  /** @example de09d641463dcc5031a4b271b87c3ef84eca8da0 */
  hash: string;
  /** @example Kyu-Kurarin */
  name: string;
  /** @example (yuigot Remix) */
  subName: string;
  /** @example Iyowa */
  author: string;
  /** @example Ken_Monogatari */
  mapper: string;
  /** @example 4340422 */
  mapperId: number;
  /** @example https://na.cdn.beatsaver.com/de09d641463dcc5031a4b271b87c3ef84eca8da0.jpg */
  coverImage: string;
  /** @example https://cdn.assets.beatleader.xyz/songcover-358b3-cover.png */
  fullCoverImage: string;
  /** @example https://r2cdn.beatsaver.com/de09d641463dcc5031a4b271b87c3ef84eca8da0.zip */
  downloadUrl: string;
  /** @example 110 */
  bpm: number;
  /** @example 193 */
  duration: number;
  /** @example dance-style,tech,j-pop,vocaloid */
  tags: string;
  /** @example 1694248526 */
  uploadTime: number;
  difficulties: {
    /** @example 942807 */
    id: number;
    /** @example 9 */
    value: number;
    /** @example 1 */
    mode: number;
    /** @example ExpertPlus */
    difficultyName: string;
    /** @example Standard */
    modeName: string;
    /** @example 0 */
    status: number;
    modifierValues: {
      /** @example 736729 */
      modifierId: number;
      /** @example 0 */
      da: number;
      /** @example 0.2 */
      fs: number;
      /** @example 0.36 */
      sf: number;
      /** @example -0.3 */
      ss: number;
      /** @example 0.04 */
      gn: number;
      /** @example -0.3 */
      na: number;
      /** @example -0.2 */
      nb: number;
      /** @example -0.5 */
      nf: number;
      /** @example -0.2 */
      no: number;
      /** @example 0 */
      pm: number;
      /** @example 0 */
      sc: number;
      /** @example 0 */
      sa: number;
      /** @example -0.5 */
      op: number;
    };
    modifiersRating: null;
    /** @example 0 */
    nominatedTime: number;
    /** @example 0 */
    qualifiedTime: number;
    /** @example 0 */
    rankedTime: number;
    stars: null;
    /** @example 0.9765202 */
    predictedAcc: number;
    passRating: null;
    accRating: null;
    techRating: null;
    /** @example 0 */
    type: number;
    /** @example 17 */
    njs: number;
    /** @example 5.028 */
    nps: number;
    /** @example 938 */
    notes: number;
    /** @example 305 */
    bombs: number;
    /** @example 128 */
    walls: number;
    /** @example 857315 */
    maxScore: number;
    /** @example 193 */
    duration: number;
    /** @example 32 */
    requirements: number;
  }[];
};

type ScoresaberPagedPlayerScore = {
  playerScores: ScoresaberPlayerScore[];
  metadata: {
    /** @example 1 */
    total: number;
    /** @example 1 */
    page: number;
    /** @example 12 */
    itemsPerPage: number;
  };
};

export type ScoresaberPlayerScore = {
  score: {
    /** @example 70550916 */
    id: number;
    leaderboardPlayerInfo: null;
    /** @example 1 */
    rank: number;
    /** @example 1209867 */
    baseScore: number;
    /** @example 1209867 */
    modifiedScore: number;
    /** @example 0 */
    pp: number;
    /** @example 5.464939086767392e-9 */
    weight: number;
    modifiers: string;
    /** @example 1 */
    multiplier: number;
    /** @example 0 */
    badCuts: number;
    /** @example 0 */
    missedNotes: number;
    /** @example 1379 */
    maxCombo: number;
    fullCombo: boolean;
    /** @example 32 */
    hmd: number;
    timeSet: string;
    hasReplay: boolean;
    deviceHmd: string | null;
    deviceControllerLeft: string | null;
    deviceControllerRight: string | null;
  };
  leaderboard: {
    /** @example 358b391 */
    id: number;
    /** @example de09d641463dcc5031a4b271b87c3ef84eca8da0 */
    songHash: string;
    /** @example Kyu-Kurarin */
    songName: string;
    /** @example (yuigot Remix) */
    songSubName: string;
    /** @example Iyowa */
    songAuthorName: string;
    /** @example Ken_Monogatari */
    levelAuthorName: string;
    difficulty: {
      /** @example 942807 */
      leaderboardId: number;
      /** @example 9 */
      difficulty: number;
      /** @example ExpertPlus */
      gameMode: string;
      /** @example Standard */
      difficultyRaw: string;
    };
    /** @example 857315 */
    maxScore: number;
    createdDate: string;
    rankedDate: string | null;
    qualifiedDate: string | null;
    lovedDate: string | null;
    ranked: boolean;
    qualified: boolean;
    loved: boolean;
    /** @example 0 */
    maxPP: number;
    /** @example 0.9765202 */
    stars: number;
    /** @example 0 */
    plays: number;
    /** @example 0 */
    dailyPlays: number;
    positiveModifiers: boolean;
    playerScore: null;
    /** @example https://na.cdn.beatsaver.com/de09d641463dcc5031a4b271b87c3ef84eca8da0.jpg */
    coverImage: string;
    difficulties: null;
  };
};
