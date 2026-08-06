import { Injectable } from "@nestjs/common";
import type { MetricSample } from "./monitoring.types";

const maximumSamples = 1000;

@Injectable()
export class MetricsService {
  private readonly samples: MetricSample[] = [];

  record(name: string, durationMs: number, outcome: MetricSample["outcome"] = "ok") {
    this.samples.push({
      name: sanitizeMetricName(name),
      durationMs: Math.max(0, Math.round(durationMs * 10) / 10),
      outcome,
      recordedAt: Date.now()
    });
    if (this.samples.length > maximumSamples) {
      this.samples.splice(0, this.samples.length - maximumSamples);
    }
  }

  snapshot(windowMinutes = 15) {
    const since = Date.now() - windowMinutes * 60_000;
    const recent = this.samples.filter((sample) => sample.recordedAt >= since);
    const groups = new Map<string, MetricSample[]>();
    for (const sample of recent) {
      const group = groups.get(sample.name) ?? [];
      group.push(sample);
      groups.set(sample.name, group);
    }

    return [...groups.entries()]
      .map(([name, samples]) => {
        const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
        return {
          name,
          count: samples.length,
          errors: samples.filter((sample) => sample.outcome !== "ok").length,
          p50Ms: percentile(durations, 0.5),
          p95Ms: percentile(durations, 0.95),
          maxMs: durations.at(-1) ?? 0
        };
      })
      .sort((a, b) => b.p95Ms - a.p95Ms);
  }
}

function percentile(values: number[], factor: number) {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.ceil(values.length * factor) - 1)] ?? 0;
}

function sanitizeMetricName(value: string) {
  return value.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").slice(0, 160);
}
