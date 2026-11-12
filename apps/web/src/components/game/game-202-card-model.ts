import { decks202, rules202, type Deck202, type Property202, type Rule202 } from "@cashflow/shared";
import { money202 } from "./financial-presentation";
import type { JournalCardContent } from "./journal-card";

type Card202Text = { slug: string; title: string; bodyText: string };

const deckAppearance: Record<Deck202, Pick<JournalCardContent, "cardType" | "typeLabel">> = {
  capital: { cardType: "SMALL_DEAL", typeLabel: "Прирост капитала" },
  cashflow: { cardType: "BIG_DEAL", typeLabel: "Денежный поток" },
  market: { cardType: "MARKET", typeLabel: "Рынок" },
  doodad: { cardType: "DOODAD", typeLabel: "Всякая всячина" }
};

// Rules202 stores dollars; do not pass canonical player/task amounts in cents here.
const dollars = (value: number) => money202(Math.round(value * 100));
const monthly = (value: number) => `${dollars(value)}/мес`;

function propertyDetails(property: Property202) {
  return [
    `Цена: ${dollars(property.cost)}`,
    `Первоначальный взнос: ${dollars(property.down)}`,
    `Ипотека: ${dollars(property.mortgage)}`,
    ...(property.fee !== undefined ? [`Оплата при покупке: ${dollars(property.fee)}`] : [])
  ];
}

/** Card terms, not a claim that these effects have already applied to a particular player. */
export function game202CardContent(card: Card202Text, ruleOverride?: Rule202): JournalCardContent {
  const deck = (Object.keys(decks202) as Deck202[]).find(candidate => decks202[candidate].includes(card.slug));
  const financialDetails: string[] = [];
  const effectDetails: string[] = [];
  const rule = ruleOverride ?? rules202[card.slug];

  if (rule) switch (rule.kind) {
    case "property":
      financialDetails.push(...propertyDetails(rule));
      effectDetails.push(`Денежный поток: ${monthly(rule.income)}`);
      break;
    case "market_property":
      financialDetails.push(...propertyDetails(rule.property));
      effectDetails.push(`Денежный поток объекта: ${monthly(rule.property.income)}`);
      if (rule.repair) {
        financialDetails.push(`Отдельный банковский кредит на ремонт: ${dollars(rule.repair)}`);
        effectDetails.push(`Платёж по кредиту на ремонт: ${monthly(rule.repair / 10)}`);
      }
      break;
    case "option":
      financialDetails.push(`${rule.side.toUpperCase()} · ${rule.symbol}`, `Премия за акцию: ${dollars(rule.premium)}`, `Цена исполнения за акцию: ${dollars(rule.strike)}`, "Количество: от 100 до 5 000 акций, кратно 100");
      effectDetails.push("Действует до конца третьего следующего собственного хода", "Исполнение доступно при положительном результате");
      break;
    case "quote":
      financialDetails.push(`Акции: ${rule.symbols.join(", ")}`, `Котировка за акцию: ${dollars(rule.price)}`);
      if (rule.split) effectDetails.push("Количество акций, опционов и коротких позиций удваивается; общие вложения и цена исполнения опционов сохраняются");
      if (rule.bankrupt) effectDetails.push("Прежние акции и опционы списываются; по PUT выплачивается полная цена исполнения, короткие позиции рассчитываются по нулевой цене");
      else effectDetails.push("Открытые короткие позиции рассчитываются по новой котировке");
      if (rule.forced) effectDetails.push("Вытянувший карточку продаёт все свои акции указанной компании по этой цене");
      break;
    case "d2y":
      financialDetails.push(`D2Y · уровень ${rule.level}`);
      if (rule.level === 1) {
        financialDetails.push(`Разовая оплата: ${dollars(200)}`);
        effectDetails.push("Самостоятельного дохода нет; открывает доход следующих уровней");
      } else {
        financialDetails.push(rule.level === 2 ? "Доход активируется при наличии уровня 1" : "Доход активируется при наличии уровней 1 и 2");
        effectDetails.push(`Доход после активации: ${monthly(rule.income)}`);
      }
      break;
    case "right":
      financialDetails.push(`Премия: ${dollars(rule.cost)}`, "Первоначальный взнос за недвижимость оплачивается отдельно");
      effectDetails.push("Приоритет на следующую возможность с недвижимостью; право истекает после использования или отказа");
      break;
    case "investment":
      financialDetails.push(`${rule.repeat ? "Цена одной инвестиции" : "Цена"}: ${dollars(rule.cost)}`);
      effectDetails.push(`${rule.repeat ? "Денежный поток одной инвестиции" : "Денежный поток"}: ${monthly(rule.income)}`);
      break;
    case "expense":
      if (rule.children) financialDetails.push("Применяется при наличии детей");
      if (rule.threshold !== undefined) financialDetails.push(`Применяется, если пассивный доход больше ${monthly(rule.threshold)}`);
      if (rule.university) {
        financialDetails.push(`Оплата наличными: ${dollars(50000)}`, `Или кредит: ${dollars(50000)}`);
        effectDetails.push(`При выборе кредита — платёж ${monthly(1000)}`);
      } else {
        if (rule.cash) effectDetails.push(`Расход${rule.perChild ? " на каждого ребёнка" : ""}: ${dollars(rule.cash)}`);
        if (rule.monthly) effectDetails.push(`Рост ежемесячных расходов: ${monthly(rule.monthly)}`);
        if (rule.loan) effectDetails.push(`Новый долг: ${dollars(rule.loan[0])}`, `Платёж по долгу: ${monthly(rule.loan[1])}`);
      }
      break;
    case "sale": {
      const targets = { house: "Жилой дом", plex: "Объект на 2, 4 или 8 квартир", apartment: "Объект от 2 квартир", large: "Объект от 24 квартир", land: `Земля от ${rule.acres ?? 0} акров`, highest: "Объект с наибольшим денежным потоком" };
      financialDetails.push(targets[rule.filter]);
      if (rule.filter === "highest") financialDetails.push(`Цена продажи: ${rule.price * 100}% стоимости объекта`);
      else if (rule.filter === "land") financialDetails.push(`Цена за ${rule.acres ?? 0} акров: ${dollars(rule.price)}`);
      else financialDetails.push(`Цена продажи${rule.filter === "house" ? " объекта" : " за квартиру"}: ${dollars(rule.price)}`);
      effectDetails.push("Из выручки погашается ипотека; остаток распределяется между владельцами по долям");
      break;
    }
    case "exchange":
      financialDetails.push(rule.units === 1 ? "Для обмена нужен жилой дом" : `Для обмена нужен объект на ${rule.units} квартир`, `Стоимость нового объекта: ${dollars(rule.property.cost)}`, `Ипотека нового объекта: ${dollars(rule.property.mortgage)}`);
      effectDetails.push(`Денежный поток нового объекта: ${monthly(rule.property.income)}`, "При обмене доли владельцев сохраняются; требуется согласие всех владельцев");
      break;
    case "rent":
      financialDetails.push("Применяется ко всем объектам с квартирами");
      effectDetails.push(`Изменение денежного потока: ${rule.amount > 0 ? "+" : ""}${monthly(rule.amount)} за квартиру`);
      if (rule.amount < 0) effectDetails.push("Объект с отрицательным потоком можно передать банку за половину первоначального взноса");
      break;
    case "wedding":
      financialDetails.push("Применяется при наличии детей");
      effectDetails.push(`Расход: ${dollars(rule.cost)}`, "Один ребёнок покидает семью; его ежемесячные расходы и платёж по одному образовательному кредиту прекращаются");
      break;
    case "auction":
      financialDetails.push("Закрытая ставка в пределах наличных");
      effectDetails.push("Победитель получает постоянный выбор 1–3 кубиков; вытянувший карточку получает 10% победившей ставки");
      break;
    case "airport":
      financialDetails.push("Объект вытянувшего карточку с наибольшим денежным потоком");
      effectDetails.push("Объект изымается; первоначальный взнос возвращается владельцам по долям");
      break;
    case "disaster":
      financialDetails.push("Объект вытянувшего карточку с наибольшим денежным потоком");
      effectDetails.push("Денежный поток объекта становится нулевым; продажа запрещена до следующего круга каждого владельца", "Застрахованные владельцы получают свою долю первоначального взноса");
      break;
    case "insurance":
      financialDetails.push(`Страховой платёж: ${monthly(200)}`);
      effectDetails.push("Страховая защита недвижимости по условиям карточек рынка");
      break;
    case "contamination":
      financialDetails.push(`Очистка участка: ${dollars(50000)}`);
      effectDetails.push("Без страховки нужно оплатить очистку или отказаться от объекта");
      break;
    case "mentor":
      effectDetails.push("В течение трёх следующих собственных ходов можно заменить одну карточку за ход");
      break;
    default: {
      const exhaustive: never = rule;
      return exhaustive;
    }
  }

  return {
    ...(deck ? deckAppearance[deck] : { cardType: "", typeLabel: "Карточка" }),
    title: card.title,
    bodyText: card.bodyText,
    financialDetails,
    effectDetails
  };
}
