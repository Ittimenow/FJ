import type { GameEvent } from "../../lib/types";

export type ActionIconKind = "cash" | "dice" | "opportunity" | "purchase" | "sale" | "bank" | "expense" | "decline" | "offer" | "decision" | "event";

/** One semantic vocabulary for both event formats, without relying on amount or icon color. */
export function actionIconKind(event?: GameEvent): ActionIconKind {
  if (!event) return "decision";
  const {type,payload} = event;
  if (type === "game202:action") {
    if (payload.effectType === "dice" || payload.commandType === "roll") return "dice";
    if (payload.effectType === "card_opened" || payload.text === "Открыта карточка") return "opportunity";
    if (payload.commandType === "loan" || payload.commandType === "repay") return "bank";
    if (["pass","no"].includes(String(payload.choice)) || payload.commandType === "reject") return "decline";
    if (payload.commandType === "offer" || payload.commandType === "accept") return "offer";
    if (payload.commandType === "choose") return "opportunity";
    if (payload.choice === "sell" || payload.taskKind === "sale" || payload.choice === "exercise") return "sale";
    if (payload.choice === "buy" || payload.taskKind === "fast") return "purchase";
    if (payload.effectType === "expense" || ["charity","university","contamination"].includes(String(payload.taskKind))) return "expense";
    if (payload.effectType === "financial_result" || payload.effectType === "paycheck" || payload.text === "День зарплаты" || payload.text === "День денежного потока") return "cash";
    return payload.kind === "command" ? "decision" : "event";
  }
  if (["player:roll_dice","player:move","fast_track:investment_roll"].includes(type)) return "dice";
  if (type === "card:draw") return "opportunity";
  if (type.startsWith("loan:")) return "bank";
  if (/declin|reject|cancel/.test(type)) return "decline";
  if (["deal:buy","fast_track:purchased"].includes(type)) return "purchase";
  if (["deal:sell","market:sell","market:sale","deal:auction_select","bankruptcy:asset_sold","fast_track:sold"].includes(type)) return "sale";
  if (type.includes("auction") || type.includes("offer")) return "offer";
  if (type.startsWith("doodad:") || ["fast_track:expense","charity:accepted","player:downsized"].includes(type)) return "expense";
  if (["paycheck:receive","card:cash_delta","fast_track:cashflow","bankruptcy:debt_repaid"].includes(type)
    || typeof payload.beforeCashCents === "number" || typeof payload.afterCashCents === "number") return "cash";
  return "event";
}
