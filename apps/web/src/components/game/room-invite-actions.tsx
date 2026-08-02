"use client";

import { Check, Hash, Link2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CopyTarget = "code" | "link";
type CopyFeedback = { target: CopyTarget; success: boolean } | null;

export function RoomInviteActions({
  code,
  tone = "light",
  className
}: {
  code: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [feedback, setFeedback] = useState<CopyFeedback>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function copy(target: CopyTarget) {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    const value =
      target === "code"
        ? code
        : new URL(`/join/${encodeURIComponent(code)}`, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ target, success: true });
    } catch {
      setFeedback({ target, success: false });
    }

    resetTimerRef.current = window.setTimeout(() => setFeedback(null), 1800);
  }

  const dark = tone === "dark";
  const liveMessage = feedback
    ? feedback.success
      ? feedback.target === "code"
        ? "Код игры скопирован"
        : "Ссылка на игру скопирована"
      : "Не удалось скопировать. Повторите попытку."
    : "";

  return (
    <div
      className={cn(
        "inline-flex min-h-[52px] min-w-0 shrink-0 items-center gap-1 rounded-xl p-1",
        dark ? "bg-white/10 text-white" : "bg-[#e8effe] text-journey",
        className
      )}
      role="group"
      aria-label={`Приглашение в игру, код ${code}`}
    >
      <span className="min-w-0 truncate px-1.5 font-mono text-xs font-extrabold tracking-[0.04em]">
        {code}
      </span>
      <CopyIconButton
        label={`Скопировать код игры ${code}`}
        title="Скопировать код игры"
        copied={feedback?.target === "code" && feedback.success}
        dark={dark}
        onClick={() => void copy("code")}
      >
        <Hash size={14} aria-hidden="true" />
      </CopyIconButton>
      <CopyIconButton
        label="Скопировать ссылку на игру"
        title="Скопировать ссылку на игру"
        copied={feedback?.target === "link" && feedback.success}
        dark={dark}
        onClick={() => void copy("link")}
      >
        <Link2 size={14} aria-hidden="true" />
      </CopyIconButton>
      <span className="sr-only" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  );
}

function CopyIconButton({
  label,
  title,
  copied,
  dark,
  onClick,
  children
}: {
  label: string;
  title: string;
  copied: boolean;
  dark: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition focus-visible:outline-none focus-visible:ring-4",
        dark
          ? "bg-white/10 hover:bg-white/20 focus-visible:ring-action"
          : "bg-white/70 hover:bg-white focus-visible:ring-journey"
      )}
      aria-label={copied ? `${label}. Скопировано` : label}
      title={copied ? "Скопировано" : title}
    >
      {copied ? <Check size={15} aria-hidden="true" /> : children}
    </button>
  );
}
