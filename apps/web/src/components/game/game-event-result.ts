import { money } from "../../lib/format";
import type { GameEvent } from "../../lib/types";

export type CashChange = {
  beforeCents: number | null;
  afterCents: number | null;
  deltaCents: number;
};

export type CashChangeExpression =
  | {
      kind: "equation";
      result: string;
      firstOperand: string;
      operator: "+" | "−";
      secondOperand: string;
      changedOperand: "first" | "second";
    }
  | {
      kind: "delta";
      value: string;
    };

export function eventCashChange(event: GameEvent): CashChange | null {
  const before = optionalPayloadNumber(event.payload, "beforeCashCents");
  const after = optionalPayloadNumber(event.payload, "afterCashCents");
  if (before !== null && after !== null) {
    return { beforeCents: before, afterCents: after, deltaCents: after - before };
  }

  let delta: number | null = null;
  if (event.type === "loan:take") {
    delta = optionalPayloadNumber(event.payload, "amountCents");
  } else if (event.type === "card:cash_delta") {
    delta = optionalPayloadNumber(event.payload, "amountCents");
  } else if (event.type === "bankruptcy:asset_sold") {
    delta = optionalPayloadNumber(event.payload, "proceedsCents");
  } else if (event.type === "bankruptcy:debt_repaid") {
    const amount = optionalPayloadNumber(event.payload, "amountCents");
    delta = amount === null ? null : -Math.abs(amount);
  } else if (event.type === "doodad:paid") {
    const amount = optionalPayloadNumber(event.payload, "amountCents");
    delta = amount === null ? null : -Math.abs(amount);
  } else if (
    event.type === "doodad:payment_resolved" &&
    event.payload.method === "cash"
  ) {
    const amount = optionalPayloadNumber(event.payload, "cashPriceCents");
    delta = amount === null ? null : -Math.abs(amount);
  }

  return delta === null
    ? null
    : { beforeCents: null, afterCents: null, deltaCents: delta };
}

export function cashChangeExpression(change: CashChange): CashChangeExpression {
  const positive = change.deltaCents >= 0;
  if (change.beforeCents === null || change.afterCents === null) {
    return {
      kind: "delta",
      value: `${positive ? "+" : "−"}${money(Math.abs(change.deltaCents))}`
    };
  }

  return positive
    ? {
        kind: "equation",
        result: money(change.afterCents),
        firstOperand: money(change.deltaCents),
        operator: "+",
        secondOperand: money(change.beforeCents),
        changedOperand: "first"
      }
    : {
        kind: "equation",
        result: money(change.afterCents),
        firstOperand: money(change.beforeCents),
        operator: "−",
        secondOperand: money(Math.abs(change.deltaCents)),
        changedOperand: "second"
      };
}

export function compactPlayerActionDetails(event: GameEvent): string[] | null {
  const payload = event.payload;

  switch (event.type) {
    case "paycheck:receive":
    case "deal:decline":
    case "doodad:paid":
    case "card:cash_delta":
      return [];
    case "deal:buy": {
      const quantity = optionalPayloadNumber(payload, "quantity");
      const cost = optionalPayloadNumber(payload, "downPaymentCents");
      const cashflow = optionalPayloadNumber(payload, "cashflowCents");
      const hasMultipleUnits = quantity !== null && quantity > 1;

      return compactDetails([
        hasMultipleUnits ? `Количество: ${quantity}` : null,
        cost === null
          ? null
          : `${hasMultipleUnits ? "Сумма" : "Стоимость"}: ${money(cost)}`,
        cashflow === null ? null : `Cashflow: ${money(cashflow)}/мес`
      ]);
    }
    case "card:stock_quantity_changed": {
      const before = optionalPayloadNumber(payload, "beforeQuantity");
      const after = optionalPayloadNumber(payload, "afterQuantity");
      return before === null || after === null
        ? []
        : [`Акции: ${before} → ${after}`];
    }
    default:
      return null;
  }
}

function optionalPayloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactDetails(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}
