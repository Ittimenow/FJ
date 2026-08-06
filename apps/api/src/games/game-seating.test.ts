import assert from "node:assert/strict";
import test from "node:test";
import { nextAvailableSeat } from "./game-seating";

test("назначает первое свободное место без верхней границы", () => {
  assert.equal(nextAvailableSeat([1, 2, 3, 4, 5, 6]), 7);
  assert.equal(nextAvailableSeat([1, 2, 4, 7]), 3);
});

test("игнорирует недопустимые номера мест", () => {
  assert.equal(nextAvailableSeat([0, -1, 1, 2.5]), 2);
});
