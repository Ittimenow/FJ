"use client";

import { useMemo, useState } from "react";
import type { MarkdownHeading } from "@/lib/markdown";

interface GuideTocProps {
  headings: MarkdownHeading[];
}

interface TocSection {
  heading: MarkdownHeading;
  children: MarkdownHeading[];
}

export function GuideToc({ headings }: GuideTocProps) {
  const sections = useMemo(() => groupHeadings(headings), [headings]);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  return (
    <aside className="sticky top-0 z-10 max-h-[45vh] overflow-y-auto rounded-md border border-line bg-white p-4 shadow-panel lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start">
      <div className="mb-3 text-sm font-semibold">Оглавление</div>
      <nav aria-label="Оглавление руководства" className="space-y-1">
        {sections.map((section) => {
          const hasChildren = section.children.length > 0;
          const isOpen = openSectionId === section.heading.id;

          return (
            <div key={section.heading.id}>
              <a
                href={toAnchor(section.heading.id)}
                aria-expanded={hasChildren ? isOpen : undefined}
                onClick={() => setOpenSectionId(section.heading.id)}
                className="flex items-start justify-between gap-2 rounded px-2 py-1.5 text-sm font-semibold leading-snug text-neutral-800 transition hover:bg-surface hover:text-ink"
              >
                <span>{section.heading.text}</span>
                {hasChildren ? (
                  <span className="shrink-0 text-neutral-500" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                ) : null}
              </a>

              {hasChildren && isOpen ? (
                <div className="mt-1 space-y-1 border-l border-line pl-3">
                  {section.children.map((child) => (
                    <a
                      key={child.id}
                      href={toAnchor(child.id)}
                      onClick={() => setOpenSectionId(section.heading.id)}
                      className={subTocLinkClass(child.level)}
                    >
                      {child.text}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function groupHeadings(headings: MarkdownHeading[]): TocSection[] {
  const topLevel = headings.some((heading) => heading.level === 2)
    ? 2
    : Math.min(...headings.map((heading) => heading.level));
  const sections: TocSection[] = [];
  let currentSection: TocSection | null = null;

  headings.forEach((heading) => {
    if (heading.level === topLevel) {
      currentSection = { heading, children: [] };
      sections.push(currentSection);
      return;
    }

    if (currentSection && heading.level > topLevel) {
      currentSection.children.push(heading);
    }
  });

  return sections;
}

function subTocLinkClass(level: number) {
  const base =
    "block rounded px-2 py-1.5 text-sm leading-snug text-neutral-700 transition hover:bg-surface hover:text-ink";
  if (level === 3) return `${base} pl-2`;
  return `${base} pl-5 text-neutral-600`;
}

function toAnchor(id: string) {
  return `#${encodeURIComponent(id)}`;
}
