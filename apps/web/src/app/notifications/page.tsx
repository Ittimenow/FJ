import { ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationAction } from "@/components/profile/notification-action";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import { formatGameTime } from "@/lib/time-zones";
import type { NotificationsResponse, ProfileResponse } from "@/lib/types";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  const [profile, notifications] = await Promise.all([
    apiFetch<ProfileResponse>("/users/me", session.accessToken),
    apiFetch<NotificationsResponse>("/users/me/notifications", session.accessToken)
  ]).catch((error: unknown) => {
    if (isUnauthorizedApiError(error)) redirect("/login");
    throw error;
  });
  return (
    <AppShell userName={profile.user.displayName} userAvatarUrl={profile.user.avatarUrl} userFigurine={profile.user.figurine} userAvatarColor={profile.user.avatarColor ?? generateAvatarColor(profile.user.id)} userInitials={avatarInitials(profile.user.displayName)}>
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-journey"><ArrowLeft size={17} />К партиям</Link>
        <div className="mb-7 mt-4 flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e8effe] text-journey"><Bell size={24} /></span>
          <div><h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Оповещения</h1><p className="mt-1 text-sm text-muted">Открытые игры и изменения ваших партий.</p></div>
        </div>
        {!profile.user.timeZone ? <p className="mb-5 rounded-xl bg-[#fff0df] p-4 text-sm text-ink">Чтобы видеть местное время игр, <Link href="/profile" className="font-bold text-journey underline">укажите часовой пояс в профиле</Link>.</p> : null}
        {notifications.items.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-panel"><p className="font-bold">Сообщений пока нет</p><p className="mt-2 text-sm text-muted">Здесь появятся новые открытые игры.</p></div>
        ) : (
          <div className="grid gap-3">
            {notifications.items.map((item) => {
              const title = item.kind === "OPEN_GAME_CANCELLED" ? "Игра отменена" : item.kind === "OPEN_GAME_RESCHEDULED" ? "Время игры изменено" : "Новая открытая игра";
              const href = item.game.status === "WAITING"
                ? item.kind === "OPEN_GAME_PUBLISHED" ? `/join/${item.game.code}` : `/games/${item.game.id}`
                : null;
              return (
                <article key={item.id} className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">{title}</h2><p className="mt-1 font-bold text-journey">{item.game.title}</p></div>{!item.readAt ? <span className="rounded-full bg-[#e8effe] px-3 py-1 text-xs font-bold text-journey">Новое</span> : null}</div>
                  <p className="mt-3 text-sm leading-6 text-muted">Ведущий: {item.game.createdBy?.displayName ?? "не указан"}. {item.game.status === "CANCELLED" ? "Партия отменена." : item.kind === "OPEN_GAME_CANCELLED" ? "Партия не состоится." : `Начало: ${item.game.scheduledAt ? formatGameTime(item.game.scheduledAt, profile.user.timeZone) : "не указано"}.`}</p>
                  <p className="mt-1 text-xs text-muted">Получено: {formatGameTime(item.createdAt, profile.user.timeZone)}</p>
                  <div className="mt-4"><NotificationAction token={session.accessToken} id={item.id} href={href} read={Boolean(item.readAt)} /></div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
