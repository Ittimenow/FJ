import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DealAuctionDialog,
  dealAuctionMaxBidCents,
  validDealAuctionBid
} from "./deal-auction-dialog";

test("ставка учитывает деньги, зарезервированные на первоначальный взнос", () => {
  assert.equal(dealAuctionMaxBidCents(12_000, 5_000), 7_000);
  assert.equal(dealAuctionMaxBidCents(4_000, 5_000), 0);
  assert.equal(dealAuctionMaxBidCents(5_001, 5_000), 1);
});

test("предложение отображается в карточке хода без обязательного модального окна", () => {
  const html = renderToStaticMarkup(createElement(DealAuctionDialog, {
    open: true,
    role: "bidder",
    card: { title: "Бизнес", bodyText: "", downPaymentCents: 5_000, cashflowCents: 100 },
    rows: [],
    resolved: false,
    hasResponded: false,
    bidDraft: "",
    currentCashCents: 5_001,
    submitting: false,
    onBidDraftChange: () => {},
    onBid: () => {},
    onDecline: () => {},
    onSelect: () => {},
    onCancel: () => {}
  }));
  assert.match(html, /<section/);
  assert.doesNotMatch(html, /aria-modal|deal-auction-overlay/);
  assert.match(html, /step="1"/);
  assert.match(html, /до <strong>1\s\$<\/strong>/);
});

test("игрок без наличных видит возможность взять кредит и сам отказаться", () => {
  const html = renderToStaticMarkup(createElement(DealAuctionDialog, {
    open: true,
    role: "bidder",
    card: { title: "Бизнес", bodyText: "", downPaymentCents: 5_000, cashflowCents: 100 },
    rows: [],
    resolved: false,
    hasResponded: false,
    bidDraft: "",
    currentCashCents: 0,
    submitting: false,
    onBidDraftChange: () => {},
    onBid: () => {},
    onDecline: () => {},
    onSelect: () => {},
    onCancel: () => {}
  }));
  assert.match(html, /можете взять кредит или отказаться самостоятельно/);
  assert.match(html, /Отказаться/);
  assert.doesNotMatch(html, /отказ учтён автоматически/);
});

test("принимает только целую положительную ставку в доступном диапазоне", () => {
  assert.equal(validDealAuctionBid(1_000, 7_000), true);
  assert.equal(validDealAuctionBid(1, 1), true);
  assert.equal(validDealAuctionBid(7_001, 7_000), false);
  assert.equal(validDealAuctionBid(10.5, 7_000), false);
  assert.equal(validDealAuctionBid("", 7_000), false);
});
