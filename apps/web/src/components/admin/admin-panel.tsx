"use client";

import { fastTrackBoard, ratRaceBoard } from "@cashflow/shared";
import {
  BookOpenText,
  Boxes,
  Activity,
  CircleHelp,
  Download,
  History,
  LayoutDashboard,
  Map as MapIcon,
  MessageSquareText,
  Send,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { AdminCardsPanel } from "@/components/admin/admin-cards-panel";
import { AdminChangesPanel } from "@/components/admin/admin-changes-panel";
import { AdminFeedbackPanel } from "@/components/admin/admin-feedback-panel";
import { AdminMonitoringPanel } from "@/components/admin/admin-monitoring-panel";
import { AdminPublicationsPanel } from "@/components/admin/admin-publications-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { CreateGameForm } from "@/components/game/create-game-form";
import { JoinGameForm } from "@/components/game/join-game-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicApiBaseUrl } from "@/lib/api";
import type { SystemRelease } from "@/lib/changes";
import { money, shortDate } from "@/lib/format";
import { gameStatusLabel } from "@/lib/game-labels";
import type { GameListItem, GamesListResponse, ProfileResponse } from "@/lib/types";

type AdminSection =
  | "dashboard"
  | "users"
  | "cards"
  | "rules"
  | "board"
  | "feedback"
  | "monitoring"
  | "publications"
  | "changes";

type AdminMenuItem = {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
};

const mainMenu: AdminMenuItem[] = [
  { id: "dashboard", label: "Обзор", icon: LayoutDashboard },
  { id: "users", label: "Пользователи", icon: UsersRound },
  { id: "feedback", label: "Предложения", icon: MessageSquareText },
  { id: "monitoring", label: "Мониторинг", icon: Activity },
  { id: "publications", label: "Публикации", icon: Send },
  { id: "changes", label: "Изменения", icon: History }
];

const settingsMenu: AdminMenuItem[] = [
  { id: "cards", label: "Карточки игры", icon: Boxes },
  { id: "rules", label: "Справочник правил", icon: BookOpenText },
  { id: "board", label: "Игровое поле", icon: MapIcon }
];

const allMenuItems = [...mainMenu, ...settingsMenu];

const adminSections = new Set<AdminSection>([
  "dashboard",
  "users",
  "cards",
  "rules",
  "board",
  "feedback",
  "monitoring",
  "publications",
  "changes"
]);

export function AdminPanel({
  profile,
  games,
  token,
  releases,
  currentVersion
}: {
  profile: ProfileResponse;
  games: GamesListResponse;
  token: string;
  releases: SystemRelease[];
  currentVersion: string;
}) {
  const searchParams = useSearchParams();
  const section = parseAdminSection(searchParams.get("section"));
  const activeMenuItem = allMenuItems.find((item) => item.id === section) ?? mainMenu[0];
  const ActiveSectionIcon = activeMenuItem?.icon;

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-balance text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              Управление порталом
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
              Контролируйте комнаты, аккаунты, игровые данные и обратную связь из одного рабочего пространства.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold sm:self-auto">
            {ActiveSectionIcon ? <ActiveSectionIcon size={17} aria-hidden="true" /> : null}
            {activeMenuItem?.label ?? "Обзор"}
          </div>
        </div>
      </section>

      <nav
        aria-label="Разделы административной панели"
        className="flex snap-x gap-2 overflow-x-auto pb-2 lg:hidden"
      >
        {allMenuItems.map((item) => (
          <MobileMenuLink key={item.id} item={item} active={section === item.id} />
        ))}
        <Link
          href="/guide"
          className="inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-xl bg-card px-4 text-sm font-extrabold text-ink shadow-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
        >
          <CircleHelp size={17} aria-hidden="true" />
          Правила для игроков
        </Link>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <nav className="overflow-hidden rounded-2xl bg-card shadow-panel" aria-label="Разделы административной панели">
            <div className="border-b border-line/70 p-4">
              <div className="text-base font-extrabold text-ink">Разделы управления</div>
              <p className="mt-1 text-xs leading-5 text-muted">Рабочие инструменты администратора.</p>
            </div>
            <div className="space-y-1 p-2">
              {mainMenu.map((item) => (
                <MenuLink key={item.id} item={item} active={section === item.id} />
              ))}
            </div>

            <div className="border-t border-line/70 p-2">
              <div className="px-3 pb-2 pt-1 text-xs font-bold text-muted">Игровые данные</div>
              <div className="space-y-1">
                {settingsMenu.map((item) => (
                  <MenuLink key={item.id} item={item} active={section === item.id} />
                ))}
              </div>
            </div>
            <Link
              href="/guide"
              className="flex items-center gap-3 border-t border-line/70 px-5 py-4 text-sm font-extrabold text-journey transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-action/25"
            >
              <CircleHelp size={18} aria-hidden="true" />
              Правила для игроков
            </Link>
          </nav>
        </aside>

        <main className="min-w-0">
        {section === "dashboard" ? (
          <AdminDashboard profile={profile} games={games} token={token} />
        ) : null}
        {section === "users" ? (
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl">Пользователи</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted">Создавайте аккаунты, назначайте роли и контролируйте доступ к порталу.</p>
            </CardHeader>
            <CardContent>
              <AdminUsersPanel token={token} />
            </CardContent>
          </Card>
        ) : null}
        {section === "cards" ? (
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl">Карточки игры</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted">Управляйте содержанием колод и техническими эффектами карточек.</p>
            </CardHeader>
            <CardContent>
              <AdminCardsPanel token={token} />
            </CardContent>
          </Card>
        ) : null}
        {section === "rules" ? <GameRulesSettings /> : null}
        {section === "board" ? <GameBoardSettings /> : null}
        {section === "feedback" ? (
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl">Предложения пользователей</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted">Новые сообщения остаются заметными, пока вы не отметите их прочитанными.</p>
            </CardHeader>
            <CardContent>
              <AdminFeedbackPanel token={token} />
            </CardContent>
          </Card>
        ) : null}
        {section === "monitoring" ? (
          <Card className="rounded-2xl border-0">
            <CardContent className="pt-6">
              <AdminMonitoringPanel token={token} />
            </CardContent>
          </Card>
        ) : null}
        {section === "publications" ? <AdminPublicationsPanel token={token} /> : null}
        {section === "changes" ? (
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl">Последние изменения</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted">Что уже выпущено и какие улучшения готовятся к следующему релизу.</p>
            </CardHeader>
            <CardContent>
              <AdminChangesPanel releases={releases} currentVersion={currentVersion} />
            </CardContent>
          </Card>
        ) : null}
        </main>
      </div>
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

function MenuLink({ item, active }: { item: AdminMenuItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={adminSectionHref(item.id)}
      aria-current={active ? "page" : undefined}
      className={[
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25",
        active ? "bg-ink text-white shadow-[0_8px_20px_rgba(5,18,45,.16)]" : "text-muted hover:bg-white hover:text-ink"
      ].join(" ")}
    >
      <Icon size={18} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function MobileMenuLink({ item, active }: { item: AdminMenuItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={adminSectionHref(item.id)}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25",
        active ? "bg-ink text-white shadow-panel" : "bg-card text-muted shadow-panel"
      ].join(" ")}
    >
      <Icon size={17} aria-hidden="true" />
      {item.label}
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
      <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-[-0.025em]">Состояние портала</h2>
          <p className="mt-1 text-sm text-muted">Агрегированные результаты сыгранных партий.</p>
        </div>
          <dl className="mt-5 grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-line/70">
            <Metric label="Партий" value={profile.stats.gamesPlayed} />
            <Metric label="Побед" value={profile.stats.wins} />
            <Metric label="Выходов из крысиных бегов" value={profile.stats.escapedRatRace} />
            <Metric
              label="Средний денежный поток"
              value={money(profile.stats.averageMonthlyCashflowCents)}
            />
          </dl>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">Текущие комнаты</CardTitle>
            <p className="mt-1 text-sm text-muted">Все открытые и активные партии портала.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentGames.length === 0 ? (
              <p className="rounded-xl bg-card p-4 text-sm text-muted">Текущих игр пока нет.</p>
            ) : (
              currentGames.map((game) => <AdminGameRow key={game.id} game={game} />)
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">Новая комната</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <CreateGameForm token={token} allowCardSetSelection />
            <div className="border-t border-line pt-4">
              <JoinGameForm token={token} />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-0">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">История игр</CardTitle>
            <p className="mt-1 text-sm text-muted">Завершённые партии и экспорт аналитики.</p>
          </div>
          <AnalyticsExportButton token={token} />
        </CardHeader>
        <CardContent>
          <HistoryTable history={profile.history} />
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsExportButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadExport() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/admin/analytics/export.ndjson?status=ENDED`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Ошибка экспорта: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `game-history-${date}.ndjson`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Не удалось скачать историю игр"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button variant="secondary" onClick={downloadExport} disabled={loading}>
        <Download className="mr-2" size={16} aria-hidden="true" />
        {loading ? "Готовлю файл..." : "Скачать историю игр"}
      </Button>
      {error ? <p className="max-w-sm text-xs text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}

function GameRulesSettings() {
  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl border-0">
        <CardHeader>
          <CardTitle className="text-xl">Справочник игровых данных</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted">Технические обозначения, эффекты и условия, которые используются редактором карточек.</p>
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
      <h3 className="mb-3 text-base font-extrabold">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-line/70" role="region" aria-label={title} tabIndex={0}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="w-56 px-4 py-3 font-extrabold">Поле / обозначение</th>
              <th className="px-4 py-3 font-extrabold">Правило</th>
              <th className="w-72 px-4 py-3 font-extrabold">Пример</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line/70 align-top last:border-b-0 even:bg-card/60">
                <td className="px-4 py-3 font-mono text-xs font-bold text-ink">{row.key}</td>
                <td className="px-4 py-3 leading-6 text-ink">{row.rule}</td>
                <td className="px-4 py-3 font-mono text-xs leading-5 text-muted">
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
      <Card className="rounded-2xl border-0">
        <CardHeader>
          <CardTitle className="text-xl">Игровое поле</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted">Порядок и системные типы клеток малого и быстрого кругов.</p>
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
    rule: "Игрок побеждает, и партия завершается, когда passiveIncome больше totalExpenses.",
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
    <div>
      <h3 className="mb-3 text-base font-extrabold">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-line/70" role="region" aria-label={title} tabIndex={0}>
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="bg-ink text-white">
          <tr>
            <th className="px-3 py-3 font-extrabold">#</th>
            <th className="px-3 py-3 font-extrabold">Тип</th>
            <th className="px-3 py-3 font-extrabold">Название клетки</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr key={`${title}-${cell.index}`} className="border-b border-line/70 last:border-b-0 even:bg-card/60">
              <td className="px-3 py-3 font-bold">{cell.index + 1}</td>
              <td className="px-3 py-3 font-mono text-xs">{cell.type}</td>
              <td className="px-3 py-3">{cell.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function HistoryTable({ history }: { history: ProfileResponse["history"] }) {
  if (history.length === 0) {
    return <p className="rounded-xl bg-card p-4 text-sm text-muted">Истории игр пока нет.</p>;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {history.map((item) => (
          <article key={`${item.gameId}-${item.joinedAt}`} className="rounded-xl bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="font-extrabold text-journey" href={`/games/${item.gameId}`}>
                  {item.title}
                </Link>
                <div className="mt-1 font-mono text-xs text-muted">{item.code}</div>
              </div>
              <Badge className="shrink-0 bg-[#e8effe] font-bold text-journey">
                {gameStatusLabel(item.status)}
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Результат</dt><dd className="mt-1 font-bold">{gameResult(item)}</dd></div>
              <div><dt className="text-xs text-muted">Денежный поток</dt><dd className="mt-1 font-bold">{money(item.monthlyCashflowCents)}</dd></div>
              <div><dt className="text-xs text-muted">Профессия</dt><dd className="mt-1 font-bold">{item.profession ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Дата</dt><dd className="mt-1 font-bold">{shortDate(item.joinedAt)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="border-b border-line/70 text-muted">
          <tr>
            <th className="pb-3 font-bold">Партия</th>
            <th className="pb-3 font-bold">Статус</th>
            <th className="pb-3 font-bold">Результат</th>
            <th className="pb-3 font-bold">Профессия</th>
            <th className="pb-3 font-bold">Денежный поток</th>
            <th className="pb-3 font-bold">Дата</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={`${item.gameId}-${item.joinedAt}`} className="border-b border-line/70 last:border-b-0">
              <td className="py-4 pr-4">
                <Link className="font-extrabold text-journey" href={`/games/${item.gameId}`}>
                  {item.title}
                </Link>
                <div className="mt-1 font-mono text-xs text-muted">{item.code}</div>
              </td>
              <td className="py-4 pr-4">{gameStatusLabel(item.status)}</td>
              <td className="py-4 pr-4">{gameResult(item)}</td>
              <td className="py-4 pr-4">{item.profession ?? "—"}</td>
              <td className="py-4 pr-4 font-bold">{money(item.monthlyCashflowCents)}</td>
              <td className="py-4">{shortDate(item.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 px-3 sm:px-5 first:pl-0 last:pr-0">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-1 break-words text-xl font-extrabold tracking-[-0.025em] text-ink">{value}</dd>
    </div>
  );
}

function AdminGameRow({ game }: { game: GameListItem }) {
  const players = game.players.filter((player) => player.role === "PLAYER");
  return (
    <Link
      href={`/games/${game.id}`}
      className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
    >
      <div>
        <div className="font-extrabold">{game.title}</div>
        <div className="mt-1 text-xs text-muted">
          {game.mode === "SOLO"
            ? `С ботами · ${players.filter((player) => player.controller === "BOT").length} соперников · ${game.cardSet.name}`
            : `${game.code} · ${players.length} игроков · ${game.cardSet.name}`}
        </div>
      </div>
      <Badge className="shrink-0 bg-[#e8effe] font-bold text-journey">{gameStatusLabel(game.status)}</Badge>
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
