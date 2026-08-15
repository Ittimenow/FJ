"use client";

import { Check, Gavel, Hourglass, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";

export type DealAuctionPlayerRow = {
  id: string;
  name: string;
  status: "waiting" | "declined" | "offered";
  amountCents: number | null;
};

type AuctionCard = {
  title: string;
  bodyText: string;
  downPaymentCents: number;
  cashflowCents: number;
};

export function dealAuctionMaxBidCents(
  currentCashCents: number,
  downPaymentCents: number
) {
  return Math.max(0, currentCashCents - downPaymentCents);
}

export function validDealAuctionBid(
  value: number | "",
  maxBidCents: number
) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= maxBidCents;
}

export function DealAuctionDialog({
  open,
  role,
  card,
  rows,
  resolved,
  hasResponded,
  bidDraft,
  currentCashCents,
  submitting,
  onBidDraftChange,
  onBid,
  onDecline,
  onSelect,
  onCancel
}: {
  open: boolean;
  role: "seller" | "bidder";
  card: AuctionCard | null;
  rows: DealAuctionPlayerRow[];
  resolved: boolean;
  hasResponded: boolean;
  bidDraft: number | "";
  currentCashCents: number;
  submitting: boolean;
  onBidDraftChange: (value: number | "") => void;
  onBid: () => void;
  onDecline: () => void;
  onSelect: (buyerGamePlayerId: string) => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, role, resolved, hasResponded]);

  if (!open || !card) return null;

  const maxBidCents = dealAuctionMaxBidCents(currentCashCents, card.downPaymentCents);
  const validBid = validDealAuctionBid(bidDraft, maxBidCents);
  const offeredRows = rows.filter((row) => row.status === "offered");

  return (
    <div className="deal-auction-overlay fixed inset-0 z-[85] bg-[#07152d]/65 backdrop-blur-[2px]">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-auction-title"
        aria-describedby="deal-auction-description"
        tabIndex={-1}
        className="deal-auction-panel flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-[0_34px_90px_rgba(5,18,45,.35)] focus:outline-none"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
            ) ?? []
          );
          if (focusable.length === 0) {
            event.preventDefault();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="flex shrink-0 items-start gap-3 bg-[#e8effe] px-4 py-4 sm:px-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-journey text-white shadow-[0_9px_24px_rgba(41,103,223,.24)]">
            <Gavel size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="deal-auction-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">
              {role === "seller" ? "Аукцион возможности" : "Вам предлагают возможность"}
            </h2>
            <p id="deal-auction-description" className="mt-1 text-sm leading-5 text-[#536789]">
              {role === "seller"
                ? "Дождитесь решений игроков, затем выберите подходящее предложение."
                : "Назовите цену за право купить актив или откажитесь. Ответ изменить нельзя."}
            </p>
          </div>
        </div>

        <div className="deal-auction-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <section className="rounded-2xl bg-white p-4 shadow-[0_14px_34px_rgba(27,57,118,.09)]">
            <h3 className="break-words text-base font-extrabold text-ink">{card.title}</h3>
            {card.bodyText ? (
              <p className="mt-2 break-words text-sm leading-6 text-muted">{card.bodyText}</p>
            ) : null}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[#faf2e8] px-3 py-2.5">
                <dt className="text-xs font-bold text-muted">Первоначальный взнос</dt>
                <dd className="mt-0.5 font-extrabold tabular-nums text-ink">{money(card.downPaymentCents)}</dd>
              </div>
              <div className="rounded-xl bg-[#edf5e2] px-3 py-2.5">
                <dt className="text-xs font-bold text-[#5e742e]">Денежный поток</dt>
                <dd className="mt-0.5 font-extrabold tabular-nums text-ink">{money(card.cashflowCents)}/мес</dd>
              </div>
            </dl>
          </section>

          {role === "bidder" ? (
            hasResponded ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#fff5e8] p-4 text-sm text-ink" role="status">
                <Hourglass className="mt-0.5 shrink-0 text-[#c56b1a]" size={19} aria-hidden="true" />
                <div>
                  <div className="font-extrabold">Ответ принят</div>
                  <p className="mt-1 leading-5 text-[#76532e]">Ожидаем решения остальных игроков и выбор владельца хода.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="deal-auction-bid" className="text-sm font-extrabold text-ink">
                  Ваша цена за возможность
                </label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="deal-auction-bid"
                    type="number"
                    min={1}
                    max={maxBidCents}
                    step={100}
                    inputMode="decimal"
                    value={bidDraft}
                    placeholder="Введите сумму"
                    onChange={(event) =>
                      onBidDraftChange(event.target.value === "" ? "" : Number(event.target.value))
                    }
                    className="h-12 min-w-0 flex-1 tabular-nums"
                  />
                  <Button
                    onClick={onBid}
                    disabled={!validBid || submitting}
                    aria-busy={submitting}
                    className="h-12 shrink-0"
                  >
                    Предложить
                  </Button>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  После первоначального взноса вы можете предложить до <strong>{money(maxBidCents)}</strong>.
                </p>
                <Button
                  variant="secondary"
                  onClick={onDecline}
                  disabled={submitting}
                  className="mt-3 w-full"
                >
                  Отказаться
                </Button>
              </div>
            )
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-extrabold text-ink">Ответы игроков</h3>
                <span className="text-sm font-bold tabular-nums text-muted">
                  {rows.filter((row) => row.status !== "waiting").length}/{rows.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[0_7px_18px_rgba(27,57,118,.07)]">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-ink">{row.name}</div>
                      <div className="mt-0.5 text-xs font-semibold text-muted">
                        {row.status === "waiting"
                          ? "Ещё не ответил"
                          : !resolved
                            ? "Ответ получен"
                            : row.status === "declined"
                              ? "Отказался"
                              : `Предложил ${money(row.amountCents ?? 0)}`}
                      </div>
                    </div>
                    {row.status === "waiting" ? (
                      <Hourglass className="shrink-0 text-muted" size={18} aria-hidden="true" />
                    ) : resolved && row.status === "offered" ? (
                      <Button
                        onClick={() => onSelect(row.id)}
                        disabled={submitting}
                        className="h-10 shrink-0"
                      >
                        Выбрать
                      </Button>
                    ) : (
                      <Check className="shrink-0 text-[#6f8e2f]" size={19} aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
              {resolved ? (
                <div className="mt-4">
                  {offeredRows.length === 0 ? (
                    <p className="rounded-xl bg-[#fff5e8] px-3 py-2.5 text-sm text-[#76532e]">Все игроки отказались. Можно вернуться к обычному решению по карточке.</p>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={onCancel}
                    disabled={submitting}
                    className="mt-3 w-full"
                  >
                    <X size={17} aria-hidden="true" />
                    Не продавать возможность
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted" role="status">
                  Цены откроются одновременно, когда ответят все участники.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
