import { ratRaceBoard } from "./board";
import type { FinancialInput, FinancialTotals, MoveResult } from "./types";

export function rollDie(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

export function moveOnCircularTrack(
  currentPosition: number,
  steps: number,
  boardSize = ratRaceBoard.length
): MoveResult {
  if (currentPosition < 0) {
    const raw = steps - 1;
    return {
      from: currentPosition,
      to: ((raw % boardSize) + boardSize) % boardSize,
      steps,
      passedStart: false
    };
  }

  const normalized = ((currentPosition % boardSize) + boardSize) % boardSize;
  const raw = normalized + steps;
  return {
    from: normalized,
    to: raw % boardSize,
    steps,
    passedStart: raw >= boardSize
  };
}

export function recalculateFinancials(input: FinancialInput): FinancialTotals {
  const passiveIncomeCents =
    (input.basePassiveIncomeCents ?? 0) + input.assetCashflowCents;
  const totalExpensesCents =
    input.baseExpensesCents +
    input.liabilityPaymentsCents +
    (input.childrenExpenseCents ?? 0);
  const totalIncomeCents = input.salaryCents + passiveIncomeCents;

  return {
    salaryCents: input.salaryCents,
    passiveIncomeCents,
    totalIncomeCents,
    totalExpensesCents,
    monthlyCashflowCents: totalIncomeCents - totalExpensesCents
  };
}

export function canEscapeRatRace(
  passiveIncomeCents: number,
  totalExpensesCents: number
): boolean {
  return passiveIncomeCents > totalExpensesCents;
}

export function normalizeCardTypeForCell(cellType: string) {
  if (cellType === "market") return "MARKET";
  if (cellType === "doodad") return "DOODAD";
  if (cellType === "fast_track") return "FAST_TRACK";
  if (cellType === "dream") return "DREAM";
  return null;
}
