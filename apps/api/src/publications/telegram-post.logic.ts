import type { GameSummaryFacts } from "./game-summary.logic";

export type TelegramPostSource = {
  headline: string;
  body: string;
  facts: GameSummaryFacts;
};

export function composeSeriesPost(sources: TelegramPostSource[]) {
  const gamesCount = sources.length;
  const players = unique(sources.flatMap((source) => source.facts.players.map((player) => player.mention)));
  const rounds = sources.reduce((total, source) => total + source.facts.rounds, 0);
  const winners = sources.flatMap((source) => {
    const winner = source.facts.players.find((player) => player.id === source.facts.winnerGamePlayerId);
    return winner ? [`${winner.mention} — «${source.facts.title}»`] : [];
  });
  const highlights = unique(sources.flatMap((source) => source.facts.highlights.map((highlight) => highlight.text)));
  const title = `Серия из ${gamesCount} ${plural(gamesCount, "игры", "игр", "игр")}: главные финансовые маршруты`;
  const fixed = [
    "🎲 Итоги серии игр",
    "",
    `${gamesCount} ${plural(gamesCount, "партия", "партии", "партий")} · ${players.length} ${plural(players.length, "участник", "участника", "участников")} · ${rounds} ${plural(rounds, "раунд", "раунда", "раундов")}`,
    "",
    `Играли: ${players.join(", ") || "состав не указан"}`,
    "",
    "Следующая игра → gamefj.ru"
  ];
  const optional: string[][] = [];
  if (winners.length) optional.push(["Финансовой свободы достигли:", ...winners.map((winner) => `• ${winner}`), ""]);
  if (highlights.length) optional.push(["Главные моменты:", ...highlights.slice(0, 3).map((highlight) => `• ${highlight}`), ""]);

  const body = fitOptional(fixed, optional);
  if (body.length > 1024) {
    throw new Error("Список участников не помещается в подпись Telegram — сократите серию игр");
  }
  return { title, body };
}

function fitOptional(fixed: string[], optional: string[][]) {
  const tailStart = 4;
  const head = fixed.slice(0, tailStart);
  const tail = fixed.slice(tailStart);
  const accepted: string[] = [];
  for (const section of optional) {
    const candidate = [...head, ...accepted, ...section, ...tail].join("\n");
    if (candidate.length <= 1024) accepted.push(...section);
  }
  return [...head, ...accepted, ...tail].join("\n");
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLocaleLowerCase("ru-RU");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
