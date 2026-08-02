"use client";

import { FormEvent, useEffect, useState } from "react";

type ModalKind = "create" | "join" | "team" | "host" | "leader" | "ai" | null;

const routeCards = [
  {
    key: "create" as const,
    eyebrow: "У меня уже есть компания",
    title: "Играть со своей командой",
    text: "Создайте игровую комнату, отправьте друзьям или коллегам код приглашения и начните совместную партию.",
    action: "Создать комнату",
    tone: "blue",
    icon: "●●●",
    status: "Доступно",
  },
  {
    key: "team" as const,
    eyebrow: "Мне не с кем играть",
    title: "Найти команду",
    text: "Оставьте заявку на участие. Мы поможем найти игроков с подходящим расписанием и уровнем опыта.",
    action: "Сообщить о запуске",
    tone: "orange",
    icon: "●  ●",
    status: "Скоро",
  },
  {
    key: "host" as const,
    eyebrow: "Мне нужен проводник",
    title: "Нанять ведущего",
    text: "Подберите ведущего для первой партии, клуба, команды или обучающего мероприятия.",
    action: "Узнать о запуске",
    tone: "navy",
    icon: "✦",
    status: "В разработке",
  },
  {
    key: "ai" as const,
    eyebrow: "Я хочу играть один",
    title: "Играть с ИИ",
    text: "Тренируйте стратегию с виртуальными соперниками и разбирайте ключевые решения после партии.",
    action: "Стать тестировщиком",
    tone: "purple",
    icon: "◈",
    status: "В разработке",
  },
];

const journeySteps = [
  ["Профессия", "Получите стартовые доходы, расходы и обязательства."],
  ["Финансовый отчёт", "Увидьте реальное состояние денежного потока."],
  ["Сделка", "Оцените возможность, цену входа и потенциальный риск."],
  ["Актив", "Покупайте недвижимость, бизнес и другие источники дохода."],
  ["Решение", "Берите кредит, сохраняйте резерв или отказывайтесь от сделки."],
  ["Пассивный доход", "Создавайте поток, который постепенно покрывает расходы."],
  ["Большой круг", "Перейдите к масштабным целям и своей игровой мечте."],
];

const platformFeatures = [
  ["Игровое поле", "Бросок кубика, движение по малому и большому кругу."],
  ["Финансовый отчёт", "Наличные, доходы, расходы, активы и обязательства."],
  ["Карточки и сделки", "Рынок, активы, обязательные расходы и события."],
  ["Живой журнал", "Проверенная история решений и изменений состояния."],
  ["Чат комнаты", "Обсуждайте сделки и договаривайтесь прямо в партии."],
  ["Синхронизация", "Все участники видят актуальное состояние в реальном времени."],
];

const faqItems = [
  [
    "Нужно ли разбираться в инвестициях?",
    "Нет. Игра объясняет финансовые связи через действия и подходит тем, кто только начинает интересоваться личными финансами.",
  ],
  [
    "Что делать, если мне не с кем играть?",
    "Функция поиска команды находится в разработке. Можно оставить заявку на уведомление о запуске подбора по времени, уровню и формату.",
  ],
  [
    "Можно ли пригласить профессионального ведущего?",
    "Каталог и массовая заявка ведущим планируются. На лендинге можно сообщить об интересе и получить уведомление о запуске.",
  ],
  [
    "Можно ли играть одному?",
    "Одиночный режим с ИИ находится в разработке. Виртуальные игроки будут использовать разные стратегии и объяснять собственные решения.",
  ],
  [
    "Сколько человек участвуют в партии?",
    "В игровой комнате могут участвовать от 2 до 6 игроков. Также предусмотрены роли банкира и наблюдателя.",
  ],
  [
    "Это финансовая или инвестиционная рекомендация?",
    "Нет. Игра носит образовательный и развлекательный характер и не заменяет финансовую, инвестиционную, налоговую или юридическую консультацию.",
  ],
];

const modalContent: Record<Exclude<ModalKind, null>, { title: string; note: string }> = {
  create: {
    title: "Создать игровую комнату",
    note: "Рабочий переход в приложение будет подключён после передачи production-адреса регистрации.",
  },
  join: {
    title: "Войти по коду приглашения",
    note: "Введите код из приглашения. Переход в комнату будет подключён к игровому приложению перед запуском.",
  },
  team: {
    title: "Узнать о запуске поиска команды",
    note: "Подбор команды находится в разработке. Оставьте контакт, чтобы получить уведомление без обещания конкретной даты.",
  },
  host: {
    title: "Узнать о запуске каталога ведущих",
    note: "Каталог, бронирование и массовая заявка ведущим находятся в разработке.",
  },
  leader: {
    title: "Стать ведущим",
    note: "Профессиональный профиль и входящие заявки находятся в разработке.",
  },
  ai: {
    title: "Стать тестировщиком ИИ-режима",
    note: "Одиночный режим находится в разработке. Мы не обещаем конкретную дату запуска.",
  },
};

function track(event: string, context?: string) {
  if (typeof window === "undefined") return;
  const payload = { event, context };
  window.dispatchEvent(new CustomEvent("financial-journey", { detail: payload }));
  const dataWindow = window as Window & { dataLayer?: unknown[] };
  dataWindow.dataLayer = dataWindow.dataLayer || [];
  dataWindow.dataLayer.push(payload);
}

function Modal({
  kind,
  onClose,
}: {
  kind: Exclude<ModalKind, null>;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const content = modalContent[kind];

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", listener);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("success");
    track("form_submit_success", kind);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть окно">
          ×
        </button>
        {status === "success" ? (
          <div className="modal-success" role="status">
            <span aria-hidden="true">✓</span>
            <h2 id="modal-title">Форма работает в демонстрационном режиме</h2>
            <p>
              Данные никуда не отправлены. Для рабочего запуска необходимо
              подключить выбранный маршрут к продукту или CRM.
            </p>
            <button className="button button-primary" type="button" onClick={onClose}>
              Понятно
            </button>
          </div>
        ) : (
          <>
            <p className="modal-kicker">Следующий шаг</p>
            <h2 id="modal-title">{content.title}</h2>
            <p className="modal-note">{content.note}</p>
            <form onSubmit={submit} onFocus={() => track("form_start", kind)}>
              {kind === "join" ? (
                <label>
                  Код комнаты
                  <input name="code" required minLength={4} maxLength={12} placeholder="Например, FJ-4821" />
                </label>
              ) : (
                <>
                  <label>
                    Имя или никнейм
                    <input name="name" required autoComplete="name" placeholder="Как к вам обращаться" />
                  </label>
                  <label>
                    Электронная почта
                    <input name="email" required type="email" autoComplete="email" placeholder="name@example.com" />
                  </label>
                </>
              )}
              {kind === "create" && (
                <label>
                  Количество игроков
                  <select name="players" defaultValue="4">
                    <option value="2">2 игрока</option>
                    <option value="3">3 игрока</option>
                    <option value="4">4 игрока</option>
                    <option value="5">5 игроков</option>
                    <option value="6">6 игроков</option>
                  </select>
                </label>
              )}
              {kind === "team" && (
                <label>
                  Когда удобно играть
                  <select name="schedule" defaultValue="evening">
                    <option value="evening">По вечерам</option>
                    <option value="weekend">В выходные</option>
                    <option value="flexible">Гибкий график</option>
                  </select>
                </label>
              )}
              {(kind === "team" || kind === "host" || kind === "leader" || kind === "ai") && (
                <label className="check-label">
                  <input name="consent" type="checkbox" required />
                  <span>Согласен получить уведомление о запуске функции</span>
                </label>
              )}
              <button className="button button-primary button-full" type="submit">
                {kind === "join" ? "Проверить код" : "Отправить"}
              </button>
              <small>Персональные данные не передаются в аналитику.</small>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  const [modal, setModal] = useState<ModalKind>(null);

  function openModal(kind: Exclude<ModalKind, null>, event: string) {
    track(event, kind);
    setModal(kind);
  }

  return (
    <main id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Финансовое путешествие — на главную">
          <span className="brand-mark" aria-hidden="true"><span>↗</span></span>
          <span className="brand-copy">
            <strong>Financial Journey</strong>
            <small>Финансовое путешествие</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#journey">Как проходит игра</a>
          <a href="#routes">Игрокам</a>
          <a href="#team">Найти команду</a>
          <a href="#hosts">Ведущим</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="header-actions">
          <button className="login-link" type="button" onClick={() => openModal("join", "enter_code_click")}>
            Войти
          </button>
          <details className="start-menu">
            <summary className="button button-orange">Начать играть</summary>
            <div className="start-dropdown">
              <button type="button" onClick={() => openModal("create", "create_room_click")}>Создать комнату</button>
              <button type="button" onClick={() => openModal("join", "enter_code_click")}>Ввести код</button>
              <button type="button" onClick={() => openModal("team", "find_team_click")}>
                Найти команду <span>Скоро</span>
              </button>
              <button type="button" onClick={() => openModal("host", "hire_host_click")}>
                Нанять ведущего <span>Скоро</span>
              </button>
              <button type="button" onClick={() => openModal("ai", "ai_waitlist_submit")}>
                Играть с ИИ <span>Скоро</span>
              </button>
            </div>
          </details>
        </div>

        <details className="mobile-nav">
          <summary aria-label="Открыть меню"><span /><span /></summary>
          <nav aria-label="Мобильная навигация">
            <a href="#journey">Как проходит игра</a>
            <a href="#routes">Игрокам</a>
            <a href="#team">Найти команду</a>
            <a href="#hosts">Ведущим</a>
            <a href="#ai">Игра с ИИ <small>Скоро</small></a>
            <a href="#faq">FAQ</a>
            <button type="button" onClick={() => openModal("create", "create_room_click")}>Начать играть</button>
          </nav>
        </details>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Онлайн-игра для развития финансового мышления</p>
          <h1>
            Каждое решение меняет ваше{" "}
            <span>финансовое путешествие</span>
          </h1>
          <p className="hero-lead">
            Получайте доход, управляйте расходами, находите сделки, покупайте
            активы и создавайте пассивный денежный поток.
          </p>
          <p className="hero-support">
            Играйте с друзьями, найдите новую команду, пригласите ведущего или
            запишитесь на будущий одиночный режим с ИИ.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-large" type="button" onClick={() => openModal("create", "hero_start")}>
              Начать путешествие <span aria-hidden="true">→</span>
            </button>
            <button className="button button-secondary button-large" type="button" onClick={() => openModal("create", "create_room_click")}>
              Создать игру
            </button>
          </div>
          <div className="hero-links" aria-label="Дополнительные маршруты">
            <button type="button" onClick={() => openModal("team", "find_team_click")}>Найти команду <small>Скоро</small></button>
            <button type="button" onClick={() => openModal("host", "hire_host_click")}>Нанять ведущего <small>Скоро</small></button>
            <button type="button" onClick={() => openModal("ai", "ai_waitlist_submit")}>Играть одному <small>Скоро</small></button>
          </div>
          <ul className="hero-benefits" aria-label="Преимущества">
            <li>2–6 игроков</li>
            <li>Решения в реальном времени</li>
            <li>Автоматические расчёты</li>
            <li>Для игроков и ведущих</li>
          </ul>
        </div>

        <div className="hero-visual">
          <div className="float-card float-income">
            <span>Пассивный доход</span>
            <strong>+$1 240</strong>
            <i>Положительный поток</i>
          </div>
          <picture className="hero-picture">
            <source srcSet="/financial-journey-board.webp" type="image/webp" />
            <img
              className="hero-image"
              src="/financial-journey-board.png"
              alt="Изометрический игровой маршрут с фишками игроков, домом, бизнесом, карточками активов и финишной аркой"
              width="1586"
              height="992"
              fetchPriority="high"
            />
          </picture>
          <div className="float-card float-goal">
            <span>Событие</span>
            <strong>Доход выше расходов</strong>
            <i>Путь на большой круг открыт</i>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Действующие возможности продукта">
        <p>Уже в основе продукта</p>
        <div>
          <span>Комнаты по коду</span>
          <span>Партии 2–6 игроков</span>
          <span>Финансовый отчёт</span>
          <span>Сделки и рынок</span>
          <span>Чат и журнал</span>
        </div>
      </section>

      <section className="section route-section" id="routes">
        <div className="section-head centered">
          <p className="section-label">Выберите маршрут</p>
          <h2>Как вы хотите начать путешествие?</h2>
          <p>Команду и способ участия можно изменить позже.</p>
        </div>
        <div className="route-grid">
          {routeCards.map((route) => (
            <article className={`route-card ${route.tone}`} key={route.key}>
              <div className="route-card-top">
                <span className="route-icon" aria-hidden="true">{route.icon}</span>
                <span className="status">{route.status}</span>
              </div>
              <p className="card-eyebrow">{route.eyebrow}</p>
              <h3>{route.title}</h3>
              <p>{route.text}</p>
              <button
                className="route-action"
                type="button"
                onClick={() =>
                  openModal(
                    route.key,
                    route.key === "create"
                      ? "create_room_click"
                      : route.key === "team"
                        ? "find_team_click"
                        : route.key === "host"
                          ? "hire_host_click"
                          : "ai_waitlist_submit",
                  )
                }
              >
                {route.action} <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="section problem-section">
        <div className="problem-copy">
          <p className="section-label">Практика вместо перегруженной теории</p>
          <h2>Финансы становятся понятнее, когда видишь последствия решений</h2>
          <p>
            В игре можно безопасно ошибаться, сравнивать стратегии и сразу
            наблюдать, как покупка актива, новый кредит или сохранённый резерв
            меняют денежный поток.
          </p>
        </div>
        <div className="decision-board" aria-label="Пример финансового решения">
          <div className="decision-card">
            <span>Карточка сделки</span>
            <h3>Небольшая квартира</h3>
            <dl>
              <div><dt>Первоначальный взнос</dt><dd>$4 000</dd></div>
              <div><dt>Денежный поток</dt><dd className="positive">+$220/мес</dd></div>
              <div><dt>Резерв после покупки</dt><dd>$1 600</dd></div>
            </dl>
            <div className="decision-actions"><span>Купить</span><span>Отказаться</span></div>
          </div>
          <div className="decision-path" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>

      <section className="section journey-section" id="journey">
        <div className="section-head split light-head">
          <div>
            <p className="section-label">Как проходит игра</p>
            <h2>Семь остановок финансового путешествия</h2>
          </div>
          <p>
            От первой профессии до большого круга — каждая остановка показывает
            связь между выбором и результатом.
          </p>
        </div>
        <div className="journey-track">
          {journeySteps.map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section platform-section" id="players">
        <div className="section-head split">
          <div>
            <p className="section-label">Возможности для игроков</p>
            <h2>Всё важное — в одной игровой комнате</h2>
          </div>
          <p>
            Сервер проверяет действия и синхронизирует состояние, чтобы
            участники обсуждали стратегию, а не спорили о расчётах.
          </p>
        </div>
        <div className="platform-layout">
          <div className="platform-features">
            {platformFeatures.map(([title, text], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
          <div className="report-card" aria-label="Макет финансового отчёта">
            <div className="report-head">
              <div><span>Денежный поток</span><strong>+$2 480</strong></div>
              <em>Растёт</em>
            </div>
            <div className="report-chart" aria-hidden="true">
              {[36, 44, 39, 58, 51, 70, 84].map((height, index) => (
                <i key={height} style={{ height: `${height}%` }} className={index > 4 ? "active" : ""} />
              ))}
            </div>
            <div className="report-metrics">
              <div><span>Доход</span><strong>$8 900</strong></div>
              <div><span>Расходы</span><strong>$6 420</strong></div>
              <div><span>Активы</span><strong>7</strong></div>
            </div>
            <div className="report-event"><span>✓</span> Пассивный доход приближает вас к цели</div>
          </div>
        </div>
      </section>

      <section className="section team-section" id="team">
        <div className="media-copy">
          <span className="status status-planned">Скоро</span>
          <p className="section-label">Поиск команды</p>
          <h2>Не с кем играть? Найдите свою команду</h2>
          <p>
            Укажите удобное время, уровень опыта и желаемый формат. После
            формирования группы вы получите приглашение и код комнаты.
          </p>
          <ol className="compact-steps">
            <li><span>1</span><div><strong>Выберите формат</strong><small>Дата, время, опыт и ведущий</small></div></li>
            <li><span>2</span><div><strong>Оставьте заявку</strong><small>Контакты скрыты до подтверждения</small></div></li>
            <li><span>3</span><div><strong>Получите приглашение</strong><small>Когда группа будет сформирована</small></div></li>
          </ol>
          <button className="button button-secondary" type="button" onClick={() => openModal("team", "find_team_click")}>
            Сообщить о запуске
          </button>
        </div>
        <div className="media-visual">
          <picture>
            <source srcSet="/team-match.webp" type="image/webp" />
            <img
              src="/team-match.png"
              alt="Игровые фишки с разных маршрутов объединяются у общего стола"
              width="1568"
              height="1003"
              loading="lazy"
            />
          </picture>
          <div className="match-card"><strong>Команда собрана</strong><span>4 из 6 игроков</span></div>
        </div>
      </section>

      <section className="section host-section" id="hosts">
        <div className="host-visual">
          <picture>
            <source srcSet="/host-guide.webp" type="image/webp" />
            <img
              src="/host-guide.png"
              alt="Фишка ведущего помогает трём игрокам у игрового стола"
              width="1536"
              height="1024"
              loading="lazy"
            />
          </picture>
          <div className="host-offer"><span>Новое предложение</span><strong>Свободен в пятницу</strong></div>
        </div>
        <div className="media-copy host-copy">
          <span className="status status-gold">В разработке</span>
          <p className="section-label">Профессиональный ведущий</p>
          <h2>Пригласите ведущего для своей игры</h2>
          <p>
            Ведущий поможет разобраться в правилах, поддержит темп партии и
            проведёт итоговый разбор финансовых решений.
          </p>
          <div className="host-options">
            <article>
              <h3>Выбрать самостоятельно</h3>
              <p>Профиль, специализация, доступность и подтверждённые отзывы.</p>
            </article>
            <article>
              <h3>Отправить одну заявку</h3>
              <p>Подходящие ведущие предложат время и условия проведения.</p>
            </article>
          </div>
          <button className="button button-light" type="button" onClick={() => openModal("host", "host_broadcast_request")}>
            Узнать о запуске подбора
          </button>
        </div>
      </section>

      <section className="section leader-section">
        <div className="section-head split">
          <div>
            <span className="status status-planned">Скоро</span>
            <p className="section-label">Возможности для ведущих</p>
            <h2>Развивайте практику и собственное сообщество</h2>
          </div>
          <p>
            Публичный профиль, календарь, входящие заявки и повторные встречи —
            единый профессиональный маршрут внутри платформы.
          </p>
        </div>
        <div className="leader-grid">
          {[
            ["Публичный профиль", "Расскажите об опыте, формате работы и специализации."],
            ["Календарь доступности", "Покажите время, в которое готовы проводить игры."],
            ["Входящие заявки", "Получайте запросы от игроков, клубов и организаций."],
            ["Предложения клиентам", "Отправляйте программу встречи и условия."],
            ["Репутация", "Отзывы и рейтинги появятся только после проверки источника."],
            ["Повторные встречи", "Создавайте клуб и регулярное расписание."],
          ].map(([title, text], index) => (
            <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
        <button className="button button-primary" type="button" onClick={() => openModal("leader", "become_host_click")}>
          Сообщить о запуске профилей
        </button>
      </section>

      <section className="section ai-section" id="ai">
        <div className="media-copy">
          <span className="status status-ai">Функция в разработке</span>
          <p className="section-label">Одиночная игра с ИИ</p>
          <h2>Тренируйте стратегию в удобное время</h2>
          <p>
            Будущие ИИ-соперники будут использовать разные финансовые характеры,
            объяснять собственные решения и помогать анализировать завершённую
            партию — не принимать решения вместо вас.
          </p>
          <div className="strategy-chips">
            <span>Осторожная</span><span>Агрессивная</span><span>Сбалансированная</span>
          </div>
          <button className="button button-ai" type="button" onClick={() => openModal("ai", "ai_waitlist_submit")}>
            Стать тестировщиком
          </button>
          <small className="launch-note">Без обещания конкретной даты запуска.</small>
        </div>
        <div className="media-visual ai-visual">
          <picture>
            <source srcSet="/ai-mode.webp" type="image/webp" />
            <img
              src="/ai-mode.png"
              alt="Синяя фишка игрока за общим столом с тремя фиолетовыми фишками ИИ разных стратегий"
              width="1536"
              height="1024"
              loading="lazy"
            />
          </picture>
        </div>
      </section>

      <section className="section skills-section">
        <div className="section-head centered">
          <p className="section-label">Навыки игрока</p>
          <h2>Что тренирует финансовое путешествие</h2>
          <p>Не обещания богатства, а практика решений и ясность мышления.</p>
        </div>
        <div className="skill-track">
          {[
            ["Кошелёк", "Учёт доходов и расходов"],
            ["Дом", "Оценка активов и обязательств"],
            ["Бизнес", "Работа с риском и денежным потоком"],
            ["График", "Планирование и финансовый резерв"],
            ["Арка", "Пассивный доход и свобода выбора"],
          ].map(([title, text], index) => (
            <article key={title}><span>{["◒", "⌂", "▦", "↗", "∩"][index]}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="section use-cases">
        <div className="section-head split light-head">
          <div><p className="section-label">Сценарии</p><h2>Играйте так, как удобно именно вам</h2></div>
          <p>Дома с друзьями, в финансовом клубе, с корпоративной командой или из разных городов.</p>
        </div>
        <div className="use-case-grid">
          {[
            ["Друзья", "Совместный вечер и живое обсуждение решений."],
            ["Финансовый клуб", "Регулярные партии и обмен стратегиями."],
            ["Корпоративная команда", "Переговоры, выбор и ответственность."],
            ["Участники из разных городов", "Одна синхронная комната в браузере."],
          ].map(([title, text], index) => (
            <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="section start-section" id="start">
        <div className="section-head centered">
          <p className="section-label">Как начать</p>
          <h2>Выберите свой способ войти в игру</h2>
        </div>
        <div className="start-grid">
          <button type="button" onClick={() => openModal("create", "create_room_click")}><span>01</span><strong>Создать игру</strong><small>Если команда уже собрана</small></button>
          <button type="button" onClick={() => openModal("join", "enter_code_click")}><span>02</span><strong>Ввести код</strong><small>Если вас уже пригласили</small></button>
          <button type="button" onClick={() => openModal("team", "find_team_click")}><span>03</span><strong>Найти команду</strong><small>Скоро</small></button>
          <button type="button" onClick={() => openModal("host", "hire_host_click")}><span>04</span><strong>Нанять ведущего</strong><small>В разработке</small></button>
          <button type="button" onClick={() => openModal("ai", "ai_waitlist_submit")}><span>05</span><strong>Играть с ИИ</strong><small>В разработке</small></button>
        </div>
      </section>

      <section className="section pricing-section" onMouseEnter={() => track("pricing_view")}>
        <div className="section-head centered">
          <p className="section-label">Форматы участия</p>
          <h2>Стоимость будет определена перед запуском</h2>
          <p>Мы не публикуем вымышленные цены и условия.</p>
        </div>
        <div className="pricing-grid">
          {[
            ["Игрок", "Самостоятельное участие", ["Комната по коду", "Финансовый отчёт", "История партий"], "Цена уточняется", "create"],
            ["С ведущим", "Организованная партия", ["Объяснение правил", "Сопровождение", "Итоговый разбор"], "В разработке", "host"],
            ["Ведущий", "Профессиональный профиль", ["Календарь", "Входящие заявки", "История игр"], "Условия уточняются", "leader"],
            ["ИИ-режим", "Одиночная стратегия", ["Виртуальные соперники", "Уровни сложности", "Разбор решений"], "Скоро", "ai"],
          ].map(([title, subtitle, items, price, kind]) => (
            <article key={title as string}>
              <p>{subtitle as string}</p><h3>{title as string}</h3>
              <ul>{(items as string[]).map((item) => <li key={item}>✓ {item}</li>)}</ul>
              <strong>{price as string}</strong>
              <button type="button" onClick={() => openModal(kind as Exclude<ModalKind, null>, `${kind}_pricing_click`)}>
                {kind === "create" ? "Начать" : "Сообщить о запуске"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="faq-title"><p className="section-label">FAQ</p><h2>Всё важное перед первой партией</h2></div>
        <div className="faq-list">
          {faqItems.map(([question, answer]) => (
            <details key={question} onToggle={(event) => event.currentTarget.open && track("faq_open", question)}>
              <summary>{question}</summary><p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="section-label">Первое решение — начать</p>
          <h2>Начните финансовое путешествие в подходящем формате</h2>
          <p>Соберите друзей, дождитесь новой команды, пригласите ведущего или подпишитесь на запуск ИИ-режима.</p>
          <div className="final-actions">
            <button className="button button-primary" type="button" onClick={() => openModal("create", "create_room_click")}>Создать игру</button>
            <button className="button button-secondary" type="button" onClick={() => openModal("team", "find_team_click")}>Найти команду <small>Скоро</small></button>
            <button className="button button-light" type="button" onClick={() => openModal("host", "hire_host_click")}>Нанять ведущего <small>Скоро</small></button>
            <button className="button button-ai-outline" type="button" onClick={() => openModal("ai", "ai_waitlist_submit")}>Играть с ИИ <small>Скоро</small></button>
          </div>
        </div>
        <div className="final-piece" aria-hidden="true"><i /><i /><i /></div>
      </section>

      <section className="legal-section" id="legal">
        <h2>Важная информация</h2>
        <p>
          «Финансовое путешествие» — образовательная и развлекательная игра.
          Материалы сайта не являются финансовой, инвестиционной, налоговой или
          юридической рекомендацией и не обещают дохода или финансового результата.
        </p>
        <div className="legal-grid">
          <article id="privacy"><h3>Конфиденциальность</h3><p>Демонстрационные формы на этой версии сайта не отправляют и не сохраняют персональные данные.</p></article>
          <article id="terms"><h3>Пользовательские условия</h3><p>Рабочие документы, контакты, цены и правила возврата должны быть добавлены владельцем продукта перед коммерческим запуском.</p></article>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true"><span>↗</span></span>
          <span className="brand-copy"><strong>Financial Journey</strong><small>Финансовое путешествие</small></span>
        </a>
        <nav aria-label="Документы"><a href="#privacy">Конфиденциальность</a><a href="#terms">Условия</a><a href="#faq">FAQ</a></nav>
        <p>© 2026 Financial Journey</p>
      </footer>

      {modal && <Modal kind={modal} onClose={() => setModal(null)} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://financial-journey-game.d0bby.chatgpt.site/#organization",
                name: "Financial Journey",
                url: "https://financial-journey-game.d0bby.chatgpt.site/",
              },
              {
                "@type": "WebSite",
                "@id": "https://financial-journey-game.d0bby.chatgpt.site/#website",
                name: "Финансовое путешествие",
                url: "https://financial-journey-game.d0bby.chatgpt.site/",
                inLanguage: "ru-RU",
              },
              {
                "@type": "FAQPage",
                mainEntity: faqItems.map(([question, answer]) => ({
                  "@type": "Question",
                  name: question,
                  acceptedAnswer: { "@type": "Answer", text: answer },
                })),
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
