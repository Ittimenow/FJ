"use client";

import { Check, ExternalLink, ImageIcon, Layers3, LoaderCircle, Plus, RefreshCw, Send, Sparkles } from "lucide-react";
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
  channelChatId: string;
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

type ChannelPost = {
  id: string;
  kind: "SINGLE_GAME" | "GAME_SERIES";
  status: "DRAFT" | "PUBLISHING" | "PUBLISHED" | "FAILED";
  title: string;
  body: string;
  channelChatId: string;
  generationVersion: number;
  telegramMessageId: number | null;
  telegramPostUrl: string | null;
  lastError: string | null;
  items: Array<{
    position: number;
    summary: Summary;
  }>;
};

type EligibleGame = Summary["game"];
type Overview = {
  announcements: Announcement[];
  summaries: Summary[];
  eligibleGames: EligibleGame[];
  channelPosts: ChannelPost[];
};

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

      <NewChannelPostComposer
        summaries={overview.summaries}
        defaultChannel={activeAnnouncement?.channelChatId ?? "@playcashflowmoscow"}
        busy={busy}
        onAction={act}
        request={request}
      />

      <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold">Новые посты в канал</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Черновики публикуются как самостоятельные посты с изображением, а не как комментарии к анонсу.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw className="mr-2" size={16} aria-hidden="true" /> Обновить
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {overview.channelPosts.length ? overview.channelPosts.map((post) => (
            <ChannelPostEditor
              key={`${post.id}-${post.generationVersion}-${post.status}`}
              post={post}
              busy={busy}
              onAction={act}
              request={request}
            />
          )) : (
            <div className="rounded-xl bg-card p-5 text-sm text-muted">
              Выберите одну игру или серию выше — здесь появится готовый к проверке черновик.
            </div>
          )}
        </div>
      </section>

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

function NewChannelPostComposer({
  summaries,
  defaultChannel,
  busy,
  onAction,
  request
}: {
  summaries: Summary[];
  defaultChannel: string;
  busy: string | null;
  onAction: (key: string, action: () => Promise<unknown>) => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [kind, setKind] = useState<ChannelPost["kind"]>("SINGLE_GAME");
  const [selected, setSelected] = useState<string[]>([]);
  const [channelChatId, setChannelChatId] = useState(defaultChannel);
  const candidates = summaries.filter((summary) => summary.headline && summary.body);
  const valid = kind === "SINGLE_GAME" ? selected.length === 1 : selected.length >= 2;
  const isBusy = busy === "channel-post-new";

  function choose(nextKind: ChannelPost["kind"]) {
    setKind(nextKind);
    if (nextKind === "SINGLE_GAME") setSelected((current) => current.slice(0, 1));
  }

  function toggle(summaryId: string) {
    setSelected((current) => {
      if (kind === "SINGLE_GAME") return current.includes(summaryId) ? [] : [summaryId];
      if (current.includes(summaryId)) return current.filter((id) => id !== summaryId);
      return current.length < 8 ? [...current, summaryId] : current;
    });
  }

  return (
    <section className="rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,.72fr)_minmax(420px,1.28fr)]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-action text-ink">
            <Plus size={23} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.025em]">Создать новый пост</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Соберите самостоятельную публикацию для канала из одной завершённой игры или общей серии.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-white/10 p-1.5" aria-label="Тип публикации">
            {(["SINGLE_GAME", "GAME_SERIES"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                className={`min-h-11 rounded-lg px-3 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/40 ${kind === value ? "bg-white text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                onClick={() => choose(value)}
              >
                {value === "SINGLE_GAME" ? "Одна игра" : "Серия игр"}
              </button>
            ))}
          </div>
          <label className="mt-5 grid gap-2 text-sm font-extrabold text-white">
            <span>Канал назначения</span>
            <Input
              value={channelChatId}
              onChange={(event) => setChannelChatId(event.target.value)}
              placeholder="@playcashflowmoscow"
              className="border-0 bg-white text-ink"
            />
          </label>
          <Button
            type="button"
            variant="action"
            className="mt-5 w-full"
            disabled={!valid || !channelChatId.trim() || isBusy}
            onClick={() => void onAction("channel-post-new", async () => {
              await request("/channel-posts", {
                method: "POST",
                body: JSON.stringify({ kind, summaryIds: selected, channelChatId: channelChatId.trim() })
              });
              setSelected([]);
            })}
          >
            <Sparkles className="mr-2" size={17} aria-hidden="true" />
            {isBusy ? "Собираем…" : "Создать черновик"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-white/55">
            {kind === "SINGLE_GAME" ? "Выберите одну игру." : `Выберите от 2 до 8 игр. Сейчас выбрано: ${selected.length}.`}
          </p>
        </div>

        <div className="min-w-0 rounded-xl bg-white p-4 text-ink sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-extrabold">Завершённые игры</h4>
              <p className="mt-1 text-xs text-muted">Доступны партии с уже созданным саммари.</p>
            </div>
            <span className="rounded-lg bg-card px-3 py-2 text-xs font-extrabold text-muted">{candidates.length}</span>
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {candidates.length ? candidates.map((summary) => {
              const checked = selected.includes(summary.id);
              const disabled = kind === "GAME_SERIES" && !checked && selected.length >= 8;
              return (
                <label
                  key={summary.id}
                  className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-colors ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-card"} ${checked ? "bg-[#e8effe]" : "bg-white"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(summary.id)}
                  />
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${checked ? "bg-journey text-white" : "bg-card text-transparent"}`} aria-hidden="true">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{summary.game.title}</strong>
                    <span className="mt-0.5 block text-xs text-muted">{summary.game.code} · {summary.game.currentRound} раундов</span>
                  </span>
                </label>
              );
            }) : (
              <p className="rounded-xl bg-card p-4 text-sm text-muted">Сначала завершите игру и создайте для неё саммари.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChannelPostEditor({
  post,
  busy,
  onAction,
  request
}: {
  post: ChannelPost;
  busy: string | null;
  onAction: (key: string, action: () => Promise<unknown>) => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [channelChatId, setChannelChatId] = useState(post.channelChatId);
  const key = `channel-post-${post.id}`;
  const isBusy = busy === key;
  const published = Boolean(post.telegramMessageId);
  const games = post.items.map((item) => item.summary.game);

  const save = () => request(`/channel-posts/${post.id}`, {
    method: "PATCH",
    body: JSON.stringify({ title, body, channelChatId })
  });

  return (
    <article className="grid gap-5 rounded-xl bg-card p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8effe] px-2.5 py-1.5 text-xs font-extrabold text-journey">
            <Layers3 size={14} aria-hidden="true" /> {post.kind === "GAME_SERIES" ? `Серия · ${games.length} игр` : "Одна игра"}
          </span>
          <ChannelPostStatusBadge status={post.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {games.map((game) => <span key={game.id} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-muted">{game.title}</span>)}
        </div>
        {post.lastError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{post.lastError}</p> : null}
        <div className="mt-4 grid gap-3">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={published} aria-label="Заголовок нового Telegram-поста" />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={published}
            maxLength={1024}
            rows={10}
            aria-label="Текст нового Telegram-поста"
            className="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 disabled:cursor-not-allowed disabled:opacity-65"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input value={channelChatId} onChange={(event) => setChannelChatId(event.target.value)} disabled={published} aria-label="Канал назначения" className="sm:max-w-xs" />
            <span className={`text-xs font-bold ${body.length > 1000 ? "text-[#8a3d0a]" : "text-muted"}`}>{body.length}/1024</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!published ? (
            <>
              <Button variant="secondary" disabled={isBusy || title.trim().length < 2 || body.trim().length < 10} onClick={() => void onAction(key, save)}>Сохранить</Button>
              <Button
                variant="action"
                disabled={isBusy || title.trim().length < 2 || body.trim().length < 10 || !channelChatId.trim()}
                onClick={() => void onAction(key, async () => {
                  await save();
                  return request(`/channel-posts/${post.id}/publish`, { method: "POST" });
                })}
              >
                <Send className="mr-2" size={16} aria-hidden="true" />
                {isBusy ? "Отправляем…" : "Опубликовать новый пост"}
              </Button>
            </>
          ) : post.telegramPostUrl ? (
            <a className="inline-flex min-h-11 items-center font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25" href={post.telegramPostUrl} target="_blank" rel="noreferrer">
              Открыть опубликованный пост <ExternalLink className="ml-2" size={16} aria-hidden="true" />
            </a>
          ) : <span className="text-sm font-bold text-success">Пост опубликован</span>}
        </div>
      </div>
      <div className="self-start rounded-xl bg-white p-3">
        <img
          src={`/telegram-publications/${post.id}/opengraph-image?v=${post.generationVersion}`}
          alt={`Карточка Telegram-публикации «${post.title}»`}
          className="aspect-[1200/630] w-full rounded-lg object-cover shadow-[0_8px_22px_rgba(23,36,63,.12)]"
        />
        <p className="mt-3 px-1 text-xs leading-5 text-muted">Изображение обновится после сохранения заголовка.</p>
      </div>
    </article>
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

function ChannelPostStatusBadge({ status }: { status: ChannelPost["status"] }) {
  const labels = { DRAFT: "Черновик", PUBLISHING: "Отправляется", PUBLISHED: "Опубликован", FAILED: "Ошибка" };
  const styles = status === "PUBLISHED" ? "bg-green-100 text-success" : status === "FAILED" ? "bg-red-50 text-red-800" : status === "PUBLISHING" ? "bg-[#fff0df] text-[#8a3d0a]" : "bg-white text-muted";
  return <Badge className={`${styles} font-bold`}>{labels[status]}</Badge>;
}

function modeLabel(mode: Announcement["mode"]) {
  return mode === "AUTOMATIC" ? "Автоматически" : mode === "DISABLED" ? "Отключено" : "Черновик";
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить действие";
}
