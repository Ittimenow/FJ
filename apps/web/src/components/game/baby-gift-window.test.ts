import assert from "node:assert/strict";
import test from "node:test";
import {
  babyGiftTurnsStartedAfter,
  isBabyGiftWindowOpen
} from "../../../../../packages/shared/src/baby-gifts";

const event = (sequence: number, type = "player:roll_dice") => ({ sequence, type });

test("keeps a baby gift available through the next three player turns", () => {
  const events = [
    event(11),
    event(12, "state:update"),
    event(13, "turn:skipped"),
    event(14, "bankruptcy:turn_skipped")
  ];

  assert.equal(babyGiftTurnsStartedAfter(events, 10), 3);
  assert.equal(isBabyGiftWindowOpen(events, 10), true);
});

test("closes a baby gift when the fourth following player turn starts", () => {
  const events = [event(11), event(12), event(13), event(14)];

  assert.equal(babyGiftTurnsStartedAfter(events, 10), 4);
  assert.equal(isBabyGiftWindowOpen(events, 10), false);
});
