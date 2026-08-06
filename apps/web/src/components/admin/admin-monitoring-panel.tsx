"use client";

import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  RefreshCw,
  RotateCcw,
  Server
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";

interface OperationMetric {
  name: string;
  count: number;
  errors: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

interface MonitoringIssue {
  id: string;
  status: "OPEN" | "RESOLVED" | "IGNORED";
  severity: string;
  source: string;
  kind: string;
  message: string;
  details: Record<string, unknown>;
  occurrences: number;
  release: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface MonitoringOverview {
  runtime: {
    startedAt: string;
    uptimeSeconds: number;
    memory: { rssMb: number; heapUsedMb: number };
    redis: { configured: boolean; connected: boolean; error: string | null };
  };
  operations: OperationMetric[];
  issues: MonitoringIssue[];
}

export function AdminMonitoringPanel({ token }: { token: string }) {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/monitoring`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Сервер вернул ${response.status}`);
      setOverview((await response.json()) as MonitoringOverview);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Не удалось загрузить мониторинг: ${caught.message}`
          : "Не удалось загрузить мониторинг"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const openIssues = useMemo(
    () => overview?.issues.filter((issue) => issue.status === "OPEN") ?? [],
    [overview]
  );
  const closedIssues = useMemo(
    () => overview?.issues.filter((issue) => issue.status !== "OPEN") ?? [],
    [overview]
  );

  async function changeStatus(issue: MonitoringIssue, status: "open" | "resolved") {
    setUpdatingId(issue.id);
    setError(null);
    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/admin/monitoring/issues/${issue.id}/${status}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error(`Сервер вернул ${response.status}`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось изменить статус ошибки");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && !overview) {
    return <p className="rounded-xl bg-card p-4 text-sm text-muted">Загружаем состояние системы…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-[-0.025em]">Состояние системы</h2>
          <p className="mt-1 max-w-[70ch] text-sm leading-6 text-muted">
            Ошибки сгруппированы по причине, а задержки рассчитаны по операциям за последние 15 минут.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 animate-spin" : "mr-2"} size={16} aria-hidden="true" />
          Обновить
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {overview ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SystemMetric
              icon={Server}
              label="API работает"
              value={formatUptime(overview.runtime.uptimeSeconds)}
              detail={`Память ${overview.runtime.memory.heapUsedMb} МБ`}
            />
            <SystemMetric
              icon={Database}
              label="Redis"
              value={
                !overview.runtime.redis.configured
                  ? "Не используется"
                  : overview.runtime.redis.connected
                    ? "Подключён"
                    : "Недоступен"
              }
              detail={overview.runtime.redis.error ?? "Для одного экземпляра необязателен"}
            />
            <SystemMetric
              icon={CircleAlert}
              label="Открытые ошибки"
              value={String(openIssues.length)}
              detail={openIssues.length === 0 ? "Новых проблем нет" : "Требуют разбора"}
            />
            <SystemMetric
              icon={Activity}
              label="Операции"
              value={String(overview.operations.reduce((sum, item) => sum + item.count, 0))}
              detail="За последние 15 минут"
            />
          </dl>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold">Скорость обработки</h3>
                <p className="mt-1 text-sm text-muted">P95 показывает задержку, быстрее которой завершилось 95% операций.</p>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl bg-card" role="region" aria-label="Метрики операций" tabIndex={0}>
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="px-4 py-3">Операция</th>
                    <th className="px-4 py-3">Запусков</th>
                    <th className="px-4 py-3">Ошибок</th>
                    <th className="px-4 py-3">P50</th>
                    <th className="px-4 py-3">P95</th>
                    <th className="px-4 py-3">Максимум</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.operations.length > 0 ? (
                    overview.operations.map((metric) => (
                      <tr key={metric.name} className="border-b border-line/70 last:border-b-0">
                        <td className="max-w-md px-4 py-3 font-bold text-ink">{metric.name}</td>
                        <td className="px-4 py-3 tabular-nums">{metric.count}</td>
                        <td className={metric.errors ? "px-4 py-3 font-bold text-red-700" : "px-4 py-3 tabular-nums"}>{metric.errors}</td>
                        <td className="px-4 py-3 tabular-nums">{metric.p50Ms} мс</td>
                        <td className="px-4 py-3 font-bold tabular-nums">{metric.p95Ms} мс</td>
                        <td className="px-4 py-3 tabular-nums">{metric.maxMs} мс</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted">Метрики появятся после первых запросов.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <IssueSection
            title="Открытые ошибки"
            empty="Открытых ошибок нет."
            issues={openIssues}
            updatingId={updatingId}
            onChangeStatus={changeStatus}
          />
          {closedIssues.length > 0 ? (
            <details className="rounded-xl bg-card p-4">
              <summary className="cursor-pointer font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30">
                Завершённые и скрытые — {closedIssues.length}
              </summary>
              <div className="mt-4">
                <IssueList
                  issues={closedIssues}
                  updatingId={updatingId}
                  onChangeStatus={changeStatus}
                />
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SystemMetric({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof Server;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-muted">
        <Icon size={16} aria-hidden="true" />
        <dt>{label}</dt>
      </div>
      <dd className="mt-2 text-xl font-extrabold text-ink">{value}</dd>
      <p className="mt-1 truncate text-xs text-muted" title={detail}>{detail}</p>
    </div>
  );
}

function IssueSection({
  title,
  empty,
  issues,
  updatingId,
  onChangeStatus
}: {
  title: string;
  empty: string;
  issues: MonitoringIssue[];
  updatingId: string | null;
  onChangeStatus: (issue: MonitoringIssue, status: "open" | "resolved") => void;
}) {
  return (
    <section>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <div className="mt-3">
        {issues.length > 0 ? (
          <IssueList issues={issues} updatingId={updatingId} onChangeStatus={onChangeStatus} />
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-[#eaf3e0] p-4 text-success">
            <CheckCircle2 size={20} aria-hidden="true" />
            <p className="font-bold">{empty}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function IssueList({
  issues,
  updatingId,
  onChangeStatus
}: {
  issues: MonitoringIssue[];
  updatingId: string | null;
  onChangeStatus: (issue: MonitoringIssue, status: "open" | "resolved") => void;
}) {
  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <article key={issue.id} className="rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(23,36,63,.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className={severityClass(issue.severity)}>{severityLabel(issue.severity)}</span>
                <span className="rounded-lg bg-card px-2 py-1 text-muted">{issue.source} · {issue.kind}</span>
                <span className="inline-flex items-center gap-1 text-muted">
                  <Clock3 size={12} aria-hidden="true" />
                  {formatDate(issue.lastSeenAt)}
                </span>
              </div>
              <h4 className="mt-3 [overflow-wrap:anywhere] font-extrabold text-ink">{issue.message}</h4>
              <p className="mt-2 text-sm text-muted">
                Повторений: {issue.occurrences}
                {issue.release ? ` · Релиз: ${issue.release}` : ""}
              </p>
              {Object.keys(issue.details ?? {}).length > 0 ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-bold text-journey">Технические данные</summary>
                  <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-ink p-3 text-xs text-white">
                    {JSON.stringify(issue.details, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
            <Button
              variant="secondary"
              disabled={updatingId === issue.id}
              onClick={() => onChangeStatus(issue, issue.status === "OPEN" ? "resolved" : "open")}
            >
              {issue.status === "OPEN" ? (
                <CheckCircle2 className="mr-2" size={16} aria-hidden="true" />
              ) : (
                <RotateCcw className="mr-2" size={16} aria-hidden="true" />
              )}
              {issue.status === "OPEN" ? "Решено" : "Вернуть"}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function severityClass(severity: string) {
  if (severity === "critical" || severity === "error") return "rounded-lg bg-red-50 px-2 py-1 text-red-700";
  if (severity === "warning") return "rounded-lg bg-[#fff0df] px-2 py-1 text-[#8a3d0a]";
  return "rounded-lg bg-[#e8effe] px-2 py-1 text-journey";
}

function severityLabel(severity: string) {
  if (severity === "critical") return "Критично";
  if (severity === "error") return "Ошибка";
  if (severity === "warning") return "Предупреждение";
  return "Информация";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ч`;
  return `${Math.floor(seconds / 86_400)} д`;
}
