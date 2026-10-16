import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { scheduledInstant } from "./scheduled-game";

test("время ведущего преобразуется в один момент", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(scheduledInstant("2026-07-10T18:30", "Europe/Moscow", now).toISOString(), "2026-07-10T15:30:00.000Z");
});

test("несуществующее и неоднозначное время отклоняется", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.throws(() => scheduledInstant("2026-03-29T02:30", "Europe/Berlin", now));
  assert.throws(() => scheduledInstant("2026-10-25T02:30", "Europe/Berlin", now));
});

test("прошедшая дата и некорректный пояс отклоняются", () => {
  const now = new Date("2026-10-16T00:00:00Z");
  assert.throws(() => scheduledInstant("2026-10-15T18:00", "Europe/Moscow", now));
  assert.throws(() => scheduledInstant("2026-10-17T18:00", "Mars/Base", now));
});
