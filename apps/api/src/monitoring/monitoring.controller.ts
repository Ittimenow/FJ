import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { ClientDiagnosticDto } from "./dto/client-diagnostic.dto";
import { MetricsService } from "./metrics.service";
import { MonitoringService } from "./monitoring.service";
import { RuntimeHealthService } from "./runtime-health.service";

@UseGuards(JwtAuthGuard)
@Controller("diagnostics")
export class DiagnosticsController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Post("client-event")
  async clientEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ClientDiagnosticDto
  ) {
    await this.monitoring.recordIssue({
      source: "web",
      kind: body.kind,
      message: body.message,
      severity: body.kind === "client_error" ? "error" : "warning",
      details: {
        userId: user.userId,
        gameId: body.gameId,
        connectionState: body.connectionState,
        apiLatencyMs: body.apiLatencyMs,
        socketLatencyMs: body.socketLatencyMs
      }
    });
    return { accepted: true };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/monitoring")
export class AdminMonitoringController {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly metrics: MetricsService,
    private readonly runtime: RuntimeHealthService
  ) {}

  @Get()
  async overview(@Query("status") status?: string) {
    return {
      runtime: this.runtime.snapshot(),
      operations: this.metrics.snapshot(),
      issues: await this.monitoring.listIssues(status)
    };
  }

  @Patch("issues/:id/:status")
  setStatus(
    @Param("id") id: string,
    @Param("status") status: "open" | "resolved" | "ignored"
  ) {
    const normalized = status.toUpperCase();
    if (!(["OPEN", "RESOLVED", "IGNORED"] as string[]).includes(normalized)) {
      throw new BadRequestException("Invalid monitoring issue status");
    }
    return this.monitoring.setIssueStatus(
      id,
      normalized as "OPEN" | "RESOLVED" | "IGNORED"
    );
  }
}
