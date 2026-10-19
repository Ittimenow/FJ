import tzLookup from "@photostructure/tz-lookup";

// Boundary lookup can put a Russian border city just across a national border.
const borderTimeZones: Record<string, string> = {
  "RU-ALT": "Asia/Barnaul",
  "RU-BRY": "Europe/Moscow",
  "RU-BU": "Asia/Irkutsk",
  "RU-KGD": "Europe/Kaliningrad",
  "RU-KGN": "Asia/Yekaterinburg",
  "RU-KHA": "Asia/Vladivostok",
  "RU-LEN": "Europe/Moscow",
  "RU-PSK": "Europe/Moscow"
};
const foreignBorderZones = new Set([
  "Asia/Almaty", "Asia/Shanghai", "Asia/Ulaanbaatar",
  "Europe/Helsinki", "Europe/Minsk", "Europe/Vilnius"
]);

export function russianCityTimeZone(latitude: number, longitude: number, regionCode: string): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("City reference data contains invalid coordinates");
  }
  const zone = tzLookup(latitude, longitude);
  if (!foreignBorderZones.has(zone)) return zone;
  const corrected = borderTimeZones[regionCode];
  if (!corrected) throw new Error(`Cannot determine Russian city time zone for ${regionCode}: ${zone}`);
  return corrected;
}
