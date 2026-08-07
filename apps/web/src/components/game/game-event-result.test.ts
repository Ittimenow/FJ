import assert from "node:assert/strict";
import test from "node:test";
import { money } from "../../lib/format";
import type { GameEvent } from "../../lib/types";
import {
  cashChangeExpression,
  compactPlayerActionDetails,
  eventCashChange,
  eventReasonLabel
} from "./game-event-result";

function gameEvent(type: string, payload: Record<string, unknown>): GameEvent {
  return {
    id: "event-id",
    type,
    sequence: 1,
    payload,
    createdAt: "2026-08-05T00:00:00.000Z"
  };
}

test("показывает полученный cashflow как результат, изменение и прежнюю сумму", () => {
  const change = eventCashChange(
    gameEvent("paycheck:receive", {
      beforeCashCents: 65_600,
      afterCashCents: 69_450,
      amountCents: 3_850
    })
  );

  assert.ok(change);
  assert.deepEqual(cashChangeExpression(change), {
    kind: "equation",
    result: money(69_450),
    firstOperand: money(3_850),
    operator: "+",
    secondOperand: money(65_600),
    changedOperand: "first"
  });
  assert.deepEqual(
    compactPlayerActionDetails(
      gameEvent("paycheck:receive", {
        reason: "passed_paycheck",
        paycheckHits: 1,
        paycheckCount: 4
      })
    ),
    []
  );
});

test("показывает покупку как результат, прежнюю сумму и расход", () => {
  const change = eventCashChange(
    gameEvent("deal:buy", {
      beforeCashCents: 1_504,
      afterCashCents: 504,
      downPaymentCents: 1_000
    })
  );

  assert.ok(change);
  assert.deepEqual(cashChangeExpression(change), {
    kind: "equation",
    result: money(504),
    firstOperand: money(1_504),
    operator: "−",
    secondOperand: money(1_000),
    changedOperand: "second"
  });
});

test("оставляет у покупки акций только количество, сумму и cashflow", () => {
  assert.deepEqual(
    compactPlayerActionDetails(
      gameEvent("deal:buy", {
        title: "Акции компании",
        quantity: 100,
        downPaymentCents: 1_000,
        cashflowCents: 0
      })
    ),
    ["Количество: 100", `Сумма: ${money(1_000)}`, `Cashflow: ${money(0)}/мес`]
  );
});

test("показывает стоимость единичного актива без количества", () => {
  assert.deepEqual(
    compactPlayerActionDetails(
      gameEvent("deal:buy", {
        title: "Недвижимость",
        quantity: 1,
        downPaymentCents: 20_000,
        cashflowCents: 1_600
      })
    ),
    [`Стоимость: ${money(20_000)}`, `Cashflow: ${money(1_600)}/мес`]
  );
});

test("показывает только итоговое количество акций", () => {
  assert.deepEqual(
    compactPlayerActionDetails(
      gameEvent("card:stock_quantity_changed", {
        title: "Обратное дробление",
        symbol: "OK4U",
        effectType: "stock_reverse_split",
        beforeQuantity: 250,
        afterQuantity: 125
      })
    ),
    ["Акции: 250 → 125"]
  );
});

test("убирает повтор карточки у отказа и оплаченной безделушки", () => {
  assert.deepEqual(
    compactPlayerActionDetails(gameEvent("deal:decline", { cardId: 42 })),
    []
  );
  assert.deepEqual(
    compactPlayerActionDetails(gameEvent("doodad:paid", { title: "Безделушка" })),
    []
  );

  const change = eventCashChange(gameEvent("doodad:paid", { amountCents: 200 }));
  assert.ok(change);
  assert.deepEqual(cashChangeExpression(change), {
    kind: "delta",
    value: `−${money(200)}`
  });
});

test("понятно объясняет ручной и автоматический пропуск хода", () => {
  assert.equal(eventReasonLabel("player_choice"), "решение игрока");
  assert.equal(eventReasonLabel("downsized"), "потеря работы");
});
