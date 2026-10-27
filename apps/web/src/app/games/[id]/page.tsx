import Link from "next/link";
import type { Route } from "next";
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
import { gameRoomViewForRole } from "@/lib/game-room-view";
import type { GameSnapshot, ProfileResponse } from "@/lib/types";

export default async function GamePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { id } = await params;
  const profile = await apiFetch<ProfileResponse>("/users/me", session.accessToken).catch(() => null);
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
        userAvatarUrl={null}
        userFigurine={session.user.figurine}
        userAvatarColor={userAvatarColor}
        userInitials={userInitials}
      >
        <Card className="mx-auto max-w-2xl rounded-2xl border-0">
          <CardHeader>
            <CardTitle>Не удалось загрузить игру</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted">
              Партия недоступна, была удалена или сессия больше не имеет к ней доступа.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-journey px-4 text-sm font-bold text-white shadow-[0_10px_28px_rgba(41,103,223,.25)] transition hover:-translate-y-0.5 hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
            >
              Вернуться в кабинет
            </Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (snapshot.game.status === "CANCELLED") redirect("/dashboard");
  const membership = snapshot.players.find(
    (player) => player.userId === session.user.id
  );
  const { preview, view } = await searchParams;
  if (snapshot.game.status === "ENDED" && view !== "game") {
    redirect(`/games/${id}/results` as Route);
  }
  const gameRoomView = gameRoomViewForRole(profile?.user.role, preview);

  return (
    <AppShell
      gameViewportMode={snapshot.game.status === "WAITING" ? null : gameRoomView}
      userName={userName}
      userAvatarUrl={membership?.user?.avatarUrl ?? null}
      userFigurine={membership?.figurine ?? membership?.user?.figurine ?? session.user.figurine}
      userAvatarColor={userAvatarColor}
      userInitials={userInitials}
    >
      {snapshot.game.status === "ENDED" ? (
        <div className="mx-auto mb-3 w-full max-w-7xl px-3 pt-3 sm:px-6">
          <Link href={`/games/${id}/results` as Route} className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-extrabold text-journey shadow-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
            Вернуться к результатам
          </Link>
        </div>
      ) : null}
      <GameRoom
        initialSnapshot={snapshot}
        token={session.accessToken}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        gameRoomView={gameRoomView}
        timeZone={profile?.user.timeZone ?? null}
        stayOnEndedGame={view === "game"}
      />
    </AppShell>
  );
}
