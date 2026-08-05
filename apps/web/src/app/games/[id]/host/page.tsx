import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HostControlRoom } from "@/components/game/host-control-room";
import { apiFetch } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

export default async function HostGamePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { id } = await params;
  const snapshot = await apiFetch<GameSnapshot>(`/games/${id}`, session.accessToken).catch(() => null);
  if (!snapshot || snapshot.game.status === "CANCELLED") redirect("/dashboard");
  if (!canOpenHostView(snapshot, session.user.id, session.user.role)) redirect(`/games/${id}`);

  return <HostControlRoom initialSnapshot={snapshot} token={session.accessToken} />;
}

function canOpenHostView(snapshot: GameSnapshot, userId: string, role: string) {
  if (role === "ADMIN") return true;
  if (snapshot.game.createdById === userId && (role === "HOST" || snapshot.game.mode === "SOLO")) {
    return true;
  }
  return snapshot.players.some(
    (player) => player.userId === userId && player.role === "HOST" && player.status === "JOINED"
  );
}
