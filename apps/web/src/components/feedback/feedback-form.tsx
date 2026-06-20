"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";

export function FeedbackForm({ token }: { token: string }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const response = await fetch(`${publicApiBaseUrl()}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ body: body.trim() })
    });

    if (!response.ok) {
      setStatus("error");
      setError("Не удалось отправить сообщение. Попробуйте ещё раз.");
      return;
    }

    setStatus("sent");
    setBody("");
  }

  if (status === "sent") {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        Спасибо! Ваше предложение отправлено администратору.
      </div>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <textarea
        className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-ink/20 resize-none"
        rows={5}
        maxLength={2000}
        placeholder="Напишите ваше предложение по улучшению игры..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-neutral-400">{body.length}/2000</span>
        <Button type="submit" disabled={status === "loading" || body.trim().length === 0}>
          {status === "loading" ? "Отправка..." : "Отправить"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
