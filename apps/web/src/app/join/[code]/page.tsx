import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      userAvatarColor={generateAvatarColor(session.user.id)}
      userInitials={avatarInitials(userName ?? "")}
    >
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Не удалось войти в комнату</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">{errorMessage}</p>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white transition hover:bg-black"
          >
            Вернуться в кабинет
          </Link>
        </CardContent>
      </Card>
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
