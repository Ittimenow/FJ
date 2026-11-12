"use client";

import { figurineImagePath } from "@cashflow/shared";
import { BriefcaseBusiness, Dices, Landmark, ReceiptText, UserRound } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { gamePlayerName } from "@/lib/game-player";
import { localizeGameText } from "@/lib/game-labels";
import { cn } from "@/lib/utils";
import type { GamePlayer, GameSnapshot } from "@/lib/types";

/** Shared geometry for both editions; each edition supplies its own financial data and actions. */
export function RatRaceBoard({ snapshot, movingPlayerId = null, children }: {
  snapshot: GameSnapshot;
  movingPlayerId?: string | null;
  children: ReactNode;
}) {
  return (
    <section className="desktop-game-board-shell w-full rounded-2xl bg-card p-3 shadow-panel" aria-label="Поле малого круга" data-moving-player={movingPlayerId ?? undefined}>
      <div className="desktop-game-board-grid grid justify-center gap-2 overflow-x-auto">
        {snapshot.board.map(cell => (
          <BoardCellTile key={cell.index} cell={cell} players={cellPlayers(snapshot, cell.index)} movingPlayerId={movingPlayerId} style={ringCellStyle(cell.index)} compact />
        ))}
        <div className="min-h-0 min-w-0 overflow-hidden rounded-xl bg-surface p-3" style={{ gridColumn: "2 / 8", gridRow: "2 / 6" }}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function RatRaceMobileBoard({
  snapshot,
  selectedPlayer,
  movingPlayerId = null,
  containerRef
}: {
  snapshot: GameSnapshot;
  selectedPlayer: GamePlayer | undefined;
  containerRef?: RefObject<HTMLDivElement | null>;
  movingPlayerId?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followedPlayer = snapshot.players.find((player) => player.id === movingPlayerId) ?? selectedPlayer;
  const targetCellIndex = followedPlayer?.track === "RAT_RACE" && followedPlayer.position >= 0 ? followedPlayer.position : 0;
  useEffect(() => {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-board-cell="${targetCellIndex}"]`
    );
    if (!container || !target) return;
    container.scrollTo({
      left: target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2,
      behavior: "instant"
    });
  }, [snapshot.game.id, targetCellIndex]);

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full" data-moving-player={movingPlayerId ?? undefined}>
      <div className="min-w-0 max-w-full overflow-hidden bg-card/60">
        <div
          ref={scrollRef}
          className="relative grid h-[88px] w-full min-w-0 max-w-full touch-pan-y snap-x snap-mandatory grid-flow-col auto-cols-auto overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth px-[calc(50%_-_23px)] pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Малый круг"
        >
          {snapshot.board.map((cell) => {
            const players = cellPlayers(snapshot, cell.index);
            const appearance = boardCellAppearances[cell.type] ?? defaultBoardCellAppearance;
            return (
              <div
                key={cell.index}
                data-board-cell={cell.index}
                style={{ width: Math.max(46, players.length * 40 + 8) }}
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
                    movingPlayerId={movingPlayerId}
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
  active = false,
  movingPlayerId = null
}: {
  cell: GameSnapshot["board"][number];
  players: GamePlayer[];
  style?: CSSProperties;
  compact?: boolean;
  mobile?: boolean;
  active?: boolean;
  movingPlayerId?: string | null;
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
      data-board-cell={cell.index}
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
        <PlayerTokenStack players={players} desktopBoard={compact} movingPlayerId={movingPlayerId} />
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
  const overlapClass = desktopBoard ? "-ml-7" : mobileBoard ? "ml-1" : "-ml-3";

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

export function PlayerToken({
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
        data-player-id={player.id}
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


export type RatRaceTab = "turn" | "player" | "assets" | "expenses" | "liabilities";

/** A shared tab strip and independent scroll area; turn content stays mounted while inspecting finances. */
export function RatRaceTabs({
  idPrefix,
  board,
  turn,
  player,
  assets,
  expenses,
  liabilities,
  turnTabRequest = 0,
  tabRequest,
  actionAttention = false,
  assetCount,
  liabilityCount,
  variant = "mobile",
  initialTab = "player",
  className
}: {
  idPrefix: string;
  board?: ReactNode;
  turn?: ReactNode;
  player: ReactNode;
  assets: ReactNode;
  expenses: ReactNode;
  liabilities: ReactNode;
  turnTabRequest?: number;
  tabRequest?: { tab: RatRaceTab; sequence: number };
  actionAttention?: boolean;
  assetCount?: number;
  liabilityCount?: number;
  variant?: "mobile" | "desktop";
  initialTab?: RatRaceTab;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<RatRaceTab>(initialTab);
  const scrollPanelRef = useRef<HTMLDivElement>(null);
  const mobile = variant === "mobile";
  const hasTurn = turn !== undefined;

  useLayoutEffect(() => {
    if (turnTabRequest > 0 && hasTurn) {
      setActiveTab("turn");
      scrollPanelRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [turnTabRequest, hasTurn]);

  useLayoutEffect(() => {
    if (tabRequest && (tabRequest.tab !== "turn" || hasTurn)) {
      setActiveTab(tabRequest.tab);
      scrollPanelRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [tabRequest?.sequence, tabRequest?.tab, hasTurn]);

  const iconSize = mobile ? 17 : 15;
  const tabs: Array<{ id: RatRaceTab; label: string; icon: ReactNode; count?: number | undefined; attention?: boolean }> = [
    ...(hasTurn ? [{ id: "turn" as const, label: "Ход", icon: <Dices size={iconSize} />, attention: actionAttention }] : []),
    { id: "player", label: "Игрок", icon: <UserRound size={iconSize} /> },
    { id: "assets", label: "Активы", icon: <BriefcaseBusiness size={iconSize} />, count: assetCount },
    { id: "expenses", label: "Расходы", icon: <ReceiptText size={iconSize} /> },
    { id: "liabilities", label: "Долги", icon: <Landmark size={iconSize} />, count: liabilityCount }
  ];
  const contents = { player, assets, expenses, liabilities };

  return (
    <section className={cn("flex h-full min-h-0 w-full min-w-0 flex-col bg-white", mobile ? "mobile-game-layout" : "overflow-hidden rounded-xl shadow-panel", className)}>
      <div className={cn("shrink-0 bg-card", mobile && "mobile-game-pinned")}>
        {board}
        <div className={cn("grid min-w-0 gap-1.5 bg-[#eef3e8] p-2", hasTurn ? "grid-cols-5" : "grid-cols-4")} role="tablist" aria-label="Информация об игроке">
          {tabs.map((tab, index) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`${idPrefix}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${idPrefix}-tab-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={event => {
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
                  document.getElementById(`${idPrefix}-tab-${nextTab.id}`)?.focus();
                }}
                className={cn(
                  "relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718866]",
                  mobile ? "touch-manipulation select-none px-0.5 text-[9px] min-[360px]:text-[10px]" : "px-1 text-[10px]",
                  active ? "bg-[#dfe9d4] text-[#3f5b35]" : "bg-transparent text-[#61715b] hover:bg-white/70 hover:text-[#3f5b35] active:bg-white/70 active:text-[#3f5b35]"
                )}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span className="w-full truncate text-center">{tab.label}</span>
                {tab.count !== undefined ? <span className={cn("absolute right-1 top-1 inline-flex min-w-4 justify-center rounded-full px-1 text-[8px] leading-4", active ? "bg-[#718866] text-white" : "bg-white text-[#61715b]")}>{tab.count}</span> : null}
                {tab.attention ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#9d82b8] ring-2 ring-white" aria-label="Требуется действие" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div ref={scrollPanelRef} id={`${idPrefix}-tab-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${activeTab}`} className={cn("min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3", mobile && "mobile-game-scroll-panel min-[420px]:p-4", mobile && activeTab === "turn" && "pt-0 min-[420px]:pt-0")}>
        {hasTurn ? <div className={activeTab === "turn" ? "block" : "hidden"} aria-hidden={activeTab !== "turn"}>{turn}</div> : null}
        {activeTab !== "turn" ? contents[activeTab] : null}
      </div>
    </section>
  );
}
export const cellTypes: Record<string, string> = {
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

