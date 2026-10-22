import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AdminService } from "./admin.service";
import { CreateBotNameDto } from "./dto/bot-name.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/bot-names")
export class AdminBotNamesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listBotNames();
  }

  @Post()
  create(@Body() dto: CreateBotNameDto) {
    return this.admin.createBotName(dto.name);
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.setBotNameActive(id, false);
  }

  @Patch(":id/restore")
  restore(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.setBotNameActive(id, true);
  }
}
