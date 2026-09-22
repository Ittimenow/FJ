"use client";

import { fastTrackCells, fastTrackPrice, readFastTrackWorld, type FastTrackCell } from "@cashflow/shared";
import { BriefcaseBusiness, Dices, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { money } from "@/lib/format";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer, GameSnapshot } from "@/lib/types";
import { GameActionHistory } from "./game-action-history";
import { GamePlayerMark } from "./game-player-mark";
import { PlayerAvatar } from "./player-avatar";
import { OtherPlayersList } from "./other-players-list";
import { fastTrackCellEffect, purchasedFastTrackCells } from "./fast-track-presentation";
import { useBoardMovement } from "./use-board-movement";
import "./fast-track.css";

// The prototype's route is one continuous track with two lower transitions.
function cellPosition(index: number): CSSProperties {
  const columns = [4, 144, 264, 384, 504, 624, 744, 864, 984, 1124];
  const rows = [4, 108, 192, 276, 360, 444, 528, 632];
  const at = (x: number, y: number): CSSProperties => ({ left: `${x / 1240 * 100}%`, top: `${y / 714 * 100}%` });
  if (index < 4) return at(columns[4 - index]!, rows[1]!);
  if (index < 8) return at(columns[1]!, rows[index - 2]!);
  if (index < 11) return at(columns[index - 7]!, rows[6]!);
  if (index < 14) return at(columns[14 - index]!, 632);
  if (index < 20) return at(4, rows[20 - index]!);
  if (index < 28) return at(columns[index - 19]!, 4);
  if (index < 34) return at(1124, rows[index - 27]!);
  if (index < 37) return at(columns[42 - index]!, 632);
  if (index < 40) return at(columns[index - 31]!, rows[6]!);
  if (index < 44) return at(columns[8]!, rows[45 - index]!);
  return at(columns[52 - index]!, rows[1]!);
}

export function FastTrackBoard({ snapshot, player, diceAction, actions, history, phase, turnTabRequest = 0 }: {
  snapshot: GameSnapshot;
  player?: GamePlayer | undefined;
  diceAction?: ReactNode;
  actions?: ReactNode;
  history?: ReactNode;
  phase?: "ready" | "rolling" | "moving" | "landed";
  turnTabRequest?: number;
}) {
  const active = snapshot.players.find((item) => item.id === snapshot.game.currentPlayerId);
  const focusPlayer = player?.track === "FAST_TRACK" ? player : active?.track === "FAST_TRACK" ? active : snapshot.players.find((item) => item.track === "FAST_TRACK");
  const movement = useBoardMovement(snapshot, "FAST_TRACK", player?.id, phase);
  const followedPlayer = snapshot.players.find((item) => item.id === movement.movingPlayerId) ?? focusPlayer;
  const position = followedPlayer ? movement.positions.get(followedPlayer.id) ?? followedPlayer.fastTrackPosition ?? -1 : -1;
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [externalPanels, setExternalPanels] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"turn" | "player" | "assets">("turn");
  const tabId = useId();
  const pending = snapshot.game.pendingAction;
  const decisionId = pending?.type === "fast_track_choice" && pending.gamePlayerId === player?.id ? pending.decisionId : null;
  useEffect(() => {
    const fit = () => { if (root.current) setExternalPanels(root.current.clientWidth < 1264); };
    const media = window.matchMedia("(max-width: 1023px)");
    const updateMobile = () => setMobile(media.matches);
    fit();
    updateMobile();
    media.addEventListener("change", updateMobile);
    const observer = new ResizeObserver(fit);
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); media.removeEventListener("change", updateMobile); };
  }, []);
  useEffect(() => { if (decisionId || phase === "rolling") setActiveTab("turn"); }, [decisionId, phase]);
  useEffect(() => { if (turnTabRequest > 0) setActiveTab("turn"); }, [turnTabRequest]);
  useEffect(() => {
    const container = viewport.current;
    const cell = container?.querySelector<HTMLElement>(`[data-fast-cell="${Math.max(0, position)}"]`);
    if (!externalPanels || !container || !cell) return;
    container.scrollTo({
      left: cell.offsetLeft - container.clientWidth / 2 + cell.clientWidth / 2,
      top: cell.offsetTop - container.clientHeight / 2 + cell.clientHeight / 2,
      behavior: "instant"
    });
  }, [position, followedPlayer?.id, externalPanels, mobile]);
  const world = readFastTrackWorld(snapshot.game.fastTrackWorld);
  const players = snapshot.players.filter((item) => item.role === "PLAYER" && item.status === "JOINED");
  const overview = focusPlayer ? <PlayerOverview snapshot={snapshot} player={focusPlayer} mobile={mobile} /> : <p className="turn-waiting">На большом круге пока нет игроков.</p>;
  const turn = <section className="turn-activity" aria-label="Ход и история игроков">
    {!mobile ? diceAction : null}
    {actions ?? <p className="turn-waiting">{snapshot.game.status === "ENDED" ? "Партия завершена" : snapshot.game.status === "PAUSED" ? "Партия на паузе" : `Ходит: ${gamePlayerName(active)}`}</p>}
    {history ?? <GameActionHistory key={snapshot.game.id} gameId={snapshot.game.id} events={snapshot.events} players={snapshot.players} fastTrackOnly />}
  </section>;
  const tabs = [
    { id: "turn", label: "Ход", icon: Dices },
    { id: "player", label: "Игрок", icon: UserRound },
    { id: "assets", label: "Активы", icon: BriefcaseBusiness }
  ] as const;
  const assetCount = focusPlayer ? purchasedFastTrackCells(focusPlayer, world).length : 0;

  return <section ref={root} className={`fast-track${externalPanels ? " scroll-board" : ""}`} aria-label="Поле большого круга" data-moving-player={movement.movingPlayerId ?? undefined}>
    {mobile ? <div className="fast-track-mobile">
      <FastTrackTimeline players={players} positions={movement.positions} position={position} followedPlayerId={followedPlayer?.id} movingPlayerId={movement.movingPlayerId} currentPlayerId={snapshot.game.currentPlayerId} />
      <section className="fast-track-tabs" aria-label="Большой круг: ход, игрок и активы">
        <div className="fast-track-tablist" role="tablist" aria-label="Информация об игроке">
          {tabs.map((tab, index) => <button key={tab.id} type="button" id={`${tabId}-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`${tabId}-${tab.id}-panel`} tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => {
              const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
              if (nextIndex === null) return;
              event.preventDefault();
              const next = tabs[nextIndex]!;
              setActiveTab(next.id);
              document.getElementById(`${tabId}-${next.id}`)?.focus();
            }}>
            <tab.icon size={17} aria-hidden="true" /><span>{tab.label}</span>
            {tab.id === "assets" ? <span className="fast-track-tab-count">{assetCount}</span> : null}
            {tab.id === "turn" && decisionId ? <span className="fast-track-tab-attention" aria-label="Требуется действие" /> : null}
          </button>)}
        </div>
        <div id={`${tabId}-turn-panel`} role="tabpanel" aria-labelledby={`${tabId}-turn`} hidden={activeTab !== "turn"} tabIndex={0} className="fast-track-tab-panel">{turn}</div>
        <div id={`${tabId}-player-panel`} role="tabpanel" aria-labelledby={`${tabId}-player`} hidden={activeTab !== "player"} tabIndex={0} className="fast-track-tab-panel">{overview}</div>
        <div id={`${tabId}-assets-panel`} role="tabpanel" aria-labelledby={`${tabId}-assets`} hidden={activeTab !== "assets"} tabIndex={0} className="fast-track-tab-panel">
          {focusPlayer ? <PlayerAssets snapshot={snapshot} player={focusPlayer} /> : <p className="empty-assets">На большом круге пока нет игроков.</p>}
        </div>
      </section>
    </div> : externalPanels ? <div className="mobile-controls">{overview}{turn}</div> : null}
    {!mobile ? <div className="board-shell"><div className="board-scroll" ref={viewport} tabIndex={0} aria-label="Маршрут большого круга, прокручиваемая область">
      <div className="board board-classic">
        <svg className="classic-route" viewBox="0 0 1240 714" preserveAspectRatio="none" aria-hidden="true"><path className="classic-route-line" vectorEffect="non-scaling-stroke" d="M 620 147 H 200 V 567 H 440 V 671 H 92 Q 60 671 60 639 V 75 Q 60 43 92 43 H 1148 Q 1180 43 1180 75 V 639 Q 1180 671 1148 671 H 800 V 567 H 1040 V 147 H 620" /></svg>
        <span className="classic-start-label">СТАРТ</span>
        <span className="fast-track-start-tokens">{players.filter((item) => item.track === "FAST_TRACK" && (movement.positions.get(item.id) ?? item.fastTrackPosition ?? -1) < 0).map((item) => <GamePlayerMark key={item.id} player={item} size="sm" />)}</span>
        {fastTrackCells.map((cell) => {
          const onCell = players.filter((item) => item.track === "FAST_TRACK" && (movement.positions.get(item.id) ?? item.fastTrackPosition) === cell.index);
          const owners = snapshot.players.filter((item) => world.owners[cell.index] === item.id || world.dreamPurchases[cell.index]?.includes(item.id)
            || (cell.rule.kind === "charity" && item.financialState?.fastTrackCharity));
          const price = focusPlayer ? fastTrackPrice(cell, focusPlayer.id, focusPlayer.dreamCellIndex ?? null, world) : cell.cost;
          const effect = fastTrackCellEffect(cell);
          return <article key={cell.index} className={`board-cell cell-${cell.type}`} style={cellPosition(cell.index)} data-fast-cell={cell.index} aria-label={cell.label}>
            <h3 className="cell-title">{cell.label}</h3>
            {cell.cost > 0 ? <span className="cell-price">{money(price)}</span> : null}
            {effect ? <span className="cell-effect">{effect}</span> : null}
            {owners.length ? <span className="cell-owner">{owners.map((owner) => <span key={owner.id} role="img" aria-label={`${cell.rule.kind === "ipo" ? "Закрыто" : "Владелец"}: ${gamePlayerName(owner)}`}><PlayerAvatar player={owner} /></span>)}</span> : null}
            {onCell.length ? <span className="cell-tokens">{onCell.map((item) => <GamePlayerMark key={item.id} player={item} size="sm" className={movement.movingPlayerId === item.id ? "timeline-moving-token" : ""} />)}</span> : null}
          </article>;
        })}
        {!externalPanels && !mobile ? <div className="central-panel">{overview}{turn}</div> : null}
      </div>
    </div></div> : null}
  </section>;
}

function FastTrackTimeline({ players, positions, position, followedPlayerId, movingPlayerId, currentPlayerId }: {
  players: GamePlayer[];
  positions: Map<string, number>;
  position: number;
  followedPlayerId: string | undefined;
  movingPlayerId: string | null;
  currentPlayerId: string | null;
}) {
  const viewport = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const container = viewport.current;
    const cell = container?.querySelector<HTMLElement>(`[data-fast-timeline-cell="${position}"]`);
    if (!container || !cell) return;
    container.scrollTo({ left: cell.offsetLeft - container.clientWidth / 2 + cell.clientWidth / 2, behavior: "instant" });
  }, [position, followedPlayerId]);
  const cells = [{ index: -1, label: "Старт", type: "start" }, ...fastTrackCells];
  return <ol ref={viewport} className="fast-track-timeline" aria-label="Ячейки большого круга и позиции игроков" tabIndex={0}>
    {cells.map((cell) => {
      const occupants = players.filter((item) => item.track === "FAST_TRACK" && (positions.get(item.id) ?? item.fastTrackPosition ?? -1) === cell.index);
      const label = cell.index < 0 ? "Старт" : `Клетка ${cell.index + 1}: ${cell.label}`;
      return <li key={cell.index} className={`fast-track-timeline-cell timeline-${cell.type}`} data-fast-timeline-cell={cell.index} aria-current={position === cell.index ? "location" : undefined} aria-label={`${label}${occupants.length ? ` — ${occupants.map(gamePlayerName).join(", ")}` : ""}`} title={label}>
        <span className="fast-track-timeline-number">{cell.index < 0 ? "Старт" : cell.index + 1}</span>
        <span className="fast-track-timeline-line" aria-hidden="true"><span /></span>
        <span className="fast-track-timeline-players">{occupants.map((item) => <GamePlayerMark key={item.id} player={item} size="sm" active={item.id === currentPlayerId} className={item.id === movingPlayerId ? "timeline-moving-token" : ""} />)}</span>
      </li>;
    })}
  </ol>;
}

function PlayerOverview({ snapshot, player, mobile }: { snapshot: GameSnapshot; player: GamePlayer; mobile: boolean }) {
  const world = readFastTrackWorld(snapshot.game.fastTrackWorld);
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
      {mobile ? <><h4 className="player-section-heading">Цель игры</h4><p className="player-goal-summary">Для победы купите свою мечту или увеличьте доход CASHFLOW на {money(50_000)}.</p></> : null}
      <div className="player-goal-row"><span>Финансовая цель</span><strong>+{money(50_000)} к доходу</strong></div>
      {mobile ? <>
        <div className="player-goal-row"><span>Начальный доход</span><strong>{money(initial)}</strong></div>
        <div className="player-goal-row"><span>Осталось до цели</span><strong>{money(Math.max(0, initial + 50_000 - income))}</strong></div>
      </> : null}
      <div className="player-goal-row"><span>Целевая мечта</span><strong>{dream ? `${dream.label} · ${money(price)}` : "Не выбрана"}</strong></div>
      {mobile && dream ? <p className="player-goal-summary">{dream.description}</p> : null}
    </div>
    {mobile ? <div className="player-goal">
      <div className="player-goal-row"><span>Позиция</span><strong>{(player.fastTrackPosition ?? -1) < 0 ? "Старт" : `Клетка ${player.fastTrackPosition! + 1} · ${fastTrackCells[player.fastTrackPosition!]?.label}`}</strong></div>
      <div className="player-goal-row"><span>Благотворительность</span><strong>{state?.fastTrackCharity ? "Активна · 1–3 кубика" : "Не оплачена · 2 кубика"}</strong></div>
    </div> : <PlayerAssets snapshot={snapshot} player={player} />}
    <OtherPlayersList className="mt-4 border-t border-line/70 pt-4" players={snapshot.players.filter((other) => other.role === "PLAYER" && other.id !== player.id)} currentPlayerId={snapshot.game.currentPlayerId} />
  </section>;
}

function PlayerAssets({ snapshot, player }: { snapshot: GameSnapshot; player: GamePlayer }) {
  const assets = purchasedFastTrackCells(player, readFastTrackWorld(snapshot.game.fastTrackWorld));
  return <section className="player-assets" aria-label="Активы большого круга">
      <h4 className="player-section-heading">Активы большого круга · {assets.length}</h4>
      {assets.length ? <div className="purchased-cards">{assets.map((cell) => <PurchasedCard key={cell.index} cell={cell} />)}</div> : <p className="empty-assets">Пока нет приобретённых карточек.</p>}
  </section>;
}

function PurchasedCard({ cell }: { cell: FastTrackCell }) {
  const effect = fastTrackCellEffect(cell);
  return <article className={`purchased-card cell-${cell.type}`} aria-label={`Приобретено: ${cell.label}`}>
    <h5>{cell.label}</h5>
    <dl><div><dt>{cell.rule.kind === "dream" ? "Базовая стоимость" : "Стоимость"}</dt><dd>{money(cell.cost)}</dd></div>{effect ? <div><dt>Эффект</dt><dd>{effect}</dd></div> : null}</dl>
  </article>;
}
