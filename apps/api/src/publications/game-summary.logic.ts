export type SummaryPlayerFacts = {
  id: string;
  name: string;
  mention: string;
  profession: string | null;
  figurine: string | null;
  finalCashCents: number;
  finalCashflowCents: number;
  finalPassiveIncomeCents: number;
  cashflowDeltaCents: number;
  passiveIncomeDeltaCents: number;
  assetsCount: number;
  track: string;
  status: string;
};

export type SummaryHighlight = {
  playerId: string | null;
  kind: string;
  text: string;
};

export type GameSummaryFacts = {
  gameId: string;
  title: string;
  endedAt: string;
  durationMinutes: number | null;
  rounds: number;
  endReason: string | null;
  winnerGamePlayerId: string | null;
  players: SummaryPlayerFacts[];
  highlights: SummaryHighlight[];
};

export function composeGameSummary(facts: GameSummaryFacts) {
  const winner = facts.players.find((player) => player.id === facts.winnerGamePlayerId);
  const headline = winner
    ? `«${facts.title}»: ${winner.name} достигает финансовой свободы`
    : facts.endReason === "time_limit"
      ? `«${facts.title}»: итоги ${facts.rounds} ${plural(facts.rounds, "раунда", "раундов", "раундов")}`
      : facts.endReason === "all_players_bankrupt"
        ? `«${facts.title}»: партия с непростым финалом`
        : `«${facts.title}»: главные решения партии`;

  const progress = facts.durationMinutes !== null && facts.durationMinutes >= 1
    ? `За ${duration(facts.durationMinutes)} участники прошли ${facts.rounds} ${plural(facts.rounds, "раунд", "раунда", "раундов")}.`
    : `Участники прошли ${facts.rounds} ${plural(facts.rounds, "раунд", "раунда", "раундов")}.`;
  const outcome = winner
    ? `${winner.mention} выходит на уровень финансовой свободы раньше остальных: пассивный доход к финалу составил ${money(winner.finalPassiveIncomeCents)} в месяц.`
    : facts.endReason === "time_limit"
      ? "Время партии завершилось, и результат зафиксирован на достигнутых позициях."
      : facts.endReason === "all_players_bankrupt"
        ? "Финал оказался непростым: финансовые испытания остановили всех участников."
        : "Финальный результат сложился из решений, сделок и поворотных событий партии.";
  const highlights = facts.highlights.slice(0, 3).map((highlight) => `• ${highlight.text}`);
  const roster = naturalList(facts.players.map((player) => player.mention));

  return {
    headline,
    body: [
      `🎲 Итоги игры «${facts.title}»`,
      "",
      `${progress} ${outcome}`,
      ...(highlights.length ? ["", "Главные повороты:", ...highlights] : []),
      "",
      `За столом: ${roster || "состав не указан"}.`,
      "",
      "Следующая игра → gamefj.ru"
    ].join("\n")
  };
}

export function money(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value / 100);
}

function duration(minutes: number | null) {
  if (minutes === null || minutes < 1) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} ${plural(rest, "минуту", "минуты", "минут")}`;
  const hoursText = `${hours} ${plural(hours, "час", "часа", "часов")}`;
  return rest
    ? `${hoursText} ${rest} ${plural(rest, "минуту", "минуты", "минут")}`
    : hoursText;
}

function naturalList(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} и ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} и ${values[values.length - 1]}`;
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
