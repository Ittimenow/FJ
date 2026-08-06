import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Observable, catchError, tap, throwError } from "rxjs";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger("RequestMetrics");

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = performance.now();
    const type = context.getType<"http" | "ws">();
    const descriptor = this.descriptor(context, type);
    const requestId = type === "http" ? this.requestId(context) : randomUUID();

    return next.handle().pipe(
      tap(() => this.finish(descriptor, requestId, startedAt, "ok")),
      catchError((error) => {
        this.finish(descriptor, requestId, startedAt, "error");
        return throwError(() => error);
      })
    );
  }

  private descriptor(context: ExecutionContext, type: "http" | "ws") {
    if (type === "ws") return `ws ${context.getHandler().name}`;
    const request = context.switchToHttp().getRequest<{
      method?: string;
      route?: { path?: string };
      originalUrl?: string;
    }>();
    const path = request.route?.path ?? request.originalUrl?.split("?")[0] ?? "unknown";
    return `http ${request.method ?? "UNKNOWN"} ${path}`;
  }

  private requestId(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown> }>();
    const incoming = request.headers?.["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.length <= 100 ? incoming : randomUUID();
    response.setHeader("x-request-id", requestId);
    return requestId;
  }

  private finish(
    descriptor: string,
    requestId: string,
    startedAt: number,
    outcome: "ok" | "error"
  ) {
    const durationMs = performance.now() - startedAt;
    this.metrics.record(descriptor, durationMs, outcome);
    this.logger.log(
      JSON.stringify({ type: "operation", requestId, descriptor, outcome, durationMs: Math.round(durationMs) })
    );
  }
}
