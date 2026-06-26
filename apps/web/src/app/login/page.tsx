import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { apiFetch, isUnauthorizedApiError } from "@/lib/api";

export default async function LoginPage() {
  const session = await auth();
  if (session?.accessToken) {
    const hasValidSession = await apiFetch<unknown>("/users/me", session.accessToken)
      .then(() => true)
      .catch((error: unknown) => {
        if (isUnauthorizedApiError(error)) return false;
        throw error;
      });

    if (hasValidSession) redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <LoginForm />
    </main>
  );
}
