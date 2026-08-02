"use client";

import { ArrowUp, ChevronDown, ListTree } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkdownHeading } from "@/lib/markdown";

interface GuideTocProps {
  headings: MarkdownHeading[];
}

export function GuideToc({ headings }: GuideTocProps) {
  const topLevelHeadings = useMemo(
    () => headings.filter((heading) => heading.level === 2),
    [headings]
  );
  const [activeId, setActiveId] = useState(topLevelHeadings[0]?.id ?? "");
  const mobileDetailsRef = useRef<HTMLDetailsElement>(null);
  const activeHeading =
    topLevelHeadings.find((heading) => heading.id === activeId) ?? topLevelHeadings[0];

  useEffect(() => {
    const ids = new Set(topLevelHeadings.map((heading) => heading.id));
    const hash = decodeHash(window.location.hash);
    if (hash && ids.has(hash)) setActiveId(hash);

    const elements = topLevelHeadings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0 || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        const next = visible[0]?.target.id;
        if (next) setActiveId(next);
      },
      {
        rootMargin: "-120px 0px -68% 0px",
        threshold: [0, 1]
      }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [topLevelHeadings]);

  function selectHeading(id: string) {
    setActiveId(id);
    mobileDetailsRef.current?.removeAttribute("open");
  }

  return (
    <>
      <details
        ref={mobileDetailsRef}
        className="group sticky top-24 z-30 rounded-2xl bg-card shadow-panel lg:hidden"
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 [&::-webkit-details-marker]:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
            <ListTree size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-muted">Оглавление</span>
            <span className="mt-0.5 block truncate text-sm font-extrabold text-ink">
              {activeHeading?.text ?? "Выберите раздел"}
            </span>
          </span>
          <ChevronDown
            className="shrink-0 text-muted transition-transform group-open:rotate-180"
            size={18}
            aria-hidden="true"
          />
        </summary>
        <nav
          aria-label="Оглавление правил игры"
          className="max-h-[60vh] space-y-1 overflow-y-auto border-t border-line/70 p-2"
        >
          {topLevelHeadings.map((heading) => (
            <GuideHeadingLink
              key={heading.id}
              heading={heading}
              active={heading.id === activeId}
              onSelect={selectHeading}
            />
          ))}
        </nav>
      </details>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="overflow-hidden rounded-2xl bg-card shadow-panel">
          <div className="border-b border-line/70 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
                <ListTree size={19} />
              </span>
              <div>
                <h2 className="font-extrabold text-ink">Оглавление</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {topLevelHeadings.length} основных разделов
                </p>
              </div>
            </div>
          </div>
          <nav
            aria-label="Оглавление правил игры"
            className="max-h-[calc(100vh-15rem)] space-y-1 overflow-y-auto p-2"
          >
            {topLevelHeadings.map((heading) => (
              <GuideHeadingLink
                key={heading.id}
                heading={heading}
                active={heading.id === activeId}
                onSelect={selectHeading}
              />
            ))}
          </nav>
          <a
            href="#guide-top"
            className="flex items-center justify-between gap-3 border-t border-line/70 px-5 py-4 text-sm font-extrabold text-journey transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-action/25"
          >
            В начало правил
            <ArrowUp size={16} aria-hidden="true" />
          </a>
        </div>
      </aside>
    </>
  );
}

function GuideHeadingLink({
  heading,
  active,
  onSelect
}: {
  heading: MarkdownHeading;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <a
      href={toAnchor(heading.id)}
      aria-current={active ? "location" : undefined}
      onClick={() => onSelect(heading.id)}
      className={[
        "block rounded-xl px-3 py-2.5 text-sm font-bold leading-snug transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25",
        active
          ? "bg-ink text-white shadow-[0_8px_20px_rgba(5,18,45,.16)]"
          : "text-muted hover:bg-white hover:text-ink"
      ].join(" ")}
    >
      {heading.text}
    </a>
  );
}

function toAnchor(id: string) {
  return `#${encodeURIComponent(id)}`;
}

function decodeHash(hash: string) {
  if (!hash) return "";
  try {
    return decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return hash.replace(/^#/, "");
  }
}
