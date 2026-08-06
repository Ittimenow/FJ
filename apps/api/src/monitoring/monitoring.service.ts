import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { MonitoringIssueInput } from "./monitoring.types";

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordIssue(input: MonitoringIssueInput) {
    const message = input.message.trim().slice(0, 1000) || "Unknown monitoring issue";
    const fingerprint = issueFingerprint(input.source, input.kind, message);
    const release = currentRelease();
    const details = sanitizeDetails(input.details ?? {});

    try {
      await this.prisma.monitoringIssue.upsert({
        where: { fingerprint },
        create: {
          fingerprint,
          status: "OPEN",
          severity: input.severity ?? "error",
          source: input.source,
          kind: input.kind.slice(0, 120),
          message,
          stack: input.stack?.slice(0, 20_000) ?? null,
          details,
          release
        },
        update: {
          status: "OPEN",
          severity: input.severity ?? "error",
          message,
          stack: input.stack?.slice(0, 20_000) ?? null,
          details,
          release,
          lastSeenAt: new Date(),
          resolvedAt: null,
          occurrences: { increment: 1 }
        }
      });
    } catch (error) {
      this.logger.warn(
        `Monitoring issue could not be persisted: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel(sentryLevel(input.severity ?? "error"));
        scope.setTag("source", input.source);
        scope.setTag("kind", input.kind);
        scope.setFingerprint([fingerprint]);
        scope.setContext("diagnostics", details);
        Sentry.captureMessage(message);
      });
    }
  }

  listIssues(status?: string) {
    return this.prisma.monitoringIssue.findMany({
      ...(status && status !== "ALL" ? { where: { status } } : {}),
      orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
      take: 200
    });
  }

  async setIssueStatus(id: string, status: "OPEN" | "RESOLVED" | "IGNORED") {
    return this.prisma.monitoringIssue.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "OPEN" ? null : new Date()
      }
    });
  }
}

function issueFingerprint(source: string, kind: string, message: string) {
  const normalized = message
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":uuid")
    .replace(/\b\d{4,}\b/g, ":number");
  return createHash("sha256").update(`${source}|${kind}|${normalized}`).digest("hex");
}

function sanitizeDetails(details: Record<string, unknown>) {
  const blocked = /token|password|authorization|cookie|secret/i;
  return Object.fromEntries(
    Object.entries(details)
      .filter(([key]) => !blocked.test(key))
      .slice(0, 30)
      .map(([key, value]) => [key, sanitizeValue(value)])
  );
}

function sanitizeValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, 500);
  return JSON.stringify(value).slice(0, 500);
}

function currentRelease() {
  return (
    process.env.GAME_RELEASE_VERSION ??
    process.env.SOURCE_VERSION ??
    process.env.GITHUB_SHA ??
    null
  );
}

function sentryLevel(severity: string): Sentry.SeverityLevel {
  if (severity === "critical") return "fatal";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "error";
}
