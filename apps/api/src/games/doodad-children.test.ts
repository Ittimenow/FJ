import assert from "node:assert/strict";
import test from "node:test";
import { GamesService } from "./games.service";

test("child-only doodad charges nothing without children and scales per child", async () => {
  const service = new GamesService({} as any);
  const card = { id: 1, title: "Новые игрушки для ваших детей", conditions: [{ condType: "has_children", payload: {} }] };
  const effect = { effectType: "cash_delta", amountCents: -50n, payload: { mandatory: true } };
  let childrenCount = 0;
  const updates: unknown[] = [];
  const tx = { playerFinancialState: {
    findUniqueOrThrow: async () => ({ childrenCount }),
    update: async (input: unknown) => { updates.push(input); }
  } };
  const withoutChildren: any[] = [];
  const apply = (events: any[]) => (service as any).applyCashAdjustAction(tx, {
    gamePlayerId: "player", card, emittedEvents: events, mode: "mandatory_expense"
  }, effect, { per_child: "true" });

  assert.equal(await apply(withoutChildren), false);
  assert.deepEqual(updates, []);
  assert.equal(withoutChildren[0]?.type, "card:condition_not_met");

  childrenCount = 2;
  const withChildren: any[] = [];
  assert.equal(await apply(withChildren), true);
  assert.deepEqual((updates[0] as any).data.cashCents, { decrement: 100n });
  assert.equal(withChildren[0]?.payload.amountCents, -100);
});
