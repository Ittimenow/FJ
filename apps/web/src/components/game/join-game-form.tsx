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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
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
  }

  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
      <Input name="codeOrId" placeholder="Код комнаты" required />
      <Button type="submit" variant="secondary">
        Войти
      </Button>
      {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
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
