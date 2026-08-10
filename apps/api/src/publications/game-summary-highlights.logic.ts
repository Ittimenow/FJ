import { money, type SummaryHighlight, type SummaryPlayerFacts } from "./game-summary.logic";

type GameEventFact = {
  sequence: number;
  type: string;
  gamePlayerId: string | null;
  payload: unknown;
};

type Candidate = {
  highlight: SummaryHighlight;
  score: number;
  sequence: number;
};

type JsonRecord = Record<string, unknown>;

export function selectGameHighlights(
  events: GameEventFact[],
  players: SummaryPlayerFacts[],
  winnerId: string | null
) {
  const candidates = new Map<string, Candidate>();
  const playerById = new Map(players.map((player) => [player.id, player]));
  const add = (candidate: Candidate) => {
    const key = `${candidate.highlight.playerId ?? "game"}:${candidate.highlight.kind}`;
    const current = candidates.get(key);
    if (
      !current ||
      candidate.score > current.score ||
      (candidate.score === current.score && candidate.sequence > current.sequence)
    ) {
      candidates.set(key, candidate);
    }
  };

  const growth = players
    .filter((player) => player.id !== winnerId && player.cashflowDeltaCents > 0)
    .sort((left, right) => right.cashflowDeltaCents - left.cashflowDeltaCents);
  growth.forEach((player, index) => add({
    highlight: {
      playerId: player.id,
      kind: "cashflow_growth",
      text: `${player.mention}: денежный поток вырос на ${money(player.cashflowDeltaCents)} в месяц.`
    },
    score: 108 - Math.min(index * 5, 20),
    sequence: Number.MAX_SAFE_INTEGER
  }));

  for (const event of events) {
    const player = event.gamePlayerId ? playerById.get(event.gamePlayerId) : null;
    if (!player) continue;
    const formatted = formatEvent(player.mention, event.type, record(event.payload));
    if (!formatted) continue;
    add({
      highlight: {
        playerId: player.id,
        kind: formatted.kind,
        text: formatted.text
      },
      score: formatted.score,
      sequence: event.sequence
    });
  }

  const ranked = [...candidates.values()].sort((left, right) =>
    right.score - left.score || right.sequence - left.sequence
  );
  const selected: Candidate[] = [];
  const selectedKeys = new Set<string>();
  const usedPlayers = new Set<string>();
  const take = (candidate: Candidate) => {
    const key = `${candidate.highlight.playerId ?? "game"}:${candidate.highlight.kind}`;
    if (selectedKeys.has(key) || selected.length >= 3) return;
    selected.push(candidate);
    selectedKeys.add(key);
    if (candidate.highlight.playerId) usedPlayers.add(candidate.highlight.playerId);
  };

  for (const candidate of ranked) {
    const playerId = candidate.highlight.playerId;
    if (!playerId || playerId === winnerId || usedPlayers.has(playerId)) continue;
    take(candidate);
  }
  for (const candidate of ranked) {
    const playerId = candidate.highlight.playerId;
    if (playerId && usedPlayers.has(playerId)) continue;
    take(candidate);
  }
  for (const candidate of ranked) take(candidate);

  return selected.map((candidate) => candidate.highlight);
}

function formatEvent(name: string, type: string, payload: JsonRecord | null) {
  if (type === "bankruptcy:recovered") {
    return {
      kind: type,
      score: 130,
      text: `${name}: восстановление после банкротства и возвращение в игру.`
    };
  }
  if (type === "player:escaped_rat_race") {
    return {
      kind: type,
      score: 125,
      text: `${name}: выход из Крысиных бегов на Скоростную дорожку.`
    };
  }
  if (type === "player:downsized") {
    return {
      kind: type,
      score: 112,
      text: `${name}: потеря работы стала серьёзной проверкой финансового плана.`
    };
  }
  if (type === "bankruptcy:declared") {
    return {
      kind: type,
      score: 110,
      text: `${name}: партия потребовала пройти через процедуру банкротства.`
    };
  }
  if (type === "deal:sell") {
    const asset = cleanAssetName(payload?.assetName ?? payload?.title ?? payload?.name);
    const proceedsCents = positiveNumber(payload?.proceedsCents);
    return {
      kind: type,
      score: 100 + impactScore(proceedsCents),
      text: proceedsCents > 0
        ? `${name}: продажа актива «${asset}» принесла ${money(proceedsCents)}.`
        : `${name}: портфель изменился после продажи актива «${asset}».`
    };
  }
  if (type === "deal:buy") {
    const asset = cleanAssetName(payload?.title ?? payload?.name);
    const cashflowCents = positiveNumber(payload?.cashflowCents);
    return {
      kind: type,
      score: 96 + impactScore(cashflowCents),
      text: cashflowCents > 0
        ? `${name}: актив «${asset}» добавил ${money(cashflowCents)} к ежемесячному потоку.`
        : `${name}: новая ставка в портфеле — актив «${asset}».`
    };
  }
  if (type === "network_marketing:level_applied") {
    const cashflowCents = positiveNumber(payload?.cashflowCents);
    return {
      kind: type,
      score: 95 + impactScore(cashflowCents),
      text: cashflowCents > 0
        ? `${name}: развитие сетевого маркетинга принесло ${money(cashflowCents)} в месяц.`
        : `${name}: новый уровень в развитии сетевого маркетинга.`
    };
  }
  if (type === "player:baby") {
    return {
      kind: type,
      score: 92,
      text: `${name}: пополнение в семье потребовало перестроить финансовый план.`
    };
  }
  if (type === "loan:repay") {
    const amountCents = positiveNumber(payload?.amountCents);
    return {
      kind: type,
      score: 90 + impactScore(amountCents),
      text: amountCents > 0
        ? `${name}: погашение долга на ${money(amountCents)} укрепило финансовую позицию.`
        : `${name}: ещё один долг полностью погашен.`
    };
  }
  return null;
}

function cleanAssetName(value: unknown) {
  const raw = String(value ?? "новый актив").trim();
  const concise = raw
    .replace(/:\s*.*$/u, "")
    .replace(/\s+на продажу$/iu, "")
    .trim();
  return concise || "новый актив";
}

function impactScore(valueCents: number) {
  if (valueCents <= 0) return 0;
  return Math.min(12, Math.floor(Math.log10(valueCents / 100 + 1) * 4));
}

function positiveNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}
