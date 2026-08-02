"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { FieldError, FormNotice } from "./auth-form-feedback";
import { EMAIL_MAX_LENGTH, normalizeEmail, validateEmail } from "./auth-validation";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setEmailError(null);
    const form = new FormData(event.currentTarget);
    const email = normalizeEmail(String(form.get("email") ?? ""));
    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      event.currentTarget.querySelector<HTMLInputElement>("#forgot-email")?.focus();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        setError(response.status === 429
          ? "Слишком много запросов. Подождите немного и попробуйте снова."
          : "Не удалось отправить письмо. Проверьте адрес и попробуйте ещё раз.");
        return;
      }

      setMessage("Если аккаунт с такой электронной почтой существует, мы отправили ссылку для восстановления пароля.");
    } catch {
      setError("Не удалось связаться с сервером. Проверьте подключение и повторите попытку.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="forgot-email" className="mb-2 block text-sm font-extrabold text-ink">Электронная почта</label>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            maxLength={EMAIL_MAX_LENGTH}
            className="h-[50px]"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "forgot-email-error" : undefined}
            onChange={() => {
              if (emailError) setEmailError(null);
              if (error) setError(null);
            }}
          />
          <FieldError id="forgot-email-error">{emailError}</FieldError>
        </div>
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        {message ? <FormNotice tone="success">{message}</FormNotice> : null}
        <Button type="submit" className="h-[52px] w-full" disabled={loading} aria-busy={loading}>
          {loading ? <><LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />Отправляем...</> : "Получить ссылку"}
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Вспомнили пароль?{" "}
        <Link href="/login" className="font-extrabold text-journey transition hover:text-[#1f56c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey">Войти</Link>
      </p>
    </div>
  );
}
