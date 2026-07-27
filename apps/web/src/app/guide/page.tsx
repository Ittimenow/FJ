import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
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

export default async function GuidePage() {
  const session = await auth();
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
      {...(userAvatarColor ? { userAvatarColor } : {})}
      {...(userName ? { userInitials: avatarInitials(userName) } : {})}
    >
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <GuideToc headings={headings} />

        <article className="min-w-0 rounded-md border border-line bg-white p-5 shadow-panel sm:p-8">
          <div>{renderMarkdown(markdown)}</div>
        </article>
      </div>
    </AppShell>
  );
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
