import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateAnnouncementDto,
  CreateTelegramChannelPostDto,
  UpdateAnnouncementDto,
  UpdateSummaryDto,
  UpdateTelegramChannelPostDto
} from "./publications.dto";
import { PublicationsService } from "./publications.service";

@Controller("results")
export class PublicResultsController {
  constructor(private readonly publications: PublicationsService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    const parsed = limit ? Number(limit) : 6;
    return this.publications.publicList(Number.isInteger(parsed) ? parsed : 6);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.publications.publicDetail(id);
  }

  @Get(":id/card")
  card(@Param("id") id: string) {
    return this.publications.cardData(id);
  }
}

@Controller("telegram-publications")
export class PublicTelegramPublicationsController {
  constructor(private readonly publications: PublicationsService) {}

  @Get(":id/card")
  card(@Param("id") id: string) {
    return this.publications.channelPostCardData(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/publications")
export class AdminPublicationsController {
  constructor(private readonly publications: PublicationsService) {}

  @Get()
  overview() {
    return this.publications.adminOverview();
  }

  @Post("announcements")
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.publications.createAnnouncement(dto);
  }

  @Patch("announcements/:id")
  updateAnnouncement(@Param("id") id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.publications.updateAnnouncement(id, dto);
  }

  @Post("games/:gameId/generate")
  generate(@Param("gameId") gameId: string) {
    return this.publications.generateGame(gameId);
  }

  @Patch("summaries/:id")
  updateSummary(@Param("id") id: string, @Body() dto: UpdateSummaryDto) {
    return this.publications.updateSummary(id, dto);
  }

  @Post("summaries/:id/publish")
  publish(@Param("id") id: string) {
    return this.publications.publish(id);
  }

  @Post("channel-posts")
  createChannelPost(@Body() dto: CreateTelegramChannelPostDto) {
    return this.publications.createChannelPost(dto);
  }

  @Patch("channel-posts/:id")
  updateChannelPost(@Param("id") id: string, @Body() dto: UpdateTelegramChannelPostDto) {
    return this.publications.updateChannelPost(id, dto);
  }

  @Post("channel-posts/:id/publish")
  publishChannelPost(@Param("id") id: string) {
    return this.publications.publishChannelPost(id);
  }
}
