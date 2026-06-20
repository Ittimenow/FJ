"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";
import type { FeedbackMessage } from "@/lib/types";

export function AdminFeedbackPanel({ token }: { token: string }) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`${publicApiBaseUrl()}/api/feedback`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      setError("Не удалось загрузить предложения");
      return;
    }
    setMessages((await response.json()) as FeedbackMessage[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await fetch(`${publicApiBaseUrl()}/api/feedback/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
    );
  }

  const unread = messages.filter((m) => !m.isRead);
  const read = messages.filter((m) => m.isRead);

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (messages.length === 0) {
    return <p className="text-sm text-neutral-600">Предложений пока нет.</p>;
  }

  return (
    <div className="space-y-6">
      {unread.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Новые ({unread.length})
          </h3>
          <div className="space-y-3">
            {unread.map((msg) => (
              <FeedbackRow key={msg.id} msg={msg} onMarkRead={markRead} />
            ))}
          </div>
        </section>
      )}

      {read.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-neutral-500">
            Прочитанные ({read.length})
          </h3>
          <div className="space-y-3">
            {read.map((msg) => (
              <FeedbackRow key={msg.id} msg={msg} onMarkRead={markRead} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FeedbackRow({
  msg,
  onMarkRead
}: {
  msg: FeedbackMessage;
  onMarkRead: (id: string) => void;
}) {
  const date = new Date(msg.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div
      className={[
        "rounded-md border p-4",
        msg.isRead ? "border-line bg-white" : "border-blue-200 bg-blue-50"
      ].join(" ")}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs text-neutral-500">
          <span className="font-medium text-ink">
            {msg.user?.displayName ?? "Аноним"}
          </span>
          {msg.user?.email ? (
            <span className="ml-1">({msg.user.email})</span>
          ) : null}
          <span className="ml-2">{date}</span>
        </div>
        {!msg.isRead && (
          <Button
            variant="secondary"
            className="h-7 shrink-0 text-xs"
            onClick={() => onMarkRead(msg.id)}
          >
            Отметить прочитанным
          </Button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{msg.body}</p>
    </div>
  );
}
