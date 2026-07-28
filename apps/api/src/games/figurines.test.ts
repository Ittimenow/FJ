import assert from "node:assert/strict";
import test from "node:test";
import { figurines, isFigurineId } from "@cashflow/shared";

test("figurine catalog contains 50 unique valid identifiers", () => {
  assert.equal(figurines.length, 50);
  const ids = figurines.map((figurine) => figurine.id);
  assert.equal(new Set(ids).size, 50);
  assert.ok(ids.every((id) => isFigurineId(id)));
  assert.equal(isFigurineId("unknown-figurine"), false);
});
