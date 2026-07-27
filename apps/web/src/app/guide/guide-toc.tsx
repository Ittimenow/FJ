"use client";

import type { MarkdownHeading } from "@/lib/markdown";

interface GuideTocProps {
  headings: MarkdownHeading[];
}

export function GuideToc({ headings }: GuideTocProps) {
  const topLevelHeadings = headings.filter((heading) => heading.level === 2);

  return (
    <aside className="sticky top-0 z-10 max-h-[45vh] overflow-y-auto rounded-md border border-line bg-white p-4 shadow-panel lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start">
      <div className="mb-3 text-sm font-semibold">Оглавление</div>
      <nav aria-label="Оглавление правил игры" className="space-y-1">
        {topLevelHeadings.map((heading) => (
          <a
            key={heading.id}
            href={toAnchor(heading.id)}
            className="block rounded px-2 py-1.5 text-sm leading-snug text-neutral-800 transition hover:bg-surface hover:text-ink"
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function toAnchor(id: string) {
  return `#${encodeURIComponent(id)}`;
}
