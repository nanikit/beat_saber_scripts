/** Key example: `custom_level_29CA353C17029D69F7C021F831BA0BC16030EC09___2___Standard` */
type SphJson = Record<string, SphRecord[]>;

type SphRecord = {
  Date: number;
  ModifiedScore: number;
  RawScore: number;
  LastNote: number;
  Param: number;
};

export function getPlayedHashesFromSph(sphJson: string) {
  const sph: SphJson = JSON.parse(sphJson);
  const keys = Object.keys(sph);
  return keys.map((x) => {
    return x.split("___")[0];
  });
}
