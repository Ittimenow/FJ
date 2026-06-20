import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { FeedbackService } from "./feedback.service";

@UseGuards(JwtAuthGuard)
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Get()
  listAll() {
    return this.feedback.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Patch(":id/read")
  markRead(@Param("id") id: string) {
    return this.feedback.markRead(id);
  }
}
