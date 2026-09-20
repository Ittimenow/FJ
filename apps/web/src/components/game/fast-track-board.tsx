"use client";

import { fastTrackCells, fastTrackPrice, readFastTrackWorld, type FastTrackCell } from "@cashflow/shared";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer, GameSnapshot } from "@/lib/types";
import { GameActionHistory } from "./game-action-history";
import { GamePlayerMark } from "./game-player-mark";
import { PlayerAvatar } from "./player-avatar";
import { fastTrackCellEffect, purchasedFastTrackCells } from "./fast-track-presentation";
import "./fast-track.css";

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

export function FastTrackBoard({ snapshot, player, actions, history }: {
  snapshot: GameSnapshot;
  player?: GamePlayer | undefined;
  actions?: ReactNode;
  history?: ReactNode;
}) {
  const active = snapshot.players.find((item) => item.id === snapshot.game.currentPlayerId);
  const focusPlayer = player?.track === "FAST_TRACK" ? player : active?.track === "FAST_TRACK" ? active : snapshot.players.find((item) => item.track === "FAST_TRACK");
  const position = focusPlayer?.fastTrackPosition ?? -1;
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [externalPanels, setExternalPanels] = useState(false);
  useEffect(() => {
    const fit = () => { if (root.current) setExternalPanels(root.current.clientWidth < 1264); };
    fit();
    const observer = new ResizeObserver(fit);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const container = viewport.current;
    const cell = container?.querySelector<HTMLElement>(`[data-fast-cell="${Math.max(0, position)}"]`);
    if (!externalPanels || !container || !cell) return;
    container.scrollTo({
      left: cell.offsetLeft - container.clientWidth / 2 + cell.clientWidth / 2,
      top: cell.offsetTop - container.clientHeight / 2 + cell.clientHeight / 2,
      behavior: "instant"
    });
  }, [position, focusPlayer?.id, externalPanels]);
  const world = readFastTrackWorld(snapshot.game.fastTrackWorld);
  const players = snapshot.players.filter((item) => item.role === "PLAYER" && item.status === "JOINED");
  const overview = focusPlayer ? <PlayerOverview snapshot={snapshot} player={focusPlayer} /> : null;
  const turn = <section className="turn-activity" aria-label="Ход и история игроков">
    {actions ?? <p className="turn-waiting">{snapshot.game.status === "ENDED" ? "Партия завершена" : snapshot.game.status === "PAUSED" ? "Партия на паузе" : `Ходит: ${gamePlayerName(active)}`}</p>}
    {history ?? <GameActionHistory key={snapshot.game.id} gameId={snapshot.game.id} events={snapshot.events} players={snapshot.players} />}
  </section>;

  return <section ref={root} className={`fast-track${externalPanels ? " scroll-board" : ""}`} aria-label="Поле большого круга">
    {externalPanels ? <div className="mobile-controls">{overview}{turn}</div> : null}
    <div className="board-shell"><div className="board-scroll" ref={viewport} tabIndex={0} aria-label="Маршрут большого круга, прокручиваемая область">
      <div className="board board-classic">
        <svg className="classic-route" viewBox="0 0 1240 714" aria-hidden="true"><path className="classic-route-line" d="M 620 147 H 200 V 567 H 440 V 671 H 92 Q 60 671 60 639 V 75 Q 60 43 92 43 H 1148 Q 1180 43 1180 75 V 639 Q 1180 671 1148 671 H 800 V 567 H 1040 V 147 H 620" /><text className="classic-start-label" x="594" y="98">СТАРТ</text></svg>
        {fastTrackCells.map((cell) => {
          const onCell = players.filter((item) => item.track === "FAST_TRACK" && item.fastTrackPosition === cell.index);
          const owners = snapshot.players.filter((item) => world.owners[cell.index] === item.id || world.dreamPurchases[cell.index]?.includes(item.id)
            || (cell.rule.kind === "charity" && item.financialState?.fastTrackCharity));
          const price = focusPlayer ? fastTrackPrice(cell, focusPlayer.id, focusPlayer.dreamCellIndex ?? null, world) : cell.cost;
          const effect = fastTrackCellEffect(cell);
          return <article key={cell.index} className={`board-cell cell-${cell.type}`} style={cellPosition(cell.index)} data-fast-cell={cell.index} aria-label={cell.label}>
            <h3 className="cell-title">{cell.label}</h3>
            {cell.cost > 0 ? <span className="cell-price">{money(price)}</span> : null}
            {effect ? <span className="cell-effect">{effect}</span> : null}
            {owners.length ? <span className="cell-owner">{owners.map((owner) => <span key={owner.id} role="img" aria-label={`${cell.rule.kind === "ipo" ? "Закрыто" : "Владелец"}: ${gamePlayerName(owner)}`}><PlayerAvatar player={owner} /></span>)}</span> : null}
            {onCell.length ? <span className="cell-tokens">{onCell.map((item) => <GamePlayerMark key={item.id} player={item} size="sm" />)}</span> : null}
          </article>;
        })}
        {!externalPanels ? <div className="central-panel">{overview}{turn}</div> : null}
      </div>
    </div></div>
    <div className="player-status" aria-label="Позиции игроков">{players.map((item) => <span key={item.id}><GamePlayerMark player={item} size="sm" /><strong>{gamePlayerName(item)}</strong> · {item.track === "FAST_TRACK" ? fastTrackCells[item.fastTrackPosition]?.label ?? "Вход на большой круг" : "Малый круг"}</span>)}</div>
  </section>;
}

function PlayerOverview({ snapshot, player }: { snapshot: GameSnapshot; player: GamePlayer }) {
  const world = readFastTrackWorld(snapshot.game.fastTrackWorld);
  const assets = purchasedFastTrackCells(player, world);
  const state = player.financialState;
  const income = state?.fastTrackIncomeCents ?? 0;
  const initial = state?.fastTrackStartIncomeCents ?? 0;
  const dream = fastTrackCells[player.dreamCellIndex ?? -1];
  const price = dream ? fastTrackPrice(dream, player.id, player.dreamCellIndex ?? null, world) : 0;
  return <section className="player-overview" aria-label={`Финансы большого круга: ${gamePlayerName(player)}`}>
    <div className="player-identity"><PlayerAvatar player={player} /><div><h3 className="player-name">{gamePlayerName(player)}</h3><p className="player-profession">{player.profession?.name ?? "Предприниматель"}</p></div></div>
    <dl className="player-metrics">
      <div><dt>Наличные</dt><dd>{money(state?.cashCents ?? 0)}</dd></div>
      <div><dt>Доход CASHFLOW</dt><dd>{money(income)}</dd></div>
      <div className="is-positive"><dt>Прирост дохода</dt><dd>{income >= initial ? "+" : "−"}{money(Math.abs(income - initial))}</dd></div>
    </dl>
    <div className="player-goal">
      <div className="player-goal-row"><span>Финансовая цель</span><strong>+{money(50_000)} к доходу</strong></div>
      <div className="player-goal-row"><span>Целевая мечта</span><strong>{dream ? `${dream.label} · ${money(price)}` : "Не выбрана"}</strong></div>
    </div>
    <section className="player-assets" aria-label="Активы большого круга">
      <h4 className="player-section-heading">Активы большого круга · {assets.length}</h4>
      {assets.length ? <div className="purchased-cards">{assets.map((cell) => <PurchasedCard key={cell.index} cell={cell} />)}</div> : <p className="empty-assets">Пока нет приобретённых карточек.</p>}
    </section>
  </section>;
}

function PurchasedCard({ cell }: { cell: FastTrackCell }) {
  const effect = fastTrackCellEffect(cell);
  return <article className={`purchased-card cell-${cell.type}`} aria-label={`Приобретено: ${cell.label}`}>
    <h5>{cell.label}</h5>
    <dl><div><dt>{cell.rule.kind === "dream" ? "Базовая стоимость" : "Стоимость"}</dt><dd>{money(cell.cost)}</dd></div>{effect ? <div><dt>Эффект</dt><dd>{effect}</dd></div> : null}</dl>
  </article>;
}
