export type MonitoringSeverity = "info" | "warning" | "error" | "critical";

export interface MonitoringIssueInput {
  source: "api" | "web" | "socket" | "bot" | "infrastructure";
  kind: string;
  message: string;
  severity?: MonitoringSeverity;
  stack?: string | null;
  details?: Record<string, unknown>;
}

export interface MetricSample {
  name: string;
  durationMs: number;
  outcome: "ok" | "error" | "timeout";
  recordedAt: number;
}
