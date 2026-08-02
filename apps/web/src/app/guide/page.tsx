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
  title: "Правила игры «Финансовое путешествие» | Financial Journey",
  description: "Правила финансовой игры «Финансовое путешествие» по мотивам CASHFLOW"
};

export default async function GuidePage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const session = await auth();
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const markdown = await readRules();
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
              Правила «Финансового путешествия»
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Подготовка команды, финансовые расчёты, ход партии и спорные ситуации — всё необходимое ведущему и игрокам в одном документе.
            </p>
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
          <GuideToc headings={headings} />

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

async function readRules() {
  const candidates = [
    join(process.cwd(), "docs/user-guide.md"),
    join(process.cwd(), "../../docs/user-guide.md")
  ];

  for (const path of candidates) {
    try {
      return await readFile(path, "utf8");
    } catch {
      // Try the next likely workspace root.
    }
  }

  throw new Error("Файл с правилами игры docs/user-guide.md не найден");
}
