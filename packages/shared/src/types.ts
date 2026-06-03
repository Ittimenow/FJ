export type CardType =
  | "SMALL_DEAL"
  | "BIG_DEAL"
  | "MARKET"
  | "DOODAD"
  | "FAST_TRACK"
  | "DREAM";

export interface FinancialTotals {
  salaryCents: number;
  passiveIncomeCents: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  monthlyCashflowCents: number;
}

export interface FinancialInput {
  salaryCents: number;
  basePassiveIncomeCents?: number;
  baseExpensesCents: number;
  assetCashflowCents: number;
  liabilityPaymentsCents: number;
  childrenExpenseCents?: number;
}

export interface MoveResult {
  from: number;
  to: number;
  steps: number;
  passedStart: boolean;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
}

export interface GameActionResult<TSnapshot = unknown> {
  snapshot: TSnapshot;
  events: Array<{
    type: string;
    payload: Record<string, unknown>;
  }>;
}
