import { Global, Module } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { AdminMonitoringController, DiagnosticsController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";
import { HealthController } from "./health.controller";
import { RuntimeHealthService } from "./runtime-health.service";

@Global()
@Module({
  controllers: [HealthController, DiagnosticsController, AdminMonitoringController],
  providers: [MonitoringService, MetricsService, RuntimeHealthService],
  exports: [MonitoringService, MetricsService, RuntimeHealthService]
})
export class MonitoringModule {}
