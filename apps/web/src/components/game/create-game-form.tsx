"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

export function CreateGameForm({ token, compact = false }: {
  token: string;
  allowCardSetSelection?: boolean;
  timeZone?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGame() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maxPlayers: 6 })
      });
      const result = await response.json() as GameSnapshot & { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Не удалось создать игру");
      router.push(`/games/${result.game.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать игру");
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid gap-3">
    {!compact ? <p className="text-sm text-muted">Состав, время и остальные настройки задаются в лобби.</p> : null}
    <Button type="button" variant="action" className="w-full" disabled={loading} onClick={() => void createGame()}>
      {loading ? "Создаём лобби…" : compact ? "Создать игру" : "Создать командную игру"}
    </Button>
    {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
  </div>;
}
