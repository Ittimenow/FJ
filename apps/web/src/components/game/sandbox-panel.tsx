"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, Search, X } from "lucide-react";
import { fastTrackCells, ratRaceBoard, type SandboxCard, type SandboxPlayerSetup, type SandboxScenario } from "@cashflow/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { gamePlayerName } from "@/lib/game-player";
import type { GameSnapshot } from "@/lib/types";
import { GamePlayerMark } from "./game-player-mark";
import { JournalCard } from "./journal-card";
import { game202CardContent } from "./game-202-card-model";

const selectClass = "h-11 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-sm text-ink focus-visible:outline-action";

export function SandboxPanel({ snapshot, token, playerId, onPlayerChange, onSnapshot, onClose }: {
  snapshot: GameSnapshot; token: string; playerId: string;
  onPlayerChange: (id: string) => void; onSnapshot: (snapshot: GameSnapshot) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [scenario, setScenario] = useState<SandboxScenario>(() => structuredClone(snapshot.sandbox!.scenario));
  const [cards, setCards] = useState<SandboxCard[]>([]);
  const [search, setSearch] = useState("");
  const [deck, setDeck] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const setup = scenario.players.find(p => p.playerId === playerId)!;
  const selected = cards.find(card => card.id === selectedId);
  const visible = cards.filter(card => (!deck || card.typeLabel === deck) && `${card.title} ${card.bodyText} ${card.id}`.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));
  const cardName = (id: number) => cards.find(card => card.id === id)?.title ?? `Карточка ${id}`;
  const player = snapshot.players.find(p => p.id === playerId)!;
  const updatePlayer = (patch: Partial<SandboxPlayerSetup>) => setScenario(current => ({ ...current, players: current.players.map(p => p.playerId === playerId ? { ...p, ...patch } : p) }));
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow;previous?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setError(null);
    void fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/sandbox/cards`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Не удалось загрузить каталог карточек");setCards(await response.json()); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Нет связи с сервером"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [snapshot.game.id, token, reload]);
  async function apply(reset: boolean) {
    if (busy) return;
    setBusy(true);setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/sandbox/${reset ? "reset" : "scenario"}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(reset ? {} : scenario) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Проверьте значения сценария и повторите");
      onSnapshot(data.snapshot);onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Нет связи с сервером. Настройки сохранены в форме."); }
    finally { setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} aria-labelledby="sandbox-title" onCancel={event => { event.preventDefault();if (!busy) onClose(); }}
    className="fixed inset-x-0 m-auto w-[calc(100%_-_1rem)] max-w-3xl overflow-hidden rounded-2xl bg-card p-0 text-ink shadow-panel backdrop:bg-ink/50"
    style={{ top: "calc(var(--app-shell-header-bottom, 76px) + 8px)", bottom: "auto", maxHeight: "calc(100dvh - var(--app-shell-header-bottom, 76px) - 16px)" }}>
    <form className="flex max-h-[inherit] min-h-0 flex-col" onSubmit={event => { event.preventDefault();void apply(false); }}>
      <header className="flex shrink-0 items-start justify-between gap-3 bg-white px-4 py-3 sm:px-6">
        <div><h2 id="sandbox-title" className="text-xl font-extrabold">Песочница {snapshot.game.gameType}</h2><p className="mt-1 text-sm">Запуск {snapshot.sandbox!.run} · без статистики и публикаций</p></div>
        <Button type="button" variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label="Закрыть песочницу" onClick={onClose} disabled={busy}><X size={20} /></Button>
      </header>
      <div className="min-h-0 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
        <fieldset disabled={busy} className="space-y-3"><legend className="mb-2 font-extrabold">Управлять игроком</legend>
          <div className="flex flex-wrap gap-2">{scenario.players.map(p => { const person = snapshot.players.find(row => row.id === p.playerId)!;return <Button key={p.playerId} type="button" variant={p.playerId === playerId ? "primary" : "secondary"} aria-pressed={p.playerId === playerId} aria-label={gamePlayerName(person)} className="max-w-full gap-2" onClick={() => onPlayerChange(p.playerId)}><GamePlayerMark player={person} size="sm" /><span className="truncate">{gamePlayerName(person)}</span></Button>; })}</div>
          <p className="text-sm leading-6">Закройте панель, чтобы выполнять обычные игровые действия за выбранного участника.</p>
        </fieldset>
        <fieldset disabled={busy} className="space-y-4"><legend className="mb-2 text-lg font-extrabold">Исходная ситуация</legend>
          <p className="text-sm leading-6">Настройте обоих игроков. «Применить» начнёт новый запуск с этими значениями. Активы выдаются без списания стартовых наличных.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Круг<select className={selectClass} value={scenario.track} onChange={event => setScenario(current => ({ ...current, track: event.target.value as SandboxScenario["track"], players: current.players.map(p => ({ ...p, position: event.target.value === "FAST_TRACK" ? Math.max(0, p.position) : Math.min(23, p.position), dice: [] })) }))}><option value="RAT_RACE">Малый круг</option><option value="FAST_TRACK">Большой круг</option></select></label>
            <label className="grid gap-2 text-sm font-bold">Кто ходит первым<select className={selectClass} value={scenario.firstPlayerId} onChange={event => setScenario(current => ({ ...current, firstPlayerId: event.target.value }))}>{scenario.players.map(p => <option key={p.playerId} value={p.playerId}>{gamePlayerName(snapshot.players.find(row => row.id === p.playerId))}</option>)}</select></label>
          </div>
          <h3 className="font-extrabold">Настройки: {gamePlayerName(player)}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Наличные, $<Input type="number" min={0} max={10_000_000} step={1} required value={setup.cash} onChange={event => updatePlayer({ cash: Number(event.target.value) })} /></label>
            <label className="grid gap-2 text-sm font-bold">Начальная клетка<select className={selectClass} value={setup.position} onChange={event => updatePlayer({ position: Number(event.target.value) })}>{scenario.track === "RAT_RACE" ? <option value={-1}>Старт</option> : null}{(scenario.track === "FAST_TRACK" ? fastTrackCells : ratRaceBoard).map(cell => <option key={cell.index} value={cell.index}>{cell.index + 1}. {cell.label}</option>)}</select></label>
            {scenario.track === "FAST_TRACK" ? <label className="grid gap-2 text-sm font-bold">Начальный доход, $<Input type="number" min={1} max={1_000_000} step={1} required value={setup.fastIncome} onChange={event => updatePlayer({ fastIncome: Number(event.target.value) })} /></label> : null}
            <label className="grid gap-2 text-sm font-bold">Следующий бросок<select className={selectClass} value={setup.dice.length ? "fixed" : "random"} onChange={event => updatePlayer({ dice: event.target.value === "fixed" ? Array.from({ length: scenario.track === "FAST_TRACK" ? 2 : 1 }, () => 1) : [] })}><option value="random">Случайный</option><option value="fixed">Задать кубики</option></select></label>
          </div>
          {setup.dice.length ? <div className="flex gap-3">{setup.dice.map((value, index) => <label key={index} className="grid gap-2 text-sm font-bold">Кубик {index + 1}<Input type="number" min={1} max={6} step={1} required value={value} onChange={event => updatePlayer({ dice: setup.dice.map((die, i) => i === index ? Number(event.target.value) : die) })} /></label>)}</div> : null}
        </fieldset>
        {scenario.track === "FAST_TRACK" ? <fieldset disabled={busy} className="space-y-3"><legend className="mb-2 font-extrabold">Активы большого круга</legend>{fastTrackCells.filter(cell => ["business", "chance_business", "ipo"].includes(cell.rule.kind)).map(cell => <label key={cell.index} className="flex min-h-11 items-center gap-3 text-sm"><input className="h-5 w-5 shrink-0 accent-[#2967df]" type="checkbox" checked={setup.fastAssets.includes(cell.index)} onChange={event => updatePlayer({ fastAssets: event.target.checked ? [...setup.fastAssets, cell.index] : setup.fastAssets.filter(index => index !== cell.index) })} />{cell.label}</label>)}<p className="text-sm leading-6">События большого круга выбираются начальной клеткой и результатом броска. Доход выбранных активов прибавится к начальному доходу.</p></fieldset> : <fieldset disabled={busy || loading} className="space-y-4"><legend className="mb-2 text-lg font-extrabold">Карточки: {gamePlayerName(player)}</legend>
          <div><h4 className="font-bold">Начальные активы</h4>{setup.assets.length ? <ul className="mt-2 space-y-2">{setup.assets.map((asset, index) => <li key={index} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 break-words">{cardName(asset.cardId)} × {asset.quantity}</span><Button type="button" variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label={`Удалить актив ${cardName(asset.cardId)}`} onClick={() => updatePlayer({ assets: setup.assets.filter((_, i) => i !== index) })}><X size={16} /></Button></li>)}</ul> : <p className="mt-1 text-sm">Активы пока не добавлены.</p>}</div>
          <div><h4 className="font-bold">Следующие карточки</h4><p className="mt-1 text-sm leading-6">Каждая выпадет при следующем обращении к её колоде. Для сделок выберите нужную колоду на клетке «Возможность».</p>{setup.nextCards.length ? <ol className="mt-2 space-y-2">{setup.nextCards.map((id, index) => <li key={index} className="flex items-center justify-between gap-2 text-sm"><span>{index + 1}. {cardName(id)}</span><Button type="button" variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label={`Удалить следующую карточку ${index + 1}`} onClick={() => updatePlayer({ nextCards: setup.nextCards.filter((_, i) => i !== index) })}><X size={16} /></Button></li>)}</ol> : <p className="mt-2 text-sm">Случайное выпадение.</p>}</div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold"><span className="flex items-center gap-2"><Search size={16} aria-hidden="true" />Поиск карточки</span><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Название, текст или номер" /></label><label className="grid gap-2 text-sm font-bold">Колода<select className={selectClass} value={deck} onChange={event => setDeck(event.target.value)}><option value="">Все колоды</option>{[...new Set(cards.map(c => c.typeLabel))].map(label => <option key={label}>{label}</option>)}</select></label></div>
          {loading ? <p role="status">Загружаем карточки…</p> : <div className="max-h-48 overflow-y-auto rounded-xl bg-white p-2" aria-label="Каталог карточек">{visible.length ? visible.map(card => <button type="button" key={card.id} aria-pressed={selectedId === card.id} className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-action ${selectedId === card.id ? "bg-journey text-white" : "hover:bg-card"}`} onClick={() => { setSelectedId(card.id);setQuantity(card.quantityStep); }}><span className="font-bold">{card.title}</span><span className="mt-1 block text-xs">{card.typeLabel}</span></button>) : <p className="p-3 text-sm">Карточек по этому запросу нет.</p>}</div>}
          {selected ? <div className="space-y-3"><JournalCard {...(snapshot.game.gameType === "202" ? game202CardContent(selected) : { cardType: selected.cardType, typeLabel: selected.typeLabel, title: selected.title, bodyText: selected.bodyText })} /><div className="flex flex-wrap items-end gap-3"><Button type="button" variant="secondary" disabled={setup.nextCards.length >= 20} onClick={() => updatePlayer({ nextCards: [...setup.nextCards, selected.id] })}>Назначить следующей</Button>{selected.canOwn ? <><label className="grid max-w-32 gap-2 text-sm font-bold">Количество<Input type="number" min={selected.quantityStep} max={selected.quantityMax} step={selected.quantityStep} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label><Button type="button" variant="secondary" disabled={setup.assets.length >= 40 || !Number.isInteger(quantity) || quantity < selected.quantityStep || quantity > selected.quantityMax || quantity % selected.quantityStep !== 0} onClick={() => updatePlayer({ assets: [...setup.assets, { cardId: selected.id, quantity }] })}>Добавить в активы</Button></> : null}</div></div> : null}
        </fieldset>}
        {error ? <div role="alert" className="text-sm font-bold text-red-700">{error}{!cards.length ? <Button type="button" variant="ghost" onClick={() => setReload(value => value + 1)}>Повторить загрузку</Button> : null}</div> : null}
      </div>
      <footer className="flex shrink-0 flex-wrap gap-2 bg-white p-3 sm:px-6">
        <Button type="submit" disabled={busy || loading}>{busy ? "Подготавливаем…" : "Применить и начать заново"}</Button>
        <Button type="button" variant="secondary" className="gap-2" disabled={busy} onClick={() => void apply(true)}><RotateCcw size={16} aria-hidden="true" />Вернуть исходную ситуацию</Button>
      </footer>
    </form>
  </dialog>, document.body);
}
