import { BadRequestException } from "@nestjs/common";

export function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function scheduledInstant(local: string, timeZone: string, now = new Date()): Date {
  if (!validTimeZone(timeZone)) {
    throw new BadRequestException("Укажите корректный часовой пояс в профиле.");
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new BadRequestException("Укажите дату и время начала игры.");
  const [, year, month, day, hour, minute] = match;
  const naive = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const expected = `${year}-${month}-${day}T${hour}:${minute}`;
  if (new Date(naive).toISOString().slice(0, 16) !== expected) {
    throw new BadRequestException("Укажите существующую дату и время начала.");
  }
  const candidates = new Set<number>();
  for (let shift = -36; shift <= 36; shift += 6) {
    const sample = naive + shift * 3_600_000;
    const p = localParts(new Date(sample), timeZone);
    const offset = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute)) - sample;
    const instant = naive - offset;
    const check = localParts(new Date(instant), timeZone);
    if (`${check.year}-${check.month}-${check.day}T${check.hour}:${check.minute}` === expected) {
      candidates.add(instant);
    }
  }
  if (candidates.size !== 1) {
    throw new BadRequestException("В этом часовом поясе время не существует или повторяется. Выберите другое время.");
  }
  const result = new Date([...candidates][0]!);
  if (result <= now) throw new BadRequestException("Укажите будущее время начала игры.");
  return result;
}
