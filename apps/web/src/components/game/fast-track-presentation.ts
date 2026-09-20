import { fastTrackCells, type FastTrackCell, type FastTrackWorld } from "@cashflow/shared";
import { money } from "../../lib/format";
import type { GamePlayer } from "../../lib/types";

export function fastTrackCellEffect(cell: FastTrackCell) {
  switch (cell.rule.kind) {
    case "business": return `+${money(cell.income)} CASHFLOW`;
    case "chance_business": return `+${money(cell.income)} при ${cell.rule.minimum}–6`;
    case "ipo": return `+${money(cell.rule.payout)} при ${cell.rule.minimum === 6 ? "6" : `${cell.rule.minimum}–6`}`;
    case "cashflow": return "+Доход CASHFLOW";
    case "charity": return "1–3 кубика до конца игры";
    case "half_cash": return "−50% наличных";
    case "lose_cash": return "Все наличные теряются";
    case "dream": return null;
  }
}

export function purchasedFastTrackCells(player: GamePlayer, world: FastTrackWorld) {
  return fastTrackCells.filter((cell) => world.owners[cell.index] === player.id
    || world.dreamPurchases[cell.index]?.includes(player.id)
    || (cell.rule.kind === "charity" && player.financialState?.fastTrackCharity));
}
