import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { realtimeEvents } from "@cashflow/shared";
import { Server, Socket } from "socket.io";
import { BuyDealDto } from "./dto/buy-deal.dto";
import { BabyGiftDto } from "./dto/baby-gift.dto";
import { RepayBankruptcyDebtDto, SellBankruptcyAssetDto } from "./dto/bankruptcy.dto";
import { ChatDto } from "./dto/chat.dto";
import { DrawCardDto } from "./dto/draw-card.dto";
import { RepayLoanDto, TakeLoanDto } from "./dto/loan.dto";
import { GamesRealtimeService } from "./games-realtime.service";
import { GamesService } from "./games.service";
import { MetricsService } from "../monitoring/metrics.service";
import { MonitoringService } from "../monitoring/monitoring.service";

interface SocketUser {
  sub: string;
  email: string;
  displayName: string;
}

function corsOriginFromEnv() {
  const origins = (
    process.env.WEB_ORIGIN ??
    process.env.APP_PUBLIC_URL ??
    "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 1 ? origins : origins[0] ?? "http://localhost:3000";
}

@WebSocketGateway({
  namespace: "games",
  cors: {
    origin: corsOriginFromEnv(),
    credentials: true
  }
})
export class GamesGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GamesGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly games: GamesService,
    private readonly realtime: GamesRealtimeService,
    private readonly metrics: MetricsService,
    private readonly monitoring: MonitoringService
  ) {}

  afterInit(server: Server) {
    this.realtime.bindServer(server);
    server.use(async (client, next) => {
      const startedAt = performance.now();
      try {
        const token = this.extractToken(client);
        const payload = await this.jwt.verifyAsync<SocketUser>(token);
        client.data.user = {
          userId: payload.sub,
          email: payload.email,
          displayName: payload.displayName
        };
        this.metrics.record("socket authenticate", performance.now() - startedAt);
        next();
      } catch (caught) {
        const error = caught instanceof Error ? caught : new Error(String(caught));
        const code = /expired/i.test(error.message) ? "SESSION_EXPIRED" : "AUTH_FAILED";
        this.metrics.record("socket authenticate", performance.now() - startedAt, "error");
        void this.monitoring.recordIssue({
          source: "socket",
          kind: code.toLowerCase(),
          message: `Socket authentication failed: ${error.message}`,
          severity: "warning"
        });
        const connectionError = new Error(
          code === "SESSION_EXPIRED" ? "Сессия истекла" : "Не удалось авторизовать соединение"
        ) as Error & { data?: { code: string } };
        connectionError.data = { code };
        next(connectionError);
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  @SubscribeMessage("diagnostics:ping")
  diagnosticsPing() {
    return { status: "ok", serverTime: new Date().toISOString() };
  }

  @SubscribeMessage("game:join")
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const userId = this.userId(client);
    await client.join(body.gameId);
    const snapshot = await this.games.getGame(body.gameId, userId);
    client.emit(realtimeEvents.stateUpdate, snapshot);
    return snapshot;
  }

  @SubscribeMessage("player:roll_dice")
  async rollDice(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.rollDice(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("turn:skip")
  async skipTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.skipTurn(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("game:start")
  async startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.startGame(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("game:pause")
  async pauseGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.pauseGame(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("game:resume")
  async resumeGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.resumeGame(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("game:timer_sync")
  async syncGameTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.syncGameTimer(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("game:delete")
  async deleteGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.deleteGame(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("card:draw")
  async drawCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & DrawCardDto
  ) {
    const result = await this.games.drawCard(body.gameId, this.userId(client), {
      cardType: body.cardType
    });
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("deal:buy")
  async buyDeal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & BuyDealDto
  ) {
    const dto: BuyDealDto = { cardId: body.cardId };
    if (body.quantity !== undefined) dto.quantity = body.quantity;
    const result = await this.games.buyDeal(body.gameId, this.userId(client), dto);
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("deal:decline")
  async declineDeal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.declineDeal(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("stock:sell")
  async sellStockFromDeal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string; quantity: number }
  ) {
    const result = await this.games.sellStockFromDeal(
      body.gameId,
      this.userId(client),
      body.quantity
    );
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("stock:decline")
  async declineStockSale(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.declineStockSale(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("market:sell")
  async sellMarketAsset(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.sellMarketAsset(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("market:decline")
  async declineMarketSale(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.declineMarketSale(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("charity:accept")
  async acceptCharity(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.acceptCharity(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("charity:decline")
  async declineCharity(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.declineCharity(body.gameId, this.userId(client));
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("baby:gift")
  async sendBabyGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & BabyGiftDto
  ) {
    const result = await this.games.sendBabyGift(
      body.gameId,
      this.userId(client),
      { birthEventId: body.birthEventId, amountCents: body.amountCents }
    );
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("doodad:pay_cash")
  async payDoodadWithCash(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.resolveDoodadPayment(
      body.gameId,
      this.userId(client),
      "cash"
    );
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("doodad:pay_credit")
  async payDoodadWithCredit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const result = await this.games.resolveDoodadPayment(
      body.gameId,
      this.userId(client),
      "credit"
    );
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("loan:take")
  async takeLoan(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & TakeLoanDto
  ) {
    const dto: TakeLoanDto = { amountCents: body.amountCents };
    if (body.paymentCents !== undefined) dto.paymentCents = body.paymentCents;
    const result = await this.games.takeLoan(body.gameId, this.userId(client), dto);
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("loan:repay")
  async repayLoan(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & RepayLoanDto
  ) {
    const dto: RepayLoanDto = { amountCents: body.amountCents };
    if (body.liabilityId !== undefined) dto.liabilityId = body.liabilityId;
    const result = await this.games.repayLoan(body.gameId, this.userId(client), dto);
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("bankruptcy:asset_sell")
  async sellBankruptcyAsset(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & SellBankruptcyAssetDto
  ) {
    const result = await this.games.sellBankruptcyAsset(
      body.gameId,
      this.userId(client),
      { assetId: body.assetId, quantity: body.quantity }
    );
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("bankruptcy:debt_repay")
  async repayBankruptcyDebt(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & RepayBankruptcyDebtDto
  ) {
    const result = await this.games.repayBankruptcyDebt(
      body.gameId,
      this.userId(client),
      { liabilityId: body.liabilityId, amountCents: body.amountCents }
    );
    this.realtime.broadcastAction(body.gameId, result);
    return result;
  }

  @SubscribeMessage("chat:send")
  async sendChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string } & ChatDto
  ) {
    const message = await this.games.sendChat(body.gameId, this.userId(client), {
      body: body.body
    });
    this.realtime.broadcastChatMessage(body.gameId, message);
    return message;
  }

  private userId(client: Socket): string {
    const user = client.data.user as { userId: string } | undefined;
    if (!user) throw new Error("Socket is not authenticated");
    return user.userId;
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string") return authToken;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);

    throw new Error("Missing token");
  }
}
