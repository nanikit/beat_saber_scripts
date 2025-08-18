export type InfoDat = InfoDatV2 | InfoDatV4;

export type InfoDatV2 = {
  _version: string;
  _songName: string;
  _songSubName: string;
  _songAuthorName: string;
  _levelAuthorName: string;
  _beatsPerMinute: number;
  _songTimeOffset: number;
  _shuffle: number;
  _shufflePeriod: number;
  _previewStartTime: number;
  _previewDuration: number;
  _songFilename: string;
  _coverImageFilename: string;
  _environmentName: string;
  _customData: {
    _contributors: string[];
    _customEnvironment: string;
    _customEnvironmentHash: string;
  };
  _difficultyBeatmapSets: Array<{
    _beatmapCharacteristicName: string;
    _difficultyBeatmaps: Array<{
      _difficulty: string;
      _difficultyRank: number;
      _beatmapFilename: string;
      _noteJumpMovementSpeed: number;
      _noteJumpStartBeatOffset: number;
      _customData: {
        _difficultyLabel: string;
        _editorOffset: number;
        _editorOldOffset: number;
        _warnings: string[];
        _information: string[];
        _suggestions: string[];
        _requirements: string[];
      };
    }>;
  }>;
};

export type InfoDatV4 = {
  version: string;
  song: {
    title: string;
    subTitle: string;
    author: string;
  };
  audio: {
    songFilename: string;
    songDuration: number;
    audioDataFilename: string;
    bpm: number;
    lufs: number;
    previewStartTime: number;
    previewDuration: number;
  };
  songPreviewFilename: string;
  coverImageFilename: string;
  environmentNames: string[];
  colorSchemes: unknown[];
  difficultyBeatmaps: Array<{
    characteristic: string;
    difficulty: string;
    beatmapAuthors: {
      mappers: string[];
      lighters: string[];
    };
    environmentNameIdx: number;
    beatmapColorSchemeIdx: number;
    noteJumpMovementSpeed: number;
    noteJumpStartBeatOffset: number;
    beatmapDataFilename: string;
    lightshowDataFilename: string;
  }>;
  customData?: {
    editors?: {
      lastEditedBy?: string;
      ChroMapper?: {
        version: string;
      };
    };
  };
};

export function isV2OrV3(info: InfoDat): info is InfoDatV2 {
  return "_version" in info;
}

export function v2ToV4(v2: InfoDatV2): InfoDatV4 {
  return {
    version: v2._version,
    song: {
      title: v2._songName,
      subTitle: v2._songSubName,
      author: v2._songAuthorName,
    },
    audio: {
      songFilename: v2._songFilename,
      songDuration: v2._songTimeOffset,
      bpm: v2._beatsPerMinute,
      previewStartTime: v2._previewStartTime,
      previewDuration: v2._previewDuration,
    },
    songPreviewFilename: v2._songFilename,
    coverImageFilename: v2._coverImageFilename,
    environmentNames: [v2._environmentName],
    difficultyBeatmaps: v2._difficultyBeatmapSets.flatMap((set) =>
      set._difficultyBeatmaps.map((beatmap) => ({
        characteristic: set._beatmapCharacteristicName,
        difficulty: beatmap._difficulty,
        beatmapAuthors: {
          mappers: [v2._levelAuthorName],
        },
      }))
    ),
  } as InfoDatV4;
}
