import { ArrowRight, Clock3, History, UsersRound } from "lucide-react";
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
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import { systemReleases } from "@/lib/changes";
import { money, shortDate } from "@/lib/format";
import { gameStatusLabel, userRoleLabels, userStatusLabels } from "@/lib/game-labels";
import { gameReleaseVersion } from "@/lib/release";
import type { GameListItem, GamesListResponse, ProfileResponse } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const [profile, games] = await Promise.all([
    apiFetch<ProfileResponse>("/users/me", session.accessToken),
    apiFetch<GamesListResponse>("/games", session.accessToken)
  ]).catch((error: unknown) => {
    if (isUnauthorizedApiError(error)) redirect("/login");
    throw error;
  });
  const canCreateGames =
    profile.user.role === "HOST" || profile.user.role === "ADMIN";
  const isAdmin = profile.user.role === "ADMIN";
  const currentGames = games.mine.filter(
    (game) => game.status !== "ENDED" && game.status !== "CANCELLED"
  );
  const currentGameIds = new Set(currentGames.map((game) => game.id));
  const openGames = games.open.filter(
    (game) => game.status === "WAITING" && !currentGameIds.has(game.id)
  );

  return (
    <AppShell
      userName={profile.user.displayName}
      userAvatarUrl={profile.user.avatarUrl}
      userFigurine={profile.user.figurine}
      userAvatarColor={profile.user.avatarColor ?? generateAvatarColor(profile.user.id)}
      userInitials={avatarInitials(profile.user.displayName)}
    >
      {isAdmin ? (
        <AdminPanel
          profile={profile}
          games={games}
          token={session.accessToken}
          releases={systemReleases}
          currentVersion={gameReleaseVersion}
        />
      ) : (
        <div className="grid gap-6 sm:gap-8">
          <section className="flex flex-col gap-4 py-1 sm:flex-row sm:items-end sm:justify-between sm:py-2">
            <div className="max-w-3xl">
              <h1 className="text-balance text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                Управляйте своим финансовым путешествием
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Продолжите активную партию, подготовьте новую комнату или присоединитесь к команде по коду.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center self-start rounded-xl font-extrabold text-journey transition hover:text-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 sm:self-auto"
            >
              Настроить профиль →
            </Link>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <Card className="rounded-2xl border-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Текущие партии</CardTitle>
                  <p className="mt-1 text-sm text-muted">Комнаты, в которых вы уже участвуете.</p>
                </div>
                <Badge className="bg-[#e8effe] font-bold text-journey">{currentGames.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentGames.length === 0 ? (
                  <EmptyGamesMessage
                    title="Активных партий пока нет"
                    description={
                      canCreateGames
                        ? "Создайте комнату справа — после этого здесь появится быстрый переход в лобби."
                        : "Введите код приглашения справа или выберите доступную комнату ниже."
                    }
                  />
                ) : (
                  currentGames.map((game) => (
                    <GameCard key={game.id} game={game} showInvite />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="text-xl">
                  {canCreateGames ? "Подготовить новую партию" : "Присоединиться к партии"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canCreateGames ? (
                  <CreateGameForm token={session.accessToken} />
                ) : (
                  <p className="text-sm leading-6 text-muted">
                    Создавать комнаты может ведущий. Вы можете войти в готовую комнату по приглашению.
                  </p>
                )}
                <div className={canCreateGames ? "mt-6 border-t border-line pt-5" : "mt-5"}>
                  <h3 className="text-base font-extrabold">Войти в готовую комнату</h3>
                  <p className="mb-4 mt-1 text-sm leading-6 text-muted">
                    Используйте код, который прислал ведущий.
                  </p>
                  <JoinGameForm token={session.accessToken} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold">Ваш прогресс</h2>
                  <Badge className="bg-white/10 font-bold text-white">
                    {userRoleLabels[profile.user.role] ?? profile.user.role}
                  </Badge>
                  <Badge className="bg-[#eaf3e0] font-bold text-success">
                    {userStatusLabels[profile.user.status] ?? profile.user.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-white/65">Результаты завершённых финансовых путешествий.</p>
              </div>
              <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-6 lg:min-w-[620px]">
                <Metric label="Партий" value={profile.stats.gamesPlayed} />
                <Metric label="Побед" value={profile.stats.wins} />
                <Metric label="Выходов" value={profile.stats.escapedRatRace} />
                <Metric label="Средний cashflow" value={money(profile.stats.averageMonthlyCashflowCents)} />
              </dl>
            </div>
          </section>

          <Card className="rounded-2xl border-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Доступные комнаты</CardTitle>
                <p className="mt-1 text-sm text-muted">Партии, к которым ещё можно присоединиться.</p>
              </div>
              <Badge className="bg-card font-bold text-ink">{openGames.length}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {openGames.length === 0 ? (
                <div className="md:col-span-2">
                  <EmptyGamesMessage
                    title="Открытых комнат сейчас нет"
                    description="Когда ведущий откроет новую комнату, она появится в этом разделе."
                  />
                </div>
              ) : (
                openGames.map((game) => <GameCard key={game.id} game={game} />)
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0">
            <CardHeader className="flex flex-row items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
                <History size={19} />
              </span>
              <div>
                <CardTitle className="text-xl">История партий</CardTitle>
                <p className="mt-1 text-sm text-muted">Завершённые партии и ваши финансовые результаты.</p>
              </div>
            </CardHeader>
            <CardContent>
              {profile.history.length === 0 ? (
                <EmptyGamesMessage
                  title="История пока пуста"
                  description="Завершённые партии появятся здесь вместе с профессией и итоговым cashflow."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {profile.history.map((item) => (
                      <HistoryCard key={`${item.gameId}-${item.joinedAt}`} item={item} />
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="border-b border-line text-muted">
                        <tr>
                          <th className="pb-3 font-bold">Партия</th>
                          <th className="pb-3 font-bold">Статус</th>
                          <th className="pb-3 font-bold">Профессия</th>
                          <th className="pb-3 font-bold">Cashflow</th>
                          <th className="pb-3 font-bold">Результат</th>
                          <th className="pb-3 font-bold">Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.history.map((item) => (
                          <tr key={`${item.gameId}-${item.joinedAt}`} className="border-b border-line/70 last:border-b-0">
                            <td className="py-4 pr-4">
                              <Link className="font-extrabold text-journey hover:text-[#1f56c8]" href={`/games/${item.gameId}`}>
                                {item.title}
                              </Link>
                              <div className="mt-1 font-mono text-xs text-muted">{item.code}</div>
                            </td>
                            <td className="py-4 pr-4">{gameStatusLabel(item.status)}</td>
                            <td className="py-4 pr-4">{item.profession ?? "—"}</td>
                            <td className="py-4 pr-4 font-bold">{money(item.monthlyCashflowCents)}</td>
                            <td className="py-4 pr-4">{historyResult(item)}</td>
                            <td className="py-4">{shortDate(item.joinedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle>Написать администратору</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-6 text-muted">
                Есть идея по улучшению игры? Напишите нам — мы читаем каждое сообщение.
              </p>
              <FeedbackForm token={session.accessToken} />
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-white/55">{label}</dt>
      <dd className="mt-1 break-words text-xl font-extrabold tracking-[-0.025em] text-white">{value}</dd>
    </div>
  );
}

function GameCard({
  game,
  showInvite = false
}: {
  game: GameListItem;
  showInvite?: boolean;
}) {
  const players = game.players.filter((player) => player.role === "PLAYER");
  const waiting = game.status === "WAITING";

  return (
    <article className="rounded-xl bg-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/games/${game.id}`}
            className="block truncate text-base font-extrabold text-ink transition hover:text-journey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
          >
            {game.title}
          </Link>
          <div className="mt-1 font-mono text-xs font-bold tracking-[0.04em] text-muted">
            {game.code}
          </div>
        </div>
        <Badge className={gameStatusBadgeClass(game.status)}>{gameStatusLabel(game.status)}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted">
        <span className="inline-flex items-center gap-1.5">
          <UsersRound size={14} aria-hidden="true" />
          {players.length}/{game.maxPlayers} игроков
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} aria-hidden="true" />
          {shortDate(game.createdAt)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
        {showInvite && waiting ? <RoomInviteActions code={game.code} /> : <span />}
        <Link
          href={`/games/${game.id}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-journey px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(41,103,223,.2)] transition hover:-translate-y-0.5 hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
        >
          {waiting ? "Открыть лобби" : "Продолжить"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function HistoryCard({ item }: { item: ProfileResponse["history"][number] }) {
  return (
    <article className="rounded-xl bg-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="block truncate font-extrabold text-journey hover:text-[#1f56c8]"
            href={`/games/${item.gameId}`}
          >
            {item.title}
          </Link>
          <div className="mt-1 font-mono text-xs text-muted">{item.code}</div>
        </div>
        <Badge className={gameStatusBadgeClass(item.status)}>{gameStatusLabel(item.status)}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-muted">Профессия</dt>
          <dd className="mt-1 font-medium text-ink">{item.profession ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted">Cashflow</dt>
          <dd className="mt-1 font-extrabold text-ink">{money(item.monthlyCashflowCents)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted">Результат</dt>
          <dd className="mt-1 font-medium text-ink">{historyResult(item)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted">Дата</dt>
          <dd className="mt-1 font-medium text-ink">{shortDate(item.joinedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

function EmptyGamesMessage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-card p-4">
      <div className="font-extrabold text-ink">{title}</div>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function gameStatusBadgeClass(status: string) {
  if (status === "WAITING") return "shrink-0 bg-[#e8effe] font-bold text-journey";
  if (status === "IN_PROGRESS") return "shrink-0 bg-[#eaf3e0] font-bold text-success";
  if (status === "PAUSED") return "shrink-0 bg-[#fff0df] font-bold text-[#8a3d0a]";
  if (status === "CANCELLED") return "shrink-0 bg-red-50 font-bold text-red-700";
  return "shrink-0 bg-white font-bold text-muted";
}

function historyResult(item: ProfileResponse["history"][number]) {
  if (item.wonAt) return "Победа";
  if (item.escapedRatRaceAt) return "Вышел из крысиных бегов";
  if (item.endedAt) return "Партия завершена";
  return "В процессе";
}
