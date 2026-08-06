"use client";

import {
  ArrowLeft,
  BriefcaseBusiness,
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  Landmark,
  MonitorUp,
  Pause,
  Play,
  ReceiptText,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { eventCashChange } from "@/components/game/game-event-result";
import {
  eventHeadline,
  pendingActionLabel,
  playerGameStatus,
  turnHeadline,
  turnsForPlayer,
  type PlayerTurn
} from "@/components/game/game-journal";
import { GamePlayerMark } from "@/components/game/game-player-mark";
import {
  readDisplayFieldView,
  setDisplayFieldView,
  type DisplayFieldView
} from "@/components/game/game-display";
import { formatGameTime, useLiveGame, useRemainingSeconds } from "@/components/game/use-live-game";
import { publicApiBaseUrl } from "@/lib/api";
import { connectionPresentation } from "@/lib/connection-health";
import { money, shortDate } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import { gameStatusLabel } from "@/lib/game-labels";
import type { GameEvent, GamePlayer, GameSnapshot } from "@/lib/types";

type HostPlayerInsight = { title: string; body: string };

export function HostControlRoom({
  initialSnapshot,
  token
}: {
  initialSnapshot: GameSnapshot;
  token: string;
}) {
  const { snapshot, connection, loading, error, changeTimeline } = useLiveGame(initialSnapshot, token);
  const connectionStatus = connectionPresentation(connection.phase);
  const remaining = useRemainingSeconds(snapshot);
  const players = snapshot.players.filter((player) => player.role === "PLAYER");
  const currentPlayer = players.find((player) => player.id === snapshot.game.currentPlayerId);
  const [displayView, setDisplayView] = useState<DisplayFieldView>("classic");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState(initialSnapshot.events);
  const [archiveLoaded, setArchiveLoaded] = useState(initialSnapshot.events.length < 80);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null;
  const systemEvents = useMemo(
    () => snapshot.events.filter((event) => event.type.startsWith("game:")).slice(-6).reverse(),
    [snapshot.events]
  );

  useEffect(() => {
    setHistoryEvents((current) => mergeEvents(current, snapshot.events));
  }, [snapshot.events]);

  useEffect(() => {
    const storedView = readDisplayFieldView(snapshot.game.id);
    if (storedView) setDisplayView(storedView);
  }, [snapshot.game.id]);

  function chooseDisplayView(view: DisplayFieldView) {
    setDisplayView(view);
    setDisplayFieldView(snapshot.game.id, view);
  }

  function openDisplay() {
    setDisplayFieldView(snapshot.game.id, displayView);
    window.open(`/games/${snapshot.game.id}/display?view=${displayView}`, "_blank", "noopener,noreferrer");
  }

  async function openPlayerDetails(playerId: string) {
    setSelectedPlayerId(playerId);
    if (archiveLoaded || archiveLoading || snapshot.events.length < 80) return;
    setArchiveLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/replay`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = (await response.json()) as { events?: GameEvent[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Не удалось загрузить полную историю");
      setHistoryEvents((current) => mergeEvents(current, data.events ?? []));
      setArchiveLoaded(true);
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : "Не удалось загрузить полную историю");
    } finally {
      setArchiveLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf2e8] text-ink">
      <header className="sticky top-0 z-40 border-b border-[#dfcebb] bg-[#faf2e8]/95 px-3 py-3 backdrop-blur-md sm:px-5">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/games/${snapshot.game.id}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-ink shadow-[0_7px_18px_rgba(23,36,63,.1)] transition hover:-translate-y-0.5 hover:text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30"
              aria-label="Вернуться в игровую комнату"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-[-.025em]">Пульт ведущего</h1>
              <p className="truncate text-xs text-muted">{snapshot.game.title} · {gameStatusLabel(snapshot.game.status)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {currentPlayer ? (
              <HostStatus
                label={`Сейчас ходит: ${gamePlayerName(currentPlayer)}${pendingActionLabel(snapshot, currentPlayer) ? ` · ${pendingActionLabel(snapshot, currentPlayer)}` : ""}`}
                tone="action"
              />
            ) : null}
            <HostStatus label={`Раунд ${snapshot.game.currentRound}`} />
            <HostStatus label={`Период ${snapshot.game.currentPeriod}/${snapshot.game.periodCount}`} />
            <HostStatus icon={<Clock3 size={14} />} label={formatGameTime(remaining)} tabular />
            <HostStatus
              icon={<CircleDot size={13} />}
              label={connectionStatus.label}
              tone={connectionStatus.tone === "success" ? "success" : connectionStatus.tone === "neutral" ? "neutral" : "danger"}
            />
            {snapshot.game.status === "IN_PROGRESS" ? (
              <button
                type="button"
                onClick={() => void changeTimeline("pause")}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-extrabold shadow-[0_7px_18px_rgba(23,36,63,.1)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30 disabled:cursor-wait disabled:opacity-55"
              >
                <Pause size={16} aria-hidden="true" /> Пауза
              </button>
            ) : snapshot.game.status === "PAUSED" ? (
              <button
                type="button"
                onClick={() => void changeTimeline("resume")}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-action px-3 text-sm font-extrabold text-ink shadow-[0_8px_20px_rgba(249,143,47,.24)] transition hover:-translate-y-0.5 hover:bg-[#e77b1e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey/25 disabled:cursor-wait disabled:opacity-55"
              >
                <Play size={16} aria-hidden="true" /> Продолжить
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1760px] px-3 py-4 sm:px-5">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#17243f] px-4 py-3 text-white shadow-[0_12px_32px_rgba(23,36,63,.2)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-action text-ink">
              <MonitorUp size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Экран для трансляции</h2>
              <p className="text-xs text-white/70">Выберите вид поля и откройте его на втором экране.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 rounded-xl bg-white/10 p-1" role="group" aria-label="Вариант игрового поля">
              {(["classic", "journey"] as DisplayFieldView[]).map((view, index) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={displayView === view}
                  onClick={() => chooseDisplayView(view)}
                  className={[
                    "h-9 rounded-lg px-3 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action",
                    displayView === view ? "bg-white text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
                  ].join(" ")}
                >
                  Поле {index + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openDisplay}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-action px-4 text-sm font-extrabold text-ink shadow-[0_8px_20px_rgba(249,143,47,.24)] transition hover:-translate-y-0.5 hover:bg-[#e77b1e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
            >
              Открыть поле <ExternalLink size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        {error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}

        <section className="mt-4" aria-labelledby="host-players-title">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 id="host-players-title" className="inline-flex items-center gap-2 text-lg font-extrabold">
              <UsersRound size={19} className="text-journey" aria-hidden="true" />
              Игроки
            </h2>
            <span className="text-sm font-bold text-muted">Все участники перед вами · {players.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 min-[980px]:grid-cols-3">
            {players.map((player) => (
              <HostPlayerCard
                key={player.id}
                snapshot={snapshot}
                player={player}
                onOpen={() => void openPlayerDetails(player.id)}
              />
            ))}
          </div>
        </section>

        <SystemEvents events={systemEvents} />
      </main>

      {selectedPlayer ? (
        <PlayerDetailsDrawer
          player={selectedPlayer}
          snapshot={snapshot}
          events={historyEvents}
          loading={archiveLoading}
          error={historyError}
          onClose={() => setSelectedPlayerId(null)}
        />
      ) : null}
    </div>
  );
}

function HostStatus({
  label,
  icon,
  tone = "neutral",
  tabular = false
}: {
  label: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "action";
  tabular?: boolean;
}) {
  return (
    <span
      role={tone === "success" || tone === "danger" ? "status" : undefined}
      aria-live={tone === "success" || tone === "danger" ? "polite" : undefined}
      className={[
        "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold",
        tone === "success"
          ? "bg-[#eaf3e0] text-success"
          : tone === "danger"
            ? "bg-red-50 text-red-700"
            : tone === "action"
              ? "bg-[#fff0df] text-[#8a3d0a]"
              : "bg-white text-ink",
        tabular ? "tabular-nums" : ""
      ].join(" ")}
    >
      {icon}<span>{label}</span>
    </span>
  );
}

function HostPlayerCard({
  snapshot,
  player,
  insight,
  onOpen
}: {
  snapshot: GameSnapshot;
  player: GamePlayer;
  insight?: HostPlayerInsight;
  onOpen: () => void;
}) {
  const active = snapshot.game.currentPlayerId === player.id;
  const state = player.financialState;
  const status = playerGameStatus(snapshot, player);
  const pending = pendingActionLabel(snapshot, player);
  const turns = turnsForPlayer(snapshot.events, player.id).slice(0, 2);

  return (
    <article className={[
      "flex h-[230px] flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-[0_10px_28px_rgba(23,36,63,.1)]",
      active ? "ring-2 ring-action ring-offset-2 ring-offset-[#faf2e8]" : ""
    ].join(" ")}>
      <div className="flex min-h-11 shrink-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <GamePlayerMark player={player} size="md" active={active} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold">{gamePlayerName(player)}</h3>
            <p className="mt-0.5 truncate text-xs text-muted">{player.profession?.name ?? "Профессия не выдана"}</p>
          </div>
        </div>
        <span className={[
          "shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold",
          active ? "bg-[#fff0df] text-[#8a3d0a]" : status === "Выбыл" ? "bg-red-50 text-red-700" : "bg-card text-muted"
        ].join(" ")}>
          {active ? `Сейчас: ${status}` : status}
        </span>
      </div>

      {state ? (
        <dl className="mt-2 grid h-10 shrink-0 grid-cols-3 gap-1.5">
          <PlayerMetric label="Наличные" value={money(state.cashCents)} />
          <PlayerMetric label="Денежный поток" value={signedMoney(state.monthlyCashflowCents)} tone={state.monthlyCashflowCents >= 0 ? "positive" : "negative"} />
          <PlayerMetric label="Пассивный доход" value={`${money(state.passiveIncomeCents)}/мес`} />
        </dl>
      ) : <p className="mt-3 rounded-xl bg-card p-3 text-xs text-muted">Финансы появятся после старта партии.</p>}

      <div className="mt-2 min-h-0 flex-1 overflow-hidden border-t border-line/70 pt-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-extrabold">История игрока</h4>
          {pending ? <span className="truncate text-xs font-extrabold text-[#8a3d0a]">{pending}</span> : null}
        </div>
        {turns.length > 0 ? (
          <ol className="mt-1 space-y-0.5 overflow-hidden">
            {turns.map((turn) => <CompactTurn key={turn.id} turn={turn} />)}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-muted">Ходов пока нет.</p>
        )}
        {insight ? (
          <div className="mt-2 rounded-xl bg-[#f4f0ff] p-2 text-xs text-[#513393]">
            <strong>{insight.title}</strong><p className="mt-1">{insight.body}</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-2 inline-flex h-9 shrink-0 items-center justify-between rounded-xl bg-[#eef3e8] px-3 text-xs font-extrabold text-[#3f5b35] transition hover:bg-[#dfe9d4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
      >
        Полная история и финансы <ChevronRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

function PlayerMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "positive" | "negative" }) {
  return (
    <div className="min-w-0 rounded-xl bg-card px-2 py-1.5">
      <dt className="truncate text-xs font-bold text-muted">{label}</dt>
      <dd className={[
        "mt-1 truncate text-xs font-extrabold tabular-nums",
        tone === "positive" ? "text-success" : tone === "negative" ? "text-red-700" : "text-ink"
      ].join(" ")}>{value}</dd>
    </div>
  );
}

function CompactTurn({ turn }: { turn: PlayerTurn }) {
  const financialDelta = turn.events.reduce((sum, event) => sum + (eventCashChange(event)?.deltaCents ?? 0), 0);
  const first = turn.events[0];
  return (
    <li className="flex min-w-0 items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-muted">
        {first?.createdAt ? `${shortDate(first.createdAt)} · ` : ""}{turnHeadline(turn)}
      </span>
      <span className={[
        "shrink-0 font-extrabold tabular-nums",
        financialDelta > 0 ? "text-success" : financialDelta < 0 ? "text-red-700" : "text-muted"
      ].join(" ")}>
        {financialDelta === 0 ? (turn.complete ? "Готово" : "В процессе") : signedMoney(financialDelta)}
      </span>
    </li>
  );
}

function SystemEvents({ events }: { events: GameEvent[] }) {
  return (
    <details className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_22px_rgba(23,36,63,.08)]">
      <summary className="cursor-pointer text-sm font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">Системные события партии</summary>
      {events.length > 0 ? (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl bg-card px-3 py-2 text-xs text-muted">
              <strong className="text-ink">{eventHeadline(event)}</strong>
              <span className="mt-1 block">{shortDate(event.createdAt)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-sm text-muted">Системных событий пока нет.</p>}
    </details>
  );
}

function PlayerDetailsDrawer({
  player,
  snapshot,
  events,
  loading,
  error,
  onClose
}: {
  player: GamePlayer;
  snapshot: GameSnapshot;
  events: GameEvent[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const state = player.financialState;
  const turns = turnsForPlayer(events, player.id);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#102a5c]/55" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-details-title"
        className="ml-auto flex h-full w-full max-w-2xl flex-col bg-[#faf2e8] shadow-[-18px_0_48px_rgba(5,18,45,.28)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <GamePlayerMark player={player} size="lg" active={snapshot.game.currentPlayerId === player.id} />
            <div className="min-w-0">
              <h2 id="player-details-title" className="truncate text-xl font-extrabold">{gamePlayerName(player)}</h2>
              <p className="truncate text-sm text-muted">{player.profession?.name ?? "Профессия не выдана"}</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl bg-white text-muted shadow-[0_7px_18px_rgba(23,36,63,.1)] transition hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25" aria-label="Закрыть подробности">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {state ? (
            <section aria-label="Финансовые показатели">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <DetailMetric icon={<WalletCards size={16} />} label="Наличные" value={money(state.cashCents)} />
                <DetailMetric icon={<ReceiptText size={16} />} label="Расходы" value={`${money(state.totalExpensesCents)}/мес`} />
                <DetailMetric icon={<BriefcaseBusiness size={16} />} label="Пассивный доход" value={`${money(state.passiveIncomeCents)}/мес`} />
                <DetailMetric icon={<Landmark size={16} />} label="Денежный поток" value={`${signedMoney(state.monthlyCashflowCents)}/мес`} />
                <DetailMetric icon={<BriefcaseBusiness size={16} />} label="Активы" value={String(player.assets.length)} />
                <DetailMetric icon={<Landmark size={16} />} label="Обязательства" value={money(player.liabilities.reduce((sum, item) => sum + item.balanceCents, 0))} />
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_7px_18px_rgba(23,36,63,.07)]">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-muted">Путь к финансовой свободе</span>
                  <strong className="tabular-nums">{freedomPercent(state.passiveIncomeCents, state.totalExpensesCents)}%</strong>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce4ef]"
                  role="progressbar"
                  aria-label="Пассивный доход относительно расходов"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={freedomPercent(state.passiveIncomeCents, state.totalExpensesCents)}
                >
                  <span
                    className="block h-full rounded-full bg-success"
                    style={{ width: `${freedomPercent(state.passiveIncomeCents, state.totalExpensesCents)}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FinancialList
                  title="Активы"
                  empty="Активов пока нет."
                  rows={player.assets.map((asset) => ({
                    id: asset.id,
                    label: asset.name,
                    value: money(asset.marketValueCents || asset.costBasisCents),
                    note: asset.cashflowCents ? `${signedMoney(asset.cashflowCents)}/мес` : null
                  }))}
                />
                <FinancialList
                  title="Обязательства"
                  empty="Обязательств нет."
                  rows={player.liabilities.map((liability) => ({
                    id: liability.id,
                    label: liability.name,
                    value: money(liability.balanceCents),
                    note: liability.paymentCents ? `${money(liability.paymentCents)}/мес` : null
                  }))}
                />
              </div>
            </section>
          ) : null}
          <section className="mt-5" aria-labelledby="player-full-history-title">
            <h3 id="player-full-history-title" className="text-base font-extrabold">Полная история ходов</h3>
            {loading ? <p className="mt-3 text-sm font-bold text-muted">Загружаем ранние ходы…</p> : null}
            {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}. Закройте и откройте карточку, чтобы повторить.</p> : null}
            {turns.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {turns.map((turn) => (
                  <li key={turn.id} className="rounded-2xl bg-white p-4 shadow-[0_7px_18px_rgba(23,36,63,.07)]">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{turn.complete ? "Завершённый ход" : "Ход в процессе"}</strong>
                      <span className="text-xs text-muted">{turn.events[0]?.createdAt ? shortDate(turn.events[0].createdAt) : ""}</span>
                    </div>
                    <ol className="mt-2 space-y-1.5">
                      {turn.events.filter((event) => event.type !== "state:update").map((event) => (
                        <li key={event.id} className="text-sm text-muted">{eventHeadline(event)}</li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm text-muted">Ходов пока нет.</p>}
          </section>
        </div>
      </aside>
    </div>
  );
}

function DetailMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-[0_7px_18px_rgba(23,36,63,.07)]">
      <div className="flex items-center gap-2 text-journey">{icon}<span className="text-xs font-bold text-muted">{label}</span></div>
      <div className="mt-2 text-sm font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function FinancialList({
  title,
  empty,
  rows
}: {
  title: string;
  empty: string;
  rows: Array<{ id: string; label: string; value: string; note: string | null }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_7px_18px_rgba(23,36,63,.07)]">
      <h3 className="text-sm font-extrabold">{title}</h3>
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 border-t border-line/70 pt-2 first:border-0 first:pt-0">
              <span className="min-w-0 truncate text-sm text-muted">{row.label}</span>
              <span className="shrink-0 text-right text-xs">
                <strong className="block tabular-nums text-ink">{row.value}</strong>
                {row.note ? <span className="mt-0.5 block font-bold tabular-nums text-success">{row.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-muted">{empty}</p>}
    </section>
  );
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;
}

function freedomPercent(passiveIncomeCents: number, totalExpensesCents: number) {
  if (passiveIncomeCents >= totalExpensesCents) return 100;
  return Math.max(0, Math.min(100, Math.round((passiveIncomeCents / Math.max(1, totalExpensesCents)) * 100)));
}

function mergeEvents(current: GameEvent[], incoming: GameEvent[]) {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()].sort((left, right) => left.sequence - right.sequence);
}
