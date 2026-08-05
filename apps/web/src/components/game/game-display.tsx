"use client";

import { CircleDot, Clock3, Expand, MonitorUp } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { BroadcastGameSummary } from "@/components/game/broadcast-game-summary";
import { GamePlayerMark } from "@/components/game/game-player-mark";
import { formatGameTime, useLiveGame, useRemainingSeconds } from "@/components/game/use-live-game";
import { localizeGameText } from "@/lib/game-labels";
import type { GamePlayer, GameSnapshot } from "@/lib/types";

export type DisplayFieldView = "classic" | "journey";

export function GameDisplay({
  initialSnapshot,
  token,
  initialView
}: {
  initialSnapshot: GameSnapshot;
  token: string;
  initialView: DisplayFieldView;
}) {
  const { snapshot, connected, error } = useLiveGame(initialSnapshot, token);
  const remaining = useRemainingSeconds(snapshot);
  const [view, setView] = useState(initialView);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = displayViewKey(snapshot.game.id);
    const stored = window.localStorage.getItem(key);
    if (stored === "classic" || stored === "journey") setView(stored);

    const channel = "BroadcastChannel" in window
      ? new BroadcastChannel(`game-display-${snapshot.game.id}`)
      : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent<DisplayFieldView>) => {
        if (event.data === "classic" || event.data === "journey") setView(event.data);
      };
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === key && (event.newValue === "classic" || event.newValue === "journey")) {
        setView(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [snapshot.game.id]);

  return (
    <div ref={rootRef} className="min-h-screen overflow-hidden bg-[#102a5c] p-3 text-white sm:p-4">
      <header className="mx-auto flex min-h-14 max-w-[1800px] items-center justify-between gap-4 rounded-2xl bg-[#17243f] px-4 py-2 shadow-[0_12px_32px_rgba(4,15,38,.3)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-action text-ink">
            <MonitorUp size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold sm:text-lg">{snapshot.game.title}</h1>
            <p className="text-xs text-white/70">{view === "classic" ? "Поле 1" : "Поле 2"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold sm:text-sm">
          <span className="hidden rounded-lg bg-white/10 px-3 py-2 sm:inline">Раунд {snapshot.game.currentRound}</span>
          <span className="hidden rounded-lg bg-white/10 px-3 py-2 md:inline">Период {snapshot.game.currentPeriod}/{snapshot.game.periodCount}</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 tabular-nums">
            <Clock3 size={15} aria-hidden="true" />
            {formatGameTime(remaining)}
          </span>
          <span className={[
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2",
            connected ? "bg-[#31491d] text-[#eaf3e0]" : "bg-red-950 text-red-100"
          ].join(" ")} role="status" aria-live="polite">
            <CircleDot size={13} aria-hidden="true" />
            <span className="hidden sm:inline">{connected ? "На связи" : "Нет связи"}</span>
          </span>
          <button
            type="button"
            onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen())}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/40"
            aria-label="Переключить полноэкранный режим"
          >
            <Expand size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {error ? <p className="mx-auto mt-2 max-w-[1800px] rounded-xl bg-red-950 px-4 py-2 text-sm text-red-100">{error}</p> : null}
      <main className="mx-auto mt-3 flex h-[calc(100vh-5.75rem)] max-w-[1800px] items-center justify-center overflow-auto">
        {view === "classic" ? <ClassicBroadcastBoard snapshot={snapshot} /> : <JourneyBroadcastBoard snapshot={snapshot} />}
      </main>
    </div>
  );
}

function ClassicBroadcastBoard({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <section className="grid aspect-[16/9] h-auto max-h-full w-full min-w-[720px] grid-cols-8 grid-rows-6 gap-1.5 rounded-2xl bg-[#fff9f1] p-2 shadow-[0_24px_60px_rgba(3,13,32,.38)]">
      {snapshot.board.map((cell) => (
        <BroadcastCell
          key={cell.index}
          snapshot={snapshot}
          cell={cell}
          style={classicCellPosition(cell.index)}
        />
      ))}
      <div className="min-h-0 p-1" style={{ gridColumn: "2 / 8", gridRow: "2 / 6" }}>
        <BroadcastGameSummary snapshot={snapshot} />
      </div>
    </section>
  );
}

const journeyPositions = Array.from({ length: 24 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 24 + Math.PI / 2;
  return [50 - Math.cos(angle) * 43, 50 + Math.sin(angle) * 42] as const;
});

function JourneyBroadcastBoard({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <section className="relative aspect-[16/9] h-auto max-h-full w-full min-w-[720px] overflow-hidden rounded-2xl bg-[#e9ddc7] shadow-[0_24px_60px_rgba(3,13,32,.38)]">
      <img src="/financial-journey-board.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.12] mix-blend-multiply" />
      <div className="absolute inset-0 bg-[#eadbbd]/55" aria-hidden="true" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="50" rx="43" ry="42" fill="none" stroke="rgba(57,67,56,.2)" strokeWidth="8" />
        <ellipse cx="50" cy="50" rx="43" ry="42" fill="none" stroke="#f7eddc" strokeWidth="6.6" />
      </svg>
      {snapshot.board.map((cell) => {
        const [x, y] = journeyPositions[cell.index] ?? [50, 50];
        return (
          <BroadcastCell
            key={cell.index}
            snapshot={snapshot}
            cell={cell}
            journey
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        );
      })}
      <div className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2">
        <BroadcastGameSummary snapshot={snapshot} />
      </div>
    </section>
  );
}

function BroadcastCell({
  snapshot,
  cell,
  style,
  journey = false
}: {
  snapshot: GameSnapshot;
  cell: GameSnapshot["board"][number];
  style: CSSProperties;
  journey?: boolean;
}) {
  const players = snapshot.players.filter(
    (player) => player.role === "PLAYER" && player.track === "RAT_RACE" && player.position === cell.index
  );
  const tone = cellTones[cell.type] ?? cellTones.deal;
  return (
    <article
      style={style}
      className={[
        "relative min-h-0 overflow-visible border text-ink",
        tone,
        journey
          ? "absolute grid h-[7.5%] w-[6.5%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl px-1 text-center shadow-[0_5px_13px_rgba(57,45,30,.15)]"
          : "rounded-xl p-2 shadow-[0_4px_10px_rgba(23,36,63,.06)]"
      ].join(" ")}
      aria-label={`Клетка ${cell.index + 1}: ${localizeGameText(cell.label)}`}
    >
      <div className="text-xs font-black tabular-nums">{cell.index + 1}</div>
      {!journey ? <div className="mt-1 line-clamp-2 text-xs font-bold leading-4">{localizeGameText(cell.label)}</div> : null}
      {players.length > 0 ? (
        <div className={journey ? "absolute -bottom-4 left-1/2 flex -translate-x-1/2 -space-x-2" : "absolute bottom-1 right-1 flex -space-x-2"}>
          {players.map((player: GamePlayer) => (
            <GamePlayerMark key={player.id} player={player} size="sm" active={player.id === snapshot.game.currentPlayerId} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

const cellTones: Record<string, string> = {
  deal: "border-[#b7d3ac] bg-[#f0f8ec]",
  market: "border-[#c2c6e6] bg-[#f1f2fb]",
  paycheck: "border-[#e0c05a] bg-[#fff6d8]",
  doodad: "border-[#e9b0c1] bg-[#fff0f4]",
  charity: "border-[#eab487] bg-[#fff1e5]",
  baby: "border-[#d5b7e5] bg-[#f8f0fc]",
  downsized: "border-[#aeb8c8] bg-[#eef1f5]"
};

function classicCellPosition(index: number): CSSProperties {
  const number = index + 1;
  if (number <= 8) return { gridColumn: number, gridRow: 1 };
  if (number <= 12) return { gridColumn: 8, gridRow: number - 7 };
  if (number <= 20) return { gridColumn: 21 - number, gridRow: 6 };
  if (number <= 24) return { gridColumn: 1, gridRow: 26 - number };
  return {};
}

export function setDisplayFieldView(gameId: string, view: DisplayFieldView) {
  window.localStorage.setItem(displayViewKey(gameId), view);
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(`game-display-${gameId}`);
    channel.postMessage(view);
    channel.close();
  }
}

export function readDisplayFieldView(gameId: string): DisplayFieldView | null {
  const stored = window.localStorage.getItem(displayViewKey(gameId));
  return stored === "classic" || stored === "journey" ? stored : null;
}

function displayViewKey(gameId: string) {
  return `financial-journey:display-view:${gameId}`;
}
