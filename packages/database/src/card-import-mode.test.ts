import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveCardImportGameType, type ImportCard, validateCardBatch } from "./card-import";

const root = new URL("../../../", import.meta.url);
const original = JSON.parse(readFileSync(new URL("dist/recognized_original_cards_ru.json", root), "utf8")) as ImportCard[];
const advanced = JSON.parse(readFileSync(new URL("dist/recognized_202_cards_ru.json", root), "utf8")) as ImportCard[];

test("infers the mode from card metadata without depending on the target set name", () => {
  assert.equal(resolveCardImportGameType(validateCardBatch(original).cards), "101");
  assert.equal(resolveCardImportGameType(validateCardBatch(advanced).cards), "202");
  assert.equal(resolveCardImportGameType(validateCardBatch(original).cards, "101", "101"), "101");
  assert.equal(resolveCardImportGameType(validateCardBatch(advanced).cards, "202", "202"), "202");
});

test("rejects a mixed 101 and 202 import even when the requested mode matches one card", () => {
  const mixed = [original[0]!, advanced[0]!];
  for (const requested of [undefined, "101", "202"]) {
    assert.throws(() => resolveCardImportGameType(mixed, requested), /101 и 202 в один набор/);
  }
});

test("rejects mismatches with the requested mode or the existing target set", () => {
  assert.throws(() => resolveCardImportGameType(original, "202"), /не соответствуют выбранному режиму/);
  assert.throws(() => resolveCardImportGameType(advanced, "101"), /не соответствуют выбранному режиму/);
  assert.throws(() => resolveCardImportGameType(original, undefined, "202"), /Набор относится к режиму 202/);
  assert.throws(() => resolveCardImportGameType(advanced, undefined, "101"), /Набор относится к режиму 101/);
  assert.throws(() => resolveCardImportGameType(original, "303"), /--game-type 101\|202/);
});

test("a 202 import cannot silently treat cards missing their mode as advanced", () => {
  const incomplete = structuredClone(advanced);
  incomplete[0]!.meta = incomplete[0]!.meta.filter((row) => row.metaKey !== "game_type");
  assert.throws(() => resolveCardImportGameType(incomplete, "202"), /101 и 202 в один набор/);
  assert.ok(validateCardBatch(incomplete).errors.some((error) => error.message.includes("только для карточки режима 202")));
});

test("validates mode metadata and requires a JSON rule object for 202 cards", () => {
  const invalidMode = structuredClone(advanced[0]!);
  invalidMode.meta.find((row) => row.metaKey === "game_type")!.metaValue = "303";
  assert.ok(validateCardBatch([invalidMode]).errors.some((error) => error.message.includes("game_type должен быть 101 или 202")));

  const missingRule = structuredClone(advanced[0]!);
  missingRule.meta = missingRule.meta.filter((row) => row.metaKey !== "game202_rule");
  assert.ok(validateCardBatch([missingRule]).errors.some((error) => error.message.includes("требует meta.game202_rule")));

  for (const rule of ["not json", "[]", "null", '"rule"']) {
    const invalidRule = structuredClone(advanced[0]!);
    invalidRule.meta.find((row) => row.metaKey === "game202_rule")!.metaValue = rule;
    assert.ok(validateCardBatch([invalidRule]).errors.some((error) => error.message.includes("JSON-объект")), rule);
  }
});

test("explicit 101 metadata remains compatible with legacy cards", () => {
  const card = structuredClone(original[0]!);
  card.meta.push({ metaKey: "game_type", metaValue: "101" });
  const validated = validateCardBatch([card]);
  assert.deepEqual(validated.errors, []);
  assert.equal(resolveCardImportGameType(validated.cards, "101", "101"), "101");
});
