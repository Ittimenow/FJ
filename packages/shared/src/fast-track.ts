// Catalogue: dist/skorostnaya-dorozhka-yacheyki-proverennye.md. Amounts are whole game dollars.
export type FastTrackRule =
  | { kind: "business" | "dream" | "cashflow" | "charity" | "half_cash" | "lose_cash" }
  | { kind: "chance_business"; minimum: number }
  | { kind: "ipo"; minimum: number; payout: number };
export interface FastTrackCell {
  index: number; code: string; type: "business" | "dream" | "expense" | "positive";
  label: string; description: string; cost: number; income: number; rule: FastTrackRule;
  roi?: string; sourceNote?: string;
}
export const fastTrackCells: FastTrackCell[] = [
  {
    "index": 0,
    "code": "1м",
    "type": "dream",
    "label": "Купите лес",
    "description": "остановите вырубку вековых деревьев, пожертвуйте 1000 акров леса и создайте прогулочные маршруты.",
    "cost": 250000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 1,
    "code": "2б",
    "type": "business",
    "label": "Семейная сеть ресторанов",
    "description": "Добровольная покупка при остановке. После покупки денежный поток прибавляется к доходу Дня CASHFLOW.",
    "cost": 300000,
    "income": 14000,
    "rule": {
      "kind": "business"
    },
    "roi": "56%"
  },
  {
    "index": 2,
    "code": "3м",
    "type": "dream",
    "label": "Ложа на стадионе профессиональной команды",
    "description": "годовой абонемент в частную ложу на 12 персон с едой и напитками.",
    "cost": 200000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 3,
    "code": "4б",
    "type": "business",
    "label": "Франшиза закусочной",
    "description": "Добровольная покупка при остановке; после покупки клетка закрывается для других игроков.",
    "cost": 300000,
    "income": 9500,
    "rule": {
      "kind": "business"
    },
    "roi": "38%"
  },
  {
    "index": 4,
    "code": "5м",
    "type": "dream",
    "label": "Древние города Азии",
    "description": "путешествие на частном самолёте с частным гидом для игрока и пяти друзей.",
    "cost": 150000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 5,
    "code": "6б",
    "type": "business",
    "label": "Ресторан быстрого питания (3 торговые точки)",
    "description": "Три торговые точки. Покупка увеличивает доход Дня CASHFLOW на $5 000.",
    "cost": 120000,
    "income": 5000,
    "rule": {
      "kind": "business"
    },
    "roi": "50%"
  },
  {
    "index": 6,
    "code": "7м",
    "type": "dream",
    "label": "Фондовая биржа детей",
    "description": "открыть школу бизнеса и инвестирования с учебной фондовой биржей.",
    "cost": 125000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 7,
    "code": "8о",
    "type": "positive",
    "label": "Благотворительность",
    "description": "Добровольная оплата даёт право до конца игры выбирать один, два или три кубика перед каждым ходом.",
    "cost": 100000,
    "income": 0,
    "rule": {
      "kind": "charity"
    }
  },
  {
    "index": 8,
    "code": "9б",
    "type": "business",
    "label": "Компания коммунальных услуг",
    "description": "Покупка увеличивает доход Дня CASHFLOW на $10 000.",
    "cost": 200000,
    "income": 10000,
    "rule": {
      "kind": "business"
    },
    "roi": "66%*",
    "sourceNote": "Требует подтверждения: ROI нужно сверить с фотографией клетки."
  },
  {
    "index": 9,
    "code": "10м",
    "type": "dream",
    "label": "Гонки на яхтах",
    "description": "участие в недельной регате 12-метровых гоночных яхт в Перте.",
    "cost": 150000,
    "income": 0,
    "rule": {
      "kind": "dream"
    },
    "sourceNote": "Требует подтверждения: в исходном тексте указан «Перт (Австрия)»."
  },
  {
    "index": 10,
    "code": "11б",
    "type": "business",
    "label": "Завод запчастей для грузовиков",
    "description": "Добровольная покупка при остановке; после покупки клетка закрывается.",
    "cost": 150000,
    "income": 5000,
    "rule": {
      "kind": "business"
    },
    "roi": "40%"
  },
  {
    "index": 11,
    "code": "12о",
    "type": "positive",
    "label": "День CASHFLOW",
    "description": "При прохождении или остановке игрок получает текущий доход Дня CASHFLOW.",
    "cost": 0,
    "income": 0,
    "rule": {
      "kind": "cashflow"
    }
  },
  {
    "index": 12,
    "code": "13м",
    "type": "dream",
    "label": "Кинофестиваль в Каннах",
    "description": "тур по Франции и неделя на кинофестивале в Каннах.",
    "cost": 125000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 13,
    "code": "14б",
    "type": "business",
    "label": "Купите золотой рудник",
    "description": "После оплаты бросьте одну кость. Результат 3–6 даёт денежный поток; при неудаче выплата равна нулю, клетка остаётся открытой.",
    "cost": 150000,
    "income": 25000,
    "rule": {
      "kind": "chance_business",
      "minimum": 3
    },
    "roi": "200% при успехе"
  },
  {
    "index": 14,
    "code": "15м",
    "type": "dream",
    "label": "Частная рыбацкая хижина на горном озере",
    "description": "шесть месяцев отдыха в удалённой хижине; гидросамолёт включён.",
    "cost": 100000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 15,
    "code": "16ф",
    "type": "expense",
    "label": "Налоговая проверка!",
    "description": "Заплатите Банку половину имеющихся наличных. Баланс не может стать отрицательным.",
    "cost": 0,
    "income": 0,
    "rule": {
      "kind": "half_cash"
    },
    "sourceNote": "Половина наличных округляется вниз: нечётный доллар остаётся игроку."
  },
  {
    "index": 16,
    "code": "17м",
    "type": "dream",
    "label": "Парк развлечений в вашу честь",
    "description": "снести заброшенный склад, построить парк отдыха и поддержать обеспечение порядка.",
    "cost": 225000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 17,
    "code": "18б",
    "type": "business",
    "label": "Франшиза куриных гриль-баров (2 торговые точки)",
    "description": "Две торговые точки. После покупки клетка закрывается для других игроков.",
    "cost": 300000,
    "income": 10000,
    "rule": {
      "kind": "business"
    },
    "roi": "40%"
  },
  {
    "index": 18,
    "code": "19м",
    "type": "dream",
    "label": "Баллотируйтесь в мэры",
    "description": "профинансировать победную избирательную кампанию на пост мэра.",
    "cost": 125000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 19,
    "code": "20б",
    "type": "business",
    "label": "Салоны красоты (3 кабинета)",
    "description": "Три кабинета. Покупка увеличивает доход Дня CASHFLOW на $10 000.",
    "cost": 250000,
    "income": 10000,
    "rule": {
      "kind": "business"
    },
    "roi": "48%"
  },
  {
    "index": 20,
    "code": "21м",
    "type": "dream",
    "label": "Дар церкви",
    "description": "пожертвование религиозной общине на приобретение новой земли.",
    "cost": 175000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 21,
    "code": "22б",
    "type": "business",
    "label": "Авторемонтная мастерская",
    "description": "Отдельный объект владения; не связан с одноимённой клеткой 26.",
    "cost": 150000,
    "income": 6000,
    "rule": {
      "kind": "business"
    },
    "roi": "48%"
  },
  {
    "index": 22,
    "code": "23м",
    "type": "dream",
    "label": "Прыжки на лыжах с вертолёта",
    "description": "сезон лыжных прыжков с вертолёта в Швейцарских Альпах.",
    "cost": 150000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 23,
    "code": "24б",
    "type": "business",
    "label": "Нефтяная сделка в России",
    "description": "После оплаты бросьте одну кость. Результат 4–6 даёт денежный поток; при неудаче выплата равна нулю, клетка остаётся открытой.",
    "cost": 300000,
    "income": 75000,
    "rule": {
      "kind": "chance_business",
      "minimum": 4
    },
    "roi": "300% при успехе"
  },
  {
    "index": 24,
    "code": "25м",
    "type": "dream",
    "label": "Ужин с президентом!",
    "description": "торжественный ужин для игрока и десяти друзей.",
    "cost": 100000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 25,
    "code": "26б",
    "type": "business",
    "label": "Авторемонтная мастерская",
    "description": "Отдельный объект владения; не связан с одноимённой клеткой 22.",
    "cost": 150000,
    "income": 6000,
    "rule": {
      "kind": "business"
    },
    "roi": "48%"
  },
  {
    "index": 26,
    "code": "27м",
    "type": "dream",
    "label": "Научный центр рака и СПИДа",
    "description": "объединить ведущих исследователей и врачей в одном научном центре.",
    "cost": 225000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 27,
    "code": "28о",
    "type": "positive",
    "label": "День CASHFLOW",
    "description": "При прохождении или остановке игрок получает текущий доход Дня CASHFLOW.",
    "cost": 0,
    "income": 0,
    "rule": {
      "kind": "cashflow"
    }
  },
  {
    "index": 28,
    "code": "29м",
    "type": "dream",
    "label": "7 чудес света",
    "description": "кругосветное путешествие разными видами транспорта с обслуживанием высшего класса.",
    "cost": 200000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 29,
    "code": "30б",
    "type": "business",
    "label": "IPO компании программных продуктов",
    "description": "После оплаты бросьте одну кость. Только 6 даёт выплату $500 000. Денежный поток не меняется; после успеха возможность закрывается.",
    "cost": 25000,
    "income": 0,
    "rule": {
      "kind": "ipo",
      "minimum": 6,
      "payout": 500000
    }
  },
  {
    "index": 30,
    "code": "31м",
    "type": "dream",
    "label": "Спасение морских животных",
    "description": "участие в месячной исследовательской экспедиции по спасению исчезающих видов.",
    "cost": 125000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 31,
    "code": "32ф",
    "type": "expense",
    "label": "Развод",
    "description": "Игрок теряет все наличные. Итоговый баланс равен нулю.",
    "cost": 0,
    "income": 0,
    "rule": {
      "kind": "lose_cash"
    }
  },
  {
    "index": 32,
    "code": "33м",
    "type": "dream",
    "label": "Войдите в круг «реактивной» публики",
    "description": "аренда частного реактивного самолёта на один год.",
    "cost": 250000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 33,
    "code": "34б",
    "type": "business",
    "label": "60-квартирный доходный дом",
    "description": "После покупки денежный поток прибавляется к доходу Дня CASHFLOW.",
    "cost": 300000,
    "income": 8000,
    "rule": {
      "kind": "business"
    },
    "roi": "32%"
  },
  {
    "index": 34,
    "code": "35м",
    "type": "dream",
    "label": "Гольф вокруг света",
    "description": "тур для игрока и трёх друзей по 50 лучшим полям для гольфа.",
    "cost": 150000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 35,
    "code": "36б",
    "type": "business",
    "label": "Франшиза пиццерий (2 торговые точки)",
    "description": "Две торговые точки. Покупка увеличивает доход Дня CASHFLOW на $7 000.",
    "cost": 225000,
    "income": 7000,
    "rule": {
      "kind": "business"
    },
    "roi": "37%"
  },
  {
    "index": 36,
    "code": "37м",
    "type": "dream",
    "label": "Детская библиотека",
    "description": "Покупка мечты доступна при остановке на клетке.",
    "cost": 175000,
    "income": 0,
    "rule": {
      "kind": "dream"
    },
    "sourceNote": "Требует подтверждения: название не соответствует распознанному описанию научного центра."
  },
  {
    "index": 37,
    "code": "38б",
    "type": "business",
    "label": "Склад на 200 мини-хранилищ",
    "description": "После покупки денежный поток прибавляется к доходу Дня CASHFLOW.",
    "cost": 200000,
    "income": 6000,
    "rule": {
      "kind": "business"
    },
    "roi": "36%"
  },
  {
    "index": 38,
    "code": "39м",
    "type": "dream",
    "label": "Остров мечты в Южном море",
    "description": "два месяца отдыха на уединённом острове.",
    "cost": 100000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 39,
    "code": "40б",
    "type": "business",
    "label": "IPO биотехнологической компании",
    "description": "После оплаты бросьте одну кость. Результат 5–6 даёт выплату $500 000. Денежный поток не меняется.",
    "cost": 50000,
    "income": 0,
    "rule": {
      "kind": "ipo",
      "minimum": 5,
      "payout": 500000
    }
  },
  {
    "index": 40,
    "code": "41м",
    "type": "dream",
    "label": "Капиталистический конкурс мира",
    "description": "открыть школы предпринимательства в странах третьего мира.",
    "cost": 200000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 41,
    "code": "42б",
    "type": "business",
    "label": "Химчистка (2 цеха)",
    "description": "Два цеха. После покупки клетка закрывается для других игроков.",
    "cost": 100000,
    "income": 3000,
    "rule": {
      "kind": "business"
    },
    "roi": "36%"
  },
  {
    "index": 42,
    "code": "43м",
    "type": "dream",
    "label": "Круиз по Средиземноморью на частной яхте",
    "description": "месячный круиз с двенадцатью друзьями по гаваням Италии, Франции и Греции.",
    "cost": 100000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 43,
    "code": "44о",
    "type": "positive",
    "label": "День CASHFLOW",
    "description": "При прохождении или остановке игрок получает текущий доход Дня CASHFLOW.",
    "cost": 0,
    "income": 0,
    "rule": {
      "kind": "cashflow"
    }
  },
  {
    "index": 44,
    "code": "45м",
    "type": "dream",
    "label": "Мини-ферма в городе",
    "description": "создать экологичную городскую ферму для обучения детей заботе о животных и растениях.",
    "cost": 150000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 45,
    "code": "46б",
    "type": "business",
    "label": "Рекламное агентство кухонной посуды",
    "description": "После оплаты бросьте одну кость. Результат 4–6 даёт денежный поток; при неудаче клетка остаётся открытой.",
    "cost": 225000,
    "income": 50000,
    "rule": {
      "kind": "chance_business",
      "minimum": 4
    },
    "roi": "266,67% при успехе"
  },
  {
    "index": 46,
    "code": "47м",
    "type": "dream",
    "label": "Фотоохота в Африке",
    "description": "сафари для игрока и шести друзей с пятизвёздочным размещением.",
    "cost": 100000,
    "income": 0,
    "rule": {
      "kind": "dream"
    }
  },
  {
    "index": 47,
    "code": "48ф",
    "type": "expense",
    "label": "Судебный иск!!!",
    "description": "Заплатите Банку половину имеющихся наличных. После клетки маршрут возвращается к клетке 1.",
    "cost": 0,
    "income": 0,
    "rule": {
      "kind": "half_cash"
    },
    "sourceNote": "Половина наличных округляется вниз: нечётный доллар остаётся игроку."
  }
];

export interface FastTrackWorld {
  owners: Record<string, string>;
  influence: Record<string, string[]>;
  dreamPurchases: Record<string, string[]>;
}

export function readFastTrackWorld(value: unknown): FastTrackWorld {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<FastTrackWorld> : {};
  return {
    owners: { ...data.owners },
    influence: Object.fromEntries(Object.entries(data.influence ?? {}).map(([key, ids]) => [key, [...ids]])),
    dreamPurchases: Object.fromEntries(Object.entries(data.dreamPurchases ?? {}).map(([key, ids]) => [key, [...ids]]))
  };
}

export const fastTrackDreams = fastTrackCells.filter((cell) => cell.type === "dream");
export const fastTrackWinningIncrease = 50_000;
export function isDreamCell(index: unknown): index is number {
  return typeof index === "number" && Number.isInteger(index) && fastTrackCells[index]?.type === "dream";
}
export function fastTrackPrice(cell: FastTrackCell, playerId: string, dreamCellIndex: number | null, world: FastTrackWorld) {
  return cell.cost * (cell.index === dreamCellIndex
    ? 1 + (world.influence[String(cell.index)] ?? []).filter((id) => id !== playerId).length
    : 1);
}

/** -1 is the entrance arrow, before cell 1. Every crossed payday appears once. */
export function fastTrackRoute(from: number, steps: number) {
  if (!Number.isInteger(from) || from < -1 || from >= 48 || !Number.isInteger(steps) || steps < 1 || steps > 144) {
    throw new Error("Некорректное перемещение по большому кругу");
  }
  return Array.from({ length: steps }, (_, offset) => fastTrackCells[(from + offset + 1) % 48]!);
}

export function fastTrackDiceCount(charity: boolean, requested?: number) {
  const count = requested ?? 2;
  if (!Number.isInteger(count) || (charity ? count < 1 || count > 3 : count !== 2)) {
    throw new Error(charity ? "Выберите от одного до трёх кубиков" : "На большом круге нужно бросать два кубика");
  }
  return count;
}

export interface FastTrackPurchaseInput {
  cell: FastTrackCell; playerId: string; dreamCellIndex: number | null;
  cash: number; income: number; initialIncome: number; charity: boolean;
  world: FastTrackWorld; die?: number | undefined;
}

/** Pure settlement: the caller creates the die on the server after validating the investment. */
export function settleFastTrackPurchase(input: FastTrackPurchaseInput) {
  const { cell, playerId } = input;
  const world = readFastTrackWorld(input.world);
  const kind = cell.rule.kind;
  if (["cashflow", "half_cash", "lose_cash"].includes(kind)) throw new Error("На этой клетке нет покупки");
  if (world.owners[cell.index]) throw new Error("Эта возможность уже занята");
  if (kind === "dream" && world.dreamPurchases[cell.index]?.includes(playerId)) throw new Error("Эта мечта уже куплена");
  if (kind === "charity" && input.charity) throw new Error("Благотворительность уже действует");
  const cost = fastTrackPrice(cell, playerId, input.dreamCellIndex, world);
  if (input.cash < cost) throw new Error("Недостаточно наличных для покупки");
  let cash = input.cash - cost;
  let income = input.income;
  let success = true;
  if (cell.rule.kind === "chance_business" || cell.rule.kind === "ipo") {
    if (!input.die || !Number.isInteger(input.die) || input.die < 1 || input.die > 6) throw new Error("Нужен результат броска одной кости");
    success = input.die >= cell.rule.minimum;
  }
  if (success && ["business", "chance_business", "ipo"].includes(kind)) {
    world.owners[cell.index] = playerId;
    if (cell.rule.kind === "ipo") cash += cell.rule.payout;
    else income += cell.income;
  }
  if (kind === "dream") world.dreamPurchases[cell.index] = [...(world.dreamPurchases[cell.index] ?? []), playerId];
  return {
    cash, income, world, cost, success, charity: input.charity || kind === "charity",
    won: kind === "dream" && input.dreamCellIndex === cell.index ? "dream" as const
      : income - input.initialIncome >= fastTrackWinningIncrease ? "fast_track_income" as const : null
  };
}

export function fastTrackExpense(cash: number, kind: "half_cash" | "lose_cash") {
  // Whole dollars: the bank receives the rounded-down half; the odd dollar stays with the player.
  return kind === "lose_cash" ? cash : Math.floor(cash / 2);
}
