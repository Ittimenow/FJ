"use client";

import { realtimeEvents } from "@cashflow/shared";
import { Send, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSetGameRoomHeader } from "@/components/layout/game-room-header-context";
import { publicApiBaseUrl } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { GameEvent, GamePlayer, GameSnapshot, PlayerLiability } from "@/lib/types";

type GameActionResult = {
  snapshot?: GameSnapshot;
  events?: Array<{ type: string; payload: Record<string, unknown> }>;
  message?: string;
};

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
  const [dealQuantity, setDealQuantity] = useState(1);
  const [turnPopupOpen, setTurnPopupOpen] = useState(false);
  const [rollingDice, setRollingDice] = useState(false);
  const [diceFaces, setDiceFaces] = useState([6]);
  const [loanPopupOpen, setLoanPopupOpen] = useState(false);
  const [playersPopupOpen, setPlayersPopupOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setGameRoomHeader = useSetGameRoomHeader();

  useEffect(() => {
    const socket = io(`${publicApiBaseUrl()}/games`, {
      auth: { token },
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

  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.game.currentPlayerId
  );
  const gamePlayers = snapshot.players.filter((player) => player.role === "PLAYER");
  const me = gamePlayers.find((player) => player.userId === currentUserId);
  const selectedPlayer = me ?? gamePlayers[0];
  const canRoll =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.userId === currentUserId;
  const isAdmin = currentUserRole === "ADMIN";
  const canManage =
    isAdmin ||
    (currentUserRole === "HOST" && snapshot.game.createdById === currentUserId);
  const canStart =
    snapshot.game.status === "WAITING" &&
    canManage;
  const pendingAction = snapshot.game.pendingAction;
  const ownPendingAction = pendingAction?.gamePlayerId === me?.id ? pendingAction : null;
  const charityChoice =
    ownPendingAction?.type === "charity_choice" ? ownPendingAction : null;
  const marketSaleOffer =
    ownPendingAction?.type === "market_sale" ? ownPendingAction : null;
  const isMyTurn =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.userId === currentUserId;
  const canAnswerCharity =
    isMyTurn && Boolean(charityChoice);
  const canAnswerMarketSale =
    isMyTurn && Boolean(marketSaleOffer);
  const canTakeLoan = snapshot.game.status === "IN_PROGRESS" && Boolean(me);
  const activeDiceCount = (me?.financialState?.charityTurns ?? 0) > 0
    ? 2
    : 1;
  const canChooseDeal = isMyTurn && ownPendingAction?.type === "choose_deal";
  const latestBuyableCard = useMemo(
    () => latestDealCard(snapshot.events, ownPendingAction),
    [ownPendingAction, snapshot.events]
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
    if (canRoll && !pendingAction && !rollingDice) {
      setDiceFaces(Array.from({ length: activeDiceCount }, () => 6));
      setTurnPopupOpen(true);
    } else if (!rollingDice) {
      setTurnPopupOpen(false);
    }
  }, [activeDiceCount, canRoll, pendingAction, rollingDice]);

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
    setTurnPopupOpen(true);
    setRollingDice(true);
    startDiceAnimation(activeDiceCount);
    const startedAt = Date.now();

    try {
      const result = await emitWithAck(realtimeEvents.playerRollDice, {});
      applyActionResult(result);
      const dice = diceValuesFromActionResult(result) ?? diceFaces;
      const remaining = Math.max(0, 1000 - (Date.now() - startedAt));
      await wait(remaining);
      stopDiceAnimation();
      setDiceFaces(dice);
      await wait(450);
      setTurnPopupOpen(false);
    } catch (event) {
      stopDiceAnimation();
      setError(event instanceof Error ? event.message : "Не удалось бросить кубик");
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
      setTurnPopupOpen(false);
    } catch (event) {
      setError(event instanceof Error ? event.message : "Не удалось пропустить ход");
    }
  }

  function draw(cardType: string) {
    emit(realtimeEvents.cardDraw, { cardType });
  }

  function buyLatestDeal() {
    if (!latestBuyableCard) return;
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

  function declineMarketSale() {
    emit("market:decline", {});
  }

  function acceptCharity() {
    emit("charity:accept", {});
  }

  function declineCharity() {
    emit("charity:decline", {});
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
      setLoanPopupOpen(false);
    } catch (event) {
      setError(event instanceof Error ? event.message : "Не удалось взять кредит");
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

  function updateDealQuantity(value: number) {
    setDealQuantity(Math.max(Math.floor(Number(value) || 1), 1));
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
    <div className="grid gap-5">
      <TurnPopup
        open={turnPopupOpen}
        diceValues={diceFaces}
        rolling={rollingDice}
        onRoll={rollDice}
        onSkip={skipTurn}
      />
      <LoanModal
        open={loanPopupOpen}
        loanAmount={loanAmount}
        onLoanDecrease={() => changeLoanAmount(-1000)}
        onLoanIncrease={() => changeLoanAmount(1000)}
        onLoanAmountChange={updateLoanAmount}
        onTakeLoan={takeLoan}
        canTakeLoan={canTakeLoan}
        player={me}
        currentCashCents={me?.financialState?.cashCents ?? 0}
        onCloseLiability={closeLiability}
        onClose={() => setLoanPopupOpen(false)}
      />
      <PlayersModal
        open={playersPopupOpen}
        players={gamePlayers}
        currentPlayerId={snapshot.game.currentPlayerId}
        onClose={() => setPlayersPopupOpen(false)}
      />
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="hidden xl:block">
        <DesktopGameBoard
          snapshot={snapshot}
          selectedPlayer={selectedPlayer}
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
            onRoll={rollDice}
            canRoll={canRoll && !pendingAction}
            rollingDice={rollingDice}
            onDrawSmallDeal={() => draw("SMALL_DEAL")}
            onDrawBigDeal={() => draw("BIG_DEAL")}
            canChooseDeal={canChooseDeal}
            isMyTurn={isMyTurn}
            latestCard={latestBuyableCard}
            latestTurnSummary={latestTurnSummary}
            charityChoice={charityChoice}
            canAnswerCharity={canAnswerCharity}
            marketSaleOffer={marketSaleOffer}
            canAnswerMarketSale={canAnswerMarketSale}
            currentCashCents={me?.financialState?.cashCents ?? 0}
            dealQuantity={dealQuantity}
            setDealQuantity={updateDealQuantity}
            onBuyLatest={buyLatestDeal}
            onDeclineLatest={declineLatestDeal}
            onSellMarketAsset={sellMarketAsset}
            onDeclineMarketSale={declineMarketSale}
            onAcceptCharity={acceptCharity}
            onDeclineCharity={declineCharity}
            canTakeLoan={canTakeLoan}
            onOpenLoan={() => setLoanPopupOpen(true)}
            embedded
          />
        </DesktopGameBoard>
      </div>

      {canManage && snapshot.game.status === "WAITING" ? (
        <div className="hidden xl:block">
          <HostPanel onAddUser={addUserToGame} />
        </div>
      ) : null}

      <div className="grid min-w-0 max-w-full gap-5 overflow-x-hidden xl:hidden">
        <MobileBoard
          snapshot={snapshot}
          selectedPlayer={selectedPlayer}
          onOpenPlayers={() => setPlayersPopupOpen(true)}
        />
        <ActionsPanel
          onStartGame={startGame}
          canStart={canStart}
          onRoll={rollDice}
          canRoll={canRoll && !pendingAction}
          rollingDice={rollingDice}
          onDrawSmallDeal={() => draw("SMALL_DEAL")}
          onDrawBigDeal={() => draw("BIG_DEAL")}
          canChooseDeal={canChooseDeal}
          isMyTurn={isMyTurn}
          latestCard={latestBuyableCard}
          latestTurnSummary={latestTurnSummary}
          charityChoice={charityChoice}
          canAnswerCharity={canAnswerCharity}
          marketSaleOffer={marketSaleOffer}
          canAnswerMarketSale={canAnswerMarketSale}
          currentCashCents={me?.financialState?.cashCents ?? 0}
          dealQuantity={dealQuantity}
          setDealQuantity={updateDealQuantity}
          onBuyLatest={buyLatestDeal}
          onDeclineLatest={declineLatestDeal}
          onSellMarketAsset={sellMarketAsset}
          onDeclineMarketSale={declineMarketSale}
          onAcceptCharity={acceptCharity}
          onDeclineCharity={declineCharity}
          canTakeLoan={canTakeLoan}
          onOpenLoan={() => setLoanPopupOpen(true)}
        />
        <FinancialPanel player={selectedPlayer} />
        {canManage && snapshot.game.status === "WAITING" ? (
          <HostPanel onAddUser={addUserToGame} />
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EventLog events={snapshot.events} currentUserId={currentUserId} />
        <ChatPanel
          messages={snapshot.chatMessages}
          onSend={(body) => emit("chat:send", { body })}
        />
      </div>
    </div>
  );
}

function TurnPopup({
  open,
  diceValues,
  rolling,
  onRoll,
  onSkip
}: {
  open: boolean;
  diceValues: number[];
  rolling: boolean;
  onRoll: () => void;
  onSkip: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="turn-popup-title"
        className="w-full max-w-xs rounded-md border border-line bg-white p-5 text-center shadow-panel"
      >
        <h2 id="turn-popup-title" className="text-xl font-semibold">
          Ваш ход!
        </h2>
        <div className="mt-4 flex justify-center gap-3">
          {diceValues.map((diceValue, index) => (
            <DiceFace key={index} value={diceValue} rolling={rolling} />
          ))}
        </div>
        <Button className="mt-5 w-full" onClick={onRoll} disabled={rolling}>
          {rolling
            ? "Бросаем..."
            : diceValues.length > 1
              ? "Бросить кубики"
              : "Бросить кубик"}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={rolling}
          className="mt-3 text-xs text-neutral-500 underline-offset-4 hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Пропустить ход
        </button>
      </div>
    </div>
  );
}

function LoanModal({
  open,
  loanAmount,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan,
  player,
  currentCashCents,
  onCloseLiability,
  onClose
}: {
  open: boolean;
  loanAmount: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
  player: GamePlayer | undefined;
  currentCashCents: number;
  onCloseLiability: (liability: PlayerLiability) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const repayableLiabilities = player ? repayableLiabilityRows(player) : [];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Банк"
        className="w-full max-w-md rounded-md border border-line bg-white p-4 shadow-panel"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Банк</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-neutral-500 transition hover:bg-surface hover:text-ink"
            aria-label="Закрыть банк"
          >
            Закрыть
          </button>
        </div>
        <LoanPanel
          loanAmount={loanAmount}
          onLoanDecrease={onLoanDecrease}
          onLoanIncrease={onLoanIncrease}
          onLoanAmountChange={onLoanAmountChange}
          onTakeLoan={onTakeLoan}
          canTakeLoan={canTakeLoan}
          liabilities={repayableLiabilities}
          currentCashCents={currentCashCents}
          onCloseLiability={onCloseLiability}
        />
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

function randomDiceValues(diceCount: number) {
  return Array.from({ length: Math.max(1, diceCount) }, () => Math.floor(Math.random() * 6) + 1);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function HostPanel({
  onAddUser
}: {
  onAddUser: (body: { email: string; role: string }) => void;
}) {
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
      <CardContent>
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
  outsidePlayers,
  children
}: {
  snapshot: GameSnapshot;
  selectedPlayer: GamePlayer | undefined;
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
  outsidePlayers
}: {
  player: GamePlayer | undefined;
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
        <FinancialTabs player={player} />
      </div>
    </div>
  );
}

function DesktopAssetsSection({ assets }: { assets: GamePlayer["assets"] }) {
  if (assets.length === 0) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2">
        <h3 className="text-sm font-semibold">Активы</h3>
        <span className="text-sm text-neutral-600">Пусто</span>
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
    return <p className="text-sm text-neutral-600">Пусто</p>;
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <div key={asset.id} className="rounded-md bg-surface px-3 py-2 text-sm">
          <div className="font-medium">{asset.name}</div>
          <div className="mt-1 flex justify-between gap-3 text-xs text-neutral-600">
            <span>{isStockAsset(asset) ? `${asset.quantity} шт.` : money(asset.cashflowCents)}</span>
            <span>{money(asset.costBasisCents)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileBoard({
  snapshot,
  selectedPlayer,
  onOpenPlayers
}: {
  snapshot: GameSnapshot;
  selectedPlayer: GamePlayer | undefined;
  onOpenPlayers: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <CardHeader className="min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Малый круг</CardTitle>
          <Button
            variant="secondary"
            className="h-9 w-9 shrink-0 px-0"
            onClick={onOpenPlayers}
            aria-label="Игроки"
            title="Игроки"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {outsidePlayers.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">Вне поля</span>
            {outsidePlayers.map((player) => (
              <span
                key={player.id}
                className="h-5 min-w-5 rounded px-1 text-center text-xs font-semibold text-white"
                style={{ backgroundColor: player.color ?? "#171717" }}
                title={player.user?.displayName ?? `Игрок ${player.seat ?? ""}`}
              >
                {player.seat}
              </span>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0 max-w-full overflow-hidden">
        <div
          ref={scrollRef}
          className="grid w-full min-w-0 max-w-full snap-x snap-mandatory grid-flow-col auto-cols-[clamp(78px,23vw,136px)] gap-2 overflow-x-auto scroll-smooth px-1 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Малый круг"
        >
          {snapshot.board.map((cell) => {
            const players = cellPlayers(snapshot, cell.index);
            return (
              <div key={cell.index} data-board-cell={cell.index} className="min-w-0 snap-center">
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
      </CardContent>
    </Card>
  );
}

function PlayersModal({
  open,
  players,
  currentPlayerId,
  onClose
}: {
  open: boolean;
  players: GamePlayer[];
  currentPlayerId: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="players-popup-title"
        className="w-full max-w-md rounded-md border border-line bg-white shadow-panel"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <h2 id="players-popup-title" className="text-base font-semibold">
            Игроки
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-surface hover:text-ink"
            aria-label="Закрыть игроков"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <PlayersGrid players={players} currentPlayerId={currentPlayerId} />
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
  return (
    <div
      className={[
        "relative rounded-md border border-line bg-white",
        compact
          ? "h-[105px] w-[145px] p-3"
          : mobile
            ? "h-24 w-full bg-surface p-2"
            : "min-h-24 aspect-square bg-surface p-3",
        active ? "ring-2 ring-success ring-offset-2 ring-offset-white" : ""
      ].join(" ")}
      style={style}
    >
      <div className={mobile ? "grid gap-1" : "flex items-center justify-between gap-2"}>
        <span className={compact || mobile ? "text-lg font-semibold" : "text-xs text-neutral-500"}>
          {cell.index + 1}
        </span>
        <Badge
          className={[
            "bg-surface text-ink",
            compact ? "max-w-[7rem] truncate" : "",
            mobile ? "w-fit max-w-full truncate px-1.5 text-[10px]" : ""
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

function PlayerToken({ player }: { player: GamePlayer }) {
  return (
    <span
      className="h-5 min-w-5 rounded px-1 text-center text-xs font-semibold text-white"
      style={{ backgroundColor: player.color ?? "#171717" }}
      title={player.user?.displayName ?? `Игрок ${player.seat ?? ""}`}
    >
      {player.seat}
    </span>
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

function PlayersPanel({
  players,
  currentPlayerId
}: {
  players: GamePlayer[];
  currentPlayerId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Игроки</CardTitle>
      </CardHeader>
      <CardContent>
        <PlayersGrid players={players} currentPlayerId={currentPlayerId} />
      </CardContent>
    </Card>
  );
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

function FinancialPanel({ player }: { player: GamePlayer | undefined }) {
  const state = player?.financialState;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Финансовый отчёт</CardTitle>
      </CardHeader>
      <CardContent>
        {!player || !state ? (
          <p className="text-sm text-neutral-600">Отчёт появится после старта партии.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">{player.user?.displayName}</div>
              <div className="text-xs text-neutral-500">{player.profession?.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Наличные" value={money(state.cashCents)} />
              <Metric label="Зарплата" value={money(state.salaryCents)} />
              <Metric label="Денежный поток" value={money(state.monthlyCashflowCents)} />
              <Metric label="Пассивный доход" value={money(state.passiveIncomeCents)} />
              <Metric label="Расходы" value={money(state.totalExpensesCents)} />
            </div>
            <AssetsList assets={player.assets} />
            <FinancialTabs player={player} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssetsList({ assets }: { assets: GamePlayer["assets"] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">Активы</div>
      {assets.length === 0 ? (
        <p className="text-sm text-neutral-600">Пусто</p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) =>
            isStockAsset(asset) ? (
              <div key={asset.id} className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{asset.name}</div>
                    {asset.symbol ? (
                      <div className="mt-1 text-xs text-neutral-500">{asset.symbol}</div>
                    ) : null}
                  </div>
                  <Badge className="bg-white text-ink">Акции</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <AssetInfoRow label="Кол-во акций" value={String(asset.quantity)} />
                  <AssetInfoRow label="Стоимость за единицу" value={money(assetUnitCostCents(asset))} />
                  <AssetInfoRow label="Стоимость акций" value={money(asset.costBasisCents)} />
                </div>
              </div>
            ) : (
              <div key={asset.id} className="flex justify-between gap-3 text-sm">
                <span>{asset.name}</span>
                <span className="shrink-0 font-medium">{money(asset.cashflowCents)}</span>
              </div>
            )
          )}
        </div>
      )}
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

function assetUnitCostCents(asset: GamePlayer["assets"][number]) {
  return asset.quantity > 0 ? Math.round(asset.costBasisCents / asset.quantity) : 0;
}

function FinancialTabs({ player }: { player: GamePlayer }) {
  const [activeTab, setActiveTab] = useState<"expenses" | "liabilities">("expenses");
  const rows = activeTab === "expenses" ? expenseRows(player) : liabilityRows(player);

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
        <SectionList title={activeTab === "expenses" ? "Расходы" : "Долги"} rows={rows} />
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
  canTakeLoan,
  liabilities,
  currentCashCents,
  onCloseLiability
}: {
  loanAmount: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
  liabilities: PlayerLiability[];
  currentCashCents: number;
  onCloseLiability: (liability: PlayerLiability) => void;
}) {
  return (
    <div className="space-y-4">
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

      <div className="rounded-md border border-line bg-surface p-3">
        <div className="text-sm font-medium">Кредиты</div>
        {liabilities.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">Нет кредитов для закрытия.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {liabilities.map((liability) => {
              const canClose = currentCashCents >= liability.balanceCents;
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
                    {!canClose ? (
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

function liabilityRows(player: GamePlayer) {
  const rows = player.liabilities
    .filter((liability) => liability.type !== "bank_loan")
    .map((liability) => ({
      id: liability.id,
      label: liabilityLabels[liability.type] ?? liability.name,
      value: money(liability.balanceCents)
    }));
  const bankLoanBalance = player.liabilities
    .filter((liability) => liability.type === "bank_loan")
    .reduce((sum, liability) => sum + liability.balanceCents, 0);
  if (bankLoanBalance > 0) {
    rows.push({
      id: "bank_loan",
      label: liabilityLabels.bank_loan ?? "Оплата кредита банка",
      value: money(bankLoanBalance)
    });
  }
  return rows;
}

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
  onRoll,
  canRoll,
  rollingDice,
  onDrawSmallDeal,
  onDrawBigDeal,
  canChooseDeal,
  isMyTurn,
  latestCard,
  latestTurnSummary,
  charityChoice,
  canAnswerCharity,
  marketSaleOffer,
  canAnswerMarketSale,
  currentCashCents,
  dealQuantity,
  setDealQuantity,
  onBuyLatest,
  onDeclineLatest,
  onSellMarketAsset,
  onDeclineMarketSale,
  onAcceptCharity,
  onDeclineCharity,
  canTakeLoan,
  onOpenLoan,
  embedded = false
}: {
  onStartGame: () => void;
  canStart: boolean;
  onRoll: () => void;
  canRoll: boolean;
  rollingDice: boolean;
  onDrawSmallDeal: () => void;
  onDrawBigDeal: () => void;
  canChooseDeal: boolean;
  isMyTurn: boolean;
  latestCard: ReturnType<typeof latestDealCard>;
  latestTurnSummary: ReturnType<typeof latestPlayerActionSummary>;
  charityChoice: Extract<GameSnapshot["game"]["pendingAction"], { type: "charity_choice" }> | null;
  canAnswerCharity: boolean;
  marketSaleOffer: Extract<GameSnapshot["game"]["pendingAction"], { type: "market_sale" }> | null;
  canAnswerMarketSale: boolean;
  currentCashCents: number;
  dealQuantity: number;
  setDealQuantity: (value: number) => void;
  onBuyLatest: () => void;
  onDeclineLatest: () => void;
  onSellMarketAsset: () => void;
  onDeclineMarketSale: () => void;
  onAcceptCharity: () => void;
  onDeclineCharity: () => void;
  canTakeLoan: boolean;
  onOpenLoan: () => void;
  embedded?: boolean;
}) {
  const maxStockQuantity =
    latestCard?.isStock && latestCard.priceCents > 0
      ? Math.max(1, Math.floor(currentCashCents / latestCard.priceCents))
      : 1;
  const totalStockCostCents =
    latestCard?.isStock ? latestCard.priceCents * dealQuantity : 0;
  const canPayCharity =
    charityChoice ? currentCashCents >= charityChoice.donationCents : false;
  const canCloseMarketSale =
    marketSaleOffer ? currentCashCents + marketSaleOffer.proceedsCents >= 0 : false;
  const showCurrentTurn = canStart || isMyTurn;
  const loanButton = (
    <button
      type="button"
      onClick={onOpenLoan}
      disabled={!canTakeLoan}
      className="inline-flex shrink-0 items-center rounded bg-surface px-2 py-1 text-xs font-medium text-ink transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Банк
    </button>
  );

  const content = (
    <>
      {showCurrentTurn ? (
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Текущий ход</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {canStart ? (
              <Button className="col-span-2" onClick={onStartGame}>
                Начать партию
              </Button>
            ) : canChooseDeal ? (
              <>
                <Button variant="secondary" onClick={onDrawSmallDeal}>
                  Мелкая
                </Button>
                <Button variant="secondary" onClick={onDrawBigDeal}>
                  Крупная
                </Button>
              </>
            ) : (
              <Button className="col-span-2" onClick={onRoll} disabled={!canRoll || rollingDice}>
                {rollingDice ? "Бросаем..." : "Бросить кубик"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-surface p-3">
        <div className="text-sm font-medium">Последняя сделка</div>
        {marketSaleOffer ? (
          <>
            <p className="mt-1 text-sm font-medium text-neutral-800">Предложение рынка</p>
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
          </>
        ) : charityChoice ? (
          <>
            <p className="mt-1 text-sm font-medium text-neutral-800">Благотворительность</p>
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
          </>
        ) : latestCard ? (
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
                <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => setDealQuantity(Math.max(1, dealQuantity - 1))}
                  >
                    &lt;
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={dealQuantity}
                    onChange={(event) => setDealQuantity(Number(event.target.value))}
                    className="text-center font-semibold"
                  />
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => setDealQuantity(dealQuantity + 1)}
                  >
                    &gt;
                  </Button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  На текущие наличные хватает: {maxStockQuantity}. Можно выбрать больше и взять кредит в любой момент.
                </p>
                <div className="mt-3 rounded-md bg-surface px-3 py-2 text-sm">
                  <div className="text-neutral-600">Полная стоимость</div>
                  <div className="mt-1 font-semibold">
                    {dealQuantity} × {money(latestCard.priceCents)} = {money(totalStockCostCents)}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={onBuyLatest}>
                Купить
              </Button>
              <Button variant="secondary" onClick={onDeclineLatest}>
                Отказаться
              </Button>
            </div>
          </>
        ) : latestTurnSummary ? (
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
        ) : (
          <p className="mt-1 text-sm text-neutral-600">Нет данных о прошлом ходе.</p>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Действия</h2>
          {loanButton}
        </div>
        {content}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Действия</CardTitle>
        {loanButton}
      </CardHeader>
      <CardContent className="space-y-4">{content}</CardContent>
    </Card>
  );
}

function EventLog({
  events,
  currentUserId
}: {
  events: GameEvent[];
  currentUserId: string;
}) {
  const [onlyMine, setOnlyMine] = useState(false);
  const visibleEvents = useMemo(() => {
    return [...events]
      .sort((left, right) => right.sequence - left.sequence)
      .filter((event) => !onlyMine || event.actor?.id === currentUserId);
  }, [currentUserId, events, onlyMine]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Журнал действий</CardTitle>
          <p className="mt-1 text-xs text-neutral-500">
            Сначала показаны последние действия.
          </p>
        </div>
        <Button
          variant={onlyMine ? "primary" : "secondary"}
          className="h-9 self-start px-3"
          onClick={() => setOnlyMine((value) => !value)}
        >
          {onlyMine ? "Показать всех" : "Только мои"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
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
  "network_marketing:discarded": "Карточка сетевого маркетинга сброшена",
  "deal:choice_required": "Выбор сделки",
  "deal:buy": "Покупка актива",
  "deal:decline": "Отказ от покупки",
  "deal:sell": "Продажа актива",
  "market:sale_offer": "Предложение рынка",
  "market:sale_declined": "Отказ от продажи",
  "loan:take": "Получен кредит",
  "loan:repay": "Погашен кредит",
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
        numericDetail("Игроков", payload.playerCount)
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
        numericDetail("Предыдущий уровень", payload.previousLevel),
        numericDetail("Новый уровень", payload.level),
        moneyDetail("Денежный поток", payload.cashflowCents, "/мес"),
        moneyDetail("Прошлый денежный поток", payload.previousCashflowCents, "/мес")
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
    <div className="grid rounded-md border border-line bg-surface p-3">
      <div className="min-h-8 text-xs leading-4 text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-5">{value}</div>
    </div>
  );
}

function SectionList({
  title,
  rows
}: {
  title: string;
  rows: Array<{ id: string; label: string; value: string }>;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">Пусто</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex justify-between gap-3 text-sm">
              <span>{row.label}</span>
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
  if (pendingAction?.type !== "deal_card_drawn") return null;

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
