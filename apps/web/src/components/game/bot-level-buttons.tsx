"use client";

export const botLevelOptions = [
  { value: "beginner_v1", label: "Новичок" },
  { value: "balanced_v1", label: "Опытный" },
  { value: "expert_v1", label: "Эксперт" }
] as const;

export type BotLevelValue = typeof botLevelOptions[number]["value"];

export function BotLevelButtons({
  value,
  onChange,
  label,
  disabled = false
}: {
  value: BotLevelValue;
  onChange: (value: BotLevelValue) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-card p-1">
      {botLevelOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-lg px-3 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${value === option.value ? "bg-journey text-white shadow-sm" : "text-ink hover:bg-white"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
