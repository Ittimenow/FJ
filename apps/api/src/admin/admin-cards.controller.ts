import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateCardSetDto, UpdateCardSetDto } from "./dto/card-set.dto";
import { AdminCardDto } from "./dto/card.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/cards")
export class AdminCardsController {
  constructor(private readonly admin: AdminService) {}

  @Get("sets")
  listCardSets() {
    return this.admin.listCardSets();
  }

  @Post("sets")
  createCardSet(@Body() dto: CreateCardSetDto) {
    return this.admin.createCardSet(dto);
  }

  @Patch("sets/:id")
  updateCardSet(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCardSetDto
  ) {
    return this.admin.updateCardSet(id, dto);
  }

  @Patch("sets/:id/default")
  setDefaultCardSet(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.admin.setDefaultCardSet(id);
  }

  @Get()
  listCards(
    @Query("cardType") cardType?: CardType,
    @Query("cardSetId") cardSetId?: string
  ) {
    return this.admin.listCards(cardType, cardSetId);
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
