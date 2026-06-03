"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "");

    const response = await fetch(`${publicApiBaseUrl()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName })
    });

    if (!response.ok) {
      setLoading(false);
      setError("Не удалось создать аккаунт. Проверьте данные.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setLoading(false);

    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input name="displayName" placeholder="Имя игрока" required />
          <Input name="email" type="email" placeholder="email@example.com" required />
          <Input
            name="password"
            type="password"
            placeholder="Пароль от 8 символов"
            minLength={8}
            required
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Создаём..." : "Создать аккаунт"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-neutral-600">
          Уже есть аккаунт?{" "}
          <Link className="font-medium text-success" href="/login">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
