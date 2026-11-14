import type { Log202 } from "@cashflow/shared";
import type { GameEvent, GamePlayer } from "../../lib/types";
import { game202TurnContext } from "./game-journal";
import type { TurnMovementData } from "./turn-movement";

const fingerprint = (revision: unknown, playerId: unknown, text: unknown, slug: unknown) =>
  JSON.stringify([revision ?? 0, playerId ?? null, text ?? "", slug ?? null]);

const finiteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function rollGroup202(event: GameEvent) {
  const playerId = event.gamePlayer?.id;
  return event.type === "game202:action" && playerId && finiteNumber(event.payload.revision)
    ? JSON.stringify([playerId, event.payload.revision, event.payload.turnKey ?? null])
    : null;
}

export function recordedMovement202(event: GameEvent): TurnMovementData | null {
  if (event.type !== "game202:action") return null;
  const payload = event.payload;
  const oldDice = typeof payload.text === "string" ? /^Кубики:\s*([1-6](?:\s*\+\s*[1-6]){0,2})$/.exec(payload.text) : null;
  const values = Array.isArray(payload.diceValues) ? payload.diceValues : oldDice?.[1]?.split("+").map(Number);
  if (!values?.length || !values.every(value => finiteNumber(value) && Number.isInteger(value) && value >= 1 && value <= 6)) return null;
  const cell = typeof payload.cell === "object" && payload.cell !== null ? payload.cell as Record<string, unknown> : null;
  const label = typeof cell?.label === "string" ? (cell.type === "deal" ? "Возможность" : cell.label)
    : typeof payload.recordedCellLabel === "string" ? payload.recordedCellLabel : undefined;
  return {
    diceValues: values as number[], total: finiteNumber(payload.dice) ? payload.dice : values.reduce((sum:number,value) => sum + Number(value),0),
    ...(finiteNumber(payload.from) && finiteNumber(payload.to) ? {from:payload.from,to:payload.to} : {}),
    ...(label ? {cellLabel:label} : {})
  };
}

/** Compact only a proven roll revision. No board position is reconstructed from prose or today's snapshot. */
export function compact202History(events: GameEvent[]) {
  const rolls = new Map<string, GameEvent>();
  for (const event of events) {
    const key = rollGroup202(event);
    if (key && recordedMovement202(event)) rolls.set(key,event);
  }
  const cells = new Map<string,string>();
  for (const event of events) {
    const key=rollGroup202(event);
    if (key && rolls.has(key) && typeof event.payload.text === "string" && event.payload.text.startsWith("Клетка: ")) {
      cells.set(key,event.payload.text.slice("Клетка: ".length).replace("Возможность крупная/мелкая","Возможность"));
    }
  }
  return events.flatMap(event => {
    const key=rollGroup202(event);
    if (!key || !rolls.has(key)) return [event];
    if (event.payload.commandType === "roll" || typeof event.payload.text === "string" && event.payload.text.startsWith("Клетка: ")) return [];
    const label=cells.get(key);
    return [recordedMovement202(event) && label ? {...event,payload:{...event.payload,recordedCellLabel:label}} : event];
  });
}

export function isCardOpening202(event: GameEvent) {
  return event.type === "game202:action" && typeof event.payload.slug === "string"
    && (event.payload.effectType === "card_opened" || event.payload.text === "Открыта карточка");
}

/** Replace one known opening, never every occurrence of a slug or an ungrouped old event. */
export function currentCardOpening202(events: GameEvent[], slug: string | undefined, turnKey: string | undefined) {
  if (!slug || !turnKey) return undefined;
  return events.filter(event => isCardOpening202(event) && event.payload.slug === slug
    && game202TurnContext(event)?.turnKey === turnKey)
    .sort((left, right) => right.sequence - left.sequence)[0];
}

const emptyHistoryText = new Set(["Начало хода", "Решение по открытой карточке"]);

/** Join a command only to its recorded results and explanation, never another actor or revision. */
export function prepare202History(events: GameEvent[]) {
  const compact = compact202History(events);
  const ordered = [...compact].sort((a,b)=>a.sequence-b.sequence);
  const consumed = new Set<string>();
  const replacements = new Map<string, GameEvent>();
  for (const command of ordered.filter(event => event.payload.kind === "command")) {
    const key = rollGroup202(command);
    if (!key) continue;
    const related = ordered.filter(event => event.id !== command.id && rollGroup202(event) === key);
    const results = related.filter(event => event.payload.effectType === "financial_result"
      && event.sequence < command.sequence && event.payload.slug === command.payload.slug);
    const explanation = related.find(event => event.payload.kind === "bot" && !emptyHistoryText.has(String(event.payload.text)));
    results.forEach(event => consumed.add(event.id));
    related.filter(event => event.payload.kind === "bot").forEach(event => consumed.add(event.id));
    // These effect labels repeat the successful command; its amounts are retained below.
    for (const event of related) {
      if (event.sequence >= command.sequence || event.payload.kind !== "effect") continue;
      if (event.payload.text === "Приобретён актив" && command.payload.choice === "buy" && event.payload.slug === command.payload.slug
        || event.payload.text === "Погашен кредит" && command.payload.commandType === "repay"
        || typeof event.payload.text === "string" && event.payload.text.startsWith("Получен кредит ") && command.payload.commandType === "loan") consumed.add(event.id);
    }
    const totals = results.reduce((sum,event) => ({
      cashChangeCents: sum.cashChangeCents + (finiteNumber(event.payload.cashChangeCents) ? event.payload.cashChangeCents : 0),
      cashflowChangeCents: sum.cashflowChangeCents + (finiteNumber(event.payload.cashflowChangeCents) ? event.payload.cashflowChangeCents : 0)
    }), {cashChangeCents:0,cashflowChangeCents:0});
    const cashResults = results.filter(event => event.payload.cashChangeCents !== 0);
    const first = cashResults[0]?.payload, last = cashResults.at(-1)?.payload;
    const continuous = cashResults.length > 0 && cashResults.every((event,index) => {
      const {beforeCashCents,afterCashCents,cashChangeCents} = event.payload;
      return finiteNumber(beforeCashCents) && finiteNumber(afterCashCents)
        && afterCashCents-beforeCashCents === cashChangeCents
        && (index === 0 || cashResults[index-1]!.payload.afterCashCents === beforeCashCents);
    });
    replacements.set(command.id, {...command, payload: {...command.payload,
      ...(results.length ? totals : {}),
      ...(continuous ? {beforeCashCents:first!.beforeCashCents,afterCashCents:last!.afterCashCents} : {}),
      ...(explanation ? { explanation: explanation.payload.text } : {})
    }});
  }
  return compact.filter(event => !consumed.has(event.id) && !emptyHistoryText.has(String(event.payload.text)))
    .map(event => replacements.get(event.id) ?? event);
}

/** Older games kept their starting portfolios only in JSON. Reconcile occurrences, not just unique text. */
export function legacy202HistoryEvents(events: GameEvent[], log: Log202[], players: GamePlayer[], gameId: string) {
  const persisted = events.filter(event => event.type === "game202:action" && !game202TurnContext(event) && event.payload.kind !== "setup")
    .sort((left, right) => left.sequence - right.sequence);
  const available = new Map<string, GameEvent[]>();
  for (const event of persisted) {
    const key = fingerprint(event.payload.revision, event.gamePlayer?.id, event.payload.text, event.payload.slug);
    available.set(key, [...(available.get(key) ?? []), event]);
  }
  const used = new Set<string>();
  const anchors = new Map<number, { index: number; sequence: number }>();
  const reconciled = log.flatMap((line, index) => {
    if (line.turnKey || line.turnOwnerGamePlayerId || line.kind) return [];
    const key = fingerprint(line.revision, line.playerId, line.text, line.slug);
    const match = available.get(key)?.shift();
    if (match) {
      used.add(match.id);
      anchors.set(line.revision, { index, sequence: match.sequence });
      return [{ event: match, index, revision: line.revision, fallback: false }];
    }
    const player = players.find(item => item.id === line.playerId);
    const event: GameEvent = {
      id: `legacy-202-${gameId}-${index}-${key}`, type: "game202:action", sequence: index,
      createdAt: "", payload: { text: line.text, revision: line.revision, ...(line.slug ? { slug: line.slug } : {}) },
      gamePlayer: player ? { id: player.id, seat: player.seat, role: player.role } : null
    };
    return [{ event, index, revision: line.revision, fallback: true }];
  });
  const rows = reconciled.map(row => {
    const anchor = anchors.get(row.revision);
    return { event: row.event, revision: row.revision, order: row.fallback && anchor ? anchor.sequence + row.index - anchor.index : row.event.sequence };
  });
  for (const event of persisted) if (!used.has(event.id)) rows.push({ event, revision: Number(event.payload.revision ?? 0), order: event.sequence });
  return rows.sort((left, right) => right.revision - left.revision || right.order - left.order).map(row => row.event);
}
