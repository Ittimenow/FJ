"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

type GameType = "101" | "202";
type CardSet = {
  id: string;
  name: string;
  gameType: GameType;
  isDefault: boolean;
  counts: Record<string, number>;
};

const modes = [
  { value: "101", title: "101 — базовая игра", description: "Доходы, расходы и инвестиции. Наборы карточек для правил 101." },
  { value: "202", title: "202 — расширенная игра", description: "Стартовые портфели, опционы и короткие продажи. Наборы карточек для правил 202." }
] as const;

export function GameModeSettings({ snapshot, token, canManage, isAdmin, disabled, onSaved, onPendingChange }: {
  snapshot: GameSnapshot;
  token: string;
  canManage: boolean;
  isAdmin: boolean;
  disabled: boolean;
  onSaved: (snapshot: GameSnapshot) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const game = snapshot.game;
  const selected = game.gameTypeSelected !== false;
  const savedMode = game.gameType ?? "101";
  const savedKey = `${game.id}:${selected}:${savedMode}:${game.cardSet.id}`;
  const [draftKey, setDraftKey] = useState(savedKey);
  const canChooseSet = isAdmin || game.mode === "SOLO";
  const [mode, setMode] = useState<GameType | null>(selected ? savedMode : null);
  const [cardSetId, setCardSetId] = useState(selected ? game.cardSet.id : "");
  const [sets, setSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const changed = draftKey === savedKey && (!selected || mode !== savedMode || (canChooseSet && cardSetId !== game.cardSet.id));

  useEffect(() => {
    setMode(selected ? savedMode : null);
    setCardSetId(selected ? game.cardSet.id : "");
    setDraftKey(savedKey);
    setError(null);
  }, [game.id, game.cardSet.id, savedMode, savedKey, selected]);

  useEffect(() => {
    onPendingChange(canManage && (changed || busy));
  }, [busy, canManage, changed, onPendingChange]);

  useEffect(() => {
    if (!mode || !canManage) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setSets([]);
    void (async () => {
      try {
        const response = await fetch(`${publicApiBaseUrl()}/api/games/card-sets?gameType=${mode}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
        });
        if (!response.ok) throw new Error("Не удалось загрузить наборы карточек. Попробуйте ещё раз.");
        const items = (await response.json() as CardSet[]).filter(set => set.gameType === mode);
        if (cancelled) return;
        setSets(items);
        setCardSetId(current => items.some(set => set.id === current)
          ? current
          : (items.find(set => set.isDefault) ?? items[0])?.id ?? "");
      } catch (cause) {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Не удалось загрузить наборы карточек.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [canManage, mode, retry, token]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || !cardSetId || busy || disabled || loading || loadError) return;
    setBusy(true);
    onPendingChange(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${game.id}/lobby`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameType: mode, ...(canChooseSet ? { cardSetId } : {}) })
      });
      const result = await response.json() as { snapshot?: GameSnapshot; message?: string | string[] };
      if (!response.ok || !result.snapshot) throw new Error(typeof result.message === "string" ? result.message : "Не удалось сохранить режим игры. Попробуйте ещё раз.");
      onSaved(result.snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const availableSets = sets.filter(set => set.gameType === mode);
  const currentSet = availableSets.find(set => set.id === cardSetId);
  if (!canManage) return <section id="game-mode-settings" className="rounded-2xl bg-white p-4 shadow-panel sm:p-5" aria-labelledby="game-mode-title">
    <h1 id="game-mode-title" className="text-xl font-extrabold">1. Режим и набор карточек</h1>
    <p className="mt-2 text-sm leading-6 text-muted">{selected ? `Режим ${savedMode}. Набор карточек: ${game.cardSet.name}.` : "Ведущий выбирает режим и набор карточек. Затем можно будет подготовиться к старту."}</p>
  </section>;

  return <section id="game-mode-settings" className="rounded-2xl bg-white p-4 shadow-panel sm:p-5" aria-labelledby="game-mode-title">
    <h1 id="game-mode-title" className="text-2xl font-extrabold tracking-[-0.03em]">1. Режим и набор карточек</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Сначала выберите режим и его набор карточек. Затем настройте партию и подготовьте участников к старту.</p>
    <form onSubmit={event => void save(event)} className="mt-5 grid gap-5" aria-busy={busy}>
      <fieldset disabled={busy || disabled}>
        <legend className="mb-3 text-base font-extrabold">Режим игры</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map(item => <label key={item.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition focus-within:ring-4 focus-within:ring-action/25 ${mode === item.value ? "border-journey bg-[#e8effe]" : "border-line bg-white hover:bg-card"} ${busy || disabled ? "cursor-default opacity-60" : ""}`}>
            <input type="radio" name="game-mode" value={item.value} checked={mode === item.value} className="mt-1 h-5 w-5 shrink-0 accent-journey" onChange={() => {
              setMode(item.value);
              setCardSetId(item.value === savedMode && selected ? game.cardSet.id : "");
              setError(null);
              onPendingChange(true);
            }} />
            <span className="min-w-0"><span className="block text-base font-extrabold">{item.title}</span><span className="mt-1 block text-sm leading-6 text-ink">{item.description}</span></span>
          </label>)}
        </div>
      </fieldset>

      {mode ? <div className="grid gap-2">
        <h2 id="game-mode-card-set-label" className="text-base font-extrabold">Набор карточек для {mode}</h2>
        {loading ? <p role="status" className="text-sm text-muted">Загружаем наборы для режима {mode}…</p> : loadError ? <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-red-700">{loadError}</p><Button type="button" variant="secondary" onClick={() => setRetry(value => value + 1)}>Повторить</Button></div> : availableSets.length === 0 ? <p role="alert" className="text-sm text-red-700">Для режима {mode} пока нет готовых наборов. Обратитесь к администратору или выберите другой режим.</p> : <>
          {canChooseSet ? <select id="game-mode-card-set" aria-labelledby="game-mode-card-set-label" value={cardSetId} disabled={busy || disabled} onChange={event => { setCardSetId(event.target.value); setError(null); onPendingChange(true); }} className="h-12 w-full rounded-xl border border-line bg-white px-3 text-sm focus:outline-none focus:ring-4 focus:ring-action/25 sm:max-w-xl">
            {availableSets.map(set => <option key={set.id} value={set.id}>{set.name}{set.isDefault ? " — основной" : ""}</option>)}
          </select> : <p id="game-mode-card-set" className="text-sm font-bold">{currentSet?.name ?? game.cardSet.name}</p>}
          {currentSet ? <p className="text-sm text-muted">Карточек в наборе: {Object.values(currentSet.counts).reduce((sum, count) => sum + count, 0)}. Только правила {mode}.</p> : null}
        </>}
      </div> : <p className="text-sm text-muted">Наборы карточек и остальные настройки появятся после выбора режима.</p>}

      {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
      {changed || busy ? <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="action" disabled={!mode || !cardSetId || loading || Boolean(loadError) || busy || disabled}>{busy ? "Сохраняем…" : selected ? "Сохранить режим и набор" : "Продолжить настройку"}</Button>
        {selected ? <Button type="button" variant="secondary" disabled={busy || disabled} onClick={() => { setMode(savedMode); setCardSetId(game.cardSet.id); setError(null); onPendingChange(false); }}>Отменить изменения</Button> : null}
      </div> : <p role="status" className="text-sm font-bold text-ink">Режим {savedMode} и набор «{game.cardSet.name}» сохранены. Можно продолжить подготовку.</p>}
    </form>
  </section>;
}
