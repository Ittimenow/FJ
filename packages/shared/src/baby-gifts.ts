export const babyGiftTurnWindow = 3;

const playerTurnStartEventTypes = new Set([
  "player:roll_dice",
  "turn:skipped",
  "bankruptcy:turn_skipped"
]);

export type BabyGiftWindowEvent = {
  type: string;
  sequence: number;
};

export function babyGiftTurnsStartedAfter(
  events: BabyGiftWindowEvent[],
  birthEventSequence: number
) {
  return events.filter(
    (event) =>
      event.sequence > birthEventSequence &&
      playerTurnStartEventTypes.has(event.type)
  ).length;
}

export function isBabyGiftWindowOpen(
  events: BabyGiftWindowEvent[],
  birthEventSequence: number
) {
  return babyGiftTurnsStartedAfter(events, birthEventSequence) <= babyGiftTurnWindow;
}
