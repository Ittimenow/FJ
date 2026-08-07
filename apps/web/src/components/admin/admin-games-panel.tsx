"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FilterX,
  RefreshCw,
  Search,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { gameStatusLabel } from "@/lib/game-labels";
import type { AdminGameSummary, AdminGamesCatalogResponse } from "@/lib/types";

type GameStatusFilter = "" | AdminGameSummary["status"];
type GameModeFilter = "" | AdminGameSummary["mode"];

const selectClassName =
  "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20";

export function AdminGamesPanel({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<GameStatusFilter>("");
  const [mode, setMode] = useState<GameModeFilter>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [catalog, setCatalog] = useState<AdminGamesCatalogResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());

  const queryString = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (deferredSearch) query.set("search", deferredSearch);
    if (status) query.set("status", status);
    if (mode) query.set("mode", mode);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    return query.toString();
  }, [deferredSearch, from, mode, page, status, to]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGames() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${publicApiBaseUrl()}/api/admin/analytics/catalog?${queryString}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
          }
        );
        if (!response.ok) {
          throw new Error(await responseMessage(response, "Не удалось загрузить игры"));
        }
        const nextCatalog = (await response.json()) as AdminGamesCatalogResponse;
        setCatalog(nextCatalog);
        if (nextCatalog.page > nextCatalog.totalPages) {
          setPage(nextCatalog.totalPages);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить игры");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadGames();
    return () => controller.abort();
  }, [queryString, reloadKey, token]);

  const games = catalog?.items ?? [];
  const visibleIds = games.map((game) => game.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const hasFilters = Boolean(search || status || mode || from || to);

  function updatePageFilter(update: () => void) {
    setPage(1);
    update();
  }

  function toggleGame(gameId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  }

  function toggleVisibleGames() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setMode("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function downloadSelectedGames() {
    if (selectedIds.size === 0) return;
    setExporting(true);
    setExportError(null);

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/analytics/export.ndjson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameIds: [...selectedIds] })
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Не удалось скачать выбранные игры"));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `game-history-${new Date().toISOString().slice(0, 10)}.ndjson`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setExportError(
        downloadError instanceof Error
          ? downloadError.message
          : "Не удалось скачать выбранные игры"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-0">
      <CardHeader className="gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl">Все игры сервера</CardTitle>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Найдите нужные партии, отметьте их и скачайте историю только выбранных игр.
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-10 self-start px-3 text-xs"
            disabled={loading}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <RefreshCw className={`mr-2 ${loading ? "animate-spin" : ""}`} size={15} aria-hidden="true" />
            Обновить
          </Button>
        </div>

        <div className="grid gap-3 rounded-xl bg-card p-4 lg:grid-cols-12 lg:items-end">
          <label className="grid gap-2 text-xs font-bold text-muted lg:col-span-4">
            Поиск
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} aria-hidden="true" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => updatePageFilter(() => setSearch(event.target.value))}
                placeholder="Название, код, ведущий или игрок"
              />
            </span>
          </label>
          <label className="grid gap-2 text-xs font-bold text-muted lg:col-span-2">
            Статус
            <select
              className={selectClassName}
              value={status}
              onChange={(event) =>
                updatePageFilter(() => setStatus(event.target.value as GameStatusFilter))
              }
            >
              <option value="">Все статусы</option>
              <option value="WAITING">Собираем игроков</option>
              <option value="IN_PROGRESS">Партия идёт</option>
              <option value="PAUSED">На паузе</option>
              <option value="ENDED">Завершена</option>
              <option value="CANCELLED">Отменена</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold text-muted lg:col-span-2">
            Режим
            <select
              className={selectClassName}
              value={mode}
              onChange={(event) =>
                updatePageFilter(() => setMode(event.target.value as GameModeFilter))
              }
            >
              <option value="">Все режимы</option>
              <option value="MULTIPLAYER">Командная</option>
              <option value="SOLO">С ботами</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold text-muted lg:col-span-2">
            Создана с
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => updatePageFilter(() => setFrom(event.target.value))}
            />
          </label>
          <label className="grid gap-2 text-xs font-bold text-muted lg:col-span-2">
            Создана до
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => updatePageFilter(() => setTo(event.target.value))}
            />
          </label>
          {hasFilters ? (
            <Button
              variant="ghost"
              className="h-10 justify-self-start px-3 text-xs lg:col-span-12"
              onClick={resetFilters}
            >
              <FilterX className="mr-2" size={15} aria-hidden="true" />
              Сбросить фильтры
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-ink p-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-extrabold">
              {selectedIds.size > 0 ? `Выбрано игр: ${selectedIds.size}` : "Выберите игры для файла"}
            </div>
            <p className="mt-1 text-xs text-white/65">
              Выбор сохраняется при переходе между страницами и изменении фильтров.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 ? (
              <Button
                variant="ghost"
                className="h-10 px-3 text-xs text-white hover:bg-white/10"
                onClick={() => setSelectedIds(new Set())}
              >
                Очистить выбор
              </Button>
            ) : null}
            <Button
              variant="action"
              className="h-10"
              disabled={selectedIds.size === 0 || exporting}
              onClick={() => void downloadSelectedGames()}
            >
              <Download className="mr-2" size={16} aria-hidden="true" />
              {exporting ? "Готовим файл…" : "Скачать историю игр"}
            </Button>
          </div>
        </div>
        {exportError ? <p className="text-sm font-medium text-red-700" role="alert">{exportError}</p> : null}
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
            {error}. Проверьте соединение и попробуйте обновить список.
          </div>
        ) : loading && !catalog ? (
          <div className="rounded-xl bg-card p-5 text-sm text-muted" role="status">
            Загружаем игры сервера…
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-xl bg-card p-5 text-sm text-muted">
            {hasFilters
              ? "По выбранным фильтрам игр не найдено. Измените условия поиска."
              : "На сервере пока нет игр."}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex min-h-11 items-center gap-3 text-sm font-extrabold">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-line text-journey focus:ring-action"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleGames}
                />
                Выбрать все на странице
              </label>
              <p className="text-sm text-muted">
                {catalog ? `${pageRange(catalog)} из ${catalog.total}` : null}
              </p>
            </div>

            <div className="grid gap-3 md:hidden">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  selected={selectedIds.has(game.id)}
                  onToggle={toggleGame}
                />
              ))}
            </div>

            <div
              className={`hidden overflow-x-auto rounded-xl border border-line/70 transition-opacity md:block ${loading ? "opacity-55" : ""}`}
              role="region"
              aria-label="Игры сервера"
              aria-busy={loading}
              tabIndex={0}
            >
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="w-14 px-4 py-3">
                      <span className="sr-only">Выбор</span>
                    </th>
                    <th className="px-4 py-3 font-extrabold">Игра</th>
                    <th className="px-4 py-3 font-extrabold">Статус</th>
                    <th className="px-4 py-3 font-extrabold">Режим</th>
                    <th className="px-4 py-3 font-extrabold">Ведущий</th>
                    <th className="px-4 py-3 font-extrabold">Игроки</th>
                    <th className="px-4 py-3 font-extrabold">Ход игры</th>
                    <th className="px-4 py-3 font-extrabold">Создана</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.id} className="border-b border-line/70 last:border-b-0 even:bg-card/60">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 rounded border-line text-journey focus:ring-action"
                          checked={selectedIds.has(game.id)}
                          onChange={() => toggleGame(game.id)}
                          aria-label={`Выбрать игру «${game.title}»`}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link className="font-extrabold text-journey hover:text-[#1f56c8]" href={`/games/${game.id}`}>
                          {game.title}
                        </Link>
                        <div className="mt-1 font-mono text-xs text-muted">{game.code}</div>
                      </td>
                      <td className="px-4 py-3 align-top"><GameStatus status={game.status} /></td>
                      <td className="px-4 py-3 align-top font-bold">{gameModeLabel(game.mode)}</td>
                      <td className="px-4 py-3 align-top">{game.createdBy?.displayName ?? "—"}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          <UsersRound size={15} aria-hidden="true" />
                          {game.playersCount}{game.maxPlayers ? ` / ${game.maxPlayers}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold">Раунд {game.currentRound}</div>
                        <div className="mt-1 text-xs text-muted">{game.eventsCount ?? 0} событий</div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted">{shortDate(game.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {catalog && catalog.totalPages > 1 ? (
              <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Страницы списка игр">
                <Button
                  variant="secondary"
                  className="h-10 px-3"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="mr-1" size={17} aria-hidden="true" />
                  Назад
                </Button>
                <span className="text-sm font-bold text-muted">
                  Страница {catalog.page} из {catalog.totalPages}
                </span>
                <Button
                  variant="secondary"
                  className="h-10 px-3"
                  disabled={page >= catalog.totalPages || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Далее
                  <ChevronRight className="ml-1" size={17} aria-hidden="true" />
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GameCard({
  game,
  selected,
  onToggle
}: {
  game: AdminGameSummary;
  selected: boolean;
  onToggle: (gameId: string) => void;
}) {
  return (
    <article className="rounded-xl bg-card p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 rounded border-line text-journey focus:ring-action"
          checked={selected}
          onChange={() => onToggle(game.id)}
          aria-label={`Выбрать игру «${game.title}»`}
        />
        <div className="min-w-0 flex-1">
          <Link className="font-extrabold text-journey" href={`/games/${game.id}`}>
            {game.title}
          </Link>
          <div className="mt-1 font-mono text-xs text-muted">{game.code}</div>
        </div>
        <GameStatus status={game.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-muted">Режим</dt><dd className="mt-1 font-bold">{gameModeLabel(game.mode)}</dd></div>
        <div><dt className="text-xs text-muted">Игроки</dt><dd className="mt-1 font-bold">{game.playersCount}{game.maxPlayers ? ` / ${game.maxPlayers}` : ""}</dd></div>
        <div><dt className="text-xs text-muted">Ведущий</dt><dd className="mt-1 font-bold">{game.createdBy?.displayName ?? "—"}</dd></div>
        <div><dt className="text-xs text-muted">Создана</dt><dd className="mt-1 font-bold">{shortDate(game.createdAt)}</dd></div>
      </dl>
    </article>
  );
}

function GameStatus({ status }: { status: AdminGameSummary["status"] }) {
  const className = {
    WAITING: "bg-[#e8effe] text-journey",
    IN_PROGRESS: "bg-[#eaf3e0] text-success",
    PAUSED: "bg-[#fff0d8] text-[#9a4b08]",
    ENDED: "bg-white text-ink",
    CANCELLED: "bg-red-50 text-red-700"
  }[status];
  return <Badge className={`shrink-0 font-bold ${className}`}>{gameStatusLabel(status)}</Badge>;
}

function gameModeLabel(mode: AdminGameSummary["mode"]) {
  return mode === "SOLO" ? "С ботами" : "Командная";
}

function pageRange(catalog: AdminGamesCatalogResponse) {
  if (catalog.total === 0) return "0";
  const first = (catalog.page - 1) * catalog.pageSize + 1;
  const last = Math.min(catalog.page * catalog.pageSize, catalog.total);
  return first === last ? String(first) : `${first}–${last}`;
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(". ");
    return body.message || fallback;
  } catch {
    return fallback;
  }
}
