import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileForm } from "@/components/profile/profile-form";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { avatarInitials, generateAvatarColor } from "@/lib/avatar-color";
import type { ProfileResponse } from "@/lib/types";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const profile = await apiFetch<ProfileResponse>("/users/me", session.accessToken).catch(
    (error: unknown) => {
      if (isUnauthorizedApiError(error)) redirect("/login");
      throw error;
    }
  );

  if (!profile.user.avatarColor) {
    profile.user.avatarColor = generateAvatarColor(profile.user.id);
  }

  return (
    <AppShell
      userName={profile.user.displayName}
      userAvatarUrl={profile.user.avatarUrl}
      userFigurine={profile.user.figurine}
      userAvatarColor={profile.user.avatarColor ?? generateAvatarColor(profile.user.id)}
      userInitials={avatarInitials(profile.user.displayName)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              Настройте свой образ в игре
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Имя, фотография и любимая фигурка помогают участникам быстрее узнавать вас в комнате и на игровом поле.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-card px-4 text-sm font-extrabold text-ink shadow-panel transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 sm:self-auto"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            К партиям
          </Link>
        </div>
        <ProfileForm profile={profile} token={session.accessToken} />
      </div>
    </AppShell>
  );
}
