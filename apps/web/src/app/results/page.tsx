import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, UsersRound } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { publicResults } from "@/lib/results";

export const metadata: Metadata = {
  title: "Итоги игр — Финансовое путешествие",
  description: "Результаты завершённых партий, ключевые решения и финансовые повороты игроков."
};

export default async function ResultsPage() {
  const results = await publicResults();
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Финансовое путешествие — на главную">
          <BrandLogo markClassName="h-11 w-11" textClassName="text-[13px]" />
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
          <ArrowLeft size={17} aria-hidden="true" /> На главную
        </Link>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <div className="max-w-3xl">
          <h1 className="text-balance text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">Истории завершённых игр</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Не рейтинги, а финансовые маршруты: ключевые решения, поворотные события и результаты, собранные из журнала каждой партии.
          </p>
        </div>
        {results.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => (
              <Link key={result.id} href={result.pageUrl as Route} className="group overflow-hidden rounded-2xl bg-white shadow-panel transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(27,57,118,.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
                <img src={result.imageUrl} alt="" className="aspect-[1200/630] w-full object-cover" />
                <div className="p-5">
                  <div className="flex flex-wrap gap-3 text-xs font-bold text-muted">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" />{date(result.facts.endedAt)}</span>
                    <span className="inline-flex items-center gap-1.5"><UsersRound size={14} aria-hidden="true" />{result.facts.players.length} игроков</span>
                  </div>
                  <h2 className="mt-3 text-xl font-extrabold leading-6 tracking-[-0.025em] group-hover:text-journey">{result.headline}</h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{result.facts.highlights[0]?.text ?? "Главные решения и результаты партии."}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl bg-white p-7 shadow-panel">
            <h2 className="text-xl font-extrabold">Первые результаты скоро появятся</h2>
            <p className="mt-2 text-sm leading-6 text-muted">После завершения и публикации следующей игры её карточка будет доступна здесь.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function date(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
