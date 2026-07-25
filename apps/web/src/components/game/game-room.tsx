"use client";

import { realtimeEvents } from "@cashflow/shared";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CSSProperties,
  FormEvent,
  ReactNode,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSetGameRoomHeader } from "@/components/layout/game-room-header-context";
import { publicApiBaseUrl, publicSocketBaseUrl, publicSocketPath } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { GameEvent, GamePlayer, GameSnapshot, PlayerLiability } from "@/lib/types";

type GameActionResult = {
  snapshot?: GameSnapshot;
  events?: Array<{ type: string; payload: Record<string, unknown> }>;
  message?: string;
};

type TurnAnimationPhase = "ready" | "rolling" | "moving" | "landed" | "closing";

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
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState(1000);
  const [dealQuantity, setDealQuantity] = useState<number | "">(1);
  const [turnPopupOpen, setTurnPopupOpen] = useState(false);
  const [turnAnimationPhase, setTurnAnimationPhase] = useState<TurnAnimationPhase>("ready");
  const [animatedPosition, setAnimatedPosition] = useState<number | null>(null);
  const [turnTabRequest, setTurnTabRequest] = useState(0);
  const [turnPopupOrigin, setTurnPopupOrigin] = useState({ x: 0, y: 0 });
  const [rollingDice, setRollingDice] = useState(false);
  const [diceFaces, setDiceFaces] = useState([6]);
  const [stockSaleQuantity, setStockSaleQuantity] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [changingParticipation, setChangingParticipation] = useState(false);
  const [gameEndOpen, setGameEndOpen] = useState(initialSnapshot.game.status === "ENDED");
  const socketRef = useRef<Socket | null>(null);
  const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileBoardRef = useRef<HTMLDivElement>(null);
  const turnPopupClosingRef = useRef(false);
  const expirationRefreshRef = useRef(false);
  const previousGameStatusRef = useRef(initialSnapshot.game.status);
  const setGameRoomHeader = useSetGameRoomHeader();

  useEffect(() => {
    const socket = io(`${publicSocketBaseUrl()}/games`, {
      auth: { token },
      path: publicSocketPath(),
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("game:join", { gameId: initialSnapshot.game.id });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on(realtimeEvents.stateUpdate, (value: GameSnapshot) => {
      if (!value?.game?.id) return;
      if (value.game.status === "CANCELLED") {
        leaveGamePage();
        return;
      }
      setSnapshot(value);
    });
    socket.on("game:deleted", () => leaveGamePage());
    socket.on(realtimeEvents.chatMessage, (message) => {
      setSnapshot((current) => ({
        ...current,
        chatMessages: [...current.chatMessages, message]
      }));
    });
    socket.on("connect_error", (event) => setError(event.message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [initialSnapshot.game.id, token, router]);

  useEffect(() => {
    return () => {
      stopDiceAnimation();
    };
  }, []);

  useEffect(() => {
    const deadlineAt = snapshot.game.deadlineAt;
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
        const response = await fetch(
          `${publicApiBaseUrl()}/api/games/${snapshot.game.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          setSnapshot((await response.json()) as GameSnapshot);
        }
      } finally {
        expirationRefreshRef.current = false;
      }
    };

    void updateTimer();
    const interval = window.setInterval(() => void updateTimer(), 1000);
    return () => window.clearInterval(interval);
  }, [snapshot.game.deadlineAt, snapshot.game.id, snapshot.game.status, token]);

  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.game.currentPlayerId
  );
  const gamePlayers = snapshot.players.filter((player) => player.role === "PLAYER");
  const winner = gamePlayers.find((player) => Boolean(player.financialState?.wonAt));
  const me = gamePlayers.find((player) => player.userId === currentUserId);
  const gameEndEvent = [...snapshot.events]
    .reverse()
    .find((event) => event.type === realtimeEvents.gameEnded);
  const selectedPlayer = me ?? gamePlayers[0];
  const canRoll =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.userId === currentUserId &&
    me?.financialState?.bankruptcyStatus !== "LIQUIDATING";
  const isAdmin = currentUserRole === "ADMIN";
  const canManage =
    isAdmin ||
    (currentUserRole === "HOST" && snapshot.game.createdById === currentUserId);
  const canStart =
    snapshot.game.status === "WAITING" &&
    canManage;
  const roomMembership = snapshot.players.find(
    (player) => player.userId === currentUserId && player.status === "JOINED"
  );
  const canChangeHostParticipation =
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
    isMyTurn && Boolean(marketSaleOffer);
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
  const waitingStockSellerCount =
    ownPendingAction?.type === "stock_sale_window"
      ? ownPendingAction.sellerGamePlayerIds.filter(
          (gamePlayerId) => !ownPendingAction.resolvedGamePlayerIds.includes(gamePlayerId)
        ).length
      : 0;
  const stockSaleOffer = useMemo(
    () => stockSaleOfferForPlayer(pendingAction, me),
    [me, pendingAction]
  );
  const latestTurnSummary = useMemo(
    () => latestPlayerActionSummary(snapshot.events, me?.id),
    [me?.id, snapshot.events]
  );

  useEffect(() => {
    setGameRoomHeader({
      title: snapshot.game.title,
      status: snapshot.game.status,
      connected,
      code: snapshot.game.code,
      currentRound: snapshot.game.currentRound,
      currentPlayerName: currentPlayer?.user?.displayName ?? null,
      onDeleteGame: canManage ? deleteGame : null
    });

    return () => setGameRoomHeader(null);
  }, [
    canManage,
    connected,
    currentPlayer?.user?.displayName,
    setGameRoomHeader,
    snapshot.game.code,
    snapshot.game.currentRound,
    snapshot.game.status,
    snapshot.game.title
  ]);

  useEffect(() => {
    setDealQuantity(1);
  }, [latestBuyableCard?.cardId]);

  useEffect(() => {
    setStockSaleQuantity(1);
  }, [stockSaleOffer?.cardId, stockSaleOffer]);

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
      setAnimatedPosition(me?.position ?? null);
      setTurnAnimationPhase("ready");
      setTurnPopupOrigin(popupOriginFrom(mobileBoardRef.current));
      turnPopupClosingRef.current = false;
      setTurnPopupOpen(true);
    } else if (!rollingDice) {
      setTurnPopupOpen(false);
    }
  }, [activeDiceCount, canRoll, me?.position, pendingAction, rollingDice]);

  async function startGame() {
    setError(null);
    if (socketRef.current?.connected) {
      try {
        const result = await emitWithAck("game:start", {});
        applyActionResult(result);
      } catch (event) {
        setError(event instanceof Error ? event.message : "Не удалось начать партию");
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
      setError(result.message ?? "Не удалось начать партию");
      return;
    }
    setSnapshot(result.snapshot ?? result);
  }

  async function addUserToGame(body: { email: string; role: string }) {
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
      setError(result.message ?? "Не удалось добавить пользователя");
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
        setError(result.message ?? "Не удалось изменить участие ведущего");
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
        setError(event instanceof Error ? event.message : "Не удалось удалить игру");
      }
      return;
    }

    const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Не удалось удалить игру");
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
        reject(new Error("Realtime-соединение не активно"));
        return;
      }
      socket.emit(
        event,
        {
          gameId: snapshot.game.id,
          ...payload
        },
        (result: GameActionResult) => {
          resolve(result);
        }
      );
    });
  }

  function applyActionResult(result: GameActionResult) {
    if (result.snapshot?.game?.id) {
      if (result.snapshot.game.status === "CANCELLED") {
        leaveGamePage();
        return;
      }
      setSnapshot(result.snapshot);
    }
  }

  function leaveGamePage() {
    router.replace("/dashboard");
    router.refresh();
  }

  async function rollDice() {
    if (rollingDice) return;
    setError(null);
    turnPopupClosingRef.current = false;
    setTurnPopupOpen(true);
    setRollingDice(true);
    setTurnAnimationPhase("rolling");
    setAnimatedPosition(me?.position ?? null);
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
        if (reduceMotion) {
          setAnimatedPosition(move.to);
        } else {
          for (let step = 1; step <= move.steps; step += 1) {
            setAnimatedPosition(normalizeBoardPosition(move.from + step, snapshot.board.length));
            await wait(220);
          }
        }
      }

      setTurnAnimationPhase("landed");
      await wait(2500);
      await closeTurnPopup();
    } catch (event) {
      stopDiceAnimation();
      setTurnAnimationPhase("ready");
      setError(event instanceof Error ? event.message : "Не удалось бросить кубик");
    } finally {
      setRollingDice(false);
    }
  }

  async function closeTurnPopup() {
    if (turnPopupClosingRef.current || !turnPopupOpen) return;
    turnPopupClosingRef.current = true;
    setTurnAnimationPhase("closing");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) await wait(280);
    setTurnPopupOpen(false);
    setAnimatedPosition(null);
    setTurnTabRequest((current) => current + 1);
  }

  async function skipTurn() {
    if (rollingDice) return;
    setError(null);
    try {
      const result = await emitWithAck("turn:skip", {});
      applyActionResult(result);
      await closeTurnPopup();
    } catch (event) {
      setError(event instanceof Error ? event.message : "Не удалось пропустить ход");
    }
  }

  function draw(cardType: string) {
    emit(realtimeEvents.cardDraw, { cardType });
  }

  function buyLatestDeal() {
    if (!latestBuyableCard) return;
    if (latestBuyableCard.isStock && (!dealQuantity || dealQuantity < 1)) return;
    emit(realtimeEvents.dealBuy, {
      cardId: latestBuyableCard.cardId,
      quantity: latestBuyableCard.isStock ? dealQuantity : 1
    });
  }

  function declineLatestDeal() {
    emit("deal:decline", {});
  }

  function sellMarketAsset() {
    emit("market:sell", {});
  }

  function sellStockFromDeal() {
    if (!stockSaleOffer) return;
    emit("stock:sell", {
      quantity: Math.min(stockSaleQuantity, stockSaleOffer.quantity)
    });
  }

  function declineStockSale() {
    emit("stock:decline", {});
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
      setError(event instanceof Error ? event.message : "Не удалось закрыть кредит");
    }
  }

  async function takeLoan() {
    setError(null);
    try {
      const result = await emitWithAck(realtimeEvents.loanTake, { amountCents: loanAmount });
      applyActionResult(result);
    } catch (event) {
      setError(event instanceof Error ? event.message : "Не удалось взять кредит");
    }
  }

  async function sellBankruptcyAsset(assetId: string, quantity: number) {
    setError(null);
    try {
      const result = await emitWithAck("bankruptcy:asset_sell", { assetId, quantity });
      applyActionResult(result);
    } catch (event) {
      setError(event instanceof Error ? event.message : "Не удалось продать актив банку");
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
      setError(event instanceof Error ? event.message : "Не удалось погасить долг");
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
    if (value === "") {
      setDealQuantity("");
      return;
    }
    const normalized = Math.floor(Number(value));
    setDealQuantity(Number.isFinite(normalized) ? normalized : "");
  }

  function updateStockSaleQuantity(value: number) {
    const maxQuantity = stockSaleOffer?.quantity ?? 1;
    const normalized = Math.max(Math.floor(Number(value) || 1), 1);
    setStockSaleQuantity(Math.min(normalized, maxQuantity));
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

  return (
    <div className="grid w-full min-w-0 max-w-full gap-5 overflow-x-clip">
      <TurnPopup
        open={turnPopupOpen}
        snapshot={snapshot}
        player={me}
        animatedPosition={animatedPosition}
        phase={turnAnimationPhase}
        origin={turnPopupOrigin}
        diceValues={diceFaces}
        rolling={turnAnimationPhase === "rolling"}
        onRoll={rollDice}
        onSkip={skipTurn}
        onDismiss={closeTurnPopup}
      />
      <GameEndPopup
        open={gameEndOpen && snapshot.game.status === "ENDED"}
        winner={winner}
        player={me}
        reason={typeof gameEndEvent?.payload.reason === "string" ? gameEndEvent.payload.reason : null}
        onClose={() => setGameEndOpen(false)}
      />
      {me?.financialState?.bankruptcyStatus === "LIQUIDATING" ? (
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
      {snapshot.game.status === "IN_PROGRESS" && remainingSeconds !== null ? (
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm">
          До завершения партии:{" "}
          <span className="font-semibold">{formatRemainingTime(remainingSeconds)}</span>
        </div>
      ) : snapshot.game.status === "ENDED" ? (
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium">
          {winner
            ? `Победитель: ${winner.user?.displayName ?? "Игрок"}`
            : "Партия завершена по времени"}
        </div>
      ) : null}

      <div className="hidden xl:block">
        <DesktopGameBoard
          snapshot={snapshot}
          selectedPlayer={selectedPlayer}
          canManageLiabilities={selectedPlayer?.id === me?.id && canTakeLoan}
          onCloseLiability={closeLiability}
          outsidePlayers={snapshot.players.filter(
            (player) =>
              player.role === "PLAYER" &&
              player.track === "RAT_RACE" &&
              player.position < 0
          )}
        >
          <ActionsPanel
            onStartGame={startGame}
            canStart={canStart}
            canChooseDeal={canChooseDeal}
            onDrawSmallDeal={() => draw("SMALL_DEAL")}
            onDrawBigDeal={() => draw("BIG_DEAL")}
            latestCard={latestDealDecisionCard}
            latestTurnSummary={latestTurnSummary}
            charityChoice={charityChoice}
            canAnswerCharity={canAnswerCharity}
            doodadPaymentChoice={doodadPaymentChoice}
            canAnswerDoodadPayment={canAnswerDoodadPayment}
            marketSaleOffer={marketSaleOffer}
            canAnswerMarketSale={canAnswerMarketSale}
            currentCashCents={me?.financialState?.cashCents ?? 0}
            waitingStockSellerCount={waitingStockSellerCount}
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
            onStockSaleDecrease={() => updateStockSaleQuantity(stockSaleQuantity - 1)}
            onStockSaleIncrease={() => updateStockSaleQuantity(stockSaleQuantity + 1)}
            onSellStock={sellStockFromDeal}
            onDeclineStockSale={declineStockSale}
            loanAmount={loanAmount}
            onLoanDecrease={() => changeLoanAmount(-1000)}
            onLoanIncrease={() => changeLoanAmount(1000)}
            onLoanAmountChange={updateLoanAmount}
            onTakeLoan={takeLoan}
            canTakeLoan={canTakeLoan}
            embedded
          />
        </DesktopGameBoard>
      </div>

      {canManage && snapshot.game.status === "WAITING" ? (
        <div className="hidden xl:block">
          <HostPanel
            code={snapshot.game.code}
            onAddUser={addUserToGame}
            canChangeParticipation={canChangeHostParticipation}
            participates={roomMembership?.role === "PLAYER"}
            changingParticipation={changingParticipation}
            onChangeParticipation={changeHostParticipation}
          />
        </div>
      ) : null}

      <div className="grid w-full min-w-0 max-w-full gap-5 overflow-x-clip xl:hidden">
        <div className="grid w-full min-w-0 max-w-full gap-2">
          <MobileBoard
            snapshot={snapshot}
            selectedPlayer={selectedPlayer}
            containerRef={mobileBoardRef}
          />
          <MobileGameTabs
            player={selectedPlayer}
            canManageLiabilities={selectedPlayer?.id === me?.id && canTakeLoan}
            onCloseLiability={closeLiability}
            actionAttentionKey={
              canStart
                ? "start_game"
                : ownPendingAction?.type ?? (stockSaleOffer ? "stock_sale_window" : null)
            }
            turnTabRequest={turnTabRequest}
            actions={
              <ActionsPanel
                onStartGame={startGame}
                canStart={canStart}
                canChooseDeal={canChooseDeal}
                onDrawSmallDeal={() => draw("SMALL_DEAL")}
                onDrawBigDeal={() => draw("BIG_DEAL")}
                latestCard={latestDealDecisionCard}
                latestTurnSummary={latestTurnSummary}
                charityChoice={charityChoice}
                canAnswerCharity={canAnswerCharity}
                doodadPaymentChoice={doodadPaymentChoice}
                canAnswerDoodadPayment={canAnswerDoodadPayment}
                marketSaleOffer={marketSaleOffer}
                canAnswerMarketSale={canAnswerMarketSale}
                currentCashCents={me?.financialState?.cashCents ?? 0}
                waitingStockSellerCount={waitingStockSellerCount}
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
                onStockSaleDecrease={() => updateStockSaleQuantity(stockSaleQuantity - 1)}
                onStockSaleIncrease={() => updateStockSaleQuantity(stockSaleQuantity + 1)}
                onSellStock={sellStockFromDeal}
                onDeclineStockSale={declineStockSale}
                loanAmount={loanAmount}
                onLoanDecrease={() => changeLoanAmount(-1000)}
                onLoanIncrease={() => changeLoanAmount(1000)}
                onLoanAmountChange={updateLoanAmount}
                onTakeLoan={takeLoan}
                canTakeLoan={canTakeLoan}
                embedded
              />
            }
          />
        </div>
        {canManage && snapshot.game.status === "WAITING" ? (
          <HostPanel
            code={snapshot.game.code}
            onAddUser={addUserToGame}
            canChangeParticipation={canChangeHostParticipation}
            participates={roomMembership?.role === "PLAYER"}
            changingParticipation={changingParticipation}
            onChangeParticipation={changeHostParticipation}
          />
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EventLog
          events={snapshot.events}
          currentUserId={currentUserId}
          players={gamePlayers}
          currentPlayerId={snapshot.game.currentPlayerId}
        />
        <ChatPanel
          messages={snapshot.chatMessages}
          onSend={(body) => emit("chat:send", { body })}
        />
      </div>
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

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bankruptcy-title"
        className="mx-auto w-full max-w-3xl rounded-md border border-red-300 bg-white p-5 shadow-panel"
      >
        <h2 id="bankruptcy-title" className="text-xl font-semibold text-red-800">
          Объявлено банкротство
        </h2>
        <p className="mt-2 text-sm text-neutral-700">
          Денежный поток: {money(state.monthlyCashflowCents)} · наличные: {money(state.cashCents)} ·
          месячный дефицит: {money(deficit)}. Продайте активы банку и направьте деньги на долги,
          пока денежный поток не станет положительным.
        </p>

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
                  <div className="text-sm font-medium">{asset.name}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Количество: {asset.quantity} · выплата: {money(Math.floor(asset.downPaymentCents / 2))}
                    {asset.cashflowCents !== 0 ? ` · cashflow: ${money(asset.cashflowCents)}` : ""}
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
                    {liabilityLabels[liability.type] ?? liability.name}
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

function TurnPopup({
  open,
  snapshot,
  player,
  animatedPosition,
  phase,
  origin,
  diceValues,
  rolling,
  onRoll,
  onSkip,
  onDismiss
}: {
  open: boolean;
  snapshot: GameSnapshot;
  player: GamePlayer | undefined;
  animatedPosition: number | null;
  phase: TurnAnimationPhase;
  origin: { x: number; y: number };
  diceValues: number[];
  rolling: boolean;
  onRoll: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/30 px-4 py-5",
        phase === "closing" ? "turn-popup-backdrop-closing" : "turn-popup-backdrop-opening"
      ].join(" ")}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="turn-popup-title"
        style={
          {
            "--turn-popup-x": `${origin.x}px`,
            "--turn-popup-y": `${origin.y}px`
          } as CSSProperties
        }
        className={[
          "max-h-[calc(100dvh-2.5rem)] w-full min-w-0 max-w-xl overflow-x-hidden overflow-y-auto rounded-md border border-line bg-white p-4 text-center shadow-panel sm:p-5 xl:max-w-xs",
          phase === "closing" ? "turn-popup-panel-closing" : "turn-popup-panel-opening"
        ].join(" ")}
      >
        <h2 id="turn-popup-title" className="text-xl font-semibold">
          {phase === "moving"
            ? "Двигаемся по полю"
            : phase === "landed"
              ? "Новая клетка"
              : "Ваш ход!"}
        </h2>
        <div className="mt-4 min-w-0 max-w-full overflow-hidden xl:hidden">
          <PopupBoard
            snapshot={snapshot}
            player={player}
            animatedPosition={animatedPosition}
          />
        </div>
        <div className="mt-4 flex justify-center gap-3">
          {diceValues.map((diceValue, index) => (
            <DiceFace key={index} value={diceValue} rolling={rolling} />
          ))}
        </div>
        {phase === "ready" ? (
          <>
            <Button className="mt-5 w-full" onClick={onRoll}>
              {diceValues.length > 1 ? "Бросить кубики" : "Бросить кубик"}
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="mt-3 text-xs text-neutral-500 underline-offset-4 hover:text-ink hover:underline"
            >
              Пропустить ход
            </button>
          </>
        ) : phase === "landed" ? (
          <Button className="mt-5 w-full" variant="secondary" onClick={onDismiss}>
            Перейти к ходу
          </Button>
        ) : (
          <p className="mt-4 text-sm text-neutral-500" aria-live="polite">
            {phase === "rolling" ? "Бросаем кубик..." : "Фишка движется..."}
          </p>
        )}
      </div>
    </div>
  );
}

function PopupBoard({
  snapshot,
  player,
  animatedPosition
}: {
  snapshot: GameSnapshot;
  player: GamePlayer | undefined;
  animatedPosition: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetCellIndex = animatedPosition ?? (player && player.position >= 0 ? player.position : 0);

  useEffect(() => {
    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-popup-board-cell="${targetCellIndex}"]`
    );
    target?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [targetCellIndex]);

  return (
    <div
      ref={scrollRef}
      className="grid w-full min-w-0 max-w-full snap-x snap-mandatory grid-flow-col auto-cols-[clamp(88px,27vw,136px)] gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-[40%] pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Малый круг"
    >
      {snapshot.board.map((cell) => {
        const players = animatedCellPlayers(snapshot, cell.index, player, animatedPosition);
        return (
          <div
            key={cell.index}
            data-popup-board-cell={cell.index}
            className="min-w-0 snap-center"
          >
            <BoardCellTile
              cell={cell}
              players={players}
              active={cell.index === targetCellIndex}
              mobile
            />
          </div>
        );
      })}
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
  const description = winner
    ? `${winner.user?.displayName ?? "Игрок"} достиг финансовой свободы`
    : reason === "all_players_bankrupt"
      ? "Все игроки выбыли из-за банкротства"
      : "Время партии истекло — победителя нет";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-end-title"
        aria-describedby="game-end-description"
        className="w-full max-w-xl rounded-md border border-line bg-white p-5 shadow-panel sm:p-6"
      >
        <div className="text-center">
          <div className="text-4xl" aria-hidden="true">🏆</div>
          <h2 id="game-end-title" className="mt-3 text-2xl font-semibold">
            Игра окончена
          </h2>
          <p id="game-end-description" className="mt-2 text-sm text-neutral-600">
            {description}
          </p>
        </div>

        {winnerState ? (
          <section className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900">Результат победителя</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric label="Пассивный доход" value={money(winnerState.passiveIncomeCents)} />
              <Metric label="Расходы" value={money(winnerState.totalExpensesCents)} />
              <Metric label="Денежный поток" value={money(winnerState.monthlyCashflowCents)} />
            </div>
          </section>
        ) : null}

        {playerState ? (
          <section className="mt-4 rounded-md border border-line bg-surface p-4">
            <h3 className="font-semibold">Ваш результат</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric label="Наличные" value={money(playerState.cashCents)} />
              <Metric label="Пассивный доход" value={money(playerState.passiveIncomeCents)} />
              <Metric label="Денежный поток" value={money(playerState.monthlyCashflowCents)} />
            </div>
          </section>
        ) : null}

        <Button className="mt-5 w-full" onClick={onClose}>
          {playerState ? "Посмотреть свои результаты" : "Закрыть"}
        </Button>
      </div>
    </div>
  );
}

function StockSalePanel({
  offer,
  quantity,
  onQuantityChange,
  onDecrease,
  onIncrease,
  onSell,
  onDecline
}: {
  offer: NonNullable<ReturnType<typeof stockSaleOfferForPlayer>>;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onSell: () => void;
  onDecline: () => void;
}) {
  const saleTotalCents = offer.salePriceCents * quantity;

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Продажа акций</div>
          <p className="mt-1 text-sm text-neutral-600">{offer.title}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-md border border-line bg-white p-3 text-sm">
        <AssetInfoRow label="Тикер" value={offer.symbol} />
        <AssetInfoRow label="Доступно акций" value={String(offer.quantity)} />
        <AssetInfoRow label="Цена за акцию" value={money(offer.salePriceCents)} />
      </div>

      <div className="mt-4 rounded-md border border-line bg-white p-3">
        <div className="text-sm font-medium">Количество на продажу</div>
        <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <Button
            variant="secondary"
            className="px-3"
            onClick={onDecrease}
            disabled={quantity <= 1}
          >
            &lt;
          </Button>
          <Input
            type="number"
            min={1}
            max={offer.quantity}
            step={1}
            value={quantity}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
            className="text-center font-semibold"
          />
          <Button
            variant="secondary"
            className="px-3"
            onClick={onIncrease}
            disabled={quantity >= offer.quantity}
          >
            &gt;
          </Button>
        </div>
        <div className="mt-3 rounded-md bg-surface px-3 py-2 text-sm">
          <div className="text-neutral-600">Сумма продажи</div>
          <div className="mt-1 font-semibold">
            {quantity} x {money(offer.salePriceCents)} = {money(saleTotalCents)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={onSell}>Продать</Button>
        <Button variant="secondary" onClick={onDecline}>
          Не продавать
        </Button>
      </div>
    </div>
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

function popupOriginFrom(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") return { x: 0, y: 0 };
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - window.innerWidth / 2,
    y: rect.top + rect.height / 2 - window.innerHeight / 2
  };
}

function randomDiceValues(diceCount: number) {
  return Array.from({ length: Math.max(1, diceCount) }, () => Math.floor(Math.random() * 6) + 1);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatRemainingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function HostPanel({
  code,
  onAddUser,
  canChangeParticipation,
  participates,
  changingParticipation,
  onChangeParticipation
}: {
  code: string;
  onAddUser: (body: { email: string; role: string }) => void;
  canChangeParticipation: boolean;
  participates: boolean;
  changingParticipation: boolean;
  onChangeParticipation: (participates: boolean) => void;
}) {
  const [inviteUrl, setInviteUrl] = useState(`/join/${code}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/join/${code}`);
  }, [code]);

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const role = String(form.get("role") ?? "PLAYER");
    if (!email) return;
    onAddUser({ email, role });
    event.currentTarget.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ведущий</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Ссылка-приглашение</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input value={inviteUrl} readOnly aria-label="Ссылка-приглашение" />
            <Button type="button" variant="secondary" onClick={copyInvite}>
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            Пользователь войдёт в комнату как игрок после авторизации.
          </p>
        </div>
        {canChangeParticipation ? (
          <div className="rounded-md border border-line bg-surface p-3">
            <div className="text-sm font-medium">Участие ведущего</div>
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
        <form className="grid gap-2" onSubmit={submit}>
          <Input name="email" type="email" placeholder="Email пользователя" required />
          <select
            name="role"
            className="h-10 rounded-md border border-line bg-white px-3 text-sm"
            defaultValue="PLAYER"
          >
            <option value="PLAYER">Игрок</option>
            <option value="BANKER">Банкир</option>
            <option value="OBSERVER">Наблюдатель</option>
          </select>
          <Button type="submit">Добавить в игру</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DesktopGameBoard({
  snapshot,
  selectedPlayer,
  canManageLiabilities,
  onCloseLiability,
  outsidePlayers,
  children
}: {
  snapshot: GameSnapshot;
  selectedPlayer: GamePlayer | undefined;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
  outsidePlayers: GamePlayer[];
  children: ReactNode;
}) {
  return (
    <section className="w-full rounded-md border border-line bg-white p-3 shadow-panel">
      <div className="grid grid-cols-[repeat(8,145px)] grid-rows-[repeat(6,105px)] justify-center gap-2 overflow-x-auto">
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
          className="grid min-h-0 grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] gap-3 rounded-md border border-line bg-surface p-3"
          style={{ gridColumn: "2 / 8", gridRow: "2 / 6" }}
        >
          <DesktopFinancialPanel
            player={selectedPlayer}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
            outsidePlayers={outsidePlayers}
          />
          <div className="min-h-0 overflow-y-auto rounded-md border border-line bg-white p-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopFinancialPanel({
  player,
  canManageLiabilities,
  onCloseLiability,
  outsidePlayers
}: {
  player: GamePlayer | undefined;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
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

  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
      <div className="rounded-md border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{player.user?.displayName ?? "Игрок"}</h2>
            <div className="mt-1 text-sm text-neutral-500">{player.profession?.name}</div>
          </div>
          <Badge className="bg-surface text-ink">финансовый отчёт</Badge>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          <Metric label="Наличные" value={money(state.cashCents)} />
          <Metric label="Зарплата" value={money(state.salaryCents)} />
          <Metric label="Денежный поток" value={money(state.monthlyCashflowCents)} />
          <Metric label="Пассивный доход" value={money(state.passiveIncomeCents)} />
          <Metric label="Расходы" value={money(state.totalExpensesCents)} />
        </div>
        {outsidePlayers.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>Вне поля</span>
            {outsidePlayers.map((outsidePlayer) => (
              <PlayerToken key={outsidePlayer.id} player={outsidePlayer} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 grid-rows-[auto_auto] gap-3 overflow-y-auto pr-1">
        <DesktopAssetsSection assets={player.assets} />
        <FinancialTabs
          player={player}
          canManageLiabilities={canManageLiabilities}
          onCloseLiability={onCloseLiability}
        />
      </div>
    </div>
  );
}

function DesktopAssetsSection({ assets }: { assets: GamePlayer["assets"] }) {
  if (assets.length === 0) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2">
        <h3 className="text-sm font-semibold">Активы</h3>
        <span className="text-sm text-neutral-600">
          Активов пока нет, но амбиции уже на балансе!
        </span>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-line bg-white p-3">
      <h3 className="text-sm font-semibold">Активы</h3>
      <div className="mt-3">
        <CompactAssets assets={assets} />
      </div>
    </section>
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

  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
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
  const outsidePlayers = snapshot.players.filter(
    (player) =>
      player.role === "PLAYER" &&
      player.track === "RAT_RACE" &&
      player.position < 0
  );
  const targetCell = snapshot.board[targetCellIndex];

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
      <Card className="min-w-0 max-w-full overflow-hidden">
        <div className="px-3 pb-1 pt-2 text-center">
          <div className="truncate text-sm font-semibold">
            Клетка {targetCellIndex + 1} · {targetCell?.label ?? "Малый круг"}
          </div>
        </div>
        {outsidePlayers.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-1 px-3 pb-1">
            <span className="text-xs text-neutral-500">Вне поля</span>
            {outsidePlayers.map((player) => (
              <PlayerToken key={player.id} player={player} small />
            ))}
          </div>
        ) : null}
        <div
          ref={scrollRef}
          className="grid w-full min-w-0 max-w-full snap-x snap-mandatory grid-flow-col auto-cols-[44px] overflow-x-auto overscroll-x-contain scroll-smooth px-[calc(50%_-_22px)] pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                aria-label={`Клетка ${cell.index + 1}: ${cell.label}`}
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
                <div className="mt-1 flex min-h-4 flex-wrap justify-center gap-0.5">
                  {players.map((player) => (
                    <PlayerToken
                      key={player.id}
                      player={player}
                      small
                      moving={player.id === animatedOtherPlayer?.playerId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
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
          ? "h-[105px] w-[145px] p-3"
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
        className={
          mobile ? "grid gap-1 pt-1" : "flex items-start justify-between gap-2 pt-1"
        }
      >
        <span
          className={
            compact || mobile
              ? "text-lg font-bold text-neutral-700"
              : "text-xs font-semibold text-neutral-600"
          }
        >
          {cell.index + 1}
        </span>
        <Badge
          className={[
            "justify-center bg-transparent text-center font-semibold leading-tight text-ink",
            compact ? "max-w-[7rem] px-2 text-[11px]" : "",
            mobile
              ? "w-full max-w-full px-1 py-1 text-[10px] [overflow-wrap:anywhere]"
              : ""
          ].join(" ")}
        >
          {cellTypes[cell.type] ?? cell.type}
        </Badge>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
        {players.map((player) => (
          <PlayerToken key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}

function PlayerToken({
  player,
  small = false,
  moving = false
}: {
  player: GamePlayer;
  small?: boolean;
  moving?: boolean;
}) {
  return (
    <span
      className={[
        "rounded text-center font-semibold text-white",
        small ? "h-4 min-w-4 px-0.5 text-[9px] leading-4" : "h-5 min-w-5 px-1 text-xs",
        moving ? "timeline-moving-token" : ""
      ].join(" ")}
      style={{ backgroundColor: player.color ?? "#171717" }}
      title={player.user?.displayName ?? `Игрок ${player.seat ?? ""}`}
    >
      {player.seat}
    </span>
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

function animatedCellPlayers(
  snapshot: GameSnapshot,
  cellIndex: number,
  movingPlayer: GamePlayer | undefined,
  animatedPosition: number | null
) {
  if (!movingPlayer || animatedPosition === null) return cellPlayers(snapshot, cellIndex);

  const players = cellPlayers(snapshot, cellIndex).filter(
    (candidate) => candidate.id !== movingPlayer.id
  );
  if (cellIndex === animatedPosition) players.push(movingPlayer);
  return players;
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

function PlayersGrid({
  players,
  currentPlayerId
}: {
  players: GamePlayer[];
  currentPlayerId: string | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {players.map((player) => (
        <div
          key={player.id}
          className="rounded-md border border-line bg-surface p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">
              {player.user?.displayName ?? player.role}
            </div>
            {currentPlayerId === player.id ? (
              <Badge className="bg-green-100 text-success">ход</Badge>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            seat {player.seat ?? "—"} · {player.role} · {player.track}
          </div>
          <div className="mt-2 text-sm">{player.profession?.name ?? "Профессия не выдана"}</div>
        </div>
      ))}
    </div>
  );
}

type MobileGameTab = "turn" | "player" | "assets" | "expenses" | "liabilities";

function MobileGameTabs({
  player,
  canManageLiabilities,
  onCloseLiability,
  actionAttentionKey,
  turnTabRequest,
  actions
}: {
  player: GamePlayer | undefined;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
  actionAttentionKey: string | null;
  turnTabRequest: number;
  actions: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<MobileGameTab>("turn");
  const state = player?.financialState;
  const assetCount = player?.assets.length ?? 0;
  const liabilities = player ? repayableLiabilityRows(player) : [];
  const actionAttention = Boolean(actionAttentionKey);

  useEffect(() => {
    if (actionAttentionKey) setActiveTab("turn");
  }, [actionAttentionKey]);

  useEffect(() => {
    if (turnTabRequest > 0) setActiveTab("turn");
  }, [turnTabRequest]);

  const tabs: Array<{
    id: MobileGameTab;
    label: string;
    count?: number;
    attention?: boolean;
  }> = [
    { id: "turn", label: "Ход", attention: actionAttention },
    { id: "player", label: "Игрок" },
    { id: "assets", label: "Активы", count: assetCount },
    { id: "expenses", label: "Расходы" },
    { id: "liabilities", label: "Долги", count: liabilities.length }
  ];

  return (
    <Card className="w-full min-w-0 max-w-full">
      <div
        className="grid min-w-0 grid-cols-5 gap-1 border-b border-line bg-surface p-2"
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
                "relative flex h-10 min-w-0 items-center justify-center overflow-hidden rounded-md px-0.5 text-[9px] font-medium transition min-[340px]:text-[10px] min-[380px]:text-xs",
                active
                  ? "bg-ink text-white shadow-sm"
                  : "bg-white text-ink hover:bg-neutral-100"
              ].join(" ")}
            >
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined ? (
                <span
                  className={[
                    "absolute right-0.5 top-0.5 inline-flex min-w-3 justify-center rounded-full px-0.5 text-[8px] leading-3",
                    active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              ) : null}
              {tab.attention ? (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white"
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
        className="min-w-0 max-w-full overflow-x-hidden p-3"
      >
        {activeTab === "turn" ? actions : null}

        {activeTab !== "turn" && (!player || !state) ? (
          <p className="py-2 text-sm text-neutral-600">
            Финансовый отчёт появится после старта партии.
          </p>
        ) : null}

        {activeTab === "player" && player && state ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {player.user?.displayName ?? "Игрок"}
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500">
                  {player.profession?.name}
                </div>
              </div>
              <Badge className="shrink-0 bg-surface text-ink">финансы</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Наличные" value={money(state.cashCents)} />
              <Metric label="Денежный поток" value={money(state.monthlyCashflowCents)} />
              <Metric label="Зарплата" value={money(state.salaryCents)} />
              <Metric label="Пассивный доход" value={money(state.passiveIncomeCents)} />
              <div className="col-span-2">
                <Metric label="Расходы" value={money(state.totalExpensesCents)} />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "assets" && player && state ? (
          <CompactAssets assets={player.assets} />
        ) : null}

        {activeTab === "expenses" && player && state ? (
          <SectionList
            title={money(state.totalExpensesCents)}
            titleAlign="right"
            rows={expenseRows(player)}
          />
        ) : null}

        {activeTab === "liabilities" && player && state ? (
          <CreditList
            liabilities={liabilities}
            currentCashCents={state.cashCents}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
          />
        ) : null}
      </div>
    </Card>
  );
}

function AssetCard({ asset }: { asset: GamePlayer["assets"][number] }) {
  const stock = isStockAsset(asset);

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{asset.name}</div>
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
    </div>
  );
}

function AssetInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span className="shrink-0 font-medium">{value}</span>
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

function FinancialTabs({
  player,
  canManageLiabilities,
  onCloseLiability
}: {
  player: GamePlayer;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
}) {
  const [activeTab, setActiveTab] = useState<"expenses" | "liabilities">("expenses");

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={tabClass(activeTab === "expenses")}
        >
          Расходы
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("liabilities")}
          className={tabClass(activeTab === "liabilities")}
        >
          Долги
        </button>
      </div>
      <div className="mt-4">
        {activeTab === "expenses" ? (
          <SectionList title="Расходы" rows={expenseRows(player)} />
        ) : (
          <CreditList
            liabilities={repayableLiabilityRows(player)}
            currentCashCents={player.financialState?.cashCents ?? 0}
            canManageLiabilities={canManageLiabilities}
            onCloseLiability={onCloseLiability}
          />
        )}
      </div>
    </div>
  );
}

function LoanPanel({
  loanAmount,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan
}: {
  loanAmount: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
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
      <Button className="mt-3 w-full" variant="secondary" onClick={onTakeLoan} disabled={!canTakeLoan}>
        Взять кредит
      </Button>
      <p className="mt-2 text-xs text-neutral-500">
        Доступен во время активной партии. Сумма должна быть кратна {money(1000)}.
      </p>
    </div>
  );
}

function CreditList({
  liabilities,
  currentCashCents,
  canManageLiabilities,
  onCloseLiability
}: {
  liabilities: PlayerLiability[];
  currentCashCents: number;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium">Кредиты</div>
      {liabilities.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">Нет кредитов для закрытия.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {liabilities.map((liability) => {
            const hasEnoughCash = currentCashCents >= liability.balanceCents;
            const canClose = canManageLiabilities && hasEnoughCash;
            return (
              <div
                key={liability.id}
                className="grid gap-2 rounded-md border border-line bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="text-sm font-medium">
                    {liabilityLabels[liability.type] ?? liability.name}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Остаток: {money(liability.balanceCents)}
                    {liability.paymentCents > 0
                      ? ` · платеж: ${money(liability.paymentCents)}/мес`
                      : ""}
                  </div>
                  {canManageLiabilities && !hasEnoughCash ? (
                    <div className="mt-1 text-xs text-red-700">
                      Недостаточно наличных для закрытия.
                    </div>
                  ) : null}
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
      )}
    </div>
  );
}

function tabClass(active: boolean) {
  return [
    "rounded-md px-3 py-2 text-sm font-medium transition",
    active ? "bg-ink text-white" : "bg-white text-ink hover:bg-neutral-100"
  ].join(" ");
}

function expenseRows(player: GamePlayer) {
  const profession = player.profession;
  const state = player.financialState;

  return [
    {
      id: "taxes",
      label: "Налоги",
      value: money(profession?.taxesCents)
    },
    {
      id: "home_mortgage",
      label: "Оплата закладной на дом",
      value: money(
        liabilityPayment(player, "home_mortgage") ?? profession?.mortgagePaymentCents
      )
    },
    {
      id: "school_debt",
      label: "Оплата кредита на образование",
      value: money(
        liabilityPayment(player, "school_debt") ?? profession?.schoolLoanPaymentCents
      )
    },
    {
      id: "car_debt",
      label: "Оплата кредита на автомобиль",
      value: money(liabilityPayment(player, "car_debt") ?? profession?.carLoanPaymentCents)
    },
    {
      id: "credit_cards",
      label: "Выплаты по кредитной карточке",
      value: money(
        liabilityPayment(player, "credit_cards") ?? profession?.creditCardPaymentCents
      )
    },
    {
      id: "retail_debt",
      label: "Розничные расходы",
      value: money(liabilityPayment(player, "retail_debt") ?? profession?.retailPaymentCents)
    },
    {
      id: "other_expenses",
      label: "Другие расходы",
      value: money(profession?.otherExpensesCents)
    },
    {
      id: "children",
      label: "Расходы на детей",
      value: money(
        state ? state.perChildCostCents * state.childrenCount : profession?.childrenExpenseCents
      )
    },
    {
      id: "bank_loan",
      label: "Оплата кредита банка",
      value: money(sumLiabilityPayments(player, "bank_loan"))
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
  onStartGame,
  canStart,
  canChooseDeal,
  onDrawSmallDeal,
  onDrawBigDeal,
  latestCard,
  latestTurnSummary,
  charityChoice,
  canAnswerCharity,
  doodadPaymentChoice,
  canAnswerDoodadPayment,
  marketSaleOffer,
  canAnswerMarketSale,
  currentCashCents,
  waitingStockSellerCount,
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
  onSellStock,
  onDeclineStockSale,
  loanAmount,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan,
  embedded = false
}: {
  onStartGame: () => void;
  canStart: boolean;
  canChooseDeal: boolean;
  onDrawSmallDeal: () => void;
  onDrawBigDeal: () => void;
  latestCard: ReturnType<typeof latestDealCard>;
  latestTurnSummary: ReturnType<typeof latestPlayerActionSummary>;
  charityChoice: Extract<GameSnapshot["game"]["pendingAction"], { type: "charity_choice" }> | null;
  canAnswerCharity: boolean;
  doodadPaymentChoice: Extract<GameSnapshot["game"]["pendingAction"], { type: "doodad_payment_choice" }> | null;
  canAnswerDoodadPayment: boolean;
  marketSaleOffer: Extract<GameSnapshot["game"]["pendingAction"], { type: "market_sale" }> | null;
  canAnswerMarketSale: boolean;
  currentCashCents: number;
  waitingStockSellerCount: number;
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
  stockSaleQuantity: number;
  onStockSaleQuantityChange: (value: number) => void;
  onStockSaleDecrease: () => void;
  onStockSaleIncrease: () => void;
  onSellStock: () => void;
  onDeclineStockSale: () => void;
  loanAmount: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
  embedded?: boolean;
}) {
  const [bankOpen, setBankOpen] = useState(false);
  const maxStockQuantity =
    latestCard?.isStock && latestCard.priceCents > 0
      ? Math.max(1, Math.floor(currentCashCents / latestCard.priceCents))
      : 1;
  const validDealQuantity = typeof dealQuantity === "number" && dealQuantity >= 1;
  const totalStockCostCents =
    latestCard?.isStock && validDealQuantity ? latestCard.priceCents * dealQuantity : 0;
  const canPayCharity =
    charityChoice ? currentCashCents >= charityChoice.donationCents : false;
  const canCloseMarketSale =
    marketSaleOffer ? currentCashCents + marketSaleOffer.proceedsCents >= 0 : false;
  const canResolveLatestDeal = waitingStockSellerCount === 0;
  const hasCurrentAction =
    canStart ||
    canChooseDeal ||
    Boolean(stockSaleOffer) ||
    Boolean(marketSaleOffer) ||
    Boolean(charityChoice) ||
    Boolean(doodadPaymentChoice) ||
    Boolean(latestCard);

  const content = (
    <>
      {canStart ? (
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Текущий ход</div>
          <Button className="mt-3 w-full" onClick={onStartGame}>
            Начать партию
          </Button>
        </div>
      ) : null}

      {canChooseDeal ? (
        <div className="rounded-md border border-line bg-surface p-3">
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
          onSell={onSellStock}
          onDecline={onDeclineStockSale}
        />
      ) : null}

      {marketSaleOffer ? (
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Предложение рынка</div>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {marketSaleOffer.title}
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <div>Актив: {marketSaleOffer.assetName}</div>
            <div>Цена продажи: {money(marketSaleOffer.salePriceCents)}</div>
            {marketSaleOffer.mortgageCents > 0 ? (
              <div>Закладная: {money(marketSaleOffer.mortgageCents)}</div>
            ) : null}
            <div>
              {marketSaleOffer.proceedsCents >= 0 ? "К получению" : "К доплате"}:{" "}
              {money(Math.abs(marketSaleOffer.proceedsCents))}
            </div>
            {marketSaleOffer.cashflowCents !== 0 ? (
              <div>
                {marketSaleOffer.cashflowCents > 0
                  ? "Денежный поток уменьшится на"
                  : "Денежный поток увеличится на"}{" "}
                {money(Math.abs(marketSaleOffer.cashflowCents))}/мес
              </div>
            ) : null}
          </div>
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
        </div>
      ) : null}

      {charityChoice ? (
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Благотворительность</div>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            Заплатите 10% от своих общих доходов и кидайте 2 кубика 3 своих хода.
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <div>Пожертвование: {money(charityChoice.donationCents)}</div>
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
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Выбор оплаты</div>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {doodadPaymentChoice.title}
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <div>Наличными: {money(doodadPaymentChoice.cashPriceCents)}</div>
            <div>
              Кредитная карта: долг {money(doodadPaymentChoice.creditBalanceCents)}, платёж{" "}
              {money(doodadPaymentChoice.creditPaymentCents)}/мес
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

      <div className="rounded-md border border-line bg-surface p-3">
        <div className="text-sm font-medium">
          {latestCard ? "Текущая сделка" : "Последняя сделка"}
        </div>
        {latestCard ? (
          <>
            <p className="mt-1 text-sm text-neutral-700">{latestCard.title}</p>
            {latestCard.bodyText ? (
              <p className="mt-2 text-sm leading-6 text-neutral-700">{latestCard.bodyText}</p>
            ) : null}
            <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
              {latestCard.priceCents > 0 ? <div>Цена: {money(latestCard.priceCents)}</div> : null}
              {latestCard.downPaymentCents > 0 ? (
                <div>Первоначальный взнос: {money(latestCard.downPaymentCents)}</div>
              ) : null}
              {latestCard.cashflowCents !== 0 ? (
                <div>Денежный поток: {money(latestCard.cashflowCents)}/мес</div>
              ) : null}
            </div>
            {latestCard.isStock ? (
              <div className="mt-3 rounded-md border border-line bg-white p-3">
                <div className="text-sm font-medium">Количество акций</div>
                <div className="mt-2 grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2">
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => setDealQuantity(Math.max(1, (dealQuantity || 0) - 50))}
                  >
                    &lt;&lt;
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => setDealQuantity(Math.max(1, (dealQuantity || 0) - 1))}
                  >
                    &lt;
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={dealQuantity}
                    onChange={(event) =>
                      setDealQuantity(event.target.value === "" ? "" : Number(event.target.value))
                    }
                    onBlur={() => {
                      if (!validDealQuantity) setDealQuantity(1);
                    }}
                    className="text-center font-semibold"
                  />
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => setDealQuantity((dealQuantity || 0) + 1)}
                  >
                    &gt;
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => setDealQuantity((dealQuantity || 0) + 50)}
                  >
                    &gt;&gt;
                  </Button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  На текущие наличные хватает: {maxStockQuantity}. Можно выбрать больше и взять кредит.
                </p>
                <div className="mt-3 rounded-md bg-surface px-3 py-2 text-sm">
                  <div className="text-neutral-600">Полная стоимость</div>
                  <div className="mt-1 font-semibold">
                    {validDealQuantity ? dealQuantity : "—"} x {money(latestCard.priceCents)} ={" "}
                    {money(totalStockCostCents)}
                  </div>
                </div>
              </div>
            ) : null}
            {!canResolveLatestDeal ? (
              <p className="mt-3 text-xs text-amber-700">
                Ожидаем решение по продаже от игроков: {waitingStockSellerCount}.
              </p>
            ) : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button
                onClick={onBuyLatest}
                disabled={!canResolveLatestDeal || (Boolean(latestCard?.isStock) && !validDealQuantity)}
              >
                Купить
              </Button>
              <Button variant="secondary" onClick={() => setBankOpen(true)} disabled={!canTakeLoan}>
                Взять кредит
              </Button>
              <Button variant="secondary" onClick={onDeclineLatest} disabled={!canResolveLatestDeal}>
                Отказаться
              </Button>
            </div>
          </>
        ) : !hasCurrentAction && latestTurnSummary ? (
          <>
            <p className="mt-1 text-sm font-medium text-neutral-800">{latestTurnSummary.title}</p>
            {latestTurnSummary.details.length > 0 ? (
              <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
                {latestTurnSummary.details.map((detail) => (
                  <div key={detail}>{detail}</div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-600">Деталей нет.</p>
            )}
          </>
        ) : hasCurrentAction ? (
          <p className="mt-1 text-sm text-neutral-600">Ожидается действие выше.</p>
        ) : (
          <p className="mt-1 text-sm text-neutral-600">Нет данных о прошлом ходе.</p>
        )}
      </div>

      {bankOpen ? (
        <div className="rounded-md border border-line bg-white p-3">
          <div className="mb-3 text-sm font-medium">Банк</div>
          <LoanPanel
            loanAmount={loanAmount}
            onLoanDecrease={onLoanDecrease}
            onLoanIncrease={onLoanIncrease}
            onLoanAmountChange={onLoanAmountChange}
            onTakeLoan={onTakeLoan}
            canTakeLoan={canTakeLoan}
          />
        </div>
      ) : null}
    </>
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Действия</h2>
      <Button
        variant="secondary"
        className="h-8 px-3 text-xs"
        onClick={() => setBankOpen((value) => !value)}
        disabled={!canTakeLoan}
      >
        {bankOpen ? "Скрыть банк" : "Банк"}
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <section className="grid gap-3">
        {header}
        {content}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4">
        {header}
      </CardHeader>
      <CardContent className="space-y-4">{content}</CardContent>
    </Card>
  );
}

function EventLog({
  events,
  currentUserId,
  players,
  currentPlayerId
}: {
  events: GameEvent[];
  currentUserId: string;
  players: GamePlayer[];
  currentPlayerId: string | null;
}) {
  const [onlyMine, setOnlyMine] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "players">("events");
  const visibleEvents = useMemo(() => {
    return [...events]
      .sort((left, right) => right.sequence - left.sequence)
      .filter((event) => !onlyMine || event.actor?.id === currentUserId);
  }, [currentUserId, events, onlyMine]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-md bg-surface p-1" role="tablist" aria-label="Информация об игре">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "events"}
            className={`rounded px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === "events" ? "bg-white text-ink shadow-sm" : "text-neutral-500"
            }`}
            onClick={() => setActiveTab("events")}
          >
            Журнал действий
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "players"}
            className={`rounded px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === "players" ? "bg-white text-ink shadow-sm" : "text-neutral-500"
            }`}
            onClick={() => setActiveTab("players")}
          >
            Игроки
          </button>
        </div>
        {activeTab === "events" ? (
          <Button
            variant={onlyMine ? "primary" : "secondary"}
            className="h-9 self-start px-3"
            onClick={() => setOnlyMine((value) => !value)}
          >
            {onlyMine ? "Показать всех" : "Только мои"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {activeTab === "events" ? (
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1" role="tabpanel">
            <p className="text-xs text-neutral-500">Сначала показаны последние действия.</p>
            {visibleEvents.length === 0 ? (
              <p className="text-sm text-neutral-600">
                {onlyMine ? "Ваших действий пока нет." : "Событий пока нет."}
              </p>
            ) : (
              visibleEvents.map((event) => {
                const details = eventDetails(event);

                return (
                  <div key={event.id} className="rounded-md border border-line bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{eventTitle(event.type)}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {event.actor?.displayName ?? "Система"} · {shortDate(event.createdAt)}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-neutral-500">#{event.sequence}</span>
                    </div>
                    {details.length > 0 ? (
                      <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
                        {details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div role="tabpanel">
            <PlayersGrid players={players} currentPlayerId={currentPlayerId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const eventTitles: Record<string, string> = {
  "game:created": "Игра создана",
  "game:started": "Игра запущена",
  "game:deleted": "Игра удалена",
  "game:ended": "Игра завершена",
  "player:joined": "Игрок вошел в комнату",
  "player:added": "Игрок добавлен ведущим",
  "player:roll_dice": "Бросок кубика",
  "player:move": "Перемещение по полю",
  "player:baby": "Рождение ребенка",
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

const eventReasons: Record<string, string> = {
  player_added: "игрок добавлен в комнату",
  game_deleted: "игра удалена",
  game_started: "игра запущена",
  turn_skipped: "ход пропущен",
  roll_resolved: "ход обработан",
  deal_bought: "актив куплен",
  loan_taken: "кредит получен",
  loan_repaid: "кредит погашен",
  deal_choice_required: "игрок должен выбрать мелкую или крупную сделку",
  deal_card_drawn: "карточка сделки открыта",
  automatic_card_resolved_turn_ended: "карточка применена автоматически, ход завершен",
  network_marketing_resolved_turn_ended: "карточка сетевого маркетинга обработана, ход завершен",
  deal_bought_turn_ended: "сделка куплена, ход завершен",
  deal_declined_turn_ended: "игрок отказался от сделки, ход завершен",
  market_sale_offer: "рынок предложил продать актив",
  market_sale_completed_turn_ended: "актив продан по рынку, ход завершен",
  market_sale_declined_turn_ended: "игрок отказался от продажи, ход завершен",
  charity_choice_required: "игрок должен выбрать благотворительность",
  charity_accepted_turn_ended: "благотворительность оплачена, ход завершен",
  charity_declined_turn_ended: "игрок отказался от благотворительности, ход завершен",
  player_choice: "игрок пропустил ход",
  passed_paycheck: "игрок прошел расчётный чек",
  landed_on_paycheck: "игрок встал на расчётный чек",
  missing_previous_level: "нет предыдущего уровня",
  already_has_level: "этот уровень уже не нужен"
};

const cardTypes: Record<string, string> = {
  SMALL_DEAL: "Малая сделка",
  BIG_DEAL: "Крупная сделка",
  MARKET: "Рынок",
  DOODAD: "Doodad",
  FAST_TRACK: "Быстрый круг",
  DREAM: "Мечта"
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
  return eventTitles[type] ?? humanizeToken(type);
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
        numericDetail("Лимит, мин.", payload.timeLimitMinutes)
      ]);
    case "game:ended":
      return compactDetails([
        textDetail(
          "Причина",
          payload.reason === "financial_freedom"
            ? "Пассивный доход превысил расходы"
            : payload.reason === "time_limit"
              ? "Истёк лимит времени"
              : payload.reason
        ),
        moneyDetail("Пассивный доход", payload.passiveIncomeCents, "/мес"),
        moneyDetail("Расходы", payload.totalExpensesCents, "/мес")
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
        textDetail("Причина", translateReason(payload.reason)),
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
        textDetail("Условия", Array.isArray(payload.conditions) ? payload.conditions.join(", ") : null)
      ]);
    case "card:no_matching_assets":
      return compactDetails([
        textDetail("Карточка", payload.title),
        textDetail("Тикер", payload.symbol),
        textDetail("Эффект", humanizeToken(payload.effectType))
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
        textDetail("Причина", translateReason(payload.reason))
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
        moneyDetail("Cashflow", payload.cashflowCents, "/мес")
      ]);
    case "deal:decline":
      return compactDetails([
        textDetail("Тип", cardTypes[String(payload.cardType)] ?? humanizeToken(payload.cardType)),
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
        textDetail("Тип долга", humanizeToken(String(payload.liabilityType ?? ""))),
        moneyDetail("Погашено", payload.amountCents),
        moneyDetail("Остаток", payload.balanceCents),
        moneyDetail("Новый платёж", payload.paymentCents, "/мес")
      ]);
    case "bankruptcy:debts_halved":
      return compactDetails([
        textDetail(
          "Сокращённые долги",
          Array.isArray(payload.liabilityTypes)
            ? payload.liabilityTypes.map((type) => humanizeToken(String(type))).join(", ")
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
        textDetail("Doodad", payload.title),
        moneyDetail("Расход", payload.amountCents)
      ]);
    case "player:escaped_rat_race":
      return compactDetails([
        moneyDetail("Пассивный доход", payload.passiveIncomeCents, "/мес"),
        moneyDetail("Расходы", payload.totalExpensesCents, "/мес")
      ]);
    case "turn:skipped":
      return compactDetails([textDetail("Причина", translateReason(payload.reason))]);
    case "state:update":
      return compactDetails([textDetail("Причина", translateReason(payload.reason))]);
    default:
      return fallbackPayloadDetails(payload);
  }
}

function cardDetails(payload: Record<string, unknown>) {
  return compactDetails([
    textDetail("Тип", cardTypes[String(payload.cardType)] ?? humanizeToken(payload.cardType)),
    textDetail("Карточка", payload.title),
    textDetail("Текст", payload.bodyText),
    ...cardEffectDetails(payload.effects),
    metaMoneyDetail("Цена", payload.meta, "price"),
    metaMoneyDetail("Первоначальный взнос", payload.meta, "down_payment"),
    metaMoneyDetail("Cashflow", payload.meta, "cashflow_monthly", "/мес")
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
      return [moneyDetail("Изменение cashflow", amount, "/мес")];
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

    return [moneyDetail(humanizeToken(effectType), amount)];
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

function stockEffectLabel(effectType: string) {
  if (effectType === "stock_split" || effectType === "asset.quantity.multiply") return "дробление";
  if (effectType === "stock_reverse_split" || effectType === "asset.quantity.divide") return "уменьшение";
  if (effectType === "stock_wipeout" || effectType === "asset.wipeout") return "обнуление";
  return humanizeToken(effectType);
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
  return `Клетка: ${cellTypes[type] ?? (label || humanizeToken(type))}`;
}

function roleDetail(value: unknown) {
  const role = String(value ?? "");
  if (!role) return null;
  return `Роль: ${gameRoles[role] ?? humanizeToken(role)}`;
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

function translateReason(value: unknown) {
  const reason = String(value ?? "");
  if (!reason) return null;
  return eventReasons[reason] ?? humanizeToken(reason);
}

function fallbackPayloadDetails(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .slice(0, 4)
    .map(([key, value]) => textDetail(humanizeToken(key), value))
    .filter((value): value is string => Boolean(value));
}

function compactDetails(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}

function toText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
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

function humanizeToken(value: unknown) {
  return String(value ?? "")
    .replace(/[_:]+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function ChatPanel({
  messages,
  onSend
}: {
  messages: GameSnapshot["chatMessages"];
  onSend: (body: string) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    if (!body) return;
    onSend(body);
    event.currentTarget.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Чат</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className="rounded-md bg-surface p-3">
              <div className="text-xs text-neutral-500">
                {message.user?.displayName ?? "Игрок"} · {shortDate(message.createdAt)}
              </div>
              <div className="mt-1 text-sm">{message.body}</div>
            </div>
          ))}
        </div>
        <form className="mt-4 grid grid-cols-[1fr_auto] gap-2" onSubmit={submit}>
          <Input name="body" placeholder="Сообщение" autoComplete="off" />
          <Button type="submit" aria-label="Отправить">
            <Send size={16} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 rounded-md border border-line bg-surface p-3">
      <div className="min-h-8 text-xs leading-4 text-neutral-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold leading-5">{value}</div>
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
  rows: Array<{ id: string; label: string; value: string }>;
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
            <div key={row.id} className="flex min-w-0 justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{row.label}</span>
              <span className="shrink-0 font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
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
        : metaCents(meta, "down_payment") || priceCents;

  return {
    cardId: Number(event.payload.id),
    title,
    bodyText,
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

function latestPlayerActionSummary(events: GameEvent[], gamePlayerId: string | undefined) {
  if (!gamePlayerId) return null;

  const turnEventTypes = new Set([
    "player:roll_dice",
    "player:move",
    "paycheck:receive",
    "card:draw",
    "card:cash_delta",
    "card:cashflow_delta",
    "card:liability_created",
    "card:condition_not_met",
    "card:no_matching_assets",
    "card:stock_quantity_changed",
    "network_marketing:level_applied",
    "network_marketing:level_stored",
    "network_marketing:discarded",
    "deal:buy",
    "deal:decline",
    "deal:sell",
    "market:sale_offer",
    "market:sale_declined",
    "player:baby",
    "player:downsized",
    "player:charity",
    "player:charity_choice_required",
    "player:charity_declined",
    "doodad:paid",
    "player:escaped_rat_race",
    "turn:skipped"
  ]);
  const event = [...events]
    .sort((left, right) => right.sequence - left.sequence)
    .find((item) => item.gamePlayer?.id === gamePlayerId && turnEventTypes.has(item.type));

  if (!event) return null;

  return {
    title: eventTitle(event.type),
    details: eventDetails(event)
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
