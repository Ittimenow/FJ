import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  AssetStatus,
  CardType,
  GameMode,
  GamePlayerStatus,
  GameRole,
  GameStatus,
  PlayerController,
  Prisma
} from "@prisma/client";
import { cardActionTypes, legacyCardEffectAliases } from "@cashflow/shared";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  botCashReserve,
  botStockSaleQuantity,
  chooseBotDealType,
  chooseBotDoodadPayment,
  decideBotDeal,
  shouldAcceptBotCharity,
  shouldSellBotMarketAsset,
  type BotFinancialSnapshot
} from "./bot-strategy";
import { GamesRealtimeService } from "./games-realtime.service";
import { MetricsService } from "../monitoring/metrics.service";
import { MonitoringService } from "../monitoring/monitoring.service";
import { GamesService } from "./games.service";

type BotPendingAction =
  | { type: "choose_deal"; gamePlayerId: string }
  | {
      type: "deal_card_drawn";
      gamePlayerId: string;
      cardId: number;
      cardType: "SMALL_DEAL" | "BIG_DEAL" | "FAST_TRACK";
    }
  | {
      type: "stock_sale_window";
      gamePlayerId: string;
      cardId: number;
      cardType: "SMALL_DEAL" | "BIG_DEAL" | "FAST_TRACK";
      salePriceCents: number;
      symbol: string;
      sellerGamePlayerIds: string[];
      resolvedGamePlayerIds: string[];
    }
  | {
      type: "charity_choice";
      gamePlayerId: string;
      donationCents: number;
    }
  | {
      type: "doodad_payment_choice";
      gamePlayerId: string;
      cashPriceCents: number;
    }
  | {
      type: "market_sale";
      gamePlayerId: string;
      assetId: string;
      proceedsCents: number;
      cashflowCents: number;
    };

type BotPlayer = Prisma.GamePlayerGetPayload<{
  include: {
    financialState: true;
    assets: true;
    liabilities: true;
  };
}>;

type BotAction =
  | { type: "roll"; playerId: string }
  | { type: "draw"; playerId: string; cardType: CardType; reason: string }
  | { type: "buy"; playerId: string; cardId: number; quantity: number; reason: string }
  | { type: "take_loan"; playerId: string; amountCents: number; reason: string }
  | { type: "repay_loan"; playerId: string; liabilityId: string; amountCents: number; reason: string }
  | { type: "decline_deal"; playerId: string; reason: string }
  | { type: "sell_stock"; playerId: string; quantity: number; reason: string }
  | { type: "decline_stock"; playerId: string; reason: string }
  | { type: "sell_market"; playerId: string; reason: string }
  | { type: "decline_market"; playerId: string; reason: string }
  | { type: "accept_charity"; playerId: string; reason: string }
  | { type: "decline_charity"; playerId: string; reason: string }
  | { type: "pay_doodad"; playerId: string; payment: "cash" | "credit"; reason: string }
  | { type: "sell_bankruptcy_asset"; playerId: string; assetId: string; quantity: number; reason: string }
  | { type: "repay_bankruptcy_debt"; playerId: string; liabilityId: string; amountCents: number; reason: string };

const leaseDurationMs = 15_000;
const initialThinkingDelayMs = 650;
const decisionDelayMs = 350;
const maximumStepsPerRun = 32;

@Injectable()
export class GamesBotService implements OnModuleInit {
  private readonly logger = new Logger(GamesBotService.name);
  private readonly running = new Set<string>();
  private readonly retryCounts = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
    private readonly realtime: GamesRealtimeService,
    private readonly metrics: MetricsService,
    private readonly monitoring: MonitoringService
  ) {}

  onModuleInit() {
    this.realtime.registerAfterAction((gameId) => this.kick(gameId));
    void this.recoverActiveGames().catch((error) => {
      this.logger.warn(
        `Не удалось восстановить активные одиночные игры: ${(error as Error).message}`
      );
    });
  }

  kick(gameId: string) {
    if (this.running.has(gameId)) return;
    this.running.add(gameId);
    setTimeout(() => {
      void this.run(gameId).finally(() => this.running.delete(gameId));
    }, initialThinkingDelayMs);
  }

  private async recoverActiveGames() {
    const games = await this.prisma.game.findMany({
      where: { mode: GameMode.SOLO, status: GameStatus.IN_PROGRESS },
      select: { id: true }
    });
    for (const game of games) this.kick(game.id);
  }

  private async run(gameId: string) {
    const runStartedAt = performance.now();
    let runOutcome: "ok" | "error" = "ok";
    const leaseToken = randomUUID();
    if (!(await this.acquireLease(gameId, leaseToken))) {
      const stillActive = await this.prisma.game.findFirst({
        where: { id: gameId, mode: GameMode.SOLO, status: GameStatus.IN_PROGRESS },
        select: { id: true }
      });
      if (stillActive) setTimeout(() => this.kick(gameId), leaseDurationMs + 250);
      return;
    }
    let exhaustedStepBudget = false;

    try {
      for (let step = 0; step < maximumStepsPerRun; step += 1) {
        if (!(await this.renewLease(gameId, leaseToken))) return;
        const game = await this.loadGame(gameId);
        const action = game ? await this.nextAction(game) : null;
        if (!action) return;

        if ("reason" in action) {
          const decision = await this.games.recordBotDecision(gameId, action.playerId, {
            action: action.type,
            reason: action.reason
          });
          this.realtime.broadcastAction(gameId, decision);
          await this.wait(decisionDelayMs);
          if (!(await this.renewLease(gameId, leaseToken))) return;
        }

        const result = await this.execute(gameId, action);
        this.retryCounts.delete(gameId);
        this.realtime.broadcastAction(gameId, result);
        if (step === maximumStepsPerRun - 1) exhaustedStepBudget = true;
      }
    } catch (error) {
      runOutcome = "error";
      this.logger.warn(
        `Не удалось выполнить ход бота в игре ${gameId}: ${(error as Error).message}`
      );
      void this.monitoring.recordIssue({
        source: "bot",
        kind: "bot_turn_failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack ?? null : null,
        severity: "error",
        details: { gameId }
      });
      const retryCount = (this.retryCounts.get(gameId) ?? 0) + 1;
      this.retryCounts.set(gameId, retryCount);
      const retryDelayMs = retryCount <= 3 ? retryCount * 1_000 : 30_000;
      setTimeout(() => this.kick(gameId), retryDelayMs);
    } finally {
      this.metrics.record("bot run", performance.now() - runStartedAt, runOutcome);
      await this.releaseLease(gameId, leaseToken);
      if (exhaustedStepBudget) this.kick(gameId);
    }
  }

  private loadGame(gameId: string) {
    return this.prisma.game.findFirst({
      where: { id: gameId, mode: GameMode.SOLO },
      include: {
        players: {
          where: { role: GameRole.PLAYER, status: GamePlayerStatus.JOINED },
          include: {
            financialState: true,
            assets: { where: { status: AssetStatus.ACTIVE } },
            liabilities: true
          },
          orderBy: { seat: "asc" }
        }
      }
    });
  }

  private async nextAction(game: NonNullable<Awaited<ReturnType<GamesBotService["loadGame"]>>>) {
    if (game.status !== GameStatus.IN_PROGRESS || game.players.length === 0) return null;
    const pending = this.pendingAction(game.settings);
    if (pending?.type === "stock_sale_window") {
      const unresolvedBotSeller = game.players.find(
        (player) =>
          player.controller === PlayerController.BOT &&
          pending.sellerGamePlayerIds.includes(player.id) &&
          !pending.resolvedGamePlayerIds.includes(player.id)
      );
      if (unresolvedBotSeller) {
        return this.stockSaleAction(unresolvedBotSeller, pending);
      }
      const resolved = pending.sellerGamePlayerIds.every((playerId) =>
        pending.resolvedGamePlayerIds.includes(playerId)
      );
      if (!resolved) return null;
    }
    if (pending?.type === "market_sale") {
      const offeredPlayer = game.players.find(
        (player) => player.id === pending.gamePlayerId
      );
      if (!offeredPlayer || offeredPlayer.controller !== PlayerController.BOT) {
        return null;
      }
      return this.pendingActionForBot(offeredPlayer, pending);
    }

    const current = game.players[game.currentTurnIndex % game.players.length];
    if (!current || current.controller !== PlayerController.BOT || !current.financialState) {
      return null;
    }

    if (pending && pending.gamePlayerId !== current.id) return null;
    if (pending) return this.pendingActionForBot(current, pending);

    if (current.financialState.bankruptcyStatus === "LIQUIDATING") {
      return this.bankruptcyAction(current);
    }

    const state = this.financialSnapshot(current);
    const bankLoan = current.liabilities.find((liability) => liability.type === "bank_loan");
    const repayable = Math.floor(
      Math.max(0, state.cashCents - botCashReserve(state)) / 1_000
    ) * 1_000;
    if (bankLoan && repayable >= 1_000) {
      return {
        type: "repay_loan",
        playerId: current.id,
        liabilityId: bankLoan.id,
        amountCents: Math.min(repayable, Number(bankLoan.balanceCents)),
        reason: "свободные наличные можно направить на уменьшение кредитного платежа"
      } satisfies BotAction;
    }

    return { type: "roll", playerId: current.id } satisfies BotAction;
  }

  private async pendingActionForBot(player: BotPlayer, pending: BotPendingAction) {
    const state = this.financialSnapshot(player);
    if (pending.type === "choose_deal") {
      const cardType = chooseBotDealType(state) as CardType;
      return {
        type: "draw",
        playerId: player.id,
        cardType,
        reason: cardType === CardType.BIG_DEAL
          ? "свободных наличных достаточно для рассмотрения крупной сделки"
          : "малая сделка лучше соответствует текущему денежному резерву"
      } satisfies BotAction;
    }
    if (pending.type === "deal_card_drawn" || pending.type === "stock_sale_window") {
      const card = await this.prisma.card.findUnique({
        where: { id: pending.cardId },
        include: { meta: true, effects: true }
      });
      if (!card) {
        return {
          type: "decline_deal",
          playerId: player.id,
          reason: "данные сделки недоступны"
        } satisfies BotAction;
      }
      const meta = Object.fromEntries(card.meta.map((item) => [item.metaKey, item.metaValue]));
      const isStock = this.isStockDeal(card, meta);
      const unitCostCents = this.dealUnitCost(card, meta, isStock);
      const cashflowCents = this.effectAmount(card.effects, cardActionTypes.cashflowAdjust) ??
        this.metaAmount(meta.cashflow_monthly);
      const decision = decideBotDeal(state, {
        title: card.title,
        isStock,
        unitCostCents,
        cashflowCents
      });
      if (!decision.buy) {
        return {
          type: "decline_deal",
          playerId: player.id,
          reason: decision.reason
        } satisfies BotAction;
      }
      if (decision.loanAmountCents > 0) {
        return {
          type: "take_loan",
          playerId: player.id,
          amountCents: decision.loanAmountCents,
          reason: decision.reason
        } satisfies BotAction;
      }
      return {
        type: "buy",
        playerId: player.id,
        cardId: pending.cardId,
        quantity: decision.quantity,
        reason: decision.reason
      } satisfies BotAction;
    }
    if (pending.type === "charity_choice") {
      const decision = shouldAcceptBotCharity(state, pending.donationCents);
      return {
        type: decision.accepted ? "accept_charity" : "decline_charity",
        playerId: player.id,
        reason: decision.reason
      } satisfies BotAction;
    }
    if (pending.type === "doodad_payment_choice") {
      const decision = chooseBotDoodadPayment(state, pending.cashPriceCents);
      return {
        type: "pay_doodad",
        playerId: player.id,
        payment: decision.payment,
        reason: decision.reason
      } satisfies BotAction;
    }
    if (pending.type === "market_sale") {
      const asset = player.assets.find((candidate) => candidate.id === pending.assetId);
      const decision = shouldSellBotMarketAsset({
        proceedsCents: pending.proceedsCents,
        downPaymentCents: Number(asset?.downPaymentCents ?? 0n),
        cashflowCents: pending.cashflowCents
      });
      return {
        type: decision.accepted ? "sell_market" : "decline_market",
        playerId: player.id,
        reason: decision.reason
      } satisfies BotAction;
    }
    return null;
  }

  private stockSaleAction(
    player: BotPlayer,
    pending: Extract<BotPendingAction, { type: "stock_sale_window" }>
  ) {
    const assets = player.assets.filter(
      (asset) => (asset.symbol ?? "").toLowerCase() === pending.symbol.toLowerCase()
    );
    const availableQuantity = assets.reduce((sum, asset) => sum + asset.quantity, 0);
    const totalCost = assets.reduce((sum, asset) => sum + Number(asset.costBasisCents), 0);
    const decision = botStockSaleQuantity({
      availableQuantity,
      averageCostCents: availableQuantity > 0 ? totalCost / availableQuantity : 0,
      salePriceCents: pending.salePriceCents
    });
    return decision.quantity > 0
      ? {
          type: "sell_stock",
          playerId: player.id,
          quantity: decision.quantity,
          reason: decision.reason
        } satisfies BotAction
      : {
          type: "decline_stock",
          playerId: player.id,
          reason: decision.reason
        } satisfies BotAction;
  }

  private bankruptcyAction(player: BotPlayer): BotAction | null {
    const asset = [...player.assets].sort((left, right) => {
      const leftFlow = Number(left.cashflowCents) / Math.max(1, left.quantity);
      const rightFlow = Number(right.cashflowCents) / Math.max(1, right.quantity);
      return leftFlow - rightFlow;
    })[0];
    if (asset) {
      return {
        type: "sell_bankruptcy_asset",
        playerId: player.id,
        assetId: asset.id,
        quantity: asset.quantity,
        reason: "при банкротстве сначала продаётся актив с наименьшим денежным потоком"
      };
    }
    const state = player.financialState;
    const liability = [...player.liabilities]
      .filter((candidate) => candidate.balanceCents > 0n)
      .sort((left, right) => Number(right.paymentCents - left.paymentCents))[0];
    if (state && liability && state.cashCents > 0n) {
      return {
        type: "repay_bankruptcy_debt",
        playerId: player.id,
        liabilityId: liability.id,
        amountCents: Number(
          state.cashCents < liability.balanceCents ? state.cashCents : liability.balanceCents
        ),
        reason: "наличные направляются на долг с самым большим ежемесячным платежом"
      };
    }
    return null;
  }

  private execute(gameId: string, action: BotAction) {
    const actorId = this.games.botActorId(action.playerId);
    switch (action.type) {
      case "roll":
        return this.games.rollDice(gameId, actorId);
      case "draw":
        return this.games.drawCard(gameId, actorId, { cardType: action.cardType });
      case "buy":
        return this.games.buyDeal(gameId, actorId, {
          cardId: action.cardId,
          quantity: action.quantity
        });
      case "take_loan":
        return this.games.takeLoan(gameId, actorId, { amountCents: action.amountCents });
      case "repay_loan":
        return this.games.repayLoan(gameId, actorId, {
          liabilityId: action.liabilityId,
          amountCents: Math.max(1_000, action.amountCents)
        });
      case "decline_deal":
        return this.games.declineDeal(gameId, actorId);
      case "sell_stock":
        return this.games.sellStockFromDeal(gameId, actorId, action.quantity);
      case "decline_stock":
        return this.games.declineStockSale(gameId, actorId);
      case "sell_market":
        return this.games.sellMarketAsset(gameId, actorId);
      case "decline_market":
        return this.games.declineMarketSale(gameId, actorId);
      case "accept_charity":
        return this.games.acceptCharity(gameId, actorId);
      case "decline_charity":
        return this.games.declineCharity(gameId, actorId);
      case "pay_doodad":
        return this.games.resolveDoodadPayment(gameId, actorId, action.payment);
      case "sell_bankruptcy_asset":
        return this.games.sellBankruptcyAsset(gameId, actorId, {
          assetId: action.assetId,
          quantity: action.quantity
        });
      case "repay_bankruptcy_debt":
        return this.games.repayBankruptcyDebt(gameId, actorId, {
          liabilityId: action.liabilityId,
          amountCents: action.amountCents
        });
    }
  }

  private financialSnapshot(player: BotPlayer): BotFinancialSnapshot {
    const state = player.financialState;
    if (!state) throw new Error("Финансовое состояние бота не инициализировано");
    return {
      cashCents: Number(state.cashCents),
      totalIncomeCents: Number(state.totalIncomeCents),
      totalExpensesCents: Number(state.totalExpensesCents),
      monthlyCashflowCents: Number(state.monthlyCashflowCents)
    };
  }

  private pendingAction(settings: Prisma.JsonValue): BotPendingAction | null {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
    const value = (settings as Record<string, unknown>).pendingAction;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const pending = value as Record<string, unknown>;
    if (typeof pending.type !== "string" || typeof pending.gamePlayerId !== "string") {
      return null;
    }
    return pending as BotPendingAction;
  }

  private isStockDeal(
    card: { title: string; bodyText: string; category: string | null; subcategory: string | null },
    meta: Record<string, string>
  ) {
    const text = [card.title, card.bodyText, card.category, card.subcategory]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return Boolean(meta.symbol) || /акци|stock|share/.test(text);
  }

  private dealUnitCost(
    card: { title: string; bodyText: string; effects: Array<{ effectType: string; amountCents: bigint | null }> },
    meta: Record<string, string>,
    isStock: boolean
  ) {
    const cashEffect = this.effectAmount(card.effects, cardActionTypes.cashAdjust);
    if (cashEffect !== null) return Math.abs(cashEffect);
    if (isStock) {
      return this.metaAmount(meta.today_price) || this.metaAmount(meta.price) ||
        this.priceFromText(`${card.title}\n${card.bodyText}`);
    }
    return this.metaAmount(meta.down_payment) || this.metaAmount(meta.price);
  }

  private effectAmount(
    effects: Array<{ effectType: string; amountCents: bigint | null }>,
    actionType: string
  ) {
    const effect = effects.find(
      (candidate) =>
        (legacyCardEffectAliases[candidate.effectType] ?? candidate.effectType) === actionType
    );
    return effect?.amountCents === null || effect?.amountCents === undefined
      ? null
      : Number(effect.amountCents);
  }

  private metaAmount(value: string | undefined) {
    const amount = Number(value?.replace(",", ".") ?? "0");
    return Number.isFinite(amount) ? Math.round(amount) : 0;
  }

  private priceFromText(text: string) {
    const match = text.match(/(?:сегодняшняя\s+цена|today(?:'s)?\s+price)[^\d$]*\$?\s*(\d+(?:[.,]\d+)?)/iu);
    return this.metaAmount(match?.[1]);
  }

  private async acquireLease(gameId: string, token: string) {
    const now = new Date();
    const update = await this.prisma.game.updateMany({
      where: {
        id: gameId,
        mode: GameMode.SOLO,
        status: GameStatus.IN_PROGRESS,
        OR: [{ botLeaseUntil: null }, { botLeaseUntil: { lt: now } }]
      },
      data: {
        botLeaseToken: token,
        botLeaseUntil: new Date(now.getTime() + leaseDurationMs)
      }
    });
    return update.count === 1;
  }

  private async renewLease(gameId: string, token: string) {
    const update = await this.prisma.game.updateMany({
      where: {
        id: gameId,
        mode: GameMode.SOLO,
        status: GameStatus.IN_PROGRESS,
        botLeaseToken: token
      },
      data: { botLeaseUntil: new Date(Date.now() + leaseDurationMs) }
    });
    return update.count === 1;
  }

  private async releaseLease(gameId: string, token: string) {
    await this.prisma.game.updateMany({
      where: { id: gameId, botLeaseToken: token },
      data: { botLeaseToken: null, botLeaseUntil: null }
    });
  }

  private wait(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }
}
