import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
      <div>
        <Link
          href={returnTo}
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-success shadow-panel transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
          Вернуться
        </Link>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <GuideToc headings={headings} />

          <article className="min-w-0 rounded-md border border-line bg-white p-5 shadow-panel sm:p-8">
            <div>{renderMarkdown(markdown)}</div>
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
