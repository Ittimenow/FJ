import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArrowLeft, BookOpenText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import { extractMarkdownHeadings, renderMarkdown } from "@/lib/markdown";
import type { ProfileResponse } from "@/lib/types";
import { GuideToc } from "./guide-toc";

export const metadata: Metadata = {
  title: "Правила игры «Финансовое путешествие»",
  description: "Правила финансовой игры «Финансовое путешествие» по мотивам CASHFLOW",
  alternates: { canonical: "/guide" }
};

export default async function GuidePage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string | string[]; gameType?: string | string[] }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const gameType = params.gameType === "202" ? "202" : "101";
  const returnTo = safeReturnTo(params.returnTo);
  const markdown = (await readRules(gameType)).replace(
    /\]\(game-202-rules\.md\)/g,
    `](/guide?gameType=202&returnTo=${encodeURIComponent(returnTo)})`
  );
  const profile = session?.accessToken
    ? await apiFetch<ProfileResponse>("/users/me", session.accessToken).catch(() => null)
    : null;
  const headings = extractMarkdownHeadings(markdown);
  const sectionCount = headings.filter((heading) => heading.level === 2).length;
  const userName = profile?.user.displayName ?? session?.user?.displayName ?? null;
  const userId = profile?.user.id ?? session?.user?.id;
  const userAvatarColor = userId
    ? profile?.user.avatarColor ?? generateAvatarColor(userId)
    : undefined;

  return (
    <AppShell
      userName={userName}
      userAvatarUrl={profile?.user.avatarUrl ?? null}
      userFigurine={profile?.user.figurine ?? session?.user?.figurine ?? null}
      {...(userAvatarColor ? { userAvatarColor } : {})}
      {...(userName ? { userInitials: avatarInitials(userName) } : {})}
    >
      <div id="guide-top" className="mx-auto max-w-7xl">
        <section className="mb-5 rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-7 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              Обучение: правила {gameType}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              {gameType === "202"
                ? "Стартовый портфель, опционы, совместные сделки и условия победы — правила 202 для ведущего и игроков."
                : "Подготовка команды, финансовые расчёты, ход партии и спорные ситуации — правила 101 для ведущего и игроков."}
            </p>
            <nav className="mt-5 flex flex-wrap gap-2" aria-label="Режим игры в обучении">
              {(["101", "202"] as const).map(mode => (
                <Link key={mode}
                  href={`/guide?gameType=${mode}&returnTo=${encodeURIComponent(returnTo)}` as Route}
                  aria-current={mode === gameType ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/35 ${mode === gameType ? "bg-card text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}
                >Правила {mode}</Link>
              ))}
            </nav>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white">
              <BookOpenText size={17} aria-hidden="true" />
              {sectionCount} основных разделов
            </div>
          </div>
          <Link
            href={returnTo}
            className="mt-6 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-extrabold text-ink shadow-[0_10px_28px_rgba(5,18,45,.28)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/35 lg:mt-0"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Вернуться назад
          </Link>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
          <GuideToc key={gameType} headings={headings} />

          <article className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-panel">
            <div className="mx-auto max-w-[75ch] px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              {renderMarkdown(markdown, { omitTitle: true })}
            </div>
          </article>
        </div>
      </div>
    </AppShell>
  );
}

function safeReturnTo(value?: string | string[]) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/guide")
  ) {
    return "/dashboard" as Route;
  }

  return candidate as Route;
}

async function readRules(gameType: "101" | "202") {
  const filename = gameType === "202" ? "game-202-rules.md" : "user-guide.md";
  const candidates = [
    join(process.cwd(), "docs", filename),
    join(process.cwd(), "../../docs", filename)
  ];

  for (const path of candidates) {
    try {
      const markdown = await readFile(path, "utf8");
      return gameType === "202" ? playerRules202(markdown) : markdown;
    } catch {
      // Try the next likely workspace root.
    }
  }

  throw new Error(`Файл с правилами игры docs/${filename} не найден`);
}

/** The source also keeps provenance and storage notes for maintainers, outside the learning flow. */
function playerRules202(markdown: string) {
  const composition = `## Состав игры\n\nВ четырёх колодах 138 карточек. Повторяющиеся карточки сохраняются.\n\n| Колода | Количество |\n| --- | ---: |\n| Прирост капитала | 36 |\n| Создание денежного потока | 36 |\n| Рынок | 42 |\n| Всякая всячина | 24 |\n\n`;
  return markdown
    .replace(/## Источники и состав\n[\s\S]*?(?=## Начало, ход и победа)/, composition)
    .replace(/\n## Техническая целостность[\s\S]*$/, "\n")
    .replace(/Короткая версия из пособия[^\n]+/, "В онлайн-игре используется полная партия с обоими условиями победы.")
    .replace(/`distr\/202`/g, "предоставленным набором карточек");
}
