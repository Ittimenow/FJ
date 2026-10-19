import assert from "node:assert/strict";
import test from "node:test";
import { russianCityTimeZone } from "./city-time-zone";

test("determines the zone from city coordinates, including cities in one multi-zone region", () => {
  assert.equal(russianCityTimeZone(55.75, 37.62, "RU-MOW"), "Europe/Moscow");
  assert.equal(russianCityTimeZone(62.03, 129.73, "RU-SA"), "Asia/Yakutsk");
  assert.equal(russianCityTimeZone(67.45, 153.69, "RU-SA"), "Asia/Srednekolymsk");
});

test("corrects Russian border cities assigned to a neighboring country", () => {
  assert.equal(russianCityTimeZone(54.9453423, 22.4928745, "RU-KGD"), "Europe/Kaliningrad");
  assert.equal(russianCityTimeZone(50.372713, 103.286699, "RU-BU"), "Asia/Irkutsk");
});

test("rejects invalid city coordinates", () => {
  assert.throws(() => russianCityTimeZone(NaN, 37, "RU-MOW"));
});
