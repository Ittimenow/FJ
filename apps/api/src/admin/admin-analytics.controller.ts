import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  AdminAnalyticsService,
  AnalyticsQuery,
  GameCatalogQuery
} from "./admin-analytics.service";
import { ExportGamesDto } from "./dto/export-games.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/analytics")
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get("games")
  listGames(@Query() query: AnalyticsQuery) {
    return this.analytics.listGames(query);
  }

  @Get("catalog")
  gameCatalog(@Query() query: GameCatalogQuery) {
    return this.analytics.gameCatalog(query);
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

  @Post("export.ndjson")
  @Header("Content-Type", "application/x-ndjson; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="game-history.ndjson"')
  exportSelectedNdjson(@Body() dto: ExportGamesDto) {
    return this.analytics.exportSelectedNdjson(dto.gameIds);
  }
}
