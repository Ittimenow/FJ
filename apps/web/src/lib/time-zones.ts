export const preferredTimeZones = [
  "Europe/Kaliningrad", "Europe/Moscow", "Europe/Samara", "Asia/Yekaterinburg",
  "Asia/Omsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Yakutsk",
  "Asia/Vladivostok", "Asia/Magadan", "Asia/Kamchatka", "Europe/Berlin",
  "Europe/London", "Asia/Almaty", "Asia/Tbilisi", "Asia/Dubai",
  "America/New_York", "America/Los_Angeles", "UTC"
];

export function timeZones(current?: string | null): string[] {
  const supported = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : preferredTimeZones;
  return [...new Set([...preferredTimeZones, ...(current ? [current] : []), ...supported])];
}

export function formatGameTime(iso: string, timeZone: string | null | undefined): string {
  if (!timeZone) return "Укажите часовой пояс в профиле";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone, year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short"
  }).format(new Date(iso));
}
