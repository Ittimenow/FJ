import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const value = (await searchParams).callbackUrl;
  const callbackUrl = (value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard") as Route;
  const session = await auth();
  if (session?.accessToken) redirect(callbackUrl);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <RegisterForm callbackUrl={callbackUrl} />
    </main>
  );
}
