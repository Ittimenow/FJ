"use client";

import { fastTrackBoard, ratRaceBoard } from "@cashflow/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AdminCardsPanel } from "@/components/admin/admin-cards-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { CreateGameForm } from "@/components/game/create-game-form";
import { JoinGameForm } from "@/components/game/join-game-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, shortDate } from "@/lib/format";
import type { GameListItem, GamesListResponse, ProfileResponse } from "@/lib/types";

type AdminSection = "dashboard" | "users" | "cards" | "board";

const mainMenu: Array<{ id: AdminSection; label: string }> = [
  { id: "dashboard", label: "Дашборд" },
  { id: "users", label: "Пользователи" }
];

const settingsMenu: Array<{ id: AdminSection; label: string }> = [
  { id: "cards", label: "Карточки игры" },
  { id: "board", label: "Игровое поле" }
];

export function AdminPanel({
  profile,
  games,
  token
}: {
  profile: ProfileResponse;
  games: GamesListResponse;
  token: string;
}) {
  const [section, setSection] = useState<AdminSection>("dashboard");

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <nav className="rounded-md border border-line bg-white p-3 shadow-panel">
          <div className="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Админ-панель
          </div>
          <div className="space-y-1">
            {mainMenu.map((item) => (
              <MenuButton
                key={item.id}
                active={section === item.id}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </MenuButton>
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
                <MenuButton
                  key={item.id}
                  active={section === item.id}
                  onClick={() => setSection(item.id)}
                >
                  {item.label}
                </MenuButton>
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
        {section === "board" ? <GameBoardSettings /> : null}
      </main>
    </div>
  );
}

function MenuButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition",
        active ? "bg-ink text-white" : "text-ink hover:bg-surface"
      ].join(" ")}
    >
      {children}
    </button>
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
