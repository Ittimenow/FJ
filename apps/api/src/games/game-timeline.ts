import { Prisma } from "@prisma/client";

export const defaultGameTimeLimitMinutes = 90;
export const defaultGamePeriodCount = 1;

export type GamePauseReason = "manual" | "period_complete";

export interface GameTimeline {
  timeLimitMinutes: number;
  periodCount: number;
  currentPeriod: number;
  periodDeadlineAt: Date | null;
  remainingPeriodSeconds: number | null;
  pauseReason: GamePauseReason | null;
  pausedAt: Date | null;
}

function settingsRecord(settings: Prisma.JsonValue): Record<string, unknown> {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? { ...(settings as Record<string, unknown>) }
    : {};
}

function positiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function dateValue(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function periodDurationSeconds(
  timeLimitMinutes: number,
  periodCount: number,
  period: number
) {
  const totalSeconds = positiveInteger(timeLimitMinutes, defaultGameTimeLimitMinutes) * 60;
  const count = positiveInteger(periodCount, defaultGamePeriodCount);
  const normalizedPeriod = Math.min(Math.max(positiveInteger(period, 1), 1), count);
  const baseDuration = Math.floor(totalSeconds / count);
  return normalizedPeriod === count
    ? baseDuration + (totalSeconds % count)
    : baseDuration;
}

export function gameTimeline(
  settings: Prisma.JsonValue,
  startedAt: Date | null
): GameTimeline {
  const record = settingsRecord(settings);
  const timeLimitMinutes = positiveInteger(
    record.timeLimitMinutes,
    defaultGameTimeLimitMinutes
  );
  const periodCount = positiveInteger(record.periodCount, defaultGamePeriodCount);
  const currentPeriod = Math.min(
    positiveInteger(record.currentPeriod, 1),
    periodCount
  );
  const storedDeadline = dateValue(record.periodDeadlineAt);
  const fallbackDeadline = startedAt
    ? new Date(
        startedAt.getTime() +
          periodDurationSeconds(timeLimitMinutes, periodCount, currentPeriod) * 1000
      )
    : null;
  const remainingPeriodSeconds =
    typeof record.remainingPeriodSeconds === "number" &&
    Number.isFinite(record.remainingPeriodSeconds) &&
    record.remainingPeriodSeconds >= 0
      ? Math.ceil(record.remainingPeriodSeconds)
      : null;
  const pauseReason =
    record.pauseReason === "manual" || record.pauseReason === "period_complete"
      ? record.pauseReason
      : null;

  return {
    timeLimitMinutes,
    periodCount,
    currentPeriod,
    periodDeadlineAt: storedDeadline ?? fallbackDeadline,
    remainingPeriodSeconds,
    pauseReason,
    pausedAt: dateValue(record.pausedAt)
  };
}

export function startGameTimeline(settings: Prisma.JsonValue, now: Date) {
  const timeline = gameTimeline(settings, null);
  const duration = periodDurationSeconds(
    timeline.timeLimitMinutes,
    timeline.periodCount,
    1
  );
  return {
    ...settingsRecord(settings),
    currentPeriod: 1,
    periodDeadlineAt: new Date(now.getTime() + duration * 1000).toISOString(),
    remainingPeriodSeconds: null,
    pauseReason: null,
    pausedAt: null
  } as Prisma.JsonObject;
}

export function pauseGameTimeline(
  settings: Prisma.JsonValue,
  startedAt: Date | null,
  now: Date,
  reason: GamePauseReason
) {
  const timeline = gameTimeline(settings, startedAt);
  const remaining =
    reason === "period_complete"
      ? 0
      : Math.max(
          0,
          Math.ceil(((timeline.periodDeadlineAt?.getTime() ?? now.getTime()) - now.getTime()) / 1000)
        );
  return {
    ...settingsRecord(settings),
    currentPeriod: timeline.currentPeriod,
    periodDeadlineAt: timeline.periodDeadlineAt?.toISOString() ?? null,
    remainingPeriodSeconds: remaining,
    pauseReason: reason,
    pausedAt: now.toISOString()
  } as Prisma.JsonObject;
}

export function resumeGameTimeline(
  settings: Prisma.JsonValue,
  startedAt: Date | null,
  now: Date
) {
  const timeline = gameTimeline(settings, startedAt);
  const startsNextPeriod = timeline.pauseReason === "period_complete";
  const currentPeriod = startsNextPeriod
    ? Math.min(timeline.currentPeriod + 1, timeline.periodCount)
    : timeline.currentPeriod;
  const remainingSeconds = startsNextPeriod
    ? periodDurationSeconds(
        timeline.timeLimitMinutes,
        timeline.periodCount,
        currentPeriod
      )
    : timeline.remainingPeriodSeconds ??
      periodDurationSeconds(
        timeline.timeLimitMinutes,
        timeline.periodCount,
        currentPeriod
      );

  return {
    settings: {
      ...settingsRecord(settings),
      currentPeriod,
      periodDeadlineAt: new Date(now.getTime() + remainingSeconds * 1000).toISOString(),
      remainingPeriodSeconds: null,
      pauseReason: null,
      pausedAt: null
    } as Prisma.JsonObject,
    currentPeriod,
    startsNextPeriod
  };
}
