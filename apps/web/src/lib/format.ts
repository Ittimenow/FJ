export function money(value: number | null | undefined) {
  const amount = value ?? 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function shortDate(value: string | Date | null | undefined, timeZone?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone ?? undefined
  }).format(new Date(value));
}
