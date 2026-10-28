"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { GamePlayer } from "@/lib/types";
import { CurrentTurnIdentity } from "./current-turn-identity";
import "./dice-action.css";

export function DiceAction({
  canRoll,
  currentPlayer,
  isMine = false,
  rolling,
  phase = "ready",
  diceValues,
  diceCount = diceValues.length,
  onRoll,
  onEnterFastTrack,
  onSkip,
  rollLabel,
  statusLabel,
  idleLabel = "Ожидайте ход",
  disabled = false,
  pinnedToPanel = false,
  replaceButtonWithDice = true,
  className
}: {
  canRoll: boolean;
  currentPlayer?: GamePlayer | null | undefined;
  isMine?: boolean;
  rolling: boolean;
  phase?: "ready" | "rolling" | "moving" | "landed";
  diceValues: number[];
  diceCount?: number;
  onRoll: () => void;
  onEnterFastTrack?: (() => void) | undefined;
  onSkip?: (() => void) | undefined;
  rollLabel?: string | undefined;
  statusLabel?: string | undefined;
  idleLabel?: string | undefined;
  disabled?: boolean;
  pinnedToPanel?: boolean;
  replaceButtonWithDice?: boolean;
  className?: string;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = section.current;
    const parent = element?.parentElement;
    if (!pinnedToPanel || !element || !parent) return;
    const update = () => parent.style.setProperty("--dice-action-height", `${element.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { observer.disconnect(); parent.style.removeProperty("--dice-action-height"); };
  }, [pinnedToPanel]);
  const status = phase === "rolling"
    ? "Бросаем кубик…"
    : phase === "moving"
      ? "Фишка движется по полю…"
      : phase === "landed"
        ? "Ход выполнен"
        : statusLabel ?? (canRoll
          ? "Ваш ход"
          : "Ожидайте своего хода");
  const showDice = !replaceButtonWithDice || rolling || phase !== "ready";

  return (
    <section
      ref={section}
      className={cn(
        "dice-action mb-3 rounded-xl bg-[#fff5ed] px-2",
        pinnedToPanel &&
          "sticky top-0 z-10 -mx-3 mb-0 rounded-none px-3",
        className
      )}
      aria-label="Бросок кубика"
    >
      <div
        className={cn(
          "dice-action-row",
          replaceButtonWithDice && "dice-action-row--replace",
          diceValues.length > 1 && "has-many-dice",
          pinnedToPanel && "min-h-[4.5rem]"
        )}
      >
        <div className="min-w-[5.5rem] max-w-[9rem] shrink-0 text-[#7b3f17]">
          {currentPlayer ? <CurrentTurnIdentity player={currentPlayer} isMine={isMine} /> : <h3 className="text-sm font-semibold">{status}</h3>}
          {currentPlayer && (phase !== "ready" || statusLabel === "Партия на паузе" || statusLabel === "Партия завершена") ? <p className="mt-0.5 text-[11px] leading-4">{status}</p> : null}
          {canRoll && !rolling && onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={disabled}
              className="mt-0.5 rounded-md text-xs font-medium text-[#7b3f17] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6a06c]"
            >
              Пропустить ход
            </button>
          ) : null}
        </div>
        {!replaceButtonWithDice || !showDice ? <Button
          className="h-12 min-w-0 flex-1 px-3 text-base text-white"
          variant="action"
          onClick={onRoll}
          disabled={!canRoll || rolling || disabled}
          aria-busy={rolling}
        >
          {rolling
            ? "Бросаем…"
            : canRoll
              ? rollLabel ?? (diceCount > 1 ? "Бросить кубики" : "Бросить кубик")
              : idleLabel}
        </Button> : null}
        {showDice ? <div className="dice-action-values flex shrink-0 gap-2" aria-live="polite" aria-label="Результат броска">
          {diceValues.map((diceValue, index) => (
            <div key={index} className="scale-[.58] -m-4">
              <DiceFace value={diceValue} rolling={phase === "rolling"} />
            </div>
          ))}
        </div> : null}
      </div>
      {onEnterFastTrack && canRoll && !rolling && phase === "ready" ? <Button
        type="button"
        variant="secondary"
        className="mb-2 min-h-10 w-full"
        onClick={onEnterFastTrack}
        disabled={disabled}
      >На большой круг</Button> : null}
    </section>
  );
}

export function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = diceDots[Math.min(Math.max(value, 1), 6)] ?? diceDots[6] ?? [];

  return (
    <div
      className={[
        "relative h-20 w-20 rounded-xl border-2 border-ink bg-white shadow-panel transition-transform",
        rolling ? "dice-face--rolling" : ""
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
