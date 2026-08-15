export const bankLoanIncrementCents = 1_000;
export const bankLoanPaymentDivisor = 10;

export type BankLoanLiability = {
  type: string;
  balanceCents: number;
};

const bankLoanPaymentPerIncrementCents =
  bankLoanIncrementCents / bankLoanPaymentDivisor;
const maxSafeBankLoanCents =
  Math.floor(Number.MAX_SAFE_INTEGER / bankLoanIncrementCents) * bankLoanIncrementCents;

export function bankLoanPaymentCents(amountCents: number): number;
export function bankLoanPaymentCents(amountCents: bigint): bigint;
export function bankLoanPaymentCents(amountCents: number | bigint): number | bigint {
  return typeof amountCents === "bigint"
    ? amountCents / BigInt(bankLoanPaymentDivisor)
    : Math.floor(amountCents / bankLoanPaymentDivisor);
}

export function availableBankLoanCents(monthlyCashflowCents: number): number;
export function availableBankLoanCents(monthlyCashflowCents: bigint): bigint;
export function availableBankLoanCents(
  monthlyCashflowCents: number | bigint
): number | bigint {
  if (typeof monthlyCashflowCents === "bigint") {
    if (monthlyCashflowCents <= 0n) return 0n;
    return (
      (monthlyCashflowCents / BigInt(bankLoanPaymentPerIncrementCents)) *
      BigInt(bankLoanIncrementCents)
    );
  }

  if (!Number.isFinite(monthlyCashflowCents) || monthlyCashflowCents <= 0) {
    return 0;
  }

  const availableIncrements = Math.floor(
    monthlyCashflowCents / bankLoanPaymentPerIncrementCents
  );
  return Math.min(
    availableIncrements * bankLoanIncrementCents,
    maxSafeBankLoanCents
  );
}

export function outstandingBankLoanBalanceCents(
  liabilities: readonly BankLoanLiability[]
) {
  return liabilities.reduce(
    (total, liability) =>
      liability.type === "bank_loan" && liability.balanceCents > 0
        ? total + liability.balanceCents
        : total,
    0
  );
}
