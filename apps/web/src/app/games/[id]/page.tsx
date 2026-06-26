import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GameRoom } from "@/components/game/game-room";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiError,
  apiFetch,
  isForbiddenApiError,
  isNotFoundApiError,
  isUnauthorizedApiError
} from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import type { GameSnapshot } from "@/lib/types";

export default async function GamePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { id } = await params;
  const snapshot = await apiFetch<GameSnapshot>(`/games/${id}`, session.accessToken).catch(
    (error: unknown) => {
      if (isUnauthorizedApiError(error)) redirect("/login");
      if (isForbiddenApiError(error) || isNotFoundApiError(error) || error instanceof ApiError) {
        return null;
      }
      throw error;
    }
  );
  const userName = session.user.displayName ?? session.user.name;
  const userInitials = avatarInitials(userName ?? "");
  const userAvatarColor = generateAvatarColor(session.user.id);

  if (!snapshot) {
    return (
      <AppShell
        userName={userName}
        userAvatarColor={userAvatarColor}
        userInitials={userInitials}
      >
        <Card>
          <CardHeader>
            <CardTitle>Не удалось загрузить игру</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-600">
              Партия недоступна, была удалена или сессия больше не имеет к ней доступа.
            </p>
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

  if (snapshot.game.status === "CANCELLED") redirect("/dashboard");

  return (
    <AppShell
      userName={userName}
      userAvatarColor={userAvatarColor}
      userInitials={userInitials}
    >
      <GameRoom
        initialSnapshot={snapshot}
        token={session.accessToken}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </AppShell>
  );
}
