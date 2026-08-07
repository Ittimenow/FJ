import assert from "node:assert/strict";
import test from "node:test";
import {
  contiguousNetworkMarketingLevel,
  networkMarketingLevelDecision
} from "./network-marketing";

test("network marketing levels are accepted only in sequence", () => {
  assert.deepEqual(networkMarketingLevelDecision([], 1), {
    accepted: true,
    currentLevel: 0,
    requiredLevel: 1
  });
  assert.deepEqual(networkMarketingLevelDecision([1], 2), {
    accepted: true,
    currentLevel: 1,
    requiredLevel: 2
  });
  assert.deepEqual(networkMarketingLevelDecision([1, 2, 3], 4), {
    accepted: true,
    currentLevel: 3,
    requiredLevel: 4
  });
});

test("a level drawn before its prerequisite is discarded", () => {
  assert.deepEqual(networkMarketingLevelDecision([], 2), {
    accepted: false,
    currentLevel: 0,
    requiredLevel: 1,
    reason: "missing_previous_level"
  });
  assert.deepEqual(networkMarketingLevelDecision([1], 3), {
    accepted: false,
    currentLevel: 1,
    requiredLevel: 2,
    reason: "missing_previous_level"
  });
});

test("an already acquired level is discarded", () => {
  assert.deepEqual(networkMarketingLevelDecision([1, 2], 2), {
    accepted: false,
    currentLevel: 2,
    requiredLevel: 3,
    reason: "already_has_level"
  });
});

test("stored gaps do not increase the current level", () => {
  assert.equal(contiguousNetworkMarketingLevel([1, 3, 4]), 1);
  assert.equal(contiguousNetworkMarketingLevel([2, 3, 4]), 0);
});
