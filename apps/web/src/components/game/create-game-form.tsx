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
    try {
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

      if (!response.ok) {
        setError("Не удалось создать комнату. Проверьте настройки и попробуйте ещё раз.");
        return;
      }

      const snapshot = (await response.json()) as GameSnapshot;
      router.push(`/games/${snapshot.game.id}`);
    } catch {
      setError("Нет связи с сервером. Проверьте подключение и повторите попытку.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid min-w-0 gap-4" onSubmit={onSubmit}>
      <div>
        <label htmlFor="game-title" className="mb-2 block text-sm font-extrabold text-ink">
          Название партии
        </label>
        <Input
          id="game-title"
          className="min-w-0"
          name="title"
          placeholder="Например, вечерняя партия"
          defaultValue="Вечерняя партия"
          maxLength={80}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="game-max-players" className="mb-2 block text-sm font-extrabold text-ink">
            Количество игроков
          </label>
          <select
            id="game-max-players"
            name="maxPlayers"
            defaultValue="6"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
          >
            <option value="2">2 игрока</option>
            <option value="3">3 игрока</option>
            <option value="4">4 игрока</option>
            <option value="5">5 игроков</option>
            <option value="6">6 игроков</option>
          </select>
        </div>
        <div>
          <label htmlFor="game-duration" className="mb-2 block text-sm font-extrabold text-ink">
            Длительность
          </label>
          <select
            id="game-duration"
            name="timeLimitMinutes"
            defaultValue="90"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
          >
            <option value="45">45 минут</option>
            <option value="60">1 час</option>
            <option value="90">1 час 30 минут</option>
            <option value="120">2 часа</option>
            <option value="180">3 часа</option>
            <option value="240">4 часа</option>
          </select>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted">
        После создания вы попадёте в лобби, где сможете пригласить участников и выбрать свою роль.
      </p>
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="action" className="w-full" disabled={loading} aria-busy={loading}>
        {loading ? "Создаём комнату..." : "Создать комнату"}
      </Button>
    </form>
  );
}
