export interface ProfileResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    figurine: string | null;
    gender: string | null;
    birthDate: string | null;
    gameExperience: number | null;
    gameRoomView: "classic" | "journey";
    telegramChannel: string | null;
    telegramMentionConsent: boolean;
    city: {
      id: string;
      name: string;
      region: string;
    } | null;
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
    gameMode: "MULTIPLAYER" | "SOLO";
    outcome: "WIN" | "LOSS" | null;
  }>;
}

export interface PublicGameSummary {
  id: string;
  headline: string;
  body: string;
  publishedAt: string | null;
  imageUrl: string;
  pageUrl: string;
  game: {
    title: string;
    endedAt: string | null;
    currentRound: number;
  };
  facts: {
    gameId: string;
    title: string;
    endedAt: string;
    durationMinutes: number | null;
    rounds: number;
    endReason: string | null;
    winnerGamePlayerId: string | null;
    players: Array<{
      id: string;
      name: string;
      mention: string;
      profession: string | null;
      figurine: string | null;
      finalCashCents: number;
      finalCashflowCents: number;
      finalPassiveIncomeCents: number;
      cashflowDeltaCents: number;
      passiveIncomeDeltaCents: number;
      assetsCount: number;
      track: string;
      status: string;
    }>;
    highlights: Array<{ playerId: string | null; kind: string; text: string }>;
  };
}

export interface GamesListResponse {
  mine: GameListItem[];
  open: GameListItem[];
}

export interface AdminGameSummary {
  id: string;
  code: string;
  title: string;
  status: "WAITING" | "IN_PROGRESS" | "PAUSED" | "ENDED" | "CANCELLED";
  mode: "MULTIPLAYER" | "SOLO";
  maxPlayers: number | null;
  currentRound: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
  durationMinutes: number | null;
  createdBy: {
    id: string;
    displayName: string;
  } | null;
  playersCount: number;
  eventsCount: number | null;
  chatMessagesCount: number | null;
  winnerName: string | null;
  players: Array<{
    id: string;
    userId: string | null;
    displayName: string | null;
    guestName: string | null;
    controller: string;
    botStrategy: string | null;
    status: string;
    seat: number | null;
    joinedAt: string;
    profession: { id: number; slug: string; name: string } | null;
    monthlyCashflowCents: number | null;
    passiveIncomeCents: number | null;
    escapedRatRaceAt: string | null;
    wonAt: string | null;
  }>;
}

export interface AdminGamesCatalogResponse {
  items: AdminGameSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GameListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  mode: "MULTIPLAYER" | "SOLO";
  maxPlayers: number | null;
  createdAt: string;
  cardSet: {
    id: string;
    name: string;
  };
  players: Array<{
    id: string;
    role: string;
    seat: number | null;
    guestName: string | null;
    controller: "HUMAN" | "BOT";
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
    status: "WAITING" | "IN_PROGRESS" | "PAUSED" | "ENDED" | "CANCELLED";
    mode: "MULTIPLAYER" | "SOLO";
    maxPlayers: number | null;
    currentTurnIndex: number;
    currentRound: number;
    currentPlayerId: string | null;
    createdById: string | null;
    cardSet: {
      id: string;
      name: string;
    };
    startedAt: string | null;
    endedAt: string | null;
    timeLimitMinutes: number;
    periodCount: number;
    currentPeriod: number;
    periodDeadlineAt: string | null;
    deadlineAt: string | null;
    remainingPeriodSeconds: number | null;
    pauseReason: "manual" | "period_complete" | null;
    pausedAt: string | null;
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
  guestName: string | null;
  controller: "HUMAN" | "BOT";
  botStrategy: string | null;
  role: string;
  status: string;
  seat: number | null;
  color: string | null;
  figurine: string | null;
  track: "RAT_RACE" | "FAST_TRACK";
  position: number;
  fastTrackPosition: number;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    figurine: string | null;
    gameRoomView: "classic" | "journey";
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
  bankruptcyStatus: "NONE" | "LIQUIDATING" | "RECOVERED" | "ELIMINATED";
  bankruptcyTurns: number;
  bankruptcyDeclaredAt: string | null;
  bankruptcyEliminatedAt: string | null;
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

export interface MarketSaleOfferState {
  gamePlayerId: string;
  assetId: string;
  assetName: string;
  salePriceCents: number;
  mortgageCents: number;
  proceedsCents: number;
  cashflowCents: number;
  netCashflowChangeCents: number;
  cashflowAdjustmentCents: number;
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
      type: "stock_sale_window";
      gamePlayerId: string;
      cardId: number;
      cardType: "SMALL_DEAL" | "BIG_DEAL" | "FAST_TRACK";
      title: string;
      symbol: string;
      salePriceCents: number;
      sellerGamePlayerIds: string[];
      resolvedGamePlayerIds: string[];
    }
  | {
      type: "charity_choice";
      gamePlayerId: string;
      donationCents: number;
      turns: number;
    }
  | {
      type: "doodad_payment_choice";
      gamePlayerId: string;
      cardId: number;
      title: string;
      cashPriceCents: number;
      creditBalanceCents: number;
      creditPaymentCents: number;
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
      netCashflowChangeCents: number;
      cashflowAdjustmentCents: number;
      offerNumber: number;
      totalOffers: number;
      remainingOffers: MarketSaleOfferState[];
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
