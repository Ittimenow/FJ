"use client";

import { fastTrackCells, fastTrackOwner, fastTrackWinningIncrease, readFastTrackWorld } from "@cashflow/shared";
import { ArrowLeft, Baby, BriefcaseBusiness, CalendarClock, Target, TrendingUp, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { GamePlayerMark } from "@/components/game/game-player-mark";
import { AwardCards } from "@/components/results/award-cards";
import { gameEndPresentation } from "@/components/game/game-end-result";
import { gamePlayerName } from "@/lib/game-player";
import { money } from "@/lib/format";
import type { FinancialState, GamePlayer, GameResultsResponse, PlayerAsset } from "@/lib/types";

type PlayerResult = GameResultsResponse["playerResults"][number];
type AssetLine = { id: string; name: string; detail: string };

export function GameResultsPage({ results, viewerId }: { results: GameResultsResponse; viewerId: string | null }) {
  const [view, setView] = useState<"game" | "mine">("game");
  const winner = results.players.find((player) => player.id === results.winnerId);
  const viewer = results.players.find((player) => player.id === viewerId);
  const canViewMine = Boolean(viewer && viewer.id !== winner?.id);
  const winnerResult = results.playerResults.find((item) => item.playerId === winner?.id);
  const viewerResult = results.playerResults.find((item) => item.playerId === viewer?.id);
  const world = readFastTrackWorld(results.game.fastTrackWorld);
  const winnerAwards = results.awards.filter((award) => award.playerId === winner?.id);
  const otherAwards = results.awards.filter((award) => award.playerId !== winner?.id);
  const presentation = gameEndPresentation({ reason: results.reason, winnerName: winner ? gamePlayerName(winner) : null });
  const gameHref = `/games/${results.game.id}?view=game`;

  return (
    <main className="min-h-screen bg-canvas px-4 pb-20 pt-6 text-ink sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={gameHref as Route} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-journey shadow-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
            <ArrowLeft size={17} aria-hidden="true" /> Вернуться к игре
          </Link>
          <p className="text-sm font-semibold text-muted">{results.game.title}</p>
        </div>

        {canViewMine ? (
          <div className="mt-7 inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-white p-1.5 shadow-panel" aria-label="Чьи результаты показать">
            <button type="button" aria-pressed={view === "game"} onClick={() => setView("game")}
              className={`min-h-11 rounded-xl px-4 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 ${view === "game" ? "bg-journey text-white" : "text-journey hover:bg-canvas"}`}>
              Итоги партии
            </button>
            <button type="button" aria-pressed={view === "mine"} onClick={() => setView("mine")}
              className={`min-h-11 rounded-xl px-4 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 ${view === "mine" ? "bg-journey text-white" : "text-journey hover:bg-canvas"}`}>
              Посмотреть свои результаты
            </button>
          </div>
        ) : null}

        {view === "mine" && canViewMine && viewer && viewerResult ? (
          <div className="mt-8 space-y-8">
            <PlayerHeading title="Ваши результаты" player={viewer} description="Ваш путь в завершённой партии" />
            <Turns result={viewerResult} />
            {viewer.track === "FAST_TRACK" ? (
              <CircleSection title="Ваш результат на большом круге" state={viewer.financialState} assets={fastAssets(viewer, world)} big />
            ) : null}
            {viewerResult.entry ? <CircleSection title="Ваш выход на большой круг" state={viewerResult.entry.financialState} assets={smallAssets(viewerResult.entry.assets)} /> : null}
            {viewer.track !== "FAST_TRACK" ? <CircleSection title="Ваш финансовый итог на малом круге" state={viewer.financialState} assets={smallAssets(viewer.assets)} /> : null}
            <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-7" aria-labelledby="life-events-heading">
              <h2 id="life-events-heading" className="text-2xl font-extrabold">События вашего пути</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <Metric label="Детей к концу партии" value={String(viewer.financialState?.childrenCount ?? 0)} icon={Baby} />
                <Metric label="Рождений за игру" value={String(viewerResult.childrenBorn)} icon={Baby} />
                <Metric label="Увольнений" value={String(viewerResult.dismissals)} icon={BriefcaseBusiness} />
              </dl>
            </section>
            <Awards title="Ваши награды" awards={results.awards.filter((award) => award.playerId === viewer.id)} />
          </div>
        ) : (
          <div className="mt-8 space-y-9">
            {winner && winnerResult ? (
              <>
                <section className="overflow-hidden rounded-[26px] bg-ink text-white shadow-[0_24px_55px_rgba(23,36,63,.18)]" aria-labelledby="winner-heading">
                  <div className="grid gap-7 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(220px,.42fr)] lg:items-center">
                    <div>
                      <div className="flex items-center gap-4"><GamePlayerMark player={winner} size="lg" /><span className="text-sm font-bold text-white/75">Победитель партии</span></div>
                      <h1 id="winner-heading" className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.035em] sm:text-5xl">{gamePlayerName(winner)}</h1>
                      <p className="mt-3 text-lg font-semibold text-white/85">{victoryText(results.reason, winner)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                      <HeroNumber label="Ходов за игру" value={winnerResult.totalTurns} />
                      {winner.track === "FAST_TRACK" ? <HeroNumber label="Ходов на большом круге" value={winnerResult.bigCircleTurns} /> : null}
                    </div>
                  </div>
                  {results.reason === "dream" && winner.dreamCellIndex != null ? (
                    <div className="flex flex-col gap-4 bg-[#fff4f7] p-5 text-ink sm:flex-row sm:items-center sm:p-7">
                      <img src={`/dreams/${winner.dreamCellIndex}.webp`} alt={`Мечта «${fastTrackCells[winner.dreamCellIndex]?.label ?? ""}»`} className="aspect-[3/2] w-full rounded-xl object-cover sm:w-52" />
                      <div><div className="flex items-center gap-2 text-sm font-bold text-[#8e4762]"><Target size={17} aria-hidden="true" /> Мечта исполнена</div><p className="mt-2 text-xl font-extrabold">{fastTrackCells[winner.dreamCellIndex]?.label}</p></div>
                    </div>
                  ) : results.reason === "fast_track_income" && winner.financialState ? (
                    <div className="bg-[#edf6e9] px-6 py-5 text-[#31543c] sm:px-9">
                      <p className="text-sm font-bold">Победа доходом</p>
                      <p className="mt-1 text-xl font-extrabold">Доход вырос на {money((winner.financialState.fastTrackIncomeCents ?? 0) - (winner.financialState.fastTrackStartIncomeCents ?? 0))} в месяц</p>
                      <p className="mt-1 text-sm">Цель: прирост {money(fastTrackWinningIncrease)} в месяц</p>
                    </div>
                  ) : null}
                </section>
                {winner.track === "FAST_TRACK" ? (
                  <CircleSection title="Результат на большом круге" state={winner.financialState} assets={fastAssets(winner, world)} big />
                ) : (
                  <CircleSection title="Финансовый итог победителя" state={winner.financialState} assets={smallAssets(winner.assets)} />
                )}
                {winnerResult.entry ? (
                  <section aria-labelledby="entry-heading" className="space-y-5">
                    <div><h2 id="entry-heading" className="text-2xl font-extrabold sm:text-3xl">Выход на большой круг</h2><p className="mt-1 text-sm text-muted">После {winnerResult.smallCircleTurns} ходов на малом круге</p></div>
                    <FinancialDetails state={winnerResult.entry.financialState} big={false} />
                    <Assets title="Активы малого круга при выходе" items={smallAssets(winnerResult.entry.assets)} />
                  </section>
                ) : null}
                <Awards title="Награды победителя" awards={winnerAwards} />
              </>
            ) : (
              <section className="rounded-[26px] bg-ink p-7 text-white sm:p-10">
                <h1 className="text-4xl font-extrabold tracking-[-0.035em]">{presentation.title}</h1>
                {presentation.description ? <p className="mt-3 text-lg text-white/80">{presentation.description}</p> : null}
              </section>
            )}
            <Awards title={winner ? "Награды других игроков" : "Награды игроков"} awards={otherAwards} />
          </div>
        )}
      </div>
    </main>
  );
}

function victoryText(reason: string | null, winner: GamePlayer) {
  if (reason === "dream") return "Победа через исполнение мечты";
  if (reason === "fast_track_income") return "Победа благодаря росту дохода";
  if (reason === "bots_eliminated") return "Все виртуальные соперники выбыли";
  if (winner.track === "RAT_RACE") return "Финансовая свобода на малом круге";
  return "Победа на большом круге";
}

function HeroNumber({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white/10 px-4 py-3"><p className="text-xs font-bold text-white/75">{label}</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p></div>;
}

function PlayerHeading({ title, player, description }: { title: string; player: GamePlayer; description: string }) {
  return <header className="flex items-center gap-4"><GamePlayerMark player={player} size="lg" /><div><h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{title}</h1><p className="mt-1 text-sm text-muted">{gamePlayerName(player)} · {description}</p></div></header>;
}

function Turns({ result }: { result: PlayerResult }) {
  return <dl aria-label="Ходы игрока" className="grid gap-3 sm:grid-cols-3"><Metric label="Ходов за игру" value={String(result.totalTurns)} icon={CalendarClock} /><Metric label="На малом круге" value={String(result.smallCircleTurns)} icon={CalendarClock} /><Metric label="На большом круге" value={String(result.bigCircleTurns)} icon={CalendarClock} /></dl>;
}

function CircleSection({ title, state, assets, big = false }: { title: string; state: FinancialState | null; assets: AssetLine[]; big?: boolean }) {
  return <section className="space-y-5" aria-label={title}><h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>{state ? <FinancialDetails state={state} big={big} /> : <p className="text-muted">Финансовые данные недоступны.</p>}<Assets title={big ? "Активы большого круга" : "Активы малого круга"} items={assets} /></section>;
}

function FinancialDetails({ state, big }: { state: FinancialState; big: boolean }) {
  const metrics = big ? [
    { label: "Доход большого круга", value: `${money(state.fastTrackIncomeCents ?? 0)}/мес`, icon: TrendingUp },
    { label: "Прирост дохода", value: `${money((state.fastTrackIncomeCents ?? 0) - (state.fastTrackStartIncomeCents ?? 0))}/мес`, icon: TrendingUp },
    { label: "Наличные", value: money(state.cashCents), icon: Wallet }
  ] : [
    { label: "Пассивный доход", value: `${money(state.passiveIncomeCents)}/мес`, icon: TrendingUp },
    { label: "Расходы", value: `${money(state.totalExpensesCents)}/мес`, icon: Wallet },
    { label: "Денежный поток", value: `${money(state.monthlyCashflowCents)}/мес`, icon: TrendingUp },
    { label: "Наличные", value: money(state.cashCents), icon: Wallet }
  ];
  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</dl>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return <div className="min-w-0 rounded-2xl bg-white px-5 py-4 shadow-panel"><dt className="flex items-center gap-2 text-sm font-semibold text-muted"><Icon size={16} aria-hidden="true" />{label}</dt><dd className="mt-3 break-words text-xl font-extrabold tabular-nums sm:text-2xl">{value}</dd></div>;
}

function Assets({ title, items }: { title: string; items: AssetLine[] }) {
  return <div className="rounded-2xl bg-[#fff9f1] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-extrabold">{title}</h3><span className="text-sm font-bold text-muted">{items.length} шт.</span></div>{items.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{items.map((asset) => <li key={asset.id} className="min-w-0 rounded-xl bg-white px-4 py-3"><strong className="block truncate text-sm" title={asset.name}>{asset.name}</strong><span className="mt-1 block text-xs text-muted">{asset.detail}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Нет активов.</p>}</div>;
}

function Awards({ title, awards }: { title: string; awards: GameResultsResponse["awards"] }) {
  return <section className="space-y-4" aria-label={title}><h2 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl"><Trophy size={24} className="text-[#947414]" aria-hidden="true" />{title}</h2>{awards.length ? <AwardCards awards={awards} /> : <p className="rounded-xl bg-white px-5 py-4 text-sm text-muted">В этой партии наград нет.</p>}</section>;
}

function smallAssets(assets: PlayerAsset[]): AssetLine[] {
  return assets.map((asset) => ({ id: asset.id, name: asset.name, detail: asset.cashflowCents ? `${money(asset.cashflowCents)}/мес` : asset.quantity > 1 ? `${asset.quantity} шт.` : "Без денежного потока" }));
}

function fastAssets(player: GamePlayer, world: ReturnType<typeof readFastTrackWorld>): AssetLine[] {
  return fastTrackCells.filter((cell) => fastTrackOwner(cell, world) === player.id || (cell.rule.kind === "charity" && player.financialState?.fastTrackCharity))
    .map((cell) => ({ id: String(cell.index), name: cell.label, detail: cell.income ? `+${money(cell.income)}/мес` : cell.rule.kind === "dream" ? "Исполненная мечта" : cell.rule.kind === "charity" ? "Благотворительность" : "Приобретено" }));
}
