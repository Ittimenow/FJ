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

test("показывает прибавление к наличным от прежней суммы к новой", () => {
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
    before: money(65_600),
    after: money(69_450),
    operator: "+",
    effect: money(3_850)
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

test("показывает вычитание из наличных от прежней суммы к новой", () => {
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
    before: money(1_504),
    after: money(504),
    operator: "−",
    effect: money(1_000)
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
    ["Количество: 100", `Сумма: ${money(1_000)}`, `Денежный поток: ${money(0)}/мес`]
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
    [`Стоимость: ${money(20_000)}`, `Денежный поток: ${money(1_600)}/мес`]
  );
});

test("показывает тикер в старой записи об изменении акций", () => {
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
    ["Акции OK4U: 250 → 125"]
  );
});

test("показывает название пакета в новой записи об изменении акций", () => {
  assert.deepEqual(
    compactPlayerActionDetails(
      gameEvent("card:stock_quantity_changed", {
        symbol: "OK4U",
        assetName: "Акции OK4U: $10",
        beforeQuantity: 300,
        afterQuantity: 150
      })
    ),
    ["Пакет: Акции OK4U: $10", "Акции OK4U: 300 → 150"]
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
