const cells = [
  { n: 1, l: "м", type: "dream", title: "Купите лес", cost: 250000, rule: "Купите выбранную мечту при наличии наличных. Чужие жетоны увеличивают цену для выбравшего её игрока." },
  { n: 2, l: "б", type: "business", title: "Семейная сеть ресторанов", cost: 300000, flow: 14000, roi: "56%", rule: "Добровольная покупка при остановке. После покупки денежный поток прибавляется к доходу Дня CASHFLOW.", state: "Куплен игроком Анна", mark: "Куплен" },
  { n: 3, l: "м", type: "dream", title: "Ложа на стадионе профессиональной команды", cost: 200000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 4, l: "б", type: "business", title: "Франшиза закусочной", cost: 300000, flow: 9500, roi: "38%", rule: "Добровольная покупка при остановке; после покупки клетка закрывается для других игроков." },
  { n: 5, l: "м", type: "dream", title: "Древние города Азии", cost: 150000, rule: "Целевая мечта игрока. Два чужих жетона увеличили цену до тройной первоначальной стоимости.", state: "Целевая мечта · текущая цена $450 000", mark: "Мечта ×3", markType: "target" },
  { n: 6, l: "б", type: "business", title: "Ресторан быстрого питания (3 торговые точки)", shortTitle: "Фастфуд ×3", cost: 120000, flow: 5000, roi: "50%", rule: "Три торговые точки. Покупка увеличивает доход Дня CASHFLOW на $5 000." },
  { n: 7, l: "м", type: "dream", title: "Фондовая биржа детей", cost: 125000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 8, l: "о", type: "positive", title: "Благотворительность", cost: 100000, flowText: "1–3 кубика", rule: "Добровольная оплата даёт право до конца игры выбирать один, два или три кубика перед каждым ходом." },
  { n: 9, l: "б", type: "business", title: "Компания коммунальных услуг", cost: 200000, flow: 10000, roi: "66%*", rule: "На поле указано 66% ROI, но расчёт по стоимости и потоку даёт 60%.", verification: "Требует подтверждения: ROI нужно сверить с фотографией клетки.", tokens: ["И"] },
  { n: 10, l: "м", type: "dream", title: "Гонки на яхтах", cost: 150000, rule: "Покупка мечты доступна при остановке на клетке.", verification: "Требует подтверждения: в исходном тексте указан «Перт (Австрия)»." },
  { n: 11, l: "б", type: "business", title: "Завод запчастей для грузовиков", cost: 150000, flow: 5000, roi: "40%", rule: "Добровольная покупка при остановке; после покупки клетка закрывается." },
  { n: 12, l: "о", type: "positive", title: "День CASHFLOW", flowText: "Текущий доход", rule: "При прохождении или остановке игрок получает текущий доход Дня CASHFLOW." },
  { n: 13, l: "м", type: "dream", title: "Кинофестиваль в Каннах", cost: 125000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 14, l: "б", type: "business", title: "Купите золотой рудник", cost: 150000, flow: 25000, roi: "200% при успехе", rule: "После оплаты бросьте одну кость. Результат 3–6 даёт денежный поток; при неудаче выплата равна нулю, клетка остаётся открытой." },
  { n: 15, l: "м", type: "dream", title: "Частная рыбацкая хижина на горном озере", shortTitle: "Рыбацкая хижина", cost: 100000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 16, l: "ф", type: "expense", title: "Налоговая проверка!", flowText: "−50% наличных", rule: "Заплатите Банку половину имеющихся наличных. Баланс не может стать отрицательным.", verification: "Требует решения: правило округления половины нечётной суммы ещё не утверждено." },
  { n: 17, l: "м", type: "dream", title: "Парк развлечений в вашу честь", cost: 225000, rule: "Исправленная позиция: эта мечта следует сразу после клетки 16ф." },
  { n: 18, l: "б", type: "business", title: "Франшиза куриных гриль-баров (2 торговые точки)", shortTitle: "Гриль-бары ×2", cost: 300000, flow: 10000, roi: "40%", rule: "Две торговые точки. После покупки клетка закрывается для других игроков." },
  { n: 19, l: "м", type: "dream", title: "Баллотируйтесь в мэры", cost: 125000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 20, l: "б", type: "business", title: "Салоны красоты (3 кабинета)", shortTitle: "Салоны ×3", cost: 250000, flow: 10000, roi: "48%", rule: "Три кабинета. Покупка увеличивает доход Дня CASHFLOW на $10 000." },
  { n: 21, l: "м", type: "dream", title: "Дар церкви", cost: 175000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 22, l: "б", type: "business", title: "Авторемонтная мастерская", cost: 150000, flow: 6000, roi: "48%", rule: "Отдельный объект владения; не связан с одноимённой клеткой 26." },
  { n: 23, l: "м", type: "dream", title: "Прыжки на лыжах с вертолёта", cost: 150000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 24, l: "б", type: "business", title: "Нефтяная сделка в России", cost: 300000, flow: 75000, roi: "300% при успехе", rule: "После оплаты бросьте одну кость. Результат 4–6 даёт денежный поток; при неудаче выплата равна нулю, клетка остаётся открытой.", state: "Текущая клетка · требуется решение игрока", tokens: ["А", "В"], current: true },
  { n: 25, l: "м", type: "dream", title: "Ужин с президентом!", cost: 100000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 26, l: "б", type: "business", title: "Авторемонтная мастерская", cost: 150000, flow: 6000, roi: "48%", rule: "Отдельный объект владения; не связан с одноимённой клеткой 22." },
  { n: 27, l: "м", type: "dream", title: "Научный центр рака и СПИДа", cost: 225000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 28, l: "о", type: "positive", title: "День CASHFLOW", flowText: "Текущий доход", rule: "При прохождении или остановке игрок получает текущий доход Дня CASHFLOW." },
  { n: 29, l: "м", type: "dream", title: "7 чудес света", cost: 200000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 30, l: "б", type: "business", title: "IPO компании программных продуктов", cost: 25000, flowText: "$500 000 при успехе", rule: "После оплаты бросьте одну кость. Только 6 даёт выплату $500 000. Денежный поток не меняется; после успеха возможность закрывается.", state: "Возможность уже закрыта", mark: "Закрыто", markType: "closed" },
  { n: 31, l: "м", type: "dream", title: "Спасение морских животных", cost: 125000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 32, l: "ф", type: "expense", title: "Развод", flowText: "Все наличные", rule: "Игрок теряет все наличные. Итоговый баланс равен нулю." },
  { n: 33, l: "м", type: "dream", title: "Войдите в круг «реактивной» публики", shortTitle: "Частный самолёт", cost: 250000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 34, l: "б", type: "business", title: "60-квартирный доходный дом", cost: 300000, flow: 8000, roi: "32%", rule: "После покупки денежный поток прибавляется к доходу Дня CASHFLOW.", state: "Куплен игроком Виктор", mark: "Куплен" },
  { n: 35, l: "м", type: "dream", title: "Гольф вокруг света", cost: 150000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 36, l: "б", type: "business", title: "Франшиза пиццерий (2 торговые точки)", shortTitle: "Пиццерии ×2", cost: 225000, flow: 7000, roi: "37%", rule: "Две торговые точки. Точный расчёт ROI равен 37,33%, на поле округлено до 37%." },
  { n: 37, l: "м", type: "dream", title: "Детская библиотека", cost: 175000, rule: "Покупка мечты доступна при остановке на клетке.", verification: "Требует подтверждения: название не соответствует распознанному описанию научного центра." },
  { n: 38, l: "б", type: "business", title: "Склад на 200 мини-хранилищ", cost: 200000, flow: 6000, roi: "36%", rule: "После покупки денежный поток прибавляется к доходу Дня CASHFLOW." },
  { n: 39, l: "м", type: "dream", title: "Остров мечты в Южном море", cost: 100000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 40, l: "б", type: "business", title: "IPO биотехнологической компании", cost: 50000, flowText: "$500 000 при успехе", rule: "После оплаты бросьте одну кость. Результат 5–6 даёт выплату $500 000. Денежный поток не меняется." },
  { n: 41, l: "м", type: "dream", title: "Капиталистический конкурс мира", cost: 200000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 42, l: "б", type: "business", title: "Химчистка (2 цеха)", shortTitle: "Химчистка ×2", cost: 100000, flow: 3000, roi: "36%", rule: "Два цеха. После покупки клетка закрывается для других игроков." },
  { n: 43, l: "м", type: "dream", title: "Круиз по Средиземноморью на частной яхте", shortTitle: "Круиз на яхте", cost: 100000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 44, l: "о", type: "positive", title: "День CASHFLOW", flowText: "Текущий доход", rule: "При прохождении или остановке игрок получает текущий доход Дня CASHFLOW." },
  { n: 45, l: "м", type: "dream", title: "Мини-ферма в городе", cost: 150000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 46, l: "б", type: "business", title: "Рекламное агентство кухонной посуды", cost: 225000, flow: 50000, roi: "266,67% при успехе", rule: "После оплаты бросьте одну кость. Результат 4–6 даёт денежный поток; при неудаче клетка остаётся открытой." },
  { n: 47, l: "м", type: "dream", title: "Фотоохота в Африке", cost: 100000, rule: "Покупка мечты доступна при остановке на клетке." },
  { n: 48, l: "ф", type: "expense", title: "Судебный иск!!!", flowText: "−50% наличных", rule: "Заплатите Банку половину имеющихся наличных. После клетки маршрут возвращается к клетке 1.", verification: "Требует решения: правило округления половины нечётной суммы ещё не утверждено." }
];

const typeLabels = {
  business: "Бизнес",
  dream: "Мечта",
  expense: "Расход",
  positive: "Положительный эффект"
};

const tokenColors = ["#2967df", "#c9505f", "#5f8e42"];
const JOURNEY_BOARD_WIDTH = 1200;
const JOURNEY_BOARD_HEIGHT = 760;
const classicBoard = document.querySelector("#classic-board");
const journeyBoard = document.querySelector("#journey-board");
const mobileDetail = document.querySelector("#mobile-detail-content");
const liveDetail = document.querySelector("#cell-detail-live");
const viewButtons = [...document.querySelectorAll("[data-view]")];
let selectedCellNumber = 24;

function money(value) {
  if (value == null) return "—";
  return `$${new Intl.NumberFormat("ru-RU").format(value)}`;
}

function cellFlow(cell) {
  if (cell.flowText) return cell.flowText;
  if (cell.flow) return `+$${new Intl.NumberFormat("ru-RU").format(cell.flow)} / мес`;
  return "—";
}

function classicPosition(index) {
  const columns = [36, 168, 300, 432, 564, 696, 828, 960, 1092, 1224];
  const rows = [34, 170, 278, 386, 494, 602, 710, 846];
  const outer = { left: 20, right: 1240, top: 26, bottom: 850 };

  if (index < 4) return { x: columns[4 - index], y: rows[1] };
  if (index < 8) return { x: columns[1], y: rows[index - 2] };
  if (index < 11) return { x: columns[index - 7], y: rows[6] };
  if (index < 14) return { x: columns[14 - index], y: outer.bottom };
  if (index < 20) return { x: outer.left, y: rows[20 - index] };
  if (index < 28) return { x: columns[index - 19], y: outer.top };
  if (index < 34) return { x: outer.right, y: rows[index - 27] };
  if (index < 37) return { x: columns[42 - index], y: outer.bottom };
  if (index < 40) return { x: columns[index - 31], y: rows[6] };
  if (index < 44) return { x: columns[8], y: rows[45 - index] };
  return { x: columns[52 - index], y: rows[1] };
}

function journeyPosition(index) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / cells.length;
  return {
    x: 600 + Math.cos(angle) * 528 - 22,
    y: 380 + Math.sin(angle) * 310 - 16
  };
}

function compactJourneyPosition(index) {
  const row = Math.floor(index / 12);
  const positionInRow = index % 12;
  const column = row % 2 === 0 ? positionInRow : 11 - positionInRow;
  return {
    x: 38 + column * 74,
    y: 70 + row * 142
  };
}

function positionBoardCells(compactJourney) {
  cells.forEach((cell, index) => {
    const classicCell = classicBoard.querySelector(`[data-cell="${cell.n}"]`);
    const journeyCell = journeyBoard.querySelector(`[data-cell="${cell.n}"]`);
    const classic = classicPosition(index);
    const journey = compactJourney ? compactJourneyPosition(index) : journeyPosition(index);
    Object.assign(classicCell.style, { left: `${classic.x}px`, top: `${classic.y}px` });
    Object.assign(journeyCell.style, { left: `${journey.x}px`, top: `${journey.y}px` });
  });
}

function accessibleCellLabel(cell) {
  const status = [
    cell.current ? "текущая позиция" : null,
    cell.state,
    cell.mark,
    cell.tokens?.length ? `игроков на клетке: ${cell.tokens.length}` : null,
    cell.verification
  ].filter(Boolean);
  return `Клетка ${cell.n}${cell.l}. ${typeLabels[cell.type]}. ${cell.title}${status.length ? `. ${status.join(". ")}` : ""}`;
}

function createCellButton(cell, position) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `board-cell cell-${cell.type}${cell.current ? " is-current" : ""}`;
  button.style.left = `${position.x}px`;
  button.style.top = `${position.y}px`;
  button.dataset.cell = String(cell.n);
  button.tabIndex = cell.n === selectedCellNumber ? 0 : -1;
  button.setAttribute("aria-pressed", String(cell.n === selectedCellNumber));
  button.setAttribute("aria-label", accessibleCellLabel(cell));
  button.setAttribute("aria-controls", "cell-detail-live");

  const number = document.createElement("span");
  number.className = "cell-number";
  number.textContent = String(cell.n);

  const letter = document.createElement("span");
  letter.className = "cell-letter";
  letter.textContent = cell.l;
  letter.setAttribute("aria-hidden", "true");

  const title = document.createElement("span");
  title.className = "cell-short-title";
  title.textContent = cell.shortTitle ?? cell.title;

  button.append(number, letter, title);

  if (cell.mark) {
    const mark = document.createElement("span");
    mark.className = `cell-state-mark ${cell.markType ?? ""}`;
    mark.textContent = cell.mark;
    button.append(mark);
  }

  if (cell.tokens?.length) {
    const tokens = document.createElement("span");
    tokens.className = "cell-tokens";
    tokens.setAttribute("aria-label", `Игроков на клетке: ${cell.tokens.length}`);
    cell.tokens.forEach((token, tokenIndex) => {
      const tokenElement = document.createElement("span");
      tokenElement.className = "player-token";
      tokenElement.style.setProperty("--token-color", tokenColors[tokenIndex % tokenColors.length]);
      tokenElement.textContent = token;
      tokenElement.setAttribute("aria-hidden", "true");
      tokens.append(tokenElement);
    });
    button.append(tokens);
  }

  button.addEventListener("click", () => selectCell(cell.n));
  button.addEventListener("keydown", (event) => moveCellFocus(event, cell.n, button));
  return button;
}

function moveCellFocus(event, cellNumber, sourceButton) {
  const delta = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1
  }[event.key];
  let nextNumber = null;
  if (delta) nextNumber = ((cellNumber - 1 + delta + cells.length) % cells.length) + 1;
  if (event.key === "Home") nextNumber = 1;
  if (event.key === "End") nextNumber = cells.length;
  if (nextNumber == null) return;

  event.preventDefault();
  selectCell(nextNumber);
  sourceButton.closest(".board")?.querySelector(`[data-cell="${nextNumber}"]`)?.focus();
}

function createTrackSummary() {
  const summary = document.createElement("section");
  summary.className = "track-summary";
  summary.innerHTML = `
    <div>
      <h2>Доход Дня CASHFLOW</h2>
      <p>Показатели демонстрационные и нужны только для проверки состояний поля.</p>
    </div>
    <div class="cashflow-progress">
      <div class="progress-values"><span>+$27 000 из +$50 000</span><strong>$147 000</strong></div>
      <div class="progress-track" aria-label="Прогресс к финансовой цели: 54 процента"><span></span></div>
      <div class="target-dream"><span>Целевая мечта</span><strong>Древние города Азии · $450 000</strong></div>
    </div>
  `;
  return summary;
}

function createPlayerOverview() {
  const overview = document.createElement("section");
  overview.className = "player-overview";
  overview.setAttribute("aria-label", "Финансовая информация игрока Анна");
  overview.innerHTML = `
    <div class="player-heading">
      <div class="player-identity">
        <span class="player-avatar" aria-hidden="true">А</span>
        <div>
          <h2 class="player-name">Анна</h2>
          <p class="player-profession">Предприниматель</p>
        </div>
      </div>
      <span class="player-turn-tag">Ваш ход</span>
    </div>
    <dl class="player-metrics">
      <div><dt>Наличные</dt><dd>$147 000</dd></div>
      <div><dt>Общий доход</dt><dd>$89 000 / мес</dd></div>
      <div class="is-positive"><dt>Денежный поток</dt><dd>+$27 000 / мес</dd></div>
      <div><dt>Расходы</dt><dd>$62 000 / мес</dd></div>
    </dl>
    <div class="player-assets">
      <div class="player-section-heading">Активы · 3</div>
      <p>Сеть ресторанов · коммунальная компания · золотой рудник</p>
    </div>
    <div class="player-goal">
      <div class="player-goal-row"><span>Финансовая цель</span><strong>+$50 000 / мес</strong></div>
      <div class="player-goal-row"><span>Целевая мечта</span><strong>Древние города Азии · $450 000</strong></div>
    </div>
  `;
  return overview;
}

function createTurnActivity() {
  const activity = document.createElement("section");
  activity.className = "turn-activity";
  activity.setAttribute("aria-label", "История и действия текущего хода");
  activity.innerHTML = `
    <div class="turn-heading">
      <div>
        <h2>Ход игрока</h2>
        <p>Анна · ход 8</p>
      </div>
      <span class="turn-status">В процессе</span>
    </div>
    <ol class="turn-timeline">
      <li class="turn-event"><strong>Начало хода · клетка 22</strong><span>Авторемонтная мастерская</span></li>
      <li class="turn-event"><strong>Бросок кубика · 2</strong><span>Игрок перемещается на две клетки</span></li>
      <li class="turn-event"><strong>Перемещение · 22 → 24</strong><span>Пройдена клетка 23 «Прыжки на лыжах»</span></li>
      <li class="turn-event is-current"><strong>Открыта клетка 24</strong><span>Нефтяная сделка в России · требуется решение</span></li>
    </ol>
    <div class="turn-decision">
      <div class="turn-decision-heading"><strong>Выберите действие</strong><span>Нужно $300 000</span></div>
      <div class="turn-actions" role="group" aria-label="Демонстрационные действия">
        <button class="turn-action" type="button" data-demo-action="Купить сделку">Купить</button>
        <button class="turn-action" type="button" data-demo-action="Взять кредит">Кредит</button>
        <button class="turn-action" type="button" data-demo-action="Отказаться от сделки">Отказаться</button>
      </div>
      <p class="turn-decision-note" aria-live="polite">Выбор изменит только демонстрацию прототипа.</p>
    </div>
  `;

  const note = activity.querySelector(".turn-decision-note");
  activity.querySelectorAll(".turn-action").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      activity.querySelectorAll(".turn-action").forEach((candidate) => {
        candidate.setAttribute("aria-pressed", String(candidate === button));
      });
      note.textContent = `Демонстрационный выбор: ${button.dataset.demoAction}.`;
    });
  });
  return activity;
}

function detailFor(cell) {
  const detail = document.querySelector("#detail-template").content.firstElementChild.cloneNode(true);
  detail.classList.add(`detail-${cell.type}`);
  detail.querySelector(".detail-code").textContent = `${cell.n}${cell.l}`;
  detail.querySelector(".detail-type").textContent = typeLabels[cell.type];
  detail.querySelector(".detail-title").textContent = cell.title;
  const metrics = detail.querySelector(".detail-metrics");
  metricDescriptors(cell).forEach(({ label, value }) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    wrapper.append(term, description);
    metrics.append(wrapper);
  });
  detail.querySelector(".detail-rule").textContent = cell.rule;
  detail.querySelector(".detail-state").textContent = [cell.state, cell.verification].filter(Boolean).join(" · ");
  return detail;
}

function metricDescriptors(cell) {
  if (cell.type === "dream") {
    return [
      { label: "Стоимость мечты", value: money(cell.cost) },
      { label: "Игровой эффект", value: "Покупка мечты" },
      { label: "Денежный поток", value: "Не изменяется" }
    ];
  }
  if (cell.type === "expense") {
    return [
      { label: "Потеря наличных", value: cellFlow(cell) },
      { label: "Обязательность", value: "Обязательно" },
      { label: "Нижняя граница", value: "$0" }
    ];
  }
  if (cell.type === "positive") {
    return [
      { label: cell.cost ? "Стоимость" : "Стоимость", value: money(cell.cost) },
      { label: cell.n === 8 ? "Постоянный эффект" : "Выплата", value: cellFlow(cell) },
      { label: "Денежный поток", value: cell.n === 8 ? "Не изменяется" : "Текущий доход" }
    ];
  }
  const isIpo = cell.title.startsWith("IPO");
  return [
    { label: isIpo || cell.rule.includes("бросьте") ? "Инвестиция" : "Первоначальный взнос", value: money(cell.cost) },
    { label: isIpo ? "Выплата при успехе" : "Денежный поток", value: cellFlow(cell) },
    { label: "ROI", value: cell.roi ?? "—" }
  ];
}

function createCentralPanel(boardType) {
  const panel = document.createElement("div");
  panel.className = "central-panel";
  if (boardType === "classic") {
    panel.append(createPlayerOverview(), createTurnActivity());
  } else {
    const cell = cells.find((item) => item.n === selectedCellNumber) ?? cells[0];
    panel.append(createTrackSummary(), detailFor(cell));
  }
  panel.dataset.panelFor = boardType;
  return panel;
}

function renderBoards() {
  const classicRoute = classicBoard.querySelector(".classic-route");
  classicBoard.replaceChildren(classicRoute);
  const journeyRoute = journeyBoard.querySelector(".journey-route");
  journeyBoard.replaceChildren(journeyRoute);

  cells.forEach((cell, index) => {
    classicBoard.append(createCellButton(cell, classicPosition(index)));
    journeyBoard.append(createCellButton(cell, journeyPosition(index)));
  });

  classicBoard.append(createCentralPanel("classic"));
  journeyBoard.append(createCentralPanel("journey"));
  renderMobileDetail();
  announceSelectedCell();
}

function renderMobileDetail() {
  const cell = cells.find((item) => item.n === selectedCellNumber) ?? cells[0];
  mobileDetail.replaceChildren(detailFor(cell));
}

function selectCell(cellNumber) {
  selectedCellNumber = cellNumber;
  document.querySelectorAll(".board-cell").forEach((button) => {
    const selected = Number(button.dataset.cell) === cellNumber;
    button.setAttribute("aria-pressed", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll(".central-panel").forEach((panel) => {
    const currentDetail = panel.querySelector(".cell-detail");
    currentDetail?.replaceWith(detailFor(cells.find((cell) => cell.n === cellNumber)));
  });
  renderMobileDetail();
  announceSelectedCell();
  centerSelectedCell();
}

function announceSelectedCell() {
  const cell = cells.find((item) => item.n === selectedCellNumber) ?? cells[0];
  liveDetail.textContent = `${accessibleCellLabel(cell)}. Стоимость: ${money(cell.cost)}. ${metricDescriptors(cell).map((metric) => `${metric.label}: ${metric.value}`).join(". ")}. ${cell.rule}`;
}

function centerSelectedCell() {
  const visibleBoard = classicBoard.hidden ? journeyBoard : classicBoard;
  const selected = visibleBoard.querySelector(`[data-cell="${selectedCellNumber}"]`);
  const boardScroll = document.querySelector(".board-scroll");
  if (!selected || boardScroll.scrollWidth <= boardScroll.clientWidth + 1) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  boardScroll.scrollTo({
    left: selected.offsetLeft - boardScroll.clientWidth / 2 + selected.offsetWidth / 2,
    behavior: reduceMotion ? "auto" : "smooth"
  });
}

function fitBoards() {
  const boardScroll = document.querySelector(".board-scroll");
  const classicVisible = !classicBoard.hidden;
  const scrollMode = window.innerWidth <= 1019 || (classicVisible && window.innerWidth < 1280);
  const compactJourney = !classicVisible && window.innerWidth >= 1020 && window.innerWidth < 1280;
  document.body.classList.toggle("scroll-board", scrollMode);
  document.body.classList.toggle("compact-board", compactJourney);
  classicBoard.classList.remove("is-compact");
  journeyBoard.classList.toggle("is-compact", compactJourney);
  positionBoardCells(compactJourney);

  boardScroll.style.height = "";
  [classicBoard, journeyBoard].forEach((board) => {
    board.style.transform = "";
    board.style.marginLeft = "";
    board.style.marginBottom = "";
  });

  if (classicVisible) {
    boardScroll.style.overflow = "auto";
    return;
  }

  if (scrollMode || compactJourney) {
    boardScroll.style.overflow = scrollMode ? "auto" : "hidden";
    if (compactJourney) boardScroll.style.height = "656px";
    return;
  }

  const availableWidth = Math.max(320, boardScroll.clientWidth - 36);
  const availableHeight = Math.max(380, window.innerHeight - boardScroll.getBoundingClientRect().top - 20);
  const scale = Math.min(1, availableWidth / JOURNEY_BOARD_WIDTH, availableHeight / JOURNEY_BOARD_HEIGHT);
  const renderedWidth = JOURNEY_BOARD_WIDTH * scale;
  journeyBoard.style.transformOrigin = "top left";
  journeyBoard.style.transform = `scale(${scale})`;
  journeyBoard.style.marginLeft = `${Math.max(0, (availableWidth - renderedWidth) / 2)}px`;
  journeyBoard.style.marginBottom = `${-JOURNEY_BOARD_HEIGHT * (1 - scale)}px`;
  boardScroll.style.height = `${JOURNEY_BOARD_HEIGHT * scale + 36}px`;
  boardScroll.style.overflow = "hidden";
}

function setView(view) {
  const classic = view === "classic";
  classicBoard.hidden = !classic;
  journeyBoard.hidden = classic;
  viewButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  fitBoards();
  requestAnimationFrame(centerSelectedCell);
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

renderBoards();
fitBoards();
requestAnimationFrame(centerSelectedCell);
window.addEventListener("resize", () => {
  fitBoards();
  requestAnimationFrame(centerSelectedCell);
});
