"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { publicApiBaseUrl } from "@/lib/api";

export function NotificationAction({
  token, id, href, read
}: { token: string; id: string; href: string | null; read: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!read) {
        const response = await fetch(`${publicApiBaseUrl()}/api/users/me/notifications/${id}/read`, {
          method: "PATCH", headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Не удалось отметить сообщение прочитанным.");
        window.dispatchEvent(new Event("notifications:changed"));
      }
      if (href) router.push(href as Route);
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось открыть сообщение.");
      setBusy(false);
    }
  }
  return (
    <div>
      {read && !href ? <span className="text-sm font-bold text-muted">Прочитано</span> : (
        <button type="button" onClick={() => void open()} disabled={busy} className="min-h-11 rounded-xl bg-journey px-4 text-sm font-bold text-white transition hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 disabled:opacity-60">
          {busy ? "Открываем..." : href ? "Открыть игру" : "Отметить прочитанным"}
        </button>
      )}
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
