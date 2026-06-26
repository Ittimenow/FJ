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
      userAvatarColor={profile.user.avatarColor ?? generateAvatarColor(profile.user.id)}
      userInitials={avatarInitials(profile.user.displayName)}
    >
      <div className="mx-auto max-w-2xl">
        <ProfileForm profile={profile} token={session.accessToken} />
      </div>
    </AppShell>
  );
}
