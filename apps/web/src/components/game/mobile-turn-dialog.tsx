"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiceFace } from "./dice-action";

export function MobileTurnDialog({
  open,
  rolling,
  disabled = false,
  diceValues,
  diceCount,
  maxCompactViewportWidth,
  onRoll,
  onSkip
}: {
  open: boolean;
  rolling: boolean;
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

  return (
    <div className="mobile-turn-bar pointer-events-none fixed inset-x-0 bottom-0 z-[80] pb-[max(.75rem,env(safe-area-inset-bottom))] pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))]">
      <div
        role="region"
        aria-label="Действия текущего хода"
        className="pointer-events-auto mx-auto grid w-full max-w-sm grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-[#fff5ed] p-2 shadow-[0_18px_48px_rgba(5,18,45,.28)]"
      >
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#7b3f17] shadow-[0_6px_16px_rgba(123,63,23,.12)] transition hover:bg-[#fffaf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0560c] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSkip}
          disabled={rolling || disabled}
          aria-label="Пропустить ход"
          title="Пропустить ход"
        >
          <X size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <Button
          type="button"
          variant="action"
          className="h-12 min-w-0 flex-1 whitespace-nowrap px-1.5 text-xs text-white min-[360px]:px-3 min-[360px]:text-sm"
          onClick={onRoll}
          disabled={rolling || disabled}
          aria-busy={rolling}
        >
          {rolling ? "Бросаем…" : diceCount > 1 ? "Бросить кубики" : "Бросить кубик"}
        </Button>
        <div className="mobile-turn-dice flex shrink-0 gap-1" aria-live="polite">
          {diceValues.map((diceValue, index) => (
            <div key={index} className="-m-5 scale-50">
              <DiceFace value={diceValue} rolling={rolling} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

