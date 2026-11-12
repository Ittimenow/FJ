"use client";

import type { ReactNode } from "react";
import { localizeGameText } from "@/lib/game-labels";

/** Each mode supplies its own labels and already formatted amounts. */
export type JournalCardContent = {
  cardType: string;
  typeLabel: string;
  title: string;
  bodyText?: string | null;
  financialDetails?: string[];
  effectDetails?: string[];
};

export function MoneyBoldText({ text }: { text: string }) {
  const localizedText = localizeGameText(text);
  const currencyPattern = /(-?[\d\s\u00a0\u202f]+(?:[.,]\d+)?\s*\$)/gu;
  const currencyPartPattern = /^-?[\d\s\u00a0\u202f]+(?:[.,]\d+)?\s*\$$/u;
  const parts = localizedText.split(currencyPattern);

  return (
    <>
      {parts.map((part, index) =>
        currencyPartPattern.test(part) ? (
          <strong key={index} className="font-semibold text-neutral-900">
            {part}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

type JournalCardAppearance = {
  container: string;
  badge: string;
  section: string;
};

const defaultJournalCardAppearance: JournalCardAppearance = {
  container: "border-neutral-300 bg-white",
  badge: "bg-neutral-200 text-neutral-700",
  section: "border-neutral-200"
};

const journalCardAppearances: Record<string, JournalCardAppearance> = {
  SMALL_DEAL: {
    container: "border-[#a8c99a] bg-[#f5faf2]",
    badge: "bg-[#d1e3ca] text-[#35512d]",
    section: "border-[#d1e3ca]"
  },
  BIG_DEAL: {
    container: "border-[#91add3] bg-[#f3f7fc]",
    badge: "bg-[#d2e0f2] text-[#294d78]",
    section: "border-[#d2e0f2]"
  },
  MARKET: {
    container: "border-[#a7add6] bg-[#f5f6fc]",
    badge: "bg-[#d4d7ec] text-[#3f467d]",
    section: "border-[#d4d7ec]"
  },
  DOODAD: {
    container: "border-[#dfa1b3] bg-[#fff4f7]",
    badge: "bg-[#eecbd5] text-[#7a3449]",
    section: "border-[#eecbd5]"
  },
  FAST_TRACK: {
    container: "border-[#d8b65a] bg-[#fff9e8]",
    badge: "bg-[#f3e4ad] text-[#705719]",
    section: "border-[#f3e4ad]"
  },
  DREAM: {
    container: "border-[#b596c8] bg-[#faf5fc]",
    badge: "bg-[#e1d2ea] text-[#604271]",
    section: "border-[#e1d2ea]"
  }
};

/** Shared face of a drawn card, preserving the original 101 presentation. */
export function JournalCard({
  cardType,
  typeLabel,
  title,
  bodyText,
  financialDetails = [],
  effectDetails = [],
  children
}: JournalCardContent & { children?: ReactNode }) {
  const appearance = journalCardAppearances[cardType] ?? defaultJournalCardAppearance;
  return (
    <div
      data-journal-card={cardType}
      className={`w-full min-w-0 max-w-full rounded-lg p-3 [overflow-wrap:anywhere] ${appearance.container}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${appearance.badge}`}>
          {typeLabel}
        </span>
      </div>
      <div className="mt-2 text-base font-semibold text-neutral-900">{title}</div>
      {bodyText ? (
        <div className="mt-2 whitespace-pre-line text-sm leading-5 text-neutral-800">
          <MoneyBoldText text={bodyText} />
        </div>
      ) : null}
      {effectDetails.length > 0 || financialDetails.length > 0 ? (
        <div className={`mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2 ${appearance.section}`}>
          {financialDetails.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Условия
              </div>
              <div className="mt-1 space-y-1 text-sm text-neutral-800">
                {financialDetails.map((detail, index) => (
                  <div key={`${index}-${detail}`}>
                    <MoneyBoldText text={detail} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {effectDetails.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Эффект
              </div>
              <div className="mt-1 space-y-1 text-sm text-neutral-800">
                {effectDetails.map((detail, index) => (
                  <div key={`${index}-${detail}`}>
                    <MoneyBoldText text={detail} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {children ? <div className={`mt-3 border-t pt-3 ${appearance.section}`}>{children}</div> : null}
    </div>
  );
}
