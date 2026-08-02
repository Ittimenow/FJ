import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Восстановление пароля" description="Укажите электронную почту аккаунта — мы отправим ссылку для создания нового пароля." inviteCode={null}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
