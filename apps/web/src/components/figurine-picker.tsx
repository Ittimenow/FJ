"use client";

import {
  figurineImagePath,
  figurines,
  type FigurineId
} from "@cashflow/shared";

export function FigurinePicker({
  value,
  taken = [],
  onChange,
  disabled = false
}: {
  value: string | null;
  taken?: string[];
  onChange: (figurine: FigurineId) => void;
  disabled?: boolean;
}) {
  const takenIds = new Set(taken);

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-8">
      {figurines.map((figurine) => {
        const isTaken = takenIds.has(figurine.id) && value !== figurine.id;
        const isSelected = value === figurine.id;
        return (
          <button
            key={figurine.id}
            type="button"
            disabled={disabled || isTaken}
            onClick={() => onChange(figurine.id)}
            title={isTaken ? `${figurine.name} — уже занята` : figurine.name}
            aria-label={figurine.name}
            aria-pressed={isSelected}
            className={[
              "group relative aspect-square overflow-hidden rounded-xl border bg-white p-1 transition",
              isSelected
                ? "border-success ring-2 ring-success ring-offset-1"
                : "border-line hover:border-neutral-400",
              isTaken ? "cursor-not-allowed opacity-25 grayscale" : "",
              disabled ? "cursor-wait" : ""
            ].join(" ")}
          >
            <img
              src={figurineImagePath(figurine.id)}
              alt=""
              className="h-full w-full rounded-lg object-cover"
            />
            {isTaken ? (
              <span className="absolute inset-x-1 bottom-1 rounded bg-black/65 px-1 py-0.5 text-[8px] font-medium text-white">
                Занята
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
