"use client";

import { ExternalLink, ImageIcon, LoaderCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";

type Announcement = {
  id: string;
  title: string;
  postUrl: string;
  channelUsername: string;
  discussionChatId: string | null;
  discussionMessageId: number | null;
  mode: "DISABLED" | "DRAFT" | "AUTOMATIC";
  isActive: boolean;
};

type Summary = {
  id: string;
  gameId: string;
  status: "PENDING" | "DRAFT" | "PUBLISHING" | "PUBLISHED" | "FAILED";
  headline: string | null;
  body: string | null;
  visibleOnSite: boolean;
  generationVersion: number;
  telegramMessageId: number | null;
  lastError: string | null;
  announcement: Announcement | null;
  game: { id: string; title: string; code: string; endedAt: string | null; currentRound: number };
};

type EligibleGame = Summary["game"];
type Overview = { announcements: Announcement[]; summaries: Summary[]; eligibleGames: EligibleGame[] };

export function AdminPublicationsPanel({ token }: { token: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`${publicApiBaseUrl()}/api/admin/publications${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) {
      const payload = await response.text();
      try {
        const parsed = JSON.parse(payload) as { message?: string | string[] };
        throw new Error(Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message || payload);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== payload) throw parseError;
        throw new Error(payload || `Ошибка ${response.status}`);
      }
    }
    return response.json();
  }

  async function load() {
    setError(null);
    try {
      setOverview(await request(""));
    } catch (loadError) {
      setError(message(loadError));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("announcement");
    setError(null);
    try {
      await request("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title") ?? ""),
          postUrl: String(form.get("postUrl") ?? ""),
          discussionChatId: String(form.get("discussionChatId") ?? ""),
          discussionMessageId: String(form.get("discussionMessageId") ?? ""),
          mode: String(form.get("mode") ?? "DRAFT")
        })
      });
      event.currentTarget.reset();
      await load();
    } catch (createError) {
      setError(message(createError));
    } finally {
      setBusy(null);
    }
  }

  async function act(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      await load();
    } catch (actionError) {
      setError(message(actionError));
    } finally {
      setBusy(null);
    }
  }

  if (!overview) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white shadow-panel">
        <LoaderCircle className="animate-spin text-journey" aria-hidden="true" />
        <span className="ml-3 text-sm font-bold text-muted">Загружаем публикации…</span>
      </div>
    );
  }

  const activeAnnouncement = overview.announcements.find((item) => item.isActive);

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.025em]">Итоги игр</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Система собирает факты из журнала, готовит карточку и публикует её в обсуждении выбранного анонса.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">
            {activeAnnouncement ? `Активен: ${activeAnnouncement.title}` : "Анонс не настроен"}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,.8fr)_minmax(380px,1.2fr)]">
          <div>
            <h3 className="text-xl font-extrabold">Куда публиковать</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Вставьте ссылку на пост-анонс и идентификаторы его корневого сообщения в связанной группе обсуждений.
            </p>
            <form className="mt-5 grid gap-4" onSubmit={createAnnouncement}>
              <Field label="Название анонса">
                <Input name="title" required placeholder="Игра 7 августа" />
              </Field>
              <Field label="Ссылка на пост Telegram">
                <Input name="postUrl" type="url" required placeholder="https://t.me/playcashflowmoscow/29" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ID группы обсуждений">
                  <Input name="discussionChatId" required placeholder="-1001234567890" />
                </Field>
                <Field label="ID сообщения обсуждения">
                  <Input name="discussionMessageId" inputMode="numeric" required placeholder="29" />
                </Field>
              </div>
              <Field label="Режим">
                <select name="mode" defaultValue="DRAFT" className="h-[50px] rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
                  <option value="DRAFT">Черновик — проверить перед отправкой</option>
                  <option value="AUTOMATIC">Автоматически после завершения</option>
                  <option value="DISABLED">Не отправлять в Telegram</option>
                </select>
              </Field>
              <Button type="submit" variant="action" disabled={busy === "announcement"}>
                <Send className="mr-2" size={17} aria-hidden="true" />
                {busy === "announcement" ? "Сохраняем…" : "Подключить анонс"}
              </Button>
            </form>
          </div>

          <div className="min-w-0 rounded-xl bg-card p-4 sm:p-5">
            <h3 className="text-base font-extrabold">Подключённые анонсы</h3>
            <div className="mt-3 space-y-3">
              {overview.announcements.length ? overview.announcements.map((announcement) => (
                <div key={announcement.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{announcement.title}</strong>
                      <Badge className={announcement.isActive ? "bg-green-100 font-bold text-success" : "bg-card font-bold text-muted"}>
                        {announcement.isActive ? "Активен" : "Архив"}
                      </Badge>
                      <Badge className="bg-[#e8effe] font-bold text-journey">{modeLabel(announcement.mode)}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      @{announcement.channelUsername} · обсуждение {announcement.discussionChatId ?? "не указано"}/{announcement.discussionMessageId ?? "—"}
                    </p>
                  </div>
                  <a className="inline-flex h-10 items-center font-bold text-journey" href={announcement.postUrl} target="_blank" rel="noreferrer">
                    Открыть <ExternalLink className="ml-1" size={15} aria-hidden="true" />
                  </a>
                </div>
              )) : (
                <p className="rounded-xl bg-white p-4 text-sm text-muted">Пока нет ни одного анонса.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {overview.eligibleGames.length ? (
        <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
          <h3 className="text-xl font-extrabold">Игры без саммари</h3>
          <p className="mt-1 text-sm text-muted">Можно обработать партии, завершённые до подключения автоматизации.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {overview.eligibleGames.map((game) => (
              <div key={game.id} className="flex items-center justify-between gap-3 rounded-xl bg-card p-4">
                <div className="min-w-0">
                  <strong className="block truncate">{game.title}</strong>
                  <span className="text-xs text-muted">{game.code} · {game.currentRound} раундов</span>
                </div>
                <Button
                  variant="secondary"
                  disabled={busy === game.id}
                  onClick={() => void act(game.id, () => request(`/games/${game.id}/generate`, { method: "POST" }))}
                >
                  <Sparkles className="mr-2" size={16} aria-hidden="true" />
                  Создать
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold">Очередь публикаций</h3>
            <p className="mt-1 text-sm text-muted">Текст можно поправить до отправки, а карточку сайта — скрыть независимо.</p>
          </div>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw className="mr-2" size={16} aria-hidden="true" /> Обновить
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {overview.summaries.length ? overview.summaries.map((summary) => (
            <SummaryEditor
              key={`${summary.id}-${summary.generationVersion}-${summary.status}`}
              summary={summary}
              announcements={overview.announcements}
              busy={busy}
              onAction={act}
              request={request}
            />
          )) : (
            <div className="rounded-xl bg-card p-5 text-sm text-muted">После завершения следующей игры здесь появится готовый черновик.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryEditor({
  summary,
  announcements,
  busy,
  onAction,
  request
}: {
  summary: Summary;
  announcements: Announcement[];
  busy: string | null;
  onAction: (key: string, action: () => Promise<unknown>) => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [headline, setHeadline] = useState(summary.headline ?? "");
  const [body, setBody] = useState(summary.body ?? "");
  const [announcementId, setAnnouncementId] = useState(summary.announcement?.id ?? announcements.find((item) => item.isActive)?.id ?? "");
  const [visibleOnSite, setVisibleOnSite] = useState(summary.visibleOnSite);
  const key = `summary-${summary.id}`;
  const isBusy = busy === key;

  return (
    <article className="grid gap-4 rounded-xl bg-card p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-lg font-extrabold">{summary.game.title}</h4>
          <StatusBadge status={summary.status} />
          {summary.telegramMessageId ? <Badge className="bg-green-100 font-bold text-success">Отправлено в Telegram</Badge> : null}
        </div>
        <p className="mt-1 text-xs text-muted">{summary.game.code} · {summary.game.currentRound} раундов</p>
        {summary.lastError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{summary.lastError}</p> : null}
        <div className="mt-4 grid gap-3">
          <Input value={headline} onChange={(event) => setHeadline(event.target.value)} aria-label="Заголовок саммари" />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Текст саммари"
            rows={9}
            className="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <select value={announcementId} onChange={(event) => setAnnouncementId(event.target.value)} className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink">
              <option value="">Без Telegram-анонса</option>
              {announcements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input type="checkbox" checked={visibleOnSite} onChange={(event) => setVisibleOnSite(event.target.checked)} className="h-4 w-4 accent-journey" />
              Показывать на сайте
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={isBusy}
            onClick={() => void onAction(key, () => request(`/summaries/${summary.id}`, {
              method: "PATCH",
              body: JSON.stringify({ headline, body, ...(announcementId ? { announcementId } : {}), visibleOnSite })
            }))}
          >Сохранить</Button>
          <Button
            variant="ghost"
            disabled={isBusy || Boolean(summary.telegramMessageId)}
            onClick={() => void onAction(key, () => request(`/games/${summary.gameId}/generate`, { method: "POST" }))}
          >
            <Sparkles className="mr-2" size={16} aria-hidden="true" /> Пересобрать
          </Button>
          <Button
            variant="action"
            disabled={isBusy || Boolean(summary.telegramMessageId) || !announcementId}
            onClick={() => void onAction(key, async () => {
              await request(`/summaries/${summary.id}`, {
                method: "PATCH",
                body: JSON.stringify({ headline, body, announcementId, visibleOnSite: true })
              });
              return request(`/summaries/${summary.id}/publish`, { method: "POST" });
            })}
          >
            <Send className="mr-2" size={16} aria-hidden="true" />
            {summary.telegramMessageId ? "Опубликовано" : "Опубликовать"}
          </Button>
        </div>
      </div>
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-white p-4 text-center">
        {summary.visibleOnSite || summary.status === "PUBLISHED" ? (
          <img
            src={`/results/${summary.id}/opengraph-image?v=${summary.generationVersion}`}
            alt={`Карточка результатов игры «${summary.game.title}»`}
            className="aspect-[1200/630] w-full rounded-lg object-cover shadow-[0_8px_22px_rgba(23,36,63,.12)]"
          />
        ) : (
          <>
            <ImageIcon size={30} className="text-journey" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink">Изображение готовится из этих данных</p>
            <p className="mt-1 text-xs leading-5 text-muted">Предпросмотр станет публичным после включения карточки сайта.</p>
          </>
        )}
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-extrabold text-ink"><span>{label}</span>{children}</label>;
}

function StatusBadge({ status }: { status: Summary["status"] }) {
  const labels = { PENDING: "В очереди", DRAFT: "Черновик", PUBLISHING: "Отправляется", PUBLISHED: "Опубликовано", FAILED: "Ошибка" };
  const styles = status === "PUBLISHED" ? "bg-green-100 text-success" : status === "FAILED" ? "bg-red-50 text-red-800" : status === "PUBLISHING" ? "bg-[#fff0df] text-[#8a3d0a]" : "bg-[#e8effe] text-journey";
  return <Badge className={`${styles} font-bold`}>{labels[status]}</Badge>;
}

function modeLabel(mode: Announcement["mode"]) {
  return mode === "AUTOMATIC" ? "Автоматически" : mode === "DISABLED" ? "Отключено" : "Черновик";
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить действие";
}
