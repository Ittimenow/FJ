import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CardType, SystemRole } from "@prisma/client";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AdminService } from "./admin.service";
import { CreateCardSetDto, UpdateCardSetDto } from "./dto/card-set.dto";
import { AdminCardDto } from "./dto/card.dto";
import type { WorkbookCard } from "./card-workbook";

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

  @Get("export")
  @Header("Content-Type", "application/vnd.ms-excel")
  @Header("Content-Disposition", "attachment; filename=game-cards.xls")
  exportCards() {
    return this.admin.exportCardWorkbook();
  }

  @Post("import/preview")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  previewImport(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException("Выберите Excel-файл");
    return this.admin.previewCardWorkbook(file.buffer);
  }

  @Post("import/apply")
  applyImport(@Body() input: { action: "create" | "update" | "delete"; cardId: number | null; expectedSnapshot: string | null; after: WorkbookCard | null }) {
    return this.admin.applyWorkbookCard(input);
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
