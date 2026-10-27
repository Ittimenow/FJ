import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/auth";
import { GameResultsPage } from "@/components/results/game-results-page";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, apiFetch } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import type { GameResultsResponse } from "@/lib/types";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  const { id } = await params;
  const results = await apiFetch<GameResultsResponse>(`/games/${id}/results`, session.accessToken, { cache: "no-store" }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 400) redirect(`/games/${id}` as Route);
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  });
  const me = results.players.find((player) => player.userId === session.user.id);
  const name = session.user.displayName ?? session.user.name ?? "";
  return (
    <AppShell
      userName={name}
      userAvatarUrl={me?.user?.avatarUrl ?? null}
      userFigurine={me?.figurine ?? session.user.figurine}
      userAvatarColor={generateAvatarColor(session.user.id)}
      userInitials={avatarInitials(name)}
    >
      <GameResultsPage results={results} viewerId={me?.id ?? null} />
    </AppShell>
  );
}
