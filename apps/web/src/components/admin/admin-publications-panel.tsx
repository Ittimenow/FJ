"use client";

import { AlertCircle, Check, CheckCircle2, ExternalLink, ImageIcon, ImageOff, Layers3, LoaderCircle, Plus, RefreshCw, RotateCcw, Send, Sparkles } from "lucide-react";
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

type ActionFeedback = {
  kind: "error" | "success";
  message: string;
};

type RunAction = (
  key: string,
  action: () => Promise<unknown>,
  successMessage?: string
) => Promise<void>;

export function AdminPublicationsPanel({ token }: { token: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, ActionFeedback>>({});

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
    setFeedback((current) => omitKey(current, "announcement"));
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
      setFeedback((current) => ({
        ...current,
        announcement: { kind: "success", message: "Анонс подключён к обсуждению." }
      }));
    } catch (createError) {
      setFeedback((current) => ({
        ...current,
        announcement: { kind: "error", message: message(createError) }
      }));
    } finally {
      setBusy(null);
    }
  }

  async function act(key: string, action: () => Promise<unknown>, successMessage?: string) {
    setBusy(key);
    setFeedback((current) => omitKey(current, key));
    try {
      await action();
      await load();
      if (successMessage) {
        setFeedback((current) => ({
          ...current,
          [key]: { kind: "success", message: successMessage }
        }));
      }
    } catch (actionError) {
      const actionMessage = message(actionError);
      try {
        setOverview(await request(""));
      } catch (refreshError) {
        setError(message(refreshError));
      }
      setFeedback((current) => ({
        ...current,
        [key]: { kind: "error", message: actionMessage }
      }));
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
    <div className="grid gap-6">
      <section className="rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.025em]">Публикация итогов в Telegram</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
          Создайте отдельный пост в канале: выберите завершённые игры, проверьте текст и карточку, затем отправьте публикацию.
        </p>
        <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/85" aria-label="Этапы публикации">
          <li>1. Выбрать игры и канал</li>
          <li>2. Проверить текст и изображение</li>
          <li>3. Опубликовать пост</li>
        </ol>
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
        feedback={feedback["channel-post-new"]}
        onAction={act}
        request={request}
      />

      <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold">2. Проверьте и опубликуйте</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Отредактируйте текст, убедитесь, что карточка загрузилась, и отправьте готовый пост непосредственно в канал.
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
              feedback={feedback[`channel-post-${post.id}`]}
              onAction={act}
              request={request}
            />
          )) : (
            <div className="rounded-xl bg-card p-5 text-sm text-muted">
              После выбора игр здесь появится текст, изображение и кнопка публикации.
            </div>
          )}
        </div>
      </section>

      {overview.eligibleGames.length ? (
        <section className="rounded-2xl bg-white p-5 shadow-panel sm:p-6">
          <h3 className="text-xl font-extrabold">Завершённые игры без текста итогов</h3>
          <p className="mt-1 text-sm text-muted">Создайте саммари, чтобы игра стала доступна для нового поста в Telegram.</p>
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
                  onClick={() => void act(
                    game.id,
                    () => request(`/games/${game.id}/generate`, { method: "POST" }),
                    "Саммари создано — игру можно выбрать для публикации."
                  )}
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
            <h3 className="text-xl font-extrabold">Саммари завершённых игр</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Эти тексты служат основой для постов. Здесь их можно пересобрать или отредактировать; отправка в обсуждение анонса доступна как дополнительный сценарий.</p>
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
              feedback={feedback[`summary-${summary.id}`]}
              onAction={act}
              request={request}
            />
          )) : (
            <div className="rounded-xl bg-card p-5 text-sm text-muted">После завершения игры здесь появится автоматически подготовленный текст итогов.</div>
          )}
        </div>
      </section>

      <details className="group rounded-2xl bg-white p-5 shadow-panel sm:p-6">
        <summary className="flex cursor-pointer list-none flex-col gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold">Публикация в обсуждение анонса</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Дополнительный сценарий: отправить саммари комментарием под существующим постом канала.</p>
          </div>
          <span className="text-sm font-bold text-journey">
            {activeAnnouncement ? `Анонс для комментариев: ${activeAnnouncement.title}` : "Комментарии к анонсу не настроены"}
          </span>
        </summary>

        <div className="mt-6 grid gap-6 border-t border-line pt-6 xl:grid-cols-[minmax(0,.8fr)_minmax(380px,1.2fr)]">
          <div>
            <h4 className="text-lg font-extrabold">Подключить анонс и обсуждение</h4>
            <p className="mt-1 text-sm leading-6 text-muted">Укажите существующий пост канала и корневое сообщение в связанной группе обсуждений.</p>
            <form className="mt-5 grid gap-4" onSubmit={createAnnouncement}>
              <Field label="Понятное название настройки">
                <Input name="title" required placeholder="Игра 10 августа" />
              </Field>
              <Field label="Ссылка на пост-анонс в Telegram">
                <Input name="postUrl" type="url" required placeholder="https://t.me/playcashflowmoscow/29" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ID группы обсуждений">
                  <Input name="discussionChatId" required placeholder="-1001234567890" />
                </Field>
                <Field label="ID корневого сообщения">
                  <Input name="discussionMessageId" inputMode="numeric" required placeholder="29" />
                </Field>
              </div>
              <Field label="Когда отправлять комментарий">
                <select name="mode" defaultValue="DRAFT" className="h-[50px] rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
                  <option value="DRAFT">Только вручную после проверки</option>
                  <option value="AUTOMATIC">Автоматически после завершения игры</option>
                  <option value="DISABLED">Не отправлять комментарии</option>
                </select>
              </Field>
              <Button type="submit" variant="action" disabled={busy === "announcement"}>
                <Send className="mr-2" size={17} aria-hidden="true" />
                {busy === "announcement" ? "Подключаем…" : "Подключить обсуждение"}
              </Button>
              <ActionMessage feedback={feedback.announcement} />
            </form>
          </div>

          <div className="min-w-0 rounded-xl bg-card p-4 sm:p-5">
            <h4 className="text-base font-extrabold">Настроенные анонсы</h4>
            <div className="mt-3 space-y-3">
              {overview.announcements.length ? overview.announcements.map((announcement) => (
                <div key={announcement.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{announcement.title}</strong>
                      <Badge className={announcement.isActive ? "bg-green-100 font-bold text-success" : "bg-card font-bold text-muted"}>
                        {announcement.isActive ? "Для новых комментариев" : "Архив"}
                      </Badge>
                      <Badge className="bg-[#e8effe] font-bold text-journey">{modeLabel(announcement.mode)}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      @{announcement.channelUsername} · группа {announcement.discussionChatId ?? "не указана"} · сообщение {announcement.discussionMessageId ?? "—"}
                    </p>
                  </div>
                  <a className="inline-flex h-10 items-center font-bold text-journey" href={announcement.postUrl} target="_blank" rel="noreferrer">
                    Открыть анонс <ExternalLink className="ml-1" size={15} aria-hidden="true" />
                  </a>
                </div>
              )) : (
                <p className="rounded-xl bg-white p-4 text-sm text-muted">Нет настроенных анонсов. Для самостоятельных постов в канал эта настройка не нужна.</p>
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function NewChannelPostComposer({
  summaries,
  defaultChannel,
  busy,
  feedback,
  onAction,
  request
}: {
  summaries: Summary[];
  defaultChannel: string;
  busy: string | null;
  feedback?: ActionFeedback | undefined;
  onAction: RunAction;
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
          <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.025em]">1. Выберите игры и канал</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Выберите одну игру или серию. Система подготовит текст и изображение, но ничего не отправит без отдельного подтверждения.
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
            onClick={() => void onAction(
              "channel-post-new",
              async () => {
                await request("/channel-posts", {
                  method: "POST",
                  body: JSON.stringify({ kind, summaryIds: selected, channelChatId: channelChatId.trim() })
                });
                setSelected([]);
              },
              "Черновик готов — проверьте его в следующем разделе."
            )}
          >
            <Sparkles className="mr-2" size={17} aria-hidden="true" />
            {isBusy ? "Готовим пост…" : "Подготовить пост для проверки"}
          </Button>
          <ActionMessage feedback={feedback} inverted />
          <p className="mt-3 text-xs leading-5 text-white/55">
            {kind === "SINGLE_GAME" ? "Для поста выберите одну игру в списке справа." : `Для серии выберите от 2 до 8 игр. Сейчас выбрано: ${selected.length}.`}
          </p>
        </div>

        <div className="min-w-0 rounded-xl bg-white p-4 text-ink sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-extrabold">Завершённые игры</h4>
              <p className="mt-1 text-xs text-muted">В список попадают игры, для которых уже подготовлен текст итогов.</p>
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
              <p className="rounded-xl bg-card p-4 text-sm text-muted">Нет готовых игр. Ниже создайте саммари для завершённой партии.</p>
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
  feedback,
  onAction,
  request
}: {
  post: ChannelPost;
  busy: string | null;
  feedback?: ActionFeedback | undefined;
  onAction: RunAction;
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
        <ActionMessage
          feedback={feedback ?? (post.lastError ? { kind: "error", message: post.lastError } : undefined)}
        />
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
              <Button
                variant="secondary"
                disabled={isBusy || title.trim().length < 2 || body.trim().length < 10}
                onClick={() => void onAction(key, save, "Изменения сохранены, карточка обновлена.")}
              >
                Сохранить изменения
              </Button>
              <Button
                variant="action"
                disabled={isBusy || title.trim().length < 2 || body.trim().length < 10 || !channelChatId.trim()}
                onClick={() => void onAction(
                  key,
                  async () => {
                    await save();
                    return request(`/channel-posts/${post.id}/publish`, { method: "POST" });
                  },
                  "Пост опубликован в Telegram-канале."
                )}
              >
                <Send className="mr-2" size={16} aria-hidden="true" />
                {isBusy ? "Сохраняем и отправляем…" : "Опубликовать в канал"}
              </Button>
            </>
          ) : post.telegramPostUrl ? (
            <a className="inline-flex min-h-11 items-center font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25" href={post.telegramPostUrl} target="_blank" rel="noreferrer">
              Открыть опубликованный пост <ExternalLink className="ml-2" size={16} aria-hidden="true" />
            </a>
          ) : <span className="text-sm font-bold text-success">Пост опубликован</span>}
        </div>
      </div>
      <PublicationImagePreview
        src={`/telegram-publications/${post.id}/opengraph-image?v=${post.generationVersion}`}
        alt={`Карточка Telegram-публикации «${post.title}»`}
        description="Карточка собирается автоматически из сохранённого заголовка и результатов игр. Сохраните изменения, чтобы обновить её."
      />
    </article>
  );
}

function SummaryEditor({
  summary,
  announcements,
  busy,
  feedback,
  onAction,
  request
}: {
  summary: Summary;
  announcements: Announcement[];
  busy: string | null;
  feedback?: ActionFeedback | undefined;
  onAction: RunAction;
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
          {summary.telegramMessageId ? <Badge className="bg-green-100 font-bold text-success">Опубликовано в обсуждении</Badge> : null}
        </div>
        <p className="mt-1 text-xs text-muted">{summary.game.code} · {summary.game.currentRound} раундов</p>
        <ActionMessage
          feedback={feedback ?? (summary.lastError ? { kind: "error", message: summary.lastError } : undefined)}
        />
        <div className="mt-4 grid gap-3">
          <Input value={headline} onChange={(event) => setHeadline(event.target.value)} aria-label="Заголовок саммари" />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Текст саммари"
            rows={9}
            className="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={isBusy}
            onClick={() => void onAction(key, () => request(`/summaries/${summary.id}`, {
              method: "PATCH",
              body: JSON.stringify({ headline, body, ...(announcementId ? { announcementId } : {}), visibleOnSite })
            }), "Текст саммари сохранён.")}
          >Сохранить текст</Button>
          <Button
            variant="ghost"
            disabled={isBusy || Boolean(summary.telegramMessageId)}
            onClick={() => void onAction(
              key,
              () => request(`/games/${summary.gameId}/generate`, { method: "POST" }),
              "Саммари пересобрано по журналу игры."
            )}
          >
            <Sparkles className="mr-2" size={16} aria-hidden="true" /> Пересобрать
          </Button>
        </div>
        <details className="mt-4 rounded-xl bg-white p-4">
          <summary className="cursor-pointer text-sm font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
            Дополнительно: сайт и комментарий к анонсу
          </summary>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-bold text-ink">
              <span>Анонс, под которым появится комментарий</span>
              <select value={announcementId} onChange={(event) => setAnnouncementId(event.target.value)} className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink">
                <option value="">Не публиковать в обсуждение</option>
                {announcements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input type="checkbox" checked={visibleOnSite} onChange={(event) => setVisibleOnSite(event.target.checked)} className="h-4 w-4 accent-journey" />
              Показывать итоги на сайте
            </label>
            <Button
              variant="action"
              disabled={isBusy || Boolean(summary.telegramMessageId) || !announcementId}
              onClick={() => void onAction(
                key,
                async () => {
                  await request(`/summaries/${summary.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ headline, body, announcementId, visibleOnSite: true })
                  });
                  return request(`/summaries/${summary.id}/publish`, { method: "POST" });
                },
                "Саммари опубликовано в обсуждении выбранного анонса."
              )}
            >
              <Send className="mr-2" size={16} aria-hidden="true" />
              {summary.telegramMessageId ? "Комментарий опубликован" : "Опубликовать в обсуждение"}
            </Button>
          </div>
        </details>
      </div>
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-white p-4 text-center">
        {summary.visibleOnSite || summary.status === "PUBLISHED" ? (
          <PublicationImagePreview
            src={`/results/${summary.id}/opengraph-image?v=${summary.generationVersion}`}
            alt={`Карточка результатов игры «${summary.game.title}»`}
            description="Карточка сайта формируется автоматически из сохранённого саммари."
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

function PublicationImagePreview({
  src,
  alt,
  description
}: {
  src: string;
  alt: string;
  description: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const separator = src.includes("?") ? "&" : "?";
  const imageUrl = `${src}${separator}attempt=${attempt}`;

  useEffect(() => {
    setState("loading");
    setAttempt(0);
  }, [src]);

  return (
    <div className="w-full self-start rounded-xl bg-white p-3">
      <div className="relative aspect-[1200/630] overflow-hidden rounded-lg bg-card">
        {state === "error" ? (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center" role="alert">
            <ImageOff size={30} className="text-red-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-extrabold text-ink">Не удалось создать карточку</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-muted">Повторите загрузку. Если ошибка сохранится, публикация в Telegram также не сможет отправить изображение.</p>
            <button
              type="button"
              className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#e8effe] px-3 text-sm font-extrabold text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
              onClick={() => {
                setState("loading");
                setAttempt((current) => current + 1);
              }}
            >
              <RotateCcw className="mr-2" size={15} aria-hidden="true" /> Повторить
            </button>
          </div>
        ) : (
          <>
            <img
              key={imageUrl}
              src={imageUrl}
              alt={alt}
              onLoad={() => setState("ready")}
              onError={() => setState("error")}
              className={`h-full w-full object-cover transition-opacity duration-200 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
            />
            {state === "loading" ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted" role="status">
                <LoaderCircle className="mr-2 animate-spin text-journey" size={18} aria-hidden="true" /> Создаём карточку…
              </div>
            ) : null}
          </>
        )}
      </div>
      <p className="mt-3 px-1 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}

function ActionMessage({ feedback, inverted = false }: { feedback?: ActionFeedback | undefined; inverted?: boolean }) {
  if (!feedback) return null;
  const success = feedback.kind === "success";
  const styles = inverted && success
    ? "bg-white/10 text-white"
    : success
      ? "bg-green-100 text-success"
      : "bg-red-50 text-red-800";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <p className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-bold ${styles}`} role={success ? "status" : "alert"}>
      <Icon className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
      <span>{feedback.message}</span>
    </p>
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

function omitKey<T>(value: Record<string, T>, key: string) {
  const next = { ...value };
  delete next[key];
  return next;
}
