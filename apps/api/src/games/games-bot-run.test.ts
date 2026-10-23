import assert from "node:assert/strict";
import test from "node:test";
import { GamesBotService } from "./games-bot.service";

test("бот продолжает работу после исчерпания лимита действий одного запуска", async () => {
  let actions = 0;
  const service = new GamesBotService(
    {} as never,
    {} as never,
    { broadcastAction: () => undefined } as never,
    { record: () => undefined } as never,
    {} as never
  ) as any;
  service.acquireLease = async () => true;
  service.renewLease = async () => true;
  service.releaseLease = async () => undefined;
  service.loadGame = async () => ({});
  service.nextAction = async () => actions < 33 ? { type: "roll", playerId: "bot" } : null;
  service.execute = async () => {
    actions += 1;
    return {};
  };

  service.kick("game");
  const deadline = Date.now() + 3_000;
  while (actions < 33 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.equal(actions, 33);
});
