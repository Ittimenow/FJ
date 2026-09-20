"use client";

import { fastTrackCells, fastTrackPrice, readFastTrackWorld, type FastTrackCell } from "@cashflow/shared";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer, GameSnapshot } from "@/lib/types";
import { eventHeadline, latestGameTurn, playerIdForTurn, visibleTurnEvents } from "./game-journal";
import "./fast-track.css";

const typeNames = { business: "Бизнес", dream: "Мечта", expense: "Расход", positive: "Положительный эффект" };
const shortTitles: Record<number, string> = { 5: "Фастфуд ×3", 14: "Рыбацкая хижина", 17: "Гриль-бары ×2", 19: "Салоны ×3", 32: "Частный самолёт", 35: "Пиццерии ×2", 41: "Химчистка ×2", 42: "Круиз на яхте" };

// The prototype's route is one continuous track with two lower transitions.
function cellPosition(index: number): CSSProperties {
  const columns = [4, 144, 264, 384, 504, 624, 744, 864, 984, 1124];
  const rows = [4, 108, 192, 276, 360, 444, 528, 632];
  if (index < 4) return { left: columns[4 - index], top: rows[1] };
  if (index < 8) return { left: columns[1], top: rows[index - 2] };
  if (index < 11) return { left: columns[index - 7], top: rows[6] };
  if (index < 14) return { left: columns[14 - index], top: 632 };
  if (index < 20) return { left: 4, top: rows[20 - index] };
  if (index < 28) return { left: columns[index - 19], top: 4 };
  if (index < 34) return { left: 1124, top: rows[index - 27] };
  if (index < 37) return { left: columns[42 - index], top: 632 };
  if (index < 40) return { left: columns[index - 31], top: rows[6] };
  if (index < 44) return { left: columns[8], top: rows[45 - index] };
  return { left: columns[52 - index], top: rows[1] };
}

export function FastTrackBoard({ snapshot, player, actions }: {
  snapshot: GameSnapshot; player?: GamePlayer | undefined; actions?: ReactNode;
}) {
  const active = snapshot.players.find((item) => item.id === snapshot.game.currentPlayerId);
  const focusPlayer = player?.track === "FAST_TRACK" ? player : active?.track === "FAST_TRACK" ? active : snapshot.players.find((item) => item.track === "FAST_TRACK");
  const position = focusPlayer?.fastTrackPosition ?? -1;
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, position));
  useEffect(() => setSelectedIndex(Math.max(0, position)), [position, focusPlayer?.id]);
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const liveId = useId();
  const [externalPanels, setExternalPanels] = useState(false);
  useEffect(() => {
    function fit() {
      if (root.current) setExternalPanels(root.current.clientWidth < 1264);
    }
    fit();
    const observer = new ResizeObserver(fit);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const selected = fastTrackCells[selectedIndex]!;
  const world = readFastTrackWorld(snapshot.game.fastTrackWorld);
  const players = snapshot.players.filter((item) => item.role === "PLAYER" && item.status === "JOINED");
  const owner = snapshot.players.find((item) => item.id === world.owners[selectedIndex]);
  const targets = players.filter((item) => item.dreamCellIndex === selectedIndex);
  const price = focusPlayer ? fastTrackPrice(selected, focusPlayer.id, focusPlayer.dreamCellIndex ?? null, world) : selected.cost;
  const detail = <CellDetails cell={selected} price={price} ownerName={owner ? gamePlayerName(owner) : undefined} targets={targets.map(gamePlayerName)} influence={world.influence[selectedIndex]?.length ?? 0} />;
  const overview = focusPlayer ? <PlayerOverview snapshot={snapshot} player={focusPlayer} isMe={player?.id === focusPlayer.id} /> : null;
  const turn = <TurnActivity snapshot={snapshot} actions={actions} selection={<details key={selectedIndex} open={selectedIndex !== position}><summary>Клетка {selected.code} · описание и условия</summary>{detail}</details>} />;

  function centerCell(index: number, focus = false) {
    const container = viewport.current;
    const button = container?.querySelector<HTMLButtonElement>(`[data-fast-cell="${index}"]`);
    if (!container || !button) return;
    if (focus) button.focus({ preventScroll: true });
    if (externalPanels) {
      const a = button.getBoundingClientRect(), b = container.getBoundingClientRect();
      container.scrollTo({ left: container.scrollLeft + a.left - b.left - b.width / 2 + a.width / 2, top: container.scrollTop + a.top - b.top - b.height / 2 + a.height / 2, behavior: "instant" });
    }
  }
  useEffect(() => { centerCell(selectedIndex); }, [selectedIndex, externalPanels]); // viewport-local scrolling never moves the page away from actions
  function selectCell(index: number, focus = false) { setSelectedIndex(index); if (focus) centerCell(index, true); }
  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? 47 : ["ArrowRight", "ArrowDown"].includes(event.key) ? (index + 1) % 48 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (index + 47) % 48 : null;
    if (next !== null) { event.preventDefault(); selectCell(next, true); }
  }
  return <section ref={root} className={`fast-track${externalPanels ? " scroll-board" : ""}`} aria-label="Поле большого круга">
    {externalPanels ? <div className="mobile-controls">{overview}{turn}</div> : null}
    <div className="board-shell"><div className="board-scroll" ref={viewport} tabIndex={0} aria-label="Маршрут большого круга, прокручиваемая область">
      <div className="board board-classic">
        <svg className="classic-route" viewBox="0 0 1240 706" aria-hidden="true"><path className="classic-route-line" d="M 620 143 H 200 V 563 H 440 V 667 H 92 Q 60 667 60 635 V 71 Q 60 39 92 39 H 1148 Q 1180 39 1180 71 V 635 Q 1180 667 1148 667 H 800 V 563 H 1040 V 143 H 620" /><text className="classic-start-label" x="594" y="98">СТАРТ</text><text className="classic-transition-label classic-transition-out" x="420" y="620">11–12</text><text className="classic-transition-label classic-transition-return" x="780" y="620">37–38</text></svg>
        {fastTrackCells.map((cell) => {
          const onCell = players.filter((item) => item.track === "FAST_TRACK" && item.fastTrackPosition === cell.index);
          const ownedBy = snapshot.players.find((item) => item.id === world.owners[cell.index]);
          const dreamPlayers = players.filter((item) => item.dreamCellIndex === cell.index);
          const multiplier = focusPlayer?.dreamCellIndex === cell.index ? fastTrackPrice(cell, focusPlayer.id, focusPlayer.dreamCellIndex, world) / cell.cost : 1;
          const mark = ownedBy ? cell.rule.kind === "ipo" ? "Закрыто" : "Куплен" : dreamPlayers.length ? `Мечта${multiplier > 1 ? ` ×${multiplier}` : ""}` : null;
          return <button key={cell.index} type="button" className={`board-cell cell-${cell.type}${position === cell.index ? " is-current" : ""}`} style={cellPosition(cell.index)} data-fast-cell={cell.index} tabIndex={selectedIndex === cell.index ? 0 : -1} aria-pressed={selectedIndex === cell.index} aria-controls={liveId} aria-label={`${cell.code}. ${typeNames[cell.type]}: ${cell.label}${ownedBy ? `. Владелец: ${gamePlayerName(ownedBy)}` : ""}${dreamPlayers.length ? `. Мечта: ${dreamPlayers.map(gamePlayerName).join(", ")}` : ""}${onCell.length ? `. На клетке: ${onCell.map(gamePlayerName).join(", ")}` : ""}`} onClick={() => selectCell(cell.index)} onKeyDown={(event) => moveFocus(event, cell.index)}>
            <span className="cell-number">{cell.index + 1}</span><span className="cell-letter" aria-hidden="true">{cell.code.slice(-1)}</span><span className="cell-short-title">{shortTitles[cell.index] ?? cell.label}</span>
            {mark ? <span className={`cell-state-mark${!ownedBy ? " target" : cell.rule.kind === "ipo" ? " closed" : ""}`}>{mark}</span> : null}
            {onCell.length ? <span className="cell-tokens">{onCell.map((item) => <span key={item.id} className="player-token" style={{ "--token-color": item.color ?? "#2967df" } as CSSProperties} aria-hidden="true">{gamePlayerName(item).slice(0, 1)}</span>)}</span> : null}
          </button>;
        })}
        {!externalPanels ? <div className="central-panel">{overview}{turn}</div> : null}
      </div>
    </div></div>
    {externalPanels ? <div className="mobile-detail">{detail}</div> : null}
    <div className="player-status" aria-label="Позиции игроков">{players.map((item) => <span key={item.id}><strong>{gamePlayerName(item)}</strong> · {item.track === "FAST_TRACK" ? item.fastTrackPosition < 0 ? "Вход на большой круг" : `Клетка ${item.fastTrackPosition + 1}` : "Малый круг"}</span>)}</div>
    <div id={liveId} className="sr-only" aria-live="polite" aria-atomic="true">{selected.code}. {selected.label}. {selected.cost > 0 ? `Стоимость: ${money(price)}.` : ""} {selected.description}</div>
  </section>;
}

function CellDetails({ cell, price, ownerName, targets, influence }: { cell: FastTrackCell; price: number; ownerName?: string | undefined; targets: string[]; influence: number }) {
  const rule = cell.rule;
  const effect = rule.kind === "cashflow" ? "Текущий доход" : rule.kind === "half_cash" ? "−50% наличных" : rule.kind === "lose_cash" ? "Все наличные" : rule.kind === "charity" ? "1–3 кубика" : rule.kind === "ipo" ? money(rule.payout) : null;
  return <article className={`cell-detail detail-${cell.type}`}>
    <div className="detail-heading"><span className="detail-code">{cell.code}</span><div><span className="detail-type">{typeNames[cell.type]}</span><h3 className="detail-title">{cell.label}</h3></div></div>
    <dl className="detail-metrics">
      {cell.cost > 0 ? <div><dt>Стоимость</dt><dd>{money(price)}</dd></div> : null}
      {cell.income > 0 ? <div><dt>Прирост дохода</dt><dd>+{money(cell.income)}</dd></div> : null}
      {effect ? <div><dt>{rule.kind === "ipo" ? "Выплата при успехе" : "Эффект"}</dt><dd>{effect}</dd></div> : null}
      {cell.roi ? <div><dt>ROI</dt><dd>{cell.roi}</dd></div> : null}
    </dl>
    <p className="detail-rule">{cell.description}{rule.kind === "chance_business" || rule.kind === "ipo" ? ` Успех при броске ${rule.minimum}–6. При неудаче вложение теряется.` : ""}</p>
    <div className="detail-state">{ownerName ? `Владелец: ${ownerName}. ` : ""}{targets.length ? `Мечта: ${targets.join(", ")}. Жетонов влияния: ${influence}.` : ""}</div>
  </article>;
}

function PlayerOverview({ snapshot, player, isMe }: { snapshot: GameSnapshot; player: GamePlayer; isMe: boolean }) {
  const [tab, setTab] = useState(0), id = useId();
  const world = readFastTrackWorld(snapshot.game.fastTrackWorld);
  const assets = fastTrackCells.filter((cell) => world.owners[cell.index] === player.id && cell.income > 0);
  const state = player.financialState, income = state?.fastTrackIncomeCents ?? 0, initial = state?.fastTrackStartIncomeCents ?? 0;
  const dream = fastTrackCells[player.dreamCellIndex ?? -1];
  const price = dream ? fastTrackPrice(dream, player.id, player.dreamCellIndex ?? null, world) : 0;
  const liabilities = player.liabilities ?? [];
  const tabs = ["Игрок", `Активы${assets.length ? ` ${assets.length}` : ""}`, "Расходы", `Долги${liabilities.length ? ` ${liabilities.length}` : ""}`];
  return <section className="player-overview" aria-label={`Финансы большого круга: ${gamePlayerName(player)}`}>
    <div className="player-heading"><div className="player-identity"><span className="player-avatar" aria-hidden="true">{gamePlayerName(player).slice(0, 1)}</span><div><h3 className="player-name">{gamePlayerName(player)}</h3><p className="player-profession">{player.profession?.name ?? "Предприниматель"}</p></div></div>{snapshot.game.currentPlayerId === player.id ? <span className="player-turn-tag">{isMe ? "Ваш ход" : "Ходит"}</span> : null}</div>
    <div className="player-tabs" role="tablist" aria-label="Информация об игроке">{tabs.map((label, index) => <button key={index} type="button" id={`${id}-tab-${index}`} role="tab" aria-controls={`${id}-panel`} aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={(event) => { const next = event.key === "ArrowRight" ? (index + 1) % 4 : event.key === "ArrowLeft" ? (index + 3) % 4 : event.key === "Home" ? 0 : event.key === "End" ? 3 : null; if (next !== null) { event.preventDefault(); setTab(next); document.getElementById(`${id}-tab-${next}`)?.focus(); } }}>{label}</button>)}</div>
    <div className="player-tab-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
      {tab === 0 ? <><dl className="player-metrics"><div><dt>Наличные</dt><dd>{money(state?.cashCents ?? 0)}</dd></div><div><dt>Доход CASHFLOW</dt><dd>{money(income)}</dd></div><div className="is-positive"><dt>Прирост дохода</dt><dd>+{money(income - initial)}</dd></div><div><dt>До победы по доходу</dt><dd>+{money(Math.max(0, initial + 50_000 - income))}</dd></div></dl><div className="player-assets"><div className="player-section-heading">Активы большого круга · {assets.length}</div><p>{assets.map((cell) => cell.label).join(" · ") || "Пока нет приобретённых бизнесов"}</p></div><div className="player-goal"><div className="player-goal-row"><span>Финансовая цель</span><strong>+{money(50_000)} к доходу</strong></div><div className="player-goal-row"><span>Целевая мечта</span><strong>{dream ? `${dream.label} · ${money(price)}` : "Не выбрана"}</strong></div></div></> : tab === 1 ? <><div className="player-list-heading"><strong>Бизнесы большого круга</strong><span>+{money(assets.reduce((sum, cell) => sum + cell.income, 0))}</span></div><ul className="player-list">{assets.map((cell) => <li key={cell.index}><span>{cell.label}</span><strong>+{money(cell.income)}</strong></li>)}</ul>{!assets.length ? <p className="detail-rule">Пока нет приобретённых бизнесов.</p> : null}</> : tab === 2 ? <><div className="player-list-heading"><strong>Расходы большого круга</strong></div><p className="detail-rule">Регулярных расходов нет. Налоговая проверка и судебный иск забирают половину наличных, развод — все наличные.</p>{state?.fastTrackCharity ? <p className="detail-state">Благотворительность оплачена: доступны 1–3 кубика.</p> : null}</> : <><div className="player-list-heading"><strong>Долги малого круга</strong><span>{money(liabilities.reduce((sum, item) => sum + item.balanceCents, 0))}</span></div><ul className="player-list">{liabilities.map((item) => <li key={item.id}><span>{item.name}</span><strong>{money(item.balanceCents)}</strong></li>)}</ul><p className="detail-rule">{liabilities.length ? "Обязательства остались в отчёте малого круга. " : "Долгов нет. "}На большом круге кредиты недоступны.</p></>}
    </div>
  </section>;
}

function TurnActivity({ snapshot, actions, selection }: { snapshot: GameSnapshot; actions?: ReactNode; selection?: ReactNode }) {
  const active = snapshot.players.find((item) => item.id === snapshot.game.currentPlayerId);
  const last = latestGameTurn(snapshot);
  const events = last && playerIdForTurn(last) === active?.id && !last.complete ? visibleTurnEvents(last).slice(-4) : [];
  const pending = snapshot.game.pendingAction?.type === "fast_track_choice" ? snapshot.game.pendingAction : null;
  return <section className="turn-activity" aria-label="История и действия текущего хода"><div className="turn-heading"><div><h3>Ход игрока</h3><p>{gamePlayerName(active)} · раунд {snapshot.game.currentRound}</p></div><span className="turn-status">{snapshot.game.status === "ENDED" ? "Завершён" : snapshot.game.status === "PAUSED" ? "Пауза" : pending ? "Решение" : "В процессе"}</span></div>
    <ol className="turn-timeline">{events.length ? events.map((event, index) => <li key={event.id} className={`turn-event${index === events.length - 1 ? " is-current" : ""}`}><strong>{eventHeadline(event)}</strong>{event.type === "player:move" && typeof event.payload.to === "number" ? <span>{fastTrackCells[event.payload.to]?.label}</span> : null}</li>) : <li className="turn-event is-current"><strong>{active?.fastTrackPosition === -1 ? "Вход на большой круг" : `Клетка ${(active?.fastTrackPosition ?? 0) + 1}`}</strong><span>{active?.track === "FAST_TRACK" ? fastTrackCells[active.fastTrackPosition]?.label ?? "Ожидание первого броска" : "Игрок проходит малый круг"}</span></li>}</ol>
    {actions ?? <p className="detail-rule">{pending ? `Ожидается решение: ${fastTrackCells[pending.cellIndex]?.label}` : "Ожидается ход игрока"}</p>}
    {selection ? <div className="turn-selection">{selection}</div> : null}
  </section>;
}
