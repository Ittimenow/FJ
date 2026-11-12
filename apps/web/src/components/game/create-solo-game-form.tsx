"use client";

import { Bot, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { BotLevelButtons, type BotLevelValue } from "./bot-level-buttons";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

export function CreateSoloGameForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botLevels, setBotLevels] = useState<BotLevelValue[]>(["balanced_v1"]);
  const [newBotLevel, setNewBotLevel] = useState<BotLevelValue>("balanced_v1");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/solo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          botCount: botLevels.length,
          botLevels
        })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string | string[] } | null;
        setError(typeof result?.message === "string" ? result.message : "Не удалось подготовить одиночную партию. Попробуйте ещё раз.");
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
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eee8ff] text-[#7655c7]">
          <Bot size={21} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-ink">Играть с ботами</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Подберите соперников. Режим игры и набор карточек выберите на странице подготовки.
          </p>
        </div>
      </div>

      <section aria-labelledby="solo-opponents-title" className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="solo-opponents-title" className="text-sm font-extrabold text-ink">Соперники</h3>
          <span className="text-xs font-bold text-muted">{botLevels.length} из 3</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotLevelButtons label="Уровень нового соперника" value={newBotLevel} onChange={setNewBotLevel} disabled={loading || botLevels.length >= 3} />
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={loading || botLevels.length >= 3}
            onClick={() => setBotLevels((levels) => levels.length < 3 ? [...levels, newBotLevel] : levels)}
          >
            <Plus size={17} aria-hidden="true" /> Добавить соперника
          </Button>
        </div>
        <div className="grid gap-2" aria-live="polite">
          {botLevels.map((level, index) => (
            <div key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-sm text-ink">
              <span className="inline-flex items-center gap-2 font-bold"><Bot size={17} aria-hidden="true" /> Соперник {index + 1}</span>
              <BotLevelButtons
                label={`Уровень соперника ${index + 1}`}
                value={level}
                onChange={(value) => setBotLevels((levels) => levels.map((current, position) => position === index ? value : current))}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-1 px-2 text-xs"
                disabled={loading || botLevels.length === 1}
                onClick={() => setBotLevels((levels) => levels.filter((_, position) => position !== index))}
                aria-label={`Удалить соперника ${index + 1}`}
                title={botLevels.length === 1 ? "Для игры нужен хотя бы один соперник" : undefined}
              >
                <Trash2 size={16} aria-hidden="true" /><span className="hidden sm:inline">Удалить</span>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <p className="inline-flex items-start gap-2 text-xs leading-5 text-muted">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#7655c7]" size={15} aria-hidden="true" />
        Все уровни сложности используют только открытые карточки и текущее состояние партии.
      </p>
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="action"
        className="w-full"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Готовим соперников..." : "Создать игру с ботами"}
      </Button>
    </form>
  );
}
