import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { CardType, SystemRole } from "@prisma/client";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AdminService } from "./admin.service";
import { AdminCardDto } from "./dto/card.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/cards")
export class AdminCardsController {
  constructor(private readonly admin: AdminService) {}

  @Get("unclear")
  listUnclearCards() {
    return this.admin.listUnclearCards();
  }

  @Get()
  listCards(@Query("cardType") cardType?: CardType) {
    return this.admin.listCards(cardType);
  }

  @Post()
  createCard(@Body() dto: AdminCardDto) {
    return this.admin.createCard(dto);
  }

  @Patch(":id")
  updateCard(@Param("id") id: string, @Body() dto: AdminCardDto) {
    return this.admin.updateCard(Number(id), dto);
  }

  @Delete(":id")
  deleteCard(@Param("id") id: string) {
    return this.admin.deleteCard(Number(id));
  }
}
