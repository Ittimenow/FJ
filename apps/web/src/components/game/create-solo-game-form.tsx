"use client";

import { Bot, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
        setCardSetId(sets.find((set) => set.isDefault)?.id ?? sets[0]?.id ?? "");
      } catch {
        if (!cancelled) {
          setCardSetsError("Не удалось загрузить наборы. Будет использован основной набор.");
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
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/solo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          botCount: Number(form.get("botCount") ?? 1),
          ...(cardSetId ? { cardSetId } : {})
        })
      });
      if (!response.ok) {
        setError("Не удалось подготовить одиночную партию. Попробуйте ещё раз.");
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="solo-bot-count" className="mb-2 block text-sm font-extrabold text-ink">
            Соперники
          </label>
          <select
            id="solo-bot-count"
            name="botCount"
            defaultValue="1"
            className="h-[50px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
          >
            <option value="1">1 бот</option>
            <option value="2">2 бота</option>
            <option value="3">3 бота</option>
          </select>
        </div>
        <div>
          <label htmlFor="solo-card-set" className="mb-2 block text-sm font-extrabold text-ink">
            Набор карточек
          </label>
          <select
            id="solo-card-set"
            value={cardSetId}
            onChange={(event) => setCardSetId(event.target.value)}
            disabled={cardSetsLoading || cardSets.length === 0}
            className="h-[50px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
          >
            {cardSetsLoading ? <option value="">Загружаем наборы…</option> : null}
            {!cardSetsLoading && cardSets.length === 0 ? (
              <option value="">Основной набор</option>
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
      </div>

      <p className="inline-flex items-start gap-2 text-xs leading-5 text-muted">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#7655c7]" size={15} aria-hidden="true" />
        Сбалансированные боты видят только открытые карточки и текущее состояние партии.
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
        disabled={loading || cardSetsLoading}
        aria-busy={loading || cardSetsLoading}
      >
        {loading ? "Готовим соперников..." : "Начать одиночную игру"}
      </Button>
    </form>
  );
}
