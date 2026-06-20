export interface ProfileResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: "USER" | "HOST" | "ADMIN";
    status: "ACTIVE" | "BLOCKED" | "DELETED";
    createdAt: string;
  };
  stats: {
    gamesPlayed: number;
    wins: number;
    escapedRatRace: number;
    averageMonthlyCashflowCents: number;
    averagePassiveIncomeCents: number;
  };
  history: Array<{
    gameId: string;
    title: string;
    code: string;
    status: string;
    role: string;
    profession: string | null;
    joinedAt: string;
    endedAt: string | null;
    wonAt: string | null;
    escapedRatRaceAt: string | null;
    monthlyCashflowCents: number;
  }>;
}

export interface GamesListResponse {
  mine: GameListItem[];
  open: GameListItem[];
}

export interface GameListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  maxPlayers: number;
  createdAt: string;
  players: Array<{
    id: string;
    role: string;
    seat: number | null;
    user: {
      id: string;
      displayName: string;
      email: string;
    } | null;
  }>;
}

export interface GameSnapshot {
  game: {
    id: string;
    code: string;
    title: string;
    status: "WAITING" | "IN_PROGRESS" | "ENDED" | "CANCELLED";
    maxPlayers: number;
    currentTurnIndex: number;
    currentRound: number;
    currentPlayerId: string | null;
    createdById: string | null;
    startedAt: string | null;
    endedAt: string | null;
    pendingAction: GamePendingAction | null;
  };
  board: Array<{
    index: number;
    type: string;
    label: string;
  }>;
  players: GamePlayer[];
  events: GameEvent[];
  chatMessages: ChatMessage[];
}

export interface GamePlayer {
  id: string;
  userId: string | null;
  role: string;
  status: string;
  seat: number | null;
  color: string | null;
  track: "RAT_RACE" | "FAST_TRACK";
  position: number;
  fastTrackPosition: number;
  user: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  profession: {
    id: number;
    name: string;
    slug: string;
    salaryCents?: number | null;
    taxesCents?: number | null;
    mortgagePaymentCents?: number | null;
    schoolLoanPaymentCents?: number | null;
    carLoanPaymentCents?: number | null;
    creditCardPaymentCents?: number | null;
    retailPaymentCents?: number | null;
    otherExpensesCents?: number | null;
    childrenExpenseCents?: number | null;
    perChildCostCents?: number | null;
  } | null;
  financialState: FinancialState | null;
  assets: PlayerAsset[];
  liabilities: PlayerLiability[];
}

export interface FinancialState {
  cashCents: number;
  salaryCents: number;
  passiveIncomeCents: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  monthlyCashflowCents: number;
  baseExpensesCents: number;
  perChildCostCents: number;
  childrenCount: number;
  charityTurns: number;
  downsizedTurns: number;
  paycheckCount: number;
  escapedRatRaceAt: string | null;
  wonAt: string | null;
}

export interface PlayerAsset {
  id: string;
  type: string;
  name: string;
  symbol: string | null;
  quantity: number;
  costBasisCents: number;
  marketValueCents: number;
  downPaymentCents: number;
  cashflowCents: number;
}

export interface PlayerLiability {
  id: string;
  type: string;
  name: string;
  balanceCents: number;
  paymentCents: number;
}

export type GamePendingAction =
  | {
      type: "choose_deal";
      gamePlayerId: string;
    }
  | {
      type: "deal_card_drawn";
      gamePlayerId: string;
      cardId: number;
      cardType: "SMALL_DEAL" | "BIG_DEAL" | "FAST_TRACK";
    }
  | {
      type: "charity_choice";
      gamePlayerId: string;
      donationCents: number;
      turns: number;
    }
  | {
      type: "market_sale";
      gamePlayerId: string;
      cardId: number;
      title: string;
      assetId: string;
      assetName: string;
      salePriceCents: number;
      mortgageCents: number;
      proceedsCents: number;
      cashflowCents: number;
    };

export interface GameEvent {
  id: string;
  type: string;
  sequence: number;
  payload: Record<string, unknown>;
  createdAt: string;
  actor?: {
    id: string;
    displayName: string;
  } | null;
  gamePlayer?: {
    id: string;
    seat: number | null;
    role: string;
  } | null;
}

export interface FeedbackMessage {
  id: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  user: { id: string; displayName: string; email: string } | null;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
  } | null;
}
