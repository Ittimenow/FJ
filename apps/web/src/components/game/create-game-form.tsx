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
        maxPlayers: Number(form.get("maxPlayers") ?? 6)
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
    <form className="grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={onSubmit}>
      <Input name="title" placeholder="Название партии" defaultValue="Вечерняя партия" />
      <Input
        name="maxPlayers"
        type="number"
        min={2}
        max={6}
        defaultValue={6}
        aria-label="Максимум игроков"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Создаём..." : "Создать"}
      </Button>
      {error ? <p className="text-sm text-red-700 sm:col-span-3">{error}</p> : null}
    </form>
  );
}
