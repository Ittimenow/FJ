import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPanel } from "@/components/admin/admin-panel";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGameForm } from "@/components/game/create-game-form";
import { JoinGameForm } from "@/components/game/join-game-form";
import { apiFetch } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { GamesListResponse, ProfileResponse } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const [profile, games] = await Promise.all([
    apiFetch<ProfileResponse>("/users/me", session.accessToken),
    apiFetch<GamesListResponse>("/games", session.accessToken)
  ]);
  const canCreateGames =
    profile.user.role === "HOST" || profile.user.role === "ADMIN";
  const isAdmin = profile.user.role === "ADMIN";

  return (
    <AppShell userName={profile.user.displayName}>
      {isAdmin ? (
        <AdminPanel profile={profile} games={games} token={session.accessToken} />
      ) : (
      <div className="grid gap-6">
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Личный кабинет</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-surface text-ink">{profile.user.role}</Badge>
                <Badge className="bg-surface text-ink">{profile.user.status}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Партий" value={profile.stats.gamesPlayed} />
                <Metric label="Побед" value={profile.stats.wins} />
                <Metric label="Выходов" value={profile.stats.escapedRatRace} />
                <Metric
                  label="Средний cashflow"
                  value={money(profile.stats.averageMonthlyCashflowCents)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Новая комната</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {canCreateGames ? (
                <CreateGameForm token={session.accessToken} />
              ) : (
                <p className="text-sm text-neutral-600">
                  Создавать партии может ведущий или администратор.
                </p>
              )}
              <div className="border-t border-line pt-4">
                <JoinGameForm token={session.accessToken} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Мои партии</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {games.mine.length === 0 ? (
                <p className="text-sm text-neutral-600">Активных партий пока нет.</p>
              ) : (
                games.mine.map((game) => <GameRow key={game.id} game={game} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Открытые комнаты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {games.open.length === 0 ? (
                <p className="text-sm text-neutral-600">Нет комнат в ожидании.</p>
              ) : (
                games.open.map((game) => <GameRow key={game.id} game={game} />)
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Написать администратору</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-neutral-600">
              Есть идея по улучшению игры? Напишите нам — мы читаем каждое сообщение.
            </p>
            <FeedbackForm token={session.accessToken} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>История партий</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-neutral-500">
                  <tr>
                    <th className="py-2 font-medium">Партия</th>
                    <th className="py-2 font-medium">Статус</th>
                    <th className="py-2 font-medium">Профессия</th>
                    <th className="py-2 font-medium">Cashflow</th>
                    <th className="py-2 font-medium">Выход</th>
                    <th className="py-2 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.history.map((item) => (
                    <tr key={`${item.gameId}-${item.joinedAt}`} className="border-b border-line">
                      <td className="py-3">
                        <Link className="font-medium text-success" href={`/games/${item.gameId}`}>
                          {item.title}
                        </Link>
                        <div className="text-xs text-neutral-500">{item.code}</div>
                      </td>
                      <td className="py-3">{item.status}</td>
                      <td className="py-3">{item.profession ?? "—"}</td>
                      <td className="py-3">{money(item.monthlyCashflowCents)}</td>
                      <td className="py-3">{shortDate(item.escapedRatRaceAt)}</td>
                      <td className="py-3">{shortDate(item.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </AppShell>
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

function GameRow({ game }: { game: GamesListResponse["mine"][number] }) {
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
