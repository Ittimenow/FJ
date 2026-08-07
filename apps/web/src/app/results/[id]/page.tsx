import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { money } from "@/lib/format";
import { publicResult } from "@/lib/results";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await publicResult(id);
  if (!result) return { title: "Итоги игры не найдены" };
  return {
    title: `${result.headline} — Финансовое путешествие`,
    description: result.facts.highlights[0]?.text ?? "Итоги завершённой финансовой игры.",
    openGraph: { images: [`/results/${id}/opengraph-image`] },
    twitter: { card: "summary_large_image", images: [`/results/${id}/opengraph-image`] }
  };
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const result = await publicResult(id);
  if (!result) notFound();
  const facts = result.facts;
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/"><BrandLogo markClassName="h-11 w-11" textClassName="text-[13px]" /></Link>
        <Link href={"/results" as Route} className="inline-flex min-h-11 items-center gap-2 font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
          <ArrowLeft size={17} aria-hidden="true" /> Все результаты
        </Link>
      </header>

      <article className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <div>
            <div className="flex flex-wrap gap-2 text-sm font-bold text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2"><CalendarDays size={15} aria-hidden="true" />{date(facts.endedAt)}</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2"><UsersRound size={15} aria-hidden="true" />{facts.players.length} игроков</span>
              {facts.durationMinutes ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2"><Clock3 size={15} aria-hidden="true" />{duration(facts.durationMinutes)}</span> : null}
            </div>
            <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">{result.headline}</h1>
            <div className="mt-7 whitespace-pre-line text-base leading-8 text-muted">{result.body}</div>
          </div>
          <img src={result.imageUrl} alt={`Карточка результатов игры «${facts.title}»`} className="w-full rounded-2xl shadow-[0_24px_50px_rgba(27,57,118,.16)]" />
        </div>

        {facts.highlights.length ? (
          <section className="mt-12 rounded-2xl bg-ink p-6 text-white shadow-panel sm:p-8">
            <h2 className="text-2xl font-extrabold">Поворотные моменты</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {facts.highlights.map((highlight) => <li key={`${highlight.kind}-${highlight.playerId}`} className="rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/80">{highlight.text}</li>)}
            </ul>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em]">Финал игроков</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {facts.players.map((player) => (
              <div key={player.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-2xl bg-white p-5 shadow-panel">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e8effe] text-lg font-extrabold text-journey">{initials(player.name)}</span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold">{mention(player.mention)}</h3>
                  <p className="mt-1 text-sm text-muted">{player.profession ?? "Профессия не указана"}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Metric icon={TrendingUp} label="Денежный поток" value={`${money(player.finalCashflowCents)}/мес`} />
                    <Metric icon={WalletCards} label="Пассивный доход" value={`${money(player.finalPassiveIncomeCents)}/мес`} />
                  </dl>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return <div><dt className="flex items-center gap-1.5 text-xs text-muted"><Icon size={14} aria-hidden="true" />{label}</dt><dd className="mt-1 font-extrabold text-ink">{value}</dd></div>;
}

function mention(value: string) {
  return value.startsWith("@")
    ? <a className="text-journey hover:underline" href={`https://t.me/${value.slice(1)}`}>{value}</a>
    : value;
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "И";
}

function date(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} ч${rest ? ` ${rest} мин` : ""}` : `${rest} мин`;
}
