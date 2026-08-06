"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main className="grid min-h-screen place-items-center bg-[#faf2e8] px-5 text-[#17243f]">
          <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-panel sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-[-0.025em]">Страница временно недоступна</h1>
            <p className="mt-3 max-w-[65ch] leading-7 text-[#657597]">
              Ошибка уже записана. Обновите страницу; если проблема повторится, сообщите ведущему время сбоя.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-11 rounded-xl bg-[#2967df] px-5 font-extrabold text-white transition hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f98f2f]/40"
            >
              Обновить страницу
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
