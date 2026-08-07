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
    ? `${winner.name} завершает финансовое путешествие первым`
    : facts.endReason === "time_limit"
      ? `Партия «${facts.title}» завершена по времени`
      : facts.endReason === "all_players_bankrupt"
        ? `Партия «${facts.title}» завершена после непростого маршрута`
        : `Партия «${facts.title}» завершена`;

  const intro = winner
    ? `${winner.mention} первым достиг финансовой свободы. Финальный пассивный доход — ${money(winner.finalPassiveIncomeCents)} в месяц.`
    : facts.endReason === "time_limit"
      ? "Игроки дошли до финала отведённого времени — фиксируем решения и результаты этого маршрута."
      : "Финансовый маршрут завершён — сохраняем его главные решения и поворотные моменты.";
  const highlights = facts.highlights.slice(0, 3).map((highlight) => `• ${highlight.text}`);
  const roster = facts.players.map((player) => player.mention).join(", ");
  const stats = [
    `${facts.players.length} ${plural(facts.players.length, "игрок", "игрока", "игроков")}`,
    `${facts.rounds} ${plural(facts.rounds, "раунд", "раунда", "раундов")}`,
    duration(facts.durationMinutes)
  ].filter(Boolean).join(" · ");

  return {
    headline,
    body: [
      `🎲 Итоги игры «${facts.title}»`,
      "",
      intro,
      ...(highlights.length ? ["", ...highlights] : []),
      "",
      `Играли: ${roster || "состав не указан"}`,
      stats,
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
  if (!hours) return `${rest} мин`;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
