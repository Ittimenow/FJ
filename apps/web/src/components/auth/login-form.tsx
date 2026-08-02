"use client";

import { signIn } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FormNotice } from "./auth-form-feedback";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, normalizeEmail, validateEmail, validatePassword } from "./auth-validation";

type LoginErrors = { email?: string | undefined; password?: string | undefined; form?: string | undefined };

export function LoginForm({
  releasedAt,
  callbackUrl = "/dashboard"
}: {
  releasedAt?: string;
  callbackUrl?: Route;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    const email = normalizeEmail(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");
    const nextErrors: LoginErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined
    };
    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      event.currentTarget.querySelector<HTMLInputElement>(nextErrors.email ? "#login-email" : "#login-password")?.focus();
      setLoading(false);
      return;
    }
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setErrors({ form: "Неверная электронная почта или пароль. Проверьте данные и попробуйте ещё раз." });
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrors({ form: "Не удалось связаться с сервером. Проверьте подключение и повторите попытку." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-extrabold text-ink">
            Электронная почта
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            maxLength={EMAIL_MAX_LENGTH}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            onChange={() => setErrors((current) => ({ ...current, email: undefined, form: undefined }))}
            className="h-[50px]"
          />
          <FieldError id="login-email-error">{errors.email}</FieldError>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor="login-password" className="text-sm font-extrabold text-ink">Пароль</label>
            <Link
              href={"/forgot-password" as Route}
              className="text-sm font-extrabold text-journey transition hover:text-[#1f56c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
            >
              Забыли пароль?
            </Link>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            placeholder="Введите пароль"
            autoComplete="current-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            onChange={() => setErrors((current) => ({ ...current, password: undefined, form: undefined }))}
            className="h-[50px]"
          />
          <FieldError id="login-password-error">{errors.password}</FieldError>
        </div>
        {errors.form ? <FormNotice tone="error">{errors.form}</FormNotice> : null}
        <Button type="submit" className="h-[52px] w-full" disabled={loading} aria-busy={loading}>
          {loading ? <><LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />Входим в аккаунт...</> : "Войти"}
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Нет аккаунта?{" "}
        <Link
          className="font-extrabold text-journey transition hover:text-[#1f56c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          Зарегистрироваться
        </Link>
      </p>
      {releasedAt ? (
        <div className="mt-7 border-t border-line/70 pt-4 text-[11px] text-muted/80">
          Последнее обновление: {formatReleaseDate(releasedAt)}
        </div>
      ) : null}
    </div>
  );
}

function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Moscow"
  }).format(new Date(value));
}
