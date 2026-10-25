"use client";

import { fastTrackCells, ratRaceBoard } from "@cashflow/shared";
import { ArrowRight, Baby, Banknote, BriefcaseBusiness, ChevronDown, Heart, Map, ShoppingBag, Sparkles, TrendingUp, Unplug } from "lucide-react";
import { useState } from "react";
import "./board-preview.css";

type Track = "small" | "fast";

const smallIcons = { paycheck: Banknote, deal: BriefcaseBusiness, market: TrendingUp, doodad: ShoppingBag, charity: Heart, baby: Baby, downsized: Unplug };
const fastIcons = { business: BriefcaseBusiness, dream: Sparkles, expense: ShoppingBag, positive: Heart };
const positions = { small: 20, fast: 43 };

function coordinates(index: number, side: number) {
  if (index < side) return { x: side - 1 - index, y: 0 };
  if (index < side * 2 - 1) return { x: 0, y: index - side + 1 };
  if (index < side * 3 - 2) return { x: index - side * 2 + 2, y: side - 1 };
  return { x: side - 1, y: side * 4 - 4 - index };
}

export function BoardPreview() {
  const [track, setTrack] = useState<Track>("small");
  const [playerPosition, setPlayerPosition] = useState(positions.small);
  const [target, setTarget] = useState<number | null>(1);
  const cells = track === "small" ? ratRaceBoard : fastTrackCells;
  const side = track === "small" ? 7 : 13;
  const steps = target === null ? 0 : (target - playerPosition + cells.length) % cells.length;
  const selected = target === null ? null : cells[target];
  const nearby = Array.from({ length: 8 }, (_, offset) => cells[(playerPosition + offset) % cells.length]!);
  const selectTrack = (next: Track) => {
    setTrack(next);
    setPlayerPosition(positions[next]);
    setTarget(next === "small" ? 1 : 2);
  };

  return <main className="board-preview-page">
    <div className="board-preview-wrap">
      <header className="board-preview-header">
        <a href="/design-preview" className="board-preview-back">← Другие примеры интерфейса</a>
        <h1>Маршрут на телефоне</h1>
        <p>В обычном ходе видно ближайшие клетки. Весь круг открывается, когда нужно найти дальнюю цель.</p>
        <div className="board-preview-switch" role="group" aria-label="Выбрать круг">
          <button type="button" aria-pressed={track === "small"} onClick={() => selectTrack("small")}>Малый круг · 24 клетки</button>
          <button type="button" aria-pressed={track === "fast"} onClick={() => selectTrack("fast")}>Большой круг · 48 клеток</button>
        </div>
      </header>

      <div className="board-preview-layout">
        <section className="board-preview-compact" aria-label="Ближайшие клетки">
          <div className="board-preview-compact-heading"><span>Вы здесь · клетка {playerPosition + 1}</span><span>Направление хода <ArrowRight size={15} aria-hidden="true" /></span></div>
          <div className="board-preview-nearby" aria-label="Ближайшие клетки">
            {nearby.map((cell, offset) => {
              const Icon = track === "small" ? smallIcons[(cell as typeof ratRaceBoard[number]).type] : fastIcons[(cell as typeof fastTrackCells[number]).type];
              return <button key={cell.index} type="button" className={`board-preview-nearby-cell board-preview-cell--${cell.type}${offset === 0 ? " is-current" : ""}${cell.index === target ? " is-target" : ""}`} onClick={() => setTarget(cell.index)} aria-pressed={cell.index === target} aria-label={`${offset === 0 ? "Вы здесь" : `Через ${offset} шагов`}: клетка ${cell.index + 1}, ${cell.label}`}>
                <span className="board-preview-nearby-number">{cell.index + 1}</span><Icon size={22} strokeWidth={2.1} aria-hidden="true" />
                {offset === 0 ? <img className="board-preview-nearby-token" src="/figurines/rubber-duck.webp" alt="" /> : <span className="board-preview-nearby-steps">+{offset}</span>}
              </button>;
            })}
          </div>
          <p className="board-preview-nearby-caption">Листайте вправо, чтобы посмотреть ближайшие клетки. Коснитесь клетки для расстояния.</p>
        </section>

        <div className="board-preview-distance" aria-live="polite"><span><small>{selected ? "До выбранной клетки" : "Сейчас"}</small><strong>{selected ? `${steps} ${steps % 10 === 1 && steps % 100 !== 11 ? "шаг" : steps % 10 >= 2 && steps % 10 <= 4 && (steps % 100 < 12 || steps % 100 > 14) ? "шага" : "шагов"}` : "Вы здесь"}</strong><em>{selected ? `№ ${selected.index + 1} · ${selected.label}` : `№ ${playerPosition + 1} · ${cells[playerPosition]?.label}`}</em></span><button type="button" disabled={target === null || target === playerPosition} onClick={() => { if (target !== null) { setPlayerPosition(target); setTarget(null); } }}>Переместить фишку <ArrowRight size={16} /></button></div>

        <details className="board-preview-full">
          <summary><Map size={18} aria-hidden="true" /><span>Открыть весь круг</span><ChevronDown size={18} className="board-preview-chevron" aria-hidden="true" /></summary>
          <p>Выберите любую клетку. Синий цвет покажет путь от фишки, оранжевый — цель.</p>
          <div className="board-preview-scroll" tabIndex={0} aria-label="Прокручиваемое игровое поле">
            <div className={`board-preview-grid board-preview-grid--${track}`} style={{ gridTemplateColumns: `repeat(${side}, var(--preview-cell))`, gridTemplateRows: `repeat(${side}, var(--preview-cell))` }}>
              <div className="board-preview-center" style={{ gridColumn: `2 / ${side}`, gridRow: `2 / ${side}` }}>
                <strong>{track === "small" ? "Малый круг" : "Большой круг"}</strong>
                <span>Движение по контуру<br />в порядке номеров клеток</span>
              </div>
              {cells.map((cell) => {
                const { x, y } = coordinates(cell.index, side);
                const isCurrent = cell.index === playerPosition;
                const onRoute = target !== null && steps > 0 && (cell.index - playerPosition + cells.length) % cells.length <= steps && !isCurrent;
                const isTarget = cell.index === target;
                const Icon = track === "small" ? smallIcons[(cell as typeof ratRaceBoard[number]).type] : fastIcons[(cell as typeof fastTrackCells[number]).type];
                return <button key={cell.index} type="button" className={`board-preview-cell board-preview-cell--${cell.type}${isCurrent ? " is-current" : ""}${onRoute ? " is-route" : ""}${isTarget ? " is-target" : ""}`} style={{ gridColumn: x + 1, gridRow: y + 1 }} onClick={() => setTarget(cell.index)} aria-label={`Клетка ${cell.index + 1}: ${cell.label}${isCurrent ? ", вы здесь" : ""}`} aria-pressed={isTarget}>
                  <span className="board-preview-cell-number">{cell.index + 1}</span>
                  <Icon size={track === "small" ? 19 : 16} strokeWidth={2.2} aria-hidden="true" />
                  {isCurrent ? <span className="board-preview-player"><img src="/figurines/rubber-duck.webp" alt="" /></span> : null}
                </button>;
              })}
            </div>
          </div>
        </details>
        <p className="board-preview-demo">Пример не подключён к текущей партии. Число шагов не предсказывает результат броска.</p>
      </div>
    </div>
  </main>;
}
