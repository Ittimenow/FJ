"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { publicApiBaseUrl } from "@/lib/api";

function localValue(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function RescheduleGameForm({ gameId, scheduledAt, timeZone, token }: {
  gameId: string; scheduledAt: string; timeZone: string; token: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(() => localValue(scheduledAt, timeZone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${gameId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scheduledLocal: value })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? "Не удалось перенести игру.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось перенести игру.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mt-3 border-t border-line pt-3">
      <summary className="cursor-pointer text-sm font-bold text-journey">Изменить время</summary>
      <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-2">
        <label htmlFor={`schedule-${gameId}`} className="text-xs font-bold">Новое время · {timeZone}</label>
        <input id={`schedule-${gameId}`} type="datetime-local" required value={value} onChange={(event) => setValue(event.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-sm" />
        {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
        <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-journey px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? "Сохраняем..." : "Сохранить новое время"}</button>
      </form>
    </details>
  );
}
