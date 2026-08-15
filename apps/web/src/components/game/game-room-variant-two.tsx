"use client";

import {
  figurineImagePath,
  outstandingBankLoanBalanceCents
} from "@cashflow/shared";
import {
  Baby,
  Banknote,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  Dice1,
  Dices,
  Expand,
  HandCoins,
  Handshake,
  HeartHandshake,
  Landmark,
  Lightbulb,
  Map as MapIcon,
  Minus,
  Plus,
  ReceiptText,
  Route,
  Slash,
  Sparkles,
  Target,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import { localizeGameText } from "@/lib/game-labels";
import type { GamePlayer, GameSnapshot } from "@/lib/types";

export type GameRoomView = "classic" | "journey";

type VariantTwoProps = {
  snapshot: GameSnapshot;
  currentUserId: string;
  canRoll: boolean;
  turnTabRequest: number;
  actions: ReactNode;
};

type CompactSection = "board" | "finance" | "actions";

export function GameRoomVariantTwo({
  snapshot,
  currentUserId,
  canRoll,
  turnTabRequest,
  actions
}: VariantTwoProps) {
  const players = snapshot.players.filter(
    (player) => player.role === "PLAYER" && player.status === "JOINED"
  );
  const me = players.find((player) => player.userId === currentUserId);
  const currentPlayer = players.find((player) => player.id === snapshot.game.currentPlayerId);
  const initialSelectedId = me?.id ?? currentPlayer?.id ?? players[0]?.id ?? null;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialSelectedId);
  const [compactSection, setCompactSection] = useState<CompactSection>("finance");
  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? me ?? players[0];
  const actionAttention = snapshot.game.pendingAction?.gamePlayerId === me?.id;

  useEffect(() => {
    if (!selectedPlayerId || !players.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(initialSelectedId);
    }
  }, [initialSelectedId, players, selectedPlayerId]);

  useLayoutEffect(() => {
    if (turnTabRequest > 0) setCompactSection("actions");
  }, [turnTabRequest]);

  const compactTabs: Array<{
    id: CompactSection;
    label: string;
    icon: typeof MapIcon;
    attention?: boolean;
  }> = [
    { id: "board", label: "Поле", icon: MapIcon },
    { id: "finance", label: "Финансы", icon: WalletCards },
    { id: "actions", label: "Ход", icon: Dices, attention: actionAttention }
  ];

  return (
    <section
      className="journey-game-view grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-4 xl:h-full xl:min-h-0 xl:overflow-hidden"
      aria-label="Игровое поле, вариант 2"
    >
      <div
        className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#eef3e8] p-1.5 shadow-[0_10px_24px_rgba(83,109,69,.14)] xl:hidden"
        role="tablist"
        aria-label="Разделы игрового экрана"
      >
        {compactTabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = tab.id === compactSection;
          return (
            <button
              key={tab.id}
              id={`journey-mobile-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`journey-mobile-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setCompactSection(tab.id)}
              onKeyDown={(event) => {
                let nextIndex = index;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % compactTabs.length;
                if (event.key === "ArrowLeft") {
                  nextIndex = (index - 1 + compactTabs.length) % compactTabs.length;
                }
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = compactTabs.length - 1;
                if (nextIndex === index) return;

                event.preventDefault();
                const nextTab = compactTabs[nextIndex];
                if (!nextTab) return;
                setCompactSection(nextTab.id);
                document.getElementById(`journey-mobile-tab-${nextTab.id}`)?.focus();
              }}
              className={[
                "relative grid min-h-12 touch-manipulation select-none place-items-center gap-0.5 rounded-lg px-1 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718866]",
                active
                  ? "bg-[#dfe9d4] text-[#3f5b35]"
                  : "text-[#61715b] hover:bg-white/70 hover:text-[#3f5b35] active:bg-white/70 active:text-[#3f5b35]"
              ].join(" ")}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.attention ? (
                <span
                  className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#9d82b8] ring-2 ring-white"
                  aria-label="Требуется действие"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-4 xl:h-full xl:min-h-0 xl:grid-cols-[250px_minmax(0,1fr)_300px]">
        <aside
          id="journey-mobile-panel-finance"
          role="tabpanel"
          aria-labelledby="journey-mobile-tab-finance"
          className={[
            "min-w-0 space-y-3 xl:block xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1",
            compactSection === "finance" ? "block" : "hidden"
          ].join(" ")}
        >
          <JourneyPlayers
            players={players}
            currentPlayerId={snapshot.game.currentPlayerId}
            selectedPlayerId={selectedPlayer?.id ?? null}
            onSelect={setSelectedPlayerId}
          />
          <JourneyFinance player={selectedPlayer} />
          <JourneyExpenses player={selectedPlayer} />
          <JourneyLiabilities player={selectedPlayer} />
          <JourneyGoals player={selectedPlayer} />
        </aside>

        <div
          id="journey-mobile-panel-board"
          role="tabpanel"
          aria-labelledby="journey-mobile-tab-board"
          className={[
            "min-w-0 xl:block xl:h-full xl:min-h-0",
            compactSection === "board" ? "block" : "hidden"
          ].join(" ")}
        >
          <JourneyBoard snapshot={snapshot} />
        </div>

        <aside
          id="journey-mobile-panel-actions"
          role="tabpanel"
          aria-labelledby="journey-mobile-tab-actions"
          className={[
            "min-w-0 space-y-3 xl:block xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1",
            compactSection === "actions" ? "block" : "hidden"
          ].join(" ")}
        >
          <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-3 shadow-panel">
            {actions}
          </div>
          <JourneyHint
            snapshot={snapshot}
            currentPlayer={currentPlayer}
            currentUserId={currentUserId}
            canRoll={canRoll}
          />
        </aside>
      </div>

    </section>
  );
}

function JourneyPlayers({
  players,
  currentPlayerId,
  selectedPlayerId,
  onSelect
}: {
  players: GamePlayer[];
  currentPlayerId: string | null;
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-panel">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-extrabold">Игроки</h2>
        <UsersRound size={17} className="text-muted" aria-hidden="true" />
      </div>
      <ul className="mt-2 space-y-1">
        {players.map((player) => {
          const selected = player.id === selectedPlayerId;
          const current = player.id === currentPlayerId;
          return (
            <li key={player.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(player.id)}
                className={[
                  "grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2.5 py-2 text-left transition",
                  selected
                    ? "bg-[#e8effe] text-ink ring-1 ring-journey/30"
                    : "hover:bg-card"
                ].join(" ")}
              >
                <ProfileMark player={player} />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs font-extrabold">
                      {gamePlayerName(player)}
                    </span>
                    <PlayerEffectMarks player={player} />
                    {current ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-success" aria-label="Сейчас ходит" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {player.profession?.name ?? "Без профессии"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs font-extrabold tabular-nums">
                    {money(playerCapital(player))}
                  </span>
                  <span className="mt-1 block h-1 w-11 overflow-hidden rounded-full bg-[#dce4ef]">
                    <span
                      className="block h-full rounded-full bg-journey"
                      style={{ width: `${financialFreedomPercent(player)}%` }}
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PlayerEffectMarks({ player }: { player: GamePlayer }) {
  const state = player.financialState;
  if (!state) return null;

  return (
    <span className="flex shrink-0 items-center gap-1" aria-label="Состояние игрока">
      {state.charityTurns > 0 ? (
        <span
          className="grid h-5 min-w-5 place-items-center rounded-full bg-journey px-1 text-[9px] font-black leading-none text-white"
          title={`Благотворительность: два кубика, осталось ходов: ${state.charityTurns}`}
        >
          ×2
          <span className="sr-only">
            Благотворительность: два кубика, осталось ходов: {state.charityTurns}
          </span>
        </span>
      ) : (
        <span
          className="grid h-5 w-5 place-items-center rounded-full bg-[#e8effe] text-journey"
          title="Обычный ход: один кубик"
        >
          <Dice1 size={13} aria-hidden="true" />
          <span className="sr-only">Обычный ход: один кубик</span>
        </span>
      )}
      {state.downsizedTurns > 0 ? (
        <span
          className="grid h-5 w-5 place-items-center rounded-full bg-journey text-white"
          title={`Безработица: пропуск хода, осталось ходов: ${state.downsizedTurns}`}
        >
          <X size={13} strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">
            Безработица: пропуск хода, осталось ходов: {state.downsizedTurns}
          </span>
        </span>
      ) : null}
      {state.bankruptcyStatus !== "NONE" ? (
        <span
          className="grid h-5 w-5 place-items-center rounded-full bg-red-700 text-white"
          title="Банкротство"
        >
          <Slash size={13} strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">Банкротство</span>
        </span>
      ) : null}
    </span>
  );
}

function JourneyFinance({ player }: { player: GamePlayer | undefined }) {
  const state = player?.financialState;
  if (!player || !state) {
    return (
      <section className="rounded-2xl bg-white p-4 text-sm text-muted shadow-panel">
        Финансовые данные появятся после старта партии.
      </section>
    );
  }

  const assetValue = player.assets.reduce((sum, asset) => sum + asset.marketValueCents, 0);
  const liabilities = player.liabilities.reduce(
    (sum, liability) => sum + liability.balanceCents,
    0
  );
  const rows = [
    { label: "Наличные", value: money(state.cashCents), icon: Banknote },
    { label: "Доход в месяц", value: money(state.totalIncomeCents), icon: HandCoins },
    { label: "Расход в месяц", value: money(state.totalExpensesCents), icon: ReceiptText },
    { label: "Пассивный доход", value: money(state.passiveIncomeCents), icon: Sparkles },
    { label: "Активы", value: money(assetValue), icon: BriefcaseBusiness },
    { label: "Обязательства", value: money(-liabilities), icon: Landmark }
  ];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-panel">
      <h2 className="text-sm font-extrabold">
        Финансы: {gamePlayerName(player)}
      </h2>
      <dl className="mt-3 space-y-2.5">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
              <dt className="inline-flex items-center gap-2 text-muted">
                <Icon size={14} aria-hidden="true" />
                {row.label}
              </dt>
              <dd className="font-extrabold tabular-nums">{row.value}</dd>
            </div>
          );
        })}
      </dl>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
        <span className="text-xs text-muted">Денежный поток</span>
        <strong
          className={[
            "text-base tabular-nums",
            state.monthlyCashflowCents >= 0 ? "text-success" : "text-red-700"
          ].join(" ")}
        >
          {signedMoney(state.monthlyCashflowCents)}
        </strong>
      </div>
    </section>
  );
}

function JourneyExpenses({ player }: { player: GamePlayer | undefined }) {
  const state = player?.financialState;
  if (!player || !state) return null;
  const profession = player.profession;
  const rows = [
    ["Налоги", profession?.taxesCents],
    ["Ипотека", profession?.mortgagePaymentCents],
    ["Учебный кредит", profession?.schoolLoanPaymentCents],
    ["Автокредит", profession?.carLoanPaymentCents],
    ["Кредитные карты", profession?.creditCardPaymentCents],
    ["Розничные расходы", profession?.retailPaymentCents],
    ["Другие расходы", profession?.otherExpensesCents],
    ["Расходы на детей", profession?.childrenExpenseCents]
  ].filter((row): row is [string, number] => typeof row[1] === "number" && row[1] > 0);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-extrabold">
          <ReceiptText size={16} className="text-journey" aria-hidden="true" />
          Расходы
        </h2>
        <strong className="text-sm tabular-nums">{money(state.totalExpensesCents)}/мес</strong>
      </div>
      {rows.length > 0 ? (
        <dl className="mt-3 space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-xs">
              <dt className="text-muted">{label}</dt>
              <dd className="font-extrabold tabular-nums">{money(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-xs text-muted">Детализация расходов пока отсутствует.</p>
      )}
    </section>
  );
}

function JourneyLiabilities({ player }: { player: GamePlayer | undefined }) {
  if (!player) return null;
  const total = player.liabilities.reduce((sum, liability) => sum + liability.balanceCents, 0);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-extrabold">
          <Landmark size={16} className="text-journey" aria-hidden="true" />
          Долги
        </h2>
        <strong className="text-sm tabular-nums">{money(total)}</strong>
      </div>
      {player.liabilities.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {player.liabilities.map((liability) => (
            <li key={liability.id} className="rounded-xl bg-card p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold">{localizeGameText(liability.name)}</span>
                <strong className="shrink-0 tabular-nums">{money(liability.balanceCents)}</strong>
              </div>
              {liability.paymentCents > 0 ? (
                <div className="mt-1 text-muted">Платёж {money(liability.paymentCents)}/мес</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted">У игрока нет долгов.</p>
      )}
    </section>
  );
}

function JourneyGoals({ player }: { player: GamePlayer | undefined }) {
  const state = player?.financialState;
  const bankLoanBalanceCents = outstandingBankLoanBalanceCents(
    player?.liabilities ?? []
  );
  const goals = [
    {
      label: "Положительный денежный поток",
      complete: Boolean(state && state.monthlyCashflowCents > 0)
    },
    {
      label: "Пассивный доход выше расходов",
      complete: Boolean(state && state.passiveIncomeCents > state.totalExpensesCents)
    },
    {
      label: bankLoanBalanceCents > 0
        ? `Погасить банковские кредиты — осталось ${money(bankLoanBalanceCents)}`
        : "Погасить банковские кредиты",
      complete: Boolean(player && bankLoanBalanceCents === 0)
    },
    { label: "Достичь финансовой свободы", complete: Boolean(state?.wonAt) }
  ];
  const completed = goals.filter((goal) => goal.complete).length;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold">Путь к свободе</h2>
        <span className="rounded-lg bg-card px-2 py-1 text-xs font-extrabold text-muted">
          {completed}/{goals.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {goals.map((goal) => (
          <li key={goal.label} className="flex items-start gap-2 text-xs leading-5">
            <span
              className={[
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                goal.complete ? "bg-success text-white" : "border border-line text-transparent"
              ].join(" ")}
              aria-hidden="true"
            >
              <Check size={11} />
            </span>
            <span className={goal.complete ? "text-ink" : "text-muted"}>{goal.label}</span>
            <span className="sr-only">{goal.complete ? "выполнено" : "не выполнено"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ratRacePositions = [
  [18, 82], [28, 86], [39, 82], [49, 75], [59, 82], [70, 86],
  [81, 80], [87, 69], [82, 59], [72, 54], [62, 58], [52, 65],
  [42, 60], [32, 53], [22, 57], [13, 51], [12, 40], [20, 32],
  [31, 28], [41, 33], [50, 42], [60, 36], [70, 27], [80, 22]
] as const;

const boardPath = ratRacePositions.map(([x, y]) => `${x},${y}`).join(" ");

function JourneyBoard({ snapshot }: { snapshot: GameSnapshot }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const ratRacePlayers = snapshot.players.filter(
    (player) => player.role === "PLAYER" && player.track === "RAT_RACE" && player.position >= 0
  );
  const outsidePlayers = snapshot.players.filter(
    (player) => player.role === "PLAYER" && player.track === "RAT_RACE" && player.position < 0
  );

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === boardRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!boardRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await boardRef.current.requestFullscreen();
    }
  }

  return (
    <section className="h-full min-h-0 overflow-hidden rounded-2xl bg-[#e9ddc7] shadow-panel">
      <div
        ref={boardRef}
        className="journey-board-stage relative h-full min-h-0 overflow-auto bg-[#e9ddc7] p-2 sm:p-3 xl:grid xl:place-items-center"
      >
        <div
          className="journey-board-canvas relative mx-auto aspect-[4/3] min-h-[390px] min-w-[640px] max-w-[900px] origin-center overflow-hidden rounded-xl bg-[#eee1c9] transition-transform duration-200 xl:min-h-0 xl:max-h-full"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src="/financial-journey-board.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.13] mix-blend-multiply"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[#eadbbd]/50" aria-hidden="true" />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={boardPath}
              fill="none"
              stroke="rgba(57, 67, 56, 0.18)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={boardPath}
              fill="none"
              stroke="#f7eddc"
              strokeWidth="8.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {snapshot.board.map((cell) => {
            const [x, y] = ratRacePositions[cell.index] ?? [50, 50];
            const cellPlayers = ratRacePlayers.filter((player) => player.position === cell.index);
            const CellIcon = boardCellIcons[cell.type] ?? Route;
            return (
              <div
                key={cell.index}
                className={[
                  "absolute grid h-11 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border text-center shadow-[0_5px_12px_rgba(57,45,30,.16)] sm:h-12 sm:w-16",
                  boardCellTones[cell.type] ?? boardCellTones.deal
                ].join(" ")}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${cell.index === 0 ? "Старт" : `Клетка ${cell.index}`}: ${localizeGameText(cell.label)}`}
              >
                {cell.index === 0 ? (
                  <span className="text-xs font-black uppercase">Старт</span>
                ) : cell.type === "deal" ? (
                  <span className="text-sm font-black tabular-nums">{cell.index}</span>
                ) : (
                  <CellIcon size={17} aria-hidden="true" />
                )}
                <span className="sr-only">{localizeGameText(cell.label)}</span>
                {cellPlayers.length > 0 ? (
                  <span className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 -space-x-2">
                    {cellPlayers.map((player) => (
                      <PlayerMark key={player.id} player={player} size="sm" current={player.id === snapshot.game.currentPlayerId} />
                    ))}
                  </span>
                ) : null}
              </div>
            );
          })}

          {outsidePlayers.length > 0 ? (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-muted shadow-panel">
              <span>Готовятся к старту</span>
              <span className="flex -space-x-2">
                {outsidePlayers.map((player) => (
                  <PlayerMark key={player.id} player={player} size="xs" />
                ))}
              </span>
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-4 right-4 flex gap-2">
          <BoardControl
            label="Уменьшить поле"
            disabled={zoom <= 0.85}
            onClick={() => setZoom((value) => Math.max(0.85, Number((value - 0.1).toFixed(2))))}
          >
            <Minus size={18} aria-hidden="true" />
          </BoardControl>
          <BoardControl
            label="Увеличить поле"
            disabled={zoom >= 1.25}
            onClick={() => setZoom((value) => Math.min(1.25, Number((value + 0.1).toFixed(2))))}
          >
            <Plus size={18} aria-hidden="true" />
          </BoardControl>
          <BoardControl
            label={fullscreen ? "Выйти из полноэкранного режима" : "Открыть поле на весь экран"}
            onClick={() => void toggleFullscreen()}
          >
            <Expand size={18} aria-hidden="true" />
          </BoardControl>
        </div>
      </div>
    </section>
  );
}

function BoardControl({
  label,
  disabled = false,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-xl bg-white text-ink shadow-[0_7px_18px_rgba(23,36,63,.18)] transition hover:-translate-y-0.5 hover:text-journey disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function JourneyHint({
  snapshot,
  currentPlayer,
  currentUserId,
  canRoll
}: {
  snapshot: GameSnapshot;
  currentPlayer: GamePlayer | undefined;
  currentUserId: string;
  canRoll: boolean;
}) {
  const pending = snapshot.game.pendingAction;
  const me = snapshot.players.find((player) => player.userId === currentUserId);
  let text = currentPlayer
    ? `Сейчас действует ${gamePlayerName(currentPlayer)}. Изменения появятся у всех участников автоматически.`
    : "Ожидаем следующего игрока.";

  if (snapshot.game.status === "ENDED") {
    text = "Партия завершена. Итоговые показатели сохранены в личном кабинете.";
  } else if (snapshot.game.status === "PAUSED") {
    text = snapshot.game.pauseReason === "period_complete"
      ? `Период ${snapshot.game.currentPeriod} завершён. Ожидайте начала следующего периода.`
      : snapshot.game.pauseReason === "player_left"
        ? "Вы вышли из игры, поэтому партия остановлена. Текущий ход и весь прогресс сохранены."
        : "Игра поставлена на паузу. Текущий ход и все незавершённые действия сохранены.";
  } else if (canRoll) {
    text = "Ваш ход: бросьте кубик. После движения здесь появится следующее обязательное действие.";
  } else if (pending && pending.gamePlayerId === me?.id) {
    text = `Завершите действие «${pendingActionLabels[pending.type] ?? "текущий выбор"}», чтобы продолжить ход.`;
  }

  return (
    <section className="rounded-2xl bg-ink p-4 text-white shadow-panel">
      <h2 className="inline-flex items-center gap-2 text-sm font-extrabold">
        <Lightbulb size={17} className="text-[#fbb16b]" aria-hidden="true" />
        Подсказка
      </h2>
      <p className="mt-2 text-xs leading-5 text-white/75">{text}</p>
    </section>
  );
}

function ProfileMark({ player }: { player: GamePlayer }) {
  const profileFigurine = player.figurine ?? player.user?.figurine;
  const avatarUrl = player.user?.avatarUrl;
  const name = gamePlayerName(player);
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <span
      className={[
        "grid shrink-0 place-items-center",
        profileFigurine
          ? "h-10 w-10"
          : "h-9 w-9 overflow-hidden rounded-full bg-journey text-xs font-black text-white shadow-[0_4px_10px_rgba(23,36,63,.22)]"
      ].join(" ")}
      title={`Профиль: ${name}`}
    >
      {profileFigurine ? (
        <img src={figurineImagePath(profileFigurine)} alt="" className="h-full w-full object-contain" />
      ) : avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : initials}
      <span className="sr-only">Изображение профиля игрока {name}</span>
    </span>
  );
}

function PlayerMark({
  player,
  size,
  current = false
}: {
  player: GamePlayer;
  size: "xs" | "sm" | "md";
  current?: boolean;
}) {
  const figurine = player.figurine ?? player.user?.figurine;
  const sizeClass = figurine
    ? {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10"
      }[size]
    : {
        xs: "h-5 w-5 text-xs",
        sm: "h-7 w-7 text-xs",
        md: "h-9 w-9 text-xs"
      }[size];
  const name = gamePlayerName(player);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={[
        "grid shrink-0 place-items-center",
        figurine
          ? ""
          : "rounded-full bg-journey font-black text-white shadow-[0_4px_10px_rgba(23,36,63,.22)]",
        sizeClass,
        current ? (figurine ? "relative z-10 scale-110" : "ring-2 ring-action ring-offset-2") : ""
      ].join(" ")}
      title={name}
    >
      {figurine ? (
        <img src={figurineImagePath(figurine)} alt="" className="h-full w-full object-contain" />
      ) : (
        initials
      )}
      <span className="sr-only">{name}{current ? ", сейчас ходит" : ""}</span>
    </span>
  );
}

function playerCapital(player: GamePlayer) {
  const state = player.financialState;
  const assets = player.assets.reduce((sum, asset) => sum + asset.marketValueCents, 0);
  const liabilities = player.liabilities.reduce(
    (sum, liability) => sum + liability.balanceCents,
    0
  );
  return (state?.cashCents ?? 0) + assets - liabilities;
}

function financialFreedomPercent(player: GamePlayer) {
  const state = player.financialState;
  if (!state) return 0;
  if (state.passiveIncomeCents >= state.totalExpensesCents) return 100;
  return Math.max(
    0,
    Math.min(100, Math.round((state.passiveIncomeCents / Math.max(1, state.totalExpensesCents)) * 100))
  );
}

function signedMoney(value: number) {
  if (value === 0) return money(0);
  return `${value > 0 ? "+" : "−"}${money(Math.abs(value))}`;
}

const boardCellTones: Record<string, string> = {
  deal: "border-[#bbccf3] bg-[#e8effe] text-[#174397]",
  market: "border-[#c5b4ea] bg-[#eee9fa] text-[#4d328f]",
  paycheck: "border-[#bad08c] bg-[#eaf3e0] text-[#405719]",
  doodad: "border-[#fdd2a8] bg-[#fff0df] text-[#8a3d0a]",
  charity: "border-[#f3b8c9] bg-[#fff1f5] text-[#9f3658]",
  baby: "border-[#f5d794] bg-[#fff8df] text-[#7d5a10]",
  downsized: "border-[#bec8d5] bg-[#eef1f5] text-[#2c3e61]"
};

const boardCellIcons: Record<string, typeof Route> = {
  deal: Handshake,
  market: Landmark,
  paycheck: Banknote,
  doodad: BriefcaseBusiness,
  charity: HeartHandshake,
  baby: Baby,
  downsized: CircleAlert
};

const pendingActionLabels: Record<string, string> = {
  choose_deal: "выбор сделки",
  deal_card_drawn: "решение по сделке",
  stock_sale_window: "продажа акций",
  charity_choice: "благотворительность",
  doodad_payment_choice: "выбор оплаты",
  market_sale: "предложение рынка"
};
