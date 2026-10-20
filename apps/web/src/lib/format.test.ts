import assert from "node:assert/strict";
import test from "node:test";
import { shortDate } from "./format";

test("shows the game creation time in the player's time zone", () => {
  const createdAt = "2026-10-19T19:43:00.000Z";

  assert.match(shortDate(createdAt, "Europe/Moscow"), /22:43/);
  assert.match(shortDate(createdAt, "UTC"), /19:43/);
});

test("uses the player's local date when the time zone crosses midnight", () => {
  assert.match(shortDate("2026-10-19T21:43:00.000Z", "Europe/Moscow"), /20 окт.*00:43/);
});
