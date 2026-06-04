"use client";

import { fastTrackBoard, ratRaceBoard } from "@cashflow/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { AdminCardsPanel } from "@/components/admin/admin-cards-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { CreateGameForm } from "@/components/game/create-game-form";
import { JoinGameForm } from "@/components/game/join-game-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, shortDate } from "@/lib/format";
import type { GameListItem, GamesListResponse, ProfileResponse } from "@/lib/types";

type AdminSection = "dashboard" | "users" | "cards" | "rules" | "board";

const mainMenu: Array<{ id: AdminSection; label: string }> = [
  { id: "dashboard", label: "Дашборд" },
  { id: "users", label: "Пользователи" }
];

const settingsMenu: Array<{ id: AdminSection; label: string }> = [
  { id: "cards", label: "Карточки игры" },
  { id: "rules", label: "Правила игры" },
  { id: "board", label: "Игровое поле" }
];

const adminSections = new Set<AdminSection>([
  "dashboard",
  "users",
  "cards",
  "rules",
  "board"
]);

export function AdminPanel({
  profile,
  games,
  token
}: {
  profile: ProfileResponse;
  games: GamesListResponse;
  token: string;
}) {
  const searchParams = useSearchParams();
  const section = parseAdminSection(searchParams.get("section"));

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <nav className="rounded-md border border-line bg-white p-3 shadow-panel">
          <div className="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Админ-панель
          </div>
          <div className="space-y-1">
            {mainMenu.map((item) => (
              <MenuLink
                key={item.id}
                active={section === item.id}
                href={adminSectionHref(item.id)}
              >
                {item.label}
              </MenuLink>
            ))}
            <Link
              href="/guide"
              className="block rounded-md px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface"
            >
              Руководство
            </Link>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Настройки
            </div>
            <div className="space-y-1">
              {settingsMenu.map((item) => (
                <MenuLink
                  key={item.id}
                  active={section === item.id}
                  href={adminSectionHref(item.id)}
                >
                  {item.label}
                </MenuLink>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <main className="min-w-0">
        {section === "dashboard" ? (
          <AdminDashboard profile={profile} games={games} token={token} />
        ) : null}
        {section === "users" ? (
          <Card>
            <CardHeader>
              <CardTitle>Администрирование аккаунтов</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminUsersPanel token={token} />
            </CardContent>
          </Card>
        ) : null}
        {section === "cards" ? (
          <Card>
            <CardHeader>
              <CardTitle>Управление карточками игры</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminCardsPanel token={token} />
            </CardContent>
          </Card>
        ) : null}
        {section === "rules" ? <GameRulesSettings /> : null}
        {section === "board" ? <GameBoardSettings /> : null}
      </main>
    </div>
  );
}

function parseAdminSection(value: string | null): AdminSection {
  return value && adminSections.has(value as AdminSection)
    ? (value as AdminSection)
    : "dashboard";
}

function adminSectionHref(section: AdminSection) {
  return (
    section === "dashboard" ? "/dashboard" : `/dashboard?section=${section}`
  ) as Route;
}

function MenuLink({
  active,
  href,
  children
}: {
  active: boolean;
  href: Route;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition",
        active ? "bg-ink text-white" : "text-ink hover:bg-surface"
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function AdminDashboard({
  profile,
  games,
  token
}: {
  profile: ProfileResponse;
  games: GamesListResponse;
  token: string;
}) {
  const currentGames = useMemo(() => mergeCurrentGames(games), [games]);

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Краткие результаты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Партий" value={profile.stats.gamesPlayed} />
            <Metric label="Побед" value={profile.stats.wins} />
            <Metric label="Выходов из крысиных бегов" value={profile.stats.escapedRatRace} />
            <Metric
              label="Средний cashflow"
              value={money(profile.stats.averageMonthlyCashflowCents)}
            />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Список текущих игр</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentGames.length === 0 ? (
              <p className="text-sm text-neutral-600">Текущих игр пока нет.</p>
            ) : (
              currentGames.map((game) => <AdminGameRow key={game.id} game={game} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Новая комната</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <CreateGameForm token={token} />
            <div className="border-t border-line pt-4">
              <JoinGameForm token={token} />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>История игр</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryTable history={profile.history} />
        </CardContent>
      </Card>
    </div>
  );
}

function GameRulesSettings() {
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Правила игры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RulesSection
            title="Поля карточки"
            rows={cardFieldRules}
          />
          <RulesSection
            title="Meta поля"
            rows={cardMetaRules}
          />
          <RulesSection
            title="Effects"
            rows={cardEffectRules}
          />
          <RulesSection
            title="Payload для effects"
            rows={cardPayloadRules}
          />
          <RulesSection
            title="Conditions"
            rows={cardConditionRules}
          />
          <RulesSection
            title="Типы карточек"
            rows={cardTypeRules}
          />
          <RulesSection
            title="Правила применения карточек и клеток"
            rows={cardApplicationRules}
          />
          <RulesSection
            title="Рынок: распознавание активов"
            rows={marketTargetRules}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RulesSection({
  title,
  rows
}: {
  title: string;
  rows: RuleRow[];
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-neutral-500">
            <tr>
              <th className="w-56 px-3 py-2 font-medium">Поле / обозначение</th>
              <th className="px-3 py-2 font-medium">Правило</th>
              <th className="w-72 px-3 py-2 font-medium">Пример</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line align-top last:border-b-0">
                <td className="px-3 py-3 font-mono text-xs text-ink">{row.key}</td>
                <td className="px-3 py-3 leading-5 text-ink">{row.rule}</td>
                <td className="px-3 py-3 font-mono text-xs leading-5 text-neutral-700">
                  {row.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GameBoardSettings() {
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Игровое поле</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-2">
          <BoardTable title="Малый круг" cells={ratRaceBoard} />
          <BoardTable title="Быстрый круг" cells={fastTrackBoard} />
        </CardContent>
      </Card>
    </div>
  );
}

type RuleRow = {
  key: string;
  rule: string;
  example: string;
};

const cardFieldRules: RuleRow[] = [
  {
    key: "id",
    rule: "Внутренний номер карточки. Создается базой данных автоматически.",
    example: "1147"
  },
  {
    key: "cardType",
    rule: "Колода, из которой карточка может выпасть.",
    example: "SMALL_DEAL"
  },
  {
    key: "slug",
    rule: "Уникальный технический код карточки. Не показывается игроку.",
    example: "small_deal_custom_001"
  },
  {
    key: "title",
    rule: "Название карточки, показывается в действиях и журнале.",
    example: "Акция POP1"
  },
  {
    key: "bodyText",
    rule: "Основной текст карточки. Также используется как резерв для распознавания цены акций, рынка и сетевого маркетинга.",
    example: "Сегодняшняя цена $10"
  },
  {
    key: "category",
    rule: "Категория актива или карточки. При покупке становится типом актива; stock/share включает логику акций.",
    example: "stock"
  },
  {
    key: "subcategory",
    rule: "Дополнительная категория. Может участвовать в распознавании акций и рынка.",
    example: "realestate"
  },
  {
    key: "isActive",
    rule: "Только активные карточки попадают в случайную выдачу.",
    example: "true"
  },
  {
    key: "meta",
    rule: "Пары ключ-значение для цены, тикера, закладной, cashflow и дополнительных правил.",
    example: "symbol = POP1"
  },
  {
    key: "effects",
    rule: "Действия карточки: списать деньги, изменить cashflow, создать долг, изменить акции.",
    example: "cash_delta = -500"
  },
  {
    key: "conditions",
    rule: "Условия, без которых effect не применяется.",
    example: "has_children"
  }
];

const cardMetaRules: RuleRow[] = [
  {
    key: "symbol",
    rule: "Тикер акции или фонда. По нему покупаются акции и применяются дробление, уменьшение или обнуление.",
    example: "symbol = POP1"
  },
  {
    key: "today_price",
    rule: "Текущая цена одной акции. Для акций используется перед price.",
    example: "today_price = 10"
  },
  {
    key: "price",
    rule: "Цена актива или цена продажи на карточке рынка. Для обычных сделок это стоимость актива.",
    example: "price = 50000"
  },
  {
    key: "price_min",
    rule: "Минимальная возможная рыночная цена. Сейчас справочное поле для карточки, в расчет покупки не входит.",
    example: "price_min = 10"
  },
  {
    key: "price_max",
    rule: "Максимальная возможная рыночная цена. Сейчас справочное поле для карточки, в расчет покупки не входит.",
    example: "price_max = 30"
  },
  {
    key: "down_payment",
    rule: "Первоначальный взнос. Если нет cash_delta, при покупке обычной сделки списывается это значение.",
    example: "down_payment = 40000"
  },
  {
    key: "mortgage",
    rule: "Закладная/ипотека актива. Используется при продаже на рынке для расчета денег к получению.",
    example: "mortgage = 200000"
  },
  {
    key: "cashflow_monthly",
    rule: "Ежемесячный денежный поток актива. Используется, если нет эффекта cashflow_delta.",
    example: "cashflow_monthly = 950"
  },
  {
    key: "per_child",
    rule: "Если true/1/yes, cash_delta умножается на количество детей игрока.",
    example: "per_child = true"
  },
  {
    key: "liability_added",
    rule: "Справочное legacy-поле из seed. Сам долг создается effect-ом liability.create.",
    example: "liability_added = 4000"
  }
];

const cardEffectRules: RuleRow[] = [
  {
    key: "cash.adjust",
    rule: "Изменяет наличные игрока на amountCents. Положительное значение добавляет деньги, отрицательное списывает.",
    example: "cash.adjust = -500"
  },
  {
    key: "cash_delta",
    rule: "Старое имя для cash.adjust.",
    example: "cash_delta = -500"
  },
  {
    key: "conditional_cash_delta",
    rule: "Старое имя для cash.adjust, всегда считается автоматическим effect-ом и применяется только при выполненных conditions.",
    example: "conditional_cash_delta = -1000"
  },
  {
    key: "cashflow.adjust",
    rule: "Изменяет ежемесячный cashflow. Плюс добавляет пассивный доход, минус добавляет расход.",
    example: "cashflow.adjust = 1000"
  },
  {
    key: "cashflow_delta",
    rule: "Старое имя для cashflow.adjust.",
    example: "cashflow_delta = 1000"
  },
  {
    key: "liability.create",
    rule: "Создает долг игрока. Баланс берется из amountCents или payload.balanceCents, платеж из payload.paymentCents.",
    example: "liability.create = 17000 | payload = {\"type\":\"doodad_loan\",\"name\":\"Глиссер\",\"paymentCents\":340}"
  },
  {
    key: "asset.quantity.multiply",
    rule: "Умножает количество активных акций с указанным symbol у всех игроков в партии.",
    example: "asset.quantity.multiply = 2"
  },
  {
    key: "stock_split",
    rule: "Старое имя для asset.quantity.multiply.",
    example: "stock_split = 2"
  },
  {
    key: "asset.quantity.divide",
    rule: "Делит количество активных акций с указанным symbol. Если после деления 0, актив закрывается.",
    example: "asset.quantity.divide = 2"
  },
  {
    key: "stock_reverse_split",
    rule: "Старое имя для asset.quantity.divide.",
    example: "stock_reverse_split = 2"
  },
  {
    key: "asset.wipeout",
    rule: "Обнуляет активные акции с указанным symbol и помечает актив проданным.",
    example: "asset.wipeout = 0"
  },
  {
    key: "stock_wipeout",
    rule: "Старое имя для asset.wipeout.",
    example: "stock_wipeout = 0"
  }
];

const cardPayloadRules: RuleRow[] = [
  {
    key: "automatic",
    rule: "Если true, effect применяется сразу при выпадении карточки.",
    example: "payload = {\"automatic\":true}"
  },
  {
    key: "mode",
    rule: "mode = automatic также делает effect автоматическим.",
    example: "payload = {\"mode\":\"automatic\"}"
  },
  {
    key: "mandatory",
    rule: "Помечает effect обязательным. Для doodad cash.adjust и liability.create применяются как обязательные расходы.",
    example: "payload = {\"mandatory\":true}"
  },
  {
    key: "required",
    rule: "Альтернативное имя для mandatory.",
    example: "payload = {\"required\":true}"
  },
  {
    key: "type",
    rule: "Тип создаваемого долга для liability.create.",
    example: "payload = {\"type\":\"doodad_loan\"}"
  },
  {
    key: "name",
    rule: "Название создаваемого долга. Если не задано, берется title карточки.",
    example: "payload = {\"name\":\"Новый водный глиссер\"}"
  },
  {
    key: "balanceCents",
    rule: "Баланс долга для liability.create. Если не задан, берется amountCents.",
    example: "payload = {\"balanceCents\":17000}"
  },
  {
    key: "paymentCents",
    rule: "Ежемесячный платеж создаваемого долга.",
    example: "payload = {\"paymentCents\":340}"
  }
];

const cardConditionRules: RuleRow[] = [
  {
    key: "has_children",
    rule: "Effect применяется только если у игрока есть хотя бы один ребенок.",
    example: "has_children"
  },
  {
    key: "has_rental_realestate",
    rule: "Effect применяется, если у игрока есть актив недвижимости/аренды: дом, квартира, plex, duplex, 2BR/3BR и похожие названия.",
    example: "has_rental_realestate"
  },
  {
    key: "has_8_plex",
    rule: "Effect применяется, если у игрока есть актив 8-квартирного дома или 8-plex.",
    example: "has_8_plex"
  }
];

const cardTypeRules: RuleRow[] = [
  {
    key: "SMALL_DEAL",
    rule: "Мелкая сделка. На клетке Возможность игрок выбирает мелкую или крупную сделку.",
    example: "cardType = SMALL_DEAL"
  },
  {
    key: "BIG_DEAL",
    rule: "Крупная сделка. Покупка создает актив и списывает первоначальный взнос.",
    example: "cardType = BIG_DEAL"
  },
  {
    key: "DOODAD",
    rule: "Всякая всячина. При выпадении применяет обязательные cash/liability effects.",
    example: "cardType = DOODAD"
  },
  {
    key: "MARKET",
    rule: "Рынок. Если у игрока есть подходящий актив, игра предлагает продать его; игрок может отказаться.",
    example: "cardType = MARKET"
  },
  {
    key: "FAST_TRACK",
    rule: "Карточка быстрой дорожки. Выпадает на клетке fast_track.",
    example: "cardType = FAST_TRACK"
  },
  {
    key: "DREAM",
    rule: "Карточка мечты. Выпадает на клетке dream.",
    example: "cardType = DREAM"
  }
];

const cardApplicationRules: RuleRow[] = [
  {
    key: "active cards",
    rule: "Случайная выдача берет только карточки с isActive = true.",
    example: "isActive = true"
  },
  {
    key: "deal",
    rule: "На клетке Возможность появляется выбор SMALL_DEAL/BIG_DEAL. Покупка списывает down_payment или cash_delta и создает актив.",
    example: "price + down_payment + cashflow_monthly"
  },
  {
    key: "stock deal",
    rule: "Карточка считается акцией, если есть symbol, category/subcategory stock/share или в тексте есть акци/stock/share. Количество задает игрок.",
    example: "symbol = POP1"
  },
  {
    key: "automatic effects",
    rule: "Автоматически применяются stock effects, conditional_cash_delta и effects с payload automatic/mode automatic.",
    example: "stock_split = 2"
  },
  {
    key: "doodad",
    rule: "DOODAD применяет cash.adjust, liability.create и прямой cashflow.adjust как обязательные расходы.",
    example: "cash_delta = -200"
  },
  {
    key: "market",
    rule: "MARKET ищет подходящий актив игрока, считает цену продажи минус mortgage и показывает предложение Продать/Отказаться.",
    example: "price = 90000"
  },
  {
    key: "charity",
    rule: "Благотворительность предлагает заплатить 10% от totalIncome. При согласии игрок 3 своих хода кидает 2 кубика.",
    example: "donation = totalIncome / 10"
  },
  {
    key: "network marketing",
    rule: "Карточки TNI/AMWAY применяются только последовательно: уровень 1, затем 2, затем 3, затем 4. Иначе карточка сбрасывается.",
    example: "2 уровень требует текущий уровень 1"
  },
  {
    key: "paycheck",
    rule: "Игрок получает monthlyCashflow за каждую пройденную или достигнутую клетку Расчетный чек.",
    example: "paycheckHits × monthlyCashflow"
  },
  {
    key: "baby",
    rule: "Добавляет ребенка, максимум до 3. Расходы пересчитываются через стоимость ребенка профессии.",
    example: "childrenCount + 1"
  },
  {
    key: "downsized",
    rule: "Списывает сумму totalExpenses и ставит пропуск 2 ходов.",
    example: "cash -= totalExpenses"
  },
  {
    key: "rat race exit",
    rule: "Игрок выходит на быстрый круг, когда passiveIncome больше totalExpenses.",
    example: "passiveIncome > totalExpenses"
  }
];

const marketTargetRules: RuleRow[] = [
  {
    key: "10 гектар / 20 гектар",
    rule: "Рынок ищет земельные активы с таким количеством гектаров.",
    example: "10 гектар"
  },
  {
    key: "золотые монеты",
    rule: "Ищет активы, где текст содержит золот и монет.",
    example: "золотые монеты"
  },
  {
    key: "2У / 3М / 3BR / 3/2",
    rule: "Ищет дома соответствующего типа.",
    example: "3/2"
  },
  {
    key: "plex / квартирный дом",
    rule: "Ищет duplex, plex и 2/4/8-квартирные дома. Для цены за блок учитывает количество блоков.",
    example: "8-plex"
  },
  {
    key: "апартаменты",
    rule: "Ищет активы с апартаментами. Для цены за номер учитывает 12/24 апартамента.",
    example: "24 апартамента"
  },
  {
    key: "автомойка",
    rule: "Ищет актив автомойки.",
    example: "автомой"
  },
  {
    key: "шашлычная",
    rule: "Ищет актив шашлычного бизнеса.",
    example: "шашлык"
  },
  {
    key: "цирконий",
    rule: "Ищет активы с цирконием.",
    example: "циркони"
  },
  {
    key: "программное обеспечение",
    rule: "Ищет software/программные активы.",
    example: "программ"
  },
  {
    key: "салон красоты",
    rule: "Ищет актив, где есть салон и красота.",
    example: "салон красоты"
  },
  {
    key: "партнерство",
    rule: "Ищет партнерский бизнес.",
    example: "партнерств"
  }
];

function BoardTable({
  title,
  cells
}: {
  title: string;
  cells: Array<{ index: number; type: string; label: string }>;
}) {
  return (
    <div className="overflow-x-auto">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="border-b border-line text-neutral-500">
          <tr>
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Тип</th>
            <th className="py-2 font-medium">Название клетки</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr key={`${title}-${cell.index}`} className="border-b border-line">
              <td className="py-2">{cell.index + 1}</td>
              <td className="py-2 font-mono text-xs">{cell.type}</td>
              <td className="py-2">{cell.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ history }: { history: ProfileResponse["history"] }) {
  if (history.length === 0) {
    return <p className="text-sm text-neutral-600">Истории игр пока нет.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="border-b border-line text-neutral-500">
          <tr>
            <th className="py-2 font-medium">Партия</th>
            <th className="py-2 font-medium">Статус</th>
            <th className="py-2 font-medium">Результат</th>
            <th className="py-2 font-medium">Профессия</th>
            <th className="py-2 font-medium">Cashflow</th>
            <th className="py-2 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={`${item.gameId}-${item.joinedAt}`} className="border-b border-line">
              <td className="py-3">
                <Link className="font-medium text-success" href={`/games/${item.gameId}`}>
                  {item.title}
                </Link>
                <div className="text-xs text-neutral-500">{item.code}</div>
              </td>
              <td className="py-3">{item.status}</td>
              <td className="py-3">{gameResult(item)}</td>
              <td className="py-3">{item.profession ?? "—"}</td>
              <td className="py-3">{money(item.monthlyCashflowCents)}</td>
              <td className="py-3">{shortDate(item.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function AdminGameRow({ game }: { game: GameListItem }) {
  const players = game.players.filter((player) => player.role === "PLAYER");
  return (
    <Link
      href={`/games/${game.id}`}
      className="flex items-center justify-between gap-3 rounded-md border border-line p-3 transition hover:bg-surface"
    >
      <div>
        <div className="font-medium">{game.title}</div>
        <div className="text-xs text-neutral-500">
          {game.code} · {players.length}/{game.maxPlayers} игроков
        </div>
      </div>
      <Badge className="bg-surface text-ink">{game.status}</Badge>
    </Link>
  );
}

function mergeCurrentGames(games: GamesListResponse) {
  const byId = new Map<string, GameListItem>();
  for (const game of [...games.mine, ...games.open]) {
    if (game.status === "ENDED" || game.status === "CANCELLED") continue;
    byId.set(game.id, game);
  }
  return [...byId.values()];
}

function gameResult(item: ProfileResponse["history"][number]) {
  if (item.wonAt) return "Победа";
  if (item.escapedRatRaceAt) return "Вышел из крысиных бегов";
  if (item.endedAt) return "Завершена";
  return "В процессе";
}
