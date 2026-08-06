export const realtimeEvents = {
  playerRollDice: "player:roll_dice",
  playerMove: "player:move",
  cardDraw: "card:draw",
  dealBuy: "deal:buy",
  dealSell: "deal:sell",
  loanTake: "loan:take",
  loanRepay: "loan:repay",
  paycheckReceive: "paycheck:receive",
  babyGift: "player:baby_gift",
  stateUpdate: "state:update",
  gamePaused: "game:paused",
  gameResumed: "game:resumed",
  gamePeriodStarted: "game:period_started",
  gameEnded: "game:ended",
  chatMessage: "chat:message"
} as const;

export type RealtimeEventName =
  (typeof realtimeEvents)[keyof typeof realtimeEvents];
