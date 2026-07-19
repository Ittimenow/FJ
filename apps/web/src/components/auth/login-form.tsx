"use client";

import { signIn } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm({
  releaseVersion,
  releasedAt,
  callbackUrl = "/dashboard"
}: {
  releaseVersion?: string;
  releasedAt?: string;
  callbackUrl?: Route;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false
    });
    setLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input name="email" type="email" placeholder="email@example.com" required />
          <Input name="password" type="password" placeholder="Пароль" required />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-neutral-600">
          Нет аккаунта?{" "}
          <Link
            className="font-medium text-success"
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Зарегистрироваться
          </Link>
        </p>
        {releaseVersion ? (
          <div className="mt-4 border-t border-line pt-3 text-center text-xs text-neutral-500">
            Релиз игры v{releaseVersion}
            {releasedAt ? ` · ${formatReleaseDate(releasedAt)}` : ""}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Moscow"
  }).format(new Date(value));
}
