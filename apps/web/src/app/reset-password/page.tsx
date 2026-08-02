import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return (
    <AuthShell title="Новый пароль" description="Придумайте новый пароль для аккаунта." inviteCode={null}>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
