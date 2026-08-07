import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CardType } from "@prisma/client";
import {
  AuthenticatedUser,
  CurrentUser
} from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { AddGameUserDto } from "./dto/add-game-user.dto";
import { BabyGiftDto } from "./dto/baby-gift.dto";
import { RepayBankruptcyDebtDto, SellBankruptcyAssetDto } from "./dto/bankruptcy.dto";
import { BuyDealDto } from "./dto/buy-deal.dto";
import { ChatDto } from "./dto/chat.dto";
import { ChooseFigurineDto } from "./dto/choose-figurine.dto";
import { CreateGameDto } from "./dto/create-game.dto";
import { CreateSoloGameDto } from "./dto/create-solo-game.dto";
import { DrawCardDto } from "./dto/draw-card.dto";
import { JoinGameDto } from "./dto/join-game.dto";
import { RepayLoanDto, TakeLoanDto } from "./dto/loan.dto";
import { SearchGameUsersDto } from "./dto/search-game-users.dto";
import { UpdateHostParticipationDto } from "./dto/update-host-participation.dto";
import { GamesRealtimeService } from "./games-realtime.service";
import { GamesService } from "./games.service";

@Controller("game-invites")
export class GameInvitesController {
  constructor(private readonly games: GamesService) {}

  @Get(":code/metadata")
  metadata(@Param("code") code: string) {
    return this.games.getInviteMetadata(code);
  }
}

@UseGuards(JwtAuthGuard)
@Controller("games")
export class GamesController {
  constructor(
    private readonly games: GamesService,
    private readonly realtime: GamesRealtimeService
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.games.listGames(user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGameDto
  ) {
    return this.games.createGame(user.userId, dto);
  }

  @Post("solo")
  createSolo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSoloGameDto
  ) {
    return this.games.createSoloGame(user.userId, dto);
  }

  @Post("join")
  async join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinGameDto) {
    const snapshot = await this.games.joinGame(user.userId, dto);
    this.realtime.broadcastSnapshot(snapshot.game.id, snapshot);
    return snapshot;
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.games.getGame(id, user.userId);
  }

  @Post(":id/start")
  async start(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.startGame(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/pause")
  async pause(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.pauseGame(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/resume")
  async resume(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.resumeGame(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/timer/sync")
  async syncTimer(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.syncGameTimer(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/figurine")
  async chooseFigurine(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ChooseFigurineDto
  ) {
    const result = await this.games.chooseFigurine(id, user.userId, dto.figurine);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/host-participation")
  async updateHostParticipation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateHostParticipationDto
  ) {
    const result = await this.games.updateHostParticipation(
      id,
      user.userId,
      dto.participates
    );
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/users")
  async addUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddGameUserDto
  ) {
    const result = await this.games.addUserToGame(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Get(":id/users/search")
  searchUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query() dto: SearchGameUsersDto
  ) {
    return this.games.searchUsersForGame(id, user.userId, dto.query);
  }

  @Delete(":id")
  async delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.deleteGame(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/roll")
  async roll(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.rollDice(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/skip")
  async skip(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.skipTurn(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/cards/draw")
  async drawCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: DrawCardDto
  ) {
    const result = await this.games.drawCard(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/deals/buy")
  async buyDeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: BuyDealDto
  ) {
    const result = await this.games.buyDeal(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/deals/decline")
  async declineDeal(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.declineDeal(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/market/sell")
  async sellMarketAsset(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.sellMarketAsset(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/market/decline")
  async declineMarketSale(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.declineMarketSale(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/charity/accept")
  async acceptCharity(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.acceptCharity(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/charity/decline")
  async declineCharity(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.declineCharity(id, user.userId);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/baby-gifts")
  async sendBabyGift(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: BabyGiftDto
  ) {
    const result = await this.games.sendBabyGift(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/doodad/payment/cash")
  async payDoodadWithCash(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.resolveDoodadPayment(id, user.userId, "cash");
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/doodad/payment/credit")
  async payDoodadWithCredit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.games.resolveDoodadPayment(id, user.userId, "credit");
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/loans")
  async takeLoan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: TakeLoanDto
  ) {
    const result = await this.games.takeLoan(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/loans/repay")
  async repayLoan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RepayLoanDto
  ) {
    const result = await this.games.repayLoan(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/bankruptcy/assets/sell")
  async sellBankruptcyAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SellBankruptcyAssetDto
  ) {
    const result = await this.games.sellBankruptcyAsset(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/bankruptcy/debts/repay")
  async repayBankruptcyDebt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RepayBankruptcyDebtDto
  ) {
    const result = await this.games.repayBankruptcyDebt(id, user.userId, dto);
    this.realtime.broadcastAction(id, result);
    return result;
  }

  @Post(":id/chat")
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ChatDto
  ) {
    const message = await this.games.sendChat(id, user.userId, dto);
    this.realtime.broadcastChatMessage(id, message);
    return message;
  }

  @Get(":id/replay")
  replay(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.games.replay(id, user.userId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller("reference")
export class ReferenceController {
  constructor(private readonly games: GamesService) {}

  @Get("professions")
  professions() {
    return this.games.professions();
  }

  @Get("cards")
  cards(@Query("cardType") cardType?: CardType) {
    return this.games.cards(cardType);
  }
}
