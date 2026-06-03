import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.accessToken) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <LoginForm />
    </main>
  );
}
