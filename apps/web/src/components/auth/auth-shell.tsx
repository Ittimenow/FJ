import { ArrowLeft, TicketCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsLink } from "@/components/analytics/cookie-settings-link";

export function AuthShell({
  title,
  description,
  inviteCode,
  children
}: {
  title: string;
  description?: string | undefined;
  inviteCode: string | null;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-3 sm:p-6">
      <section className="w-full max-w-lg rounded-2xl bg-white px-5 py-5 shadow-panel sm:px-8 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex min-w-0 items-center gap-2 text-sm font-extrabold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-journey text-sm text-white" aria-hidden="true">
                Ф
              </span>
              <span className="truncate">Финансовое путешествие</span>
            </Link>
            <Link
              href="/"
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              На главную
            </Link>
          </div>

          <div className="pt-8 sm:pt-10">
            {inviteCode ? (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#e8effe] p-3 text-journey">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/80" aria-hidden="true">
                  <TicketCheck size={19} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold">Вас пригласили в игру</div>
                  <div className="mt-0.5 text-xs font-medium text-[#365993]">
                    Код комнаты: <span className="font-mono font-extrabold">{inviteCode}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base sm:leading-7">{description}</p>
            ) : null}
            <div className="mt-7">{children}</div>
          </div>
          <div className="mt-6 flex justify-center border-t border-line/70 pt-4 text-xs font-bold text-muted">
            <CookieSettingsLink />
          </div>
      </section>
    </main>
  );
}
