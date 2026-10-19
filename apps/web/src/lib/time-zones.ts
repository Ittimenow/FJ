export function formatGameTime(iso: string, timeZone: string | null | undefined): string {
  if (!timeZone) return "Укажите город в профиле";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone, year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short"
  }).format(new Date(iso));
}
