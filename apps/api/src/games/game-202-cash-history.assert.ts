import assert from "node:assert/strict";
import type { State202 } from "@cashflow/shared";

/** Every player's recorded cash chain must reconcile with the actual transaction, exactly once. */
export function assert202CashHistory(before: State202, after: State202) {
  const rows = after.log.filter(row => row.revision === after.revision && row.cashChangeCents !== undefined);
  for (const previous of before.players) {
    let balance = previous.cash;
    for (const row of rows.filter(row => row.playerId === previous.id)) {
      assert.equal(row.beforeCashCents, balance, `revision ${after.revision}, ${previous.id}: ${row.text}`);
      assert.equal(row.afterCashCents! - row.beforeCashCents!, row.cashChangeCents);
      balance = row.afterCashCents!;
    }
    assert.equal(balance, after.players.find(player => player.id === previous.id)!.cash,
      `revision ${after.revision}, ${previous.id}: every cash change must be recorded once`);
  }
}
