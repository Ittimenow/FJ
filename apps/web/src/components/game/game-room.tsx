"use client";

import { realtimeEvents } from "@cashflow/shared";
import { Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { GameEvent, GamePlayer, GameSnapshot } from "@/lib/types";

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
  const [diceFace, setDiceFace] = useState(6);
  const socketRef = useRef<Socket | null>(null);
  const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const isMyTurn =
    snapshot.game.status === "IN_PROGRESS" &&
    currentPlayer?.userId === currentUserId;
  const canChooseDeal = canRoll && pendingAction?.type === "choose_deal" && pendingAction.gamePlayerId === me?.id;
  const canDrawManualCard = canRoll && !pendingAction;
  const latestBuyableCard = useMemo(
    () => latestDealCard(snapshot.events, pendingAction),
    [pendingAction, snapshot.events]
  );
  useEffect(() => {
    setDealQuantity(1);
  }, [latestBuyableCard?.cardId]);

  useEffect(() => {
    if (canRoll && !pendingAction && !rollingDice) {
      setDiceFace(6);
      setTurnPopupOpen(true);
    } else if (!rollingDice) {
      setTurnPopupOpen(false);
    }
  }, [canRoll, pendingAction, rollingDice]);

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
    startDiceAnimation();
    const startedAt = Date.now();

    try {
      const result = await emitWithAck(realtimeEvents.playerRollDice, {});
      applyActionResult(result);
      const dice = diceFromActionResult(result) ?? diceFace;
      const remaining = Math.max(0, 1000 - (Date.now() - startedAt));
      await wait(remaining);
      stopDiceAnimation();
      setDiceFace(dice);
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

  function takeLoan() {
    emit(realtimeEvents.loanTake, { amountCents: loanAmount });
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

  function startDiceAnimation() {
    stopDiceAnimation();
    diceIntervalRef.current = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * 6) + 1);
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
        diceValue={diceFace}
        rolling={rollingDice}
        onRoll={rollDice}
        onSkip={skipTurn}
      />
      <section className="flex flex-col gap-3 rounded-md border border-line bg-white p-4 shadow-panel md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{snapshot.game.title}</h1>
            <Badge className="bg-surface text-ink">{snapshot.game.status}</Badge>
            <Badge className={connected ? "bg-green-100 text-success" : "bg-red-100 text-red-700"}>
              {connected ? "online" : "offline"}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-neutral-600">
            Код: <span className="font-mono text-ink">{snapshot.game.code}</span> · Раунд{" "}
            {snapshot.game.currentRound}
            {currentPlayer ? ` · Ход: ${currentPlayer.user?.displayName ?? "Игрок"}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canStart ? (
            <Button onClick={startGame}>Начать партию</Button>
          ) : (
            <Button onClick={rollDice} disabled={!canRoll || Boolean(pendingAction)}>
              Бросить кубик
            </Button>
          )}
          <Button variant="secondary" onClick={() => draw("SMALL_DEAL")} disabled={!canChooseDeal}>
            Мелкая
          </Button>
          <Button variant="secondary" onClick={() => draw("BIG_DEAL")} disabled={!canChooseDeal}>
            Крупная
          </Button>
          <Button variant="secondary" onClick={() => draw("MARKET")} disabled={!canDrawManualCard}>
            Market
          </Button>
          <Button variant="secondary" onClick={() => draw("DOODAD")} disabled={!canDrawManualCard}>
            Doodad
          </Button>
          {isAdmin ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-surface"
            >
              Выйти в админ-панель
            </Link>
          ) : null}
          {canManage ? (
            <Button variant="danger" onClick={deleteGame}>
              Удалить игру
            </Button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-5">
          <Board snapshot={snapshot} />
          <PlayersPanel players={gamePlayers} currentPlayerId={snapshot.game.currentPlayerId} />
        </div>

        <div className="grid gap-5">
          <FinancialPanel player={selectedPlayer} />
          {canManage && snapshot.game.status === "WAITING" ? (
            <HostPanel onAddUser={addUserToGame} />
          ) : null}
          <ActionsPanel
            loanAmount={loanAmount}
            onLoanDecrease={() => changeLoanAmount(-1000)}
            onLoanIncrease={() => changeLoanAmount(1000)}
            onLoanAmountChange={updateLoanAmount}
            onTakeLoan={takeLoan}
            canTakeLoan={isMyTurn}
            latestCard={latestBuyableCard}
            currentCashCents={me?.financialState?.cashCents ?? 0}
            dealQuantity={dealQuantity}
            setDealQuantity={updateDealQuantity}
            onBuyLatest={buyLatestDeal}
            onDeclineLatest={declineLatestDeal}
          />
        </div>
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
  diceValue,
  rolling,
  onRoll,
  onSkip
}: {
  open: boolean;
  diceValue: number;
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
        <div className="mt-4 flex justify-center">
          <DiceFace value={diceValue} rolling={rolling} />
        </div>
        <Button className="mt-5 w-full" onClick={onRoll} disabled={rolling}>
          {rolling ? "Бросаем..." : "Бросить кубик"}
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

function diceFromActionResult(result: GameActionResult) {
  const diceEvent = result.events?.find((event) => event.type === realtimeEvents.playerRollDice);
  const dice = Number(diceEvent?.payload.dice);
  return Number.isFinite(dice) && dice >= 1 && dice <= 6 ? dice : null;
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

function Board({ snapshot }: { snapshot: GameSnapshot }) {
  const outsidePlayers = snapshot.players.filter(
    (player) =>
      player.role === "PLAYER" &&
      player.track === "RAT_RACE" &&
      player.position < 0
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Малый круг</CardTitle>
        {outsidePlayers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
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
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {snapshot.board.map((cell) => {
            const players = snapshot.players.filter(
              (player) =>
                player.role === "PLAYER" &&
                player.track === "RAT_RACE" &&
                player.position === cell.index
            );
            return (
              <div
                key={cell.index}
                className="min-h-24 rounded-md border border-line bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-500">#{cell.index + 1}</span>
                  <Badge className="bg-white text-ink">{cell.type}</Badge>
                </div>
                <div className="mt-2 text-sm font-medium">{cell.label}</div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {players.map((player) => (
                    <span
                      key={player.id}
                      className="h-5 min-w-5 rounded px-1 text-center text-xs font-semibold text-white"
                      style={{ backgroundColor: player.color ?? "#171717" }}
                    >
                      {player.seat}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
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
      </CardContent>
    </Card>
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
  return player.liabilities.find((liability) => liability.type === type)?.paymentCents ?? null;
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

function ActionsPanel({
  loanAmount,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan,
  latestCard,
  currentCashCents,
  dealQuantity,
  setDealQuantity,
  onBuyLatest,
  onDeclineLatest
}: {
  loanAmount: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
  latestCard: ReturnType<typeof latestDealCard>;
  currentCashCents: number;
  dealQuantity: number;
  setDealQuantity: (value: number) => void;
  onBuyLatest: () => void;
  onDeclineLatest: () => void;
}) {
  const maxStockQuantity =
    latestCard?.isStock && latestCard.priceCents > 0
      ? Math.max(1, Math.floor(currentCashCents / latestCard.priceCents))
      : 1;
  const totalStockCostCents =
    latestCard?.isStock ? latestCard.priceCents * dealQuantity : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Действия</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Последняя сделка</div>
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
                    На текущие наличные хватает: {maxStockQuantity}. Можно выбрать больше и взять кредит в свой ход.
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
          ) : (
            <p className="mt-1 text-sm text-neutral-600">Нет доступной сделки.</p>
          )}
        </div>
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-sm font-medium">Кредит</div>
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
            Доступен только во время вашего хода. Сумма должна быть кратна {money(1000)}.
          </p>
        </div>
      </CardContent>
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
  "player:escaped_rat_race": "Выход из крысиных бегов",
  "turn:skipped": "Ход пропущен",
  "card:draw": "Вытянута карточка",
  "card:cash_delta": "Эффект карточки",
  "card:cashflow_delta": "Изменение денежного потока",
  "card:liability_created": "Создан долг по карточке",
  "card:condition_not_met": "Условие карточки не выполнено",
  "card:no_matching_assets": "Подходящие активы не найдены",
  "card:stock_quantity_changed": "Изменение акций",
  "deal:choice_required": "Выбор сделки",
  "deal:buy": "Покупка актива",
  "deal:decline": "Отказ от покупки",
  "deal:sell": "Продажа актива",
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
  deal_bought_turn_ended: "сделка куплена, ход завершен",
  deal_declined_turn_ended: "игрок отказался от сделки, ход завершен",
  player_choice: "игрок пропустил ход",
  passed_paycheck: "игрок прошел расчётный чек",
  landed_on_paycheck: "игрок встал на расчётный чек"
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
  deal: "Возможность крупная/мелкая",
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
      return compactDetails([numericDetail("Выпало", payload.dice)]);
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
    case "deal:choice_required":
      return ["Выберите: мелкая или крупная сделка."];
    case "deal:buy":
      return compactDetails([
        textDetail("Сделка", payload.title),
        numericDetail("Количество", payload.quantity),
        moneyDetail("Первоначальный взнос", -Math.abs(toNumber(payload.downPaymentCents))),
        moneyDetail("Cashflow", payload.cashflowCents, "/мес")
      ]);
    case "deal:decline":
      return compactDetails([
        textDetail("Тип", cardTypes[String(payload.cardType)] ?? humanizeToken(payload.cardType)),
        numericDetail("Карточка", payload.cardId)
      ]);
    case "loan:take":
      return compactDetails([
        moneyDetail("Получено наличными", payload.amountCents),
        moneyDetail("Новый платеж", payload.paymentCents, "/мес")
      ]);
    case "loan:repay":
      return compactDetails([moneyDetail("Погашено", -Math.abs(toNumber(payload.amountCents)))]);
    case "player:baby":
      return compactDetails([numericDetail("Детей теперь", payload.childrenCount)]);
    case "player:downsized":
      return compactDetails([
        moneyDetail("Расход", -Math.abs(toNumber(payload.costCents))),
        numericDetail("Пропуск ходов", payload.turns)
      ]);
    case "player:charity":
      return compactDetails([
        moneyDetail("Пожертвование", -Math.abs(toNumber(payload.donationCents))),
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
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
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
