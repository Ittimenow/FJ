"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

type CardSet = { id: string; name: string; counts: Record<string, number> };
const requiredCards = ["SMALL_DEAL", "BIG_DEAL", "DOODAD", "MARKET"];

function localDateTime(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function LobbySettings({ snapshot, token, timeZone, isAdmin, onSaved }: {
  snapshot: GameSnapshot;
  token: string;
  timeZone: string | null;
  isAdmin: boolean;
  onSaved: (snapshot: GameSnapshot) => void;
}) {
  const game = snapshot.game;
  const occupied = snapshot.players.filter((player) => player.role === "PLAYER" && player.status === "JOINED").length;
  const [isPublic, setIsPublic] = useState(game.isPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [cardSetId, setCardSetId] = useState(game.cardSet.id);
  const scheduledLocal = game.scheduledAt && timeZone ? localDateTime(game.scheduledAt, timeZone) : "";
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void fetch(`${publicApiBaseUrl()}/api/games/card-sets`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() as Promise<CardSet[]> : [])
      .then((items) => { if (!cancelled) setSets(items); })
      .catch(() => { if (!cancelled) setError("Не удалось загрузить наборы карточек."); });
    return () => { cancelled = true; };
  }, [isAdmin, token]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (isPublic && !timeZone) { setError("Сначала выберите город в профиле."); return; }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${game.id}/lobby`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: String(data.get("title") ?? ""),
          maxPlayers: Number(data.get("maxPlayers")),
          timeLimitMinutes: Number(data.get("timeLimitMinutes")),
          periodCount: Number(data.get("periodCount")),
          isPublic,
          ...(isPublic && String(data.get("scheduledLocal") ?? "") !== scheduledLocal ? { scheduledLocal: String(data.get("scheduledLocal") ?? "") } : {}),
          ...(isAdmin ? { cardSetId } : {})
        })
      });
      const result = await response.json() as { snapshot?: GameSnapshot; message?: string };
      if (!response.ok || !result.snapshot) throw new Error(typeof result.message === "string" ? result.message : "Не удалось сохранить настройки");
      onSaved(result.snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить настройки");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-xl bg-card p-4" aria-labelledby="lobby-settings-title">
    <h2 id="lobby-settings-title" className="text-lg font-extrabold">Настройки игры</h2>
    <p className="mt-1 text-sm text-muted">Настройте игру и при необходимости откройте её для всех.</p>
    <form key={`${game.id}:${game.isPublic}:${game.scheduledAt ?? ""}`} onSubmit={(event) => void save(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-bold sm:col-span-2">Название игры
        <Input name="title" defaultValue={game.title} maxLength={80} required />
      </label>
      <label className="grid gap-1 text-sm font-bold">Мест для игроков
        <select name="maxPlayers" defaultValue={Math.min(12, Math.max(game.maxPlayers ?? 6, occupied))} className="h-12 rounded-xl border border-line bg-white px-3" aria-label="Количество игроков">
          {Array.from({ length: 11 }, (_, index) => index + 2).map((count) => <option key={count} value={count} disabled={count < occupied}>{count}</option>)}
        </select>
        <span className="text-xs font-normal text-muted">Сейчас занято: {occupied}. Боты тоже занимают места.</span>
      </label>
      <label className="grid gap-1 text-sm font-bold">Длительность
        <select name="timeLimitMinutes" defaultValue={game.timeLimitMinutes ?? 90} className="h-12 rounded-xl border border-line bg-white px-3">
          {[45, 60, 90, 120, 180, 240].map((value) => <option key={value} value={value}>{value} мин</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-bold">Периоды
        <select name="periodCount" defaultValue={game.periodCount} className="h-12 rounded-xl border border-line bg-white px-3">
          {Array.from({ length: 6 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value === 1 ? "Без деления" : value}</option>)}
        </select>
      </label>
      {isAdmin && sets.length > 0 ? <label className="grid gap-1 text-sm font-bold">Набор карточек
        <select value={cardSetId} onChange={(event) => setCardSetId(event.target.value)} className="h-12 rounded-xl border border-line bg-white px-3">
          {sets.map((set) => <option key={set.id} value={set.id} disabled={requiredCards.some((kind) => !set.counts[kind])}>{set.name}</option>)}
        </select>
      </label> : null}
      <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-5 w-5 accent-journey" /> Открытая игра</label>
      {isPublic ? <label className="grid gap-1 text-sm font-bold sm:col-span-2">Дата и время начала
        <Input name="scheduledLocal" type="datetime-local" required defaultValue={scheduledLocal} />
        <span className="text-xs font-normal text-muted">Время в часовом поясе вашего города: {timeZone ?? "выберите город в профиле"}.</span>
      </label> : null}
      {error ? <p role="alert" className="text-sm font-bold text-red-700 sm:col-span-2">{error}</p> : null}
      <Button type="submit" variant="action" disabled={busy} className="sm:col-span-2">{busy ? "Сохраняем…" : isPublic && !game.isPublic ? "Сохранить и опубликовать" : "Сохранить настройки"}</Button>
    </form>
  </section>;
}
