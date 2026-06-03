export const realtimeEvents = {
  playerRollDice: "player:roll_dice",
  playerMove: "player:move",
  cardDraw: "card:draw",
  dealBuy: "deal:buy",
  dealSell: "deal:sell",
  loanTake: "loan:take",
  loanRepay: "loan:repay",
  paycheckReceive: "paycheck:receive",
  stateUpdate: "state:update",
  gameEnded: "game:ended",
  chatMessage: "chat:message"
} as const;

export type RealtimeEventName =
  (typeof realtimeEvents)[keyof typeof realtimeEvents];
