"use client";

import Link from "next/link";
import type { Route } from "next";
import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { FieldError, FieldHint, FormNotice } from "./auth-form-feedback";
import { PASSWORD_MAX_LENGTH, validatePassword, validateResetToken } from "./auth-validation";

type ResetErrors = { password?: string | undefined; confirmation?: string | undefined; form?: string | undefined };

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ResetErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    const passwordError = validatePassword(password);
    const confirmationError = !confirmation
      ? "Повторите новый пароль."
      : password !== confirmation
        ? "Пароли не совпадают. Проверьте оба поля."
        : null;
    if (passwordError || confirmationError) {
      setErrors({ password: passwordError ?? undefined, confirmation: confirmationError ?? undefined });
      event.currentTarget.querySelector<HTMLInputElement>(passwordError ? "#reset-password" : "#reset-confirmation")?.focus();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      if (!response.ok) {
        setErrors({ form: response.status === 429
          ? "Слишком много попыток. Подождите немного и попробуйте снова."
          : "Ссылка недействительна или устарела. Запросите новую ссылку восстановления." });
        return;
      }

      setMessage("Пароль изменён. Теперь вы можете войти в аккаунт.");
    } catch {
      setErrors({ form: "Не удалось связаться с сервером. Проверьте подключение и повторите попытку." });
    } finally {
      setLoading(false);
    }
  }

  const tokenError = validateResetToken(token);
  if (tokenError) {
    return (
      <div>
        <FormNotice tone="error">{tokenError}</FormNotice>
        <Link href={"/forgot-password" as Route} className="mt-5 inline-flex font-extrabold text-journey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey">Запросить новую ссылку</Link>
      </div>
    );
  }

  if (message) {
    return (
      <div>
        <FormNotice tone="success">{message}</FormNotice>
        <Link href="/login" className="mt-5 inline-flex h-[52px] w-full items-center justify-center rounded-[15px] bg-journey px-6 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(41,103,223,.25)] transition hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey focus-visible:ring-offset-2">Перейти ко входу</Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div>
        <label htmlFor="reset-password" className="mb-2 block text-sm font-extrabold text-ink">Новый пароль</label>
        <Input id="reset-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={PASSWORD_MAX_LENGTH} required className="h-[50px]" aria-invalid={Boolean(errors.password)} aria-describedby={`reset-password-hint${errors.password ? " reset-password-error" : ""}`} onChange={() => setErrors((current) => ({ ...current, password: undefined, form: undefined }))} />
        <FieldHint id="reset-password-hint">От 8 до 128 символов.</FieldHint>
        <FieldError id="reset-password-error">{errors.password}</FieldError>
      </div>
      <div>
        <label htmlFor="reset-confirmation" className="mb-2 block text-sm font-extrabold text-ink">Повторите пароль</label>
        <Input id="reset-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={PASSWORD_MAX_LENGTH} required className="h-[50px]" aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? "reset-confirmation-error" : undefined} onChange={() => setErrors((current) => ({ ...current, confirmation: undefined, form: undefined }))} />
        <FieldError id="reset-confirmation-error">{errors.confirmation}</FieldError>
      </div>
      {errors.form ? <FormNotice tone="error">{errors.form}</FormNotice> : null}
      <Button type="submit" className="h-[52px] w-full" disabled={loading} aria-busy={loading}>
        {loading ? <><LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />Сохраняем...</> : "Сохранить новый пароль"}
      </Button>
    </form>
  );
}
