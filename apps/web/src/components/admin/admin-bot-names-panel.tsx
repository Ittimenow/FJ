"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";

type BotName = { id: string; name: string; isActive: boolean };

export function AdminBotNamesPanel({ token }: { token: string }) {
  const [names, setNames] = useState<BotName[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`${publicApiBaseUrl()}/api/admin/bot-names`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (response) => {
      if (!response.ok) throw new Error("Не удалось загрузить имена ботов.");
      return response.json() as Promise<BotName[]>;
    }).then((items) => { if (active) setNames(items); })
      .catch((cause) => { if (active) setError((cause as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function addName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/gu, " ");
    if (!normalized || [...normalized].length > 15 || !/^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)?$/u.test(normalized)) {
      setError("Введите одно или два слова, всего не более 15 символов.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/bot-names`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: normalized })
      });
      const result = await response.json() as BotName & { message?: string };
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Не удалось добавить имя.");
      setNames((current) => [...current, result].sort((left, right) => left.name.localeCompare(right.name, "ru")));
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить имя.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(entry: BotName, isActive: boolean) {
    setBusyId(entry.id);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/bot-names/${entry.id}${isActive ? "/restore" : ""}`, {
        method: isActive ? "PATCH" : "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(isActive ? "Не удалось восстановить имя." : "Не удалось удалить имя.");
      const updated = await response.json() as BotName;
      setNames((current) => current.map((item) => item.id === updated.id ? updated : item));
      setPendingDeleteId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить список имён.");
    } finally {
      setBusyId(null);
    }
  }

  const activeNames = names.filter((entry) => entry.isActive);
  const inactiveNames = names.filter((entry) => !entry.isActive);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
      <h2 className="text-xl font-extrabold text-ink">Имена ботов</h2>
      <p className="mt-1 text-sm leading-6 text-muted">При добавлении бота имя случайно выбирается из этого списка и не повторяется в одной партии.</p>
      <form onSubmit={(event) => void addName(event)} className="mt-5 flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-sm font-bold text-ink">
          Новое имя
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} placeholder="Например, Милфа Света" className="mt-2" />
        </label>
        <Button type="submit" disabled={saving || !name.trim()}>{saving ? "Добавляем…" : "Добавить имя"}</Button>
      </form>
      <p className="mt-2 text-xs text-muted">Одно или два слова, не более 15 символов.</p>
      {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 flex items-center justify-between border-b border-line pb-2">
        <h3 className="text-sm font-extrabold text-ink">Доступные имена</h3>
        <span className="text-xs font-bold text-muted">{activeNames.length}</span>
      </div>
      {loading ? <p className="mt-4 text-sm text-muted">Загружаем список…</p> : null}
      {!loading && activeNames.length === 0 ? <p className="mt-4 text-sm text-muted">Доступных имён нет. Добавьте имя или восстановите удалённое.</p> : null}
      {!loading && activeNames.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeNames.map((entry) => <li key={entry.id} className="rounded-xl bg-card px-3 py-2 text-sm font-bold text-ink">
            <div className="flex items-center justify-between gap-2"><span>{entry.name}</span><Button type="button" variant="ghost" disabled={busyId !== null} onClick={() => setPendingDeleteId(entry.id)} className="text-red-700">Удалить</Button></div>
            {pendingDeleteId === entry.id ? <div className="mt-2 border-t border-line pt-2">
              <p className="text-xs font-normal text-muted">Исключить имя из выбора для новых ботов?</p>
              <div className="mt-2 flex gap-2"><Button type="button" disabled={busyId !== null} onClick={() => void setActive(entry, false)}>Да, удалить</Button><Button type="button" variant="ghost" disabled={busyId !== null} onClick={() => setPendingDeleteId(null)}>Отмена</Button></div>
            </div> : null}
          </li>)}
        </ul>
      ) : null}
      {!loading && inactiveNames.length > 0 ? <>
        <div className="mt-7 flex items-center justify-between border-b border-line pb-2"><h3 className="text-sm font-extrabold text-ink">Удалённые имена</h3><span className="text-xs font-bold text-muted">{inactiveNames.length}</span></div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inactiveNames.map((entry) => <li key={entry.id} className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-sm font-bold text-muted"><span>{entry.name}</span><Button type="button" variant="ghost" disabled={busyId !== null} onClick={() => void setActive(entry, true)}>Восстановить</Button></li>)}
        </ul>
      </> : null}
    </section>
  );
}
