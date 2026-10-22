import { randomInt } from "node:crypto";

export function normalizeBotName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function validBotName(value: string) {
  const name = normalizeBotName(value);
  return name.length > 0 && [...name].length <= 15 &&
    /^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)?$/u.test(name);
}

export function chooseBotName(
  names: readonly string[],
  occupied: ReadonlySet<string>,
  randomIndex: (length: number) => number = randomInt
) {
  const candidates = names.filter((name) => !occupied.has(name.toLocaleLowerCase("ru-RU")));
  if (candidates.length === 0) return null;
  return candidates[randomIndex(candidates.length)] ?? null;
}
