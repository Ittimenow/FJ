import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { uniqueJournalCardText } from "./journal-card.logic";

test("inheritance keeps the story and one copy of every financial term", () => {
  const cards = JSON.parse(readFileSync(new URL("../../../../../dist/recognized_202_cards_ru.json", import.meta.url), "utf8"));
  const card = cards.find((item: {slug:string}) => item.slug === "set_202_capital_32");
  const result = uniqueJournalCardText({...card,
    financialDetails:["Цена: 60 000 $", "Первоначальный взнос: 9 000 $", "Ипотека: 51 000 $", "Оплата при покупке: 3 000 $"],
    effectDetails:["Денежный поток: 300 $/мес"]
  });
  assert.match(result.bodyText, /Двоюродная бабушка/);
  assert.match(result.bodyText, /\$3000 гонорара юристу/);
  assert.match(result.bodyText, /40%/);
  assert.match(result.bodyText, /60 000–\$80 000/);
  assert.doesNotMatch(result.bodyText, /Цена:|Ипотека:|Первый взнос:|Денежный поток:/);
  assert.deepEqual(result.financialDetails, ["Цена: 60 000 $", "Первоначальный взнос: 9 000 $", "Ипотека: 51 000 $"]);
});

test("101 and other modes share deduplication across prose, conditions and effects", () => {
  const result = uniqueJournalCardText({title:"Дом",bodyText:"Дом\nДом с первоначальным взносом $6000.\nЦена: $52,000\nДенежный поток: +$20",
    financialDetails:["Цена: 52 000 $", "Первоначальный взнос: 6 000 $", "Денежный поток: 20 $/мес"],
    effectDetails:["Денежный поток: 20 $/мес"]});
  assert.equal(result.bodyText,"Дом с первоначальным взносом $6000.");
  assert.deepEqual(result.financialDetails,["Цена: 52 000 $", "Денежный поток: 20 $/мес"]);
  assert.deepEqual(result.effectDetails,[]);
});

test("deduplication preserves distinct amounts, conditions, ranges and units", () => {
  const bodyText="Цена: $6000\nИпотека: $6000\nДенежный поток: $300 за квартиру\nПри наличии детей заплатите $300\nЦена: $6000–$9000";
  const result=uniqueJournalCardText({title:"Условия",bodyText,financialDetails:["Цена: 7 000 $"],effectDetails:["Денежный поток: 300 $/мес"]});
  assert.equal(result.bodyText,bodyText);
});

test("signed fractional currency and nonbreaking spaces are equivalent only for the same fact", () => {
  const result=uniqueJournalCardText({title:"Объект",bodyText:"Цена: $2 000.01\nДенежный поток: -$12.34\nИпотека: $2000.01",
    financialDetails:["Цена: 2\u00a0000,01 $"],effectDetails:["Денежный поток: -12,34 $/мес"]});
  assert.equal(result.bodyText,"Ипотека: $2000.01");
});
