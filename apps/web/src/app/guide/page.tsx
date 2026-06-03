import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { extractMarkdownHeadings, renderMarkdown } from "@/lib/markdown";
import { GuideToc } from "./guide-toc";

export const metadata: Metadata = {
  title: "Руководство пользователя | Cashflow Online",
  description: "Типы аккаунтов, роли в комнате и правила MVP-партии Cashflow Online"
};

export default async function GuidePage() {
  const markdown = await readGuide();
  const headings = extractMarkdownHeadings(markdown);

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <GuideToc headings={headings} />

        <article className="min-w-0 rounded-md border border-line bg-white p-5 shadow-panel sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <Link href="/dashboard" className="text-sm font-medium text-success">
              Вернуться обратно
            </Link>
            <Link href="/register" className="text-sm font-medium text-success">
              Создать аккаунт
            </Link>
          </div>
          <div>{renderMarkdown(markdown)}</div>
        </article>
      </div>
    </main>
  );
}

async function readGuide() {
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

  throw new Error("docs/user-guide.md not found");
}
