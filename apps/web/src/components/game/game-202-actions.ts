import type { Player202, Public202, Task202 } from "@cashflow/shared";

export type OfferKind202 = "asset" | "right" | "opportunity" | "joint";

export function isDecisionActor202(player: Player202 | undefined, task: Task202 | undefined) {
  return Boolean(player && task && (task.kind === "auction"
    ? task.candidates?.includes(player.id) && task.bids?.[player.id] === undefined
    : task.playerId === player.id));
}

/** Negotiations belong to a pending card, never to the idle turn screen. */
export function offerKinds202(state: Public202, player: Player202 | undefined, task: Task202 | undefined): OfferKind202[] {
  if (!player || player.track !== "RAT_RACE" || !task || !isDecisionActor202(player, task)
    || ["roll", "choose", "escape", "fast"].includes(task.kind)) return [];
  const kinds: OfferKind202[] = [];
  if (state.assets.some(asset => asset.kind !== "interest" && (asset.owners[player.id] ?? 0) > 0
    && (asset.lockedUntil[player.id] ?? 0) <= player.laps)) kinds.push("asset");
  if (player.cash < 0) return kinds;
  if (player.rights.length) kinds.push("right");
  const rule = task.rule;
  if (task.kind === "deal" && rule && (rule.kind === "property" || rule.kind === "market_property"
    || rule.kind === "investment" && rule.royalty || rule.kind === "exchange")) {
    kinds.push("opportunity");
    if (rule.kind !== "exchange") kinds.push("joint");
  }
  return kinds;
}

export function loanLimit202(state: Public202, player: Player202, cashflow: number) {
  if (player.track !== "RAT_RACE") return 0;
  const debt = state.queue.find(task => task.kind === "debt" && task.playerId === player.id);
  if (debt && !debt.loanAllowed) return 0;
  if (player.bankrupt) return debt?.loanAllowed && player.cash < 0 ? Math.min(100000000, Math.ceil(-player.cash / 100000) * 1000) : 0;
  return debt?.loanAllowed ? 100000000 : Math.min(100000000, Math.floor(Math.max(0, cashflow) / 10000) * 1000);
}
