import { ArrowRight, Bell, Bot, ChevronDown, Clock3, History, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPanel } from "@/components/admin/admin-panel";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGameForm } from "@/components/game/create-game-form";
import { CreateSoloGameForm } from "@/components/game/create-solo-game-form";
import { JoinGameForm } from "@/components/game/join-game-form";
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import { RescheduleGameForm } from "@/components/game/reschedule-game-form";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import { systemReleases } from "@/lib/changes";
import { money, shortDate } from "@/lib/format";
import { gameStatusLabel } from "@/lib/game-labels";
import { gameReleaseVersion } from "@/lib/release";
import { formatGameTime } from "@/lib/time-zones";
import type { GameListItem, GamesListResponse, NotificationsResponse, ProfileResponse } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const [profile, games, notifications] = await Promise.all([
    apiFetch<ProfileResponse>("/users/me", session.accessToken),
    apiFetch<GamesListResponse>("/games", session.accessToken),
    apiFetch<NotificationsResponse>("/users/me/notifications", session.accessToken)
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
          unreadNotifications={notifications.unreadCount}
        />
      ) : (
        <div className="grid gap-4 sm:gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl">Мои игры</h1>
            <Link href={"/notifications" as Route} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-journey shadow-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"><Bell size={18} />Оповещения{notifications.unreadCount > 0 ? <span className="rounded-full bg-journey px-2 py-0.5 text-xs text-white">{notifications.unreadCount}</span> : null}</Link>
          </div>
          {!profile.user.timeZone ? <p className="rounded-xl bg-[#fff0df] p-4 text-sm text-ink">Чтобы видеть время открытых игр, <Link href="/profile" className="font-bold text-journey underline">выберите часовой пояс в профиле</Link>.</p> : null}

          <details className="group overflow-hidden rounded-2xl bg-white shadow-panel">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 bg-action px-5 py-3 text-ink transition hover:bg-[#e77b1e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-action/30 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3 text-base font-extrabold">
                <Plus size={22} aria-hidden="true" />
                Создать игру
              </span>
              <ChevronDown className="shrink-0 transition-transform group-open:rotate-180" size={20} aria-hidden="true" />
            </summary>
            <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
              <div className="min-w-0">
                <CreateSoloGameForm token={session.accessToken} />
              </div>
              {canCreateGames ? (
                <div className="min-w-0 border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <h2 className="mb-4 text-xl font-extrabold">Командная игра</h2>
                    <CreateGameForm token={session.accessToken} timeZone={profile.user.timeZone} />
                </div>
              ) : null}
            </div>
          </details>

          {currentGames.length > 0 ? (
            <Card className="rounded-2xl border-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl">Продолжить игру</CardTitle>
                <Badge className="bg-[#e8effe] font-bold text-journey">{currentGames.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentGames.map((game) => <GameCard key={game.id} game={game} showInvite timeZone={profile.user.timeZone} token={session.accessToken} canManage={Boolean(game.createdBy?.id === profile.user.id || profile.user.role === "ADMIN")} />)}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Присоединиться к игре</CardTitle>
            </CardHeader>
            <CardContent>
              <JoinGameForm token={session.accessToken} />
              {openGames.length > 0 ? (
                <div className="mt-5 border-t border-line pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-extrabold">Доступные комнаты</h3>
                    <Badge className="bg-card font-bold text-ink">{openGames.length}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {openGames.map((game) => <GameCard key={game.id} game={game} timeZone={profile.user.timeZone} />)}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <section className="rounded-2xl bg-ink p-4 text-white shadow-panel sm:p-6" aria-labelledby="dashboard-stats-title">
            <h2 id="dashboard-stats-title" className="text-lg font-extrabold sm:text-xl">Моя статистика</h2>
            <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-6">
              <Metric label="Партий" value={profile.stats.gamesPlayed} />
              <Metric label="Побед" value={profile.stats.wins} />
              <Metric label="Выходов" value={profile.stats.escapedRatRace} />
            </dl>
            <p className="mt-4 border-t border-white/20 pt-3 text-sm text-white/80">
              Средний денежный поток: <strong className="font-extrabold text-white">{money(profile.stats.averageMonthlyCashflowCents)}</strong>
            </p>
          </section>

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
                  description="Завершённые партии появятся здесь вместе с профессией и итоговым денежным потоком."
                />
              ) : (
                <>
                  <div className="grid min-w-0 gap-3 md:hidden">
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
                          <th className="pb-3 font-bold">Денежный поток</th>
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
                              <div className={`mt-1 text-xs text-muted ${item.gameMode === "SOLO" ? "font-bold" : "font-mono"}`}>
                                {item.gameMode === "SOLO" ? "С ботами" : item.code}
                              </div>
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
      <dt className="text-xs font-bold text-white/80">{label}</dt>
      <dd className="mt-1 break-words text-xl font-extrabold tracking-[-0.025em] text-white">{value}</dd>
    </div>
  );
}

function GameCard({
  game,
  showInvite = false,
  timeZone = null,
  token,
  canManage = false
}: {
  game: GameListItem;
  showInvite?: boolean;
  timeZone?: string | null;
  token?: string;
  canManage?: boolean;
}) {
  const players = game.players.filter((player) => player.role === "PLAYER");
  const botCount = players.filter((player) => player.controller === "BOT").length;
  const humanCount = players.length - botCount;
  const waiting = game.status === "WAITING";
  const gameHref = !showInvite && game.isPublic ? `/join/${game.code}` : `/games/${game.id}`;

  return (
    <article className="rounded-xl bg-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={gameHref as Route}
            className="block truncate text-base font-extrabold text-ink transition hover:text-journey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
          >
            {game.title}
          </Link>
          <div className="mt-1 font-mono text-xs font-bold tracking-[0.04em] text-muted">
            {game.mode === "SOLO" ? "Одиночная партия" : game.code}
          </div>
        </div>
        <Badge className={gameStatusBadgeClass(game.status)}>{gameStatusLabel(game.status)}</Badge>
      </div>
      {game.isPublic && game.scheduledAt ? <p className="mt-3 text-sm font-bold text-ink">Начало: {formatGameTime(game.scheduledAt, timeZone)}{game.createdBy ? ` · Ведущий: ${game.createdBy.displayName}` : ""}{game.settings.timeLimitMinutes ? ` · ${game.settings.timeLimitMinutes} мин` : ""}</p> : null}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted">
        <span className="inline-flex items-center gap-1.5">
          {game.mode === "SOLO" ? <Bot size={14} aria-hidden="true" /> : <UsersRound size={14} aria-hidden="true" />}
          {game.mode === "SOLO"
            ? `${botCount} ботов`
            : botCount > 0
              ? `${humanCount} чел. · ${botCount} бот.`
              : `${humanCount} игроков`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} aria-hidden="true" />
          {game.isPublic && game.scheduledAt ? "Открытая игра" : shortDate(game.createdAt)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
        {showInvite && waiting && game.mode === "MULTIPLAYER" ? <RoomInviteActions code={game.code} /> : <span />}
        <Link
          href={gameHref as Route}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-journey px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(41,103,223,.2)] transition hover:-translate-y-0.5 hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
        >
          {waiting ? (game.mode === "SOLO" ? "Подготовиться" : showInvite ? "Открыть лобби" : "Присоединиться") : "Продолжить"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {canManage && token && timeZone && waiting && game.isPublic && game.scheduledAt ? <RescheduleGameForm gameId={game.id} scheduledAt={game.scheduledAt} timeZone={timeZone} token={token} /> : null}
    </article>
  );
}

function HistoryCard({ item }: { item: ProfileResponse["history"][number] }) {
  return (
    <article className="w-full min-w-0 rounded-xl bg-card p-4">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link
            className="block min-w-0 break-words font-extrabold text-journey hover:text-[#1f56c8]"
            href={`/games/${item.gameId}`}
          >
            {item.title}
          </Link>
          <div className={`mt-1 text-xs text-muted ${item.gameMode === "SOLO" ? "font-bold" : "font-mono"}`}>
            {item.gameMode === "SOLO" ? "С ботами" : item.code}
          </div>
        </div>
        <Badge className={gameStatusBadgeClass(item.status)}>{gameStatusLabel(item.status)}</Badge>
      </div>
      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs font-bold text-muted">Профессия</dt>
          <dd className="mt-1 break-words font-medium text-ink">{item.profession ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-bold text-muted">Денежный поток</dt>
          <dd className="mt-1 break-words font-extrabold text-ink">{money(item.monthlyCashflowCents)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-bold text-muted">Результат</dt>
          <dd className="mt-1 break-words font-medium text-ink">{historyResult(item)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-bold text-muted">Дата</dt>
          <dd className="mt-1 break-words font-medium text-ink">{shortDate(item.joinedAt)}</dd>
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
  if (item.outcome === "WIN" || item.wonAt) return "Победа";
  if (item.outcome === "LOSS") return "Поражение";
  if (item.escapedRatRaceAt) return "Вышел из крысиных бегов";
  if (item.endedAt) return "Партия завершена";
  return "В процессе";
}
