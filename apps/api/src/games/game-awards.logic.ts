export const minimumAwardActions = 3;

export type GameAward = {
  kind: string;
  title: string;
  playerId: string;
  playerName: string;
  mention: string;
  actionCount: number;
  metricValue: number;
  metricUnit: "count" | "money" | "money_monthly";
  result: string;
  text: string;
};

export type GameAwardPlayer = {
  id: string;
  name: string;
  mention: string;
};

export type GameAwardEvent = {
  sequence: number;
  type: string;
  gamePlayerId: string | null;
  payload: unknown;
};

type Candidate = {
  playerId: string;
  actionCount: number;
  metricValue: number;
};

type AwardDefinition = {
  kind: string;
  title: string;
  metricUnit: GameAward["metricUnit"];
  result: (candidate: Candidate) => string;
};

type BankruptcyEpisode = {
  playerId: string;
  actionCount: number;
  startingCashflowCents: number;
};

type JsonRecord = Record<string, unknown>;

export function selectGameAwards(
  events: GameAwardEvent[],
  players: GameAwardPlayer[]
): GameAward[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const awards: Array<{ priority: number; award: GameAward }> = [];
  const add = (
    priority: number,
    definition: AwardDefinition,
    candidates: Candidate[]
  ) => {
    const winner = uniqueEligibleLeader(candidates);
    if (!winner) return;
    const player = playerById.get(winner.playerId);
    if (!player) return;
    const result = definition.result(winner);
    awards.push({
      priority,
      award: {
        kind: definition.kind,
        title: definition.title,
        playerId: player.id,
        playerName: player.name,
        mention: player.mention,
        actionCount: winner.actionCount,
        metricValue: winner.metricValue,
        metricUnit: definition.metricUnit,
        result,
        text: `${definition.title} — ${player.mention}: ${result}`
      }
    });
  };

  add(110, countDefinition("family_person", "Семьянин года", "ребёнок", "ребёнка", "детей"),
    countEvents(events, "player:baby"));
  add(100, countDefinition("career_swings", "Карьерные качели", "увольнение", "увольнения", "увольнений"),
    countEvents(events, "player:downsized"));
  add(150, {
    kind: "cashflow_architect",
    title: "Архитектор денежного потока",
    metricUnit: "money_monthly",
    result: (candidate) => `${money(candidate.metricValue)} в месяц за ${candidate.actionCount} ${plural(candidate.actionCount, "действие", "действия", "действий")}`
  }, sumEvents(events, positiveCashflowDelta));
  add(105, countDefinition("deal_hunter", "Охотник за сделками", "покупка", "покупки", "покупок"),
    countEvents(events, "deal:buy", "deal:auction_select"));
  add(130, {
    kind: "debt_master",
    title: "Повелитель долгов",
    metricUnit: "money",
    result: (candidate) => `${money(candidate.metricValue)} погашено за ${candidate.actionCount} ${plural(candidate.actionCount, "операцию", "операции", "операций")}`
  }, sumEvents(events, (event) => ["loan:repay", "bankruptcy:debt_repaid"].includes(event.type)
    ? positiveNumber(record(event.payload)?.amountCents)
    : 0));
  add(70, countDefinition("bank_favorite", "Любимец банка", "кредит", "кредита", "кредитов"),
    countEvents(events, "loan:take"));
  add(125, {
    kind: "generous_heart",
    title: "Щедрое сердце",
    metricUnit: "money",
    result: (candidate) => `${money(candidate.metricValue)} пожертвовано за ${candidate.actionCount} ${plural(candidate.actionCount, "раз", "раза", "раз")}`
  }, sumEvents(events, (event) => event.type === "player:charity"
    ? positiveNumber(record(event.payload)?.donationCents)
    : 0));
  add(120, {
    kind: "good_neighbor",
    title: "Добрый сосед",
    metricUnit: "money",
    result: (candidate) => `${money(candidate.metricValue)} подарено за ${candidate.actionCount} ${plural(candidate.actionCount, "поздравление", "поздравления", "поздравлений")}`
  }, sumEvents(events, (event) => event.type === "player:baby_gift"
    ? positiveNumber(record(event.payload)?.amountCents)
    : 0));
  add(80, countDefinition("iron_patience", "Железная выдержка", "отказ", "отказа", "отказов"),
    countEvents(events, "deal:decline"));
  add(75, {
    kind: "surprise_spending_king",
    title: "Король внезапных расходов",
    metricUnit: "money",
    result: (candidate) => `${money(candidate.metricValue)} за ${candidate.actionCount} ${plural(candidate.actionCount, "расход", "расхода", "расходов")}`
  }, sumEvents(events, doodadCost));
  add(160, {
    kind: "financial_phoenix",
    title: "Финансовый феникс",
    metricUnit: "money_monthly",
    result: (candidate) => `денежный поток восстановлен на ${money(candidate.metricValue)} в месяц за ${candidate.actionCount} ${plural(candidate.actionCount, "действие", "действия", "действий")}`
  }, bankruptcyRecoveryCandidates(events));

  return awards
    .sort((left, right) => right.priority - left.priority || left.award.title.localeCompare(right.award.title, "ru"))
    .map((item) => item.award);
}

function countDefinition(
  kind: string,
  title: string,
  one: string,
  few: string,
  many: string
): AwardDefinition {
  return {
    kind,
    title,
    metricUnit: "count",
    result: (candidate) => `${candidate.metricValue} ${plural(candidate.metricValue, one, few, many)}`
  };
}

function countEvents(events: GameAwardEvent[], ...types: string[]) {
  const accepted = new Set(types);
  return aggregate(events, (event) => accepted.has(event.type) ? 1 : 0);
}

function sumEvents(events: GameAwardEvent[], value: (event: GameAwardEvent) => number) {
  return aggregate(events, value);
}

function aggregate(events: GameAwardEvent[], value: (event: GameAwardEvent) => number) {
  const rows = new Map<string, Candidate>();
  for (const event of events) {
    const amount = value(event);
    if (!(amount > 0)) continue;
    const playerId = awardPlayerId(event);
    if (!playerId) continue;
    const current = rows.get(playerId) ?? { playerId, actionCount: 0, metricValue: 0 };
    current.actionCount += 1;
    current.metricValue += amount;
    rows.set(playerId, current);
  }
  return [...rows.values()];
}

function uniqueEligibleLeader(candidates: Candidate[]) {
  const ranked = candidates
    .filter((candidate) => candidate.actionCount >= minimumAwardActions)
    .sort((left, right) => right.metricValue - left.metricValue);
  const winner = ranked[0];
  if (!winner || ranked[1]?.metricValue === winner.metricValue) return null;
  return winner;
}

function awardPlayerId(event: GameAwardEvent) {
  if (event.type === "player:baby_gift") {
    const sender = record(event.payload)?.senderGamePlayerId;
    return typeof sender === "string" ? sender : null;
  }
  return event.gamePlayerId;
}

function positiveCashflowDelta(event: GameAwardEvent) {
  const payload = record(event.payload);
  if (!payload) return 0;
  if (event.type === "deal:buy" || event.type === "deal:auction_select") {
    return positiveNumber(payload.cashflowCents);
  }
  if (event.type === "card:cashflow_delta") {
    return positiveNumber(payload.amountCents);
  }
  if (event.type === "market:cashflow_applied") {
    return positiveNumber(payload.totalAmountCents);
  }
  if (event.type === "network_marketing:level_applied") {
    return Math.max(0, number(payload.cashflowCents) - number(payload.previousCashflowCents));
  }
  return 0;
}

function doodadCost(event: GameAwardEvent) {
  const payload = record(event.payload);
  if (!payload) return 0;
  if (event.type === "doodad:paid") {
    const amount = number(payload.amountCents);
    return amount < 0 ? amount * -1 : 0;
  }
  if (event.type !== "doodad:payment_resolved") return 0;
  return payload.method === "credit"
    ? positiveNumber(payload.creditBalanceCents)
    : positiveNumber(payload.cashPriceCents);
}

function bankruptcyRecoveryCandidates(events: GameAwardEvent[]) {
  const episodes = new Map<string, BankruptcyEpisode>();
  const candidates = new Map<string, Candidate>();
  const recoveryActions = new Set([
    "bankruptcy:asset_sold",
    "bankruptcy:debt_repaid",
    "bankruptcy:debts_halved"
  ]);

  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    const playerId = event.gamePlayerId;
    if (!playerId) continue;
    const payload = record(event.payload);
    if (event.type === "bankruptcy:declared") {
      episodes.set(playerId, {
        playerId,
        actionCount: 0,
        startingCashflowCents: number(payload?.monthlyCashflowCents)
      });
      continue;
    }
    const episode = episodes.get(playerId);
    if (!episode) continue;
    if (recoveryActions.has(event.type)) {
      episode.actionCount += 1;
      continue;
    }
    if (event.type === "bankruptcy:eliminated") {
      episodes.delete(playerId);
      continue;
    }
    if (event.type !== "bankruptcy:recovered") continue;
    const improvement = number(payload?.monthlyCashflowCents) - episode.startingCashflowCents;
    const current = candidates.get(playerId);
    if (!current || improvement > current.metricValue) {
      candidates.set(playerId, {
        playerId,
        actionCount: episode.actionCount,
        metricValue: Math.max(0, improvement)
      });
    }
    episodes.delete(playerId);
  }
  return [...candidates.values()];
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveNumber(value: unknown) {
  return Math.max(0, number(value));
}

function money(valueCents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(valueCents / 100);
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(value) % 10;
  const mod100 = Math.abs(value) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
