"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { GamePlayer } from "@/lib/types";
import { CurrentTurnIdentity } from "./current-turn-identity";
import { DiceFace } from "./dice-action";

export function MobileTurnDialog({
  open,
  currentPlayer,
  isMine,
  canRoll,
  requiresDecision = false,
  paused = false,
  rolling,
  phase = "ready",
  disabled = false,
  diceValues,
  diceCount,
  diceOptions,
  onDiceCountChange,
  maxCompactViewportWidth,
  desktopDock = false,
  onRoll,
  onEnterFastTrack,
  onSkip,
  onShowTurn,
  rollLabel
}: {
  open: boolean;
  currentPlayer: GamePlayer | null;
  isMine: boolean;
  canRoll: boolean;
  requiresDecision?: boolean;
  paused?: boolean;
  rolling: boolean;
  phase?: "ready" | "rolling" | "moving" | "landed";
  disabled?: boolean;
  diceValues: number[];
  diceCount: number;
  diceOptions?: number[];
  onDiceCountChange?: (count: number) => void;
  maxCompactViewportWidth: number;
  desktopDock?: boolean;
  onRoll: () => void;
  onEnterFastTrack?: (() => void) | undefined;
  onSkip?: (() => void) | undefined;
  onShowTurn?: (() => void) | undefined;
  rollLabel?: string | undefined;
}) {
  const [mobileViewport, setMobileViewport] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${maxCompactViewportWidth}px)`);
    const updateViewport = () => setMobileViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, [maxCompactViewportWidth]);

  useEffect(() => {
    const bar = barRef.current;
    if (!mobileViewport || !open || !bar) return;
    const style = document.documentElement.style;
    const previous = style.getPropertyValue("--game-turn-bar-height");
    const measure = () => style.setProperty("--game-turn-bar-height", `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      if (previous) style.setProperty("--game-turn-bar-height", previous);
      else style.removeProperty("--game-turn-bar-height");
    };
  }, [mobileViewport, open, currentPlayer?.id]);

  if (!open || (!mobileViewport && !desktopDock) || !currentPlayer) return null;
  const showDice = rolling || (!requiresDecision && phase !== "ready");

  const controls = <div
        role="region"
        aria-label="Действия текущего хода"
        className={`pointer-events-auto mx-auto grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 bg-[#fff5ed] p-2 ${mobileViewport ? "max-w-sm rounded-2xl shadow-[0_18px_48px_rgba(5,18,45,.28)]" : "rounded-b-xl"}`}
      >
        <div className="min-w-0 text-[#7b3f17]">
          <CurrentTurnIdentity player={currentPlayer} isMine={isMine} />
          {isMine && canRoll && onSkip ? <button
            type="button"
            className="mt-0.5 rounded-md text-xs font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6a06c] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSkip}
            disabled={showDice || disabled}
            aria-label="Пропустить"
            title="Пропустить"
          >
            Пропустить
          </button> : null}
        </div>
        {paused ? <p className="min-w-0 text-right text-xs font-semibold leading-4 text-[#76532e]">Партия на паузе</p> : showDice ? <div className="mobile-turn-dice flex min-h-12 justify-center gap-2" aria-live="polite" aria-label="Результат броска">
          {diceValues.map((diceValue, index) => (
            <div key={index} className="-m-5 scale-50">
              <DiceFace value={diceValue} rolling={phase === "rolling"} direction={index % 2 === 0 ? "right" : "left"} />
            </div>
          ))}
        </div> : requiresDecision ? <Button type="button" variant="action" className="min-h-12 min-w-0 w-full px-2 text-xs text-white min-[360px]:text-sm" onClick={onShowTurn} disabled={disabled}>Требуется ваше решение</Button> : !isMine || !canRoll ? <p className="min-w-0 text-right text-xs font-semibold leading-4 text-[#76532e]">{isMine ? "Выберите действие во вкладке «Ход»" : "Ожидайте своего хода"}</p> : <div className="grid min-w-0 gap-1.5">
          {onEnterFastTrack ? <Button type="button" variant="secondary" className="min-h-10 w-full px-2 text-xs min-[360px]:text-sm" onClick={onEnterFastTrack} disabled={disabled}>На большой круг</Button> : null}
          {diceOptions && diceOptions.length > 1 && onDiceCountChange ? <label className="flex min-w-0 items-center justify-between gap-2 text-xs font-semibold text-[#76532e]">
            Кубики
            <select aria-label="Количество кубиков" className="h-11 min-w-16 rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action" value={diceCount} onChange={event=>onDiceCountChange(Number(event.target.value))} disabled={rolling||disabled}>
              {diceOptions.map(count=><option key={count} value={count}>{count}</option>)}
            </select>
          </label> : null}
          <Button
            type="button"
            variant="action"
            className="h-12 min-w-0 w-full whitespace-nowrap px-1.5 text-xs text-white min-[360px]:px-3 min-[360px]:text-sm"
            onClick={onRoll}
            disabled={rolling || disabled}
            aria-busy={rolling}
          >
            {rolling ? "Бросаем…" : rollLabel ?? (diceCount > 1 ? "Бросить кубики" : "Бросить кубик")}
          </Button>
        </div>}
      </div>;

  if (!mobileViewport) return <div className="desktop-turn-bar shrink-0">{controls}</div>;

  return <>
    <span className="mobile-turn-bar-anchor" aria-hidden="true" />
    {createPortal(<div ref={barRef} className="mobile-turn-bar pointer-events-none fixed inset-x-0 bottom-0 z-[80] pb-[max(.75rem,env(safe-area-inset-bottom))] pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))]">
      {controls}
    </div>, document.body)}
  </>;
}
