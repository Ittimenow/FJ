import assert from "node:assert/strict";
import test from "node:test";
import { MetricsService } from "./metrics.service";

test("calculates operation percentiles and failures", () => {
  const metrics = new MetricsService();
  for (const duration of [10, 20, 30, 40, 100]) {
    metrics.record("http GET /api/games", duration);
  }
  metrics.record("http GET /api/games", 120, "error");

  const snapshot = metrics.snapshot();
  const operation = snapshot[0];
  assert.equal(operation?.count, 6);
  assert.equal(operation?.errors, 1);
  assert.equal(operation?.p50Ms, 30);
  assert.equal(operation?.p95Ms, 120);
  assert.equal(operation?.maxMs, 120);
});

test("normalizes identifiers in metric names", () => {
  const metrics = new MetricsService();
  metrics.record("http GET /api/games/70b9d562-c909-4b18-b8f7-cd28809c0b6a", 15);
  assert.equal(metrics.snapshot()[0]?.name, "http GET /api/games/:id");
});
