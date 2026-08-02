"use client";

import { Check, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";
import type { FeedbackMessage } from "@/lib/types";

export function AdminFeedbackPanel({ token }: { token: string }) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Не удалось загрузить предложения");
      setMessages((await response.json()) as FeedbackMessage[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Не удалось загрузить предложения"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/feedback/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Не удалось отметить сообщение прочитанным");
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, isRead: true } : message
        )
      );
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Не удалось отметить сообщение прочитанным"
      );
    } finally {
      setPendingId(null);
    }
  }

  const unread = messages.filter((message) => !message.isRead);
  const read = messages.filter((message) => message.isRead);

  if (loading) {
    return <div className="rounded-xl bg-card p-5 text-sm text-muted" role="status">Загружаем предложения…</div>;
  }

  if (messages.length === 0 && !error) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-card p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
          <Inbox size={19} />
        </span>
        <div>
          <div className="font-extrabold">Новых предложений пока нет</div>
          <p className="mt-1 text-sm leading-6 text-muted">Сообщения пользователей появятся здесь автоматически.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {unread.length > 0 ? (
        <section aria-labelledby="new-feedback-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="new-feedback-heading" className="text-lg font-extrabold text-ink">Новые сообщения</h3>
            <span className="rounded-lg bg-[#e8effe] px-2.5 py-1 text-xs font-extrabold text-journey">{unread.length}</span>
          </div>
          <div className="space-y-3">
            {unread.map((message) => (
              <FeedbackRow
                key={message.id}
                message={message}
                pending={pendingId === message.id}
                onMarkRead={markRead}
              />
            ))}
          </div>
        </section>
      ) : null}

      {read.length > 0 ? (
        <section aria-labelledby="read-feedback-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="read-feedback-heading" className="text-lg font-extrabold text-ink">Прочитанные</h3>
            <span className="rounded-lg bg-card px-2.5 py-1 text-xs font-extrabold text-muted">{read.length}</span>
          </div>
          <div className="space-y-3">
            {read.map((message) => (
              <FeedbackRow
                key={message.id}
                message={message}
                pending={false}
                onMarkRead={markRead}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FeedbackRow({
  message,
  pending,
  onMarkRead
}: {
  message: FeedbackMessage;
  pending: boolean;
  onMarkRead: (id: string) => void;
}) {
  const date = new Date(message.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <article className={message.isRead ? "rounded-xl bg-card p-4 sm:p-5" : "rounded-xl bg-[#e8effe] p-4 sm:p-5"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-extrabold text-ink">
            {message.user?.displayName ?? "Анонимный пользователь"}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
            {message.user?.email ? <span>{message.user.email}</span> : null}
            <time dateTime={message.createdAt}>{date}</time>
          </div>
        </div>
        {!message.isRead ? (
          <Button
            type="button"
            variant="secondary"
            className="h-9 shrink-0 px-3 text-xs"
            disabled={pending}
            onClick={() => void onMarkRead(message.id)}
          >
            <Check className="mr-1.5" size={15} aria-hidden="true" />
            {pending ? "Сохраняем..." : "Отметить прочитанным"}
          </Button>
        ) : null}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">{message.body}</p>
    </article>
  );
}
