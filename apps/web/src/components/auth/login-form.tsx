"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm({ releaseVersion }: { releaseVersion?: string }) {
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

    router.push("/dashboard");
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
          <Link className="font-medium text-success" href="/register">
            Зарегистрироваться
          </Link>
        </p>
        {releaseVersion ? (
          <div className="mt-4 border-t border-line pt-3 text-center text-xs text-neutral-500">
            Релиз игры v{releaseVersion}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
