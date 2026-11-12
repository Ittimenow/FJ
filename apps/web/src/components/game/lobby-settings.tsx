"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";
import { LobbyAutosaveQueue, lobbyDraftErrors, prepareLobbyPatch, type LobbyDraft, type LobbySaveResult } from "./lobby-autosave";

function localDateTime(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function savedValues(snapshot: GameSnapshot, timeZone: string | null): LobbySaveResult {
  const game = snapshot.game;
  const zone = timeZone ?? game.scheduleTimeZone;
  return {
    values: {
      title: game.title,
      maxPlayers: game.maxPlayers ?? 6,
      timeLimitMinutes: game.timeLimitMinutes,
      periodCount: game.periodCount,
      isPublic: game.isPublic,
      scheduledLocal: game.scheduledAt && zone ? localDateTime(game.scheduledAt, zone) : ""
    },
    revision: snapshot.events.at(-1)?.sequence ?? 0
  };
}

export function LobbySettings({ snapshot, token, timeZone, disabled, onSaved, onPendingChange }: {
  snapshot: GameSnapshot;
  token: string;
  timeZone: string | null;
  disabled: boolean;
  onSaved: (snapshot: GameSnapshot) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const game = snapshot.game;
  const occupied = snapshot.players.filter(player => player.role === "PLAYER" && player.status === "JOINED").length;
  const live = useRef({ snapshot, token, timeZone, onSaved, onPendingChange, occupied });
  live.current = { snapshot, token, timeZone, onSaved, onPendingChange, occupied };
  const [queue] = useState(() => new LobbyAutosaveQueue(savedValues(snapshot, timeZone), {
    prepare: (draft, saved, ready) => prepareLobbyPatch(draft, saved, ready, {
      occupied: live.current.occupied, timeZone: live.current.timeZone, isTest: Boolean(live.current.snapshot.game.isTest)
    }),
    save: async patch => {
      const current = live.current;
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${current.snapshot.game.id}/lobby`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${current.token}` },
        body: JSON.stringify(patch),
        signal: AbortSignal.timeout(15000)
      });
      const result = await response.json() as { snapshot?: GameSnapshot; message?: string | string[] };
      if (!response.ok || !result.snapshot) throw new Error(typeof result.message === "string" ? result.message : "Не удалось сохранить настройки. Попробуйте ещё раз.");
      current.onSaved(result.snapshot);
      return savedValues(result.snapshot, current.timeZone);
    }
  }));
  const [state, setState] = useState(() => queue.getState());

  useEffect(() => {
    const unsubscribe = queue.subscribe(next => {
      setState(next);
      live.current.onPendingChange(next.pending);
    });
    return () => { unsubscribe(); queue.flush(); };
  }, [queue]);
  useEffect(() => { queue.receive(savedValues(snapshot, timeZone)); }, [queue, snapshot, timeZone]);
  useEffect(() => {
    if (!state.pending) return;
    const preventLosingChanges = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventLosingChanges);
    return () => window.removeEventListener("beforeunload", preventLosingChanges);
  }, [state.pending]);

  const draft = state.draft;
  const errors = lobbyDraftErrors(draft, state.dirty, { occupied, timeZone, isTest: Boolean(game.isTest) });
  const hasValidationErrors = Object.keys(errors).length > 0;
  const update = <K extends keyof LobbyDraft>(field: K, value: LobbyDraft[K], delay = 0) => queue.change(field, value, delay);
  const selectClass = "h-12 w-full rounded-xl border border-line bg-white px-3 focus:outline-none focus:ring-4 focus:ring-action/25 disabled:opacity-60";

  return <section id="lobby-settings" className="rounded-2xl bg-white p-4 shadow-panel sm:p-5" aria-labelledby="lobby-settings-title">
    <h2 id="lobby-settings-title" className="text-xl font-extrabold">2. Настройки игры</h2>
    <p className="mt-2 text-sm leading-6 text-muted">Изменения сохраняются автоматически. Открытая игра появится в списке доступных партий после выбора даты и времени.</p>
    <form onSubmit={event => { event.preventDefault(); queue.flush(); }} className="mt-4">
      <fieldset disabled={disabled} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1 text-sm font-bold sm:col-span-2">Название игры
          <Input name="title" value={draft.title} maxLength={80} required onChange={event => update("title", event.target.value, 600)} onBlur={() => queue.flush("title")} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "lobby-title-error" : undefined} />
          {errors.title ? <span id="lobby-title-error" className="text-xs font-normal text-red-700">{errors.title}</span> : null}
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-bold">Мест для игроков
          <select name="maxPlayers" value={draft.maxPlayers} onChange={event => update("maxPlayers", Number(event.target.value))} className={selectClass} aria-label="Количество игроков" aria-invalid={Boolean(errors.maxPlayers)}>
            {Array.from({ length: 11 }, (_, index) => index + 2).map(count => <option key={count} value={count} disabled={count < occupied}>{count}</option>)}
          </select>
          <span className="text-xs font-normal text-muted">Сейчас занято: {occupied}. Боты тоже занимают места.</span>
          {errors.maxPlayers ? <span className="text-xs font-normal text-red-700">{errors.maxPlayers}</span> : null}
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-bold">Длительность
          {game.isTest ? <span className="text-sm font-normal text-muted">Без ограничения для тестовой партии</span> : <select name="timeLimitMinutes" value={draft.timeLimitMinutes ?? ""} onChange={event => update("timeLimitMinutes", Number(event.target.value))} className={selectClass}>
            {draft.timeLimitMinutes === null ? <option value="" disabled>Без ограничения</option> : null}
            {Array.from(new Set([45, 60, 90, 120, 180, 240, ...(draft.timeLimitMinutes === null ? [] : [draft.timeLimitMinutes])])).sort((a, b) => a - b).map(value => <option key={value} value={value}>{value} мин</option>)}
          </select>}
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-bold">Периоды
          <select name="periodCount" value={draft.periodCount} onChange={event => update("periodCount", Number(event.target.value))} className={selectClass}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value === 1 ? "Без деления" : value}</option>)}
          </select>
        </label>
        <div className="grid gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-bold"><input name="isPublic" type="checkbox" checked={draft.isPublic} disabled={Boolean(game.isTest)} onChange={event => {
            if (!event.target.checked) update("scheduledLocal", "");
            update("isPublic", event.target.checked);
          }} className="h-5 w-5 accent-journey" /> Открытая игра</label>
          {game.isTest ? <p className="text-xs text-muted">Тестовые партии доступны только по приглашению.</p> : null}
          {errors.isPublic ? <p className="text-xs text-red-700">{errors.isPublic}</p> : null}
        </div>
        {draft.isPublic ? <label className="grid min-w-0 gap-1 text-sm font-bold sm:col-span-2">Дата и время начала
          <Input name="scheduledLocal" type="datetime-local" required value={draft.scheduledLocal} onChange={event => update("scheduledLocal", event.target.value, 700)} onBlur={() => queue.flush("scheduledLocal")} aria-invalid={Boolean(errors.scheduledLocal)} aria-describedby="lobby-schedule-help" />
          <span id="lobby-schedule-help" className={`text-xs font-normal ${errors.scheduledLocal ? "text-red-700" : "text-muted"}`}>{errors.scheduledLocal ?? `Время в часовом поясе вашего города: ${timeZone ?? "выберите город в профиле"}.`}</span>
        </label> : null}
      </fieldset>
      <div className="mt-4 border-t border-line/70 pt-3">
        {state.error ? <div className="flex flex-wrap items-center gap-3"><p id="lobby-save-error" role="alert" className="text-sm font-bold text-red-700">{state.error} Изменения пока не сохранены.</p><Button type="button" variant="secondary" disabled={disabled} onClick={() => queue.retry()}>Повторить сохранение</Button></div> : <p id="lobby-save-status" role="status" aria-live="polite" className="text-sm font-bold text-ink">{state.saving ? "Сохраняем…" : hasValidationErrors ? "Проверьте заполнение полей — часть изменений ещё не сохранена." : state.pending ? "Изменения ожидают сохранения…" : "Все изменения сохранены"}</p>}
      </div>
    </form>
  </section>;
}
