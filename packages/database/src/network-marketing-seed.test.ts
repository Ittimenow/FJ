import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const seedFile = resolve(here, "../../../dist/seed_cards.sql");

test("the main card set contains the configured AMWAY level counts", () => {
  const sql = readFileSync(seedFile, "utf8");
  const counts = [1, 2, 3, 4].map((level) => {
    const title = `AMWAY: ${level} уровень`;
    return [...sql.matchAll(new RegExp(`'${title}[^']*'`, "gu"))].length;
  });

  assert.deepEqual(counts, [6, 4, 2, 1]);
});
