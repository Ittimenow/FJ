import { finances202, type Loan202, type Player202 } from "@cashflow/shared";
import type { GamePlayer, GameSnapshot, PlayerLiability } from "../../lib/types";
import { money202 } from "./financial-presentation";

export type Expense202Item = { id: string; label: string; amountCents: number; calculation?: string | null };

function loanType(loan: Loan202, source: GamePlayer) {
  if (loan.bank) return "bank_loan";
  if (loan.child) return "school_debt";
  // Original liability metadata identifies the category; amounts always come from the canonical loan.
  return source.liabilities.find(item => item.name === loan.name)?.type ?? `loan-${loan.id}`;
}

export function liabilities202(player: Player202, source: GamePlayer): PlayerLiability[] {
  return player.loans.filter(loan => loan.balance > 0).map(loan => ({
    id: loan.id, type: loanType(loan, source), name: loan.name,
    balanceCents: loan.balance, paymentCents: loan.payment
  }));
}

/** Do not read rounded financialState or liability values from the legacy database projection. */
export function financialPlayers202(snapshot: GameSnapshot): GamePlayer[] {
  const state = snapshot.game202;
  if (!state) return [];
  return snapshot.players.flatMap(source => {
    const player = state.players.find(candidate => candidate.id === source.id);
    if (!player || source.role !== "PLAYER" || source.status !== "JOINED") return [];
    const finances = finances202(state, player);
    return [{
      ...source,
      track: player.track,
      position: player.position,
      fastTrackPosition: player.fastPosition,
      dreamCellIndex: player.dream,
      liabilities: liabilities202(player, source),
      financialState: {
        cashCents: player.cash,
        salaryCents: player.track === "FAST_TRACK" ? 0 : player.salary,
        passiveIncomeCents: finances.passive,
        totalIncomeCents: finances.income,
        totalExpensesCents: finances.expenses,
        monthlyCashflowCents: finances.cashflow,
        baseExpensesCents: player.baseExpenses,
        perChildCostCents: player.childCost,
        childrenCount: player.children,
        charityTurns: Math.max(0, player.charityUntil - player.turns + 1),
        downsizedTurns: player.bankrupt ? 0 : player.skip,
        bankruptcyStatus: player.bankrupt ? "RECOVERED" as const : "NONE" as const,
        bankruptcyTurns: player.bankrupt ? player.skip : 0,
        bankruptcyDeclaredAt: null,
        bankruptcyEliminatedAt: null,
        paycheckCount: player.laps,
        escapedRatRaceAt: player.track === "FAST_TRACK" ? snapshot.game.startedAt : null,
        wonAt: state.winner === player.id ? snapshot.game.endedAt ?? snapshot.game.startedAt : null,
        fastTrackIncomeCents: player.fastIncome,
        fastTrackStartIncomeCents: player.initialFastIncome,
        fastTrackCharity: player.fastCharity
      }
    }];
  });
}

export function expenseItems202(player: Player202, source: GamePlayer): Expense202Item[] {
  if (player.track === "FAST_TRACK") return [];
  const taxes = Math.max(0, Math.min(player.baseExpenses, Math.round((source.profession?.taxesCents ?? 0) * 100)));
  const items: Expense202Item[] = [
    { id: "taxes", label: "Налоги", amountCents: taxes },
    { id: "other_expenses", label: "Другие расходы", amountCents: player.baseExpenses - taxes }
  ];
  const labels: Record<string, string> = {
    home_mortgage: "Оплата закладной на дом", school_debt: "Оплата кредита на образование",
    car_debt: "Оплата кредита на автомобиль", credit_cards: "Выплаты по кредитной карточке",
    retail_debt: "Розничные расходы", bank_loan: "Оплата кредита банка"
  };
  for (const loan of player.loans) {
    const type = loanType(loan, source);
    const existing = items.find(item => item.id === type);
    if (existing) existing.amountCents += loan.payment;
    else items.push({ id: type, label: labels[type] ?? loan.name, amountCents: loan.payment });
  }
  items.push({
    id: "children", label: "Расходы на детей", amountCents: player.childCost * player.children,
    calculation: player.children ? `${player.children} × ${money202(player.childCost)} =` : null
  });
  if (player.insurance) items.push({ id: "insurance", label: "Страхование недвижимости", amountCents: 20_000 });
  return items;
}
