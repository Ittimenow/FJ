"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

export function JoinGameForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codeOrId: String(form.get("codeOrId") ?? "").trim(),
          role: "PLAYER"
        })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(joinErrorMessage(result?.message));
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
    <form className="grid gap-3" onSubmit={onSubmit}>
      <div>
        <label htmlFor="join-game-code" className="mb-2 block text-sm font-extrabold text-ink">
          Код комнаты
        </label>
        <Input
          id="join-game-code"
          name="codeOrId"
          placeholder="Введите код приглашения"
          autoComplete="off"
          className="font-mono uppercase tracking-[0.06em]"
          required
        />
      </div>
      <Button type="submit" variant="secondary" className="w-full" disabled={loading} aria-busy={loading}>
        {loading ? "Ищем комнату..." : "Войти по коду"}
      </Button>
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function joinErrorMessage(message: unknown) {
  if (message === "Game not found") {
    return "Комната не найдена. Проверьте код комнаты.";
  }
  if (message === "Only waiting games can be joined") {
    return "Комната уже запущена. Войти можно только до старта игры.";
  }
  if (message === "Game is full") {
    return "Комната заполнена.";
  }
  return "Комната не найдена или уже запущена";
}
