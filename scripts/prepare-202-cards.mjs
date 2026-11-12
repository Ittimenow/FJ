import { rules202 } from "../packages/shared/dist/game-202/cards.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const sources = [
  ["capital", "cards_prirost_kapitala.md", "Прирост капитала", "SMALL_DEAL", 36, "8e438e1eb11811b6669130409178c9baff80f183c62166bef8f03e49b18fe596"],
  ["cashflow", "cards_sozdanie_denezhnogo_potoka.md", "Создание денежного потока", "BIG_DEAL", 36, "03e82e6be9e2c7051a87d7f632acfbea6ee4dbc256ca69cf0bd0ca687431d070"],
  ["market", "cards_rynok.md", "Рынок", "MARKET", 42, "dd32923c6869e540e01642e590b2bc891e86b67d1b8aa5a5e560d94d479c54a9"],
  ["doodad", "cards-всякая-всячина.md", "Всякая всячина", "DOODAD", 24, "ba5437f157d0e70009149c8dd500608ce47c68341ecccc5b173a6ffba880a54b"]
];

function plain(text) {
  return text.replace(/<br\s*\/?\s*>/gi, "\n").replace(/\\\$/g, "$")
    .replace(/\*\*/g, "").replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function parseSource(group, text) {
  if (group === "capital" || group === "cashflow") {
    const heading = group === "capital" ? /^### Карточка (\d+) — (.+)$/gm : /^#### (\d+\.\d+)\. (.+)$/gm;
    const matches = [...text.matchAll(heading)];
    return matches.map((match, index) => {
      let body = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length);
      const note = body.match(/^\*\*Примечание к распознаванию:\*\* (.+)$/m)?.[1] ?? "";
      body = body.replace(/^\*\*Позиция:\*\*.*$/gm, "")
        .replace(/^\*\*Примечание к распознаванию:\*\*.*$/gm, "")
        .replace(/^### Фото \d+.*$/gm, "");
      return { id: group === "capital" ? String(Number(match[1])) : match[1], title: plain(match[2]), body: plain(body), note };
    });
  }
  return text.split(/\r?\n/).filter(line => /^\| \d+ \|/.test(line)).map(line => {
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, group === "market" ? 6 : 3, `Неожиданная строка: ${line}`);
    return { id: cells[0], title: plain(cells[group === "market" ? 2 : 1]), body: plain(cells[group === "market" ? 3 : 2]), note: group === "market" ? cells[5] : "" };
  });
}

function money(text, label) {
  const match = text.match(new RegExp(`^${label}:\\s*(?:по )?([+−-]?)\\$([\\d ]+)`, "m"));
  assert.ok(match, `Нет суммы «${label}»: ${text.slice(0, 100)}`);
  return Number(match[2].replaceAll(" ", "")) * (/[−-]/.test(match[1]) ? -1 : 1);
}

function meta(card, values) {
  for (const [metaKey, value] of Object.entries(values)) {
    assert.ok(!card.meta.some(row => row.metaKey === metaKey), `Повтор meta: ${card.slug}/${metaKey}`);
    card.meta.push({ metaKey, metaValue: String(value) });
  }
}

function effect(card, effectType, amountCents, payload = {}) {
  card.effects.push({ effectType, amountCents, payload: card.cardType === "DOODAD" ? { mandatory: true, ...payload } : payload });
}

function property(card) {
  meta(card, {
    price: money(card.bodyText, "Цена"), down_payment: money(card.bodyText, "Первый взнос"),
    mortgage: money(card.bodyText, /Ипотека:/.test(card.bodyText) ? "Ипотека" : "Долг"),
    cashflow_monthly: money(card.bodyText, "Денежный поток")
  });
}

const reasons = {
  derivatives: "Нужны опционы пут/колл, короткие позиции, их обязательное закрытие и отдельные права участников торгов.",
  option: "Нужны премия и цена исполнения опциона, пакеты по 100 акций до 5000, срок три тура и исполнение по чужой карточке.",
  d2y: "Нужна отдельная цепочка D2Y: одна № 1, несколько № 2, одна № 3; прибавки дохода и запрет передачи. Текущая логика поддерживает только TNI/AMWAY.",
  auction: "Движок не распознаёт разрешённую текстом передачу этой возможности на аукционе; покупка поддерживается, но правило передачи — не полностью.",
  propertyOption: "Нужны сохраняемый и продаваемый опцион на чужую недвижимость, перехват сделки и срок действия.",
  quantity: "Нужен выбор количества инвестиционных квартир; интерфейс разрешает количество только для акций.",
  units: "Движок не распознаёт точное число квартир в этой формулировке; продажа и расчёт цены за квартиру требуют поддержки этого типа дома.",
  exchange: "Нужен обмен существующего объекта на новый с заменой стоимости, ипотеки и дохода без списания первого взноса.",
  insurance: "Нужен сохраняемый страховой полис с ежемесячной премией и возмещением убытков.",
  land: "Нужны площадь в акрах и частичная продажа участка с пропорциональным распределением стоимости, ипотеки и дохода; акры не заменяются гектарами.",
  apartmentMarket: "Текстовый разбор относит предложение к домам на 2/4/8 квартир, а не ко всем многоквартирным домам; нужны точные правила продажи больших домов."
};

function capital(card, source) {
  const id = Number(source.id);
  if (/^Опцион/.test(card.title)) {
    card.category = "option";
    return reasons.option;
  }
  if (/^Акции/.test(card.title)) {
    card.category = "stock";
    const symbol = card.bodyText.match(/^Название: (\w+)/m)?.[1];
    assert.ok(symbol);
    const price = money(card.bodyText, "Цена сегодня");
    meta(card, { symbol, today_price: price, price, price_min: 10, price_max: 40 });
    return reasons.derivatives;
  }
  if ([18, 27, 31].includes(id)) {
    card.category = "network_marketing";
    meta(card, { price: 200, down_payment: 200, cashflow_monthly: 0 });
    return reasons.d2y;
  }
  if ([25, 34].includes(id)) {
    card.category = "stock";
    meta(card, { symbol: id === 25 ? "OK4U" : "MYT4U", today_price: 5, price: 5 });
    return `Нужно передать право покупки соседу справа и запретить покупку владельцу хода. ${reasons.derivatives}`;
  }
  assert.ok([4, 6, 8, 9, 19, 20, 24, 30, 32, 33, 36].includes(id));
  card.category = [8, 9, 20, 30].includes(id) ? "land" : "realestate";
  card.subcategory = card.category === "land" ? ([8, 30].includes(id) ? "land_40_acres" : "land_20_acres") : ([32, 33].includes(id) ? "duplex" : "house2u");
  property(card);
  if (id === 32) return "Нужно уточнить расход при наследовании: гонорар $3 000 в тексте и первый взнос $9 000 в числовом поле; значения сохранены без выбора одного из них.";
  if (card.category === "land" || id === 33) return reasons.auction;
  return null;
}

function cashflow(card, source) {
  if (/^Опцион/.test(card.title)) {
    card.category = "option";
    return reasons.propertyOption;
  }
  if (/^Сетевой маркетинг/.test(card.title)) {
    card.category = "network_marketing";
    // Rules are deliberately not approximated by unconditional income effects.
    if (/№ 1$/.test(card.title)) meta(card, { price: 200, down_payment: 200, cashflow_monthly: 0 });
    return reasons.d2y;
  }
  const royalties = { "1.5": [14000, 500], "1.6": [8000, 200], "3.1": [12000, 400], "3.8": [8000, 250] };
  if (royalties[source.id]) {
    const [price, income] = royalties[source.id];
    card.category = "royalty";
    meta(card, { price, down_payment: price, cashflow_monthly: income });
    return null;
  }
  if (["2.5", "2.6", "4.8"].includes(source.id)) {
    card.category = "investment";
    property(card);
    return reasons.quantity;
  }
  assert.match(card.title, /^Продается/);
  card.category = "realestate";
  const units = Number(card.title.match(/на (\d+) сем/)?.[1] ?? card.bodyText.match(/^(\d+) квартир/)?.[1]);
  assert.ok([2, 4, 8, 12, 24, 30, 50].includes(units));
  card.subcategory = units === 2 ? "duplex" : `${units}plex`;
  property(card);
  if ([12, 30, 50].includes(units)) return reasons.units;
  if (source.id === "1.8") return reasons.auction;
  return null;
}

function market(card, source) {
  const id = Number(source.id);
  const homes = { 12: 85000, 24: 80000, 32: 75000 };
  const plexes = { 25: 35000, 26: 30000, 34: 40000 };
  if (homes[id] || plexes[id]) {
    card.category = "realestate";
    // This subtype selects the existing plex target; the text allows all 2/4/8 units.
    card.subcategory = homes[id] ? "house2u" : "2plex";
    meta(card, { price: homes[id] ?? plexes[id] });
    return null;
  }
  const disabled = {
    1: "Нужны покупка по карточке рынка, передача соседу и финансирование ремонта $12 000; условия кредита неразборчивы.",
    2: reasons.exchange,
    3: "Нужны снижение дохода всех арендодателей на $50 за квартиру и возврат убыточной недвижимости банку; доля возвращаемого взноса неразборчива.",
    4: `Нужно дробление с последующими торгами по $40. ${reasons.derivatives}`,
    5: "Нужно предложение $30 000 за квартиру только в домах от 24 квартир; текстовый разбор не задаёт минимальное число квартир.",
    6: "Нужно списать $5 000, уменьшить число детей на одного и связанные расходы, только если есть дети.",
    7: "Нужны благотворительный аукцион с комиссией 10% и право победителя выбирать 1/2/3 кости до конца малого круга.",
    8: `Нужна обязательная продажа всех OK4U владельцем хода по $5. ${reasons.derivatives}`,
    9: "Нужно принудительно изъять объект с наибольшим доходом и вернуть только первый взнос.",
    10: `Нужно дробление с торгами всех игроков по $30. ${reasons.derivatives}`,
    11: "Нужны выбор объекта с максимальным доходом, цена 150% стоимости и передача предложения первому подходящему соседу.",
    13: `Нужны банкротство и постоянное снятие OK4U с торгов. ${reasons.derivatives}`,
    14: `Нужны банкротство и новое размещение OK4U по $4. ${reasons.derivatives}`,
    15: reasons.land,
    16: `Нужна обязательная продажа всех MYT4U владельцем хода по $5. ${reasons.derivatives}`,
    17: "Нужно списать $2 000, уменьшить число детей на одного и связанные расходы, только если есть дети.",
    18: "Нужны обнуление дохода объекта с максимальным потоком, запрет продажи до следующего круга и выплата по страховке.",
    19: reasons.exchange,
    20: reasons.land,
    21: `Нужны банкротство и новое размещение MYT4U по $4. ${reasons.derivatives}`,
    22: reasons.insurance,
    23: reasons.exchange,
    27: reasons.insurance,
    28: reasons.land,
    29: "Нужны покупка по карточке рынка с нулевым взносом и передача этой возможности соседу справа.",
    30: "Нужно найти подходящего соседа, предложить оплату очистки $50 000 или потерю объекта и учесть страховку.",
    31: `Нужны банкротство и постоянное снятие MYT4U с торгов. ${reasons.derivatives}`,
    33: `Нужно дробление с последующими торгами по $30. ${reasons.derivatives}`,
    35: `Нужно дробление с последующими торгами по $40. ${reasons.derivatives}`,
    36: reasons.apartmentMarket,
    37: "Нужно сохраняемое право перебрать карточку в течение трёх ходов и взаимодействие с опционами недвижимости.",
    38: reasons.d2y,
    39: reasons.exchange,
    40: `Нужны торги сразу по OK4U и MYT4U по $10 с запретом обычной покупки. ${reasons.derivatives}`,
    41: reasons.apartmentMarket,
    42: "Нужно увеличить доход всех арендодателей на $30 за каждую сдаваемую квартиру."
  };
  assert.ok(disabled[id], `Не разобрана карточка рынка ${id}`);
  // Full source text is retained; incomplete automatic market effects are not installed.
  return disabled[id];
}

function doodad(card, source) {
  const id = Number(source.id);
  card.category = "expense";
  if ([2, 4, 6, 10, 21].includes(id)) card.conditions.push({ condType: "has_children", payload: {} });
  const cash = { 1: 100, 2: 500, 3: 25000, 6: 50, 7: 1500, 12: 20000, 13: 12000, 15: 3000, 17: 10, 19: 500, 20: 20, 21: 3000, 22: 15000 };
  const monthly = { 2: 100, 4: 200, 5: 20, 8: 150, 9: 1000, 11: 30, 12: 400, 13: 140, 14: 80, 16: 100, 18: 750, 21: 150, 23: 200, 24: 500 };
  if (cash[id]) effect(card, "cash.adjust", -cash[id]);
  if (monthly[id]) effect(card, "cashflow.adjust", -monthly[id]);
  if (id === 6) meta(card, { per_child: true });
  const loans = { 3: [50000, 500, "mortgage"], 13: [20000, 260, "mortgage"], 21: [5000, 250, "car_loan"] };
  if (loans[id]) {
    const [balance, payment, type] = loans[id];
    effect(card, "liability.create", balance, { type, name: card.title, paymentCents: payment });
  }
  if (id === 10) {
    meta(card, { payment_choice: "cash_or_credit", cash_price: 50000, credit_balance: 50000, credit_payment: 1000 });
    return "Выбор оплаты наличными/кредитом не проверяет has_children и создаёт кредитную карту вместо образовательного кредита; нужны условный выбор и учёт расходов на ребёнка.";
  }
  if (id === 15) return "Нет условия «пассивный доход строго больше $500»; одного денежного эффекта недостаточно.";
  assert.ok(card.effects.length, `Нет эффекта расхода ${id}`);
  return null;
}

const handlers = { capital, cashflow, market, doodad };
const entries = [];
for (const [group, filename, label, cardType, count, digest] of sources) {
  const raw = readFileSync(new URL(`distr/202/${filename}`, root), "utf8");
  // A changed transcription requires a new rules review before automatic activation.
  assert.equal(createHash("sha256").update(raw).digest("hex"), digest, `Изменился ${filename}: перепроверьте правила и обновите контрольную сумму`);
  const parsed = parseSource(group, raw);
  const expectedIds = group === "cashflow"
    ? Array.from({ length: 36 }, (_, i) => `${Math.floor(i / 9) + 1}.${i % 9 + 1}`)
    : Array.from({ length: count }, (_, i) => String(i + 1));
  assert.deepEqual(parsed.map(row => row.id), expectedIds, `Нумерация ${filename}`);
  for (const source of parsed) {
    const card = {
      cardType, slug: `set_202_${group}_${source.id.replace(".", "_").padStart(2, "0")}`,
      title: source.title, bodyText: source.body, category: null, subcategory: null,
      isActive: false, meta: [], effects: [], conditions: []
    };
    handlers[group](card, source);
    const rule = rules202[card.slug];
    assert.ok(rule, `Нет правила 202: ${card.slug}`);
    const reason = null;
    meta(card, { game_type: "202", game202_rule: JSON.stringify(rule) });
    card.isActive = true;
    assert.ok(card.bodyText.length > 0 && card.bodyText.length <= 4000, card.slug);
    entries.push({ group, filename, label, source, card, reason });
  }
}

const cards = entries.map(entry => entry.card);
assert.equal(cards.length, 138);
assert.equal(new Set(cards.map(card => card.slug)).size, 138);
const active = cards.filter(card => card.isActive).length;
const report = [
  "# Набор и правила 202", "",
  "Подготовлены **138 активных карточек** для отдельного типа игры 202. Все 88 ранее отключённых карточек имеют обработчики в движке 202. Импорт не означает публикацию на gamefj.ru.", "",
  "| Источник | Колода | Всего |", "| --- | --- | ---: |",
  ...sources.map(([,file,label,type,count])=>`| [${label}](../distr/202/${file}) | ${type} | ${count} |`), "",
  "Все исходные тексты и отдельные физические повторы сохранены. Правила привязаны к стабильному slug; поля game_type и game202_rule фиксируют версию и интерпретацию. Карточки используются только новым движком. Старые эффекты остаются справочными полями импорта.", "",
  "Правила, единицы денежных сумм и решения по расхождениям: [правила 202](../docs/game-202-rules.md). Стартовые портфели и типизированные правила: packages/shared/src/game-202/cards.ts.", "",
  "## Сборка", "", "```sh", "npm run build --workspace=@cashflow/shared", "node scripts/prepare-202-cards.mjs", "node scripts/prepare-202-cards.mjs --check", "npm run changes:check", "```", "",
  "## Импорт", "", "Использовать проверенную DATABASE_URL. Схема дополняется packages/database/prisma/deploy/20261111_add_game_202.sql. Набор не назначается основным; остальные наборы и карточки не удаляются.", "", "```sh",
  'npm run db:import-cards -- --set "202" --file "$PWD/dist/recognized_202_cards_ru.json" --dry-run',
  'npm run db:import-cards -- --set "202" --file "$PWD/dist/recognized_202_cards_ru.json" --apply',
  'npm run db:import-cards -- --set "202" --file "$PWD/dist/recognized_202_cards_ru.json" --dry-run', "```", "",
  "Production не изменялся. Для публикации требуется отдельное разрешение. Повторный импорт должен показать created=0, updated=0, unchanged=138.", "",
  "## Реестр карточек", "", "| Группа | № | Slug | Карточка | Статус | Правило |", "| --- | --- | --- | --- | --- | --- |",
  ...entries.map(({label,source,card})=>`| ${label} | ${source.id} | ${card.slug} | ${card.title} | Активна | ${rules202[card.slug].kind}${source.note ? `; ${source.note}` : ""} |`), ""
].join("\n");

const check = process.argv.includes("--check");
assert.ok(process.argv.slice(2).every(arg => arg === "--check"), "Использование: node scripts/prepare-202-cards.mjs [--check]");
for (const [filename, content] of [["dist/recognized_202_cards_ru.json", `${JSON.stringify(cards, null, 2)}\n`], ["reports/card-set-202.md", report]]) {
  const path = new URL(filename, root);
  if (check) assert.equal(readFileSync(path, "utf8"), content, `Пересоберите ${filename}`);
  else writeFileSync(path, content);
}
console.log(`Набор 202: ${cards.length} карточек, ${active} активны, ${cards.length - active} отключены; ${check ? "артефакты совпадают" : "файлы записаны"}.`);
