import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GameDisplay, type DisplayFieldView } from "@/components/game/game-display";
import { apiFetch } from "@/lib/api";
import { gameRoomViewForRole } from "@/lib/game-room-view";
import type { GameSnapshot, ProfileResponse } from "@/lib/types";

export default async function GameDisplayPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { id } = await params;
  const query = await searchParams;
  const snapshot = await apiFetch<GameSnapshot>(`/games/${id}`, session.accessToken).catch(() => null);
  if (!snapshot || snapshot.game.status === "CANCELLED") redirect("/dashboard");
  if (!canOpenDisplay(snapshot, session.user.id, session.user.role)) redirect(`/games/${id}`);

  const profile = query.view === "journey"
    ? await apiFetch<ProfileResponse>("/users/me", session.accessToken).catch(() => null)
    : null;
  const initialView: DisplayFieldView = gameRoomViewForRole(profile?.user.role, query.view);
  return <GameDisplay initialSnapshot={snapshot} token={session.accessToken} initialView={initialView} />;
}

function canOpenDisplay(snapshot: GameSnapshot, userId: string, role: string) {
  if (role === "ADMIN") return true;
  if (snapshot.game.createdById === userId && (role === "HOST" || snapshot.game.mode === "SOLO")) {
    return true;
  }
  return snapshot.players.some(
    (player) => player.userId === userId && player.role === "HOST" && player.status === "JOINED"
  );
}
