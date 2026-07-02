import { Controller, Get, Header, Param, Query, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  AdminAnalyticsService,
  AnalyticsQuery
} from "./admin-analytics.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/analytics")
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get("games")
  listGames(@Query() query: AnalyticsQuery) {
    return this.analytics.listGames(query);
  }

  @Get("games/:id")
  gameDetail(@Param("id") id: string) {
    return this.analytics.gameDetail(id);
  }

  @Get("games/:id/replay")
  replay(@Param("id") id: string) {
    return this.analytics.replay(id);
  }

  @Get("export.ndjson")
  @Header("Content-Type", "application/x-ndjson; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="game-history.ndjson"')
  exportNdjson(@Query() query: AnalyticsQuery) {
    return this.analytics.exportNdjson(query);
  }
}
