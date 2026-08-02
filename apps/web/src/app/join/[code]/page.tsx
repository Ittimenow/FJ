import { CircleAlert, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import type { GameSnapshot } from "@/lib/types";

export default async function JoinByInvitePage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const callbackUrl = `/join/${encodeURIComponent(code)}`;
  const session = await auth();
  if (!session?.accessToken) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  let errorMessage: string | null = null;
  try {
    const snapshot = await apiFetch<GameSnapshot>("/games/join", session.accessToken, {
      method: "POST",
      body: JSON.stringify({ codeOrId: code, role: "PLAYER" })
    });
    redirect(`/games/${snapshot.game.id}`);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    if (error instanceof ApiError) {
      errorMessage = inviteErrorMessage(error.message);
    } else {
      throw error;
    }
  }

  const userName = session.user.displayName ?? session.user.name;
  return (
    <AppShell
      userName={userName}
      userAvatarUrl={null}
      userFigurine={session.user.figurine}
      userAvatarColor={generateAvatarColor(session.user.id)}
      userInitials={avatarInitials(userName ?? "")}
    >
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-panel sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#fff0df] text-warning" aria-hidden="true">
          <CircleAlert size={23} />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
          Не удалось войти в комнату
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">{errorMessage}</p>
        <div className="mt-6 flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-card p-3 text-sm">
          <span className="font-bold text-muted">Код приглашения</span>
          <span className="min-w-0 break-all font-mono font-extrabold tracking-[0.04em] text-ink">{code}</span>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">
          В личном кабинете можно ввести другой код или выбрать доступную комнату.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-journey px-4 text-center text-sm font-bold text-white shadow-[0_10px_28px_rgba(41,103,223,.25)] transition hover:-translate-y-0.5 hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Вернуться в кабинет
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

function inviteErrorMessage(message: string) {
  if (message === "Game not found") return "Комната не найдена или приглашение устарело.";
  if (message === "Only waiting games can be joined") {
    return "Партия уже началась или была завершена.";
  }
  if (message === "Game is full") return "В комнате больше нет свободных мест.";
  return "Приглашение недействительно или комната сейчас недоступна.";
}
