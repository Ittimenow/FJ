"use client";

import { Bot, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BotLevelButtons, type BotLevelValue } from "./bot-level-buttons";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

type GameCardSet = {
  id: string;
  name: string;
  isDefault: boolean;
};

export function CreateSoloGameForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardSets, setCardSets] = useState<GameCardSet[]>([]);
  const [cardSetId, setCardSetId] = useState("");
  const [cardSetsLoading, setCardSetsLoading] = useState(true);
  const [cardSetsError, setCardSetsError] = useState<string | null>(null);
  const [botLevels, setBotLevels] = useState<BotLevelValue[]>(["balanced_v1"]);
  const [newBotLevel, setNewBotLevel] = useState<BotLevelValue>("balanced_v1");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${publicApiBaseUrl()}/api/games/card-sets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error();
        const sets = (await response.json()) as GameCardSet[];
        if (cancelled) return;
        setCardSets(sets);
        const original = sets.find((set) => set.name.trim().toLocaleLowerCase("ru") === "оригинал");
        setCardSetId(original?.id ?? "");
        if (!original) setCardSetsError("Набор «Оригинал» недоступен. Выберите другой набор.");
      } catch {
        if (!cancelled) {
          setCardSetsError("Не удалось загрузить наборы. Обновите страницу и попробуйте снова.");
        }
      } finally {
        if (!cancelled) setCardSetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          botLevels,
          ...(cardSetId ? { cardSetId } : {})
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
            Начните сразу: соперники сами выполняют ходы и объясняют финансовые решения.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="solo-card-set" className="mb-2 block text-sm font-extrabold text-ink">
          Набор карточек
        </label>
        <select
          id="solo-card-set"
          value={cardSetId}
          onChange={(event) => { setCardSetId(event.target.value); setCardSetsError(null); }}
          disabled={cardSetsLoading || cardSets.length === 0}
          className="h-[50px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
        >
          {cardSetsLoading ? <option value="">Загружаем наборы…</option> : null}
          {!cardSetsLoading && cardSets.length === 0 ? (
            <option value="">Нет доступных наборов</option>
          ) : null}
          {cardSets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}{set.isDefault ? " — основной" : ""}
            </option>
          ))}
        </select>
        {cardSetsError ? (
          <p className="mt-2 text-xs font-medium leading-5 text-red-700" role="alert">
            {cardSetsError}
          </p>
        ) : null}
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
        disabled={loading || cardSetsLoading || !cardSetId}
        aria-busy={loading || cardSetsLoading}
      >
        {loading ? "Готовим соперников..." : "Начать одиночную игру"}
      </Button>
    </form>
  );
}
