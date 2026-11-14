"use client";

import { CompactAssets, isStockAsset } from "./asset-portfolio";
import { SandboxPanel } from "./sandbox-panel";
import { Game202Panel } from "./game-202-panel";
import { GameModeSettings } from "./game-mode-settings";
import { RatRaceBoard, RatRaceMobileBoard as MobileBoard, RatRaceTabs, PlayerToken, cellTypes } from "./rat-race-layout";

import { fastTrackCells, isDreamCell } from "@cashflow/shared";
import { DreamPicker, FastTrackPanel } from "./fast-track-panel";
import { BotLevelButtons, type BotLevelValue } from "./bot-level-buttons";
import { BankDialog } from "./bank-dialog";
import { MobileTurnDialog } from "./mobile-turn-dialog";
import { boardStepDuration } from "./board-movement";
import { useBoardMovement } from "./use-board-movement";
import { useMobileGameHeader } from "./use-mobile-game-header";
import { DiceAction, DiceFace } from "./dice-action";
import { GameActionHistory } from "./game-action-history";
import { CashChangeVisualization } from "./cash-change-visualization";
import { JournalCard, MoneyBoldText } from "./journal-card";
import { ChoicePanel, DecisionPanel, FundingProgress, MarketSalePanel, PurchasePanel, StockSalePanel } from "./game-decision-panels";
import { TurnMovement } from "./turn-movement";
import { recoveredActionEvents } from "./game-action-timeout";
import { FinancialPlayerReport, FinancialExpenses, CreditList, Metric, PlayerIdentityMark, ProgressBar } from "./financial-report";
import { expenseItems, liabilityLabels, repayableLiabilityRows } from "./financial-report-model";

import {
  availableBankLoanCents,
  bankLoanIncrementCents,
  bankLoanPaymentCents,
  canEscapeRatRace,
  dealDownPaymentAmount,
  isDealAuctionOpportunity,
  isBabyGiftWindowOpen,
  outstandingBankLoanBalanceCents,
  realtimeEvents,
  type FigurineId
} from "@cashflow/shared";
import {
  ArrowRightToLine,
  Banknote,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  CircleAlert,
  CircleOff,
  Dices,
  Gift,
  HandCoins,
  Handshake,
  Heart,
  Hourglass,
  Landmark,
  Minus,
  MoveRight,
  Plus,
  ShieldCheck,
  UserX,
  UsersRound,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { io, Socket } from "socket.io-client";
import { acceptGameSnapshot } from "@/lib/game-snapshot-order";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FigurinePicker } from "@/components/figurine-picker";
import {
  DealAuctionDialog,
  type DealAuctionPlayerRow
} from "@/components/game/deal-auction-dialog";
import {
  GameRoomVariantTwo,
  type GameRoomView
} from "@/components/game/game-room-variant-two";
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import { LobbySettings } from "@/components/game/lobby-settings";
import {
  compactPlayerActionDetails,
  eventCashChange,
  eventReasonLabel
} from "@/components/game/game-event-result";
import { gameEndPresentation } from "@/components/game/game-end-result";
import {
  normalizeStockQuantity
} from "@/components/game/stock-purchase-calculation";
import { gamePlayerForEvent } from "@/components/game/game-journal";
import {
  normalizeStockSaleQuantity,
  stockSaleResetKey,
  type StockSaleQuantity
} from "@/components/game/stock-sale-state";
import { useSetGameRoomHeader } from "@/components/layout/game-room-header-context";
import { publicApiBaseUrl, publicSocketBaseUrl, publicSocketPath } from "@/lib/api";
import {
  checkConnection as runConnectionCheck,
  initialConnectionDiagnostics,
  phaseFromConnectError,
  phaseFromDisconnect,
  reportConnectionIssue,
  socketOptions,
  type ConnectionDiagnostics
} from "@/lib/connection-health";
import { money } from "@/lib/format";
import { gamePlayerName, unresolvedStockSellerNames } from "@/lib/game-player";
import { gameStatusLabel, localizeGameText } from "@/lib/game-labels";
import { cn } from "@/lib/utils";
import type {
  FinancialState,
  GameEvent,
  GamePlayer,
  GameSnapshot,
  PlayerLiability
} from "@/lib/types";

type GameActionResult = {
  snapshot?: GameSnapshot;
  events?: Array<{ type: string; payload: Record<string, unknown> }>;
  message?: string;
};

type TurnAnimationPhase = "ready" | "rolling" | "moving" | "landed";
const socketTimeoutMessage = "Сервер долго не отвечает. Проверьте соединение и повторите действие.";
const socketRecoveryMessage = "Ответ задержался. Состояние партии обновлено — проверьте результат перед повтором.";
const socketUnavailableMessage = "Игровой сервер пока недоступен. Переподключение выполняется автоматически.";

function isConnectionError(message: string | null) {
  return message === socketTimeoutMessage || message === socketRecoveryMessage || message === socketUnavailableMessage;
}
type DecisionSubmission =
  | "deal_buy"
  | "deal_decline"
  | "deal_auction_start"
  | "deal_auction_bid"
  | "deal_auction_decline"
  | "deal_auction_select"
  | "deal_auction_cancel"
  | "market_sell"
  | "market_decline"
  | "stock_sell"
  | "stock_decline";

type UserSearchResult = {
  id: string;
  displayName: string;
  email: string;
};

function gameErrorMessage(error: unknown, fallback: string) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  return /[А-Яа-яЁё]/u.test(message) ? message : fallback;
}

export function GameRoom({
  initialSnapshot,
  token,
  currentUserId,
  currentUserRole,
  gameRoomView,
  timeZone,
  stayOnEndedGame = false
}: {
  initialSnapshot: GameSnapshot;
  token: string;
  currentUserId: string;
  currentUserRole: "USER" | "HOST" | "ADMIN";
  gameRoomView: GameRoomView;
  timeZone: string | null;
  stayOnEndedGame?: boolean;
}) {
  const router = useRouter();
  const [trackView, setTrackView] = useState<"RAT_RACE" | "FAST_TRACK" | null>(null);
  const [fastDiceCount, setFastDiceCount] = useState(2);
  const [fastBusy, setFastBusy] = useState(false);
  const initialMe = initialSnapshot.players.find(
    (player) => player.userId === currentUserId && player.role === "PLAYER"
  );
  const initialTakenFigurines = new Set(
    initialSnapshot.players
      .filter((player) => player.id !== initialMe?.id)
      .map((player) => player.figurine)
      .filter((figurine): figurine is string => Boolean(figurine))
  );
  const initialPreferredFigurine = initialMe?.user?.figurine;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxPlayerId, setSandboxPlayerId] = useState(initialMe?.id ?? initialSnapshot.players[0]?.id ?? "");
  const sandboxActionPending = useRef(false);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [connection, setConnection] = useState<ConnectionDiagnostics>(
    initialConnectionDiagnostics
  );
  const [error, setError] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState(1000);
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [dealQuantity, setDealQuantity] = useState<number | "">("");
  const [dealAuctionBid, setDealAuctionBid] = useState<number | "">("");
  const [turnAnimationPhase, setTurnAnimationPhase] = useState<TurnAnimationPhase>("ready");
  const [turnTabRequest, setTurnTabRequest] = useState(0);
  const [rollingDice, setRollingDice] = useState(false);
  const [diceFaces, setDiceFaces] = useState([6]);
  const [stockSaleQuantity, setStockSaleQuantity] = useState<StockSaleQuantity>(1);
  const [decisionSubmission, setDecisionSubmission] = useState<DecisionSubmission | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [changingParticipation, setChangingParticipation] = useState(false);
  const [figurinePickerOpen, setFigurinePickerOpen] = useState(false);
  const [dreamPickerOpen, setDreamPickerOpen] = useState(false);
  const [figurineChoice, setFigurineChoice] = useState<string | null>(
    initialMe?.figurine ??
      (initialPreferredFigurine && !initialTakenFigurines.has(initialPreferredFigurine)
        ? initialPreferredFigurine
        : null)
  );
  const [figurineSaving, setFigurineSaving] = useState(false);
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [modeSetupPending, setModeSetupPending] = useState(initialSnapshot.game.gameTypeSelected === false);
  const [settingsPending, setSettingsPending] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileBoardRef = useRef<HTMLDivElement>(null);
  const expirationRefreshRef = useRef(false);
  const lastDiagnosticReportRef = useRef(0);
  const decisionSubmissionRef = useRef(false);

  const setGameRoomHeader = useSetGameRoomHeader();

  useEffect(() => {
    const socket = io(`${publicSocketBaseUrl()}/games`, {
      ...socketOptions(token),
      path: publicSocketPath()
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setError((current) => current === socketUnavailableMessage ? null : current);
      setConnection((current) => ({
        ...current,
        phase: "connected",
        lastConnectedAt: new Date().toISOString(),
        lastDisconnectReason: null,
        reconnectAttempt: 0
      }));
      socket.emit("game:join", { gameId: initialSnapshot.game.id });
      void refreshConnection(socket);
    });
    socket.io.on("reconnect_attempt", (attempt) => {
      setConnection((current) => ({
        ...current,
        phase: navigator.onLine ? "reconnecting" : "offline",
        reconnectAttempt: attempt
      }));
    });
    socket.on("disconnect", (reason) => {
      setConnection((current) => {
        const next = {
          ...current,
          phase: phaseFromDisconnect(reason, navigator.onLine),
          lastDisconnectReason: reason
        };
        reportConnectionOnce("socket_disconnect", `Игровой канал отключён: ${reason}`, next);
        return next;
      });
    });
    socket.on(realtimeEvents.stateUpdate, (value: GameSnapshot) => {
      if (!value?.game?.id) return;
      if (value.game.status === "CANCELLED") {
        leaveGamePage();
        return;
      }
      setSnapshot((current) => acceptGameSnapshot(current, value));
      setError((current) => isConnectionError(current) ? null : current);
    });
    socket.on("game:deleted", () => leaveGamePage());
    socket.on(realtimeEvents.chatMessage, (message) => {
      setSnapshot((current) => ({
        ...current,
        chatMessages: current.chatMessages.some((item) => item.id === message.id)
          ? current.chatMessages
          : [...current.chatMessages, message]
      }));
    });
    socket.on("connect_error", (caught) => {
      const phase = phaseFromConnectError(caught, navigator.onLine);
      setConnection((current) => {
        const next = {
          ...current,
          phase,
          lastDisconnectReason: caught.message
        };
        reportConnectionOnce("socket_connect_error", caught.message, next);
        return next;
      });
      setError(
        phase === "session_expired"
          ? "Сессия истекла. Войдите в аккаунт заново."
          : socketUnavailableMessage
      );
    });
    const handleOffline = () => {
      setConnection((current) => ({ ...current, phase: "offline" }));
    };
    const handleOnline = () => {
      setConnection((current) => ({ ...current, phase: "reconnecting" }));
      socket.connect();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (!socket.connected) socket.connect();
      void fetch(`${publicApiBaseUrl()}/api/games/${initialSnapshot.game.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000)
      }).then((response) => response.ok ? response.json() as Promise<GameSnapshot> : null)
        .then((value) => {
          if (value?.game?.id) setSnapshot((current) => acceptGameSnapshot(current, value));
        }).catch(() => {});
    };
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [initialSnapshot.game.id, token, router]);

  const connected = connection.phase === "connected";

  useEffect(() => {
    return () => {
      stopDiceAnimation();
    };
  }, []);

  useEffect(() => {
    const deadlineAt = snapshot.game.periodDeadlineAt ?? snapshot.game.deadlineAt;
    if (snapshot.game.status === "PAUSED") {
      setRemainingSeconds(snapshot.game.remainingPeriodSeconds ?? 0);
      expirationRefreshRef.current = false;
      return;
    }
    if (snapshot.game.status !== "IN_PROGRESS" || !deadlineAt) {
      setRemainingSeconds(null);
      expirationRefreshRef.current = false;
      return;
    }

    const updateTimer = async () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(remaining);
      if (remaining > 0 || expirationRefreshRef.current) return;

      expirationRefreshRef.current = true;
      try {
        if (socketRef.current?.connected) {
          applyActionResult(await emitWithAck("game:timer_sync", {}));
        } else {
          const response = await fetch(
            `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/timer/sync`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          if (response.ok) {
            applyActionResult((await response.json()) as GameActionResult);
          }
        }
      } finally {
        expirationRefreshRef.current = false;
      }
    };

    void updateTimer();
    const interval = window.setInterval(() => void updateTimer(), 1000);
    return () => window.clearInterval(interval);
  }, [
    snapshot.game.deadlineAt,
    snapshot.game.id,
    snapshot.game.periodDeadlineAt,
    snapshot.game.remainingPeriodSeconds,
    snapshot.game.status,
    token
  ]);

  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.game.currentPlayerId
  );
  const gamePlayers = snapshot.players.filter((player) => player.role === "PLAYER" && player.status === "JOINED");
  const me = gamePlayers.find((player) => snapshot.sandbox ? player.id === sandboxPlayerId : player.userId === currentUserId);
  useEffect(() => {
    if (initialSnapshot.players.some((player) => player.userId === currentUserId && player.status === "JOINED") && !snapshot.players.some((player) => player.userId === currentUserId && player.status === "JOINED")) {
      router.replace("/dashboard");
    }
  }, [currentUserId, initialSnapshot.players, router, snapshot.players]);
  const ownFigurine = me?.figurine;
  const hasPlayerMembership = Boolean(me);
  const setupReady = snapshot.game.gameTypeSelected !== false && !modeSetupPending;
  const choosingDream = setupReady && snapshot.game.status === "WAITING" && snapshot.game.rulesVersion === 2 && Boolean(me) && (!isDreamCell(me?.dreamCellIndex) || dreamPickerOpen);
  const choosingFigurine = setupReady && snapshot.game.status === "WAITING" && Boolean(me) && !choosingDream && !me?.figurine;
  const showFastTrack = snapshot.game.rulesVersion === 2 && snapshot.game.status !== "WAITING" && (trackView ?? me?.track ?? currentPlayer?.track) === "FAST_TRACK";
  useEffect(() => { setTrackView(null); }, [me?.track, currentPlayer?.track]);
  const hasFastTrackPlayers = gamePlayers.some((player) => player.track === "FAST_TRACK");
  const viewportMode = snapshot.game.status === "WAITING" || (snapshot.game.gameType === "202" && showFastTrack)
    ? null
    : showFastTrack || snapshot.game.gameType === "202"
      ? "classic"
      : gameRoomView;
  const mobileHeaderHidden = useMobileGameHeader(viewportMode === "classic");
  const movement = useBoardMovement(snapshot, "RAT_RACE", me?.id, turnAnimationPhase);
  const boardSnapshot = movement.snapshot;
  useEffect(() => {
    const desktopViewport = window.matchMedia(
      viewportMode === "classic" ? "(min-width: 1024px)" : "(min-width: 1280px)"
    );
    const documentElement = document.documentElement;
    const { body } = document;

    const syncViewportLock = () => {
      const shouldLock = viewportMode !== null && snapshot.game.status !== "WAITING" && desktopViewport.matches;

      documentElement.classList.toggle("game-room-viewport-locked", shouldLock);
      body.classList.toggle("game-room-viewport-locked", shouldLock);

      if (shouldLock) {
        documentElement.scrollTop = 0;
        body.scrollTop = 0;
      }
    };

    syncViewportLock();
    desktopViewport.addEventListener("change", syncViewportLock);

    return () => {
      desktopViewport.removeEventListener("change", syncViewportLock);
      documentElement.classList.remove("game-room-viewport-locked");
      body.classList.remove("game-room-viewport-locked");
    };
  }, [viewportMode, snapshot.game.status]);

  const takenFigurines = gamePlayers
    .filter((player) => player.id !== me?.id)
    .map((player) => player.figurine)
    .filter((figurine): figurine is string => Boolean(figurine));
  const playersWithoutFigurines = gamePlayers.filter((player) => player.status === "JOINED" && !player.figurine);
  const humanGamePlayers = gamePlayers.filter((player) => player.controller === "HUMAN");
  const startDisabledReason =
    settingsPending ? "Дождитесь сохранения настроек игры." :
    gamePlayers.length < 2
      ? "Для старта нужны минимум два игрока."
      : gamePlayers.length > Math.min(snapshot.game.maxPlayers ?? 12, 12)
        ? "Игроков больше установленного лимита."
      : humanGamePlayers.length === 0
        ? "Для старта нужен хотя бы один человек."
      : playersWithoutFigurines.length > 0
        ? "Все игроки должны выбрать фигурки."
        : snapshot.game.rulesVersion === 2 && gamePlayers.some((player) => player.status === "JOINED" && !isDreamCell(player.dreamCellIndex))
          ? "Все игроки должны выбрать мечту большого круга."
          : null;
  const selectedPlayer = me ?? gamePlayers[0];
  const canRoll =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.id === me?.id && !sandboxBusy &&
    me?.financialState?.bankruptcyStatus !== "LIQUIDATING";
  const isAdmin = currentUserRole === "ADMIN";
  const isSolo = snapshot.game.mode === "SOLO";
  const roomMembership = snapshot.players.find(
    (player) => player.userId === currentUserId && player.status === "JOINED"
  );
  const canManage =
    isAdmin ||
    (isSolo && snapshot.game.createdById === currentUserId) ||
    (currentUserRole === "HOST" && snapshot.game.createdById === currentUserId) ||
    roomMembership?.role === "HOST";
  const canPause = canManage && snapshot.game.status === "IN_PROGRESS";
  const canResume = canManage && snapshot.game.status === "PAUSED";
  const canStart =
    snapshot.game.status === "WAITING" && setupReady && !settingsPending && !lobbyBusy &&
    canManage && (!snapshot.game.isTest || isAdmin);
  const canChangeHostParticipation =
    !isSolo &&
    snapshot.game.createdById === currentUserId &&
    (currentUserRole === "HOST" || currentUserRole === "ADMIN");
  const pendingAction = snapshot.game.pendingAction;
  const fastTrackReady =
    snapshot.game.rulesVersion === 2 &&
    me?.track === "RAT_RACE" &&
    isDreamCell(me.dreamCellIndex) &&
    me.financialState != null &&
    me.financialState.bankruptcyStatus !== "LIQUIDATING" &&
    canEscapeRatRace(
      me.financialState.passiveIncomeCents,
      me.financialState.totalExpensesCents,
      outstandingBankLoanBalanceCents(me.liabilities) > 0
    );
  const canEnterFastTrack = fastTrackReady && canRoll && !pendingAction;
  const ownPendingAction = pendingAction?.gamePlayerId === me?.id ? pendingAction : null;
  const charityChoice =
    ownPendingAction?.type === "charity_choice" ? ownPendingAction : null;
  const doodadPaymentChoice =
    ownPendingAction?.type === "doodad_payment_choice" ? ownPendingAction : null;
  const marketSaleOffer =
    ownPendingAction?.type === "market_sale" ? ownPendingAction : null;
  const isMyTurn =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.id === me?.id;
  const canAnswerCharity =
    isMyTurn && Boolean(charityChoice);
  const canAnswerDoodadPayment =
    isMyTurn && Boolean(doodadPaymentChoice);
  const canAnswerMarketSale =
    snapshot.game.status === "IN_PROGRESS" && Boolean(marketSaleOffer);
  const canTakeLoan =
    me?.track !== "FAST_TRACK" &&
    snapshot.game.status === "IN_PROGRESS" &&
    Boolean(me) &&
    me?.financialState?.bankruptcyStatus !== "LIQUIDATING";
  const availableLoanAmountCents = availableBankLoanCents(
    me?.financialState?.monthlyCashflowCents ?? 0
  );

  useEffect(() => {
    if (availableLoanAmountCents < bankLoanIncrementCents) return;
    setLoanAmount((current) =>
      Math.min(
        Math.max(
          Math.floor(current / bankLoanIncrementCents) * bankLoanIncrementCents,
          bankLoanIncrementCents
        ),
        availableLoanAmountCents
      )
    );
  }, [availableLoanAmountCents]);

  const activeDiceCount = me?.track === "FAST_TRACK" ? (me.financialState?.fastTrackCharity ? fastDiceCount : 2) : (me?.financialState?.charityTurns ?? 0) > 0
    ? 2
    : 1;
  const canChooseDeal = isMyTurn && ownPendingAction?.type === "choose_deal";
  const latestBuyableCard = useMemo(
    () => latestDealCard(snapshot.events, ownPendingAction),
    [ownPendingAction, snapshot.events]
  );
  const latestDealDecisionCard =
    ownPendingAction?.type === "deal_card_drawn" ||
    ownPendingAction?.type === "stock_sale_window"
      ? latestBuyableCard && {
          ...latestBuyableCard,
          isAuctionEligible:
            latestBuyableCard.isAuctionEligible &&
            ownPendingAction.type === "deal_card_drawn" &&
            !ownPendingAction.auctionAttempted
        }
      : null;
  const dealAuction = pendingAction?.type === "deal_auction" ? pendingAction : null;
  const dealAuctionCard = useMemo(
    () => latestDealCard(snapshot.events, dealAuction),
    [dealAuction, snapshot.events]
  );
  const dealAuctionResponse =
    dealAuction && me
      ? dealAuction.responses.find((response) => response.gamePlayerId === me.id) ?? null
      : null;
  const isDealAuctionBidder = Boolean(
    dealAuction && me && dealAuction.bidderGamePlayerIds.includes(me.id)
  );
  const isDealAuctionSeller = Boolean(dealAuction && me?.id === dealAuction.gamePlayerId);
  const dealAuctionResolved = Boolean(
    dealAuction &&
      dealAuction.bidderGamePlayerIds.every((playerId) =>
        dealAuction.responses.some((response) => response.gamePlayerId === playerId)
      )
  );
  const dealAuctionRows: DealAuctionPlayerRow[] = dealAuction
    ? dealAuction.bidderGamePlayerIds.map((playerId) => {
        const player = gamePlayers.find((candidate) => candidate.id === playerId);
        const response = dealAuction.responses.find(
          (candidate) => candidate.gamePlayerId === playerId
        );
        return {
          id: playerId,
          name: gamePlayerName(player),
          status: !response
            ? "waiting"
            : response.amountCents === null && !response.hasBid
              ? "declined"
              : "offered",
          amountCents: response?.amountCents ?? null
        };
      })
    : [];
  useEffect(() => {
    setDealAuctionBid("");
  }, [dealAuction?.cardId]);
  const auctionPanel = dealAuction && dealAuctionCard && (isDealAuctionSeller || isDealAuctionBidder) ? (
    <DealAuctionDialog
      open
      role={isDealAuctionSeller ? "seller" : "bidder"}
      card={dealAuctionCard}
      rows={dealAuctionRows}
      resolved={dealAuctionResolved}
      hasResponded={Boolean(dealAuctionResponse)}
      bidDraft={dealAuctionBid}
      currentCashCents={me?.financialState?.cashCents ?? 0}
      submitting={Boolean(decisionSubmission?.startsWith("deal_auction_"))}
      onBidDraftChange={setDealAuctionBid}
      onBid={bidOnLatestDealAuction}
      onDecline={declineLatestDealAuction}
      onSelect={selectLatestDealAuctionOffer}
      onCancel={cancelLatestDealAuction}
    />
  ) : null;
  const waitingStockSellerNames =
    ownPendingAction?.type === "stock_sale_window"
      ? unresolvedStockSellerNames(
          gamePlayers,
          ownPendingAction.sellerGamePlayerIds,
          ownPendingAction.resolvedGamePlayerIds
        )
      : [];
  const stockSaleOffer = useMemo(
    () => stockSaleOfferForPlayer(pendingAction, me),
    [me, pendingAction]
  );
  const requiresOwnDecision = snapshot.game.status === "IN_PROGRESS" && Boolean(
    ownPendingAction || stockSaleOffer || (isDealAuctionBidder && !dealAuctionResponse)
  );
  const currentStockSaleResetKey = stockSaleResetKey(stockSaleOffer);
  useEffect(() => {
    if (snapshot.game.status !== "WAITING" || !hasPlayerMembership) {
      setFigurinePickerOpen(false);
      return;
    }
    if (ownFigurine) {
      setFigurineChoice(ownFigurine);
    }
  }, [hasPlayerMembership, ownFigurine, snapshot.game.status]);

  useEffect(() => {
    setGameRoomHeader({
      gameId: snapshot.game.id,
      currentUserId,
      player: me,
      title: snapshot.game.title,
      status: snapshot.game.status,
      connected,
      connection,
      code: snapshot.game.code,
      isSolo,
      currentPeriod: snapshot.game.currentPeriod,
      periodCount: snapshot.game.periodCount,
      remainingSeconds,
      timelineLoading,
      startsNextPeriod: snapshot.game.pauseReason === "period_complete",
      chatMessages: snapshot.chatMessages,
      onSendChat: (body) => emit("chat:send", { body }),
      onPause: canPause ? () => void pauseGame() : null,
      onResume: canResume ? () => void resumeGame() : null,
      hostDisplayView: canManage && !isSolo && snapshot.game.gameType !== "202" ? gameRoomView : null,
      viewportMode,
      gameType: snapshot.game.gameType ?? "101",
      mobileHeaderHidden: snapshot.sandbox ? false : mobileHeaderHidden,
      trackView: snapshot.game.rulesVersion === 2 && snapshot.game.status !== "WAITING" && hasFastTrackPlayers ? (showFastTrack ? "FAST_TRACK" : "RAT_RACE") : null,
      onTrackChange: setTrackView,
      onOpenSandbox: snapshot.sandbox ? () => setSandboxOpen(true) : undefined,
      onCheckConnection: () => void refreshConnection()
    });
  }, [
    canManage,
    canPause,
    canResume,
    connected,
    connection,
    currentPlayer,
    me,
    currentUserId,
    isSolo,
    setGameRoomHeader,
    snapshot.game.code,
    snapshot.game.id,
    snapshot.game.currentPeriod,
    snapshot.game.pauseReason,
    snapshot.game.periodCount,
    snapshot.game.status,
    snapshot.game.title,
    gameRoomView,
    showFastTrack,
    hasFastTrackPlayers,
    viewportMode,
    mobileHeaderHidden,
    snapshot.game.rulesVersion,
    snapshot.game.gameType,
    snapshot.chatMessages,
    remainingSeconds,
    timelineLoading
  ]);

  useEffect(() => {
    return () => setGameRoomHeader(null);
  }, [setGameRoomHeader]);

  useEffect(() => {
    setDealQuantity("");
  }, [latestBuyableCard?.cardId]);

  useEffect(() => {
    if (currentStockSaleResetKey) setStockSaleQuantity(1);
  }, [currentStockSaleResetKey]);

  useEffect(() => {
    if (snapshot.game.status === "ENDED" && !snapshot.sandbox && !stayOnEndedGame && snapshot.game.gameType !== "202") {
      router.replace(`/games/${snapshot.game.id}/results` as Route);
    }
  }, [router, snapshot.game.id, snapshot.game.status, stayOnEndedGame]);

  useEffect(() => {
    if (canRoll && !pendingAction && !rollingDice) {
      setDiceFaces(Array.from({ length: activeDiceCount }, () => 6));
      setTurnAnimationPhase("ready");
    }
  }, [activeDiceCount, canRoll, pendingAction, rollingDice]);

  async function startGame() {
    setError(null);
    if (lobbyBusy || !setupReady || settingsPending) return;
    setLobbyBusy(true);
    try {
    if (socketRef.current?.connected) {
        const result = await emitWithAck("game:start", {});
        if (result.message) throw new Error(result.message);
        applyActionResult(result);
      return;
    }

    const response = await fetch(
      `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/start`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(gameErrorMessage(result.message, "Не удалось начать партию"));
    }
    setSnapshot((current) => acceptGameSnapshot(current, result.snapshot ?? result));
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось начать партию"));
    } finally {
      setLobbyBusy(false);
    }
  }

  async function lobbyAction(path: string, method: "POST" | "DELETE", body?: Record<string, unknown>) {
    if (lobbyBusy) return;
    setLobbyBusy(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${path}`, {
        method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const result = await response.json() as GameActionResult;
      if (!response.ok) throw new Error(gameErrorMessage(result.message, "Не удалось изменить состав игры"));
      applyActionResult(result);
    } catch (cause) {
      setError(gameErrorMessage(cause, "Не удалось изменить состав игры"));
    } finally {
      setLobbyBusy(false);
    }
  }

  async function pauseGame() {
    await changeGameTimeline("pause", "game:pause", "Не удалось поставить игру на паузу");
  }

  async function resumeGame() {
    await changeGameTimeline("resume", "game:resume", "Не удалось продолжить игру");
  }

  async function changeGameTimeline(
    action: "pause" | "resume",
    socketEvent: string,
    fallbackMessage: string
  ) {
    if (timelineLoading) return;
    setTimelineLoading(true);
    setError(null);
    try {
      if (socketRef.current?.connected) {
        applyActionResult(await emitWithAck(socketEvent, {}));
        return;
      }
      const response = await fetch(
        `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const result = (await response.json()) as GameActionResult;
      if (!response.ok) {
        throw new Error(result.message ?? fallbackMessage);
      }
      applyActionResult(result);
    } catch (event) {
      setError(gameErrorMessage(event, fallbackMessage));
    } finally {
      setTimelineLoading(false);
    }
  }

  async function chooseFigurine(figurine = figurineChoice) {
    if (!figurine || figurineSaving || takenFigurines.includes(figurine)) return;
    setError(null);
    setFigurineSaving(true);
    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/figurine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ figurine })
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message === "Эту фигурку уже выбрал другой игрок"
            ? "Эту фигурку уже выбрал другой игрок"
            : result.message ?? "Не удалось выбрать фигурку"
        );
      }
      setSnapshot((current) => acceptGameSnapshot(current, result.snapshot ?? result));
      setFigurinePickerOpen(false);
      if (snapshot.game.mode === "SOLO") await startGame();
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось выбрать фигурку"));
    } finally {
      setFigurineSaving(false);
    }
  }

  async function addUserToGame(body: { userId: string; role: string }) {
    setError(null);
    const response = await fetch(
      `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      }
    );
    const result = await response.json();
    if (!response.ok) {
      setError(gameErrorMessage(result.message, "Не удалось добавить пользователя"));
      return;
    }
    setSnapshot((current) => acceptGameSnapshot(current, result.snapshot ?? result));
  }

  async function changeHostParticipation(participates: boolean) {
    setError(null);
    setChangingParticipation(true);
    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/host-participation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ participates })
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setError(
          gameErrorMessage(result.message, "Не удалось изменить участие ведущего")
        );
        return;
      }
      setSnapshot((current) => acceptGameSnapshot(current, result.snapshot ?? result));
    } finally {
      setChangingParticipation(false);
    }
  }

  async function requestSandboxAction(action: string, payload: Record<string, unknown>): Promise<GameActionResult> {
    if (sandboxActionPending.current) throw new Error("Дождитесь завершения текущего действия");
    sandboxActionPending.current = true;setSandboxBusy(true);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/sandbox/action`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ run: snapshot.sandbox!.run, playerId: me?.id, action, payload })
      });
      const result = await response.json() as GameActionResult;
      if (!response.ok) throw new Error(result.message ?? "Не удалось выполнить действие");
      return result;
    } finally { sandboxActionPending.current = false;setSandboxBusy(false); }
  }

  function emit(event: string, payload: Record<string, unknown>) {
    if (snapshot.sandbox && event !== "chat:send" && !event.startsWith("game:")) {
      void requestSandboxAction(event, payload).then(applyActionResult).catch(cause => setError(gameErrorMessage(cause, "Не удалось выполнить действие")));
      return;
    }
    setError(null);
    socketRef.current?.emit(event, {
      gameId: snapshot.game.id,
      ...payload
    });
  }

  function emitWithAck(event: string, payload: Record<string, unknown>) {
    if (snapshot.sandbox && !event.startsWith("game:")) return requestSandboxAction(event, payload);
    return new Promise<GameActionResult>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error("Соединение с игрой неактивно"));
        return;
      }
      const previousSequence = snapshot.events.reduce((max, item) => Math.max(max, item.sequence), 0);
      socket.timeout(10_000).emit(
        event,
        {
          gameId: snapshot.game.id,
          ...payload
        },
        async (timeoutError: Error | null, result?: GameActionResult) => {
          if (timeoutError) {
            const message = `Команда ${event} не получила ответ за 10 секунд`;
            void reportConnectionIssue({
              token,
              gameId: snapshot.game.id,
              kind: "socket_timeout",
              message,
              diagnostics: connection
            });
            void refreshConnection(socket);
            try {
              const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
                signal: AbortSignal.timeout(5_000)
              });
              if (response.ok) {
                const latest = await response.json() as GameSnapshot;
                if (latest?.game?.id === snapshot.game.id) {
                  setSnapshot((current) => acceptGameSnapshot(current, latest));
                  const recovered = recoveredActionEvents(event, latest.events, previousSequence, me?.id ?? null);
                  if (recovered) {
                    resolve({ snapshot: latest, events: recovered });
                    return;
                  }
                  reject(new Error(socketRecoveryMessage));
                  return;
                }
              }
            } catch {
              // The HTTP check is best effort; the socket may still reconnect.
            }
            reject(new Error(socketTimeoutMessage));
            return;
          }
          resolve(result ?? {});
        }
      );
    });
  }

  async function refreshConnection(socket = socketRef.current) {
    setConnection((current) => ({ ...current, checking: true }));
    const result = await runConnectionCheck(socket);
    setConnection((current) => ({ ...current, ...result, checking: false }));
  }

  function reportConnectionOnce(
    kind: "socket_connect_error" | "socket_disconnect",
    message: string,
    diagnostics: ConnectionDiagnostics
  ) {
    const now = Date.now();
    if (now - lastDiagnosticReportRef.current < 60_000) return;
    lastDiagnosticReportRef.current = now;
    void reportConnectionIssue({
      token,
      gameId: initialSnapshot.game.id,
      kind,
      message,
      diagnostics
    });
  }

  function applyActionResult(result: GameActionResult) {
    const nextSnapshot = result.snapshot;
    if (nextSnapshot?.game?.id) {
      if (nextSnapshot.game.status === "CANCELLED") {
        leaveGamePage();
        return;
      }
      setSnapshot((current) => acceptGameSnapshot(current, nextSnapshot));
    }
  }

  function leaveGamePage() {
    router.replace("/dashboard");
    router.refresh();
  }

  async function fastAction(path: string, body: Record<string, unknown> = {}) {
    if (fastBusy) return false;
    setFastBusy(true);
    setError(null);
    try {
      if (snapshot.sandbox) {
        applyActionResult(await requestSandboxAction(path, body));
        if (path === "fast-track/enter") setTrackView("FAST_TRACK");
        return true;
      }
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(". ") : result.message ?? "Не удалось выполнить действие");
      applyActionResult(result as GameActionResult);
      if (path === "fast-track/enter") setTrackView("FAST_TRACK");
      return true;
    } catch (caught) { setError(gameErrorMessage(caught, "Не удалось выполнить действие")); return false; }
    finally { setFastBusy(false); }
  }

  async function rollDice() {
    if (rollingDice) return;
    if (!snapshot.sandbox && !socketRef.current?.connected) {
      setError("Соединение с игрой восстанавливается. Дождитесь подключения и повторите бросок.");
      return;
    }
    setError(null);
    setRollingDice(true);
    setTurnAnimationPhase("rolling");
    startDiceAnimation(activeDiceCount);
    const startedAt = Date.now();

    try {
      const result = await emitWithAck(realtimeEvents.playerRollDice, { diceCount: activeDiceCount, expectedTurn: `${snapshot.game.currentRound}:${snapshot.game.currentTurnIndex}` });
      applyActionResult(result);
      const dice = diceValuesFromActionResult(result) ?? diceFaces;
      const move = moveFromActionResult(result);
      const remaining = Math.max(0, 1000 - (Date.now() - startedAt));
      await wait(remaining);
      stopDiceAnimation();
      setDiceFaces(dice);
      setTurnAnimationPhase(move ? "moving" : "landed");
      await wait(450);

      if (move) {
        setTurnAnimationPhase("moving");
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduceMotion) await wait(move.steps * boardStepDuration);
      }

      setTurnAnimationPhase("landed");
      await wait(2500);
    } catch (event) {
      stopDiceAnimation();
      setTurnAnimationPhase("ready");
      setError(gameErrorMessage(event, "Не удалось бросить кубик"));
    } finally {
      setRollingDice(false);
    }
  }

  async function skipTurn() {
    if (rollingDice) return;
    setError(null);
    try {
      const result = await emitWithAck("turn:skip", {});
      applyActionResult(result);
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось пропустить ход"));
    }
  }

  function draw(cardType: string) {
    emit(realtimeEvents.cardDraw, { cardType });
  }

  async function submitDecision(
    kind: DecisionSubmission,
    event: string,
    payload: Record<string, unknown>,
    fallbackMessage: string
  ) {
    if (decisionSubmissionRef.current) return;
    decisionSubmissionRef.current = true;
    setDecisionSubmission(kind);
    setError(null);

    try {
      const result = await emitWithAck(event, payload);
      applyActionResult(result);
    } catch (caught) {
      setError(gameErrorMessage(caught, fallbackMessage));
    } finally {
      decisionSubmissionRef.current = false;
      setDecisionSubmission(null);
    }
  }

  function buyLatestDeal() {
    if (!latestBuyableCard) return;
    if (latestBuyableCard.isStock && (!dealQuantity || dealQuantity < 1)) return;
    void submitDecision(
      "deal_buy",
      realtimeEvents.dealBuy,
      {
        cardId: latestBuyableCard.cardId,
        quantity: latestBuyableCard.isStock ? dealQuantity : 1
      },
      "Не удалось купить сделку"
    );
  }

  function declineLatestDeal() {
    void submitDecision(
      "deal_decline",
      "deal:decline",
      {},
      "Не удалось отказаться от сделки"
    );
  }

  function startLatestDealAuction() {
    if (!latestDealDecisionCard) return;
    void submitDecision(
      "deal_auction_start",
      realtimeEvents.dealAuctionStart,
      { cardId: latestDealDecisionCard.cardId },
      "Не удалось начать аукцион"
    );
  }

  function bidOnLatestDealAuction() {
    if (typeof dealAuctionBid !== "number" || dealAuctionBid < 1) return;
    void submitDecision(
      "deal_auction_bid",
      realtimeEvents.dealAuctionBid,
      { amountCents: dealAuctionBid },
      "Не удалось отправить предложение"
    );
  }

  function declineLatestDealAuction() {
    void submitDecision(
      "deal_auction_decline",
      realtimeEvents.dealAuctionDecline,
      {},
      "Не удалось отказаться от аукциона"
    );
  }

  function selectLatestDealAuctionOffer(buyerGamePlayerId: string) {
    void submitDecision(
      "deal_auction_select",
      realtimeEvents.dealAuctionSelect,
      { buyerGamePlayerId },
      "Не удалось выбрать покупателя"
    );
  }

  function cancelLatestDealAuction() {
    void submitDecision(
      "deal_auction_cancel",
      realtimeEvents.dealAuctionCancel,
      {},
      "Не удалось закрыть аукцион"
    );
  }

  function sellMarketAsset() {
    if (!marketSaleOffer) return;
    void submitDecision(
      "market_sell",
      "market:sell",
      { assetId: marketSaleOffer.assetId },
      "Не удалось продать объект"
    );
  }

  function sellStockFromDeal() {
    if (!stockSaleOffer || stockSaleQuantity === "") return;
    void submitDecision(
      "stock_sell",
      "stock:sell",
      { quantity: Math.min(stockSaleQuantity, stockSaleOffer.quantity) },
      "Не удалось продать акции"
    );
  }

  function declineStockSale() {
    void submitDecision(
      "stock_decline",
      "stock:decline",
      {},
      "Не удалось отказаться от продажи акций"
    );
  }

  function declineMarketSale() {
    if (!marketSaleOffer) return;
    void submitDecision(
      "market_decline",
      "market:decline",
      { assetId: marketSaleOffer.assetId },
      "Не удалось отказаться от продажи"
    );
  }

  function acceptCharity() {
    emit("charity:accept", {});
  }

  function declineCharity() {
    emit("charity:decline", {});
  }

  async function sendBabyGift(birthEventId: string, amountCents: number) {
    setError(null);
    try {
      if (socketRef.current?.connected) {
        const result = await emitWithAck("baby:gift", { birthEventId, amountCents });
        applyActionResult(result);
        return;
      }

      const response = await fetch(
        `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/baby-gifts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ birthEventId, amountCents })
        }
      );
      const result = (await response.json()) as GameActionResult & { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "Не удалось отправить поздравление");
      }
      applyActionResult(result);
    } catch (event) {
      const message = gameErrorMessage(event, "Не удалось отправить поздравление");
      setError(message);
      throw new Error(message);
    }
  }

  function payDoodadWithCash() {
    emit("doodad:pay_cash", {});
  }

  function payDoodadWithCredit() {
    emit("doodad:pay_credit", {});
  }

  async function closeLiability(liability: PlayerLiability) {
    setError(null);
    try {
      const result = await emitWithAck(realtimeEvents.loanRepay, {
        liabilityId: liability.id,
        amountCents: liability.balanceCents
      });
      applyActionResult(result);
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось закрыть кредит"));
    }
  }

  async function takeLoan() {
    if (loanSubmitting) return false;
    setError(null);
    setLoanSubmitting(true);
    try {
      const result = await emitWithAck(realtimeEvents.loanTake, { amountCents: loanAmount });
      applyActionResult(result);
      return true;
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось взять кредит"));
      return false;
    } finally {
      setLoanSubmitting(false);
    }
  }

  async function sellBankruptcyAsset(assetId: string, quantity: number) {
    setError(null);
    try {
      const result = await emitWithAck("bankruptcy:asset_sell", { assetId, quantity });
      applyActionResult(result);
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось продать актив банку"));
    }
  }

  async function repayBankruptcyDebt(liability: PlayerLiability) {
    const cash = me?.financialState?.cashCents ?? 0;
    const amountCents = Math.min(cash, liability.balanceCents);
    if (amountCents <= 0) return;
    setError(null);
    try {
      const result = await emitWithAck("bankruptcy:debt_repay", {
        liabilityId: liability.id,
        amountCents
      });
      applyActionResult(result);
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось погасить долг"));
    }
  }

  function changeLoanAmount(delta: number) {
    setLoanAmount((current) => {
      const next = current + delta;
      return Math.min(
        Math.max(next, bankLoanIncrementCents),
        Math.max(availableLoanAmountCents, bankLoanIncrementCents)
      );
    });
  }

  function updateLoanAmount(value: number) {
    const normalized = Math.max(
      Math.floor((Number(value) || 0) / bankLoanIncrementCents) * bankLoanIncrementCents,
      bankLoanIncrementCents
    );
    setLoanAmount(
      Math.min(
        normalized,
        Math.max(availableLoanAmountCents, bankLoanIncrementCents)
      )
    );
  }

  function updateDealQuantity(value: number | "") {
    setDealQuantity(normalizeStockQuantity(value));
  }

  function updateStockSaleQuantity(value: StockSaleQuantity) {
    const maxQuantity = stockSaleOffer?.quantity ?? 1;
    setStockSaleQuantity(normalizeStockSaleQuantity(value, maxQuantity));
  }

  function changeStockSaleQuantity(delta: number) {
    const current = stockSaleQuantity === "" ? 0 : stockSaleQuantity;
    updateStockSaleQuantity(current + delta);
  }

  function startDiceAnimation(diceCount: number) {
    stopDiceAnimation();
    diceIntervalRef.current = setInterval(() => {
      setDiceFaces(randomDiceValues(diceCount));
    }, 90);
    window.setTimeout(() => {
      stopDiceAnimation();
    }, 1200);
  }

  function stopDiceAnimation() {
    if (!diceIntervalRef.current) return;
    clearInterval(diceIntervalRef.current);
    diceIntervalRef.current = null;
  }

  const enterFastTrackAction = canEnterFastTrack ? (
    <Button variant="action" className="w-full" disabled={fastBusy || rollingDice} onClick={() => void fastAction("fast-track/enter")}>
      На большой круг
    </Button>
  ) : null;

  const renderTurnFeed = (showHeader = true, action?: ReactNode) => (
    <GameTurnFeed
      key={`${snapshot.game.id}:${snapshot.sandbox?.run ?? 0}`}
      gameId={snapshot.game.id}
      token={token}
      events={snapshot.events}
      players={gamePlayers}
      currentGamePlayerId={me?.id ?? null}
      gameStatus={snapshot.game.status}
      onSendBabyGift={sendBabyGift}
      showHeader={showHeader}
      fastTrackOnly={showFastTrack}
      turnPlayerId={snapshot.game.status === "IN_PROGRESS" || snapshot.game.status === "PAUSED" ? snapshot.game.currentPlayerId : null}
      turnKey={`${snapshot.game.currentRound}:${snapshot.game.currentTurnIndex}`}
      currentAction={enterFastTrackAction || (showFastTrack ? action : pendingAction || stockSaleOffer ? action : null)}
      {...(!showFastTrack && !enterFastTrackAction && action && latestDealDecisionCard ? {currentActionEventId: latestDealDecisionCard.event.id} : {})}
    />
  );


  const playerPreparation = <>
      {choosingDream && me ? <DreamPicker embedded gameType={snapshot.game.gameType ?? "101"} player={me} saving={fastBusy} onChoose={(cellIndex) => { void fastAction("dream", { cellIndex }).then((saved) => { if (saved) setDreamPickerOpen(false); }); }} /> : null}
      {choosingFigurine ? (
        <section className="text-ink" aria-labelledby="choose-figurine-title">
          <h2 id="choose-figurine-title" className="text-xl font-extrabold">Выберите фишку</h2>
          <p className="mt-2 text-sm leading-6">Она будет представлять вас на обоих игровых кругах. У каждого игрока своя фишка.</p>
          {me && isDreamCell(me.dreamCellIndex) ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-card p-2 sm:p-3">
              <span className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-lg">
                <img src={`/dreams/${me.dreamCellIndex}.webp`} alt="" width={96} height={64} className="absolute inset-0 h-full w-full object-cover" />
              </span>
              <div className="min-w-0"><p className="text-xs text-muted">Ваша мечта</p><p className="font-extrabold">{fastTrackCells[me.dreamCellIndex]!.label}</p>
                <button type="button" className="mt-1 min-h-9 text-sm font-bold text-journey underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey" onClick={() => setDreamPickerOpen(true)}>Изменить мечту</button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 max-h-[min(65vh,600px)] overflow-y-auto pr-1"><FigurinePicker value={figurineChoice} taken={takenFigurines} onChange={(figurine) => { setFigurineChoice(figurine); void chooseFigurine(figurine); }} disabled={figurineSaving} /></div>
          {figurineSaving ? <p className="mt-3 text-sm" role="status">Сохраняем фишку…</p> : null}
        </section>
      ) : null}
  </>;

  const sandboxPanel = snapshot.sandbox && sandboxOpen ? <SandboxPanel snapshot={snapshot} token={token} playerId={sandboxPlayerId} onPlayerChange={setSandboxPlayerId} onSnapshot={next => { setTrackView(null);setSnapshot(current => acceptGameSnapshot(current, next)); }} onClose={() => setSandboxOpen(false)} /> : null;

  if (snapshot.game.gameType === "202" && snapshot.game202 && snapshot.game.status !== "WAITING") {
    return <>{sandboxPanel}<Game202Panel controlledPlayerId={snapshot.sandbox ? sandboxPlayerId : undefined} snapshot={snapshot} token={token} currentUserId={currentUserId} showFastTrack={showFastTrack} onTrackChange={setTrackView} onSnapshot={next => setSnapshot(current => acceptGameSnapshot(current, next))} /></>;
  }

  return (
    <div
      className={cn(
        "game-room grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5",
        showFastTrack ? "game-room--fast-track-active" : null,
        gameRoomView === "classic" && snapshot.game.status !== "WAITING"
          ? "game-room--classic-active"
          : null,
        gameRoomView === "journey" && snapshot.game.status !== "WAITING"
          ? "game-room--journey-active"
          : null
      )}
    >
      {sandboxPanel}
      {snapshot.game.status === "WAITING" ? <GameModeSettings snapshot={snapshot} token={token} canManage={canManage} isAdmin={isAdmin} disabled={lobbyBusy || settingsPending} onSaved={value => setSnapshot(current => acceptGameSnapshot(current, value))} onPendingChange={setModeSetupPending} /> : null}
      {snapshot.game.status !== "WAITING" || setupReady ? <>
      {snapshot.game.status === "WAITING" ? canManage && !isSolo ? (
        <LobbySettings key={snapshot.game.id} snapshot={snapshot} token={token} timeZone={timeZone} disabled={lobbyBusy} onSaved={value => setSnapshot(current => acceptGameSnapshot(current, value))} onPendingChange={setSettingsPending} />
      ) : (
        <section id="lobby-settings" className="rounded-2xl bg-white p-4 shadow-panel sm:p-5" aria-labelledby="lobby-settings-title">
          <h2 id="lobby-settings-title" className="text-xl font-extrabold">2. Настройки игры</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{isSolo ? "Закрытая партия с ботами без ограничения времени. Состав соперников выбран при создании игры." : "Настройками партии управляет ведущий."}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Название</dt><dd className="mt-1 break-words font-bold">{snapshot.game.title}</dd></div>
            <div><dt className="text-muted">Мест для игроков</dt><dd className="mt-1 font-bold">{snapshot.game.maxPlayers ?? 6}</dd></div>
            <div><dt className="text-muted">Длительность</dt><dd className="mt-1 font-bold">{snapshot.game.timeLimitMinutes ? `${snapshot.game.timeLimitMinutes} мин` : "Без ограничения"}</dd></div>
          </dl>
        </section>
      ) : null}
      <MobileTurnDialog
        open={Boolean(me) && (snapshot.game.status === "IN_PROGRESS" || snapshot.game.status === "PAUSED")}
        currentPlayer={currentPlayer ?? null}
        isMine={currentPlayer?.id === me?.id}
        canRoll={canRoll && !pendingAction}
        requiresDecision={requiresOwnDecision}
        paused={snapshot.game.status === "PAUSED"}
        phase={turnAnimationPhase}
        disabled={fastBusy || snapshot.game.status === "PAUSED"}
        rolling={rollingDice}
        diceValues={diceFaces}
        diceCount={activeDiceCount}
        maxCompactViewportWidth={showFastTrack || gameRoomView === "classic" ? 1023 : 1279}
        onSkip={skipTurn}
        onShowTurn={() => setTurnTabRequest((current) => current + 1)}
        onEnterFastTrack={canEnterFastTrack ? () => { void fastAction("fast-track/enter"); } : undefined}
        rollLabel={canEnterFastTrack ? "Бросить кубики" : undefined}
        onRoll={() => { void rollDice(); }}
      />
      <FigurineDialog
        open={figurinePickerOpen && snapshot.game.status === "WAITING" && Boolean(me)}
        value={figurineChoice}
        taken={takenFigurines}
        saving={figurineSaving}
        error={error}
        canClose={Boolean(me?.figurine)}
        onChange={(figurine) => { setFigurineChoice(figurine); void chooseFigurine(figurine); }}
        onClose={() => setFigurinePickerOpen(false)}
      />
      <BankDialog
        open={bankDialogOpen}
        loanAmount={loanAmount}
        availableLoanAmountCents={availableLoanAmountCents}
        currentCashCents={me?.financialState?.cashCents ?? 0}
        currentMonthlyCashflowCents={me?.financialState?.monthlyCashflowCents ?? 0}
        onLoanDecrease={() => changeLoanAmount(-bankLoanIncrementCents)}
        onLoanIncrease={() => changeLoanAmount(bankLoanIncrementCents)}
        onLoanAmountChange={updateLoanAmount}
        onTakeLoan={async () => {
          const loanTaken = await takeLoan();
          if (loanTaken) setBankDialogOpen(false);
        }}
        canTakeLoan={canTakeLoan}
        loanSubmitting={loanSubmitting}
        onClose={() => setBankDialogOpen(false)}
      />
      {snapshot.game.status === "IN_PROGRESS" &&
      me?.financialState?.bankruptcyStatus === "LIQUIDATING" ? (
        <BankruptcyPanel
          player={me}
          onSellAsset={sellBankruptcyAsset}
          onRepayDebt={repayBankruptcyDebt}
        />
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {canEnterFastTrack && showFastTrack ? (
        <div className="hidden gap-2 lg:grid lg:grid-cols-2" aria-label="Выбор круга для хода">
          <Button variant="secondary" disabled={fastBusy || rollingDice} onClick={() => void fastAction("fast-track/enter")}>На большой круг</Button>
          <Button variant="action" disabled={fastBusy || rollingDice} onClick={() => { setTrackView("RAT_RACE"); void rollDice(); }}>Бросить кубики</Button>
        </div>
      ) : null}
      {snapshot.game.status === "WAITING" ? (
        <WaitingRoomOverview
          snapshot={snapshot}
          isSolo={isSolo}
          canManage={canManage}
          canStart={canStart}
          startDisabledReason={startDisabledReason}
          onStartGame={startGame}
          startBusy={lobbyBusy}
          code={snapshot.game.code}
          token={token}
          preparation={choosingDream || choosingFigurine ? playerPreparation : null}
          settingsPending={settingsPending}
          onAddBot={(level) => void lobbyAction("bots", "POST", { level })}
          onRemovePlayer={(playerId) => void lobbyAction(`players/${playerId}`, "DELETE")}
          onAddUser={addUserToGame}
          canChangeParticipation={canChangeHostParticipation}
          participates={roomMembership?.role === "PLAYER"}
          changingParticipation={changingParticipation}
          onChangeParticipation={changeHostParticipation}
          currentPlayer={me}
          onChooseDream={() => setDreamPickerOpen(true)}
          onChooseFigurine={() => setFigurinePickerOpen(true)}
        />
      ) : null}

      {showFastTrack ? <FastTrackPanel snapshot={snapshot} player={me} onRoll={rollDice} onSkip={skipTurn} rolling={rollingDice} phase={turnAnimationPhase} diceValues={diceFaces} diceCount={activeDiceCount} onDiceCount={setFastDiceCount} onDecision={(buy, decisionId) => void fastAction("fast-track/decision", { buy, decisionId })} busy={fastBusy} turnTabRequest={turnTabRequest}>{(action) => renderTurnFeed(false, action)}</FastTrackPanel> : gameRoomView === "journey" && snapshot.game.status !== "WAITING" ? (
        <GameRoomVariantTwo
          viewerPlayerId={snapshot.sandbox ? sandboxPlayerId : undefined}
          snapshot={boardSnapshot}
          movingPlayerId={movement.movingPlayerId}
          currentUserId={currentUserId}
          canRoll={canRoll && !pendingAction}
          turnTabRequest={turnTabRequest}
          actions={
            <>
                <DiceAction
                  currentPlayer={currentPlayer}
                  isMine={isMyTurn}
                  className="hidden xl:block"
                  pinnedToPanel
                  canRoll={canRoll && !pendingAction}
                  rolling={rollingDice}
                  phase={turnAnimationPhase}
                  statusLabel={canRoll ? "Ваш ход" : undefined}
                  idleLabel={canRoll && pendingAction ? "Выберите действие" : undefined}
                  diceValues={diceFaces}
                  onEnterFastTrack={canEnterFastTrack ? () => { void fastAction("fast-track/enter"); } : undefined}
                  rollLabel={canEnterFastTrack ? "Бросить кубики" : undefined}
                  onRoll={rollDice}
                  onSkip={skipTurn}
                  disabled={fastBusy}
                />
              <ActionsPanel
              canChooseDeal={canChooseDeal}
              onDrawSmallDeal={() => draw("SMALL_DEAL")}
              onDrawBigDeal={() => draw("BIG_DEAL")}
              latestCard={latestDealDecisionCard}
              auctionPanel={auctionPanel}
              charityChoice={charityChoice}
              canAnswerCharity={canAnswerCharity}
              doodadPaymentChoice={doodadPaymentChoice}
              canAnswerDoodadPayment={canAnswerDoodadPayment}
              marketSaleOffer={marketSaleOffer}
              canAnswerMarketSale={canAnswerMarketSale}
              currentCashCents={me?.financialState?.cashCents ?? 0}
              waitingStockSellerNames={waitingStockSellerNames}
              dealQuantity={dealQuantity}
              setDealQuantity={updateDealQuantity}
              onBuyLatest={buyLatestDeal}
              onStartAuction={startLatestDealAuction}
              onDeclineLatest={declineLatestDeal}
              onSellMarketAsset={sellMarketAsset}
              onDeclineMarketSale={declineMarketSale}
              onAcceptCharity={acceptCharity}
              onDeclineCharity={declineCharity}
              onPayDoodadWithCash={payDoodadWithCash}
              onPayDoodadWithCredit={payDoodadWithCredit}
              stockSaleOffer={stockSaleOffer}
              stockSaleQuantity={stockSaleQuantity}
              onStockSaleQuantityChange={updateStockSaleQuantity}
              onStockSaleDecrease={() => changeStockSaleQuantity(-1)}
              onStockSaleIncrease={() => changeStockSaleQuantity(1)}
              decisionSubmission={decisionSubmission}
              onSellStock={sellStockFromDeal}
              onDeclineStockSale={declineStockSale}
              canTakeLoan={canTakeLoan}
              onOpenBank={() => setBankDialogOpen(true)}
              renderHistory={(action) => renderTurnFeed(true, action)}
                embedded
              />
            </>
          }
        />
      ) : (
        <>
          {snapshot.game.status !== "WAITING" ? (
          <div className="desktop-game-board-viewport hidden lg:block">
        <DesktopGameBoard
          snapshot={boardSnapshot}
          movingPlayerId={movement.movingPlayerId}
          selectedPlayer={selectedPlayer}
          players={gamePlayers}
          canManageLiabilities={selectedPlayer?.id === me?.id && canTakeLoan}
          onCloseLiability={closeLiability}
          canOpenBank={selectedPlayer?.id === me?.id && canTakeLoan}
          onOpenBank={() => setBankDialogOpen(true)}
          outsidePlayers={boardSnapshot.players.filter(
            (player) =>
              player.role === "PLAYER" &&
              player.track === "RAT_RACE" &&
              player.position < 0
          )}
        >
          <>
            <DiceAction
              currentPlayer={currentPlayer}
              isMine={isMyTurn}
              canRoll={canRoll && !pendingAction}
              rolling={rollingDice}
              phase={turnAnimationPhase}
              statusLabel={canRoll ? "Ваш ход" : undefined}
              idleLabel={canRoll && pendingAction ? "Выберите действие" : undefined}
              diceValues={diceFaces}
              onEnterFastTrack={canEnterFastTrack ? () => { void fastAction("fast-track/enter"); } : undefined}
              rollLabel={canEnterFastTrack ? "Бросить кубики" : undefined}
              onRoll={rollDice}
              onSkip={skipTurn}
              disabled={fastBusy}
              pinnedToPanel
            />
            <ActionsPanel
              canChooseDeal={canChooseDeal}
              onDrawSmallDeal={() => draw("SMALL_DEAL")}
              onDrawBigDeal={() => draw("BIG_DEAL")}
              latestCard={latestDealDecisionCard}
              auctionPanel={auctionPanel}
              charityChoice={charityChoice}
              canAnswerCharity={canAnswerCharity}
              doodadPaymentChoice={doodadPaymentChoice}
              canAnswerDoodadPayment={canAnswerDoodadPayment}
              marketSaleOffer={marketSaleOffer}
              canAnswerMarketSale={canAnswerMarketSale}
              currentCashCents={me?.financialState?.cashCents ?? 0}
              waitingStockSellerNames={waitingStockSellerNames}
              dealQuantity={dealQuantity}
              setDealQuantity={updateDealQuantity}
              onBuyLatest={buyLatestDeal}
              onStartAuction={startLatestDealAuction}
              onDeclineLatest={declineLatestDeal}
              onSellMarketAsset={sellMarketAsset}
              onDeclineMarketSale={declineMarketSale}
              onAcceptCharity={acceptCharity}
              onDeclineCharity={declineCharity}
              onPayDoodadWithCash={payDoodadWithCash}
              onPayDoodadWithCredit={payDoodadWithCredit}
              stockSaleOffer={stockSaleOffer}
              stockSaleQuantity={stockSaleQuantity}
              onStockSaleQuantityChange={updateStockSaleQuantity}
              onStockSaleDecrease={() => changeStockSaleQuantity(-1)}
              onStockSaleIncrease={() => changeStockSaleQuantity(1)}
              decisionSubmission={decisionSubmission}
              onSellStock={sellStockFromDeal}
              onDeclineStockSale={declineStockSale}
              canTakeLoan={canTakeLoan}
              onOpenBank={() => setBankDialogOpen(true)}
              renderHistory={(action) => renderTurnFeed(false, action)}
              embedded
            />
          </>
        </DesktopGameBoard>
          </div>
          ) : null}

      <div className="mobile-game-region grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5 lg:hidden">
        {snapshot.game.status !== "WAITING" ? (
          <div className="mobile-game-stack grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-2">
            <MobileGameTabs
              board={<MobileBoard
                snapshot={boardSnapshot}
                movingPlayerId={movement.movingPlayerId}
                selectedPlayer={boardSnapshot.players.find((player) => player.id === selectedPlayer?.id)}
                containerRef={mobileBoardRef}
              />}
              player={selectedPlayer}
              players={gamePlayers}
              currentPlayerId={snapshot.game.currentPlayerId}
              canManageLiabilities={selectedPlayer?.id === me?.id && canTakeLoan}
              onCloseLiability={closeLiability}
              canOpenBank={selectedPlayer?.id === me?.id && canTakeLoan}
              onOpenBank={() => setBankDialogOpen(true)}
              actionAttentionKey={
                ownPendingAction?.type ?? (stockSaleOffer ? "stock_sale_window" : null)
              }
              turnTabRequest={turnTabRequest}
              actions={
                <>
                  <ActionsPanel
                  canChooseDeal={canChooseDeal}
                  onDrawSmallDeal={() => draw("SMALL_DEAL")}
                  onDrawBigDeal={() => draw("BIG_DEAL")}
                  latestCard={latestDealDecisionCard}
                  auctionPanel={auctionPanel}
                  charityChoice={charityChoice}
                  canAnswerCharity={canAnswerCharity}
                  doodadPaymentChoice={doodadPaymentChoice}
                  canAnswerDoodadPayment={canAnswerDoodadPayment}
                  marketSaleOffer={marketSaleOffer}
                  canAnswerMarketSale={canAnswerMarketSale}
                  currentCashCents={me?.financialState?.cashCents ?? 0}
                  waitingStockSellerNames={waitingStockSellerNames}
                  dealQuantity={dealQuantity}
                  setDealQuantity={updateDealQuantity}
                  onBuyLatest={buyLatestDeal}
                  onStartAuction={startLatestDealAuction}
                  onDeclineLatest={declineLatestDeal}
                  onSellMarketAsset={sellMarketAsset}
                  onDeclineMarketSale={declineMarketSale}
                  onAcceptCharity={acceptCharity}
                  onDeclineCharity={declineCharity}
                  onPayDoodadWithCash={payDoodadWithCash}
                  onPayDoodadWithCredit={payDoodadWithCredit}
                  stockSaleOffer={stockSaleOffer}
                  stockSaleQuantity={stockSaleQuantity}
                  onStockSaleQuantityChange={updateStockSaleQuantity}
                  onStockSaleDecrease={() => changeStockSaleQuantity(-1)}
                  onStockSaleIncrease={() => changeStockSaleQuantity(1)}
                  decisionSubmission={decisionSubmission}
                  onSellStock={sellStockFromDeal}
                  onDeclineStockSale={declineStockSale}
                  canTakeLoan={canTakeLoan}
                  onOpenBank={() => setBankDialogOpen(true)}
                  renderHistory={(action) => renderTurnFeed(false, action)}
                    embedded
                  />
                </>
              }
            />
          </div>
        ) : null}
      </div>

        </>
      )}
      </> : null}
    </div>
  );
}

function BankruptcyPanel({
  player,
  onSellAsset,
  onRepayDebt
}: {
  player: GamePlayer;
  onSellAsset: (assetId: string, quantity: number) => void;
  onRepayDebt: (liability: PlayerLiability) => void;
}) {
  const state = player.financialState;
  if (!state) return null;
  const deficit = Math.abs(Math.min(state.monthlyCashflowCents, 0));
  const totalDebtCents = player.liabilities.reduce(
    (sum, liability) => sum + liability.balanceCents,
    0
  );

  return (
    <div className="bankruptcy-overlay fixed inset-0 z-[60] bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bankruptcy-title"
        className="bankruptcy-dialog mx-auto w-full max-w-5xl rounded-2xl bg-white p-4 shadow-[0_34px_90px_rgba(5,18,45,.35)] sm:p-5"
      >
        <h2 id="bankruptcy-title" className="text-xl font-semibold text-red-800">
          Объявлено банкротство
        </h2>
        <p className="mt-2 text-sm text-neutral-700">
          Денежный поток: {money(state.monthlyCashflowCents)} · наличные: {money(state.cashCents)} ·
          месячный дефицит: {money(deficit)}. Продайте активы банку и направьте деньги на долги,
          пока денежный поток не станет положительным.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <BankruptcyRecoveryProgress
            deficitCents={deficit}
            totalExpensesCents={state.totalExpensesCents}
          />
          {totalDebtCents > 0 ? (
            <FundingProgress
              availableCents={state.cashCents}
              requiredCents={totalDebtCents}
              label="Покрытие долгов наличными"
            />
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="font-semibold">Активы</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Банк выплачивает половину первоначального взноса.
            </p>
            <div className="mt-3 space-y-2">
              {player.assets.length === 0 ? (
                <p className="rounded-md bg-surface p-3 text-sm text-neutral-600">
                  Все активы проданы. Сначала направьте оставшиеся наличные на долги.
                </p>
              ) : player.assets.map((asset) => (
                <div key={asset.id} className="rounded-md border border-line p-3">
                  <div className="text-sm font-medium">{localizeGameText(asset.name)}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Количество: {asset.quantity} · выплата: {money(Math.floor(asset.downPaymentCents / 2))}
                    {asset.cashflowCents !== 0
                      ? ` · денежный поток: ${money(asset.cashflowCents)}`
                      : ""}
                  </div>
                  <Button
                    className="mt-2 h-8 px-3 text-xs"
                    variant="secondary"
                    onClick={() => onSellAsset(asset.id, asset.quantity)}
                  >
                    Продать банку
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold">Долги</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Доступно для погашения: {money(state.cashCents)}.
            </p>
            <div className="mt-3 space-y-2">
              {player.liabilities.length === 0 ? (
                <p className="rounded-md bg-surface p-3 text-sm text-neutral-600">Долгов нет.</p>
              ) : player.liabilities.map((liability) => (
                <div key={liability.id} className="rounded-md border border-line p-3">
                  <div className="text-sm font-medium">
                    {liabilityLabels[liability.type] ?? localizeGameText(liability.name)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Остаток: {money(liability.balanceCents)} · платёж: {money(liability.paymentCents)}/мес
                  </div>
                  <Button
                    className="mt-2 h-8 px-3 text-xs"
                    variant="secondary"
                    disabled={state.cashCents <= 0}
                    onClick={() => onRepayDebt(liability)}
                  >
                    Направить {money(Math.min(state.cashCents, liability.balanceCents))}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


function gameEndReasonText(reason: string | null) {
  return gameEndPresentation({ reason }).description;
}


function diceValuesFromActionResult(result: GameActionResult) {
  const diceEvent = result.events?.find((event) => event.type === realtimeEvents.playerRollDice);
  const diceValues = diceEvent?.payload.diceValues;
  if (Array.isArray(diceValues)) {
    const values = diceValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 6);
    if (values.length > 0) return values;
  }
  const dice = Number(diceEvent?.payload.dice);
  return Number.isFinite(dice) && dice >= 1 && dice <= 6 ? [dice] : null;
}

function moveFromActionResult(result: GameActionResult) {
  const moveEvent = result.events?.find((event) => event.type === realtimeEvents.playerMove);
  const from = Number(moveEvent?.payload.from);
  const to = Number(moveEvent?.payload.to);
  const steps = Number(moveEvent?.payload.steps);
  if (![from, to, steps].every(Number.isFinite) || steps < 0) return null;
  return { from, to, steps };
}

function randomDiceValues(diceCount: number) {
  return Array.from({ length: Math.max(1, diceCount) }, () => Math.floor(Math.random() * 6) + 1);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function HostPanel({
  code,
  gameId,
  token,
  onAddUser,
  playerSlotsFull,
  canChangeParticipation,
  participates,
  changingParticipation,
  onChangeParticipation
}: {
  code: string;
  gameId: string;
  token: string;
  onAddUser: (body: { userId: string; role: string }) => void;
  playerSlotsFull: boolean;
  canChangeParticipation: boolean;
  participates: boolean;
  changingParticipation: boolean;
  onChangeParticipation: (participates: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("PLAYER");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (selectedUser || normalizedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `${publicApiBaseUrl()}/api/games/${gameId}/users/search?query=${encodeURIComponent(normalizedQuery)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Не удалось найти пользователей");
        setResults(result);
        setOpen(true);
      } catch (event) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(event instanceof Error ? event.message : "Не удалось найти пользователей");
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [gameId, query, selectedUser, token]);

  function chooseUser(user: UserSearchResult) {
    setSelectedUser(user);
    setQuery(`${user.displayName} · ${user.email}`);
    setResults([]);
    setOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    onAddUser({ userId: selectedUser.id, role });
    event.currentTarget.reset();
    setQuery("");
    setSelectedUser(null);
  }

  return (
    <div className="mt-6 grid gap-3 border-t border-line/70 pt-5 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold">Приглашение в игру</div>
              <p className="mt-1 text-xs text-neutral-600">
                Скопируйте код или готовую ссылку для участника.
              </p>
            </div>
            <RoomInviteActions code={code} />
          </div>
          <p className="mt-3 text-xs text-neutral-600">
            Пользователь войдёт в комнату как игрок после авторизации.
          </p>
        </div>
        {canChangeParticipation ? (
          <div className="rounded-xl bg-card p-4">
            <div className="text-sm font-extrabold">Участие ведущего</div>
            <p className="mt-1 text-xs text-neutral-600">
              {participates
                ? "Вы занимаете место игрока и будете участвовать в партии."
                : "Сейчас вы только управляете комнатой."}
            </p>
            <Button
              type="button"
              className="mt-3 w-full"
              variant="secondary"
              disabled={changingParticipation || (!participates && playerSlotsFull)}
              onClick={() => onChangeParticipation(!participates)}
            >
              {changingParticipation
                ? "Изменяем..."
                : participates
                  ? "Остаться только ведущим"
                  : "Участвовать как игрок"}
            </Button>
          </div>
        ) : null}
        <form className="rounded-xl bg-card p-4 lg:col-span-2" onSubmit={submit}>
          <div className="text-sm font-extrabold">Добавление игрока</div>
          <p className="mt-1 text-xs text-neutral-600">
            Найдите зарегистрированного пользователя по имени, фамилии или почте.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <div className="relative min-w-0">
              <Input
                value={query}
                placeholder="Имя, фамилия или электронная почта"
                autoComplete="off"
                role="combobox"
                aria-label="Поиск пользователя"
                aria-expanded={open && !selectedUser}
                aria-controls="game-user-search-results"
                aria-autocomplete="list"
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedUser(null);
                  setOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                  if (event.key === "ArrowDown" && results[0]) {
                    event.preventDefault();
                    document.getElementById(`game-user-option-${results[0].id}`)?.focus();
                  }
                }}
              />
              {selectedUser ? (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-success" size={18} aria-hidden="true" />
              ) : null}
              {open && !selectedUser && query.trim().length >= 2 ? (
                <div
                  id="game-user-search-results"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl bg-white p-1.5 shadow-[0_20px_45px_rgba(27,57,118,.16),0_4px_10px_rgba(27,57,118,.08)]"
                >
                  {searching ? <p className="px-3 py-3 text-sm text-muted">Ищем пользователей…</p> : null}
                  {!searching && searchError ? <p className="px-3 py-3 text-sm text-red-700">{searchError}</p> : null}
                  {!searching && !searchError && results.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted">Подходящих пользователей не найдено.</p>
                  ) : null}
                  {results.map((user) => (
                    <button
                      key={user.id}
                      id={`game-user-option-${user.id}`}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-card focus-visible:bg-card focus-visible:outline-none"
                      onClick={() => chooseUser(user)}
                    >
                      <span className="block truncate text-sm font-bold text-ink">{user.displayName}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{user.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative">
              <select
                name="role"
                aria-label="Роль пользователя"
                className="h-10 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="PLAYER">Игрок</option>
                <option value="BANKER">Банкир</option>
                <option value="OBSERVER">Наблюдатель</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
            </div>
            <Button type="submit" disabled={!selectedUser || (role === "PLAYER" && playerSlotsFull)}>Добавить в игру</Button>
          </div>
          {playerSlotsFull ? <p className="mt-2 text-xs text-muted">Места для игроков заняты. Увеличьте лимит или освободите место.</p> : null}
        </form>
    </div>
  );
}

function WaitingRoomOverview({
  snapshot,
  isSolo,
  canManage,
  canStart,
  startDisabledReason,
  onStartGame,
  startBusy,
  code,
  token,
  preparation,
  settingsPending,
  onAddBot,
  onRemovePlayer,
  onAddUser,
  canChangeParticipation,
  participates,
  changingParticipation,
  onChangeParticipation,
  currentPlayer,
  onChooseDream,
  onChooseFigurine
}: {
  snapshot: GameSnapshot;
  isSolo: boolean;
  canManage: boolean;
  canStart: boolean;
  startDisabledReason: string | null;
  onStartGame: () => void;
  startBusy: boolean;
  code: string;
  token: string;
  preparation: ReactNode;
  settingsPending: boolean;
  onAddBot: (level: BotLevelValue) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddUser: (body: { userId: string; role: string }) => void;
  canChangeParticipation: boolean;
  participates: boolean;
  changingParticipation: boolean;
  onChangeParticipation: (participates: boolean) => void;
  currentPlayer: GamePlayer | undefined;
  onChooseDream: () => void;
  onChooseFigurine: () => void;
}) {
  const players = snapshot.players.filter((player) => player.status === "JOINED");
  const gamePlayers = players.filter((player) => player.role === "PLAYER");
  const humanPlayers = gamePlayers.filter((player) => player.controller === "HUMAN");
  const readyPlayers = gamePlayers.filter((player) => Boolean(player.figurine));
  const enoughPlayers = gamePlayers.length >= 2;
  const hasHumanPlayer = humanPlayers.length > 0;
  const figurinesReady = gamePlayers.length > 0 && readyPlayers.length === gamePlayers.length;
  const dreamsReady = snapshot.game.rulesVersion !== 2 || gamePlayers.every((player) => isDreamCell(player.dreamCellIndex));
  const completedChecks =
    Number(enoughPlayers) + Number(hasHumanPlayer) + Number(figurinesReady) + Number(dreamsReady) + Number(!settingsPending);
  const [now, setNow] = useState(() => Date.now());
  const [removeTarget, setRemoveTarget] = useState<GamePlayer | null>(null);
  useEffect(() => {
    if (removeTarget) document.getElementById("cancel-lobby-removal")?.focus();
  }, [removeTarget]);
  useEffect(() => {
    if (!snapshot.game.scheduledAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.game.scheduledAt]);
  const secondsUntilStart = snapshot.game.scheduledAt ? Math.max(0, Math.ceil((new Date(snapshot.game.scheduledAt).getTime() - now) / 1000)) : 0;
  const beforeStart = snapshot.game.isPublic && secondsUntilStart > 0;
  const humanCount = gamePlayers.filter((player) => player.controller === "HUMAN").length;
  const botSlotsFull = gamePlayers.length >= (snapshot.game.maxPlayers ?? 6) - (humanCount === 0 ? 1 : 0);
  const [newBotLevel, setNewBotLevel] = useState<BotLevelValue>("balanced_v1");

  return (
    <>
    <section id="lobby-team" className="rounded-2xl bg-white p-4 shadow-panel sm:p-5" aria-labelledby="lobby-team-title">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="lobby-team-title" className="text-xl font-extrabold">
              3. Соберите команду
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {isSolo
                ? snapshot.game.rulesVersion === 2
                  ? "Проверьте состав партии и выберите свою фигурку и мечту. Вы сделаете первый ход."
                  : "Проверьте состав партии и выберите свою фигурку. Вы сделаете первый ход."
                : snapshot.game.rulesVersion === 2
                  ? "Участники появятся здесь после входа по коду. Перед стартом каждому игроку нужны фигурка и мечта."
                  : "Участники появятся здесь после входа по коду. Перед стартом каждому игроку нужна своя фигурка."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#e8effe] px-3 py-2 text-sm font-extrabold text-journey">
            <UsersRound size={16} aria-hidden="true" />
            {`${gamePlayers.length}/${snapshot.game.maxPlayers ?? 6} игроков`}
          </span>
        </div>

        {canManage && !isSolo ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Участники</h2>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <BotLevelButtons label="Уровень нового бота" value={newBotLevel} onChange={setNewBotLevel} disabled={startBusy} />
            <Button type="button" variant="secondary" className="gap-2" disabled={startBusy || botSlotsFull} title={botSlotsFull && humanCount === 0 ? "Оставьте место для игрока-человека" : undefined} onClick={() => onAddBot(newBotLevel)}>
              <Bot size={17} aria-hidden="true" /> Добавить бота
            </Button>
          </div>
        </div> : null}
        {players.length > 0 ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => {
              const isPlayer = player.role === "PLAYER";
              const ready = !isPlayer || (Boolean(player.figurine) && (snapshot.game.rulesVersion !== 2 || isDreamCell(player.dreamCellIndex)));
              return (
                <div key={player.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-xl bg-card p-3">
                  <PlayerToken player={player} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold">
                      {player.controller === "BOT"
                        ? `${gamePlayerName(player)} · ${player.botStrategy === "beginner_v1" ? "новичок" : player.botStrategy === "expert_v1" ? "эксперт" : "опытный бот"}`
                        : player.user?.displayName ?? player.guestName ?? gameRoles[player.role] ?? "Участник"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {gameRoles[player.role] ?? "Участник"}
                      {player.seat ? ` · место ${player.seat}` : ""}
                    </div>
                    {isPlayer && snapshot.game.rulesVersion === 2 ? <p className="mt-1 text-xs leading-5 text-[#57378f]">{isDreamCell(player.dreamCellIndex) ? fastTrackCells[player.dreamCellIndex]!.label : "Мечта ещё не выбрана"}</p> : null}
                  </div>
                  <span
                    className={[
                      "col-start-2 row-start-2 inline-flex max-w-full justify-self-start rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                      ready ? "bg-[#eaf3e0] text-success" : "bg-[#fff0df] text-[#8a3d0a]"
                    ].join(" ")}
                  >
                    {ready ? "Готов" : !player.figurine ? "Без фигурки" : "Без мечты"}
                  </span>
                  {canManage && !isSolo && player.userId !== snapshot.game.createdById && player.role !== "HOST" ? <button type="button" onClick={() => setRemoveTarget(player)} aria-label={`Удалить ${gamePlayerName(player)} из лобби`} className="col-start-3 row-start-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"><X size={18} aria-hidden="true" /></button> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-card p-5 text-sm text-muted">
            В комнате пока никого нет. Отправьте участникам код {snapshot.game.code}.
          </div>
        )}
        {currentPlayer?.figurine && (snapshot.game.rulesVersion !== 2 || isDreamCell(currentPlayer.dreamCellIndex)) ? (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-card p-4 text-sm min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            {snapshot.game.rulesVersion === 2 && isDreamCell(currentPlayer.dreamCellIndex) ? (
              <span className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-lg">
                <img src={`/dreams/${currentPlayer.dreamCellIndex}.webp`} alt="" width={96} height={64} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="font-extrabold text-ink">
                Ваша мечта и фишка выбраны
              </div>
              <p className="mt-1 text-xs text-muted">
                {isDreamCell(currentPlayer.dreamCellIndex) ? fastTrackCells[currentPlayer.dreamCellIndex]!.label : "Партия готова к запуску"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {snapshot.game.rulesVersion === 2 ? <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={onChooseDream}>Сменить мечту</Button> : null}
              <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={onChooseFigurine}>Сменить фишку</Button>
            </div>
          </div>
        ) : null}
        {canManage && !isSolo ? (
          <HostPanel
            code={code}
            gameId={snapshot.game.id}
            token={token}
            onAddUser={onAddUser}
            playerSlotsFull={gamePlayers.length >= (snapshot.game.maxPlayers ?? 6)}
            canChangeParticipation={canChangeParticipation}
            participates={participates}
            changingParticipation={changingParticipation}
            onChangeParticipation={onChangeParticipation}
          />
        ) : null}
        {preparation ? <div className="mt-5 border-t border-line/70 pt-5">{preparation}</div> : null}
      </div>
    </section>

      <section id="lobby-readiness" className="rounded-2xl bg-white p-4 text-ink shadow-panel sm:p-5" aria-labelledby="lobby-readiness-title">
        <h2 id="lobby-readiness-title" className="text-xl font-extrabold">4. Готовность к старту</h2>
        {snapshot.game.scheduledAt ? <div className="mt-3 rounded-xl bg-white p-3 text-sm">
          <p className="font-bold">Начало: {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date(snapshot.game.scheduledAt))}</p>
          <p className="mt-1" role="timer">{beforeStart ? `До начала игры осталось ${formatLobbyCountdown(secondsUntilStart)}` : "Время начала наступило"}</p>
        </div> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <LobbyCheck
            complete={enoughPlayers}
            label={enoughPlayers ? "Игроков достаточно" : "Нужно минимум два игрока"}
          />
          <LobbyCheck
            complete={hasHumanPlayer}
            label={hasHumanPlayer ? "Человек участвует" : "Нужен хотя бы один человек"}
          />
          <LobbyCheck
            complete={figurinesReady}
            label={figurinesReady ? "Фигурки выбраны" : `Фигурки: ${readyPlayers.length}/${gamePlayers.length}`}
          />
          {snapshot.game.rulesVersion === 2 ? <LobbyCheck complete={dreamsReady} label={dreamsReady ? "Мечты выбраны" : "Каждый игрок должен выбрать мечту"} /> : null}
          {canManage ? <LobbyCheck complete={!settingsPending} label={settingsPending ? "Настройки ещё не сохранены" : "Настройки сохранены"} /> : null}
          <LobbyCheck
            complete={canManage}
            label={canManage ? "Вы можете запустить партию" : "Старт запустит ведущий"}
          />
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dce4ef]">
          <div
            className="h-full rounded-full bg-action transition-[width] duration-300"
            style={{ width: `${Math.round((completedChecks / 5) * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          {beforeStart ? "Начать игру можно после назначенного времени." : canStart && !startDisabledReason
            ? "Все условия выполнены — можно начинать."
            : startDisabledReason ?? "Ожидаем действия ведущего."}
        </p>
        {canManage ? (
          <Button
            className="mt-4 w-full sm:w-auto sm:min-w-56"
            variant="action"
            onClick={onStartGame}
            disabled={!canStart || Boolean(startDisabledReason) || beforeStart || startBusy}
          >
            {startBusy ? "Запускаем…" : "Начать партию"}
          </Button>
        ) : null}
      </section>
      {removeTarget ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div role="alertdialog" aria-modal="true" aria-labelledby="remove-player-title" aria-describedby="remove-player-description" onKeyDown={(event) => { if (event.key === "Escape") setRemoveTarget(null); if (event.key === "Tab") { event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button")); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus(); } }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h2 id="remove-player-title" className="text-xl font-extrabold">Удалить участника?</h2>
          <p id="remove-player-description" className="mt-2 text-sm text-muted">{gamePlayerName(removeTarget)} будет удалён из лобби. Место снова станет свободным.</p>
          <div className="mt-5 flex justify-end gap-2"><Button id="cancel-lobby-removal" type="button" variant="secondary" onClick={() => setRemoveTarget(null)}>Отмена</Button><Button type="button" variant="danger" disabled={startBusy} onClick={() => { onRemovePlayer(removeTarget.id); setRemoveTarget(null); }}>Удалить</Button></div>
        </div>
      </div> : null}
    </>
  );
}

function formatLobbyCountdown(totalSeconds: number) {
  const totalMinutes = Math.ceil(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const plural = (value: number, one: string, few: string, many: string) => value % 10 === 1 && value % 100 !== 11 ? one : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 12 || value % 100 > 14) ? few : many;
  return hours > 0 ? `${hours} ${plural(hours, "час", "часа", "часов")} ${minutes} ${plural(minutes, "минута", "минуты", "минут")}` : `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`;
}

function LobbyCheck({ complete, label }: { complete: boolean; label: string }) {
  const Icon = complete ? CheckCircle2 : Circle;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className={complete ? "text-success" : "text-muted/55"} size={17} aria-hidden="true" />
      <span className={complete ? "font-bold text-ink" : "text-muted"}>{label}</span>
    </div>
  );
}

export function DesktopGameBoard({
  snapshot,
  selectedPlayer,
  players,
  canManageLiabilities,
  onCloseLiability,
  canOpenBank,
  onOpenBank,
  outsidePlayers,
  movingPlayerId = null,
  children
}: {
  snapshot: GameSnapshot;
  selectedPlayer: GamePlayer | undefined;
  players: GamePlayer[];
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
  canOpenBank: boolean;
  onOpenBank: () => void;
  outsidePlayers: GamePlayer[];
  movingPlayerId?: string | null;
  children: ReactNode;
}) {
  return (
    <RatRaceBoard snapshot={snapshot} movingPlayerId={movingPlayerId}>
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] gap-3">
        <DesktopFinancialPanel
          player={selectedPlayer}
          players={players}
          currentPlayerId={snapshot.game.currentPlayerId}
          canManageLiabilities={canManageLiabilities}
          onCloseLiability={onCloseLiability}
          canOpenBank={canOpenBank}
          onOpenBank={onOpenBank}
          outsidePlayers={outsidePlayers}
        />
        <div className="min-h-0 overflow-y-auto rounded-xl bg-white px-3 pb-3 pt-0 shadow-panel">
          {children}
        </div>
      </div>
    </RatRaceBoard>
  );
}

function DesktopFinancialPanel({
  player,
  players,
  currentPlayerId,
  canManageLiabilities,
  onCloseLiability,
  canOpenBank,
  onOpenBank,
  outsidePlayers
}: {
  player: GamePlayer | undefined;
  players: GamePlayer[];
  currentPlayerId: string | null;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
  canOpenBank: boolean;
  onOpenBank: () => void;
  outsidePlayers: GamePlayer[];
}) {
  const state = player?.financialState;

  if (!player || !state) {
    return (
      <div className="rounded-md border border-line bg-white p-4">
        <h2 className="text-lg font-semibold">Финансовый отчёт</h2>
        <p className="mt-3 text-sm text-neutral-600">Отчёт появится после старта партии.</p>
      </div>
    );
  }

  const liabilities = repayableLiabilityRows(player);
  return (
    <RatRaceTabs
      idPrefix="desktop-game"
      variant="desktop"
      assetCount={player.assets.length}
      liabilityCount={liabilities.length}
      player={<FinancialPlayerReport player={player} players={players} currentPlayerId={currentPlayerId} canOpenBank={canOpenBank} onOpenBank={onOpenBank} outsidePlayers={outsidePlayers} variant="desktop"/>}
      assets={<CompactAssets assets={player.assets} />}
      expenses={<FinancialExpenses items={expenseItems(player)} total={state.totalExpensesCents}/>}
      liabilities={
          <CreditList
            liabilities={liabilities}
            currentCashCents={state.cashCents}
            monthlyIncomeCents={state.totalIncomeCents}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
          />
      }
    />
  );
}

function FigurineDialog({
  open,
  value,
  taken,
  saving,
  error,
  canClose,
  onChange,
  onClose
}: {
  open: boolean;
  value: string | null;
  taken: string[];
  saving: boolean;
  error: string | null;
  canClose: boolean;
  onChange: (figurine: FigurineId) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="app-shell-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="figurine-dialog-title"
        className="app-shell-overlay-panel flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="shrink-0 border-b border-line px-4 py-4 sm:px-6">
          <h2 id="figurine-dialog-title" className="text-lg font-semibold">
            Выберите фигурку
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Она будет представлять вас на игровом поле. В одной комнате фигурки не
            повторяются.
          </p>
        </div>
        <div className="app-shell-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {error ? <p role="alert" className="mb-3 text-sm font-bold text-red-700">{error}</p> : null}
          <FigurinePicker
            value={value}
            taken={taken}
            disabled={saving}
            onChange={onChange}
          />
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-line px-4 py-3 sm:px-6">
          {canClose ? (
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
          ) : null}
          {saving ? <p role="status" className="text-sm">Сохраняем фишку…</p> : null}
        </div>
      </div>
    </div>
  );
}

function PlayerStatusBadges({ state }: { state: FinancialState }) {
  const statuses = compactDetails([
    state.wonAt ? "🏆 Победитель" : null,
    state.bankruptcyStatus === "LIQUIDATING" ? "⚠️ Банкротство" : null,
    state.bankruptcyStatus === "RECOVERED"
      ? `↻ Пропустить ходов: ${state.bankruptcyTurns}`
      : null,
    state.bankruptcyStatus === "ELIMINATED" ? "⛔ Выбыл" : null,
    state.downsizedTurns > 0 ? `💼 Без работы: ${state.downsizedTurns}` : null,
    state.charityTurns > 0 ? `🎲 Два кубика: ${state.charityTurns}` : null
  ]);
  if (statuses.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {statuses.map((status) => (
        <span
          key={status}
          className="rounded-full border border-line bg-white px-2 py-1 text-xs text-neutral-700"
        >
          {status}
        </span>
      ))}
    </div>
  );
}

function MobileGameTabs({
  board,
  player,
  players,
  currentPlayerId,
  canManageLiabilities,
  onCloseLiability,
  canOpenBank,
  onOpenBank,
  actionAttentionKey,
  turnTabRequest,
  actions
}: {
  board: ReactNode;
  player: GamePlayer | undefined;
  players: GamePlayer[];
  currentPlayerId: string | null;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
  canOpenBank: boolean;
  onOpenBank: () => void;
  actionAttentionKey: string | null;
  turnTabRequest: number;
  actions: ReactNode;
}) {
  const state = player?.financialState;
  const liabilities = player ? repayableLiabilityRows(player) : [];
  const emptyReport = <p className="py-2 text-sm text-neutral-600">Финансовый отчёт появится после старта партии.</p>;

  return (
    <RatRaceTabs
      idPrefix="mobile-game"
      board={board}
      turn={actions}
      turnTabRequest={turnTabRequest}
      actionAttention={Boolean(actionAttentionKey)}
      assetCount={player?.assets.length ?? 0}
      liabilityCount={liabilities.length}
      player={player && state ? <FinancialPlayerReport player={player} players={players} currentPlayerId={currentPlayerId} canOpenBank={canOpenBank} onOpenBank={onOpenBank} variant="mobile"/> : emptyReport}
      assets={player && state ? <CompactAssets assets={player.assets} /> : emptyReport}
      expenses={player && state ? <FinancialExpenses items={expenseItems(player)} total={state.totalExpensesCents}/> : emptyReport}
      liabilities={player && state ? (
          <CreditList
            liabilities={liabilities}
            currentCashCents={state.cashCents}
            monthlyIncomeCents={state.totalIncomeCents}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
          />
      ) : emptyReport}
    />
  );
}

























function ActionsPanel({
  canChooseDeal,
  onDrawSmallDeal,
  onDrawBigDeal,
  latestCard,
  auctionPanel,
  charityChoice,
  canAnswerCharity,
  doodadPaymentChoice,
  canAnswerDoodadPayment,
  marketSaleOffer,
  canAnswerMarketSale,
  currentCashCents,
  waitingStockSellerNames,
  dealQuantity,
  setDealQuantity,
  onBuyLatest,
  onStartAuction,
  onDeclineLatest,
  onSellMarketAsset,
  onDeclineMarketSale,
  onAcceptCharity,
  onDeclineCharity,
  onPayDoodadWithCash,
  onPayDoodadWithCredit,
  stockSaleOffer,
  stockSaleQuantity,
  onStockSaleQuantityChange,
  onStockSaleDecrease,
  onStockSaleIncrease,
  decisionSubmission,
  onSellStock,
  onDeclineStockSale,
  canTakeLoan,
  onOpenBank,
  renderHistory,
  embedded = false
}: {
  canChooseDeal: boolean;
  onDrawSmallDeal: () => void;
  onDrawBigDeal: () => void;
  latestCard: ReturnType<typeof latestDealCard>;
  auctionPanel: ReactNode;
  charityChoice: Extract<GameSnapshot["game"]["pendingAction"], { type: "charity_choice" }> | null;
  canAnswerCharity: boolean;
  doodadPaymentChoice: Extract<GameSnapshot["game"]["pendingAction"], { type: "doodad_payment_choice" }> | null;
  canAnswerDoodadPayment: boolean;
  marketSaleOffer: Extract<GameSnapshot["game"]["pendingAction"], { type: "market_sale" }> | null;
  canAnswerMarketSale: boolean;
  currentCashCents: number;
  waitingStockSellerNames: string[];
  dealQuantity: number | "";
  setDealQuantity: (value: number | "") => void;
  onBuyLatest: () => void;
  onStartAuction: () => void;
  onDeclineLatest: () => void;
  onSellMarketAsset: () => void;
  onDeclineMarketSale: () => void;
  onAcceptCharity: () => void;
  onDeclineCharity: () => void;
  onPayDoodadWithCash: () => void;
  onPayDoodadWithCredit: () => void;
  stockSaleOffer: ReturnType<typeof stockSaleOfferForPlayer>;
  stockSaleQuantity: StockSaleQuantity;
  onStockSaleQuantityChange: (value: StockSaleQuantity) => void;
  onStockSaleDecrease: () => void;
  onStockSaleIncrease: () => void;
  decisionSubmission: DecisionSubmission | null;
  onSellStock: () => void;
  onDeclineStockSale: () => void;
  canTakeLoan: boolean;
  onOpenBank: () => void;
  renderHistory: (action: ReactNode) => ReactNode;
  embedded?: boolean;
}) {
  const canPayCharity=charityChoice?currentCashCents>=charityChoice.donationCents:false;
  const content=<>
    {auctionPanel}
    {canChooseDeal?<ChoicePanel choices={[{label:"Мелкая сделка",variant:"secondary",onClick:onDrawSmallDeal},{label:"Крупная сделка",variant:"secondary",onClick:onDrawBigDeal}]}/>:null}
    {stockSaleOffer?<StockSalePanel offer={stockSaleOffer} quantity={stockSaleQuantity} onQuantityChange={onStockSaleQuantityChange} onDecrease={onStockSaleDecrease} onIncrease={onStockSaleIncrease} decisionSubmission={decisionSubmission==="stock_sell"||decisionSubmission==="stock_decline"?decisionSubmission:null} onSell={onSellStock} onDecline={onDeclineStockSale}/>:null}
    {marketSaleOffer?<MarketSalePanel offer={marketSaleOffer} available={currentCashCents} canAnswer={canAnswerMarketSale} onSell={onSellMarketAsset} onDecline={onDeclineMarketSale} submitting={decisionSubmission==="market_sell"?"sell":decisionSubmission==="market_decline"?"decline":null}/>:null}
      {charityChoice ? (
        <DecisionPanel tone="charity" title="Благотворительность">
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            Заплатите 10% от своих общих доходов и кидайте 2 кубика 3 своих хода.
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <div>
              Пожертвование: <strong>{money(charityChoice.donationCents)}</strong>
            </div>
            <div>Бонус: 2 кубика на {charityChoice.turns} хода</div>
          </div>
          {!canPayCharity ? (
            <p className="mt-2 text-xs text-red-700">
              Недостаточно наличных для оплаты.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={onAcceptCharity} disabled={!canAnswerCharity || !canPayCharity}>
              Да
            </Button>
            <Button variant="secondary" onClick={onDeclineCharity} disabled={!canAnswerCharity}>
              Нет
            </Button>
          </div>
        </DecisionPanel>
      ) : null}

      {doodadPaymentChoice ? (
        <DecisionPanel tone="expense" title="Выбор оплаты">
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {localizeGameText(doodadPaymentChoice.title)}
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <div>
              Наличными: <strong>{money(doodadPaymentChoice.cashPriceCents)}</strong>
            </div>
            <div>
              Кредитная карта: долг{" "}
              <strong>{money(doodadPaymentChoice.creditBalanceCents)}</strong>, платёж{" "}
              <strong>{money(doodadPaymentChoice.creditPaymentCents)}</strong>/мес
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={onPayDoodadWithCash} disabled={!canAnswerDoodadPayment}>
              Наличными
            </Button>
            <Button
              variant="secondary"
              onClick={onPayDoodadWithCredit}
              disabled={!canAnswerDoodadPayment}
            >
              Кредитная карта
            </Button>
          </div>
        </DecisionPanel>
      ) : null}

    {latestCard?<div className="space-y-3"><JournalCardDraw event={latestCard.event}/><PurchasePanel
      card={{id:String(latestCard.cardId),title:latestCard.title,bodyText:latestCard.bodyText,isStock:latestCard.isStock,price:latestCard.priceCents,downPayment:latestCard.downPaymentCents,cashflow:latestCard.cashflowCents}}
      available={currentCashCents} quantity={dealQuantity} onQuantityChange={setDealQuantity}
      onBuy={onBuyLatest} onDecline={onDeclineLatest} onOpenBank={onOpenBank} canTakeLoan={canTakeLoan}
      {...(latestCard.isAuctionEligible?{onOffer:onStartAuction}:{})}
      submitting={decisionSubmission==="deal_buy"?"buy":decisionSubmission==="deal_decline"?"decline":decisionSubmission==="deal_auction_start"?"offer":null}
      waitingNames={waitingStockSellerNames} embedded={embedded}
      showCardText={false}
    /></div>:null}
  </>;
  const hasAction=canChooseDeal||stockSaleOffer||marketSaleOffer||charityChoice||doodadPaymentChoice||latestCard||auctionPanel;
  if(embedded)return <section className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3">{renderHistory(hasAction?content:null)}</section>;
  return <Card><CardContent className="space-y-4">{renderHistory(hasAction?content:null)}</CardContent></Card>;
}

function GameTurnFeed({
  gameId, token, events, players, currentGamePlayerId, gameStatus,
  onSendBabyGift, showHeader, fastTrackOnly, currentAction, currentActionEventId, turnPlayerId, turnKey
}: {
  gameId: string;
  token: string;
  events: GameEvent[];
  players: GamePlayer[];
  currentGamePlayerId: string | null;
  gameStatus: GameSnapshot["game"]["status"];
  onSendBabyGift: (birthEventId: string, amountCents: number) => Promise<void>;
  showHeader: boolean;
  fastTrackOnly: boolean;
  currentAction?: ReactNode;
  currentActionEventId?: string;
  turnPlayerId: string | null;
  turnKey: string;
}) {
  const viewingPlayer = players.find((player) => player.id === currentGamePlayerId);
  return <GameActionHistory
    key={gameId}
    gameId={gameId}
    events={events}
    players={players}
    fastTrackOnly={fastTrackOnly}
    gameStatus={gameStatus}
    viewerPlayerId={currentGamePlayerId}
    currentTurnPlayerId={turnPlayerId}
    currentTurnKey={turnKey}
    currentAction={currentAction}
    {...(currentActionEventId ? {currentActionEventId} : {})}
    loadEarlier={async () => {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${gameId}/replay`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Не удалось загрузить историю партии");
      const data = await response.json() as { events: GameEvent[] };
      return data.events;
    }}
    header={showHeader ? <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold">История действий</h3></div> : null}
    renderAction={(event, allEvents, pairedRoll) => event.type === realtimeEvents.cardDraw ? <JournalCardDraw event={event} /> : event.type === "player:baby" ? <BabyJournalEvent
      event={event} allEvents={allEvents} players={players}
      recipient={gamePlayerForEvent(event, players) ?? undefined}
      currentGamePlayerId={currentGamePlayerId} currentGamePlayer={viewingPlayer}
      gameStatus={gameStatus} onSendBabyGift={onSendBabyGift}
    /> : <div className="text-sm"><GameEventPresentation event={event} pairedRoll={pairedRoll} /></div>}
  />;
}

function BabyJournalEvent({
  event,
  allEvents,
  players,
  recipient,
  currentGamePlayerId,
  currentGamePlayer,
  gameStatus,
  onSendBabyGift
}: {
  event: GameEvent;
  allEvents: GameEvent[];
  players: GamePlayer[];
  recipient: GamePlayer | undefined;
  currentGamePlayerId: string | null;
  currentGamePlayer: GamePlayer | undefined;
  gameStatus: GameSnapshot["game"]["status"];
  onSendBabyGift: (birthEventId: string, amountCents: number) => Promise<void>;
}) {
  const gifts = allEvents.filter(
    (candidate) =>
      candidate.type === realtimeEvents.babyGift &&
      candidate.payload.birthEventId === event.id
  );
  const alreadyGifted = gifts.some(
    (gift) => gift.payload.senderGamePlayerId === currentGamePlayerId
  );
  const windowOpen = isBabyGiftWindowOpen(allEvents, event.sequence);
  const isRecipient = event.gamePlayer?.id === currentGamePlayerId;
  const isActiveParticipant =
    Boolean(currentGamePlayerId) &&
    currentGamePlayer?.controller === "HUMAN" &&
    currentGamePlayer.status === "JOINED";
  const currentCashCents = currentGamePlayer?.financialState?.cashCents ?? 0;
  const showAction =
    isActiveParticipant &&
    !isRecipient &&
    !alreadyGifted &&
    windowOpen &&
    gameStatus !== "ENDED" &&
    gameStatus !== "CANCELLED";

  return (
    <div className="min-w-0 rounded-xl bg-[#fff8df] p-3 text-sm shadow-[0_6px_18px_rgba(125,90,16,.08)]">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#9b6a0b] shadow-[0_5px_14px_rgba(125,90,16,.12)]">
          <Gift size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <GameEventPresentation event={event} titleClassName="font-extrabold text-[#6f4c0d]" />
          {recipient ? (
            <p className="mt-1 text-xs text-[#735f35]">
              Поздравления получает {gamePlayerName(recipient)}.
            </p>
          ) : null}
        </div>
      </div>

      {gifts.length > 0 ? (
        <div className="mt-3 space-y-1.5" aria-label="Полученные поздравления">
          {gifts.map((gift) => (
            <BabyGiftJournalRow key={gift.id} gift={gift} players={players} />
          ))}
        </div>
      ) : null}

      {showAction ? (
        <BabyGiftComposer
          birthEventId={event.id}
          currentCashCents={currentCashCents}
          gameStatus={gameStatus}
          onSend={onSendBabyGift}
        />
      ) : null}
    </div>
  );
}

function BabyGiftJournalRow({
  gift,
  players
}: {
  gift: GameEvent;
  players: GamePlayer[];
}) {
  const sender = gamePlayerForEvent(gift, players);
  const senderName = sender ? gamePlayerName(sender) : gift.actor?.displayName ?? "Игрок";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {sender ? <PlayerIdentityMark player={sender} size="xs" /> : null}
        <span className="min-w-0 truncate text-xs font-bold text-[#5d4a27]">
          {senderName}
        </span>
      </div>
      <strong className="shrink-0 text-sm text-success">
        +{money(toNumber(gift.payload.amountCents))}
      </strong>
    </div>
  );
}

function BabyGiftComposer({
  birthEventId,
  currentCashCents,
  gameStatus,
  onSend
}: {
  birthEventId: string;
  currentCashCents: number;
  gameStatus: GameSnapshot["game"]["status"];
  onSend: (birthEventId: string, amountCents: number) => Promise<void>;
}) {
  const initialAmount = Math.min(100, Math.max(0, currentCashCents));
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(initialAmount || "");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const normalizedAmount = amount === "" ? 0 : Math.max(0, Math.floor(amount));
  const validAmount =
    normalizedAmount > 0 && normalizedAmount <= currentCashCents;
  const remainingCashCents = Math.max(0, currentCashCents - normalizedAmount);
  const gamePaused = gameStatus === "PAUSED";

  useEffect(() => {
    setAmount((current) => {
      if (current === "") return currentCashCents > 0 ? Math.min(100, currentCashCents) : "";
      return Math.min(current, currentCashCents) || "";
    });
  }, [currentCashCents]);

  function changeAmount(delta: number) {
    setLocalError(null);
    setAmount((current) => {
      const base = current === "" ? 0 : current;
      const next = Math.max(1, base + delta);
      return Math.min(next, currentCashCents);
    });
  }

  async function submitGift() {
    if (!validAmount || submitting || gamePaused) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      await onSend(birthEventId, normalizedAmount);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Не удалось отправить поздравление"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        <Button
          type="button"
          variant="action"
          className="h-10 gap-2 px-3"
          onClick={() => setOpen(true)}
          disabled={currentCashCents <= 0 || gamePaused}
          title={
            gamePaused
              ? "Поздравить можно после продолжения игры"
              : currentCashCents <= 0
                ? "Для поздравления нужны наличные"
                : undefined
          }
        >
          <Gift size={16} aria-hidden="true" />
          Поздравить
        </Button>
        {currentCashCents <= 0 ? (
          <p className="mt-1.5 text-xs text-[#735f35]">Для поздравления нужны наличные.</p>
        ) : gamePaused ? (
          <p className="mt-1.5 text-xs text-[#735f35]">Действие станет доступно после продолжения игры.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3" aria-label="Сумма поздравления">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
        <Button
          type="button"
          variant="secondary"
          className="h-[50px] w-[50px] shrink-0 rounded-[15px] border-0 bg-[#e8effe] px-0 text-journey shadow-[0_6px_16px_rgba(41,103,223,.14)] hover:bg-[#dbe7ff]"
          onClick={() => changeAmount(-100)}
          disabled={submitting || normalizedAmount <= 1}
          aria-label="Уменьшить сумму поздравления на 100 долларов"
          title="Уменьшить на 100"
        >
          <Minus size={17} aria-hidden="true" />
        </Button>
        <Input
          className="h-[50px] min-w-[120px] flex-1 font-bold"
          type="number"
          inputMode="numeric"
          min={1}
          max={currentCashCents}
          step={1}
          value={amount}
          onChange={(changeEvent) => {
            setLocalError(null);
            const value = changeEvent.target.value;
            setAmount(value === "" ? "" : Math.max(0, Math.floor(Number(value))));
          }}
          aria-label="Сумма поздравления в долларах"
          aria-invalid={!validAmount}
          disabled={submitting || gamePaused}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-[50px] w-[50px] shrink-0 rounded-[15px] border-0 bg-[#e8effe] px-0 text-journey shadow-[0_6px_16px_rgba(41,103,223,.14)] hover:bg-[#dbe7ff]"
          onClick={() => changeAmount(100)}
          disabled={submitting || normalizedAmount >= currentCashCents}
          aria-label="Увеличить сумму поздравления на 100 долларов"
          title="Увеличить на 100"
        >
          <Plus size={17} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="action"
          className="h-[50px] w-[50px] shrink-0 rounded-[15px] px-0"
          onClick={() => void submitGift()}
          disabled={!validAmount || submitting || gamePaused}
          aria-label={submitting ? "Отправляем поздравление" : "Отправить поздравление"}
          aria-busy={submitting}
          title={submitting ? "Отправляем поздравление" : "Отправить поздравление"}
        >
          <Heart
            size={19}
            className={submitting ? "motion-safe:animate-pulse" : undefined}
            aria-hidden="true"
          />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-xs text-[#5d4a27]">
        <span>Кнопки меняют сумму на {money(100)}, в поле можно указать любую целую сумму.</span>
        <strong aria-live="polite">После поздравления останется {money(remainingCashCents)}</strong>
      </div>
      {!validAmount && amount !== "" ? (
        <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">
          Сумма должна быть от {money(1)} до {money(currentCashCents)}.
        </p>
      ) : null}
      {localError ? (
        <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">
          {localError}. Проверьте сумму и попробуйте ещё раз.
        </p>
      ) : null}
    </div>
  );
}

const eventTitleIcons = {
  "loan:take": Landmark,
  "loan:repay": Landmark,
  "paycheck:receive": Banknote,
  "deal:buy": Handshake,
  "deal:auction_select": HandCoins,
  "deal:sell": HandCoins
} as const;

function GameEventPresentation({
  event,
  pairedRoll,
  titleClassName = "font-medium"
}: {
  event: GameEvent;
  pairedRoll?: GameEvent | undefined;
  titleClassName?: string;
}) {
  const cashChange = eventCashChange(event);
  const details = pairedRoll ? [...compactEventDetails(pairedRoll), ...compactEventDetails(event)] : compactEventDetails(event);

  return (
    <div className="min-w-0 max-w-full text-sm">
      <div className={`text-neutral-800 ${titleClassName}`}>
        <GameEventHeadline event={event} pairedRoll={pairedRoll} />
      </div>
      {cashChange ? <CashChangeVisualization change={cashChange} /> : null}
      {details.length > 0 ? (
        <div className="mt-1 space-y-1 text-neutral-700">
          {details.map((detail, index) => (
            <div key={`${index}-${detail}`}>
              <MoneyBoldText text={detail} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function diceResultText(event: GameEvent) {
  const diceValues = Array.isArray(event.payload.diceValues)
    ? event.payload.diceValues
        .map((value) => toNumber(value))
        .filter((value) => Number.isFinite(value))
    : [];
  const total = toNumber(event.payload.dice);
  return diceValues.length > 0
    ? `${diceValues.join(" + ")} = ${Number.isFinite(total) ? total : diceValues.reduce((sum, value) => sum + value, 0)}`
    : String(Number.isFinite(total) ? total : "—");
}

function GameEventHeadline({ event, pairedRoll }: { event: GameEvent; pairedRoll?: GameEvent | undefined }) {
  if (event.type === "fast_track:purchased" && event.payload.previousOwnerId) {
    return <span>Выкуплено: {String(event.payload.title ?? "возможность большого круга")}</span>;
  }
  if (event.type === realtimeEvents.playerRollDice) {
    const diceValues=Array.isArray(event.payload.diceValues)?event.payload.diceValues.map(toNumber):[];
    return <TurnMovement diceValues={diceValues} total={toNumber(event.payload.dice)}/>;
  }

  if (event.type === realtimeEvents.playerMove) {
    const cell=isRecord(event.payload.cell)?event.payload.cell:null;
    const cellType=String(cell?.type??"");
    const cellLabel=String(cell?.label??cellTypes[cellType]??"");
    const diceValues=pairedRoll&&Array.isArray(pairedRoll.payload.diceValues)?pairedRoll.payload.diceValues.map(toNumber):[];
    return <TurnMovement diceValues={diceValues} {...(pairedRoll?{total:toNumber(pairedRoll.payload.dice)}:{})} from={toNumber(event.payload.from)} to={toNumber(event.payload.to)} cellLabel={cellLabel?cellTypes[cellType]??localizeGameText(cellLabel):""}/>;
  }

  const EventIcon = eventTitleIcons[event.type as keyof typeof eventTitleIcons];
  return (
    <span className="inline-flex items-center gap-2">
      {EventIcon ? <EventIcon size={16} className="shrink-0 text-journey" data-inline-action-icon aria-hidden="true" /> : null}
      <span>{eventTitle(event.type)}</span>
    </span>
  );
}

function compactEventDetails(event: GameEvent) {
  if (event.type === realtimeEvents.playerRollDice) {
    return compactDetails([
      numericDetail(
        "Ходов благотворительности осталось",
        event.payload.charityTurnsRemaining
      )
    ]);
  }
  if (event.type === realtimeEvents.playerMove) return [];
  const playerActionDetails = compactPlayerActionDetails(event);
  if (playerActionDetails !== null) return playerActionDetails;
  const details = eventDetails(event);
  if (!eventCashChange(event)) return details;
  const redundantCashPrefixes = [
    "Наличные до:",
    "Наличными было:",
    "Наличные после:",
    "После покупки актива осталось:",
    "Получено наличными:",
    "Погашено:",
    "Пожертвование:",
    "Расход:",
    "Доход:",
    "Выплата банка:"
  ];
  return details.filter(
    (detail) => !redundantCashPrefixes.some((prefix) => detail.startsWith(prefix))
  );
}

function compactBoardPosition(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value < 0 ? "Старт" : String(value + 1);
}

function JournalCardDraw({ event }: { event: GameEvent }) {
  const payload = event.payload ?? {};
  const cardType = String(payload.cardType ?? "");
  const title = toText(payload.title) ?? "Карточка";
  const bodyText = toText(payload.bodyText);
  const effectDetails = compactDetails(cardEffectDetails(payload.effects));
  const financialDetails = compactDetails([
    metaMoneyDetail("Цена", payload.meta, "price"),
    metaMoneyDetail("Первоначальный взнос", payload.meta, "down_payment"),
    metaMoneyDetail("Денежный поток", payload.meta, "cashflow_monthly", "/мес")
  ]);

  return <JournalCard
    cardType={cardType}
    typeLabel={cardTypes[cardType] ?? "Карточка"}
    title={title}
    bodyText={bodyText}
    financialDetails={financialDetails}
    effectDetails={effectDetails}
  />;
}

const eventTitles: Record<string, string> = {
  "player:dream_chosen": "Выбрана мечта",
  "fast_track:cashflow": "Доход большого круга",
  "fast_track:expense": "Расход большого круга",
  "fast_track:purchased": "Инвестиция большого круга",
  "fast_track:sold": "Продажа на большом круге",
  "fast_track:investment_roll": "Бросок инвестиции",
  "fast_track:declined": "Отказ от покупки",
  "fast_track:dream_influence": "Цена мечты увеличена",
  "game:created": "Игра создана",
  "game:lobby_updated": "Настройки игры изменены",
  "game:started": "Игра запущена",
  "game:paused": "Игра поставлена на паузу",
  "game:resumed": "Игра продолжена",
  "game:period_started": "Начался новый период",
  "game:deleted": "Игра удалена",
  "game:ended": "Игра завершена",
  "bot:decision": "Решение бота",
  "player:joined": "Игрок вошел в комнату",
  "player:added": "Игрок добавлен ведущим",
  "player:removed": "Участник удалён из лобби",
  "player:roll_dice": "Бросок кубика",
  "player:move": "Перемещение по полю",
  "player:baby": "Рождение ребенка",
  "player:baby_gift": "Поздравление с рождением ребёнка",
  "player:downsized": "Потеря работы",
  "player:charity": "Благотворительность",
  "player:charity_choice_required": "Выбор благотворительности",
  "player:charity_declined": "Отказ от благотворительности",
  "player:escaped_rat_race": "Выход из крысиных бегов",
  "turn:skipped": "Ход пропущен",
  "card:draw": "Вытянута карточка",
  "card:cash_delta": "Эффект карточки",
  "card:cashflow_delta": "Изменение денежного потока",
  "card:liability_created": "Создан долг по карточке",
  "card:condition_not_met": "Условие карточки не выполнено",
  "card:no_matching_assets": "Подходящие активы не найдены",
  "card:stock_quantity_changed": "Изменение акций",
  "network_marketing:level_applied": "Сетевой маркетинг",
  "network_marketing:level_stored": "Уровень сетевого маркетинга сохранён",
  "network_marketing:discarded": "Карточка сетевого маркетинга сброшена",
  "deal:choice_required": "Выбор сделки",
  "deal:buy": "Покупка актива",
  "deal:decline": "Отказ от покупки",
  "deal:sell": "Продажа актива",
  "deal:auction_start": "Аукцион возможности",
  "deal:auction_bid": "Предложение на аукционе",
  "deal:auction_decline": "Отказ от аукциона",
  "deal:auction_select": "Возможность продана",
  "deal:auction_cancel": "Аукцион завершён без продажи",
  "market:sale_offer": "Предложение рынка",
  "market:sale_declined": "Отказ от продажи",
  "market:no_effect": "Карточка рынка не сработала",
  "market:cashflow_applied": "Рынок изменил денежный поток",
  "market:assets_surrendered": "Активы возвращены банку",
  "loan:take": "Получен кредит",
  "loan:repay": "Погашен кредит",
  "bankruptcy:declared": "Объявлено банкротство",
  "bankruptcy:asset_sold": "Актив продан при банкротстве",
  "bankruptcy:debt_repaid": "Долг погашен при банкротстве",
  "bankruptcy:debts_halved": "Долги сокращены вдвое",
  "bankruptcy:recovered": "Выход из банкротства",
  "bankruptcy:turn_skipped": "Ход пропущен после банкротства",
  "bankruptcy:eliminated": "Игрок выбыл из-за банкротства",
  "paycheck:receive": "Наличные",
  "doodad:paid": "Оплачена безделушка",
  "state:update": "Обновление состояния"
};

const cardTypes: Record<string, string> = {
  SMALL_DEAL: "Малая сделка",
  BIG_DEAL: "Крупная сделка",
  MARKET: "Рынок",
  DOODAD: "Всякая всячина",
  FAST_TRACK: "Быстрый круг",
  DREAM: "Мечта"
};

const cardConditionLabels: Record<string, string> = {
  has_children: "есть дети",
  has_rental_realestate: "есть арендная недвижимость",
  has_8_plex: "есть 8-квартирный дом"
};

const gameRoles: Record<string, string> = {
  HOST: "Ведущий",
  PLAYER: "Игрок",
  BANKER: "Банкир",
  OBSERVER: "Наблюдатель"
};

function eventTitle(type: string) {
  return eventTitles[type] ?? "Игровое событие";
}

function eventDetails(event: GameEvent) {
  const payload = event.payload ?? {};

  switch (event.type) {
    case "game:created":
      return compactDetails([
        textDetail("Партия", payload.title),
        textDetail("Код", payload.code)
      ]);
    case "game:started":
      return compactDetails([
        numericDetail("Игроков", payload.playerCount),
        numericDetail("Лимит, мин.", payload.timeLimitMinutes),
        numericDetail("Периодов", payload.periodCount)
      ]);
    case "game:paused":
      return compactDetails([
        textDetail(
          "Причина",
          payload.reason === "period_complete"
            ? "Период завершён"
            : payload.reason === "player_left"
              ? "Игрок вышел из одиночной партии"
              : "Решение ведущего или администратора"
        ),
        payload.hasTimeLimit === false
          ? null
          : numericDetail("Период", payload.currentPeriod)
      ]);
    case "game:resumed":
      if (payload.hasTimeLimit === false) return [];
      return compactDetails([
        numericDetail("Период", payload.currentPeriod),
        numericDetail("Всего периодов", payload.periodCount)
      ]);
    case "game:period_started":
      return compactDetails([
        numericDetail("Период", payload.currentPeriod),
        numericDetail("Всего периодов", payload.periodCount)
      ]);
    case "game:ended":
      return compactDetails([
        textDetail(
          "Причина",
          payload.reason === "dream" ? "Куплена выбранная мечта"
            : payload.reason === "fast_track_income" ? "Доход большого круга увеличен на $50 000"
            : payload.reason === "financial_freedom"
            ? "Пассивный доход превысил расходы"
            : payload.reason === "time_limit"
              ? "Истёк лимит времени"
              : payload.reason === "human_bankrupt"
                ? "Человек выбыл из одиночной партии"
                : payload.reason === "bots_eliminated"
                  ? "Все боты выбыли"
                  : payload.reason
        ),
        moneyDetail("Пассивный доход", payload.passiveIncomeCents, "/мес"),
        moneyDetail("Расходы", payload.totalExpensesCents, "/мес")
      ]);
    case "bot:decision":
      return compactDetails([
        textDetail("Решение", botActionLabel(String(payload.action ?? ""))),
        textDetail("Почему", payload.reason)
      ]);
    case "game:deleted":
      return compactDetails([textDetail("Предыдущий статус", payload.previousStatus)]);
    case "player:joined":
    case "player:added":
      return compactDetails([
        textDetail("Игрок", payload.displayName),
        roleDetail(payload.role),
        numericDetail("Место", payload.seat)
      ]);
    case "player:roll_dice":
      return compactDetails([
        diceValuesDetail(payload.diceValues),
        numericDetail("Выпало", payload.dice),
        numericDetail("Ходов благотворительности осталось", payload.charityTurnsRemaining)
      ]);
    case "player:move":
      return compactDetails([
        moveDetail(payload),
        cellDetail(payload.cell)
      ]);
    case "paycheck:receive":
      return compactDetails([
        textDetail("Причина", eventReasonLabel(payload.reason)),
        moneyDetail("Наличные до", payload.beforeCashCents),
        moneyDetail("Денежный поток", payload.amountCents),
        moneyDetail("Наличные после", payload.afterCashCents),
        numericDetail("Клеток расчётного чека", payload.paycheckHits),
        numericDetail("Расчётных чеков получено", payload.paycheckCount)
      ]);
    case "card:draw":
      return cardDetails(payload);
    case "card:cash_delta":
      return compactDetails([
        textDetail("Карточка", payload.title),
        moneyDetail(toNumber(payload.amountCents) < 0 ? "Расход" : "Доход", payload.amountCents)
      ]);
    case "card:cashflow_delta":
      return compactDetails([
        textDetail("Карточка", payload.title),
        moneyDetail("Изменение денежного потока", payload.amountCents, "/мес")
      ]);
    case "card:liability_created":
      return compactDetails([
        textDetail("Карточка", payload.title),
        moneyDetail("Новый долг", payload.balanceCents),
        moneyDetail("Новый платеж", payload.paymentCents, "/мес")
      ]);
    case "card:condition_not_met":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail(
          "Условия",
          Array.isArray(payload.conditions)
            ? payload.conditions
                .map((condition) => cardConditionLabels[String(condition)])
                .filter(Boolean)
                .join(", ")
            : null
        )
      ]);
    case "card:no_matching_assets":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Тикер", payload.symbol),
        textDetail("Эффект", stockEffectLabel(String(payload.effectType ?? "")))
      ]);
    case "card:stock_quantity_changed":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Тикер", payload.symbol),
        textDetail("Пакет", payload.assetName),
        textDetail("Эффект", stockEffectLabel(String(payload.effectType ?? ""))),
        numericDetail("Было акций", payload.beforeQuantity),
        numericDetail("Стало акций", payload.afterQuantity)
      ]);
    case "network_marketing:level_applied":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Компания", payload.company),
        numericDetail("Получен уровень", payload.acquiredLevel),
        numericDetail("Предыдущий уровень", payload.previousLevel),
        numericDetail("Новый уровень", payload.level),
        moneyDetail("Денежный поток", payload.cashflowCents, "/мес"),
        moneyDetail("Прошлый денежный поток", payload.previousCashflowCents, "/мес")
      ]);
    case "network_marketing:level_stored":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Компания", payload.company),
        numericDetail("Сохранён уровень", payload.level),
        numericDetail("Действующий уровень", payload.currentLevel),
        textDetail("Статус", "Ожидает недостающие предыдущие уровни")
      ]);
    case "network_marketing:discarded":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Компания", payload.company),
        numericDetail("Выпал уровень", payload.level),
        numericDetail("Текущий уровень", payload.currentLevel),
        numericDetail("Нужен уровень", payload.requiredLevel),
        textDetail("Причина", eventReasonLabel(payload.reason))
      ]);
    case "deal:choice_required":
      return ["Выберите: мелкая или крупная сделка."];
    case "deal:buy":
      return compactDetails([
        textDetail("Сделка", payload.title),
        numericDetail("Количество", payload.quantity),
        moneyDetail("Наличными было", payload.beforeCashCents),
        moneyDetail("Актив", payload.downPaymentCents),
        moneyDetail("После покупки актива осталось", payload.afterCashCents),
        moneyDetail("Денежный поток", payload.cashflowCents, "/мес")
      ]);
    case "deal:auction_start":
      return compactDetails([
        textDetail("Возможность", payload.title),
        numericDetail(
          "Приглашено игроков",
          Array.isArray(payload.bidderGamePlayerIds) ? payload.bidderGamePlayerIds.length : null
        )
      ]);
    case "deal:auction_bid":
      return ["Игрок отправил закрытое предложение."];
    case "deal:auction_decline":
      return [payload.reason === "insufficient_cash"
        ? "Игрок не участвует в аукционе: не хватает наличных на первоначальный взнос и $1."
        : "Игрок отказался от покупки возможности."];
    case "deal:auction_select":
      return compactDetails([
        textDetail("Возможность", payload.title),
        moneyDetail("Цена аукциона", payload.bidAmountCents),
        moneyDetail("Первоначальный взнос", payload.downPaymentCents),
        moneyDetail("Денежный поток покупателя", payload.cashflowCents, "/мес")
      ]);
    case "deal:auction_cancel":
      return [
        payload.reason === "no_offers"
          ? "Все приглашённые игроки отказались."
          : "Владелец хода решил не продавать возможность."
      ];
    case "deal:decline":
      return compactDetails([
        textDetail("Тип", cardTypes[String(payload.cardType)] ?? "Карточка"),
        numericDetail("Карточка", payload.cardId)
      ]);
    case "market:sale_offer":
      return marketSaleDetails(payload);
    case "deal:sell":
      return compactDetails([
        ...marketSaleDetails(payload),
        moneyDetail("Наличные до", payload.beforeCashCents),
        moneyDetail("Наличные после", payload.afterCashCents),
        moneyDetail(
          toNumber(payload.removedCashflowCents) >= 0
            ? "Снятый денежный поток"
            : "Снятый расход",
          Math.abs(toNumber(payload.removedCashflowCents)),
          "/мес"
        )
      ]);
    case "market:sale_declined":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Актив", payload.assetName),
        moneyDetail("Цена продажи", payload.salePriceCents),
        moneyDetail("К получению", payload.proceedsCents)
      ]);
    case "market:no_effect":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Результат", marketNoEffectReason(String(payload.reason ?? "")))
      ]);
    case "market:cashflow_applied":
      return compactDetails([
        textDetail("Карточка", payload.title),
        numericDetail("Затронуто бизнесов", payload.assetCount),
        moneyDetail("Изменение на бизнес", payload.amountPerAssetCents, "/мес"),
        moneyDetail("Общее изменение", payload.totalAmountCents, "/мес")
      ]);
    case "market:assets_surrendered":
      return compactDetails([
        textDetail("Карточка", payload.title),
        numericDetail("Возвращено активов", payload.assetCount),
        moneyDetail("Снятый денежный поток", payload.removedCashflowCents, "/мес")
      ]);
    case "loan:take":
      return compactDetails([
        moneyDetail("Получено наличными", payload.amountCents),
        moneyDetail("Новый платеж", payload.paymentCents, "/мес")
      ]);
    case "loan:repay":
      return compactDetails([
        textDetail(
          "Кредит",
          liabilityLabels[String(payload.liabilityType)] ?? payload.liabilityName
        ),
        moneyDetail("Наличными было", payload.beforeCashCents),
        moneyDetail("Погашено", -Math.abs(toNumber(payload.amountCents))),
        moneyDetail("Наличные после", payload.afterCashCents),
        moneyDetail("Снятый платеж", payload.paymentCents, "/мес")
      ]);
    case "bankruptcy:declared":
      return compactDetails([
        moneyDetail("Наличные", payload.cashCents),
        moneyDetail("Денежный поток", payload.monthlyCashflowCents, "/мес"),
        moneyDetail("Дефицит", payload.deficitCents, "/мес")
      ]);
    case "bankruptcy:asset_sold":
      return compactDetails([
        textDetail("Актив", payload.assetName),
        numericDetail("Количество", payload.quantity),
        moneyDetail("Выплата банка", payload.proceedsCents),
        moneyDetail("Убран денежный поток", payload.removedCashflowCents, "/мес")
      ]);
    case "bankruptcy:debt_repaid":
      return compactDetails([
        textDetail(
          "Тип долга",
          liabilityLabels[String(payload.liabilityType)] ?? "Другой долг"
        ),
        moneyDetail("Погашено", payload.amountCents),
        moneyDetail("Остаток", payload.balanceCents),
        moneyDetail("Новый платёж", payload.paymentCents, "/мес")
      ]);
    case "bankruptcy:debts_halved":
      return compactDetails([
        textDetail(
          "Сокращённые долги",
          Array.isArray(payload.liabilityTypes)
            ? payload.liabilityTypes
                .map((type) => liabilityLabels[String(type)] ?? "другой долг")
                .join(", ")
            : null
        )
      ]);
    case "bankruptcy:recovered":
      return compactDetails([
        moneyDetail("Денежный поток", payload.monthlyCashflowCents, "/мес"),
        numericDetail("Ходов пропустить", payload.turnsToSkip)
      ]);
    case "bankruptcy:turn_skipped":
      return compactDetails([
        numericDetail("Ходов осталось", payload.turnsRemaining)
      ]);
    case "bankruptcy:eliminated":
      return compactDetails([
        moneyDetail("Денежный поток", payload.monthlyCashflowCents, "/мес")
      ]);
    case "player:baby":
      return compactDetails([numericDetail("Детей теперь", payload.childrenCount)]);
    case "player:downsized":
      return compactDetails([
        moneyDetail("Расход", -Math.abs(toNumber(payload.costCents))),
        numericDetail("Пропуск ходов", payload.turns)
      ]);
    case "player:charity":
      return compactDetails([
        moneyDetail("Наличные до", payload.beforeCashCents),
        moneyDetail("Пожертвование", -Math.abs(toNumber(payload.donationCents))),
        moneyDetail("Наличные после", payload.afterCashCents),
        numericDetail("Кубиков", payload.diceCount),
        numericDetail(
          "Ходов благотворительности осталось",
          payload.charityTurnsRemaining ?? payload.turns
        )
      ]);
    case "player:charity_choice_required":
      return compactDetails([
        moneyDetail("Пожертвование", payload.donationCents),
        numericDetail("Кубиков", payload.diceCount),
        numericDetail("Бонусных ходов", payload.turns)
      ]);
    case "player:charity_declined":
      return compactDetails([
        moneyDetail("Пожертвование отклонено", payload.donationCents),
        numericDetail("Кубиков", payload.diceCount),
        numericDetail("Бонусных ходов", payload.turns)
      ]);
    case "doodad:paid":
      return compactDetails([
        textDetail("Всякая всячина", payload.title),
        moneyDetail("Расход", payload.amountCents)
      ]);
    case "player:escaped_rat_race":
      return typeof payload.incomeCents === "number"
        ? compactDetails([moneyDetail("Стартовый доход", payload.incomeCents), moneyDetail("Цель", payload.targetIncomeCents)])
        : compactDetails([moneyDetail("Пассивный доход", payload.passiveIncomeCents, "/мес"), moneyDetail("Расходы", payload.totalExpensesCents, "/мес")]);
    case "fast_track:purchased":
      return compactDetails([textDetail("Возможность", payload.title), moneyDetail("Вложено", payload.costCents), moneyDetail("Доход", payload.incomeCents), textDetail("Результат", payload.success ? "Успех" : "Инвестиция не принесла дохода")]);
    case "fast_track:sold":
      return compactDetails([textDetail("Возможность", payload.title), toNumber(payload.incomeChangeCents) ? moneyDetail("Изменение денежного потока", payload.incomeChangeCents) : null]);
    case "fast_track:cashflow":
    case "fast_track:expense":
      return compactDetails([textDetail("Клетка", payload.title), moneyDetail("Сумма", payload.amountCents)]);
    case "fast_track:investment_roll":
      return compactDetails([textDetail("Клетка", payload.title), numericDetail("Кубик", payload.die), textDetail("Результат", payload.success ? "Успех" : "Неудача")]);
    case "fast_track:declined":
    case "fast_track:dream_influence":
    case "player:dream_chosen":
      return compactDetails([textDetail("Клетка", payload.title)]);
    case "turn:skipped":
      return compactDetails([textDetail("Причина", eventReasonLabel(payload.reason))]);
    case "state:update":
      return compactDetails([textDetail("Причина", eventReasonLabel(payload.reason))]);
    default:
      return fallbackPayloadDetails(payload);
  }
}

function cardDetails(payload: Record<string, unknown>) {
  return compactDetails([
    textDetail("Тип", cardTypes[String(payload.cardType)] ?? "Карточка"),
    textDetail("Карточка", payload.title),
    textDetail("Текст", payload.bodyText),
    ...cardEffectDetails(payload.effects),
    metaMoneyDetail("Цена", payload.meta, "price"),
    metaMoneyDetail("Первоначальный взнос", payload.meta, "down_payment"),
    metaMoneyDetail("Денежный поток", payload.meta, "cashflow_monthly", "/мес")
  ]);
}

function cardEffectDetails(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((effect) => {
    if (!isRecord(effect)) return [];
    const effectType = String(effect.effectType ?? "");
    const amount = toNumber(effect.amountCents);

    if (effectType === "cash_delta" || effectType === "cash.adjust") {
      if (amount === 0) return [];
      return [moneyDetail(amount < 0 ? "Расход" : "Доход", amount)];
    }
    if (effectType === "cashflow_delta" || effectType === "cashflow.adjust") {
      if (amount === 0) return [];
      return [moneyDetail("Изменение денежного потока", amount, "/мес")];
    }
    if (effectType === "liability.create") {
      if (amount === 0) return [];
      return [moneyDetail("Новый долг", amount)];
    }
    if (effectType === "liability_delta") {
      if (amount === 0) return [];
      return [moneyDetail("Изменение долга", amount)];
    }
    if (effectType === "conditional_cash_delta") {
      if (amount === 0) return [];
      return [moneyDetail(amount < 0 ? "Условный расход" : "Условный доход", amount)];
    }
    if (effectType === "stock_split") {
      return [`Дробление акций: ×${amount}`];
    }
    if (effectType === "stock_reverse_split") {
      return [`Уменьшение акций: ÷${amount}`];
    }
    if (effectType === "stock_wipeout") {
      return ["Акции обнуляются"];
    }
    if (amount === 0) return [];

    return [moneyDetail("Эффект карточки", amount)];
  });
}

function marketSaleDetails(payload: Record<string, unknown>) {
  const proceeds = toNumber(payload.proceedsCents);
  return compactDetails([
    textDetail("Карточка", payload.title),
    textDetail("Актив", payload.assetName),
    moneyDetail("Цена продажи", payload.salePriceCents),
    moneyDetail("Закладная", payload.mortgageCents),
    moneyDetail(proceeds >= 0 ? "К получению" : "К доплате", Math.abs(proceeds))
  ]);
}

function marketNoEffectReason(reason: string) {
  if (reason === "no_matching_businesses") return "Ни у одного игрока нет подходящего малого бизнеса";
  if (reason === "unsupported_rule") return "Для этой карточки не задано игровое правило";
  return "Ни у одного игрока нет подходящего актива";
}

function stockEffectLabel(effectType: string) {
  if (effectType === "stock_split" || effectType === "asset.quantity.multiply") return "дробление";
  if (effectType === "stock_reverse_split" || effectType === "asset.quantity.divide") return "уменьшение";
  if (effectType === "stock_wipeout" || effectType === "asset.wipeout") return "обнуление";
  return "Изменение актива";
}

function moveDetail(payload: Record<string, unknown>) {
  const from = toNumber(payload.from);
  const to = toNumber(payload.to);
  const steps = toNumber(payload.steps);
  if (steps === 0 && from === 0 && to === 0) return null;
  return `С ${boardPositionLabel(from)} на ${boardPositionLabel(to)}, шагов: ${steps}`;
}

function diceValuesDetail(value: unknown) {
  if (!Array.isArray(value) || value.length <= 1) return null;
  const values = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 1 && item <= 6);
  return values.length > 1 ? `Кубики: ${values.join(" + ")}` : null;
}

function boardPositionLabel(position: number) {
  return position < 0 ? "вне поля" : `клетку #${position + 1}`;
}

function cellDetail(value: unknown) {
  if (!isRecord(value)) return null;
  const type = String(value.type ?? "");
  const label = String(value.label ?? "");
  return `Клетка: ${cellTypes[type] ?? (label || "Игровая клетка")}`;
}

function roleDetail(value: unknown) {
  const role = String(value ?? "");
  if (!role) return null;
  return `Роль: ${gameRoles[role] ?? "Участник"}`;
}

function textDetail(label: string, value: unknown) {
  const text = toText(value);
  return text ? `${label}: ${text}` : null;
}

function numericDetail(label: string, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = toNumber(value);
  return Number.isFinite(number) ? `${label}: ${number}` : null;
}

function moneyDetail(label: string, value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return null;
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return null;
  return `${label}: ${money(amount)}${suffix}`;
}

function metaMoneyDetail(
  label: string,
  meta: unknown,
  key: string,
  suffix = ""
) {
  if (!isRecord(meta)) return null;
  const raw = meta[key];
  if (raw === null || raw === undefined || raw === "") return null;
  return moneyDetail(label, toNumber(raw), suffix);
}

function botActionLabel(action: string) {
  const labels: Record<string, string> = {
    draw: "выбрать карточку сделки",
    buy: "купить сделку",
    take_loan: "взять кредит для сделки",
    repay_loan: "погасить часть кредита",
    decline_deal: "отказаться от сделки",
    sell_stock: "продать акции",
    decline_stock: "сохранить акции",
    sell_market: "принять предложение рынка",
    decline_market: "отказаться от предложения рынка",
    accept_charity: "принять благотворительность",
    decline_charity: "отказаться от благотворительности",
    pay_doodad: "выбрать способ оплаты расхода",
    sell_bankruptcy_asset: "продать актив при банкротстве",
    repay_bankruptcy_debt: "погасить долг при банкротстве"
  };
  return labels[action] ?? "выполнить допустимое действие";
}

function fallbackPayloadDetails(_payload: Record<string, unknown>) {
  return [];
}

function compactDetails(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}

function toText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return localizeGameText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}



function ResultFinancialComparison({
  state,
  showCash = false
}: {
  state: FinancialState;
  showCash?: boolean;
}) {
  const scale = Math.max(1, state.passiveIncomeCents, state.totalExpensesCents);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-neutral-600">Пассивный доход</span>
          <strong>{money(state.passiveIncomeCents)}/мес</strong>
        </div>
        <ProgressBar
          className="mt-1.5"
          value={state.passiveIncomeCents}
          max={scale}
          label={`Пассивный доход ${money(state.passiveIncomeCents)} в месяц`}
          tone="success"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-neutral-600">Расходы</span>
          <strong>{money(state.totalExpensesCents)}/мес</strong>
        </div>
        <ProgressBar
          className="mt-1.5"
          value={state.totalExpensesCents}
          max={scale}
          label={`Расходы ${money(state.totalExpensesCents)} в месяц`}
          tone="danger"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {showCash ? <Metric label="Наличные" value={money(state.cashCents)} /> : null}
        <Metric label="Денежный поток" value={money(state.monthlyCashflowCents)} />
      </div>
    </div>
  );
}












function BankruptcyRecoveryProgress({
  deficitCents,
  totalExpensesCents
}: {
  deficitCents: number;
  totalExpensesCents: number;
}) {
  const scale = Math.max(1, totalExpensesCents, deficitCents);
  const recoveredCents = Math.max(0, scale - deficitCents);
  const recovered = deficitCents <= 0;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-red-900">Восстановление денежного потока</span>
        <strong className={recovered ? "text-success" : "text-red-800"}>
          {recovered ? "Восстановлен" : `−${money(deficitCents)}/мес`}
        </strong>
      </div>
      <ProgressBar
        className="mt-2"
        value={recovered ? scale : recoveredCents}
        max={scale}
        label={
          recovered
            ? "Денежный поток восстановлен"
            : `До положительного денежного потока не хватает ${money(deficitCents)} в месяц`
        }
        tone={recovered ? "success" : "danger"}
      />
      <div className="mt-2 text-xs text-red-800">
        Цель: сократить дефицит до <strong>{money(0)}/мес</strong>
      </div>
    </div>
  );
}













function latestDealCard(
  events: GameEvent[],
  pendingAction: GameSnapshot["game"]["pendingAction"]
) {
  if (
    pendingAction?.type !== "deal_card_drawn" &&
    pendingAction?.type !== "stock_sale_window" &&
    pendingAction?.type !== "deal_auction"
  ) {
    return null;
  }

  const event = [...events].reverse().find((item) => {
    const cardType = item.payload.cardType;
    return (
      item.type === realtimeEvents.cardDraw &&
      Number(item.payload.id) === pendingAction.cardId &&
      (cardType === "SMALL_DEAL" ||
        cardType === "BIG_DEAL")
    );
  });

  if (!event) return null;
  const meta = isRecord(event.payload.meta) ? event.payload.meta : {};
  const cashDelta = effectAmount(event.payload.effects, "cash_delta");
  const cashflowDelta = effectAmount(event.payload.effects, "cashflow_delta");
  const category = String(event.payload.category ?? "").toLowerCase();
  const subcategory = String(event.payload.subcategory ?? "").toLowerCase();
  const symbol = String(meta.symbol ?? "");
  const title = String(event.payload.title ?? "Сделка");
  const bodyText = String(event.payload.bodyText ?? "");
  const text = `${title}\n${bodyText}`;
  const isStock =
    Boolean(symbol) ||
    category.includes("stock") ||
    subcategory.includes("stock") ||
    category.includes("share") ||
    subcategory.includes("share") ||
    /акци|stock|share/i.test(text);
  const priceCents = isStock
    ? stockPriceCents(meta, text)
    : metaCents(meta, "price");
  const downPaymentCents =
    cashDelta !== 0
      ? Math.abs(cashDelta)
      : isStock
        ? priceCents
        : dealDownPaymentAmount(meta, priceCents);

  return {
    event,
    cardId: Number(event.payload.id),
    title: localizeGameText(title),
    bodyText: localizeGameText(bodyText),
    priceCents,
    downPaymentCents,
    cashflowCents: cashflowDelta || metaCents(meta, "cashflow_monthly"),
    isStock,
    isAuctionEligible:
      !isStock &&
      isDealAuctionOpportunity(category, `${category} ${subcategory} ${title} ${bodyText}`)
  };
}

function stockSaleOfferForPlayer(
  pendingAction: GameSnapshot["game"]["pendingAction"],
  player: GamePlayer | undefined
) {
  if (pendingAction?.type !== "stock_sale_window" || !player) return null;
  if (!pendingAction.sellerGamePlayerIds.includes(player.id)) return null;
  if (pendingAction.resolvedGamePlayerIds.includes(player.id)) return null;

  const symbol = pendingAction.symbol.toLowerCase();
  const quantity = player.assets
    .filter((asset) => isStockAsset(asset) && (asset.symbol ?? "").toLowerCase() === symbol)
    .reduce((sum, asset) => sum + asset.quantity, 0);
  if (quantity <= 0) return null;

  return {
    cardId: pendingAction.cardId,
    title: pendingAction.title,
    symbol: pendingAction.symbol,
    salePriceCents: pendingAction.salePriceCents,
    quantity
  };
}

function stockPriceCents(meta: Record<string, unknown>, text: string) {
  return metaCents(meta, "today_price") || metaCents(meta, "price") || parseTodayPriceCents(text);
}

function parseTodayPriceCents(text: string) {
  const match = text.match(/(?:сегодняшняя\s+цена|today(?:'s)?\s+price)[^\d$]*\$?\s*(\d+(?:[.,]\d+)?)/iu);
  if (!match?.[1]) return 0;
  return Math.round(toNumber(match[1].replace(",", ".")));
}

function metaCents(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  if (value === null || value === undefined || value === "") return 0;
  return Math.round(toNumber(value));
}

function effectAmount(effects: unknown, effectType: string) {
  if (!Array.isArray(effects)) return 0;
  return effects.reduce((sum, effect) => {
    if (!isRecord(effect) || effect.effectType !== effectType) return sum;
    return sum + toNumber(effect.amountCents);
  }, 0);
}
