"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleGauge,
  CircleHelp,
  Dice5,
  FileChartColumn,
  Handshake,
  Landmark,
  MessageSquareText,
  Rocket,
  Scale,
  Target,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { publicSiteUrl } from "@/lib/site";
import { CookieSettingsLink } from "@/components/analytics/cookie-settings-link";
import { BrandLogo } from "@/components/layout/brand-logo";

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

const firstGameSteps: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Rocket,
    title: "Создайте комнату",
    text: "Или войдите в чужую по коду. Регистрация занимает минуту.",
  },
  {
    icon: Users,
    title: "Соберите стол",
    text: "От 2 игроков без верхнего лимита, а также роли банкира и наблюдателя.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Выберите профессию и фишку",
    text: "У каждого свои стартовые доходы, расходы и обязательства.",
  },
  {
    icon: Dice5,
    title: "Играйте",
    text: "Ходы, сделки, зарплаты, кредиты и банкротство считаются автоматически.",
  },
];

const gameSpaces: Array<{
  icon: LucideIcon;
  title: string;
  label?: string;
  text: string;
  tone: string;
}> = [
  {
    icon: CircleGauge,
    title: "Крысиные бега",
    label: "Малый круг",
    text: "Вырастите пассивный доход выше своих трат — и круг закончится.",
    tone: "ratrace",
  },
  {
    icon: Target,
    title: "Скоростная дорожка",
    label: "Большой круг",
    text: "Играйте за финансовую цель и за мечту. Правила здесь другие.",
    tone: "fasttrack",
  },
  {
    icon: Handshake,
    title: "Карточки сделок",
    text: "Покупайте недвижимость, доли в бизнесе и акции — или откажитесь.",
    tone: "deal",
  },
  {
    icon: Landmark,
    title: "Рынок",
    text: "Продавайте на пике или держите дальше: окно сделки закроется.",
    tone: "market",
  },
  {
    icon: CircleHelp,
    title: "Случайные события",
    text: "Проверьте, выдержит ли ваш план ремонт, болезнь или потерю работы.",
    tone: "doodad",
  },
  {
    icon: Banknote,
    title: "Банк и обязательства",
    text: "Берите кредит, гасите долг и управляйте финансовым рычагом.",
    tone: "bank",
  },
  {
    icon: FileChartColumn,
    title: "Финансовый отчёт",
    text: "Следите за доходами, расходами, активами и денежным потоком.",
    tone: "payday",
  },
  {
    icon: MessageSquareText,
    title: "Чат и журнал",
    text: "Обсуждайте ходы и возвращайтесь к любому решению партии.",
    tone: "neutral",
  },
];

const hostBenefits = [
  ["География больше не ограничивает", "Участники из любого города и часового пояса. Одна ссылка вместо аренды зала."],
  ["Расчёты берёт на себя сервер", "Зарплаты, проценты, кредиты и банкротство считаются автоматически."],
  ["Роли банкира и наблюдателя", "Сохраняйте контроль над операциями или наблюдайте за группой со стороны."],
  ["Дебриф на фактах", "Журнал хранит каждое решение — возвращайтесь к конкретному ходу, а не к ощущениям."],
  ["Статистика вместо памяти", "История партий показывает повторяющиеся решения участника от игры к игре."],
  ["Масштаб без коробок", "Проводите больше групп без пересчётов вручную и дополнительных комплектов игры."],
];

const learningSkills: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ChartNoAxesCombined,
    title: "Считайте денежный поток",
    text: "Смотрите не только на то, сколько пришло, а на то, сколько осталось и что оно делает дальше.",
  },
  {
    icon: WalletCards,
    title: "Отличайте актив от пассива",
    text: "Поставьте машину в кредит и квартиру в аренду по разные стороны отчёта.",
  },
  {
    icon: Scale,
    title: "Пользуйтесь долгом осознанно",
    text: "Поймите, где кредит работает как рычаг, а где превращается в яму.",
  },
  {
    icon: Dice5,
    title: "Держите стратегию под давлением",
    text: "Рынок и события меняют любой план — тренируйтесь принимать следующее решение.",
  },
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
    "Для старта нужны минимум два игрока, а верхнего лимита в командной комнате нет. Также предусмотрены роли банкира и наблюдателя.",
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
  const modalRef = useRef<HTMLElement>(null);
  const content = modalContent[kind];

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", listener);
      document.body.classList.remove("modal-open");
      previousFocus?.focus();
    };
  }, [onClose]);

  function keepFocusInside(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("success");
    track("form_submit_success", kind);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={keepFocusInside}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  function openModal(kind: Exclude<ModalKind, null>, event: string) {
    track(event, kind);
    if (kind === "create" || kind === "join") {
      window.location.assign("/login");
      return;
    }
    setModal(kind);
  }

  function closeMobileMenu() {
    mobileMenuRef.current?.removeAttribute("open");
    setMobileMenuOpen(false);
  }

  return (
    <main id="top" className="landing-root">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Финансовое путешествие — на главную">
          <BrandLogo markClassName="h-[42px] w-[42px]" textClassName="text-[13px]" />
        </a>

        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#journey">Как проходит игра</a>
          <a href="#routes">Игрокам</a>
          <a href="#team">Найти команду</a>
          <a href="#hosts">Ведущим</a>
          <a href="#faq">FAQ</a>
          <a href="/materials">Материалы</a>
        </nav>

        <div className="header-actions">
          <a className="login-link" href="/login" onClick={() => track("login_click")}>
            Войти
          </a>
          <a className="button button-orange" href="/register" onClick={() => track("register_click", "header")}>
            Начать игру
          </a>
        </div>

        <div className="mobile-header-actions">
          <a
            className="mobile-account-link"
            href="/login"
            aria-label="Войти или открыть личный кабинет"
            onClick={() => track("login_click", "mobile_header")}
          >
            <UserRound size={23} strokeWidth={2.2} aria-hidden="true" />
          </a>
          <details
            className="mobile-nav"
            ref={mobileMenuRef}
            onToggle={(event) => setMobileMenuOpen(event.currentTarget.open)}
          >
            <summary
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={mobileMenuOpen}
            ><span /><span /></summary>
            <nav aria-label="Мобильная навигация">
              <a href="#journey" onClick={closeMobileMenu}>Как проходит игра</a>
              <a href="#routes" onClick={closeMobileMenu}>Игрокам</a>
              <a href="#team" onClick={closeMobileMenu}>Найти команду</a>
              <a href="#hosts" onClick={closeMobileMenu}>Ведущим</a>
              <a href="#ai" onClick={closeMobileMenu}>Игра с ИИ <small>Скоро</small></a>
              <a href="#faq" onClick={closeMobileMenu}>FAQ</a>
              <a href="/materials" onClick={closeMobileMenu}>Материалы</a>
              <a className="mobile-start-link" href="/register" onClick={() => track("register_click", "mobile_menu")}>Начать игру</a>
            </nav>
          </details>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1>
            Проживите свою жизнь за <span>полтора часа</span>
          </h1>
          <p className="hero-lead">
            Проиграйте свои финансовые решения раньше, чем проживёте их
          </p>
          <p className="hero-support">
            Увидьте свои денежные привычки со стороны — и замените их новыми
            потоками дохода.
          </p>
          <p className="hero-support">
            Соберите за одним столом всю команду, покупайте активы, берите кредиты,
            переживайте увольнения и внезапные расходы. Ищите тот самый
            пассивный доход, который больше ваших трат. Считает сервер — вы
            только принимаете решения.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-large" type="button" onClick={() => openModal("create", "hero_start")}>
              Начать игру бесплатно <span aria-hidden="true">→</span>
            </button>
            <button className="button button-secondary button-large" type="button" onClick={() => openModal("join", "join_room_click")}>
              Веду игры
            </button>
          </div>
          <div className="hero-links" aria-label="Дополнительные маршруты">
            <button type="button" onClick={() => openModal("team", "find_team_click")}>Найти команду <small>Скоро</small></button>
            <button type="button" onClick={() => openModal("host", "hire_host_click")}>Нанять ведущего <small>Скоро</small></button>
            <button type="button" onClick={() => openModal("ai", "ai_waitlist_submit")}>Играть одному <small>Скоро</small></button>
          </div>
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

      <section className="section learning-problem" id="problem">
        <div className="learning-problem-copy">
          <h2>Финансовой грамотности не учат. Учит только опыт — и он дорогой</h2>
          <p>
            Ипотека под настроение. Кредит на то, что перестало радовать через
            месяц. Инвестиция «по совету знакомого». Пять лет работы ради
            зарплаты, которая заканчивается за две недели до следующей.
          </p>
          <p>
            Решения о деньгах принимаются редко, а обратная связь приходит
            слишком поздно. Игра сжимает это время: за один вечер вы принимаете
            столько финансовых решений, сколько в жизни — за десятилетие.
          </p>
        </div>
        <div className="experience-compare" aria-label="Сравнение финансового опыта в жизни и в игре">
          <div className="compare-head" aria-hidden="true">
            <span>Обычно</span>
            <span>В игре</span>
          </div>
          {[
            ["Ошибка обходится в годы и нервы", "Ошибка обходится в один ход"],
            ["Результат виден через пять лет", "Результат виден через пять минут"],
            ["Некому объяснить, что пошло не так", "Журнал покажет каждое решение"],
          ].map(([usual, game]) => (
            <div className="compare-row" key={usual}>
              <span>{usual}</span>
              <strong>{game}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section first-game-section" id="journey">
        <div className="section-head split">
          <h2>Четыре шага до первой партии</h2>
          <p>Комната собирается за несколько минут, а все расчёты остаются внутри игры.</p>
        </div>
        <div className="first-game-flow">
          {firstGameSteps.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="section-actions">
          <button className="button button-primary" type="button" onClick={() => openModal("create", "create_room_click")}>Создать комнату</button>
          <button className="button button-light" type="button" onClick={() => openModal("join", "join_room_click")}>Присоединиться по коду</button>
        </div>
      </section>

      <section className="section game-spaces-section" id="inside-game">
        <div className="section-head split light-head">
          <h2>Пройдите оба круга — и посмотрите, где сойдёте с дистанции</h2>
          <p>Цвет и знак каждой зоны повторяют язык игрового поля, чтобы ориентироваться было проще с первого хода.</p>
        </div>
        <div className="game-spaces-grid">
          {gameSpaces.map(({ icon: Icon, title, label, text, tone }) => (
            <article className={`game-space-card ${tone}`} key={title}>
              <div className="game-space-icon"><Icon aria-hidden="true" /></div>
              <div>
                {label && <span>{label}</span>}
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section learning-skills" id="players">
        <div className="section-head centered">
          <h2>Заберите с собой четыре навыка</h2>
          <p>Не обещания богатства, а понятные способы оценивать собственные финансовые решения.</p>
        </div>
        <div className="learning-skills-grid">
          {learningSkills.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section hosts-story" id="hosts">
        <div className="hosts-story-head">
          <h2>Ведущим: ваш стол теперь помещается в ссылку</h2>
          <p>
            Онлайн-версия снимает три ограничения сразу: географию, рутинные
            расчёты и количество доступных столов. Вы ведёте людей, а не арифметику.
          </p>
        </div>
        <div className="host-benefits">
          {hostBenefits.map(([title, text]) => (
            <article key={title}><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
        <div className="host-formats">
          <p><strong>Сценарии:</strong> открытые платные игры · корпоративные сессии · клубы · школы и вузы · программы консультантов</p>
          <div>
            <button className="button button-orange" type="button" onClick={() => openModal("leader", "host_first_game")}>Провести первую игру</button>
            <button className="button button-light" type="button" onClick={() => openModal("leader", "host_conditions")}>Условия для клубов и школ</button>
          </div>
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
          <div className="match-card"><strong>Команда собрана</strong><span>4 игрока готовы</span></div>
        </div>
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
          <article id="privacy"><h3>Конфиденциальность</h3><p>Мы обрабатываем данные аккаунта только для работы сервиса. Подробности доступны в <a href="/privacy">политике обработки персональных данных</a>.</p></article>
          <article id="terms"><h3>Пользовательские условия</h3><p>Рабочие документы, контакты, цены и правила возврата должны быть добавлены владельцем продукта перед коммерческим запуском.</p></article>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <BrandLogo markClassName="h-[42px] w-[42px]" textClassName="text-[13px] text-white" />
        </a>
        <nav aria-label="Документы"><a href="/materials">Материалы</a><a href="/privacy">Конфиденциальность</a><a href="#terms">Условия</a><a href="#faq">FAQ</a><CookieSettingsLink /></nav>
        <p>© 2026 Финансовое путешествие</p>
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
                "@id": `${publicSiteUrl}/#organization`,
                name: "Финансовое путешествие",
                url: `${publicSiteUrl}/`,
              },
              {
                "@type": "WebSite",
                "@id": `${publicSiteUrl}/#website`,
                name: "Финансовое путешествие",
                url: `${publicSiteUrl}/`,
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
