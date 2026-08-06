import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import { MonitoringService } from "./monitoring.service";

@Catch()
export class MonitoringExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly monitoring: MonitoringService,
    adapterHost: HttpAdapterHost
  ) {
    super(adapterHost.httpAdapter);
  }

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      void this.monitoring.recordIssue({
        source: host.getType() === "ws" ? "socket" : "api",
        kind: exception instanceof HttpException ? `http_${status}` : "unhandled_exception",
        message: error.message,
        stack: error.stack ?? null,
        severity: status >= 503 ? "critical" : "error"
      });
    }
    super.catch(exception, host);
  }
}
