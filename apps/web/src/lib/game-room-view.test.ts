import assert from "node:assert/strict";
import test from "node:test";
import { gameRoomViewForRole } from "./game-room-view";

test("only an administrator can preview the second board", () => {
  for (const role of ["USER", "HOST", null]) {
    assert.equal(gameRoomViewForRole(role, "journey"), "classic");
  }
  assert.equal(gameRoomViewForRole("ADMIN", undefined), "classic");
  assert.equal(gameRoomViewForRole("ADMIN", "classic"), "classic");
  assert.equal(gameRoomViewForRole("ADMIN", "journey"), "journey");
});
