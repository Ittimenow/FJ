import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocument({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink sm:px-6 sm:py-10">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-panel sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-5">
          <Link href="/register" className="inline-flex items-center gap-2 text-sm font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
            <ArrowLeft size={16} aria-hidden="true" />
            К регистрации
          </Link>
          <span className="text-xs font-bold text-muted">Редакция от {version}</span>
        </div>
        <h1 className="mt-8 text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{title}</h1>
        <div className="mt-7 space-y-7 text-base leading-7 text-ink [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.02em] [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted">
          {children}
        </div>
      </article>
    </main>
  );
}
