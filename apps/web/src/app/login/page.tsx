import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";
import { gameReleasedAt, gameReleaseVersion } from "@/lib/release";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
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
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <LoginForm
        releaseVersion={gameReleaseVersion}
        releasedAt={gameReleasedAt}
        callbackUrl={callbackUrl}
      />
    </main>
  );
}

function safeCallbackUrl(value?: string) {
  return (value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard") as Route;
}
