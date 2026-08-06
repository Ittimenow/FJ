import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService } from "./metrics.service";
import { RuntimeHealthService } from "./runtime-health.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly runtime: RuntimeHealthService
  ) {}

  @Get("live")
  live() {
    return { status: "ok", serverTime: new Date().toISOString() };
  }

  @Get("ping")
  ping() {
    return { status: "ok", serverTime: new Date().toISOString() };
  }

  @Get("ready")
  async ready() {
    const startedAt = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseLatencyMs = Math.round(performance.now() - startedAt);
      return {
        status: "ok",
        database: { status: "ok", latencyMs: databaseLatencyMs },
        runtime: this.runtime.snapshot(),
        operations: this.metrics.snapshot()
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: { status: "error", latencyMs: Math.round(performance.now() - startedAt) },
        runtime: this.runtime.snapshot()
      });
    }
  }
}
