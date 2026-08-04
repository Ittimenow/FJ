"use client";

import { signIn } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LoaderCircle, Presentation, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { PERSONAL_DATA_CONSENT_VERSION } from "@cashflow/shared";
import { FieldError, FieldHint, FormNotice } from "./auth-form-feedback";
import { CityCombobox } from "./city-combobox";
import {
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  TELEGRAM_CHANNEL_MAX_LENGTH,
  normalizeDisplayName,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateAccountType,
  normalizeTelegramChannel,
  validateTelegramChannel
} from "./auth-validation";

type RegisterErrors = {
  displayName?: string | undefined;
  telegramChannel?: string | undefined;
  cityId?: string | undefined;
  email?: string | undefined;
  password?: string | undefined;
  accountType?: string | undefined;
  form?: string | undefined;
  consent?: string | undefined;
};

export function RegisterForm({
  callbackUrl = "/dashboard",
  invited = false
}: {
  callbackUrl?: Route;
  invited?: boolean;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    const email = normalizeEmail(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");
    const displayName = normalizeDisplayName(String(form.get("displayName") ?? ""));
    const telegramChannel = normalizeTelegramChannel(String(form.get("telegramChannel") ?? ""));
    const cityId = String(form.get("cityId") ?? "");
    const accountType = invited ? "PLAYER" : String(form.get("accountType") ?? "");
    const personalDataConsent = form.get("personalDataConsent") === "on";
    const nextErrors: RegisterErrors = {
      displayName: validateDisplayName(displayName) ?? undefined,
      telegramChannel: validateTelegramChannel(telegramChannel) ?? undefined,
      cityId: cityId ? undefined : "Выберите город из списка.",
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      accountType: validateAccountType(accountType) ? undefined : "Выберите, как вы планируете использовать аккаунт.",
      consent: personalDataConsent ? undefined : "Подтвердите согласие на обработку персональных данных."
    };
    if (nextErrors.displayName || nextErrors.telegramChannel || nextErrors.cityId || nextErrors.email || nextErrors.password || nextErrors.accountType || nextErrors.consent) {
      setErrors(nextErrors);
      const target = nextErrors.displayName
        ? "#register-name"
        : nextErrors.telegramChannel
          ? "#register-telegram-channel"
          : nextErrors.cityId
            ? "#register-city"
            : nextErrors.email
              ? "#register-email"
              : nextErrors.password
                ? "#register-password"
                : nextErrors.accountType
                  ? "#register-account-player"
                  : "#personal-data-consent";
      event.currentTarget.querySelector<HTMLInputElement>(target)?.focus();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          telegramChannel,
          cityId,
          accountType,
          personalDataConsent,
          consentVersion: PERSONAL_DATA_CONSENT_VERSION
        })
      });

      if (!response.ok) {
        setErrors({ form: response.status === 409
            ? "Аккаунт с такой электронной почтой уже существует. Войдите или используйте другой адрес."
            : response.status === 429
              ? "Слишком много попыток. Подождите немного и повторите регистрацию."
              : "Не удалось создать аккаунт. Проверьте данные и повторите попытку." });
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
        {!invited ? (
          <fieldset>
            <legend className="mb-2 block text-sm font-extrabold text-ink">
              Как вы хотите начать?
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="group cursor-pointer">
                <input
                  id="register-account-player"
                  className="peer sr-only"
                  type="radio"
                  name="accountType"
                  value="PLAYER"
                  aria-describedby={errors.accountType ? "register-account-error" : undefined}
                  onChange={() => setErrors((current) => ({ ...current, accountType: undefined, form: undefined }))}
                />
                <span className="flex min-h-[108px] gap-3 rounded-xl bg-card p-4 text-left outline-none ring-1 ring-line transition group-hover:bg-[#f7f3ec] peer-checked:bg-[#e8effe] peer-checked:ring-2 peer-checked:ring-journey peer-focus-visible:ring-4 peer-focus-visible:ring-action/25">
                  <UserRound className="mt-0.5 shrink-0 text-journey" size={21} aria-hidden="true" />
                  <span>
                    <span className="block font-extrabold text-ink">Игрок</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">Присоединяться к партиям по коду.</span>
                  </span>
                </span>
              </label>
              <label className="group cursor-pointer">
                <input
                  id="register-account-host"
                  className="peer sr-only"
                  type="radio"
                  name="accountType"
                  value="HOST"
                  aria-describedby={errors.accountType ? "register-account-error" : undefined}
                  onChange={() => setErrors((current) => ({ ...current, accountType: undefined, form: undefined }))}
                />
                <span className="flex min-h-[108px] gap-3 rounded-xl bg-card p-4 text-left outline-none ring-1 ring-line transition group-hover:bg-[#f7f3ec] peer-checked:bg-[#fff0df] peer-checked:ring-2 peer-checked:ring-action peer-focus-visible:ring-4 peer-focus-visible:ring-action/25">
                  <Presentation className="mt-0.5 shrink-0 text-[#c0560c]" size={21} aria-hidden="true" />
                  <span>
                    <span className="block font-extrabold text-ink">Ведущий</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">Создавать комнаты и проводить партии.</span>
                  </span>
                </span>
              </label>
            </div>
            <FieldError id="register-account-error">{errors.accountType}</FieldError>
          </fieldset>
        ) : null}
        <div>
          <label htmlFor="register-name" className="mb-2 block text-sm font-extrabold text-ink">
            Имя игрока
          </label>
          <Input
            id="register-name"
            name="displayName"
            placeholder="Как вас увидят участники"
            autoComplete="name"
            required
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? "register-name-error" : undefined}
            onChange={() => setErrors((current) => ({ ...current, displayName: undefined, form: undefined }))}
            className="h-[50px]"
          />
          <FieldError id="register-name-error">{errors.displayName}</FieldError>
        </div>
        <div>
          <label htmlFor="register-telegram-channel" className="mb-2 block text-sm font-extrabold text-ink">
            Telegram-канал
          </label>
          <Input
            id="register-telegram-channel"
            name="telegramChannel"
            placeholder="@channel_name или channel_name"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={TELEGRAM_CHANNEL_MAX_LENGTH + 1}
            aria-invalid={Boolean(errors.telegramChannel)}
            aria-describedby={`register-telegram-hint${errors.telegramChannel ? " register-telegram-error" : ""}`}
            onChange={() => setErrors((current) => ({ ...current, telegramChannel: undefined, form: undefined }))}
            className="h-[50px]"
          />
          <FieldHint id="register-telegram-hint">
            Можно вводить с @ или без него; используются латинские буквы, цифры и подчёркивания.
          </FieldHint>
          <FieldError id="register-telegram-error">{errors.telegramChannel}</FieldError>
        </div>
        <CityCombobox
          error={errors.cityId}
          onChange={() => setErrors((current) => ({ ...current, cityId: undefined, form: undefined }))}
        />
        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-extrabold text-ink">
            Электронная почта
          </label>
          <Input
            id="register-email"
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            maxLength={EMAIL_MAX_LENGTH}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            onChange={() => setErrors((current) => ({ ...current, email: undefined, form: undefined }))}
            className="h-[50px]"
          />
          <FieldError id="register-email-error">{errors.email}</FieldError>
        </div>
        <div>
          <label htmlFor="register-password" className="mb-2 block text-sm font-extrabold text-ink">
            Пароль
          </label>
          <Input
            id="register-password"
            name="password"
            type="password"
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            minLength={8}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={`register-password-hint${errors.password ? " register-password-error" : ""}`}
            onChange={() => setErrors((current) => ({ ...current, password: undefined, form: undefined }))}
            className="h-[50px]"
          />
          <FieldHint id="register-password-hint">От 8 до 128 символов.</FieldHint>
          <FieldError id="register-password-error">{errors.password}</FieldError>
        </div>
        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-card p-3 text-sm leading-6 text-ink">
            <input
              id="personal-data-consent"
              name="personalDataConsent"
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-[#2967df] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? "personal-data-consent-error" : undefined}
              onChange={() => setErrors((current) => ({ ...current, consent: undefined, form: undefined }))}
            />
            <span>
              Я даю согласие на обработку персональных данных в соответствии с{" "}
              <Link href={"/personal-data-consent" as Route} target="_blank" rel="noreferrer" className="font-extrabold text-journey underline decoration-journey/35 underline-offset-2 hover:text-[#1f56c8]">
                Согласием на обработку персональных данных
              </Link>.
            </span>
          </label>
          <FieldError id="personal-data-consent-error">{errors.consent}</FieldError>
          <p className="mt-2 text-xs leading-5 text-muted">
            Подробнее о хранении и защите данных — в{" "}
            <Link href={"/privacy" as Route} target="_blank" rel="noreferrer" className="font-bold text-journey underline decoration-journey/35 underline-offset-2">Политике обработки персональных данных</Link>.
          </p>
        </div>
        {errors.form ? <FormNotice tone="error">{errors.form}</FormNotice> : null}
        <Button type="submit" className="h-[52px] w-full" disabled={loading} aria-busy={loading}>
          {loading ? <><LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />Создаём аккаунт...</> : "Создать аккаунт"}
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link
          className="font-extrabold text-journey transition hover:text-[#1f56c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey"
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
