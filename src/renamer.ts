import type { BeatsaverMap } from "./beatsaver.ts";
import { format, parse } from "../deps.ts";

export const getHashFromQuestName = (directoryName: string) => {
  return directoryName.match(/[0-9a-f]{40}/)?.toString();
};

export const makeBeatsaverDirectory = (
  json: BeatsaverMap,
  { path }: { path: string },
) => {
  const { id, metadata: { songName, levelAuthorName } } = json;
  const rawName = `${id} (${songName} - ${levelAuthorName})`;
  const safeName = rawName.replace(/[/\\:*?"<>|]/g, "");
  const parsed = parse(path);
  return format({ dir: parsed.dir, name: safeName });
};
