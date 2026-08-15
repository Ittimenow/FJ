import assert from "node:assert/strict";
import test from "node:test";
import {
  dealAuctionMaxBidCents,
  validDealAuctionBid
} from "./deal-auction-dialog";

test("ставка учитывает деньги, зарезервированные на первоначальный взнос", () => {
  assert.equal(dealAuctionMaxBidCents(12_000, 5_000), 7_000);
  assert.equal(dealAuctionMaxBidCents(4_000, 5_000), 0);
});

test("принимает только целую положительную ставку в доступном диапазоне", () => {
  assert.equal(validDealAuctionBid(1_000, 7_000), true);
  assert.equal(validDealAuctionBid(7_001, 7_000), false);
  assert.equal(validDealAuctionBid(10.5, 7_000), false);
  assert.equal(validDealAuctionBid("", 7_000), false);
});
