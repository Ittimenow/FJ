import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { inviteCodeFromCallbackUrl, safeAuthCallbackUrl } from "@/lib/auth-redirect";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const callbackUrl = safeAuthCallbackUrl((await searchParams).callbackUrl);
  const inviteCode = inviteCodeFromCallbackUrl(callbackUrl);
  const session = await auth();
  if (session?.accessToken) redirect(callbackUrl);

  return (
    <AuthShell
      title={inviteCode ? "Создайте профиль игрока" : "Начните финансовое путешествие"}
      description={inviteCode ? "Создайте аккаунт — после регистрации вы сразу перейдёте в комнату по приглашению." : undefined}
      inviteCode={inviteCode}
    >
      <RegisterForm callbackUrl={callbackUrl} invited={Boolean(inviteCode)} />
    </AuthShell>
  );
}
