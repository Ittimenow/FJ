"use client";

import {
  dealDownPaymentAmount,
  figurineImagePath,
  isBabyGiftWindowOpen,
  realtimeEvents,
  type FigurineId
} from "@cashflow/shared";
import {
  ArrowRightToLine,
  Baby,
  Banknote,
  BellRing,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  CircleAlert,
  CircleDot,
  CircleOff,
  Dices,
  Gift,
  HandCoins,
  Handshake,
  Heart,
  Hourglass,
  Landmark,
  LayoutDashboard,
  MonitorUp,
  Minus,
  MoveRight,
  PauseCircle,
  Play,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UserX,
  UsersRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CSSProperties,
  FormEvent,
  ReactNode,
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FigurinePicker } from "@/components/figurine-picker";
import {
  GameRoomVariantTwo,
  type GameRoomView
} from "@/components/game/game-room-variant-two";
import { childExpenseCalculation } from "@/components/game/child-expense";
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import {
  cashChangeExpression,
  compactPlayerActionDetails,
  eventCashChange,
  eventReasonLabel,
  type CashChange
} from "@/components/game/game-event-result";
import {
  gameEndPresentation,
  type GameEndIcon,
  type GameEndTone
} from "@/components/game/game-end-result";
import {
  canAffordPurchaseCents,
  changeStockCostCents,
  changeStockQuantity,
  maxStockQuantityForCashCents,
  normalizeStockQuantity,
  stockPurchaseCostCents,
  stockQuantityForCostCents
} from "@/components/game/stock-purchase-calculation";
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
import { money, shortDate } from "@/lib/format";
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
type DecisionSubmission =
  | "deal_buy"
  | "deal_decline"
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
  currentUserRole
}: {
  initialSnapshot: GameSnapshot;
  token: string;
  currentUserId: string;
  currentUserRole: "USER" | "HOST" | "ADMIN";
}) {
  const router = useRouter();
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
  const [gameRoomView] = useState<GameRoomView>(initialMe?.user?.gameRoomView ?? "classic");
  const [connection, setConnection] = useState<ConnectionDiagnostics>(
    initialConnectionDiagnostics
  );
  const [error, setError] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState(1000);
  const [dealQuantity, setDealQuantity] = useState<number | "">("");
  const [turnAnimationPhase, setTurnAnimationPhase] = useState<TurnAnimationPhase>("ready");
  const [turnTabRequest, setTurnTabRequest] = useState(0);
  const [rollingDice, setRollingDice] = useState(false);
  const [diceFaces, setDiceFaces] = useState([6]);
  const [stockSaleQuantity, setStockSaleQuantity] = useState<StockSaleQuantity>(1);
  const [decisionSubmission, setDecisionSubmission] = useState<DecisionSubmission | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [gameAnnouncement, setGameAnnouncement] = useState<string | null>(null);
  const [changingParticipation, setChangingParticipation] = useState(false);
  const [figurinePickerOpen, setFigurinePickerOpen] = useState(
    initialSnapshot.game.status === "WAITING" && Boolean(initialMe && !initialMe.figurine)
  );
  const [figurineChoice, setFigurineChoice] = useState<string | null>(
    initialMe?.figurine ??
      (initialPreferredFigurine && !initialTakenFigurines.has(initialPreferredFigurine)
        ? initialPreferredFigurine
        : null)
  );
  const [figurineSaving, setFigurineSaving] = useState(false);
  const [gameEndOpen, setGameEndOpen] = useState(initialSnapshot.game.status === "ENDED");
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [journalOnlyMine, setJournalOnlyMine] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileBoardRef = useRef<HTMLDivElement>(null);
  const expirationRefreshRef = useRef(false);
  const lastDiagnosticReportRef = useRef(0);
  const previousGameStatusRef = useRef(initialSnapshot.game.status);
  const decisionSubmissionRef = useRef(false);

  useEffect(() => {
    const desktopViewport = window.matchMedia(
      gameRoomView === "classic" ? "(min-width: 1024px)" : "(min-width: 1280px)"
    );
    const documentElement = document.documentElement;
    const { body } = document;

    const syncViewportLock = () => {
      const shouldLock = snapshot.game.status !== "WAITING" && desktopViewport.matches;

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
  }, [gameRoomView, snapshot.game.status]);
  const setGameRoomHeader = useSetGameRoomHeader();

  useEffect(() => {
    const socket = io(`${publicSocketBaseUrl()}/games`, {
      ...socketOptions(token),
      path: publicSocketPath()
    });
    socketRef.current = socket;

    socket.on("connect", () => {
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
      setSnapshot(value);
    });
    socket.on("game:deleted", () => leaveGamePage());
    socket.on(
      realtimeEvents.gamePaused,
      (payload: { reason?: string; currentPeriod?: number }) => {
        showTimelineAnnouncement(
          payload.reason === "period_complete"
            ? `Период ${payload.currentPeriod ?? ""} завершён. Игра поставлена на паузу.`
            : "Игра поставлена на паузу."
        );
      }
    );
    socket.on(
      realtimeEvents.gameResumed,
      (payload: { currentPeriod?: number; startsNextPeriod?: boolean }) => {
        showTimelineAnnouncement(
          payload.startsNextPeriod
            ? `Начался период ${payload.currentPeriod ?? ""}.`
            : "Игра продолжена."
        );
      }
    );
    socket.on(realtimeEvents.chatMessage, (message) => {
      setSnapshot((current) => ({
        ...current,
        chatMessages: [...current.chatMessages, message]
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
          : "Игровой сервер пока недоступен. Переподключение выполняется автоматически."
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

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
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

  useEffect(() => {
    if (!gameAnnouncement) return;
    const timeout = window.setTimeout(() => setGameAnnouncement(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [gameAnnouncement]);

  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.game.currentPlayerId
  );
  const gamePlayers = snapshot.players.filter((player) => player.role === "PLAYER");
  const winner = gamePlayers.find((player) => Boolean(player.financialState?.wonAt));
  const me = gamePlayers.find((player) => player.userId === currentUserId);
  const takenFigurines = gamePlayers
    .filter((player) => player.id !== me?.id)
    .map((player) => player.figurine)
    .filter((figurine): figurine is string => Boolean(figurine));
  const playersWithoutFigurines = gamePlayers.filter((player) => !player.figurine);
  const startDisabledReason =
    gamePlayers.length < 2
      ? "Для старта нужны минимум два игрока."
      : playersWithoutFigurines.length > 0
        ? "Все игроки должны выбрать фигурки."
        : null;
  const gameEndEvent = [...snapshot.events]
    .reverse()
    .find((event) => event.type === realtimeEvents.gameEnded);
  const selectedPlayer = me ?? gamePlayers[0];
  const canRoll =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.userId === currentUserId &&
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
    snapshot.game.status === "WAITING" &&
    canManage;
  const canChangeHostParticipation =
    !isSolo &&
    snapshot.game.createdById === currentUserId &&
    (currentUserRole === "HOST" || currentUserRole === "ADMIN");
  const pendingAction = snapshot.game.pendingAction;
  const ownPendingAction = pendingAction?.gamePlayerId === me?.id ? pendingAction : null;
  const charityChoice =
    ownPendingAction?.type === "charity_choice" ? ownPendingAction : null;
  const doodadPaymentChoice =
    ownPendingAction?.type === "doodad_payment_choice" ? ownPendingAction : null;
  const marketSaleOffer =
    ownPendingAction?.type === "market_sale" ? ownPendingAction : null;
  const isMyTurn =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.userId === currentUserId;
  const canAnswerCharity =
    isMyTurn && Boolean(charityChoice);
  const canAnswerDoodadPayment =
    isMyTurn && Boolean(doodadPaymentChoice);
  const canAnswerMarketSale =
    snapshot.game.status === "IN_PROGRESS" && Boolean(marketSaleOffer);
  const canTakeLoan =
    snapshot.game.status === "IN_PROGRESS" &&
    Boolean(me) &&
    me?.financialState?.bankruptcyStatus !== "LIQUIDATING";
  const activeDiceCount = (me?.financialState?.charityTurns ?? 0) > 0
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
      ? latestBuyableCard
      : null;
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
  const currentStockSaleResetKey = stockSaleResetKey(stockSaleOffer);
  const unresolvedBotStockSeller =
    pendingAction?.type === "stock_sale_window"
      ? gamePlayers.find(
          (player) =>
            player.controller === "BOT" &&
            pendingAction.sellerGamePlayerIds.includes(player.id) &&
            !pendingAction.resolvedGamePlayerIds.includes(player.id)
        )
      : null;
  const botWaitingForMe =
    pendingAction?.type === "stock_sale_window" &&
    Boolean(
      me &&
        pendingAction.sellerGamePlayerIds.includes(me.id) &&
        !pendingAction.resolvedGamePlayerIds.includes(me.id)
    );
  const botTurnMessage = unresolvedBotStockSeller
    ? `${gamePlayerName(unresolvedBotStockSeller)} оценивает предложение по акциям.`
    : snapshot.game.status === "IN_PROGRESS" && currentPlayer?.controller === "BOT"
      ? botWaitingForMe
        ? `${gamePlayerName(currentPlayer)} ожидает вашего решения по продаже акций.`
        : `${gamePlayerName(currentPlayer)} обдумывает ход.`
      : null;
  useEffect(() => {
    if (snapshot.game.status !== "WAITING" || !me) {
      setFigurinePickerOpen(false);
      return;
    }
    if (me.figurine) {
      setFigurineChoice(me.figurine);
      setFigurinePickerOpen(false);
    } else {
      setFigurinePickerOpen(true);
    }
  }, [me, snapshot.game.status]);

  useEffect(() => {
    setGameRoomHeader({
      gameId: snapshot.game.id,
      currentUserId,
      title: snapshot.game.title,
      status: snapshot.game.status,
      connected,
      connection,
      code: snapshot.game.code,
      isSolo,
      currentRound: snapshot.game.currentRound,
      currentPlayerName: currentPlayer ? gamePlayerName(currentPlayer) : null,
      currentPeriod: snapshot.game.currentPeriod,
      periodCount: snapshot.game.periodCount,
      remainingSeconds,
      timelineLoading,
      startsNextPeriod: snapshot.game.pauseReason === "period_complete",
      chatMessages: snapshot.chatMessages,
      onSendChat: (body) => emit("chat:send", { body }),
      onPause: canPause ? () => void pauseGame() : null,
      onResume: canResume ? () => void resumeGame() : null,
      onDeleteGame: canManage ? deleteGame : null,
      onCheckConnection: () => void refreshConnection()
    });
  }, [
    canManage,
    canPause,
    canResume,
    connected,
    connection,
    currentPlayer,
    currentUserId,
    isSolo,
    setGameRoomHeader,
    snapshot.game.code,
    snapshot.game.id,
    snapshot.game.currentPeriod,
    snapshot.game.currentRound,
    snapshot.game.pauseReason,
    snapshot.game.periodCount,
    snapshot.game.status,
    snapshot.game.title,
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
    if (
      snapshot.game.status === "ENDED" &&
      previousGameStatusRef.current !== "ENDED"
    ) {
      setGameEndOpen(true);
    }
    previousGameStatusRef.current = snapshot.game.status;
  }, [snapshot.game.status]);

  useEffect(() => {
    if (canRoll && !pendingAction && !rollingDice) {
      setDiceFaces(Array.from({ length: activeDiceCount }, () => 6));
      setTurnAnimationPhase("ready");
    }
  }, [activeDiceCount, canRoll, pendingAction, rollingDice]);

  async function startGame() {
    setError(null);
    if (socketRef.current?.connected) {
      try {
        const result = await emitWithAck("game:start", {});
        applyActionResult(result);
      } catch (event) {
        setError(gameErrorMessage(event, "Не удалось начать партию"));
      }
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
      setError(gameErrorMessage(result.message, "Не удалось начать партию"));
      return;
    }
    setSnapshot(result.snapshot ?? result);
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

  async function chooseFigurine() {
    if (!figurineChoice) return;
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
          body: JSON.stringify({ figurine: figurineChoice })
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
      setSnapshot(result.snapshot ?? result);
      setFigurinePickerOpen(false);
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
    setSnapshot(result.snapshot ?? result);
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
      setSnapshot(result.snapshot ?? result);
    } finally {
      setChangingParticipation(false);
    }
  }

  async function deleteGame() {
    setError(null);
    if (socketRef.current?.connected) {
      try {
        await emitWithAck("game:delete", {});
        leaveGamePage();
      } catch (event) {
        setError(gameErrorMessage(event, "Не удалось удалить игру"));
      }
      return;
    }

    const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (!response.ok) {
      setError(gameErrorMessage(result.message, "Не удалось удалить игру"));
      return;
    }
    leaveGamePage();
  }

  function emit(event: string, payload: Record<string, unknown>) {
    setError(null);
    socketRef.current?.emit(event, {
      gameId: snapshot.game.id,
      ...payload
    });
  }

  function emitWithAck(event: string, payload: Record<string, unknown>) {
    return new Promise<GameActionResult>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error("Соединение с игрой неактивно"));
        return;
      }
      socket.timeout(10_000).emit(
        event,
        {
          gameId: snapshot.game.id,
          ...payload
        },
        (timeoutError: Error | null, result?: GameActionResult) => {
          if (timeoutError) {
            const message = `Команда ${event} не получила ответ за 10 секунд`;
            void reportConnectionIssue({
              token,
              gameId: snapshot.game.id,
              kind: "socket_timeout",
              message,
              diagnostics: connection
            });
            reject(new Error("Сервер долго не отвечает. Проверьте соединение и повторите действие."));
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
    announceTimelineEvents(result.events);
    if (result.snapshot?.game?.id) {
      if (result.snapshot.game.status === "CANCELLED") {
        leaveGamePage();
        return;
      }
      setSnapshot(result.snapshot);
    }
  }

  function announceTimelineEvents(
    events: Array<{ type: string; payload: Record<string, unknown> }> | undefined
  ) {
    const event = events?.find(
      (candidate) =>
        candidate.type === realtimeEvents.gamePaused ||
        candidate.type === realtimeEvents.gameResumed
    );
    if (!event) return;
    const currentPeriod =
      typeof event.payload.currentPeriod === "number"
        ? event.payload.currentPeriod
        : null;
    if (event.type === realtimeEvents.gamePaused) {
      showTimelineAnnouncement(
        event.payload.reason === "period_complete"
          ? `Период ${currentPeriod ?? ""} завершён. Игра поставлена на паузу.`
          : "Игра поставлена на паузу."
      );
      return;
    }
    showTimelineAnnouncement(
      event.payload.startsNextPeriod
        ? `Начался период ${currentPeriod ?? ""}.`
        : "Игра продолжена."
    );
  }

  function showTimelineAnnouncement(message: string) {
    setGameAnnouncement(message.replace(/\s+\./g, "."));
  }

  function leaveGamePage() {
    router.replace("/dashboard");
    router.refresh();
  }

  async function rollDice() {
    if (rollingDice) return;
    if (!socketRef.current?.connected) {
      setError("Соединение с игрой восстанавливается. Дождитесь подключения и повторите бросок.");
      return;
    }
    setError(null);
    setRollingDice(true);
    setTurnAnimationPhase("rolling");
    startDiceAnimation(activeDiceCount);
    const startedAt = Date.now();

    try {
      const result = await emitWithAck(realtimeEvents.playerRollDice, {});
      applyActionResult(result);
      const dice = diceValuesFromActionResult(result) ?? diceFaces;
      const move = moveFromActionResult(result);
      const remaining = Math.max(0, 1000 - (Date.now() - startedAt));
      await wait(remaining);
      stopDiceAnimation();
      setDiceFaces(dice);
      await wait(450);

      if (move) {
        setTurnAnimationPhase("moving");
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduceMotion) await wait(turnMoveDuration(move.steps));
      }

      setTurnAnimationPhase("landed");
      await wait(2500);
      setTurnTabRequest((current) => current + 1);
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
      setTurnTabRequest((current) => current + 1);
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

  function sellMarketAsset() {
    emit("market:sell", {});
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
    emit("market:decline", {});
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
    setError(null);
    try {
      const result = await emitWithAck(realtimeEvents.loanTake, { amountCents: loanAmount });
      applyActionResult(result);
      return true;
    } catch (event) {
      setError(gameErrorMessage(event, "Не удалось взять кредит"));
      return false;
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
      return Math.max(next, 1000);
    });
  }

  function updateLoanAmount(value: number) {
    const normalized = Math.max(Math.floor((Number(value) || 0) / 1000) * 1000, 1000);
    setLoanAmount(normalized);
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

  const renderTurnFeed = (showHeader = true) => (
    <GameTurnFeed
      gameId={snapshot.game.id}
      token={token}
      events={snapshot.events}
      players={gamePlayers}
      currentUserId={currentUserId}
      currentGamePlayerId={me?.id ?? null}
      currentTurnPlayer={currentPlayer}
      currentTurnIndex={snapshot.game.currentTurnIndex}
      gameStatus={snapshot.game.status}
      onSendBabyGift={sendBabyGift}
      onlyMine={journalOnlyMine}
      onToggleOnlyMine={() => setJournalOnlyMine((value) => !value)}
      showHeader={showHeader}
      botStatusMessage={botTurnMessage}
    />
  );

  const renderJournalFilterButton = () => (
    <JournalFilterButton
      onlyMine={journalOnlyMine}
      onToggle={() => setJournalOnlyMine((value) => !value)}
    />
  );

  return (
    <div
      className={cn(
        "game-room grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5",
        gameRoomView === "classic" && snapshot.game.status !== "WAITING"
          ? "game-room--classic-active"
          : null,
        gameRoomView === "journey" && snapshot.game.status !== "WAITING"
          ? "game-room--journey-active"
          : null
      )}
    >
      {canManage && !isSolo ? (
        <nav
          aria-label="Экраны ведущего"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_12px_32px_rgba(23,36,63,.18)]"
        >
          <div className="min-w-0">
            <div className="text-sm font-extrabold">Рабочее место ведущего</div>
            <p className="mt-0.5 text-xs text-white/70">Наблюдайте за игроками здесь, а игровое поле вынесите на второй экран.</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/games/${snapshot.game.id}/host`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-ink transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/35"
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              Пульт ведущего
            </a>
            <a
              href={`/games/${snapshot.game.id}/display?view=${gameRoomView === "journey" ? "journey" : "classic"}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-action px-3 text-xs font-extrabold text-ink shadow-[0_8px_20px_rgba(249,143,47,.22)] transition hover:-translate-y-0.5 hover:bg-[#e77b1e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
            >
              <MonitorUp size={16} aria-hidden="true" />
              Открыть поле
            </a>
          </div>
        </nav>
      ) : null}
      {gameAnnouncement ? (
        <div
          role="status"
          aria-live="assertive"
          className="fixed left-1/2 top-20 z-[70] flex w-[min(92vw,520px)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-[0_18px_48px_rgba(5,18,45,.3)]"
        >
          <BellRing className="shrink-0 text-action" size={19} aria-hidden="true" />
          <span>{gameAnnouncement}</span>
        </div>
      ) : null}
      {snapshot.game.status === "PAUSED" ? (
        <GamePauseBanner
          currentPeriod={snapshot.game.currentPeriod}
          periodCount={snapshot.game.periodCount}
          reason={snapshot.game.pauseReason}
          remainingSeconds={remainingSeconds ?? snapshot.game.remainingPeriodSeconds ?? 0}
          canManage={canManage}
          loading={timelineLoading}
          onResume={resumeGame}
        />
      ) : null}
      <MobileTurnDialog
        open={canRoll && !pendingAction}
        rolling={rollingDice}
        diceValues={diceFaces}
        diceCount={activeDiceCount}
        maxCompactViewportWidth={gameRoomView === "classic" ? 1023 : 1279}
        onSkip={skipTurn}
        onRoll={() => {
          setTurnTabRequest((current) => current + 1);
          void rollDice();
        }}
      />
      <GameEndPopup
        open={gameEndOpen && snapshot.game.status === "ENDED"}
        winner={winner}
        player={me}
        reason={typeof gameEndEvent?.payload.reason === "string" ? gameEndEvent.payload.reason : null}
        onClose={() => setGameEndOpen(false)}
      />
      <FigurineDialog
        open={figurinePickerOpen && snapshot.game.status === "WAITING" && Boolean(me)}
        value={figurineChoice}
        taken={takenFigurines}
        saving={figurineSaving}
        canClose={Boolean(me?.figurine)}
        onChange={setFigurineChoice}
        onConfirm={chooseFigurine}
        onClose={() => setFigurinePickerOpen(false)}
      />
      <BankDialog
        open={bankDialogOpen}
        loanAmount={loanAmount}
        currentCashCents={me?.financialState?.cashCents ?? 0}
        currentMonthlyCashflowCents={me?.financialState?.monthlyCashflowCents ?? 0}
        onLoanDecrease={() => changeLoanAmount(-1000)}
        onLoanIncrease={() => changeLoanAmount(1000)}
        onLoanAmountChange={updateLoanAmount}
        onTakeLoan={async () => {
          const loanTaken = await takeLoan();
          if (loanTaken) setBankDialogOpen(false);
        }}
        canTakeLoan={canTakeLoan}
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
      {me?.financialState?.bankruptcyStatus === "RECOVERED" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Банкротство преодолено. Осталось пропустить ходов: {me.financialState.bankruptcyTurns}.
        </div>
      ) : me?.financialState?.bankruptcyStatus === "ELIMINATED" ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          Денежный поток не удалось восстановить — вы выбыли из игры.
        </div>
      ) : null}
      {snapshot.game.status === "ENDED" ? (
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium md:hidden">
          {winner
            ? `Победитель: ${gamePlayerName(winner)}`
            : gameEndReasonText(
                typeof gameEndEvent?.payload.reason === "string"
                  ? gameEndEvent.payload.reason
                  : null
              )}
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
          code={snapshot.game.code}
          token={token}
          onAddUser={addUserToGame}
          canChangeParticipation={canChangeHostParticipation}
          participates={roomMembership?.role === "PLAYER"}
          changingParticipation={changingParticipation}
          onChangeParticipation={changeHostParticipation}
          currentPlayer={me}
          onChooseFigurine={() => setFigurinePickerOpen(true)}
        />
      ) : null}

      {gameRoomView === "journey" && snapshot.game.status !== "WAITING" ? (
        <GameRoomVariantTwo
          snapshot={snapshot}
          currentUserId={currentUserId}
          canRoll={canRoll && !pendingAction}
          turnTabRequest={turnTabRequest}
          actions={
            <>
              <div className="hidden xl:block">
                <DiceAction
                  canRoll={canRoll && !pendingAction}
                  rolling={rollingDice}
                  phase={turnAnimationPhase}
                  diceValues={diceFaces}
                  onRoll={rollDice}
                  onSkip={skipTurn}
                />
              </div>
              <ActionsPanel
              canChooseDeal={canChooseDeal}
              onDrawSmallDeal={() => draw("SMALL_DEAL")}
              onDrawBigDeal={() => draw("BIG_DEAL")}
              latestCard={latestDealDecisionCard}
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
              activityFeed={renderTurnFeed()}
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
          snapshot={snapshot}
          selectedPlayer={selectedPlayer}
          players={gamePlayers}
          canManageLiabilities={selectedPlayer?.id === me?.id && canTakeLoan}
          onCloseLiability={closeLiability}
          canOpenBank={selectedPlayer?.id === me?.id && canTakeLoan}
          onOpenBank={() => setBankDialogOpen(true)}
          outsidePlayers={snapshot.players.filter(
            (player) =>
              player.role === "PLAYER" &&
              player.track === "RAT_RACE" &&
              player.position < 0
          )}
        >
          <>
            <DiceAction
              canRoll={canRoll && !pendingAction}
              rolling={rollingDice}
              phase={turnAnimationPhase}
              diceValues={diceFaces}
              onRoll={rollDice}
              onSkip={skipTurn}
              pinnedToPanel
            />
            <ActionsPanel
              canChooseDeal={canChooseDeal}
              onDrawSmallDeal={() => draw("SMALL_DEAL")}
              onDrawBigDeal={() => draw("BIG_DEAL")}
              latestCard={latestDealDecisionCard}
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
              headerControl={renderJournalFilterButton()}
              pinnedHeader
              activityFeed={renderTurnFeed(false)}
              embedded
            />
          </>
        </DesktopGameBoard>
          </div>
          ) : null}

      <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5 lg:hidden">
        {snapshot.game.status !== "WAITING" ? (
          <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-2">
            <MobileBoard
              snapshot={snapshot}
              selectedPlayer={selectedPlayer}
              containerRef={mobileBoardRef}
            />
            <MobileGameTabs
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
                  headerControl={renderJournalFilterButton()}
                  activityFeed={renderTurnFeed(false)}
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
    </div>
  );
}

function GamePauseBanner({
  currentPeriod,
  periodCount,
  reason,
  remainingSeconds,
  canManage,
  loading,
  onResume
}: {
  currentPeriod: number;
  periodCount: number;
  reason: "manual" | "period_complete" | null;
  remainingSeconds: number;
  canManage: boolean;
  loading: boolean;
  onResume: () => void;
}) {
  const periodComplete = reason === "period_complete";
  const title = periodComplete
    ? `Период ${currentPeriod} завершён`
    : "Игра поставлена на паузу";
  const description = canManage
    ? periodComplete
      ? `Команда может отдохнуть. Когда будете готовы, начните период ${currentPeriod + 1}.`
      : "Таймер периода остановлен. Продолжите игру, когда команда будет готова."
    : periodComplete
      ? `Следующий период начнёт ведущий или администратор. Все игровые действия временно недоступны.`
      : "Ожидайте, пока ведущий или администратор продолжит игру. Все игровые действия временно недоступны.";

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="flex flex-col gap-4 rounded-2xl bg-[#fff0df] p-4 text-[#6f330c] shadow-[0_16px_38px_rgba(138,61,10,.14)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#a84b0d] shadow-[0_8px_22px_rgba(138,61,10,.12)]">
          <PauseCircle size={23} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-[-0.025em]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7f431c]">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <span className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold tabular-nums text-ink">
          {periodComplete
            ? `Период ${currentPeriod}/${periodCount}`
            : formatPeriodTime(remainingSeconds)}
        </span>
        {canManage ? (
          <Button
            type="button"
            variant="action"
            className="min-w-0 flex-1 gap-2 sm:flex-none"
            onClick={onResume}
            disabled={loading}
            aria-busy={loading}
          >
            <Play size={17} aria-hidden="true" />
            {loading
              ? "Продолжаем…"
              : periodComplete
                ? `Начать период ${currentPeriod + 1}`
                : "Продолжить игру"}
          </Button>
        ) : null}
      </div>
    </section>
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

function DiceAction({
  canRoll,
  rolling,
  phase,
  diceValues,
  onRoll,
  onSkip,
  pinnedToPanel = false
}: {
  canRoll: boolean;
  rolling: boolean;
  phase: TurnAnimationPhase;
  diceValues: number[];
  onRoll: () => void;
  onSkip: () => void;
  pinnedToPanel?: boolean;
}) {
  const status = rolling
    ? "Бросаем кубик…"
    : phase === "moving"
      ? "Фишка движется по полю…"
      : phase === "landed"
        ? "Ход выполнен"
        : canRoll
          ? "Ваш ход"
          : "Ожидайте своего хода";

  return (
    <section
      className={cn(
        "mb-3 rounded-xl bg-[#fff5ed] px-2",
        pinnedToPanel &&
          "sticky top-0 z-10 -mx-3 mb-0 h-[4.5rem] rounded-none px-3"
      )}
      aria-label="Бросок кубика"
    >
      <div
        className={cn(
          "flex h-12 items-center gap-2",
          pinnedToPanel && "h-full"
        )}
      >
        <div className="min-w-[5.5rem] max-w-[7.5rem] shrink-0">
          <h3 className="text-sm font-semibold text-[#7b3f17]">{status}</h3>
          {canRoll && !rolling ? (
            <button
              type="button"
              onClick={onSkip}
              className="mt-0.5 rounded-md text-xs font-medium text-[#7b3f17] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6a06c]"
            >
              Пропустить ход
            </button>
          ) : null}
        </div>
        <Button
          className="h-12 min-w-0 flex-1 px-3 text-base text-white"
          variant="action"
          onClick={onRoll}
          disabled={!canRoll || rolling}
          aria-busy={rolling}
        >
          {rolling
            ? "Бросаем…"
            : canRoll
              ? diceValues.length > 1 ? "Бросить кубики" : "Бросить кубик"
              : "Ожидайте ход"}
        </Button>
        <div className="flex shrink-0 gap-2" aria-live="polite">
          {diceValues.map((diceValue, index) => (
            <div key={index} className="scale-[.58] -m-4">
              <DiceFace value={diceValue} rolling={rolling} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileTurnDialog({
  open,
  rolling,
  diceValues,
  diceCount,
  maxCompactViewportWidth,
  onRoll,
  onSkip
}: {
  open: boolean;
  rolling: boolean;
  diceValues: number[];
  diceCount: number;
  maxCompactViewportWidth: number;
  onRoll: () => void;
  onSkip: () => void;
}) {
  const [mobileViewport, setMobileViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${maxCompactViewportWidth}px)`);
    const updateViewport = () => setMobileViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, [maxCompactViewportWidth]);

  if (!open || !mobileViewport) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] pb-[max(.75rem,env(safe-area-inset-bottom))] pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))] xl:hidden">
      <div
        role="region"
        aria-label="Действия текущего хода"
        className="pointer-events-auto mx-auto flex w-full max-w-sm items-center gap-2 rounded-2xl bg-[#fff5ed] p-2 shadow-[0_18px_48px_rgba(5,18,45,.28)]"
      >
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#7b3f17] shadow-[0_6px_16px_rgba(123,63,23,.12)] transition hover:bg-[#fffaf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0560c] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSkip}
          disabled={rolling}
          aria-label="Пропустить ход"
          title="Пропустить ход"
        >
          <X size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <Button
          type="button"
          variant="action"
          className="h-12 min-w-0 flex-1 whitespace-nowrap px-1.5 text-xs text-white min-[360px]:px-3 min-[360px]:text-sm"
          onClick={onRoll}
          disabled={rolling}
          aria-busy={rolling}
        >
          {rolling ? "Бросаем…" : diceCount > 1 ? "Бросить кубики" : "Бросить кубик"}
        </Button>
        <div className="flex shrink-0 gap-1" aria-live="polite">
          {diceValues.map((diceValue, index) => (
            <div key={index} className="-m-5 scale-50">
              <DiceFace value={diceValue} rolling={rolling} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameEndPopup({
  open,
  winner,
  player,
  reason,
  onClose
}: {
  open: boolean;
  winner: GamePlayer | undefined;
  player: GamePlayer | undefined;
  reason: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const winnerState = winner?.financialState;
  const playerState = player?.financialState;
  const featuredPlayer = winner ?? player;
  const featuredState = featuredPlayer?.financialState;
  const playerIsWinner = Boolean(winner && player && winner.id === player.id);
  const presentation = gameEndPresentation({
    reason,
    winnerName: winner ? gamePlayerName(winner) : null
  });
  const EndIcon = presentation.icon ? gameEndIcons[presentation.icon] : null;

  return (
    <div className="game-end-overlay fixed inset-0 z-[70] bg-black/55">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-end-title"
        aria-describedby={presentation.description ? "game-end-description" : undefined}
        className="game-end-dialog flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#fff9f1] shadow-[0_34px_90px_rgba(5,18,45,.35)]"
      >
        <div className="app-shell-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className={cn("text-center", !EndIcon && "pt-2")}>
            {EndIcon ? (
              <span
                className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl shadow-[0_8px_22px_rgba(27,57,118,.14)] ${gameEndToneClasses[presentation.tone]}`}
              >
                <EndIcon size={25} aria-hidden="true" />
              </span>
            ) : null}
            <h2
              id="game-end-title"
              aria-label={presentation.tone === "victory" ? presentation.title : undefined}
              className={cn(
                "font-extrabold tracking-[-0.025em] text-ink",
                EndIcon ? "mt-3 text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
              )}
            >
              {presentation.tone === "victory" ? (
                <ArchedVictoryTitle />
              ) : (
                presentation.title
              )}
            </h2>
            {presentation.description ? (
              <p id="game-end-description" className="mx-auto mt-2 max-w-lg text-sm text-[#657597]">
                {presentation.description}
              </p>
            ) : null}
          </div>

          {featuredPlayer ? (
            <div className="mt-5 flex flex-col items-center text-center">
              <PlayerIdentityMark player={featuredPlayer} size="lg" />
              <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.025em] text-ink sm:text-3xl">
                {gamePlayerName(featuredPlayer)}
              </h3>
              <p className="mt-1 text-base font-semibold text-[#657597]">
                {featuredPlayer.profession?.name ?? "Профессия не выдана"}
              </p>
            </div>
          ) : null}

          {featuredState ? (
            <section className="mt-6" aria-labelledby="featured-financial-result">
              <h3 id="featured-financial-result" className="text-lg font-extrabold text-ink">
                {winner ? "Финансовый итог победителя" : "Ваш финансовый итог"}
              </h3>
              <GameEndFinancialMetrics state={featuredState} />
              <GameEndAssets assets={featuredPlayer?.assets ?? []} />
            </section>
          ) : null}

          {playerState && winnerState && !playerIsWinner ? (
            <section className="mt-6 rounded-xl bg-white p-4 shadow-[0_14px_36px_rgba(27,57,118,.09)]">
              <h3 className="font-extrabold text-ink">Ваш результат</h3>
              <ResultFinancialComparison state={playerState} showCash />
            </section>
          ) : null}
        </div>

        <div className="shrink-0 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_rgba(27,57,118,.10)] sm:px-6 sm:pb-5 sm:pt-4">
          <Button className="min-h-[52px] w-full" onClick={onClose}>
            {playerState ? "Посмотреть свои результаты" : "Закрыть"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ArchedVictoryTitle() {
  const letters = ["П", "о", "б", "е", "д", "а", "!"];
  const arc = [
    { y: 5, rotate: -7 },
    { y: 1, rotate: -4 },
    { y: -2, rotate: -2 },
    { y: -3, rotate: 0 },
    { y: -2, rotate: 2 },
    { y: 1, rotate: 4 },
    { y: 5, rotate: 7 }
  ];

  return (
    <span className="inline-flex min-h-12 items-start justify-center leading-none" aria-hidden="true">
      {letters.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="inline-block origin-bottom"
          style={{ transform: `translateY(${arc[index]?.y ?? 0}px) rotate(${arc[index]?.rotate ?? 0}deg)` }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

const gameEndIcons: Record<GameEndIcon, LucideIcon> = {
  "shield-check": ShieldCheck,
  hourglass: Hourglass,
  "user-x": UserX,
  "circle-off": CircleOff,
  "circle-alert": CircleAlert
};

const gameEndToneClasses: Record<GameEndTone, string> = {
  victory: "bg-[#fff0df] text-[#c0560c]",
  survival: "bg-[#edf6e9] text-[#3f5b35]",
  timeout: "bg-[#eaf0fd] text-[#1b3976]",
  danger: "bg-[#fff0eb] text-[#9d3c22]",
  neutral: "bg-[#eef1f6] text-[#52617e]"
};

function GameEndFinancialMetrics({ state }: { state: FinancialState }) {
  const metrics = [
    {
      label: "Пассивный доход",
      value: `${money(state.passiveIncomeCents)}/мес`,
      className: "bg-[#edf6e9] text-[#3f5b35]"
    },
    {
      label: "Расходы",
      value: `${money(state.totalExpensesCents)}/мес`,
      className: "bg-[#fff0eb] text-[#9d3c22]"
    },
    {
      label: "Осталось наличных",
      value: money(state.cashCents),
      className: "bg-[#eaf0fd] text-[#1b3976]"
    },
    {
      label: "Денежный поток",
      value: `${money(state.monthlyCashflowCents)}/мес`,
      className:
        state.monthlyCashflowCents >= 0
          ? "bg-[#e8f5ef] text-[#216547]"
          : "bg-[#fff0eb] text-[#9d3c22]"
    }
  ];

  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className={`min-w-0 rounded-xl p-3 sm:p-4 ${metric.className}`}>
          <dt className="text-xs font-bold leading-4 opacity-80">{metric.label}</dt>
          <dd className="mt-1 break-words text-base font-extrabold leading-5 sm:text-lg">
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function GameEndAssets({ assets }: { assets: GamePlayer["assets"] }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-extrabold text-ink">Активы</h3>
        <span className="text-sm font-bold text-[#657597]">
          {assets.length === 0 ? "Нет активов" : `${assets.length} шт.`}
        </span>
      </div>

      {assets.length === 0 ? (
        <p className="mt-2 rounded-xl bg-white px-4 py-3 text-sm text-[#657597]">
          К завершению партии активов не осталось.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[0_8px_22px_rgba(27,57,118,.07)]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef3e8] text-[#3f5b35]">
                <BriefcaseBusiness size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-ink" title={asset.name}>
                  {asset.name}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-[#657597]">
                  {asset.quantity > 1 ? `${asset.quantity} шт. · ` : ""}
                  {asset.cashflowCents === 0
                    ? "без денежного потока"
                    : `${money(asset.cashflowCents)}/мес`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function gameEndReasonText(reason: string | null) {
  return gameEndPresentation({ reason }).description;
}

function StockSalePanel({
  offer,
  quantity,
  onQuantityChange,
  onDecrease,
  onIncrease,
  decisionSubmission,
  onSell,
  onDecline
}: {
  offer: NonNullable<ReturnType<typeof stockSaleOfferForPlayer>>;
  quantity: StockSaleQuantity;
  onQuantityChange: (value: StockSaleQuantity) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  decisionSubmission: Extract<DecisionSubmission, "stock_sell" | "stock_decline"> | null;
  onSell: () => void;
  onDecline: () => void;
}) {
  const numericQuantity = quantity === "" ? 0 : quantity;
  const saleTotalCents = offer.salePriceCents * numericQuantity;
  const submitting = decisionSubmission !== null;
  const quantityControlClassName =
    "h-11 min-w-0 rounded-xl bg-white px-0 text-ink shadow-[0_6px_16px_rgba(27,57,118,.09)] hover:bg-[#fffdf9]";

  return (
    <section className="rounded-2xl bg-card p-3 shadow-[0_16px_36px_rgba(27,57,118,.10)] min-[420px]:p-4">
      <div>
        <h3 className="text-base font-extrabold text-ink">Продажа акций</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{localizeGameText(offer.title)}</p>
        <p className="mt-1 text-sm font-bold text-ink">
          Доступно акций: {offer.quantity}
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="stock-sale-quantity" className="text-sm font-extrabold text-ink">
          Количество на продажу
        </label>
        <div className="mt-2 grid grid-cols-[repeat(2,minmax(0,.7fr))_minmax(4rem,1.5fr)_repeat(3,minmax(0,.7fr))] items-center gap-1">
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={() => onQuantityChange(numericQuantity - 20)}
            disabled={submitting || numericQuantity <= 1}
            aria-label="Уменьшить количество на 20"
            title="Уменьшить на 20"
          >
            <ChevronsLeft size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={onDecrease}
            disabled={submitting || numericQuantity <= 1}
            aria-label="Уменьшить количество на 1"
            title="Уменьшить на 1"
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </Button>
          <Input
            id="stock-sale-quantity"
            type="number"
            min={1}
            max={offer.quantity}
            step={1}
            inputMode="numeric"
            value={quantity}
            onChange={(event) =>
              onQuantityChange(event.target.value === "" ? "" : Number(event.target.value))
            }
            disabled={submitting}
            className="h-11 px-1 text-center font-extrabold tabular-nums"
          />
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={onIncrease}
            disabled={submitting || numericQuantity >= offer.quantity}
            aria-label="Увеличить количество на 1"
            title="Увеличить на 1"
          >
            <ChevronRight size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={() => onQuantityChange(numericQuantity + 20)}
            disabled={submitting || numericQuantity >= offer.quantity}
            aria-label="Увеличить количество на 20"
            title="Увеличить на 20"
          >
            <ChevronsRight size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            className={quantityControlClassName}
            onClick={() => onQuantityChange(offer.quantity)}
            disabled={submitting || numericQuantity >= offer.quantity}
            aria-label="Выбрать максимальное количество акций"
            title="Выбрать максимум"
          >
            <ArrowRightToLine size={17} aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-muted">Сумма продажи</span>
          <strong className="text-base font-extrabold text-ink">
            {quantity === ""
              ? "Укажите количество"
              : `${quantity} x ${money(offer.salePriceCents)} = ${money(saleTotalCents)}`}
          </strong>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="action"
          onClick={onSell}
          disabled={submitting || quantity === ""}
          aria-busy={decisionSubmission === "stock_sell"}
        >
          {decisionSubmission === "stock_sell" ? "Продаём…" : "Продать"}
        </Button>
        <Button
          variant="ghost"
          className="bg-white text-ink shadow-[0_7px_18px_rgba(27,57,118,.09)] hover:bg-[#fffdf9]"
          onClick={onDecline}
          disabled={submitting}
          aria-busy={decisionSubmission === "stock_decline"}
        >
          {decisionSubmission === "stock_decline" ? "Отказываемся…" : "Не продавать"}
        </Button>
      </div>
    </section>
  );
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = diceDots[Math.min(Math.max(value, 1), 6)] ?? diceDots[6] ?? [];

  return (
    <div
      className={[
        "relative h-20 w-20 rounded-xl border-2 border-ink bg-white shadow-panel transition-transform",
        rolling ? "rotate-6 scale-105" : ""
      ].join(" ")}
      aria-label={`На кубике ${value}`}
    >
      {dots.map((position) => (
        <span
          key={position}
          className={[
            "absolute h-3 w-3 rounded-full bg-ink",
            diceDotClasses[position]
          ].join(" ")}
        />
      ))}
    </div>
  );
}

const diceDots: Record<number, Array<keyof typeof diceDotClasses>> = {
  1: ["center"],
  2: ["topLeft", "bottomRight"],
  3: ["topLeft", "center", "bottomRight"],
  4: ["topLeft", "topRight", "bottomLeft", "bottomRight"],
  5: ["topLeft", "topRight", "center", "bottomLeft", "bottomRight"],
  6: ["topLeft", "middleLeft", "bottomLeft", "topRight", "middleRight", "bottomRight"]
};

const diceDotClasses = {
  topLeft: "left-4 top-4",
  topRight: "right-4 top-4",
  middleLeft: "left-4 top-1/2 -translate-y-1/2",
  middleRight: "right-4 top-1/2 -translate-y-1/2",
  center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  bottomLeft: "bottom-4 left-4",
  bottomRight: "bottom-4 right-4"
};

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

function normalizeBoardPosition(position: number, boardSize: number) {
  if (boardSize <= 0) return 0;
  return ((position % boardSize) + boardSize) % boardSize;
}

function turnMoveDuration(steps: number) {
  return Math.min(1100, Math.max(420, 300 + steps * 110));
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
  canChangeParticipation,
  participates,
  changingParticipation,
  onChangeParticipation
}: {
  code: string;
  gameId: string;
  token: string;
  onAddUser: (body: { userId: string; role: string }) => void;
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
    const form = new FormData(event.currentTarget);
    const role = String(form.get("role") ?? "PLAYER");
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
              disabled={changingParticipation}
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
                defaultValue="PLAYER"
              >
                <option value="PLAYER">Игрок</option>
                <option value="BANKER">Банкир</option>
                <option value="OBSERVER">Наблюдатель</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
            </div>
            <Button type="submit" disabled={!selectedUser}>Добавить в игру</Button>
          </div>
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
  code,
  token,
  onAddUser,
  canChangeParticipation,
  participates,
  changingParticipation,
  onChangeParticipation,
  currentPlayer,
  onChooseFigurine
}: {
  snapshot: GameSnapshot;
  isSolo: boolean;
  canManage: boolean;
  canStart: boolean;
  startDisabledReason: string | null;
  onStartGame: () => void;
  code: string;
  token: string;
  onAddUser: (body: { userId: string; role: string }) => void;
  canChangeParticipation: boolean;
  participates: boolean;
  changingParticipation: boolean;
  onChangeParticipation: (participates: boolean) => void;
  currentPlayer: GamePlayer | undefined;
  onChooseFigurine: () => void;
}) {
  const players = snapshot.players.filter((player) => player.status === "JOINED");
  const gamePlayers = players.filter((player) => player.role === "PLAYER");
  const readyPlayers = gamePlayers.filter((player) => Boolean(player.figurine));
  const enoughPlayers = gamePlayers.length >= 2;
  const figurinesReady = gamePlayers.length > 0 && readyPlayers.length === gamePlayers.length;
  const completedChecks =
    Number(enoughPlayers) + Number(figurinesReady) + Number(canManage);

  return (
    <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-panel sm:p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
              {isSolo ? "Ваши виртуальные соперники готовы" : "Соберите команду"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {isSolo
                ? "Проверьте состав партии и выберите свою фигурку. Вы сделаете первый ход."
                : "Участники появятся здесь после входа по коду. Перед стартом каждому игроку нужна своя фигурка."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#e8effe] px-3 py-2 text-sm font-extrabold text-journey">
            <UsersRound size={16} aria-hidden="true" />
            {isSolo && snapshot.game.maxPlayers
              ? `${gamePlayers.length}/${snapshot.game.maxPlayers} игроков`
              : `${gamePlayers.length} игроков`}
          </span>
        </div>

        {players.length > 0 ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => {
              const isPlayer = player.role === "PLAYER";
              const ready = !isPlayer || Boolean(player.figurine);
              return (
                <div key={player.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-card p-3">
                  <PlayerToken player={player} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold">
                      {player.controller === "BOT"
                        ? `${gamePlayerName(player)} · бот`
                        : player.user?.displayName ?? player.guestName ?? gameRoles[player.role] ?? "Участник"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {gameRoles[player.role] ?? "Участник"}
                      {player.seat ? ` · место ${player.seat}` : ""}
                    </div>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                      ready ? "bg-[#eaf3e0] text-success" : "bg-[#fff0df] text-[#8a3d0a]"
                    ].join(" ")}
                  >
                    {ready ? "Готов" : "Без фигурки"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-card p-5 text-sm text-muted">
            В комнате пока никого нет. Отправьте участникам код {snapshot.game.code}.
          </div>
        )}
        {currentPlayer ? (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-card p-4 text-sm min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="min-w-0">
              <div className="font-extrabold text-ink">
                {currentPlayer.figurine ? "Ваша фигурка выбрана" : "Выберите свою фигурку"}
              </div>
              <p className="mt-1 text-xs text-muted">
                {gamePlayers.length - readyPlayers.length > 0
                  ? `Без фигурки: ${gamePlayers.length - readyPlayers.length}`
                  : "Все игроки выбрали фигурки."}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full shrink-0 px-3 text-xs min-[420px]:w-auto"
              onClick={onChooseFigurine}
            >
              {currentPlayer.figurine ? "Сменить фигурку" : "Выбрать фигурку"}
            </Button>
          </div>
        ) : null}
        {canManage && !isSolo ? (
          <HostPanel
            code={code}
            gameId={snapshot.game.id}
            token={token}
            onAddUser={onAddUser}
            canChangeParticipation={canChangeParticipation}
            participates={participates}
            changingParticipation={changingParticipation}
            onChangeParticipation={onChangeParticipation}
          />
        ) : null}
      </div>

      <aside className="rounded-xl bg-card p-4 text-ink sm:p-5">
        <h2 className="text-lg font-extrabold">Готовность к старту</h2>
        <div className="mt-4 space-y-3">
          <LobbyCheck
            complete={enoughPlayers}
            label={enoughPlayers ? "Игроков достаточно" : "Нужно минимум два игрока"}
          />
          <LobbyCheck
            complete={figurinesReady}
            label={figurinesReady ? "Фигурки выбраны" : `Фигурки: ${readyPlayers.length}/${gamePlayers.length}`}
          />
          <LobbyCheck
            complete={canManage}
            label={canManage ? "Вы можете запустить партию" : "Старт запустит ведущий"}
          />
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dce4ef]">
          <div
            className="h-full rounded-full bg-action transition-[width] duration-300"
            style={{ width: `${Math.round((completedChecks / 3) * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          {canStart && !startDisabledReason
            ? "Все условия выполнены — можно начинать."
            : startDisabledReason ?? "Ожидаем действия ведущего."}
        </p>
        {canManage ? (
          <Button
            className="mt-4 w-full"
            variant="action"
            onClick={onStartGame}
            disabled={!canStart || Boolean(startDisabledReason)}
          >
            Начать партию
          </Button>
        ) : null}
      </aside>
    </section>
  );
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

function DesktopGameBoard({
  snapshot,
  selectedPlayer,
  players,
  canManageLiabilities,
  onCloseLiability,
  canOpenBank,
  onOpenBank,
  outsidePlayers,
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
  children: ReactNode;
}) {
  return (
    <section className="desktop-game-board-shell w-full rounded-2xl bg-card p-3 shadow-panel">
      <div className="desktop-game-board-grid grid justify-center gap-2 overflow-x-auto">
        {snapshot.board.map((cell) => {
          const players = cellPlayers(snapshot, cell.index);
          return (
            <BoardCellTile
              key={cell.index}
              cell={cell}
              players={players}
              style={ringCellStyle(cell.index)}
              compact
            />
          );
        })}

        <div
          className="grid min-h-0 grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] gap-3 rounded-xl bg-surface p-3"
          style={{ gridColumn: "2 / 8", gridRow: "2 / 6" }}
        >
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
      </div>
    </section>
  );
}

type DesktopFinancialTab = "player" | "assets" | "expenses" | "liabilities";

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
  const [activeTab, setActiveTab] = useState<DesktopFinancialTab>("player");
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
  const tabs: Array<{
    id: DesktopFinancialTab;
    label: string;
    icon: ReactNode;
    count?: number;
  }> = [
    { id: "player", label: "Игрок", icon: <UserRound size={15} /> },
    { id: "assets", label: "Активы", icon: <BriefcaseBusiness size={15} />, count: player.assets.length },
    { id: "expenses", label: "Расходы", icon: <ReceiptText size={15} /> },
    { id: "liabilities", label: "Долги", icon: <Landmark size={15} />, count: liabilities.length }
  ];

  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-xl bg-white shadow-panel">
      <div
        className="grid grid-cols-4 gap-1.5 bg-[#eef3e8] p-2"
        role="tablist"
        aria-label="Информация об игроке"
      >
        {tabs.map((tab, index) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`desktop-game-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="desktop-game-tab-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let nextIndex = index;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
                if (event.key === "ArrowLeft") {
                  nextIndex = (index - 1 + tabs.length) % tabs.length;
                }
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = tabs.length - 1;
                if (nextIndex === index) return;

                event.preventDefault();
                const nextTab = tabs[nextIndex];
                if (!nextTab) return;
                setActiveTab(nextTab.id);
                document.getElementById(`desktop-game-tab-${nextTab.id}`)?.focus();
              }}
              className={[
                "relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-1 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718866]",
                active
                  ? "bg-[#dfe9d4] text-[#3f5b35]"
                  : "bg-transparent text-[#61715b] hover:bg-white/70 hover:text-[#3f5b35]"
              ].join(" ")}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span className="w-full truncate text-center">{tab.label}</span>
              {tab.count !== undefined ? (
                <span
                  className={[
                    "absolute right-1 top-1 inline-flex min-w-4 justify-center rounded-full px-1 text-[8px] leading-4",
                    active ? "bg-[#718866] text-white" : "bg-white text-[#61715b]"
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id="desktop-game-tab-panel"
        role="tabpanel"
        aria-labelledby={`desktop-game-tab-${activeTab}`}
        className="min-h-0 overflow-y-auto p-3"
      >
        {activeTab === "player" ? (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <PlayerIdentityMark player={player} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">
                      {gamePlayerName(player)}
                    </h2>
                    <ChildrenMarks count={state.childrenCount} />
                  </div>
                  <div className="mt-1 truncate text-sm text-neutral-500">
                    {player.profession?.name}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                className="h-9 shrink-0 gap-2 px-3 text-xs"
                onClick={onOpenBank}
                disabled={!canOpenBank}
              >
                <Landmark size={15} aria-hidden="true" />
                Банк
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              <Metric label="Наличные" value={money(state.cashCents)} />
              <Metric label="Зарплата" value={money(state.salaryCents)} />
              <Metric label="Денежный поток" value={money(state.monthlyCashflowCents)} />
              <Metric label="Пассивный доход" value={money(state.passiveIncomeCents)} />
              <Metric label="Расходы" value={money(state.totalExpensesCents)} />
            </div>
            <FinancialFreedomProgress
              className="mt-3"
              passiveIncomeCents={state.passiveIncomeCents}
              totalExpensesCents={state.totalExpensesCents}
            />
            <CashflowEquation className="mt-3" state={state} />
            {outsidePlayers.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>Вне поля</span>
                {outsidePlayers.map((outsidePlayer) => (
                  <PlayerToken key={outsidePlayer.id} player={outsidePlayer} />
                ))}
              </div>
            ) : null}
            <OtherPlayersList
              className="mt-4 border-t border-line/70 pt-4"
              players={players.filter((otherPlayer) => otherPlayer.id !== player.id)}
              currentPlayerId={currentPlayerId}
            />
          </div>
        ) : null}

        {activeTab === "assets" ? <CompactAssets assets={player.assets} /> : null}

        {activeTab === "expenses" ? (
          <div className="space-y-4">
            <ExpenseComposition player={player} />
            <SectionList
              title={money(state.totalExpensesCents)}
              titleAlign="right"
              rows={expenseRows(player)}
            />
          </div>
        ) : null}

        {activeTab === "liabilities" ? (
          <CreditList
            liabilities={liabilities}
            currentCashCents={state.cashCents}
            monthlyIncomeCents={state.totalIncomeCents}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
          />
        ) : null}
      </div>
    </div>
  );
}

function CompactAssets({ assets }: { assets: GamePlayer["assets"] }) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Активов пока нет, но амбиции уже на балансе!
      </p>
    );
  }

  const maxAbsCashflowCents = Math.max(
    1,
    ...assets.map((asset) => Math.abs(asset.cashflowCents))
  );

  return (
    <div className="space-y-2">
      <PortfolioSummary assets={assets} />
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          maxAbsCashflowCents={maxAbsCashflowCents}
        />
      ))}
    </div>
  );
}

const portfolioSegmentClasses: Record<string, string> = {
  stocks: "bg-[#7b9cc6]",
  real_estate: "bg-[#73a865]",
  business: "bg-[#9d82b8]",
  other: "bg-[#b99c5d]"
};

const portfolioCategoryLabels: Record<string, string> = {
  stocks: "Акции",
  real_estate: "Недвижимость",
  business: "Бизнес",
  other: "Другие активы"
};

function PortfolioSummary({ assets }: { assets: GamePlayer["assets"] }) {
  const totalCostCents = assets.reduce((sum, asset) => sum + asset.costBasisCents, 0);
  const totalMarketCents = assets.reduce((sum, asset) => sum + asset.marketValueCents, 0);
  const totalCashflowCents = assets.reduce((sum, asset) => sum + asset.cashflowCents, 0);
  const resultCents = totalMarketCents - totalCostCents;
  const grouped = Array.from(
    assets.reduce((items, asset) => {
      const category = assetPortfolioCategory(asset);
      items.set(
        category,
        (items.get(category) ?? 0) +
          Math.max(0, asset.marketValueCents || asset.costBasisCents)
      );
      return items;
    }, new Map<string, number>())
  ).filter(([, value]) => value > 0);
  const compositionTotal = grouped.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="text-sm font-semibold">Портфель</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric className="bg-white" label="Вложено" value={money(totalCostCents)} />
        <Metric className="bg-white" label="Текущая стоимость" value={money(totalMarketCents)} />
        <Metric
          className="bg-white"
          label={resultCents >= 0 ? "Прибыль" : "Убыток"}
          value={money(Math.abs(resultCents))}
        />
        <Metric
          className="bg-white"
          label="Денежный поток активов"
          value={`${money(totalCashflowCents)}/мес`}
        />
      </div>
      {compositionTotal > 0 ? (
        <>
          <div
            className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-200"
            role="img"
            aria-label="Распределение стоимости портфеля по типам активов"
          >
            {grouped.map(([category, value]) => (
              <div
                key={category}
                className={portfolioSegmentClasses[category] ?? "bg-neutral-400"}
                style={{ width: `${(value / compositionTotal) * 100}%` }}
                title={`${portfolioCategoryLabels[category] ?? "Другие активы"}: ${money(value)}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {grouped.map(([category, value]) => (
              <div key={category} className="inline-flex items-center gap-1.5 text-xs">
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${portfolioSegmentClasses[category] ?? "bg-neutral-400"}`}
                  aria-hidden="true"
                />
                <span className="text-neutral-600">
                  {portfolioCategoryLabels[category] ?? "Другие активы"}
                </span>
                <strong>{Math.round((value / compositionTotal) * 100)}%</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function assetPortfolioCategory(asset: GamePlayer["assets"][number]) {
  if (isStockAsset(asset)) return "stocks";
  const type = asset.type.toLowerCase();
  if (type.includes("realestate") || type.includes("real_estate")) {
    return "real_estate";
  }
  if (type.includes("network") || type.includes("business")) return "business";
  return "other";
}

function MobileBoard({
  snapshot,
  selectedPlayer,
  containerRef
}: {
  snapshot: GameSnapshot;
  selectedPlayer: GamePlayer | undefined;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestOtherMove = latestPlayerMoveEvent(snapshot.events, selectedPlayer?.id);
  const lastAnimatedMoveSequenceRef = useRef(latestOtherMove?.sequence ?? 0);
  const moveAnimationRunRef = useRef(0);
  const [animatedOtherPlayer, setAnimatedOtherPlayer] = useState<{
    playerId: string;
    position: number;
  } | null>(null);
  const targetCellIndex =
    selectedPlayer?.track === "RAT_RACE" && selectedPlayer.position >= 0
      ? selectedPlayer.position
      : 0;
  useEffect(() => {
    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-board-cell="${targetCellIndex}"]`
    );
    target?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth"
    });
  }, [snapshot.game.id, targetCellIndex]);

  useEffect(() => {
    if (!latestOtherMove || latestOtherMove.sequence <= lastAnimatedMoveSequenceRef.current) {
      return;
    }

    lastAnimatedMoveSequenceRef.current = latestOtherMove.sequence;
    const animationRun = moveAnimationRunRef.current + 1;
    moveAnimationRunRef.current = animationRun;
    const playerId = latestOtherMove.gamePlayer?.id;
    const from = Number(latestOtherMove.payload.from);
    const to = Number(latestOtherMove.payload.to);
    const steps = Number(latestOtherMove.payload.steps);
    if (
      !playerId ||
      ![from, to, steps].every(Number.isFinite) ||
      steps < 0 ||
      snapshot.board.length === 0
    ) {
      return;
    }

    const animateMove = async () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        setAnimatedOtherPlayer({ playerId, position: to });
        await wait(120);
      } else {
        for (let step = 1; step <= steps; step += 1) {
          if (moveAnimationRunRef.current !== animationRun) return;
          setAnimatedOtherPlayer({
            playerId,
            position: normalizeBoardPosition(from + step, snapshot.board.length)
          });
          await wait(180);
        }
      }

      if (moveAnimationRunRef.current === animationRun) {
        setAnimatedOtherPlayer(null);
      }
    };

    void animateMove();
    return () => {
      if (moveAnimationRunRef.current === animationRun) {
        moveAnimationRunRef.current += 1;
      }
    };
  }, [latestOtherMove?.sequence, snapshot.board.length]);

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full">
      <div className="min-w-0 max-w-full overflow-hidden rounded-xl bg-card/60">
        <div
          ref={scrollRef}
          className="grid w-full min-w-0 max-w-full touch-pan-x snap-x snap-mandatory grid-flow-col auto-cols-[46px] overflow-x-auto overscroll-x-contain scroll-smooth px-[calc(50%_-_23px)] pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Малый круг"
        >
          {snapshot.board.map((cell) => {
            const players = timelineCellPlayers(snapshot, cell.index, animatedOtherPlayer);
            const appearance = boardCellAppearances[cell.type] ?? defaultBoardCellAppearance;
            return (
              <div
                key={cell.index}
                data-board-cell={cell.index}
                className="relative min-w-0 snap-center text-center"
                aria-label={`Клетка ${cell.index + 1}: ${localizeGameText(cell.label)}`}
              >
                <div
                  className={[
                    "text-[10px] font-semibold",
                    cell.index === targetCellIndex ? "text-success" : "text-neutral-500"
                  ].join(" ")}
                >
                  {cell.index + 1}
                </div>
                <div className="relative mt-1 h-3">
                  <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line" />
                  <span
                    className={[
                      "absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm",
                      appearance.timelineMarker,
                      cell.index === targetCellIndex
                        ? "scale-125 ring-2 ring-success ring-offset-1"
                        : ""
                    ].join(" ")}
                  />
                </div>
                <div className="mt-1 h-9">
                  <PlayerTokenStack
                    players={players}
                    small
                    mobileBoard
                    movingPlayerId={animatedOtherPlayer?.playerId ?? null}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BoardCellTile({
  cell,
  players,
  style,
  compact = false,
  mobile = false,
  active = false
}: {
  cell: GameSnapshot["board"][number];
  players: GamePlayer[];
  style?: CSSProperties;
  compact?: boolean;
  mobile?: boolean;
  active?: boolean;
}) {
  const appearance = boardCellAppearances[cell.type] ?? defaultBoardCellAppearance;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-md border",
        appearance.tile,
        compact
          ? "h-full min-h-0 w-full min-w-0 p-3"
          : mobile
            ? "h-24 w-full p-2"
            : "min-h-24 aspect-square p-3",
        active ? "ring-2 ring-success ring-offset-2 ring-offset-white" : ""
      ].join(" ")}
      style={style}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1.5 ${appearance.marker}`}
      />
      <div
        className="flex items-center justify-start gap-2 pt-1"
      >
        <span
          className={[
            "shrink-0",
            compact || mobile
              ? "text-lg font-bold text-neutral-700"
              : "text-xs font-semibold text-neutral-600"
          ].join(" ")}
        >
          {cell.index + 1}
        </span>
        <Badge
          className={[
            "min-w-0 justify-start bg-transparent text-left font-semibold text-ink",
            compact ? "max-w-[7rem] px-2 text-[11px]" : "",
            mobile
              ? "max-w-full flex-1 px-1 py-1 text-[10px] [overflow-wrap:anywhere]"
              : ""
          ].join(" ")}
        >
          {cell.type === "charity" ? (
            <span className="inline-block leading-tight">
              Благотвори-
              <br />
              тельность
            </span>
          ) : (
            <span className="inline-block leading-tight">
              {cellTypes[cell.type] ??
                (cell.label ? localizeGameText(cell.label) : "Игровая клетка")}
            </span>
          )}
        </Badge>
      </div>
      <div className="absolute bottom-2 left-2 right-2 h-12">
        <PlayerTokenStack players={players} desktopBoard={compact} />
      </div>
    </div>
  );
}

function PlayerTokenStack({
  players,
  small = false,
  desktopBoard = false,
  mobileBoard = false,
  movingPlayerId = null
}: {
  players: GamePlayer[];
  small?: boolean;
  desktopBoard?: boolean;
  mobileBoard?: boolean;
  movingPlayerId?: string | null;
}) {
  const overlapClass = desktopBoard ? "-ml-7" : mobileBoard ? "-ml-5" : "-ml-3";

  return (
    <div
      className={cn(
        "flex h-full min-w-0 items-end isolate",
        desktopBoard ? "justify-start" : "justify-center"
      )}
    >
      {players.map((player, index) => (
        <span
          key={player.id}
          className={cn("relative shrink-0", index > 0 && overlapClass)}
          style={{ zIndex: index + 1 }}
        >
          <PlayerToken
            player={player}
            small={small}
            desktopBoard={desktopBoard}
            mobileBoard={mobileBoard}
            moving={player.id === movingPlayerId}
          />
        </span>
      ))}
    </div>
  );
}

function PlayerToken({
  player,
  small = false,
  moving = false,
  desktopBoard = false,
  mobileBoard = false
}: {
  player: GamePlayer;
  small?: boolean;
  moving?: boolean;
  desktopBoard?: boolean;
  mobileBoard?: boolean;
}) {
  const title = gamePlayerName(player);
  if (player.figurine) {
    return (
      <span
        className={[
          "inline-flex shrink-0",
          desktopBoard
            ? "h-12 w-12"
            : mobileBoard
              ? "h-9 w-9"
              : small
                ? "h-7 w-7"
                : "h-10 w-10",
          moving ? "timeline-moving-token" : ""
        ].join(" ")}
        title={title}
      >
        <img
          src={figurineImagePath(player.figurine)}
          alt=""
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={[
        "rounded text-center font-semibold text-white",
        small ? "h-4 min-w-4 px-0.5 text-[9px] leading-4" : "h-5 min-w-5 px-1 text-xs",
        moving ? "timeline-moving-token" : ""
      ].join(" ")}
      style={{ backgroundColor: player.color ?? "#171717" }}
      title={title}
    >
      {player.seat}
    </span>
  );
}

function PlayerIdentityMark({
  player,
  size = "md"
}: {
  player: GamePlayer;
  size?: "sm" | "md" | "lg";
}) {
  const name = gamePlayerName(player);
  const figurine = player.figurine ?? player.user?.figurine;
  const avatarUrl = player.user?.avatarUrl;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const sizeClass = figurine
    ? size === "lg"
      ? "h-24 w-24"
      : size === "sm"
        ? "h-10 w-10"
        : "h-12 w-12"
    : size === "lg"
      ? "h-20 w-20 text-xl"
      : size === "sm"
        ? "h-9 w-9 text-xs"
        : "h-11 w-11 text-sm";

  return (
    <span
      className={[
        "grid shrink-0 place-items-center",
        figurine
          ? ""
          : "overflow-hidden rounded-full bg-journey font-extrabold text-white shadow-[0_5px_14px_rgba(27,57,118,.18)]",
        sizeClass
      ].join(" ")}
      title={name}
    >
      {figurine ? (
        <img src={figurineImagePath(figurine)} alt="" className="h-full w-full object-contain" />
      ) : avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
      <span className="sr-only">Игрок {name}</span>
    </span>
  );
}

function FigurineDialog({
  open,
  value,
  taken,
  saving,
  canClose,
  onChange,
  onConfirm,
  onClose
}: {
  open: boolean;
  value: string | null;
  taken: string[];
  saving: boolean;
  canClose: boolean;
  onChange: (figurine: FigurineId) => void;
  onConfirm: () => void;
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
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!value || saving || taken.includes(value)}
          >
            {saving ? "Сохраняем…" : "Выбрать"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function timelineCellPlayers(
  snapshot: GameSnapshot,
  cellIndex: number,
  animatedPlayer: { playerId: string; position: number } | null
) {
  if (!animatedPlayer) return cellPlayers(snapshot, cellIndex);

  const players = cellPlayers(snapshot, cellIndex).filter(
    (player) => player.id !== animatedPlayer.playerId
  );
  const movingPlayer = snapshot.players.find((player) => player.id === animatedPlayer.playerId);
  if (movingPlayer && cellIndex === animatedPlayer.position) players.push(movingPlayer);
  return players;
}

function latestPlayerMoveEvent(events: GameEvent[], excludedPlayerId: string | undefined) {
  return [...events]
    .reverse()
    .find(
      (event) =>
        event.type === realtimeEvents.playerMove &&
        Boolean(event.gamePlayer?.id) &&
        event.gamePlayer?.id !== excludedPlayerId
    );
}

function cellPlayers(snapshot: GameSnapshot, cellIndex: number) {
  return snapshot.players.filter(
    (player) =>
      player.role === "PLAYER" &&
      player.track === "RAT_RACE" &&
      player.position === cellIndex
  );
}

function ringCellStyle(index: number): CSSProperties {
  const number = index + 1;
  if (number <= 8) return { gridColumn: number, gridRow: 1 };
  if (number <= 12) return { gridColumn: 8, gridRow: number - 7 };
  if (number <= 20) return { gridColumn: 21 - number, gridRow: 6 };
  if (number <= 24) return { gridColumn: 1, gridRow: 26 - number };
  return {};
}

function OtherPlayersList({
  players,
  currentPlayerId,
  className = ""
}: {
  players: GamePlayer[];
  currentPlayerId: string | null;
  className?: string;
}) {
  return (
    <section className={className} aria-label="Остальные игроки">
      <h3 className="text-sm font-semibold">Остальные игроки</h3>
      {players.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Других игроков пока нет.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {players.map((otherPlayer) => {
            const state = otherPlayer.financialState;
            const trackLabel =
              otherPlayer.track === "FAST_TRACK" ? "Быстрый круг" : "Крысиные бега";

            return (
              <li key={otherPlayer.id} className="rounded-md bg-surface p-3">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
                  <PlayerIdentityMark player={otherPlayer} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {gamePlayerName(otherPlayer)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-500">
                      {otherPlayer.profession?.name ?? "Профессия не выдана"}
                    </div>
                  </div>
                  {currentPlayerId === otherPlayer.id ? (
                    <Badge className="bg-green-100 text-success">ходит</Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-neutral-500">
                  {otherPlayer.seat ? <span>Место {otherPlayer.seat}</span> : null}
                  <span>{trackLabel}</span>
                  {state ? <span>Поток {money(state.monthlyCashflowCents)}/мес</span> : null}
                </div>
                {state ? (
                  <PlayerFreedomMini
                    passiveIncomeCents={state.passiveIncomeCents}
                    totalExpensesCents={state.totalExpensesCents}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
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

type MobileGameTab = "turn" | "player" | "assets" | "expenses" | "liabilities";

function MobileGameTabs({
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
  const [activeTab, setActiveTab] = useState<MobileGameTab>("turn");
  const state = player?.financialState;
  const assetCount = player?.assets.length ?? 0;
  const liabilities = player ? repayableLiabilityRows(player) : [];
  const actionAttention = Boolean(actionAttentionKey);

  useLayoutEffect(() => {
    if (actionAttentionKey) setActiveTab("turn");
  }, [actionAttentionKey]);

  useLayoutEffect(() => {
    if (turnTabRequest > 0) setActiveTab("turn");
  }, [turnTabRequest]);

  const tabs: Array<{
    id: MobileGameTab;
    label: string;
    icon: ReactNode;
    count?: number;
    attention?: boolean;
  }> = [
    { id: "turn", label: "Ход", icon: <Dices size={17} />, attention: actionAttention },
    { id: "player", label: "Игрок", icon: <UserRound size={17} /> },
    { id: "assets", label: "Активы", icon: <BriefcaseBusiness size={17} />, count: assetCount },
    { id: "expenses", label: "Расходы", icon: <ReceiptText size={17} /> },
    { id: "liabilities", label: "Долги", icon: <Landmark size={17} />, count: liabilities.length }
  ];

  return (
    <Card className="w-full min-w-0 max-w-full rounded-2xl border-0">
      <div
        className="grid min-w-0 grid-cols-5 gap-1.5 bg-[#eef3e8] p-2"
        role="tablist"
        aria-label="Информация об игроке"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={`mobile-game-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="mobile-game-tab-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let nextIndex = index;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = tabs.length - 1;
                if (nextIndex === index) return;

                event.preventDefault();
                const nextTab = tabs[nextIndex];
                if (!nextTab) return;
                setActiveTab(nextTab.id);
                document.getElementById(`mobile-game-tab-${nextTab.id}`)?.focus();
              }}
              className={[
                "relative flex h-14 min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-0.5 text-[9px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718866] min-[360px]:text-[10px]",
                active
                  ? "bg-[#dfe9d4] text-[#3f5b35]"
                  : "bg-transparent text-[#61715b] hover:bg-white/70 hover:text-[#3f5b35]"
              ].join(" ")}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span className="w-full truncate text-center">{tab.label}</span>
              {tab.count !== undefined ? (
                <span
                  className={[
                    "absolute right-1 top-1 inline-flex min-w-4 justify-center rounded-full px-1 text-[8px] leading-4",
                    active ? "bg-[#718866] text-white" : "bg-white text-[#61715b]"
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              ) : null}
              {tab.attention ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#9d82b8] ring-2 ring-white"
                  aria-label="Требуется действие"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id="mobile-game-tab-panel"
        role="tabpanel"
        aria-labelledby={`mobile-game-tab-${activeTab}`}
        className="min-w-0 max-w-full overflow-x-hidden p-3 min-[420px]:p-4"
      >
        <div className={activeTab === "turn" ? "block" : "hidden"} aria-hidden={activeTab !== "turn"}>
          {actions}
        </div>

        {activeTab !== "turn" && (!player || !state) ? (
          <p className="py-2 text-sm text-neutral-600">
            Финансовый отчёт появится после старта партии.
          </p>
        ) : null}

        {activeTab === "player" && player && state ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <PlayerIdentityMark player={player} size="sm" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate text-sm font-semibold">
                      {gamePlayerName(player)}
                    </div>
                    <ChildrenMarks count={state.childrenCount} size="sm" />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-neutral-500">
                    {player.profession?.name}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                className="h-9 shrink-0 gap-2 px-3 text-xs"
                onClick={onOpenBank}
                disabled={!canOpenBank}
              >
                <Landmark size={15} aria-hidden="true" />
                Банк
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <Metric label="Наличные" value={money(state.cashCents)} />
              <Metric label="Денежный поток" value={money(state.monthlyCashflowCents)} />
              <Metric label="Зарплата" value={money(state.salaryCents)} />
              <Metric label="Пассивный доход" value={money(state.passiveIncomeCents)} />
              <div className="min-[360px]:col-span-2">
                <Metric label="Расходы" value={money(state.totalExpensesCents)} />
              </div>
            </div>
            <FinancialFreedomProgress
              passiveIncomeCents={state.passiveIncomeCents}
              totalExpensesCents={state.totalExpensesCents}
            />
            <CashflowEquation state={state} />
            <OtherPlayersList
              className="border-t border-line/70 pt-3"
              players={players.filter((otherPlayer) => otherPlayer.id !== player.id)}
              currentPlayerId={currentPlayerId}
            />
          </div>
        ) : null}

        {activeTab === "assets" && player && state ? (
          <CompactAssets assets={player.assets} />
        ) : null}

        {activeTab === "expenses" && player && state ? (
          <div className="space-y-4">
            <ExpenseComposition player={player} />
            <SectionList
              title={money(state.totalExpensesCents)}
              titleAlign="right"
              rows={expenseRows(player)}
            />
          </div>
        ) : null}

        {activeTab === "liabilities" && player && state ? (
          <CreditList
            liabilities={liabilities}
            currentCashCents={state.cashCents}
            monthlyIncomeCents={state.totalIncomeCents}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
          />
        ) : null}
      </div>
    </Card>
  );
}

function AssetCard({
  asset,
  maxAbsCashflowCents
}: {
  asset: GamePlayer["assets"][number];
  maxAbsCashflowCents: number;
}) {
  const stock = isStockAsset(asset);

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{localizeGameText(asset.name)}</div>
          {asset.symbol ? (
            <div className="mt-1 text-xs text-neutral-500">{asset.symbol}</div>
          ) : null}
        </div>
        <Badge className="shrink-0 bg-white text-ink">{assetTypeLabel(asset)}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {stock ? (
          <>
            <AssetInfoRow label="Количество" value={`${asset.quantity} шт.`} />
            <AssetInfoRow label="Стоимость за единицу" value={money(assetUnitCostCents(asset))} />
          </>
        ) : asset.quantity > 1 ? (
          <AssetInfoRow label="Количество" value={String(asset.quantity)} />
        ) : null}
        <AssetInfoRow label="Стоимость" value={money(asset.costBasisCents)} />
        <AssetInfoRow label="Денежный поток" value={`${money(asset.cashflowCents)}/мес`} />
      </div>
      <AssetCashflowBar
        cashflowCents={asset.cashflowCents}
        maxAbsCashflowCents={maxAbsCashflowCents}
      />
    </div>
  );
}

function AssetCashflowBar({
  cashflowCents,
  maxAbsCashflowCents
}: {
  cashflowCents: number;
  maxAbsCashflowCents: number;
}) {
  if (cashflowCents === 0) {
    return (
      <div className="mt-3 inline-flex rounded-full bg-neutral-200 px-2 py-1 text-xs text-neutral-600">
        Без ежемесячного денежного потока
      </div>
    );
  }

  const positive = cashflowCents > 0;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={positive ? "text-success" : "text-red-700"}>
          {positive ? "Вклад в денежный поток" : "Снижение денежного потока"}
        </span>
        <strong>{money(cashflowCents)}/мес</strong>
      </div>
      <ProgressBar
        className="mt-1.5"
        value={Math.abs(cashflowCents)}
        max={Math.max(1, maxAbsCashflowCents)}
        label={`${positive ? "Вклад" : "Снижение"} денежного потока ${money(Math.abs(cashflowCents))} в месяц`}
        tone={positive ? "success" : "danger"}
      />
    </div>
  );
}

function AssetInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span className="shrink-0 font-semibold">{value}</span>
    </div>
  );
}

function isStockAsset(asset: GamePlayer["assets"][number]) {
  const type = asset.type.toLowerCase();
  const name = asset.name.toLowerCase();
  return Boolean(asset.symbol) || type.includes("stock") || type.includes("share") || /акци/.test(name);
}

function assetTypeLabel(asset: GamePlayer["assets"][number]) {
  if (isStockAsset(asset)) return "Акции";

  const type = asset.type.toLowerCase();
  if (type.includes("realestate") || type.includes("real_estate")) return "Недвижимость";
  if (type.includes("network")) return "Бизнес";
  return "Актив";
}

function assetUnitCostCents(asset: GamePlayer["assets"][number]) {
  return asset.quantity > 0 ? Math.round(asset.costBasisCents / asset.quantity) : 0;
}

function LoanPanel({
  loanAmount,
  currentCashCents,
  currentMonthlyCashflowCents,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan
}: {
  loanAmount: number;
  currentCashCents: number;
  currentMonthlyCashflowCents: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="text-sm font-medium">Взять кредит</div>
      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="secondary"
          className="px-3"
          onClick={onLoanDecrease}
          disabled={!canTakeLoan || loanAmount <= 1000}
        >
          &lt;
        </Button>
        <Input
          type="number"
          min={1000}
          step={1000}
          value={loanAmount}
          onChange={(event) => onLoanAmountChange(Number(event.target.value))}
          disabled={!canTakeLoan}
          className="text-center font-semibold"
        />
        <Button
          variant="secondary"
          className="px-3"
          onClick={onLoanIncrease}
          disabled={!canTakeLoan}
        >
          &gt;
        </Button>
      </div>
      <LoanPreview
        loanAmountCents={loanAmount}
        currentCashCents={currentCashCents}
        currentMonthlyCashflowCents={currentMonthlyCashflowCents}
      />
      <Button className="mt-3 w-full" variant="secondary" onClick={onTakeLoan} disabled={!canTakeLoan}>
        Взять кредит
      </Button>
      <p className="mt-2 text-xs text-neutral-500">
        Доступен во время активной партии. Сумма должна быть кратна{" "}
        <strong>{money(1000)}</strong>.
      </p>
    </div>
  );
}

function BankDialog({
  open,
  loanAmount,
  currentCashCents,
  currentMonthlyCashflowCents,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan,
  onClose
}: {
  open: boolean;
  loanAmount: number;
  currentCashCents: number;
  currentMonthlyCashflowCents: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => Promise<void>;
  canTakeLoan: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="bank-dialog-overlay fixed inset-0 z-[80] bg-[#07152d]/60 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-dialog-title"
        aria-describedby="bank-dialog-description"
        className="bank-dialog-panel flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-[0_34px_90px_rgba(5,18,45,.35)]"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
            ) ?? []
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div>
            <h2 id="bank-dialog-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">
              Банк
            </h2>
            <p id="bank-dialog-description" className="mt-1 text-sm leading-5 text-muted">
              Выберите сумму кредита и проверьте, как изменится финансовый отчёт.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Закрыть банк"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-muted shadow-[0_5px_14px_rgba(27,57,118,.10)] transition hover:-translate-y-0.5 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="bank-dialog-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
          <LoanPanel
            loanAmount={loanAmount}
            currentCashCents={currentCashCents}
            currentMonthlyCashflowCents={currentMonthlyCashflowCents}
            onLoanDecrease={onLoanDecrease}
            onLoanIncrease={onLoanIncrease}
            onLoanAmountChange={onLoanAmountChange}
            onTakeLoan={() => void onTakeLoan()}
            canTakeLoan={canTakeLoan}
          />
        </div>
      </div>
    </div>
  );
}

function LoanPreview({
  loanAmountCents,
  currentCashCents,
  currentMonthlyCashflowCents
}: {
  loanAmountCents: number;
  currentCashCents: number;
  currentMonthlyCashflowCents: number;
}) {
  const paymentCents = Math.floor(loanAmountCents / 10);
  const cashAfterCents = currentCashCents + loanAmountCents;
  const cashflowAfterCents = currentMonthlyCashflowCents - paymentCents;

  return (
    <div className="mt-3 rounded-md border border-line bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        После получения
      </div>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-neutral-500">Наличные</div>
          <div className="mt-0.5 font-semibold">{money(cashAfterCents)}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Новый платёж</div>
          <div className="mt-0.5 font-semibold text-red-700">
            −{money(paymentCents)}/мес
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Денежный поток после</div>
          <div
            className={`mt-0.5 font-semibold ${
              cashflowAfterCents >= 0 ? "text-success" : "text-red-700"
            }`}
          >
            {money(cashflowAfterCents)}/мес
          </div>
        </div>
      </div>
    </div>
  );
}

function CreditList({
  liabilities,
  currentCashCents,
  monthlyIncomeCents,
  canManageLiabilities,
  onCloseLiability
}: {
  liabilities: PlayerLiability[];
  currentCashCents: number;
  monthlyIncomeCents: number;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium">Кредиты</div>
      {liabilities.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">Нет кредитов для закрытия.</p>
      ) : (
        <>
          <DebtComposition
            liabilities={liabilities}
            currentCashCents={currentCashCents}
            monthlyIncomeCents={monthlyIncomeCents}
          />
          <div className="mt-3 space-y-2">
            {liabilities.map((liability) => {
              const hasEnoughCash = currentCashCents >= liability.balanceCents;
              const canClose = canManageLiabilities && hasEnoughCash;
              return (
                <div
                  key={liability.id}
                  className="grid gap-2 rounded-md bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {liabilityLabels[liability.type] ?? localizeGameText(liability.name)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Остаток: {money(liability.balanceCents)}
                      {liability.paymentCents > 0
                        ? ` · платеж: ${money(liability.paymentCents)}/мес`
                        : ""}
                    </div>
                    {!canManageLiabilities ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        Погашение доступно владельцу финансового отчёта.
                      </div>
                    ) : !hasEnoughCash ? (
                      <div className="mt-1 text-xs text-red-700">
                        Недостаточно наличных для закрытия.
                      </div>
                    ) : (
                      <div className="mt-1 text-xs font-medium text-success">
                        Кредит можно закрыть полностью.
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() => onCloseLiability(liability)}
                    disabled={!canClose}
                  >
                    Закрыть кредит
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function expenseRows(player: GamePlayer) {
  return expenseItems(player).map((item) => ({
    id: item.id,
    label: item.label,
    value: money(item.amountCents),
    calculation: item.calculation ?? null
  }));
}

function expenseItems(player: GamePlayer): Array<{
  id: string;
  label: string;
  amountCents: number;
  calculation?: string | null;
}> {
  const profession = player.profession;
  const state = player.financialState;

  return [
    {
      id: "taxes",
      label: "Налоги",
      amountCents: profession?.taxesCents ?? 0
    },
    {
      id: "home_mortgage",
      label: "Оплата закладной на дом",
      amountCents:
        liabilityPayment(player, "home_mortgage") ??
        profession?.mortgagePaymentCents ??
        0
    },
    {
      id: "school_debt",
      label: "Оплата кредита на образование",
      amountCents:
        liabilityPayment(player, "school_debt") ??
        profession?.schoolLoanPaymentCents ??
        0
    },
    {
      id: "car_debt",
      label: "Оплата кредита на автомобиль",
      amountCents:
        liabilityPayment(player, "car_debt") ??
        profession?.carLoanPaymentCents ??
        0
    },
    {
      id: "credit_cards",
      label: "Выплаты по кредитной карточке",
      amountCents:
        liabilityPayment(player, "credit_cards") ??
        profession?.creditCardPaymentCents ??
        0
    },
    {
      id: "retail_debt",
      label: "Розничные расходы",
      amountCents:
        liabilityPayment(player, "retail_debt") ??
        profession?.retailPaymentCents ??
        0
    },
    {
      id: "other_expenses",
      label: "Другие расходы",
      amountCents: profession?.otherExpensesCents ?? 0
    },
    {
      id: "children",
      label: "Расходы на детей",
      amountCents:
        (state
          ? state.perChildCostCents * state.childrenCount
          : profession?.childrenExpenseCents) ?? 0,
      calculation: state
        ? childExpenseCalculation(state.childrenCount, state.perChildCostCents)
        : null
    },
    {
      id: "bank_loan",
      label: "Оплата кредита банка",
      amountCents: sumLiabilityPayments(player, "bank_loan")
    }
  ];
}

function liabilityPayment(player: GamePlayer, type: string) {
  const liabilities = player.liabilities.filter((liability) => liability.type === type);
  if (liabilities.length > 0) {
    return liabilities.reduce((sum, liability) => sum + liability.paymentCents, 0);
  }
  return player.financialState ? 0 : null;
}

function sumLiabilityPayments(player: GamePlayer, type: string) {
  return player.liabilities
    .filter((liability) => liability.type === type)
    .reduce((sum, liability) => sum + liability.paymentCents, 0);
}

const liabilityLabels: Record<string, string> = {
  home_mortgage: "Закладная на дом",
  school_debt: "Кредит на образование",
  car_debt: "Кредит на автомобиль",
  credit_cards: "Кредитная карточка",
  retail_debt: "Розничный долг",
  bank_loan: "Оплата кредита банка"
};

function repayableLiabilityRows(player: GamePlayer) {
  return [...player.liabilities]
    .filter((liability) => liability.balanceCents > 0)
    .sort((left, right) => {
      const leftOrder = liabilitySortOrder(left.type);
      const rightOrder = liabilitySortOrder(right.type);
      return leftOrder === rightOrder ? left.name.localeCompare(right.name) : leftOrder - rightOrder;
    });
}

function liabilitySortOrder(type: string) {
  const order: Record<string, number> = {
    home_mortgage: 10,
    school_debt: 20,
    car_debt: 30,
    credit_cards: 40,
    retail_debt: 50,
    bank_loan: 60
  };
  return order[type] ?? 100;
}

function ActionsPanel({
  canChooseDeal,
  onDrawSmallDeal,
  onDrawBigDeal,
  latestCard,
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
  headerControl,
  pinnedHeader = false,
  activityFeed,
  embedded = false
}: {
  canChooseDeal: boolean;
  onDrawSmallDeal: () => void;
  onDrawBigDeal: () => void;
  latestCard: ReturnType<typeof latestDealCard>;
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
  headerControl?: ReactNode;
  pinnedHeader?: boolean;
  activityFeed?: ReactNode;
  embedded?: boolean;
}) {
  const [stockCostDraft, setStockCostDraft] = useState("");
  const [stockCostEditing, setStockCostEditing] = useState(false);

  useEffect(() => {
    setStockCostDraft("");
    setStockCostEditing(false);
  }, [latestCard?.cardId]);

  const maxStockQuantity =
    latestCard?.isStock
      ? maxStockQuantityForCashCents(latestCard.priceCents, currentCashCents)
      : 0;
  const validDealQuantity = typeof dealQuantity === "number" && dealQuantity >= 1;
  const totalStockCostCents =
    latestCard?.isStock
      ? stockPurchaseCostCents(latestCard.priceCents, dealQuantity)
      : 0;
  const purchaseCostCents = latestCard
    ? latestCard.isStock
      ? totalStockCostCents
      : latestCard.downPaymentCents
    : 0;
  const canAffordLatestDeal = latestCard
    ? canAffordPurchaseCents(currentCashCents, purchaseCostCents)
    : false;
  const canPayCharity =
    charityChoice ? currentCashCents >= charityChoice.donationCents : false;
  const canCloseMarketSale =
    marketSaleOffer ? currentCashCents + marketSaleOffer.proceedsCents >= 0 : false;
  const canResolveLatestDeal = waitingStockSellerNames.length === 0;
  const dealDecisionSubmitting =
    decisionSubmission === "deal_buy" || decisionSubmission === "deal_decline";
  const stockDecisionSubmission =
    decisionSubmission === "stock_sell" || decisionSubmission === "stock_decline"
      ? decisionSubmission
      : null;

  const content = (
    <>
      {canChooseDeal ? (
        <div className="rounded-md bg-[#f5faf2] p-3">
          <div className="text-sm font-medium">Возможность</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onDrawSmallDeal}>
              Мелкая сделка
            </Button>
            <Button variant="secondary" onClick={onDrawBigDeal}>
              Крупная сделка
            </Button>
          </div>
        </div>
      ) : null}

      {stockSaleOffer ? (
        <StockSalePanel
          offer={stockSaleOffer}
          quantity={stockSaleQuantity}
          onQuantityChange={onStockSaleQuantityChange}
          onDecrease={onStockSaleDecrease}
          onIncrease={onStockSaleIncrease}
          decisionSubmission={stockDecisionSubmission}
          onSell={onSellStock}
          onDecline={onDeclineStockSale}
        />
      ) : null}

      {marketSaleOffer ? (
        <div className="rounded-md bg-[#f5f6fc] p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium">Предложение рынка</div>
            {marketSaleOffer.totalOffers > 1 ? (
              <span className="text-xs font-medium text-neutral-600">
                {marketSaleOffer.offerNumber} из {marketSaleOffer.totalOffers}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {localizeGameText(marketSaleOffer.title)}
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <div>Актив: {localizeGameText(marketSaleOffer.assetName)}</div>
            {marketSaleOffer.salePriceCents > 0 ? (
              <div>
                Цена продажи: <strong>{money(marketSaleOffer.salePriceCents)}</strong>
              </div>
            ) : (
              <div>
                Немедленная выплата: <strong>нет</strong>
              </div>
            )}
            {marketSaleOffer.mortgageCents > 0 ? (
              <div>
                Закладная: <strong>{money(marketSaleOffer.mortgageCents)}</strong>
              </div>
            ) : null}
            <div>
              {marketSaleOffer.proceedsCents >= 0 ? "К получению" : "К доплате"}:{" "}
              <strong>{money(Math.abs(marketSaleOffer.proceedsCents))}</strong>
            </div>
            {marketSaleOffer.netCashflowChangeCents !== 0 ? (
              <div>
                {marketSaleOffer.netCashflowChangeCents < 0
                  ? "Денежный поток уменьшится на"
                  : "Денежный поток увеличится на"}{" "}
                <strong>{money(Math.abs(marketSaleOffer.netCashflowChangeCents))}</strong>/мес
              </div>
            ) : null}
          </div>
          {marketSaleOffer.proceedsCents < 0 ? (
            <FundingProgress
              className="mt-3"
              availableCents={currentCashCents}
              requiredCents={Math.abs(marketSaleOffer.proceedsCents)}
              label="Доплата для закрытия продажи"
            />
          ) : null}
          {!canCloseMarketSale ? (
            <p className="mt-2 text-xs text-red-700">
              Недостаточно наличных, чтобы закрыть продажу.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={onSellMarketAsset} disabled={!canAnswerMarketSale || !canCloseMarketSale}>
              Продать
            </Button>
            <Button variant="secondary" onClick={onDeclineMarketSale} disabled={!canAnswerMarketSale}>
              Отказаться
            </Button>
          </div>
          {marketSaleOffer.totalOffers > 1 ? (
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              После вашего решения игра перейдёт к следующему подходящему активу.
            </p>
          ) : null}
        </div>
      ) : null}

      {charityChoice ? (
        <div className="rounded-md bg-[#fff5ed] p-3">
          <div className="text-sm font-medium">Благотворительность</div>
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
        </div>
      ) : null}

      {doodadPaymentChoice ? (
        <div className="rounded-md bg-[#fff4f7] p-3">
          <div className="text-sm font-medium">Выбор оплаты</div>
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
        </div>
      ) : null}

      {latestCard ? (
        <div className="w-full min-w-0 max-w-full rounded-md bg-[#f5faf2] p-3">
          <div className="text-sm font-medium">Текущая сделка</div>
            <p className="mt-1 break-words text-sm text-neutral-700">
              {localizeGameText(latestCard.title)}
            </p>
            {latestCard.bodyText ? (
              <p className="mt-2 break-words text-sm leading-6 text-neutral-700">
                {localizeGameText(latestCard.bodyText)}
              </p>
            ) : null}
            <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
              {latestCard.priceCents > 0 ? (
                <div>
                  Цена: <strong>{money(latestCard.priceCents)}</strong>
                </div>
              ) : null}
              {!latestCard.isStock || latestCard.downPaymentCents > 0 ? (
                <div>
                  Первоначальный взнос:{" "}
                  <strong>{money(latestCard.downPaymentCents)}</strong>
                </div>
              ) : null}
              {latestCard.cashflowCents !== 0 ? (
                <div>
                  Денежный поток: <strong>{money(latestCard.cashflowCents)}</strong>/мес
                </div>
              ) : null}
            </div>
            {latestCard.isStock ? (
              <div className="mt-3 rounded-md bg-surface p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Расчёт стоимости
                  </div>
                  <div className="text-xs text-neutral-500">
                    Цена акции: <strong className="text-neutral-700">{money(latestCard.priceCents)}</strong>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor="stock-purchase-quantity"
                      className="mb-1 block text-xs font-semibold text-neutral-600"
                    >
                      Кол-во
                    </label>
                    <div className="grid grid-cols-[repeat(2,minmax(0,.75fr))_minmax(4.5rem,1.8fr)_repeat(3,minmax(0,.75fr))] items-center gap-1">
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() => setDealQuantity(changeStockQuantity(dealQuantity, -100))}
                        disabled={!validDealQuantity}
                        aria-label="Уменьшить количество на 100"
                        title="Уменьшить на 100"
                      >
                        <ChevronsLeft size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() => setDealQuantity(changeStockQuantity(dealQuantity, -10))}
                        disabled={!validDealQuantity}
                        aria-label="Уменьшить количество на 10"
                        title="Уменьшить на 10"
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </Button>
                      <Input
                        id="stock-purchase-quantity"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={dealQuantity}
                        placeholder="Кол-во"
                        aria-label="Количество акций"
                        onChange={(event) =>
                          setDealQuantity(event.target.value === "" ? "" : Number(event.target.value))
                        }
                        className="h-10 px-1 text-center text-xs font-semibold tabular-nums placeholder:text-[11px]"
                      />
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() => setDealQuantity(changeStockQuantity(dealQuantity, 10))}
                        aria-label="Увеличить количество на 10"
                        title="Увеличить на 10"
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() => setDealQuantity(changeStockQuantity(dealQuantity, 100))}
                        aria-label="Увеличить количество на 100"
                        title="Увеличить на 100"
                      >
                        <ChevronsRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-1 text-[10px] font-bold uppercase"
                        onClick={() => setDealQuantity(maxStockQuantity)}
                        disabled={
                          dealQuantity === maxStockQuantity ||
                          (maxStockQuantity === 0 && dealQuantity === "")
                        }
                        aria-label="Выбрать максимальное количество акций на текущие наличные"
                        title="Максимум на текущие наличные"
                      >
                        max
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="stock-purchase-cost"
                      className="mb-1 block text-xs font-semibold text-neutral-600"
                    >
                      Стоимость
                    </label>
                    <div className="grid grid-cols-[repeat(2,minmax(0,.75fr))_minmax(4.5rem,1.8fr)_repeat(3,minmax(0,.75fr))] items-center gap-1">
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() =>
                          setDealQuantity(
                            changeStockCostCents(dealQuantity, latestCard.priceCents, -1000)
                          )
                        }
                        disabled={!validDealQuantity}
                        aria-label="Уменьшить стоимость на 1000 долларов"
                        title="Уменьшить на $1000"
                      >
                        <ChevronsLeft size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() =>
                          setDealQuantity(
                            changeStockCostCents(dealQuantity, latestCard.priceCents, -500)
                          )
                        }
                        disabled={!validDealQuantity}
                        aria-label="Уменьшить стоимость на 500 долларов"
                        title="Уменьшить на $500"
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </Button>
                      <Input
                        id="stock-purchase-cost"
                        type="number"
                        min={latestCard.priceCents}
                        step={1}
                        inputMode="decimal"
                        value={
                          stockCostEditing
                            ? stockCostDraft
                            : validDealQuantity
                              ? totalStockCostCents
                              : ""
                        }
                        placeholder="Стоимость"
                        aria-label="Стоимость покупки акций в долларах"
                        onFocus={() => {
                          setStockCostEditing(true);
                          setStockCostDraft(validDealQuantity ? String(totalStockCostCents) : "");
                        }}
                        onChange={(event) => {
                          setStockCostDraft(event.target.value);
                          setDealQuantity(
                            event.target.value === ""
                              ? ""
                              : stockQuantityForCostCents(
                                  latestCard.priceCents,
                                  Math.round(Number(event.target.value))
                                )
                          );
                        }}
                        onBlur={() => {
                          setStockCostEditing(false);
                          setStockCostDraft(validDealQuantity ? String(totalStockCostCents) : "");
                        }}
                        className="h-10 px-1 text-center text-xs font-semibold tabular-nums placeholder:text-[11px]"
                      />
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() =>
                          setDealQuantity(
                            changeStockCostCents(dealQuantity, latestCard.priceCents, 500)
                          )
                        }
                        aria-label="Увеличить стоимость на 500 долларов"
                        title="Увеличить на $500"
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-0"
                        onClick={() =>
                          setDealQuantity(
                            changeStockCostCents(dealQuantity, latestCard.priceCents, 1000)
                          )
                        }
                        aria-label="Увеличить стоимость на 1000 долларов"
                        title="Увеличить на $1000"
                      >
                        <ChevronsRight size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 min-w-0 px-1 text-[10px] font-bold uppercase"
                        onClick={() => setDealQuantity(maxStockQuantity)}
                        disabled={
                          dealQuantity === maxStockQuantity ||
                          (maxStockQuantity === 0 && dealQuantity === "")
                        }
                        aria-label="Выбрать максимальную стоимость покупки на текущие наличные"
                        title="Максимум на текущие наличные"
                      >
                        max
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  На текущие наличные хватает: {maxStockQuantity}. Для большей покупки сначала возьмите кредит.
                </p>
              </div>
            ) : null}
            {purchaseCostCents > 0 && (!latestCard.isStock || validDealQuantity) ? (
              <FundingProgress
                className="mt-3"
                availableCents={currentCashCents}
                requiredCents={purchaseCostCents}
                label="Сумма к оплате"
              />
            ) : null}
            {!canResolveLatestDeal ? (
              <p className="mt-3 break-words text-xs text-amber-700">
                Ожидаем решение по продаже от игроков: {waitingStockSellerNames.join(", ")}.
              </p>
            ) : null}
            <div
              className={[
                "mt-3 grid w-full min-w-0 gap-2",
                embedded ? "grid-cols-1" : "sm:grid-cols-3"
              ].join(" ")}
            >
              <Button
                className="w-full min-w-0"
                onClick={onBuyLatest}
                disabled={
                  !canResolveLatestDeal ||
                  !canAffordLatestDeal ||
                  dealDecisionSubmitting ||
                  (Boolean(latestCard?.isStock) && !validDealQuantity)
                }
                aria-busy={decisionSubmission === "deal_buy"}
              >
                {decisionSubmission === "deal_buy" ? "Покупаем…" : "Купить"}
              </Button>
              <Button
                className="w-full min-w-0"
                variant="secondary"
                onClick={onOpenBank}
                disabled={!canTakeLoan || dealDecisionSubmitting}
              >
                Взять кредит
              </Button>
              <Button
                className="w-full min-w-0"
                variant="secondary"
                onClick={onDeclineLatest}
                disabled={!canResolveLatestDeal || dealDecisionSubmitting}
                aria-busy={decisionSubmission === "deal_decline"}
              >
                {decisionSubmission === "deal_decline" ? "Отказываемся…" : "Отказаться"}
              </Button>
            </div>
        </div>
      ) : null}

    </>
  );

  const header = (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        pinnedHeader &&
          "sticky top-[4.5rem] z-[9] -mx-3 h-12 bg-white px-3"
      )}
    >
      <h2 className="text-lg font-semibold">Действия</h2>
      {headerControl ?? (
        <Button
          variant="primary"
          className="h-9 gap-2 px-3 text-xs"
          onClick={onOpenBank}
          disabled={!canTakeLoan}
        >
          <Landmark size={15} aria-hidden="true" />
          Банк
        </Button>
      )}
    </div>
  );

  if (embedded) {
    return (
      <section className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3">
        {header}
        {content}
        {activityFeed ? <div className="mt-1">{activityFeed}</div> : null}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4">
        {header}
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
        {activityFeed ? <div>{activityFeed}</div> : null}
      </CardContent>
    </Card>
  );
}

type JournalEntry =
  | {
      kind: "event";
      id: string;
      event: GameEvent;
    }
  | {
      kind: "turn";
      id: string;
      events: GameEvent[];
      complete: boolean;
    };

const turnStartEventTypes = new Set([
  realtimeEvents.playerRollDice,
  "turn:skipped",
  "bankruptcy:turn_skipped"
]);

const turnEndingStateReasons = new Set([
  "roll_resolved",
  "turn_skipped",
  "bankruptcy_turn_skipped",
  "financial_freedom_reached",
  "time_limit_reached"
]);

const nonGameplayPlayerEventTypes = new Set([
  "player:joined",
  "player:added",
  "player:removed",
  "player:role_changed",
  "player:figurine_selected"
]);

function journalEntries(events: GameEvent[]) {
  const entries: JournalEntry[] = [];
  let activeTurn: GameEvent[] | null = null;

  const finishActiveTurn = (complete = false) => {
    if (!activeTurn || activeTurn.length === 0) return;
    entries.push({
      kind: "turn",
      id: `turn-${activeTurn[0]?.id ?? activeTurn[0]?.sequence ?? entries.length}`,
      events: activeTurn,
      complete
    });
    activeTurn = null;
  };

  for (const event of [...events].sort(
    (left, right) => left.sequence - right.sequence
  )) {
    if (turnStartEventTypes.has(event.type)) {
      const activePlayerId = activeTurn?.find((activeEvent) => activeEvent.gamePlayer?.id)
        ?.gamePlayer?.id;
      const activeHasTurnStart = activeTurn?.some((activeEvent) =>
        turnStartEventTypes.has(activeEvent.type)
      );
      if (
        activeTurn &&
        !activeHasTurnStart &&
        activePlayerId &&
        activePlayerId === event.gamePlayer?.id
      ) {
        activeTurn.push(event);
        continue;
      }

      finishActiveTurn(true);
      activeTurn = [event];
      continue;
    }

    if (event.type === realtimeEvents.stateUpdate) {
      if (activeTurn) {
        activeTurn.push(event);
        if (isTurnEndingStateEvent(event)) finishActiveTurn(true);
      }
      continue;
    }

    if (activeTurn) {
      const activeHasTurnStart = activeTurn.some((activeEvent) =>
        turnStartEventTypes.has(activeEvent.type)
      );
      const activePlayerId = activeTurn.find((activeEvent) => activeEvent.gamePlayer?.id)
        ?.gamePlayer?.id;
      if (
        !activeHasTurnStart &&
        isPlayerGameplayEvent(event) &&
        activePlayerId &&
        activePlayerId !== event.gamePlayer?.id
      ) {
        finishActiveTurn(true);
        activeTurn = [event];
        continue;
      }

      activeTurn.push(event);
      if (event.type === realtimeEvents.gameEnded) finishActiveTurn(true);
      continue;
    }

    if (isPlayerGameplayEvent(event)) {
      activeTurn = [event];
      continue;
    }

    entries.push({ kind: "event", id: event.id, event });
  }

  finishActiveTurn();
  return entries;
}

function isPlayerGameplayEvent(event: GameEvent) {
  return Boolean(event.gamePlayer?.id) && !nonGameplayPlayerEventTypes.has(event.type);
}

function isTurnEndingStateEvent(event: GameEvent) {
  const reason = String(event.payload.reason ?? "");
  return turnEndingStateReasons.has(reason) || reason.endsWith("_turn_ended");
}

function journalEntrySequence(entry: JournalEntry) {
  if (entry.kind === "event") return entry.event.sequence;
  return entry.events[entry.events.length - 1]?.sequence ?? 0;
}

function journalEntryActor(entry: JournalEntry) {
  if (entry.kind === "event") return entry.event.actor;
  return (
    entry.events.find((event) => turnStartEventTypes.has(event.type))?.actor ??
    entry.events.find((event) => event.actor)?.actor
  );
}

function turnSequenceLabel(entry: Extract<JournalEntry, { kind: "turn" }>) {
  const firstSequence = entry.events[0]?.sequence;
  const lastSequence = entry.events[entry.events.length - 1]?.sequence;
  if (firstSequence === undefined || lastSequence === undefined) return "";
  return firstSequence === lastSequence
    ? `#${firstSequence}`
    : `#${firstSequence}–${lastSequence}`;
}

type TurnJournalEntry = Extract<JournalEntry, { kind: "turn" }>;

function journalEntryGamePlayerId(entry: TurnJournalEntry) {
  return (
    entry.events.find((event) => turnStartEventTypes.has(event.type))?.gamePlayer?.id ??
    entry.events.find((event) => event.gamePlayer?.id)?.gamePlayer?.id ??
    null
  );
}

function isJournalTurnComplete(entry: TurnJournalEntry) {
  return entry.complete || entry.events.some(
    (event) =>
      (event.type === realtimeEvents.stateUpdate && isTurnEndingStateEvent(event)) ||
      event.type === realtimeEvents.gameEnded
  );
}

function JournalFilterButton({
  onlyMine,
  onToggle
}: {
  onlyMine: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 bg-surface px-3 text-xs text-muted shadow-none hover:bg-card hover:text-ink"
      aria-pressed={onlyMine}
      onClick={onToggle}
    >
      {onlyMine ? "Показать всех" : "Только мои"}
    </Button>
  );
}

function BotJournalStatus({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl bg-[#f4f0ff] px-4 py-3 text-sm font-bold text-[#513393] shadow-[0_10px_28px_rgba(118,85,199,.12)]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#7655c7] shadow-[0_5px_14px_rgba(118,85,199,.14)]">
        <Bot size={18} aria-hidden="true" />
      </span>
      <span>{message}</span>
    </div>
  );
}

function GameTurnFeed({
  gameId,
  token,
  events,
  players,
  currentUserId,
  currentGamePlayerId,
  currentTurnPlayer,
  currentTurnIndex,
  gameStatus,
  onSendBabyGift,
  onlyMine,
  onToggleOnlyMine,
  showHeader,
  botStatusMessage
}: {
  gameId: string;
  token: string;
  events: GameEvent[];
  players: GamePlayer[];
  currentUserId: string;
  currentGamePlayerId: string | null;
  currentTurnPlayer: GamePlayer | undefined;
  currentTurnIndex: number;
  gameStatus: GameSnapshot["game"]["status"];
  onSendBabyGift: (birthEventId: string, amountCents: number) => Promise<void>;
  onlyMine: boolean;
  onToggleOnlyMine: () => void;
  showHeader: boolean;
  botStatusMessage: string | null;
}) {
  const [historyEvents, setHistoryEvents] = useState(events);
  const [visibleCount, setVisibleCount] = useState(10);
  const [replayLoaded, setReplayLoaded] = useState(events.length < 80);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newEventSequenceFloor, setNewEventSequenceFloor] = useState<number | null>(null);
  const [enteringPendingTurnIndex, setEnteringPendingTurnIndex] = useState<number | null>(null);
  const latestRealtimeSequenceRef = useRef(
    events.reduce((latest, event) => Math.max(latest, event.sequence), 0)
  );
  const previousTurnIndexRef = useRef(currentTurnIndex);

  useEffect(() => {
    setHistoryEvents(events);
    setVisibleCount(10);
    setReplayLoaded(events.length < 80);
    setLoadError(null);
    setNewEventSequenceFloor(null);
    setEnteringPendingTurnIndex(null);
    latestRealtimeSequenceRef.current = events.reduce(
      (latest, event) => Math.max(latest, event.sequence),
      0
    );
    previousTurnIndexRef.current = currentTurnIndex;
  }, [gameId]);

  useEffect(() => {
    setHistoryEvents((current) => mergeGameEvents(current, events));
  }, [events]);

  useEffect(() => {
    const latestSequence = events.reduce(
      (latest, event) => Math.max(latest, event.sequence),
      0
    );
    const previousSequence = latestRealtimeSequenceRef.current;
    if (latestSequence <= previousSequence) return;

    latestRealtimeSequenceRef.current = latestSequence;
    setNewEventSequenceFloor((current) => current ?? previousSequence);
    const resetTimer = window.setTimeout(() => setNewEventSequenceFloor(null), 600);
    return () => window.clearTimeout(resetTimer);
  }, [events]);

  useEffect(() => {
    const previousTurnIndex = previousTurnIndexRef.current;
    previousTurnIndexRef.current = currentTurnIndex;
    if (currentTurnIndex === previousTurnIndex) return;

    setEnteringPendingTurnIndex(currentTurnIndex);
    const resetTimer = window.setTimeout(() => setEnteringPendingTurnIndex(null), 600);
    return () => window.clearTimeout(resetTimer);
  }, [currentTurnIndex]);

  useEffect(() => {
    setVisibleCount(10);
    setNewEventSequenceFloor(null);
    setEnteringPendingTurnIndex(null);
  }, [onlyMine]);

  const turns = useMemo(() => {
    const historyTurns = journalEntries(historyEvents)
      .filter((entry): entry is TurnJournalEntry => entry.kind === "turn")
      .sort((left, right) => journalEntrySequence(right) - journalEntrySequence(left));

    return historyTurns.filter((entry) => {
      if (!onlyMine) return true;
      const gamePlayerId = journalEntryGamePlayerId(entry);
      return gamePlayerId
        ? gamePlayerId === currentGamePlayerId
        : journalEntryActor(entry)?.id === currentUserId;
    });
  }, [currentGamePlayerId, currentUserId, historyEvents, onlyMine]);
  const viewingPlayer = players.find((player) => player.id === currentGamePlayerId);
  const hasOpenCurrentTurn = turns.some(
    (entry) =>
      !isJournalTurnComplete(entry) &&
      journalEntryGamePlayerId(entry) === currentTurnPlayer?.id
  );
  const showPendingTurn =
    (gameStatus === "IN_PROGRESS" || gameStatus === "PAUSED") &&
    Boolean(currentTurnPlayer) &&
    !hasOpenCurrentTurn &&
    (!onlyMine || currentTurnPlayer?.id === currentGamePlayerId);
  const totalVisibleItems = turns.length + (showPendingTurn ? 1 : 0);
  const visibleTurns = turns.slice(0, Math.max(0, visibleCount - (showPendingTurn ? 1 : 0)));
  const canLoadArchive = !replayLoaded && events.length >= 80;
  const hasMore = visibleCount < totalVisibleItems || canLoadArchive;

  async function loadMore() {
    setLoadError(null);
    setNewEventSequenceFloor(null);
    setEnteringPendingTurnIndex(null);
    if (visibleCount < totalVisibleItems) {
      setVisibleCount((count) => count + 10);
      return;
    }
    if (!canLoadArchive || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${gameId}/replay`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Не удалось загрузить историю партии");
      const data = (await response.json()) as { events?: GameEvent[] };
      setHistoryEvents((current) => mergeGameEvents(current, data.events ?? []));
      setReplayLoaded(true);
      setVisibleCount((count) => count + 10);
    } catch (event) {
      setLoadError(event instanceof Error ? event.message : "Не удалось загрузить историю партии");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="w-full min-w-0 max-w-full" aria-label="Лента ходов">
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">Лента ходов</h3>
            <p className="mt-0.5 text-xs text-muted">Новые события дополняют текущий ход автоматически.</p>
          </div>
          <JournalFilterButton onlyMine={onlyMine} onToggle={onToggleOnlyMine} />
        </div>
      ) : null}

      <div
        className={cn(
          "w-full min-w-0 max-w-full space-y-3",
          showHeader ? "mt-3" : null
        )}
        role="feed"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={loadingMore}
      >
        {botStatusMessage ? <BotJournalStatus message={botStatusMessage} /> : null}
        {showPendingTurn && currentTurnPlayer ? (
          <JournalMotionItem animate={enteringPendingTurnIndex === currentTurnIndex}>
            <TurnJournalCard
              key={`current-turn-${currentTurnIndex}-${currentTurnPlayer.id}`}
              entry={null}
              player={currentTurnPlayer}
              pendingSequence={currentTurnIndex + 1}
              allEvents={historyEvents}
              currentGamePlayerId={currentGamePlayerId}
              currentGamePlayer={viewingPlayer}
              gameStatus={gameStatus}
              onSendBabyGift={onSendBabyGift}
            />
          </JournalMotionItem>
        ) : null}
        {visibleTurns.length === 0 && !showPendingTurn && !botStatusMessage ? (
          <p className="rounded-xl bg-surface p-3 text-sm text-muted">
            {onlyMine ? "Ваших ходов пока нет." : "Ходов пока нет."}
          </p>
        ) : (
          visibleTurns.map((entry) => {
            const gamePlayerId = journalEntryGamePlayerId(entry);
            const actor = journalEntryActor(entry);
            const player =
              players.find((candidate) => candidate.id === gamePlayerId) ??
              players.find((candidate) => candidate.userId === actor?.id);
            const entryKey =
              player &&
              !isJournalTurnComplete(entry) &&
              player.id === currentTurnPlayer?.id
                ? `current-turn-${currentTurnIndex}-${player.id}`
                : entry.id;
            const animateCard = Boolean(
              newEventSequenceFloor !== null &&
              entry.events[0] &&
              entry.events[0].sequence > newEventSequenceFloor
            );
            return (
              <JournalMotionItem key={entryKey} animate={animateCard}>
                <TurnJournalCard
                  entry={entry}
                  player={player}
                  newEventSequenceFloor={animateCard ? null : newEventSequenceFloor}
                  allEvents={historyEvents}
                  currentGamePlayerId={currentGamePlayerId}
                  currentGamePlayer={viewingPlayer}
                  gameStatus={gameStatus}
                  onSendBabyGift={onSendBabyGift}
                />
              </JournalMotionItem>
            );
          })
        )}
      </div>

      {loadError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {loadError}. Попробуйте ещё раз.
        </p>
      ) : null}
      {hasMore ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => void loadMore()}
          disabled={loadingMore}
        >
          {loadingMore ? "Загружаем…" : "Показать ещё"}
        </Button>
      ) : null}
    </section>
  );
}

function JournalMotionItem({
  animate,
  children
}: {
  animate: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("turn-feed-motion-item", animate && "turn-feed-motion-item--enter")}>
      <div className="turn-feed-motion-item__inner">{children}</div>
    </div>
  );
}

function mergeGameEvents(current: GameEvent[], incoming: GameEvent[]) {
  const eventsById = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) eventsById.set(event.id, event);
  return [...eventsById.values()].sort((left, right) => left.sequence - right.sequence);
}

function TurnJournalCard({
  entry,
  player,
  pendingSequence,
  newEventSequenceFloor = null,
  allEvents,
  currentGamePlayerId,
  currentGamePlayer,
  gameStatus,
  onSendBabyGift
}: {
  entry: TurnJournalEntry | null;
  player: GamePlayer | undefined;
  pendingSequence?: number;
  newEventSequenceFloor?: number | null;
  allEvents: GameEvent[];
  currentGamePlayerId: string | null;
  currentGamePlayer: GamePlayer | undefined;
  gameStatus: GameSnapshot["game"]["status"];
  onSendBabyGift: (birthEventId: string, amountCents: number) => Promise<void>;
}) {
  const actor = entry ? journalEntryActor(entry) : null;
  const firstEvent = entry?.events[0];
  const lastEvent = entry?.events[entry.events.length - 1];
  const visibleTurnEvents = (entry?.events ?? [])
    .filter(
      (event) =>
        event.type !== realtimeEvents.stateUpdate &&
        event.type !== realtimeEvents.babyGift
    )
    .reverse();
  const complete = entry ? isJournalTurnComplete(entry) : false;
  const playerName = player ? gamePlayerName(player) : actor?.displayName ?? "Игрок";
  const eventTime = firstEvent?.createdAt ?? lastEvent?.createdAt;

  return (
    <article
      className="w-full min-w-0 max-w-full rounded-xl bg-surface p-3 [overflow-wrap:anywhere]"
      aria-label={`Ход игрока ${playerName}, ${complete ? "завершён" : "в процессе"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {player ? <PlayerIdentityMark player={player} /> : null}
          <div className="min-w-0">
            <div className="text-sm font-extrabold">Ход игрока</div>
            <div className="mt-0.5 truncate text-xs text-muted">
              {playerName}{eventTime ? ` · ${shortDate(eventTime)}` : ""}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs text-muted">
            {entry ? turnSequenceLabel(entry) : `Ход ${pendingSequence ?? "—"}`}
          </span>
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
              complete ? "bg-green-100 text-success" : "bg-[#e8effe] text-[#174397]"
            ].join(" ")}
          >
            {complete ? <CheckCircle2 size={12} aria-hidden="true" /> : <CircleDot size={12} aria-hidden="true" />}
            {complete ? "Завершён" : "В процессе"}
          </span>
        </div>
      </div>
      {visibleTurnEvents.length > 0 ? (
        <div className="mt-3 min-w-0 max-w-full space-y-3">
          {visibleTurnEvents.map((event) => {
            const content =
              event.type === realtimeEvents.cardDraw ? (
                <JournalCardDraw event={event} />
              ) : event.type === "player:baby" ? (
                <BabyJournalEvent
                  event={event}
                  allEvents={allEvents}
                  recipient={player}
                  currentGamePlayerId={currentGamePlayerId}
                  currentGamePlayer={currentGamePlayer}
                  gameStatus={gameStatus}
                  onSendBabyGift={onSendBabyGift}
                />
              ) : (
                <div className="text-sm">
                  <GameEventPresentation event={event} />
                </div>
              );
            return (
              <JournalMotionItem
                key={event.id}
                animate={Boolean(
                  newEventSequenceFloor !== null &&
                  event.sequence > newEventSequenceFloor
                )}
              >
                {content}
              </JournalMotionItem>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Ожидаем действие игрока.</p>
      )}
    </article>
  );
}

function BabyJournalEvent({
  event,
  allEvents,
  recipient,
  currentGamePlayerId,
  currentGamePlayer,
  gameStatus,
  onSendBabyGift
}: {
  event: GameEvent;
  allEvents: GameEvent[];
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
            <div
              key={gift.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
            >
              <span className="min-w-0 truncate text-xs font-bold text-[#5d4a27]">
                {gift.actor?.displayName ?? "Игрок"}
              </span>
              <strong className="shrink-0 text-sm text-success">
                +{money(toNumber(gift.payload.amountCents))}
              </strong>
            </div>
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
  "deal:sell": HandCoins
} as const;

function GameEventPresentation({
  event,
  titleClassName = "font-medium"
}: {
  event: GameEvent;
  titleClassName?: string;
}) {
  const cashChange = eventCashChange(event);
  const details = compactEventDetails(event);

  return (
    <div className="min-w-0 max-w-full text-sm">
      <div className={`text-neutral-800 ${titleClassName}`}>
        <GameEventHeadline event={event} />
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

function GameEventHeadline({ event }: { event: GameEvent }) {
  if (event.type === realtimeEvents.playerRollDice) {
    const diceValues = Array.isArray(event.payload.diceValues)
      ? event.payload.diceValues
          .map((value) => toNumber(value))
          .filter((value) => Number.isFinite(value))
      : [];
    const total = toNumber(event.payload.dice);
    const expression =
      diceValues.length > 0
        ? `${diceValues.join(" + ")} = ${Number.isFinite(total) ? total : diceValues.reduce((sum, value) => sum + value, 0)}`
        : String(Number.isFinite(total) ? total : "—");

    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Dices size={16} className="shrink-0 text-journey" aria-hidden="true" />
        <span className="sr-only">Бросок кубика: </span>
        <span>{expression}</span>
      </span>
    );
  }

  if (event.type === realtimeEvents.playerMove) {
    const from = toNumber(event.payload.from);
    const to = toNumber(event.payload.to);
    const cell = isRecord(event.payload.cell) ? event.payload.cell : null;
    const cellType = String(cell?.type ?? "");
    const cellLabel = String(cell?.label ?? cellTypes[cellType] ?? "");

    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <MoveRight size={16} className="shrink-0 text-journey" aria-hidden="true" />
        <span className="sr-only">Перемещение по полю: </span>
        <span>
          {compactBoardPosition(from)} → {compactBoardPosition(to)}
        </span>
        {cellLabel ? (
          <span className="text-xs font-medium text-neutral-600">
            {cellTypes[cellType] ?? localizeGameText(cellLabel || "Игровая клетка")}
          </span>
        ) : null}
      </span>
    );
  }

  const EventIcon = eventTitleIcons[event.type as keyof typeof eventTitleIcons];
  return (
    <span className="inline-flex items-center gap-2">
      {EventIcon ? <EventIcon size={16} className="shrink-0 text-journey" aria-hidden="true" /> : null}
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

function CashChangeVisualization({ change }: { change: CashChange }) {
  const positive = change.deltaCents >= 0;
  const expression = cashChangeExpression(change);

  return (
    <div className="mt-1.5 inline-flex max-w-full min-w-0 flex-wrap items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-sm [overflow-wrap:anywhere]">
      <Banknote size={16} className="shrink-0 text-success" aria-hidden="true" />
      {expression.kind === "equation" ? (
        <>
          <strong>{expression.result}</strong>
          <span className="text-neutral-400" aria-hidden="true">→</span>
          <strong
            className={expression.changedOperand === "first" ? "text-success" : undefined}
          >
            {expression.firstOperand}
          </strong>
          <strong className={positive ? "text-success" : "text-red-700"}>
            {expression.operator}
          </strong>
          <strong
            className={expression.changedOperand === "second" ? "text-red-700" : undefined}
          >
            {expression.secondOperand}
          </strong>
        </>
      ) : (
        <strong className={positive ? "text-success" : "text-red-700"}>
          {expression.value}
        </strong>
      )}
    </div>
  );
}

function compactBoardPosition(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value < 0 ? "Старт" : String(value + 1);
}

function MoneyBoldText({ text }: { text: string }) {
  const localizedText = localizeGameText(text);
  const currencyPattern = /(-?[\d\s\u00a0\u202f]+(?:[.,]\d+)?\s*\$)/gu;
  const currencyPartPattern = /^-?[\d\s\u00a0\u202f]+(?:[.,]\d+)?\s*\$$/u;
  const parts = localizedText.split(currencyPattern);

  return (
    <>
      {parts.map((part, index) =>
        currencyPartPattern.test(part) ? (
          <strong key={index} className="font-semibold text-neutral-900">
            {part}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

type JournalCardAppearance = {
  container: string;
  badge: string;
  section: string;
};

const defaultJournalCardAppearance: JournalCardAppearance = {
  container: "border-neutral-300 bg-white",
  badge: "bg-neutral-200 text-neutral-700",
  section: "border-neutral-200"
};

const journalCardAppearances: Record<string, JournalCardAppearance> = {
  SMALL_DEAL: {
    container: "border-[#a8c99a] bg-[#f5faf2]",
    badge: "bg-[#d1e3ca] text-[#35512d]",
    section: "border-[#d1e3ca]"
  },
  BIG_DEAL: {
    container: "border-[#91add3] bg-[#f3f7fc]",
    badge: "bg-[#d2e0f2] text-[#294d78]",
    section: "border-[#d2e0f2]"
  },
  MARKET: {
    container: "border-[#a7add6] bg-[#f5f6fc]",
    badge: "bg-[#d4d7ec] text-[#3f467d]",
    section: "border-[#d4d7ec]"
  },
  DOODAD: {
    container: "border-[#dfa1b3] bg-[#fff4f7]",
    badge: "bg-[#eecbd5] text-[#7a3449]",
    section: "border-[#eecbd5]"
  },
  FAST_TRACK: {
    container: "border-[#d8b65a] bg-[#fff9e8]",
    badge: "bg-[#f3e4ad] text-[#705719]",
    section: "border-[#f3e4ad]"
  },
  DREAM: {
    container: "border-[#b596c8] bg-[#faf5fc]",
    badge: "bg-[#e1d2ea] text-[#604271]",
    section: "border-[#e1d2ea]"
  }
};

function JournalCardDraw({ event }: { event: GameEvent }) {
  const payload = event.payload ?? {};
  const cardType = String(payload.cardType ?? "");
  const appearance = journalCardAppearances[cardType] ?? defaultJournalCardAppearance;
  const title = toText(payload.title) ?? "Карточка";
  const bodyText = toText(payload.bodyText);
  const effectDetails = compactDetails(cardEffectDetails(payload.effects));
  const financialDetails = compactDetails([
    metaMoneyDetail("Цена", payload.meta, "price"),
    metaMoneyDetail("Первоначальный взнос", payload.meta, "down_payment"),
    metaMoneyDetail("Денежный поток", payload.meta, "cashflow_monthly", "/мес")
  ]);

  return (
    <div
      className={`w-full min-w-0 max-w-full overflow-hidden rounded-lg shadow-[0_8px_20px_rgba(27,57,118,.10)] [overflow-wrap:anywhere] ${appearance.container}`}
    >
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${appearance.badge}`}>
            {cardTypes[cardType] ?? "Карточка"}
          </span>
        </div>
        <div className="mt-2 text-base font-semibold text-neutral-900">{title}</div>
      </div>
      {bodyText ? (
        <div className={`border-t px-3 py-2.5 ${appearance.section}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Описание
          </div>
          <div className="mt-1 whitespace-pre-line text-sm leading-5 text-neutral-800">
            <MoneyBoldText text={bodyText} />
          </div>
        </div>
      ) : null}
      {effectDetails.length > 0 || financialDetails.length > 0 ? (
        <div className={`grid gap-3 border-t px-3 py-2.5 sm:grid-cols-2 ${appearance.section}`}>
          {financialDetails.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Условия
              </div>
              <div className="mt-1 space-y-1 text-sm text-neutral-800">
                {financialDetails.map((detail, index) => (
                  <div key={`${index}-${detail}`}>
                    <MoneyBoldText text={detail} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {effectDetails.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Эффект
              </div>
              <div className="mt-1 space-y-1 text-sm text-neutral-800">
                {effectDetails.map((detail, index) => (
                  <div key={`${index}-${detail}`}>
                    <MoneyBoldText text={detail} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const eventTitles: Record<string, string> = {
  "game:created": "Игра создана",
  "game:started": "Игра запущена",
  "game:paused": "Игра поставлена на паузу",
  "game:resumed": "Игра продолжена",
  "game:period_started": "Начался новый период",
  "game:deleted": "Игра удалена",
  "game:ended": "Игра завершена",
  "bot:decision": "Решение бота",
  "player:joined": "Игрок вошел в комнату",
  "player:added": "Игрок добавлен ведущим",
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
  "paycheck:receive": "Получен cashflow",
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

const cellTypes: Record<string, string> = {
  paycheck: "Расчетный чек",
  deal: "Возможность",
  small_deal: "Малая сделка",
  big_deal: "Крупная сделка",
  market: "Рынок",
  doodad: "Всякая всячина",
  charity: "Благотворительность",
  baby: "Ребенок",
  downsized: "Увольнение"
};

type BoardCellAppearance = {
  tile: string;
  marker: string;
  timelineMarker: string;
};

const defaultBoardCellAppearance: BoardCellAppearance = {
  tile: "border-line bg-white",
  marker: "bg-neutral-400",
  timelineMarker: "bg-neutral-300"
};

const boardCellAppearances: Record<string, BoardCellAppearance> = {
  deal: {
    tile: "border-line bg-[#f5faf2]",
    marker: "bg-[#a8c99a]",
    timelineMarker: "bg-[#d1e3ca]"
  },
  market: {
    tile: "border-line bg-[#f5f6fc]",
    marker: "bg-[#a7add6]",
    timelineMarker: "bg-[#d4d7ec]"
  },
  paycheck: {
    tile: "border-line bg-[#fff9e8]",
    marker: "bg-[#e5c568]",
    timelineMarker: "bg-[#f3e4ad]"
  },
  doodad: {
    tile: "border-line bg-[#fff4f7]",
    marker: "bg-[#dfa1b3]",
    timelineMarker: "bg-[#eecbd5]"
  },
  baby: {
    tile: "border-line bg-[#faf5fc]",
    marker: "bg-[#c5a6d8]",
    timelineMarker: "bg-[#e1d2ea]"
  },
  charity: {
    tile: "border-line bg-[#fff5ed]",
    marker: "bg-[#e6a06c]",
    timelineMarker: "bg-[#f1d1b8]"
  },
  downsized: {
    tile: "border-line bg-[#f7f2f8]",
    marker: "bg-[#9875a8]",
    timelineMarker: "bg-[#d6c5de]"
  }
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
            : "Решение ведущего или администратора"
        ),
        numericDetail("Период", payload.currentPeriod)
      ]);
    case "game:resumed":
    case "game:period_started":
      return compactDetails([
        numericDetail("Период", payload.currentPeriod),
        numericDetail("Всего периодов", payload.periodCount)
      ]);
    case "game:ended":
      return compactDetails([
        textDetail(
          "Причина",
          payload.reason === "financial_freedom"
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
      return compactDetails([
        moneyDetail("Пассивный доход", payload.passiveIncomeCents, "/мес"),
        moneyDetail("Расходы", payload.totalExpensesCents, "/мес")
      ]);
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

function Metric({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 rounded-md bg-surface p-3", className)}>
      <div className="min-h-8 text-xs leading-4 text-neutral-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold leading-5">{value}</div>
    </div>
  );
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

function CashflowEquation({
  state,
  className = ""
}: {
  state: FinancialState;
  className?: string;
}) {
  const scale = Math.max(1, state.totalIncomeCents, state.totalExpensesCents);
  const positive = state.monthlyCashflowCents >= 0;

  return (
    <div className={`rounded-md bg-surface p-3 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Как формируется денежный поток
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
        <div className="min-w-0">
          <div className="text-xs text-neutral-500">Доходы</div>
          <div className="mt-0.5 break-words text-sm font-semibold text-success">
            {money(state.totalIncomeCents)}
          </div>
        </div>
        <span className="text-neutral-400" aria-hidden="true">−</span>
        <div className="min-w-0">
          <div className="text-xs text-neutral-500">Расходы</div>
          <div className="mt-0.5 break-words text-sm font-semibold text-red-700">
            {money(state.totalExpensesCents)}
          </div>
        </div>
        <span className="text-neutral-400" aria-hidden="true">=</span>
        <div className="min-w-0">
          <div className="text-xs text-neutral-500">Денежный поток</div>
          <div
            className={`mt-0.5 break-words text-sm font-semibold ${
              positive ? "text-success" : "text-red-700"
            }`}
          >
            {money(state.monthlyCashflowCents)}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <ProgressBar
          value={state.totalIncomeCents}
          max={scale}
          label={`Общие доходы ${money(state.totalIncomeCents)}`}
          tone="success"
        />
        <ProgressBar
          value={state.totalExpensesCents}
          max={scale}
          label={`Общие расходы ${money(state.totalExpensesCents)}`}
          tone="danger"
        />
      </div>
    </div>
  );
}

type ProgressTone = "neutral" | "success" | "warning" | "danger";

const progressToneClasses: Record<ProgressTone, string> = {
  neutral: "bg-[#8da7c4]",
  success: "bg-[#73a865]",
  warning: "bg-[#d5ad45]",
  danger: "bg-[#cf6679]"
};

function ProgressBar({
  value,
  max,
  label,
  tone = "neutral",
  className = ""
}: {
  value: number;
  max: number;
  label: string;
  tone?: ProgressTone;
  className?: string;
}) {
  const safeMax = Math.max(1, max);
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-neutral-200 ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(safeMax, Math.max(0, value))}
      aria-valuetext={label}
    >
      <div
        className={`h-full rounded-full transition-[width] ${progressToneClasses[tone]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function FinancialFreedomProgress({
  passiveIncomeCents,
  totalExpensesCents,
  className = ""
}: {
  passiveIncomeCents: number;
  totalExpensesCents: number;
  className?: string;
}) {
  const reached = passiveIncomeCents >= totalExpensesCents;
  const target = Math.max(1, totalExpensesCents);
  const percentage = reached
    ? 100
    : Math.round(Math.min(100, Math.max(0, (passiveIncomeCents / target) * 100)));
  const missingCents = Math.max(0, totalExpensesCents - passiveIncomeCents);
  const label = reached
    ? "Финансовая свобода достигнута"
    : `До финансовой свободы не хватает ${money(missingCents)} в месяц`;

  return (
    <div className={`rounded-md bg-surface px-3 py-2.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-neutral-700">Финансовая свобода</span>
        <span className={reached ? "font-semibold text-success" : "font-semibold text-neutral-700"}>
          {percentage}%
        </span>
      </div>
      <ProgressBar
        className="mt-2"
        value={reached ? target : passiveIncomeCents}
        max={target}
        label={label}
        tone={reached ? "success" : "neutral"}
      />
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-neutral-600">
        <span>
          Пассивный доход: <strong>{money(passiveIncomeCents)}</strong>/мес
        </span>
        <span>
          Расходы: <strong>{money(totalExpensesCents)}</strong>/мес
        </span>
      </div>
      <div className={`mt-1 text-xs ${reached ? "text-success" : "text-neutral-600"}`}>
        {label}
      </div>
    </div>
  );
}

function PlayerFreedomMini({
  passiveIncomeCents,
  totalExpensesCents
}: {
  passiveIncomeCents: number;
  totalExpensesCents: number;
}) {
  const target = Math.max(1, totalExpensesCents);
  const reached = passiveIncomeCents >= totalExpensesCents;
  const percentage = reached
    ? 100
    : Math.round(Math.min(100, Math.max(0, (passiveIncomeCents / target) * 100)));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
        <span>Финансовая свобода</span>
        <strong className={reached ? "text-success" : "text-neutral-700"}>
          {percentage}%
        </strong>
      </div>
      <ProgressBar
        className="mt-1.5"
        value={reached ? target : passiveIncomeCents}
        max={target}
        label={`Прогресс игрока к финансовой свободе ${percentage}%`}
        tone={reached ? "success" : "neutral"}
      />
    </div>
  );
}

function FundingProgress({
  availableCents,
  requiredCents,
  label,
  className = ""
}: {
  availableCents: number;
  requiredCents: number;
  label: string;
  className?: string;
}) {
  if (requiredCents <= 0) return null;
  const available = Math.max(0, availableCents);
  const enough = available >= requiredCents;
  const missingCents = Math.max(0, requiredCents - available);
  const progressLabel = enough
    ? `${label}: наличных достаточно`
    : `${label}: не хватает ${money(missingCents)}`;

  return (
    <div
      className={`w-full min-w-0 max-w-full rounded-md border border-line bg-white p-3 ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
        <span className="min-w-0 break-words font-medium text-neutral-700">{label}</span>
        <span
          className={`min-w-0 break-words ${
            enough ? "font-semibold text-success" : "font-semibold text-amber-700"
          }`}
        >
          {enough ? "Денег хватает" : "Нужен кредит"}
        </span>
      </div>
      <ProgressBar
        className="mt-2"
        value={available}
        max={requiredCents}
        label={progressLabel}
        tone={enough ? "success" : "warning"}
      />
      <div className="mt-2 flex min-w-0 flex-wrap justify-between gap-2 text-xs text-neutral-600">
        <span className="min-w-0 break-words">
          Наличные: <strong>{money(available)}</strong>
        </span>
        <span className="min-w-0 break-words">
          Нужно: <strong>{money(requiredCents)}</strong>
        </span>
      </div>
      {!enough ? (
        <div className="mt-1 text-xs text-amber-700">
          Не хватает: <strong>{money(missingCents)}</strong>
        </div>
      ) : null}
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

const expenseSegmentClasses: Record<string, string> = {
  taxes: "bg-[#7b9cc6]",
  home_mortgage: "bg-[#9d82b8]",
  school_debt: "bg-[#66a7a0]",
  car_debt: "bg-[#d59a62]",
  credit_cards: "bg-[#c87383]",
  retail_debt: "bg-[#b99c5d]",
  other_expenses: "bg-[#8b9a73]",
  children: "bg-[#c98aaf]",
  bank_loan: "bg-[#77818f]"
};

function ExpenseComposition({ player }: { player: GamePlayer }) {
  const items = expenseItems(player).filter((item) => item.amountCents > 0);
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  if (total <= 0) return null;

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Структура расходов</span>
        <strong>{money(total)}/мес</strong>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-200"
        role="img"
        aria-label={`Структура ежемесячных расходов на сумму ${money(total)}`}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={expenseSegmentClasses[item.id] ?? "bg-neutral-400"}
            style={{ width: `${(item.amountCents / total) * 100}%` }}
            title={`${item.label}: ${money(item.amountCents)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const percentage = Math.round((item.amountCents / total) * 100);
          return (
            <div key={item.id} className="flex min-w-0 items-center gap-2 text-xs">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${expenseSegmentClasses[item.id] ?? "bg-neutral-400"}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-neutral-600">{item.label}</span>
              <span className="shrink-0 font-semibold">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const debtSegmentClasses: Record<string, string> = {
  home_mortgage: "bg-[#9d82b8]",
  school_debt: "bg-[#66a7a0]",
  car_debt: "bg-[#d59a62]",
  credit_cards: "bg-[#c87383]",
  retail_debt: "bg-[#b99c5d]",
  bank_loan: "bg-[#7b9cc6]"
};

function DebtComposition({
  liabilities,
  currentCashCents,
  monthlyIncomeCents
}: {
  liabilities: PlayerLiability[];
  currentCashCents: number;
  monthlyIncomeCents: number;
}) {
  const grouped = Array.from(
    liabilities.reduce((items, liability) => {
      const current = items.get(liability.type) ?? {
        type: liability.type,
        label: liabilityLabels[liability.type] ?? localizeGameText(liability.name),
        balanceCents: 0,
        paymentCents: 0
      };
      current.balanceCents += liability.balanceCents;
      current.paymentCents += liability.paymentCents;
      items.set(liability.type, current);
      return items;
    }, new Map<string, { type: string; label: string; balanceCents: number; paymentCents: number }>())
      .values()
  ).filter((item) => item.balanceCents > 0);
  const totalBalanceCents = grouped.reduce((sum, item) => sum + item.balanceCents, 0);
  const totalPaymentCents = grouped.reduce((sum, item) => sum + item.paymentCents, 0);
  if (totalBalanceCents <= 0) return null;
  const burdenRatio =
    monthlyIncomeCents > 0
      ? totalPaymentCents / monthlyIncomeCents
      : totalPaymentCents > 0
        ? 1
        : 0;
  const burdenPercent = Math.round(burdenRatio * 100);
  const burdenTone: ProgressTone =
    burdenRatio >= 0.5 ? "danger" : burdenRatio >= 0.3 ? "warning" : "neutral";

  return (
    <div className="mt-3 rounded-md bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        <span className="font-medium">Структура долгов</span>
        <div className="text-right">
          <div className="font-semibold">{money(totalBalanceCents)}</div>
          <div className="text-xs text-neutral-500">
            {money(totalPaymentCents)}/мес
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
            <span>Платежи от дохода</span>
            <strong className={burdenRatio >= 0.5 ? "text-red-700" : "text-neutral-800"}>
              {burdenPercent}%
            </strong>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={totalPaymentCents}
            max={Math.max(1, monthlyIncomeCents)}
            label={`Долговые платежи занимают ${burdenPercent}% ежемесячного дохода`}
            tone={burdenTone}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
            <span>Покрытие наличными</span>
            <strong>
              {Math.round(
                Math.min(1, Math.max(0, currentCashCents / totalBalanceCents)) * 100
              )}
              %
            </strong>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={Math.max(0, currentCashCents)}
            max={totalBalanceCents}
            label={`Наличными покрывается ${money(Math.min(currentCashCents, totalBalanceCents))} из долга ${money(totalBalanceCents)}`}
            tone={currentCashCents >= totalBalanceCents ? "success" : "neutral"}
          />
        </div>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-200"
        role="img"
        aria-label={`Общая задолженность ${money(totalBalanceCents)}, ежемесячный платёж ${money(totalPaymentCents)}`}
      >
        {grouped.map((item) => (
          <div
            key={item.type}
            className={debtSegmentClasses[item.type] ?? "bg-neutral-400"}
            style={{ width: `${(item.balanceCents / totalBalanceCents) * 100}%` }}
            title={`${item.label}: ${money(item.balanceCents)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {grouped.map((item) => (
          <div key={item.type} className="flex min-w-0 items-center gap-2 text-xs">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-sm ${debtSegmentClasses[item.type] ?? "bg-neutral-400"}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-neutral-600">{item.label}</span>
            <span className="shrink-0 font-semibold">
              {Math.round((item.balanceCents / totalBalanceCents) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionList({
  title,
  titleAlign = "left",
  rows
}: {
  title: string;
  titleAlign?: "left" | "right";
  rows: Array<{ id: string; label: string; value: string; calculation?: string | null }>;
}) {
  return (
    <div>
      <div
        className={[
          "mb-2 text-sm font-medium",
          titleAlign === "right" ? "text-right" : "text-left"
        ].join(" ")}
      >
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">Пусто</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{row.label}</span>
              <span className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums">
                {row.calculation ? (
                  <span className="text-xs text-neutral-500">{row.calculation}</span>
                ) : null}
                <span className="font-medium">{row.value}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChildrenMarks({ count, size = "md" }: { count: number; size?: "sm" | "md" }) {
  if (count <= 0) return null;

  return (
    <span
      className="flex shrink-0 items-center gap-0.5 text-[#718866]"
      role="img"
      aria-label={`Детей: ${count}`}
      title={`Детей: ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <Baby
          key={index}
          size={size === "sm" ? 14 : 16}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function latestDealCard(
  events: GameEvent[],
  pendingAction: GameSnapshot["game"]["pendingAction"]
) {
  if (
    pendingAction?.type !== "deal_card_drawn" &&
    pendingAction?.type !== "stock_sale_window"
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
    cardId: Number(event.payload.id),
    title: localizeGameText(title),
    bodyText: localizeGameText(bodyText),
    priceCents,
    downPaymentCents,
    cashflowCents: cashflowDelta || metaCents(meta, "cashflow_monthly"),
    isStock
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

function formatPeriodTime(totalSeconds: number) {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
