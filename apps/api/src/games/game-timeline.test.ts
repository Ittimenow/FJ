import assert from "node:assert/strict";
import test from "node:test";
import {
  gameTimeline,
  pauseGameTimeline,
  periodDurationSeconds,
  resumeGameTimeline,
  startGameTimeline
} from "./game-timeline";

test("splits a 90 minute game into three 30 minute periods", () => {
  assert.equal(periodDurationSeconds(90, 3, 1), 1800);
  assert.equal(periodDurationSeconds(90, 3, 2), 1800);
  assert.equal(periodDurationSeconds(90, 3, 3), 1800);
});

test("keeps the exact total duration when periods are uneven", () => {
  const durations = [1, 2, 3, 4].map((period) =>
    periodDurationSeconds(45, 4, period)
  );
  assert.equal(durations.reduce((sum, duration) => sum + duration, 0), 45 * 60);
});

test("manual pause freezes and restores the current period timer", () => {
  const startedAt = new Date("2026-08-03T10:00:00.000Z");
  const started = startGameTimeline(
    { timeLimitMinutes: 90, periodCount: 3 },
    startedAt
  );
  const paused = pauseGameTimeline(
    started,
    startedAt,
    new Date("2026-08-03T10:10:00.000Z"),
    "manual"
  );
  const pausedTimeline = gameTimeline(paused, startedAt);
  assert.equal(pausedTimeline.currentPeriod, 1);
  assert.equal(pausedTimeline.remainingPeriodSeconds, 1200);

  const resumedAt = new Date("2026-08-03T10:20:00.000Z");
  const resumed = resumeGameTimeline(paused, startedAt, resumedAt);
  assert.equal(resumed.startsNextPeriod, false);
  assert.equal(
    gameTimeline(resumed.settings, startedAt).periodDeadlineAt?.toISOString(),
    "2026-08-03T10:40:00.000Z"
  );
});

test("resuming an automatic break starts the next full period", () => {
  const startedAt = new Date("2026-08-03T10:00:00.000Z");
  const started = startGameTimeline(
    { timeLimitMinutes: 90, periodCount: 3 },
    startedAt
  );
  const paused = pauseGameTimeline(
    started,
    startedAt,
    new Date("2026-08-03T10:30:00.000Z"),
    "period_complete"
  );
  const resumedAt = new Date("2026-08-03T10:35:00.000Z");
  const resumed = resumeGameTimeline(paused, startedAt, resumedAt);
  const timeline = gameTimeline(resumed.settings, startedAt);
  assert.equal(resumed.startsNextPeriod, true);
  assert.equal(timeline.currentPeriod, 2);
  assert.equal(timeline.periodDeadlineAt?.toISOString(), "2026-08-03T11:05:00.000Z");
});

test("timeless game never creates a deadline", () => {
  const startedAt = new Date("2026-08-10T10:00:00.000Z");
  const started = startGameTimeline(
    { timeLimitMinutes: null, periodCount: 1 },
    startedAt
  );
  const timeline = gameTimeline(started, startedAt);

  assert.equal(timeline.timeLimitMinutes, null);
  assert.equal(timeline.periodDeadlineAt, null);
  assert.equal(timeline.remainingPeriodSeconds, null);
});

test("player exit pauses and resumes a timeless game without adding a timer", () => {
  const startedAt = new Date("2026-08-10T10:00:00.000Z");
  const started = startGameTimeline(
    { timeLimitMinutes: null, periodCount: 1 },
    startedAt
  );
  const paused = pauseGameTimeline(
    started,
    startedAt,
    new Date("2026-08-10T10:15:00.000Z"),
    "player_left"
  );
  const pausedTimeline = gameTimeline(paused, startedAt);

  assert.equal(pausedTimeline.pauseReason, "player_left");
  assert.equal(pausedTimeline.remainingPeriodSeconds, null);

  const resumed = resumeGameTimeline(
    paused,
    startedAt,
    new Date("2026-08-10T11:00:00.000Z")
  );
  const resumedTimeline = gameTimeline(resumed.settings, startedAt);
  assert.equal(resumed.startsNextPeriod, false);
  assert.equal(resumedTimeline.periodDeadlineAt, null);
  assert.equal(resumedTimeline.pauseReason, null);
});
