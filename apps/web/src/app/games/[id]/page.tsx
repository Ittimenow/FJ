import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GameRoom } from "@/components/game/game-room";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

export default async function GamePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { id } = await params;
  const snapshot = await apiFetch<GameSnapshot>(`/games/${id}`, session.accessToken);
  if (snapshot.game.status === "CANCELLED") redirect("/dashboard");

  return (
    <AppShell userName={session.user.displayName ?? session.user.name}>
      <GameRoom
        initialSnapshot={snapshot}
        token={session.accessToken}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </AppShell>
  );
}
