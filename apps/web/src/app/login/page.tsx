import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { inviteCodeFromCallbackUrl, safeAuthCallbackUrl } from "@/lib/auth-redirect";
import { gameInviteMetadata } from "@/lib/game-invite-metadata";
import { gameReleasedAt } from "@/lib/release";

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}): Promise<Metadata> {
  const callbackUrl = safeAuthCallbackUrl((await searchParams).callbackUrl);
  const inviteCode = inviteCodeFromCallbackUrl(callbackUrl);
  return inviteCode ? gameInviteMetadata(inviteCode) : {};
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const callbackUrl = safeAuthCallbackUrl((await searchParams).callbackUrl);
  const inviteCode = inviteCodeFromCallbackUrl(callbackUrl);
  const session = await auth();
  if (session?.accessToken) {
    const hasValidSession = await apiFetch<unknown>("/users/me", session.accessToken)
      .then(() => true)
      .catch((error: unknown) => {
        if (isUnauthorizedApiError(error)) return false;
        throw error;
      });

    if (hasValidSession) redirect(callbackUrl);
  }

  return (
    <AuthShell
      title={inviteCode ? "Войдите, чтобы присоединиться" : "С возвращением"}
      description={inviteCode ? "После входа мы автоматически добавим вас в комнату и откроем игровое пространство." : undefined}
      inviteCode={inviteCode}
    >
      <LoginForm
        releasedAt={gameReleasedAt}
        callbackUrl={callbackUrl}
      />
    </AuthShell>
  );
}
