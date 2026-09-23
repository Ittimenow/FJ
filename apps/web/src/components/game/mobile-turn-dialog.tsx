"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DiceFace } from "./dice-action";

export function MobileTurnDialog({
  open,
  rolling,
  phase = "ready",
  disabled = false,
  diceValues,
  diceCount,
  maxCompactViewportWidth,
  onRoll,
  onSkip
}: {
  open: boolean;
  rolling: boolean;
  phase?: "ready" | "rolling" | "moving" | "landed";
  disabled?: boolean;
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
  const showDice = rolling || phase !== "ready";

  return (
    <div className="mobile-turn-bar pointer-events-none fixed inset-x-0 bottom-0 z-[80] pb-[max(.75rem,env(safe-area-inset-bottom))] pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))]">
      <div
        role="region"
        aria-label="Действия текущего хода"
        className="pointer-events-auto mx-auto grid w-full max-w-sm grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-2xl bg-[#fff5ed] p-2 shadow-[0_18px_48px_rgba(5,18,45,.28)]"
      >
        <div className="min-w-[5.5rem] max-w-[7.5rem] shrink-0 text-[#7b3f17]">
          <h3 className="text-sm font-semibold">Ваш ход</h3>
          <button
            type="button"
            className="mt-0.5 rounded-md text-xs font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6a06c] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSkip}
            disabled={showDice || disabled}
            aria-label="Пропустить ход"
            title="Пропустить ход"
          >
            Пропустить ход
          </button>
        </div>
        {!showDice ? <Button
          type="button"
          variant="action"
          className="h-12 min-w-0 flex-1 whitespace-nowrap px-1.5 text-xs text-white min-[360px]:px-3 min-[360px]:text-sm"
          onClick={onRoll}
          disabled={rolling || disabled}
          aria-busy={rolling}
        >
          {rolling ? "Бросаем…" : diceCount > 1 ? "Бросить кубики" : "Бросить кубик"}
        </Button> : <div className="mobile-turn-dice flex min-h-12 justify-center gap-2" aria-live="polite" aria-label="Результат броска">
          {diceValues.map((diceValue, index) => (
            <div key={index} className="-m-5 scale-50">
              <DiceFace value={diceValue} rolling={phase === "rolling"} />
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
