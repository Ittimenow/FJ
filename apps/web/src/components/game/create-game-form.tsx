"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

export function CreateGameForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${publicApiBaseUrl()}/api/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: String(form.get("title") ?? ""),
        maxPlayers: Number(form.get("maxPlayers") ?? 6),
        timeLimitMinutes: Number(form.get("timeLimitMinutes") ?? 90)
      })
    });

    setLoading(false);
    if (!response.ok) {
      setError("Не удалось создать комнату");
      return;
    }

    const snapshot = (await response.json()) as GameSnapshot;
    router.push(`/games/${snapshot.game.id}`);
  }

  return (
    <form className="grid min-w-0 gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <Input
        className="min-w-0 sm:col-span-2"
        name="title"
        placeholder="Название партии"
        defaultValue="Вечерняя партия"
      />
      <Input
        className="min-w-0"
        name="maxPlayers"
        type="number"
        min={2}
        max={6}
        defaultValue={6}
        aria-label="Максимум игроков"
      />
      <Input
        className="min-w-0"
        name="timeLimitMinutes"
        type="number"
        min={15}
        max={240}
        step={15}
        defaultValue={90}
        aria-label="Лимит времени в минутах"
        title="Лимит времени в минутах"
      />
      <Button type="submit" className="w-full sm:col-span-2" disabled={loading}>
        {loading ? "Создаём..." : "Создать"}
      </Button>
      {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
    </form>
  );
}
