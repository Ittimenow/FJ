"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { bankLoanIncrementCents, bankLoanPaymentCents } from "@cashflow/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";

function LoanPanel({
  loanAmount,
  availableLoanAmountCents,
  currentCashCents,
  currentMonthlyCashflowCents,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan,
  loanSubmitting,
  formatMoney = money,
  loanNotice,
  unavailableReason
}: {
  loanAmount: number;
  availableLoanAmountCents: number;
  currentCashCents: number;
  currentMonthlyCashflowCents: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => void;
  canTakeLoan: boolean;
  loanSubmitting: boolean;
  formatMoney?: (amount: number) => string;
  loanNotice?: ReactNode;
  unavailableReason?: string;
}) {
  const loanAvailable =
    canTakeLoan && availableLoanAmountCents >= bankLoanIncrementCents;
  const validAmount = Number.isSafeInteger(loanAmount) && loanAmount >= bankLoanIncrementCents
    && loanAmount <= availableLoanAmountCents && loanAmount % bankLoanIncrementCents === 0;

  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-sm font-medium">Взять кредит</div>
        <div className="text-xs text-muted" aria-live="polite">
          Доступно: <strong className="text-ink">{formatMoney(availableLoanAmountCents)}</strong>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="secondary"
          className="px-3"
          onClick={onLoanDecrease}
          disabled={!loanAvailable || loanSubmitting || loanAmount <= bankLoanIncrementCents}
          aria-label={`Уменьшить сумму кредита на ${formatMoney(bankLoanIncrementCents)}`}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <Input
          type="number"
          min={bankLoanIncrementCents}
          max={availableLoanAmountCents || undefined}
          step={bankLoanIncrementCents}
          value={loanAmount}
          onChange={(event) => onLoanAmountChange(Number(event.target.value))}
          disabled={!loanAvailable || loanSubmitting}
          aria-label="Сумма кредита"
          aria-invalid={loanAvailable && !validAmount}
          className="text-center font-semibold"
        />
        <Button
          variant="secondary"
          className="px-3"
          onClick={onLoanIncrease}
          disabled={
            !loanAvailable ||
            loanSubmitting ||
            loanAmount >= availableLoanAmountCents
          }
          aria-label={`Увеличить сумму кредита на ${formatMoney(bankLoanIncrementCents)}`}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
      {loanAvailable && validAmount ? (
        <LoanPreview
          formatMoney={formatMoney}
          loanAmountCents={loanAmount}
          currentCashCents={currentCashCents}
          currentMonthlyCashflowCents={currentMonthlyCashflowCents}
        />
      ) : (
        <div role="status" className="mt-3 rounded-xl bg-white p-3 text-sm leading-5 text-muted">
          {loanAvailable ? `Укажите сумму от ${formatMoney(bankLoanIncrementCents)} до ${formatMoney(availableLoanAmountCents)}, кратную ${formatMoney(bankLoanIncrementCents)}.` : unavailableReason ?? "Лимит исчерпан. Увеличьте месячный денежный поток или погасите долг, чтобы снова получить доступ к кредиту."}
        </div>
      )}
      <Button
        className="mt-3 w-full"
        variant="secondary"
        onClick={onTakeLoan}
        disabled={!loanAvailable || !validAmount || loanSubmitting}
      >
        {loanSubmitting ? "Оформляем кредит…" : "Взять кредит"}
      </Button>
      <p className="mt-2 text-xs text-neutral-500">
        {loanNotice ?? <>Лимит рассчитан так, чтобы новый платёж не сделал месячный денежный поток отрицательным. Сумма кратна <strong>{formatMoney(bankLoanIncrementCents)}</strong>.</>}
      </p>
    </div>
  );
}

export function BankDialog({
  open,
  loanAmount,
  availableLoanAmountCents,
  currentCashCents,
  currentMonthlyCashflowCents,
  onLoanDecrease,
  onLoanIncrease,
  onLoanAmountChange,
  onTakeLoan,
  canTakeLoan,
  loanSubmitting,
  onClose,
  formatMoney = money,
  loanNotice,
  unavailableReason,
  children,
  error
}: {
  open: boolean;
  loanAmount: number;
  availableLoanAmountCents: number;
  currentCashCents: number;
  currentMonthlyCashflowCents: number;
  onLoanDecrease: () => void;
  onLoanIncrease: () => void;
  onLoanAmountChange: (value: number) => void;
  onTakeLoan: () => Promise<void>;
  canTakeLoan: boolean;
  loanSubmitting: boolean;
  onClose: () => void;
  formatMoney?: (amount: number) => string;
  loanNotice?: ReactNode;
  unavailableReason?: string;
  children?: ReactNode;
  error?: string | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="bank-dialog-overlay fixed inset-0 z-[90] bg-[#07152d]/60 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-dialog-title"
        aria-describedby="bank-dialog-description"
        className="bank-dialog-panel flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-[0_34px_90px_rgba(5,18,45,.35)]"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'
            ) ?? []
          ).filter(element => element.tabIndex >= 0 && !element.closest('[hidden], [inert]')
            && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
          if (focusable.length === 0) return;
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
        <div className="flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div>
            <h2 id="bank-dialog-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">
              Банк
            </h2>
            <p id="bank-dialog-description" className="mt-1 text-sm leading-5 text-muted">
              Выберите сумму кредита и проверьте, как изменится финансовый отчёт.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Закрыть банк"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-muted shadow-[0_5px_14px_rgba(27,57,118,.10)] transition hover:-translate-y-0.5 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="bank-dialog-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
          {error ? <p role="alert" className="mb-3 text-sm font-bold text-red-700">{error}</p> : null}
          <LoanPanel
            formatMoney={formatMoney}
            loanNotice={loanNotice}
            {...(unavailableReason ? {unavailableReason} : {})}
            loanAmount={loanAmount}
            availableLoanAmountCents={availableLoanAmountCents}
            currentCashCents={currentCashCents}
            currentMonthlyCashflowCents={currentMonthlyCashflowCents}
            onLoanDecrease={onLoanDecrease}
            onLoanIncrease={onLoanIncrease}
            onLoanAmountChange={onLoanAmountChange}
            onTakeLoan={() => void onTakeLoan()}
            canTakeLoan={canTakeLoan}
            loanSubmitting={loanSubmitting}
          />
          {children}
        </div>
      </div>
    </div>
  );
}

function LoanPreview({
  loanAmountCents,
  currentCashCents,
  currentMonthlyCashflowCents,
  formatMoney = money
}: {
  loanAmountCents: number;
  currentCashCents: number;
  currentMonthlyCashflowCents: number;
  formatMoney?: (amount: number) => string;
}) {
  const paymentCents = bankLoanPaymentCents(loanAmountCents);
  const cashAfterCents = currentCashCents + loanAmountCents;
  const cashflowAfterCents = currentMonthlyCashflowCents - paymentCents;

  return (
    <div className="mt-3 rounded-md border border-line bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        После получения
      </div>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-neutral-500">Наличные</div>
          <div className="mt-0.5 font-semibold">{formatMoney(cashAfterCents)}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Новый платёж</div>
          <div className="mt-0.5 font-semibold text-red-700">
            −{formatMoney(paymentCents)}/мес
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Денежный поток после</div>
          <div
            className={`mt-0.5 font-semibold ${
              cashflowAfterCents >= 0 ? "text-success" : "text-red-700"
            }`}
          >
            {formatMoney(cashflowAfterCents)}/мес
          </div>
        </div>
      </div>
    </div>
  );
}

