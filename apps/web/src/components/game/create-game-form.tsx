"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

type GameCardSet = {
  id: string;
  name: string;
  isDefault: boolean;
  counts: Record<string, number>;
};

const requiredCardTypes = [
  "SMALL_DEAL",
  "BIG_DEAL",
  "DOODAD",
  "MARKET"
];

export function CreateGameForm({
  token,
  allowCardSetSelection = false
}: {
  token: string;
  allowCardSetSelection?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(90);
  const [periodCount, setPeriodCount] = useState(3);
  const [cardSets, setCardSets] = useState<GameCardSet[]>([]);
  const [cardSetId, setCardSetId] = useState("");
  const [cardSetsLoading, setCardSetsLoading] = useState(allowCardSetSelection);
  const [cardSetsError, setCardSetsError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowCardSetSelection) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/sets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error();
        const sets = (await response.json()) as GameCardSet[];
        if (cancelled) return;
        setCardSets(sets);
        setCardSetId(
          sets.find((set) => set.isDefault && isPlayableCardSet(set))?.id ??
          sets.find(isPlayableCardSet)?.id ??
          ""
        );
      } catch {
        if (!cancelled) setCardSetsError("Не удалось загрузить наборы. Будет использован основной набор.");
      } finally {
        if (!cancelled) setCardSetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowCardSetSelection, token]);

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
          ...(allowCardSetSelection && cardSetId ? { cardSetId } : {}),
          timeLimitMinutes: Number(form.get("timeLimitMinutes") ?? 90),
          periodCount: Number(form.get("periodCount") ?? 3),
          botCount: Number(form.get("botCount") ?? 0)
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
          <label htmlFor="game-duration" className="mb-2 block text-sm font-extrabold text-ink">
            Длительность
          </label>
          <select
            id="game-duration"
            name="timeLimitMinutes"
            defaultValue="90"
            onChange={(event) => setTimeLimitMinutes(Number(event.target.value))}
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
        <div>
          <label htmlFor="game-periods" className="mb-2 block text-sm font-extrabold text-ink">
            Периоды
          </label>
          <select
            id="game-periods"
            name="periodCount"
            defaultValue="3"
            onChange={(event) => setPeriodCount(Number(event.target.value))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
          >
            <option value="1">Без деления</option>
            <option value="2">2 периода</option>
            <option value="3">3 периода</option>
            <option value="4">4 периода</option>
            <option value="5">5 периодов</option>
            <option value="6">6 периодов</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="game-bot-count" className="mb-2 block text-sm font-extrabold text-ink">
          Виртуальные игроки
        </label>
        <select
          id="game-bot-count"
          name="botCount"
          defaultValue="0"
          className="h-[50px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
        >
          <option value="0">Без ботов</option>
          <option value="1">1 бот</option>
          <option value="2">2 бота</option>
          <option value="3">3 бота</option>
        </select>
        <p className="mt-2 text-xs leading-5 text-muted">
          Боты появятся в лобби сразу и будут ходить по общим правилам вместе с людьми.
        </p>
      </div>
      {allowCardSetSelection ? (
        <div>
          <label htmlFor="game-card-set" className="mb-2 block text-sm font-extrabold text-ink">
            Набор карточек
          </label>
          <select
            id="game-card-set"
            value={cardSetId}
            onChange={(event) => setCardSetId(event.target.value)}
            className="h-[50px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
            disabled={cardSetsLoading || cardSets.length === 0}
          >
            {cardSets.map((set) => {
              const ready = isPlayableCardSet(set);
              return (
                <option key={set.id} value={set.id} disabled={!ready}>
                  {set.name}{set.isDefault ? " — основной" : ""}{ready ? "" : " — не заполнен"}
                </option>
              );
            })}
          </select>
          <p className="mt-2 text-xs leading-5 text-muted">
            После создания комнаты набор изменить нельзя: партия сохранит выбранные колоды.
          </p>
          {cardSetsError ? (
            <p className="mt-2 text-xs font-medium leading-5 text-red-700" role="alert">
              {cardSetsError}
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="rounded-xl bg-card px-3 py-2 text-xs font-medium leading-5 text-muted">
        {periodCount === 1
          ? `Один период длительностью ${formatDuration(timeLimitMinutes * 60)}.`
          : `${periodCount} ${periodWord(periodCount)} примерно по ${formatDuration(
              Math.floor((timeLimitMinutes * 60) / periodCount)
            )}. Между ними игра автоматически встанет на паузу.`}
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
        disabled={loading || cardSetsLoading || (allowCardSetSelection && cardSets.length > 0 && !cardSetId)}
        aria-busy={loading}
      >
        {loading ? "Создаём комнату..." : "Создать комнату"}
      </Button>
    </form>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} мин.`;
  return `${minutes} мин. ${seconds} сек.`;
}

function periodWord(count: number) {
  return count >= 2 && count <= 4 ? "периода" : "периодов";
}

function isPlayableCardSet(set: GameCardSet) {
  return requiredCardTypes.every((type) => (set.counts[type] ?? 0) > 0);
}
