import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AccountStatus,
  AssetStatus,
  BankruptcyStatus,
  BoardTrack,
  CardType,
  GamePlayerStatus,
  GameMode,
  GameRole,
  GameStatus,
  PlayerController,
  Prisma,
  SystemRole
} from "@prisma/client";
import {
  cardActionTypes,
  dealDownPaymentAmount,
  isBabyGiftWindowOpen,
  canEscapeRatRace,
  legacyCardEffectAliases,
  moveOnCircularTrack,
  normalizeCardTypeForCell,
  ratRaceBoard,
  realtimeEvents,
  rollDie,
  isFigurineId,
  figurines
} from "@cashflow/shared";
import { randomInt } from "node:crypto";
import { cents, toSerializable } from "../common/json";
import { PrismaService } from "../prisma/prisma.service";
import { AddGameUserDto } from "./dto/add-game-user.dto";
import { BabyGiftDto } from "./dto/baby-gift.dto";
import { RepayBankruptcyDebtDto, SellBankruptcyAssetDto } from "./dto/bankruptcy.dto";
import { BuyDealDto } from "./dto/buy-deal.dto";
import { ChatDto } from "./dto/chat.dto";
import { CreateGameDto } from "./dto/create-game.dto";
import { CreateSoloGameDto } from "./dto/create-solo-game.dto";
import { DrawCardDto } from "./dto/draw-card.dto";
import { missingCardTypes } from "./card-set";
import { JoinGameDto } from "./dto/join-game.dto";
import { RepayLoanDto, TakeLoanDto } from "./dto/loan.dto";
import { nextAvailableSeat } from "./game-seating";
import {
  gameTimeline,
  pauseGameTimeline,
  resumeGameTimeline,
  startGameTimeline
} from "./game-timeline";
import {
  isRentalRealEstateAsset,
  marketAssetMatchesTarget,
  marketRuleSalePriceCents,
  originalMarketRule,
  type MarketAssetTarget,
  type MarketRule
} from "./market-sale";
import {
  contiguousNetworkMarketingLevel,
  networkMarketingLevelDecision
} from "./network-marketing";

type Tx = Prisma.TransactionClient;

const cardTypeLabels: Record<CardType, string> = {
  SMALL_DEAL: "малая сделка",
  BIG_DEAL: "крупная сделка",
  MARKET: "рынок",
  DOODAD: "всякая всячина",
  FAST_TRACK: "сделка Скоростной дорожки",
  DREAM: "мечта"
};

function cardTypeLabel(cardType: CardType) {
  return cardTypeLabels[cardType];
}

interface PendingEvent {
  type: string;
  payload: Record<string, unknown>;
  gamePlayerId?: string | null;
}

type CardWithRules = {
  id: number;
  slug: string;
  cardType: CardType;
  title: string;
  bodyText: string;
  category: string | null;
  subcategory: string | null;
  meta: Array<{ metaKey: string; metaValue: string }>;
  effects: Array<{
    effectType: string;
    amountCents: bigint | number | null;
    payload: Prisma.JsonValue;
  }>;
  conditions: Array<{ condType: string; payload: Prisma.JsonValue }>;
};

type MarketSaleOfferState = {
  gamePlayerId: string;
  assetId: string;
  assetName: string;
  salePriceCents: number;
  mortgageCents: number;
  proceedsCents: number;
  cashflowCents: number;
  netCashflowChangeCents: number;
  cashflowAdjustmentCents: number;
};

type GamePendingAction =
  | {
      type: "choose_deal";
      gamePlayerId: string;
    }
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
      title: string;
      symbol: string;
      salePriceCents: number;
      sellerGamePlayerIds: string[];
      resolvedGamePlayerIds: string[];
    }
  | {
      type: "charity_choice";
      gamePlayerId: string;
      donationCents: number;
      turns: number;
    }
  | {
      type: "doodad_payment_choice";
      gamePlayerId: string;
      cardId: number;
      title: string;
      cashPriceCents: number;
      creditBalanceCents: number;
      creditPaymentCents: number;
    }
  | {
      type: "market_sale";
      gamePlayerId: string;
      cardId: number;
      title: string;
      assetId: string;
      assetName: string;
      salePriceCents: number;
      mortgageCents: number;
      proceedsCents: number;
      cashflowCents: number;
      netCashflowChangeCents: number;
      cashflowAdjustmentCents: number;
      offerNumber: number;
      totalOffers: number;
      remainingOffers: MarketSaleOfferState[];
    };

interface GameSettings {
  pendingAction?: GamePendingAction | null;
  timeLimitMinutes?: number;
  periodCount?: number;
  currentPeriod?: number;
  periodDeadlineAt?: string | null;
  remainingPeriodSeconds?: number | null;
  pauseReason?: "manual" | "period_complete" | null;
  pausedAt?: string | null;
  cardDecks?: Partial<Record<CardType, CardDeckState>>;
}

interface CardDeckState {
  drawPile: number[];
  discardPile: number[];
  deckSize: number;
}

interface CardDrawState {
  cardId: number;
  deckPosition: number;
  reshuffled: boolean;
  remainingInDeck: number;
}

interface CardDeckDrawResult {
  card: CardWithRules & { isActive: boolean };
  settings: Prisma.JsonValue;
  drawState: CardDrawState;
}

const playerColors = [
  "#166534",
  "#b45309",
  "#991b1b",
  "#0f766e",
  "#7c2d12",
  "#3f3f46"
];

const botActorPrefix = "bot:";
const botNames = ["Марина", "Алексей", "София"];
const preferredBotFigurines = ["robot", "detective", "owl"];

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  botActorId(gamePlayerId: string) {
    return `${botActorPrefix}${gamePlayerId}`;
  }

  async createGame(userId: string, dto: CreateGameDto) {
    const creator = await this.ensureHostOrAdmin(userId);
    if (dto.cardSetId && creator.role !== SystemRole.ADMIN) {
      throw new ForbiddenException("Выбирать набор карточек может только администратор");
    }
    const cardSet = await this.requirePlayableCardSet(
      creator.role === SystemRole.ADMIN ? dto.cardSetId : undefined
    );
    const cardDecks = await this.initialCardDecks(this.prisma, cardSet.id);

    const code = await this.generateGameCode();
    const game = await this.prisma.game.create({
      data: {
        code,
        title: dto.title?.trim() || "Новая партия",
        mode: GameMode.MULTIPLAYER,
        maxPlayers: null,
        cardSetId: cardSet.id,
        settings: {
          timeLimitMinutes: dto.timeLimitMinutes ?? 90,
          periodCount: dto.periodCount ?? 1,
          cardDecks
        } as unknown as Prisma.InputJsonValue,
        createdById: userId,
        players: {
          create: {
            userId,
            role: GameRole.HOST,
            seat: null,
            color: null,
            isReady: true,
            position: -1
          }
        }
      }
    });

    await this.prisma.gameEvent.create({
      data: {
        gameId: game.id,
        actorUserId: userId,
        type: "game:created",
        sequence: 1,
        payload: toSerializable({
          code: game.code,
          title: game.title,
          cardSetId: cardSet.id,
          cardSetName: cardSet.name
        })
      }
    });

    return this.getGame(game.id, userId);
  }

  async getInviteMetadata(code: string) {
    const normalizedCode = code.replace(/\s+/g, "").toUpperCase();
    if (!normalizedCode) throw new NotFoundException("Игра не найдена");

    const game = await this.prisma.game.findFirst({
      where: {
        code: normalizedCode,
        mode: GameMode.MULTIPLAYER,
        status: { not: GameStatus.CANCELLED }
      },
      select: {
        title: true,
        createdBy: { select: { displayName: true } }
      }
    });
    if (!game) throw new NotFoundException("Игра не найдена");

    return {
      title: game.title,
      hostName: game.createdBy?.displayName ?? null
    };
  }

  async createSoloGame(userId: string, dto: CreateSoloGameDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { status: true, figurine: true }
    });
    if (user.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException("Одиночная игра доступна только активным пользователям");
    }

    const botCount = dto.botCount;
    const cardSet = await this.requirePlayableCardSet();
    const cardDecks = await this.initialCardDecks(this.prisma, cardSet.id);
    const code = await this.generateGameCode();
    const occupiedFigurines = new Set<string>();
    if (user.figurine && isFigurineId(user.figurine)) {
      occupiedFigurines.add(user.figurine);
    }
    const availableFigurines = figurines
      .map((figurine) => figurine.id)
      .filter((figurine) => !occupiedFigurines.has(figurine));
    const botFigurines = preferredBotFigurines.slice(0, botCount).map((preferred, index) => {
      const figurine = !occupiedFigurines.has(preferred)
        ? preferred
        : availableFigurines.find((candidate) => !occupiedFigurines.has(candidate));
      if (!figurine) {
        throw new BadRequestException("Не хватает свободных фигурок для ботов");
      }
      occupiedFigurines.add(figurine);
      return { figurine, index };
    });

    const game = await this.prisma.game.create({
      data: {
        code,
        title: dto.title?.trim() || "Одиночное путешествие",
        mode: GameMode.SOLO,
        maxPlayers: botCount + 1,
        cardSetId: cardSet.id,
        settings: {
          timeLimitMinutes: dto.timeLimitMinutes ?? 90,
          periodCount: 1,
          cardDecks
        } as unknown as Prisma.InputJsonValue,
        createdById: userId,
        players: {
          create: [
            {
              userId,
              role: GameRole.PLAYER,
              controller: PlayerController.HUMAN,
              seat: 1,
              color: playerColors[0] ?? null,
              figurine: user.figurine && isFigurineId(user.figurine)
                ? user.figurine
                : null,
              isReady: Boolean(user.figurine && isFigurineId(user.figurine)),
              position: -1
            },
            ...botFigurines.map(({ figurine, index }) => ({
              guestName: botNames[index] ?? `Бот ${index + 1}`,
              role: GameRole.PLAYER,
              controller: PlayerController.BOT,
              botStrategy: "balanced_v1",
              seat: index + 2,
              color: playerColors[index + 1] ?? null,
              figurine,
              isReady: true,
              position: -1
            }))
          ]
        }
      }
    });

    await this.prisma.gameEvent.create({
      data: {
        gameId: game.id,
        actorUserId: userId,
        type: "game:created",
        sequence: 1,
        payload: toSerializable({
          code: game.code,
          title: game.title,
          mode: GameMode.SOLO,
          botCount
        })
      }
    });

    return this.getGame(game.id, userId);
  }

  async listGames(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true }
    });
    const canSeeAll = user.role === SystemRole.ADMIN;

    const mineWhere: Prisma.GameWhereInput = {
      status: { not: GameStatus.CANCELLED }
    };
    if (!canSeeAll) {
      mineWhere.OR = [{ createdById: userId }, { players: { some: { userId } } }];
    }

    const [mine, open] = await Promise.all([
      this.prisma.game.findMany({
        where: mineWhere,
        include: {
          cardSet: { select: { id: true, name: true } },
          players: {
            include: {
              user: { select: { id: true, displayName: true, email: true } }
            },
            orderBy: { seat: "asc" }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      }),
      this.prisma.game.findMany({
        where: {
          status: GameStatus.WAITING,
          mode: GameMode.MULTIPLAYER,
          ...(canSeeAll
            ? {}
            : {
                players: {
                  none: { userId }
                }
              })
        },
        include: {
          cardSet: { select: { id: true, name: true } },
          players: {
            include: {
              user: { select: { id: true, displayName: true, email: true } }
            },
            orderBy: { seat: "asc" }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

    return toSerializable({ mine, open });
  }

  async getGame(gameId: string, userId: string) {
    await this.ensureGameAccess(gameId, userId);
    await this.syncGameTimelineIfNeeded(gameId);
    return this.snapshot(gameId);
  }

  async joinGame(userId: string, dto: JoinGameDto) {
    const codeOrId = dto.codeOrId.trim();
    if (!codeOrId) throw new BadRequestException("Укажите код игры");
    const normalizedCode = codeOrId.replace(/\s+/g, "").toUpperCase();
    const gameSearch: Prisma.GameWhereInput[] = [{ code: normalizedCode }];
    if (isUuid(codeOrId)) {
      gameSearch.push({ id: codeOrId });
    }

    const game = await this.prisma.game.findFirst({
      where: {
        OR: gameSearch
      },
      include: { players: true }
    });
    if (!game) throw new NotFoundException("Игра не найдена");
    if (game.mode === GameMode.SOLO) {
      throw new ForbiddenException("К одиночной партии нельзя присоединиться по коду");
    }
    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException("Присоединиться можно только до начала игры");
    }

    const existing = game.players.find((player) => player.userId === userId);
    if (existing) return this.snapshot(game.id);

    const role = dto.role ?? "PLAYER";
    const occupiedSeats = new Set(
      game.players
        .map((player) => player.seat)
        .filter((seat): seat is number => typeof seat === "number")
    );
    const seat: number | null =
      role === "PLAYER" ? nextAvailableSeat(occupiedSeats) : null;
    const color = seat
      ? playerColors[(seat - 1) % playerColors.length] ?? null
      : null;

    await this.prisma.$transaction(async (tx) => {
      const player = await tx.gamePlayer.create({
        data: {
          gameId: game.id,
          userId,
          role,
          seat,
          color,
          isReady: role !== "PLAYER",
          position: -1
        }
      });
      await this.appendEvents(tx, game.id, userId, [
        {
          type: "player:joined",
          gamePlayerId: player.id,
          payload: { role, seat }
        }
      ]);
    });

    return this.snapshot(game.id);
  }

  async addUserToGame(gameId: string, actorUserId: string, dto: AddGameUserDto) {
    if (!dto.userId && !dto.email) {
      throw new BadRequestException("Укажите пользователя или его электронную почту");
    }
    if (dto.role === GameRole.HOST) {
      throw new BadRequestException("Роль ведущего доступна только создателю игры");
    }

    await this.ensureCanManageGame(gameId, actorUserId);

    const targetWhere: Prisma.UserWhereInput = {
      status: AccountStatus.ACTIVE
    };
    if (dto.userId) {
      targetWhere.id = dto.userId;
    } else if (dto.email) {
      targetWhere.email = dto.email.toLowerCase();
    }

    const targetUser = await this.prisma.user.findFirst({
      where: targetWhere,
      select: { id: true, email: true, displayName: true }
    });
    if (!targetUser) throw new NotFoundException("Активный пользователь не найден");

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: { players: true }
      });
      if (game.mode === GameMode.SOLO) {
        throw new BadRequestException("В одиночную партию нельзя добавлять участников");
      }
      if (game.status !== GameStatus.WAITING) {
        throw new BadRequestException("Добавлять участников можно только до начала игры");
      }

      const existing = game.players.find(
        (player) => player.userId === targetUser.id
      );
      if (existing) return;

      const occupiedSeats = new Set(
        game.players
          .map((player) => player.seat)
          .filter((seat): seat is number => typeof seat === "number")
      );
      const seat =
        dto.role === GameRole.PLAYER ? nextAvailableSeat(occupiedSeats) : null;
      const color = seat
        ? playerColors[(seat - 1) % playerColors.length] ?? null
        : null;

      const player = await tx.gamePlayer.create({
        data: {
          gameId,
          userId: targetUser.id,
          role: dto.role,
          seat,
          color,
          isReady: dto.role !== GameRole.PLAYER,
          position: -1
        }
      });

      await this.appendEvents(tx, gameId, actorUserId, [
        {
          type: "player:added",
          gamePlayerId: player.id,
          payload: {
            userId: targetUser.id,
            email: targetUser.email,
            displayName: targetUser.displayName,
            role: dto.role,
            seat
          }
        },
        {
          type: realtimeEvents.stateUpdate,
          payload: { reason: "player_added" }
        }
      ]);
    });

    return this.actionResult(gameId, [
      { type: "player:added", payload: { userId: targetUser.id, role: dto.role } },
      { type: realtimeEvents.stateUpdate, payload: {} }
    ]);
  }

  async searchUsersForGame(gameId: string, actorUserId: string, rawQuery: string) {
    await this.ensureCanManageGame(gameId, actorUserId);

    const query = rawQuery.trim();
    if (query.length < 2) return [];

    const game = await this.prisma.game.findUniqueOrThrow({
      where: { id: gameId },
      select: { mode: true, players: { select: { userId: true } } }
    });
    if (game.mode === GameMode.SOLO) return [];
    const existingUserIds = game.players
      .map((player) => player.userId)
      .filter((userId): userId is string => Boolean(userId));

    return this.prisma.user.findMany({
      where: {
        status: AccountStatus.ACTIVE,
        id: { notIn: existingUserIds },
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } }
        ]
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
      take: 8,
      select: { id: true, displayName: true, email: true }
    });
  }

  async deleteGame(gameId: string, actorUserId: string) {
    await this.ensureCanManageGame(gameId, actorUserId);

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status === GameStatus.CANCELLED) return;

      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.CANCELLED,
          endedAt: new Date()
        }
      });

      await this.appendEvents(tx, gameId, actorUserId, [
        {
          type: "game:deleted",
          payload: { previousStatus: game.status }
        },
        {
          type: realtimeEvents.stateUpdate,
          payload: { reason: "game_deleted" }
        }
      ]);
    });

    return this.actionResult(gameId, [
      { type: "game:deleted", payload: {} },
      { type: realtimeEvents.stateUpdate, payload: {} }
    ]);
  }

  async startGame(gameId: string, userId: string) {
    await this.ensureCanManageGame(gameId, userId);

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });

      if (game.status !== GameStatus.WAITING) {
        throw new BadRequestException("Игра уже началась");
      }
      if (game.players.length < 2) {
        throw new BadRequestException("Для начала игры нужно не менее двух игроков");
      }
      if (game.players.some((player) => !player.figurine)) {
        throw new BadRequestException("Все игроки должны выбрать фигурки");
      }

      const professions = await tx.profession.findMany({
        where: { isActive: true },
        orderBy: { id: "asc" }
      });
      if (professions.length === 0) {
        throw new BadRequestException("Для начала игры нужна хотя бы одна активная профессия");
      }

      const shuffledProfessions = [...professions].sort(() => Math.random() - 0.5);

      for (const [index, player] of game.players.entries()) {
        const profession = shuffledProfessions[index % shuffledProfessions.length];
        if (!profession) continue;
        await tx.gamePlayer.update({
          where: { id: player.id },
          data: {
            professionId: profession.id,
            position: -1,
            track: BoardTrack.RAT_RACE
          }
        });
        await this.createInitialFinancialState(tx, player.id, profession);
      }

      const startedAt = new Date();
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.IN_PROGRESS,
          startedAt,
          endedAt: null,
          currentTurnIndex: 0,
          currentRound: 1,
          settings: startGameTimeline(game.settings, startedAt)
        }
      });

      const timeline = gameTimeline(game.settings, null);

      await this.appendEvents(tx, gameId, userId, [
        {
          type: "game:started",
          payload: {
            playerCount: game.players.length,
            timeLimitMinutes: timeline.timeLimitMinutes,
            periodCount: timeline.periodCount
          }
        },
        {
          type: realtimeEvents.gamePeriodStarted,
          payload: { currentPeriod: 1, periodCount: timeline.periodCount }
        },
        {
          type: realtimeEvents.stateUpdate,
          payload: { reason: "game_started" }
        }
      ]);
    });

    return this.actionResult(gameId, [
      { type: "game:started", payload: {} },
      { type: realtimeEvents.gamePeriodStarted, payload: { currentPeriod: 1 } },
      { type: realtimeEvents.stateUpdate, payload: {} }
    ]);
  }

  async pauseGame(gameId: string, userId: string) {
    await this.ensureCanManageGame(gameId, userId);
    const timelineEvents = await this.syncGameTimelineIfNeeded(gameId);
    if (timelineEvents) return this.actionResult(gameId, timelineEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status === GameStatus.PAUSED) return;
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException("Поставить на паузу можно только идущую игру");
      }

      const now = new Date();
      const timeline = gameTimeline(game.settings, game.startedAt);
      const update = await tx.game.updateMany({
        where: { id: gameId, status: GameStatus.IN_PROGRESS },
        data: {
          status: GameStatus.PAUSED,
          settings: pauseGameTimeline(game.settings, game.startedAt, now, "manual")
        }
      });
      if (update.count === 0) return;
      emittedEvents.push({
        type: realtimeEvents.gamePaused,
        payload: {
          reason: "manual",
          currentPeriod: timeline.currentPeriod,
          periodCount: timeline.periodCount
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "game_paused" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async resumeGame(gameId: string, userId: string) {
    await this.ensureCanManageGame(gameId, userId);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status === GameStatus.IN_PROGRESS) return;
      if (game.status !== GameStatus.PAUSED) {
        throw new BadRequestException("Продолжить можно только игру на паузе");
      }

      const resumed = resumeGameTimeline(game.settings, game.startedAt, new Date());
      const timeline = gameTimeline(resumed.settings, game.startedAt);
      const update = await tx.game.updateMany({
        where: { id: gameId, status: GameStatus.PAUSED },
        data: {
          status: GameStatus.IN_PROGRESS,
          settings: resumed.settings
        }
      });
      if (update.count === 0) return;
      emittedEvents.push({
        type: realtimeEvents.gameResumed,
        payload: {
          currentPeriod: timeline.currentPeriod,
          periodCount: timeline.periodCount,
          startsNextPeriod: resumed.startsNextPeriod
        }
      });
      if (resumed.startsNextPeriod) {
        emittedEvents.push({
          type: realtimeEvents.gamePeriodStarted,
          payload: {
            currentPeriod: timeline.currentPeriod,
            periodCount: timeline.periodCount
          }
        });
      }
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: resumed.startsNextPeriod ? "period_started" : "game_resumed" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async syncGameTimer(gameId: string, userId: string) {
    await this.ensureGameAccess(gameId, userId);
    const events = await this.syncGameTimelineIfNeeded(gameId);
    return this.actionResult(gameId, events ?? []);
  }

  async chooseFigurine(gameId: string, userId: string, figurine: string) {
    if (!isFigurineId(figurine)) {
      throw new BadRequestException("Такая фигурка недоступна");
    }

    const membership = await this.prisma.gamePlayer.findFirst({
      where: {
        gameId,
        userId,
        role: GameRole.PLAYER,
        status: GamePlayerStatus.JOINED
      },
      include: { game: { select: { status: true } } }
    });
    if (!membership) throw new ForbiddenException("Вы не участвуете в этой игре");
    if (membership.game.status !== GameStatus.WAITING) {
      throw new BadRequestException("Изменить фигурку можно только до начала игры");
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.gamePlayer.update({
          where: { id: membership.id },
          data: { figurine, isReady: true }
        });
        await this.appendEvents(tx, gameId, userId, [
          {
            type: "player:figurine_selected",
            gamePlayerId: membership.id,
            payload: { figurine }
          },
          {
            type: realtimeEvents.stateUpdate,
            payload: { reason: "figurine_selected" }
          }
        ]);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Эту фигурку уже выбрал другой игрок");
      }
      throw error;
    }

    return this.actionResult(gameId, [
      { type: "player:figurine_selected", payload: { figurine } },
      { type: realtimeEvents.stateUpdate, payload: {} }
    ]);
  }

  async updateHostParticipation(
    gameId: string,
    userId: string,
    participates: boolean
  ) {
    await this.ensureCanManageGame(gameId, userId);

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: { players: true }
      });
      if (game.mode === GameMode.SOLO) {
        throw new BadRequestException("В одиночной партии участие владельца фиксировано");
      }
      if (game.createdById !== userId) {
        throw new ForbiddenException("Только создатель игры может изменить своё участие");
      }
      if (game.status !== GameStatus.WAITING) {
        throw new BadRequestException("Изменить участие можно только до начала игры");
      }

      const host = game.players.find((player) => player.userId === userId);
      if (!host) throw new ForbiddenException("Создатель игры не найден среди участников");
      const nextRole = participates ? GameRole.PLAYER : GameRole.HOST;
      if (host.role === nextRole) return;
      if (host.role !== GameRole.HOST && host.role !== GameRole.PLAYER) {
        throw new BadRequestException("У создателя игры недопустимая роль");
      }

      let seat: number | null = null;
      let color: string | null = null;
      if (participates) {
        const currentPlayers = game.players.filter(
          (player) => player.role === GameRole.PLAYER && player.status === "JOINED"
        );
        const occupiedSeats = new Set(
          currentPlayers
            .map((player) => player.seat)
            .filter((value): value is number => typeof value === "number")
        );
        seat = nextAvailableSeat(occupiedSeats);
        color = seat ? playerColors[(seat - 1) % playerColors.length] ?? null : null;
      }

      await tx.gamePlayer.update({
        where: { id: host.id },
        data: {
          role: nextRole,
          seat,
          color,
          isReady: !participates,
          figurine: null,
          position: -1
        }
      });
      await this.appendEvents(tx, gameId, userId, [
        {
          type: "host:participation_changed",
          gamePlayerId: host.id,
          payload: { participates, role: nextRole, seat }
        }
      ]);
    });

    return this.actionResult(gameId, [
      { type: "host:participation_changed", payload: { participates } },
      { type: realtimeEvents.stateUpdate, payload: {} }
    ]);
  }

  async rollDice(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            include: { financialState: true },
            orderBy: { seat: "asc" }
          }
        }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException("Игра сейчас не идёт");
      }
      if (this.pendingAction(game.settings)) {
        throw new BadRequestException("Текущий игрок должен завершить обязательное действие");
      }
      if (game.players.length === 0) {
        throw new BadRequestException("В игре нет активных игроков");
      }

      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (!currentPlayer || !this.playerControlledBy(currentPlayer, userId)) {
        throw new ForbiddenException("Сейчас ход другого игрока");
      }
      if (!currentPlayer.financialState) {
        throw new BadRequestException("Финансовый отчёт ещё не подготовлен");
      }

      if (
        currentPlayer.financialState.bankruptcyStatus === BankruptcyStatus.LIQUIDATING
      ) {
        throw new BadRequestException("Завершите процедуру банкротства перед броском кубика");
      }

      if (currentPlayer.financialState.bankruptcyTurns > 0) {
        const remaining = currentPlayer.financialState.bankruptcyTurns - 1;
        await tx.playerFinancialState.update({
          where: { gamePlayerId: currentPlayer.id },
          data: {
            bankruptcyTurns: { decrement: 1 },
            ...(remaining === 0 ? { bankruptcyStatus: BankruptcyStatus.NONE } : {})
          }
        });
        await this.advanceTurn(tx, game, activeIndex);
        emittedEvents.push({
          type: "bankruptcy:turn_skipped",
          gamePlayerId: currentPlayer.id,
          payload: { turnsRemaining: remaining }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "bankruptcy_turn_skipped" }
        });
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }

      if (currentPlayer.financialState.downsizedTurns > 0) {
        await tx.playerFinancialState.update({
          where: { gamePlayerId: currentPlayer.id },
          data: { downsizedTurns: { decrement: 1 } }
        });
        await this.advanceTurn(tx, game, activeIndex);
        emittedEvents.push({
          type: "turn:skipped",
          gamePlayerId: currentPlayer.id,
          payload: { reason: "downsized" }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "turn_skipped" }
        });
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }

      const charityDiceActive = currentPlayer.financialState.charityTurns > 0;
      const diceValues = charityDiceActive ? [rollDie(), rollDie()] : [rollDie()];
      const dice = diceValues.reduce((sum, value) => sum + value, 0);
      const move = moveOnCircularTrack(currentPlayer.position, dice);
      const cell = ratRaceBoard[move.to];

      if (charityDiceActive) {
        await tx.playerFinancialState.update({
          where: { gamePlayerId: currentPlayer.id },
          data: { charityTurns: { decrement: 1 } }
        });
      }

      await tx.gamePlayer.update({
        where: { id: currentPlayer.id },
        data: {
          position: move.to,
          lastTurnAt: new Date()
        }
      });

      emittedEvents.push({
        type: realtimeEvents.playerRollDice,
        gamePlayerId: currentPlayer.id,
        payload: {
          dice,
          diceValues,
          diceCount: diceValues.length,
          ...(charityDiceActive
            ? { charityTurnsRemaining: currentPlayer.financialState.charityTurns - 1 }
            : {})
        }
      });
      emittedEvents.push({
        type: realtimeEvents.playerMove,
        gamePlayerId: currentPlayer.id,
        payload: {
          from: move.from,
          to: move.to,
          steps: move.steps,
          cell
        }
      });

      const paycheckCells = this.ratRaceCellsForMove(move.from, move.steps).filter(
        (candidate) => candidate.type === "paycheck"
      );
      if (paycheckCells.length > 0) {
        const paycheck = currentPlayer.financialState.monthlyCashflowCents;
        const paycheckTotal = paycheck * BigInt(paycheckCells.length);
        const beforeCash = currentPlayer.financialState.cashCents;
        const updatedState = await tx.playerFinancialState.update({
          where: { gamePlayerId: currentPlayer.id },
          data: {
            cashCents: {
              increment: paycheckTotal
            },
            paycheckCount: { increment: paycheckCells.length }
          },
          select: { cashCents: true, paycheckCount: true }
        });
        emittedEvents.push({
          type: realtimeEvents.paycheckReceive,
          gamePlayerId: currentPlayer.id,
          payload: {
            amountCents: cents(paycheckTotal),
            cashflowCents: cents(paycheck),
            beforeCashCents: cents(beforeCash),
            afterCashCents: cents(updatedState.cashCents),
            paycheckCount: updatedState.paycheckCount,
            paycheckHits: paycheckCells.length,
            paycheckCells: paycheckCells.map((paycheckCell) => paycheckCell.index),
            reason: cell?.type === "paycheck" ? "landed_on_paycheck" : "passed_paycheck"
          }
        });
      }

      let pendingCellAction = false;
      if (cell) {
        pendingCellAction = await this.resolveCell(
          tx,
          game.id,
          game.settings,
          currentPlayer.id,
          cell.type,
          emittedEvents
        );
      }

      await this.recalculatePlayer(tx, currentPlayer.id, emittedEvents);
      const currentPlayerStatus = await tx.gamePlayer.findUniqueOrThrow({
        where: { id: currentPlayer.id },
        select: { status: true }
      });
      if (currentPlayerStatus.status !== GamePlayerStatus.JOINED) {
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      const gameWon = await this.checkAnyGameWon(tx, gameId, emittedEvents);
      if (gameWon) {
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      if (pendingCellAction) {
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      if (cell?.type === "deal") {
        await tx.game.update({
          where: { id: gameId },
          data: {
            settings: this.settingsWithPending(game.settings, {
              type: "choose_deal",
              gamePlayerId: currentPlayer.id
            })
          }
        });
        emittedEvents.push({
          type: "deal:choice_required",
          gamePlayerId: currentPlayer.id,
          payload: {}
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "deal_choice_required" }
        });
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "roll_resolved" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async skipTurn(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            include: { financialState: true },
            orderBy: { seat: "asc" }
          }
        }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException("Игра сейчас не идёт");
      }
      if (this.pendingAction(game.settings)) {
        throw new BadRequestException("Текущий игрок должен завершить обязательное действие");
      }
      if (game.players.length === 0) {
        throw new BadRequestException("В игре нет активных игроков");
      }

      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (!currentPlayer || !this.playerControlledBy(currentPlayer, userId)) {
        throw new ForbiddenException("Сейчас ход другого игрока");
      }
      if (
        currentPlayer.financialState?.bankruptcyStatus === BankruptcyStatus.LIQUIDATING
      ) {
        throw new BadRequestException("Завершите процедуру банкротства перед пропуском хода");
      }

      await tx.gamePlayer.update({
        where: { id: currentPlayer.id },
        data: { lastTurnAt: new Date() }
      });
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: "turn:skipped",
        gamePlayerId: currentPlayer.id,
        payload: { reason: "player_choice" }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "turn_skipped" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async drawCard(gameId: string, userId: string, dto: DrawCardDto) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      const isDealChoice =
        dto.cardType === CardType.SMALL_DEAL || dto.cardType === CardType.BIG_DEAL;
      const activeIndex = game.players.length > 0 ? game.currentTurnIndex % game.players.length : null;
      const currentPlayer = activeIndex === null ? null : game.players[activeIndex];

      if (isDealChoice) {
        if (
          !currentPlayer ||
          currentPlayer.id !== player.id ||
          pending?.type !== "choose_deal" ||
          pending.gamePlayerId !== player.id
        ) {
          throw new ForbiddenException("Выбрать сделку можно только на клетке «Возможность»");
        }
      } else if (!currentPlayer || currentPlayer.id !== player.id) {
        throw new ForbiddenException("Взять карточку можно только в свой ход");
      } else if (pending) {
        throw new BadRequestException("Текущий игрок должен завершить обязательное действие");
      }

      const draw = await this.drawCardFromDeck(
        tx,
        gameId,
        game.settings,
        dto.cardType
      );
      const { card } = draw;
      const gameSettings = draw.settings;
      emittedEvents.push({
        type: realtimeEvents.cardDraw,
        gamePlayerId: player.id,
        payload: this.cardPayload(card, draw.drawState)
      });
      const networkMarketingCard = this.networkMarketingCard(card);
      if (isDealChoice && networkMarketingCard) {
        const applied = await this.applyNetworkMarketingCard(
          tx,
          player.id,
          card,
          networkMarketingCard,
          emittedEvents
        );
        if (applied) {
          await this.recalculatePlayer(tx, player.id, emittedEvents);
          const gameWon = await this.checkGameWon(tx, player.id, emittedEvents);
          if (gameWon) {
            await this.appendEvents(tx, gameId, userId, emittedEvents);
            return;
          }
        }
        await tx.game.update({
          where: { id: gameId },
          data: { settings: this.settingsWithPending(gameSettings, null) }
        });
        if (activeIndex !== null) {
          await this.advanceTurn(tx, game, activeIndex);
        }
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "network_marketing_resolved_turn_ended" }
        });
      } else if (isDealChoice && this.hasAutomaticCardEffects(card)) {
        const affectedPlayerIds = await this.applyAutomaticCardEffects(
          tx,
          gameId,
          player.id,
          card,
          emittedEvents
        );
        for (const affectedPlayerId of affectedPlayerIds) {
          await this.recalculatePlayer(tx, affectedPlayerId, emittedEvents);
        }
        const gameWon = await this.checkAnyGameWon(tx, gameId, emittedEvents);
        if (gameWon) {
          await this.appendEvents(tx, gameId, userId, emittedEvents);
          return;
        }
        await tx.game.update({
          where: { id: gameId },
          data: { settings: this.settingsWithPending(gameSettings, null) }
        });
        if (activeIndex !== null) {
          await this.advanceTurn(tx, game, activeIndex);
        }
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "automatic_card_resolved_turn_ended" }
        });
      } else if (isDealChoice) {
        const meta = this.metaMap(card.meta);
        const stockDeal = this.isStockDeal(card, meta);
        const symbol = this.stockSymbol(card, meta);
        const salePriceCents = this.dealUnitPriceCents(card, meta, stockDeal);
        const sellerGamePlayerIds =
          stockDeal && symbol
            ? await this.stockSellerGamePlayerIds(tx, gameId, symbol)
            : [];
        await tx.game.update({
          where: { id: gameId },
          data: {
            settings: this.settingsWithPending(
              gameSettings,
              stockDeal && symbol && salePriceCents > 0n && sellerGamePlayerIds.length > 0
                ? {
                    type: "stock_sale_window",
                    gamePlayerId: player.id,
                    cardId: card.id,
                    cardType: card.cardType as "SMALL_DEAL" | "BIG_DEAL",
                    title: card.title,
                    symbol,
                    salePriceCents: Number(salePriceCents),
                    sellerGamePlayerIds,
                    resolvedGamePlayerIds: []
                  }
                : {
                    type: "deal_card_drawn",
                    gamePlayerId: player.id,
                    cardId: card.id,
                    cardType: card.cardType as "SMALL_DEAL" | "BIG_DEAL"
                  }
            )
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "deal_card_drawn" }
        });
      } else if (card.cardType === CardType.MARKET) {
        await this.resolveMarketCard(
          tx,
          gameId,
          gameSettings,
          player.id,
          card,
          emittedEvents
        );
      }
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async buyDeal(gameId: string, userId: string, dto: BuyDealDto) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        (pending?.type !== "deal_card_drawn" && pending?.type !== "stock_sale_window") ||
        pending.gamePlayerId !== player.id ||
        pending.cardId !== dto.cardId
      ) {
        throw new ForbiddenException("Эта сделка сейчас недоступна");
      }
      if (pending.type === "stock_sale_window" && !this.stockSaleWindowResolved(pending)) {
        throw new BadRequestException("Сначала остальные игроки должны решить, продавать ли акции");
      }
      const card = await tx.card.findUnique({
        where: { id: dto.cardId },
        include: { meta: true, effects: true, conditions: true }
      });
      if (!card) throw new NotFoundException("Карточка не найдена");
      const buyableCardTypes: CardType[] = [
        CardType.SMALL_DEAL,
        CardType.BIG_DEAL,
        CardType.FAST_TRACK
      ];
      if (!buyableCardTypes.includes(card.cardType)) {
        throw new BadRequestException("Эту карточку нельзя купить");
      }
      const networkMarketingCard = this.networkMarketingCard(card);
      if (networkMarketingCard) {
        const applied = await this.applyNetworkMarketingCard(
          tx,
          player.id,
          card,
          networkMarketingCard,
          emittedEvents
        );
        if (applied) {
          await this.recalculatePlayer(tx, player.id, emittedEvents);
          const gameWon = await this.checkGameWon(tx, player.id, emittedEvents);
          if (gameWon) {
            await this.appendEvents(tx, gameId, userId, emittedEvents);
            return;
          }
        }
        await tx.game.update({
          where: { id: gameId },
          data: { settings: this.settingsWithPending(game.settings, null) }
        });
        await this.advanceTurn(tx, game, activeIndex);
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "network_marketing_resolved_turn_ended" }
        });
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      if (this.hasAutomaticCardEffects(card)) {
        throw new BadRequestException("Эта карточка применяется автоматически");
      }

      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      const quantity = dto.quantity ?? 1;
      const meta = this.metaMap(card.meta);
      const cashEffectAmount = this.buyableCardActionAmount(
        card.effects,
        cardActionTypes.cashAdjust
      );
      const cashflowEffectAmount = this.buyableCardActionAmount(
        card.effects,
        cardActionTypes.cashflowAdjust
      );
      const stockDeal = this.isStockDeal(card, meta);
      const unitPriceCents = this.dealUnitPriceCents(card, meta, stockDeal);
      const downPaymentCents =
        cashEffectAmount !== null
          ? BigInt(Math.abs(cents(cashEffectAmount)))
          : stockDeal
            ? unitPriceCents
            : BigInt(dealDownPaymentAmount(meta, Number(unitPriceCents)));
      const cashflowCents =
        cashflowEffectAmount ?? BigInt(Math.round(Number(meta.cashflow_monthly ?? "0")));
      const assetSymbol = stockDeal ? this.stockSymbol(card, meta) : meta.symbol;
      const totalDownPayment = downPaymentCents * BigInt(quantity);
      const beforeCashCents = state.cashCents;
      const afterCashCents = beforeCashCents - totalDownPayment;

      if (state.cashCents < totalDownPayment) {
        throw new BadRequestException("Не хватает наличных на первоначальный взнос");
      }

      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: {
          cashCents: {
            decrement: totalDownPayment
          }
        }
      });
      await tx.playerAsset.create({
        data: {
          gamePlayerId: player.id,
          sourceCardId: card.id,
          type: card.category ?? card.cardType.toLowerCase(),
          name: card.title,
          symbol: assetSymbol ?? null,
          quantity,
          units: quantity,
          costBasisCents: unitPriceCents * BigInt(quantity),
          marketValueCents: unitPriceCents * BigInt(quantity),
          downPaymentCents: totalDownPayment,
          cashflowCents: cashflowCents * BigInt(quantity)
        }
      });

      await this.recalculatePlayer(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: realtimeEvents.dealBuy,
        gamePlayerId: player.id,
        payload: {
          cardId: card.id,
          title: card.title,
          quantity,
          downPaymentCents: Number(totalDownPayment),
          beforeCashCents: cents(beforeCashCents),
          afterCashCents: cents(afterCashCents),
          cashflowCents: Number(cashflowCents * BigInt(quantity))
        }
      });
      const gameWon = await this.checkGameWon(tx, player.id, emittedEvents);
      if (gameWon) {
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      await tx.game.update({
        where: { id: gameId },
        data: { settings: this.settingsWithPending(game.settings, null) }
      });
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "deal_bought_turn_ended" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async declineDeal(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        (pending?.type !== "deal_card_drawn" && pending?.type !== "stock_sale_window") ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("Сейчас нет сделки, требующей вашего решения");
      }
      if (pending.type === "stock_sale_window" && !this.stockSaleWindowResolved(pending)) {
        throw new BadRequestException("Сначала остальные игроки должны решить, продавать ли акции");
      }

      await tx.game.update({
        where: { id: gameId },
        data: { settings: this.settingsWithPending(game.settings, null) }
      });
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: "deal:decline",
        gamePlayerId: player.id,
        payload: {
          cardId: pending.cardId,
          cardType: pending.cardType
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "deal_declined_turn_ended" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async sellStockFromDeal(gameId: string, userId: string, quantity: number) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new ForbiddenException("Продавать акции можно только во время игры");
      }
      const pending = this.pendingAction(game.settings);
      if (pending?.type !== "stock_sale_window") {
        throw new ForbiddenException("Сейчас нет доступного предложения о продаже акций");
      }
      if (!pending.sellerGamePlayerIds.includes(player.id)) {
        throw new ForbiddenException("Эта карточка не даёт вам права продать акции");
      }
      if (pending.resolvedGamePlayerIds.includes(player.id)) {
        throw new BadRequestException("Вы уже приняли решение по этой продаже акций");
      }
      const saleQuantity = Math.floor(quantity);
      if (!Number.isInteger(saleQuantity) || saleQuantity < 1) {
        throw new BadRequestException("Количество должно быть целым числом больше нуля");
      }

      const symbol = pending.symbol.toLowerCase();
      const assets = await tx.playerAsset.findMany({
        where: {
          gamePlayerId: player.id,
          status: AssetStatus.ACTIVE,
          quantity: { gt: 0 }
        },
        orderBy: { createdAt: "asc" }
      });
      const stockAssets = assets.filter(
        (asset) => (asset.symbol ?? "").toLowerCase() === symbol
      );
      const availableQuantity = stockAssets.reduce((sum, asset) => sum + asset.quantity, 0);
      if (availableQuantity < saleQuantity) {
        throw new BadRequestException("Не хватает акций для продажи");
      }

      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      let remainingToSell = saleQuantity;
      let removedCashflowCents = 0n;
      let removedCostBasisCents = 0n;
      let removedMarketValueCents = 0n;
      let removedDownPaymentCents = 0n;

      for (const asset of stockAssets) {
        if (remainingToSell <= 0) break;
        const soldFromAsset = Math.min(asset.quantity, remainingToSell);
        const sellAll = soldFromAsset === asset.quantity;
        const removedCost = proportionalAmount(asset.costBasisCents, soldFromAsset, asset.quantity);
        const removedMarket = proportionalAmount(asset.marketValueCents, soldFromAsset, asset.quantity);
        const removedDownPayment = proportionalAmount(asset.downPaymentCents, soldFromAsset, asset.quantity);
        const removedCashflow = proportionalAmount(asset.cashflowCents, soldFromAsset, asset.quantity);

        removedCostBasisCents += removedCost;
        removedMarketValueCents += removedMarket;
        removedDownPaymentCents += removedDownPayment;
        removedCashflowCents += removedCashflow;

        if (sellAll) {
          await tx.playerAsset.update({
            where: { id: asset.id },
            data: {
              quantity: 0,
              units: 0,
              costBasisCents: 0n,
              marketValueCents: 0n,
              downPaymentCents: 0n,
              cashflowCents: 0n,
              status: AssetStatus.SOLD,
              soldAt: new Date()
            }
          });
        } else {
          await tx.playerAsset.update({
            where: { id: asset.id },
            data: {
              quantity: { decrement: soldFromAsset },
              units: { decrement: soldFromAsset },
              costBasisCents: { decrement: removedCost },
              marketValueCents: { decrement: removedMarket },
              downPaymentCents: { decrement: removedDownPayment },
              cashflowCents: { decrement: removedCashflow }
            }
          });
        }
        remainingToSell -= soldFromAsset;
      }

      const proceeds = BigInt(pending.salePriceCents) * BigInt(saleQuantity);
      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: { cashCents: { increment: proceeds } }
      });
      const updatedState = await this.recalculatePlayer(tx, player.id, emittedEvents);

      emittedEvents.push({
        type: realtimeEvents.dealSell,
        gamePlayerId: player.id,
        payload: {
          cardId: pending.cardId,
          title: pending.title,
          assetName: pending.symbol,
          symbol: pending.symbol,
          quantity: saleQuantity,
          salePriceCents: pending.salePriceCents,
          proceedsCents: Number(proceeds),
          removedCostBasisCents: Number(removedCostBasisCents),
          removedMarketValueCents: Number(removedMarketValueCents),
          removedDownPaymentCents: Number(removedDownPaymentCents),
          removedCashflowCents: Number(removedCashflowCents),
          beforeCashCents: cents(state.cashCents),
          afterCashCents: cents(updatedState.cashCents)
        }
      });
      const gameWon = await this.checkGameWon(tx, player.id, emittedEvents);
      if (!gameWon) {
        await tx.game.update({
          where: { id: gameId },
          data: {
            settings: this.settingsWithPending(
              game.settings,
              this.resolveStockSalePlayer(pending, player.id)
            )
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "stock_sale_completed" }
        });
      }
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async declineStockSale(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new ForbiddenException("Продавать акции можно только во время игры");
      }
      const pending = this.pendingAction(game.settings);
      if (pending?.type !== "stock_sale_window") {
        throw new ForbiddenException("Сейчас нет доступного предложения о продаже акций");
      }
      if (!pending.sellerGamePlayerIds.includes(player.id)) {
        throw new ForbiddenException("Эта карточка не даёт вам права продать акции");
      }
      if (pending.resolvedGamePlayerIds.includes(player.id)) {
        throw new BadRequestException("Вы уже приняли решение по этой продаже акций");
      }

      await tx.game.update({
        where: { id: gameId },
        data: {
          settings: this.settingsWithPending(
            game.settings,
            this.resolveStockSalePlayer(pending, player.id)
          )
        }
      });
      emittedEvents.push({
        type: "stock:sale_declined",
        gamePlayerId: player.id,
        payload: {
          cardId: pending.cardId,
          title: pending.title,
          symbol: pending.symbol,
          salePriceCents: pending.salePriceCents
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "stock_sale_declined" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async sellMarketAsset(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      if (
        pending?.type !== "market_sale" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("Сейчас нет предложения рынка, требующего вашего решения");
      }

      const [state, asset] = await Promise.all([
        tx.playerFinancialState.findUniqueOrThrow({
          where: { gamePlayerId: player.id }
        }),
        tx.playerAsset.findFirst({
          where: {
            id: pending.assetId,
            gamePlayerId: player.id,
            status: AssetStatus.ACTIVE
          }
        })
      ]);
      if (!asset) throw new NotFoundException("Актив не найден");

      const proceeds = BigInt(pending.proceedsCents);
      const cashflowAdjustment = BigInt(pending.cashflowAdjustmentCents);
      if (proceeds < 0n && state.cashCents < proceeds * -1n) {
        throw new BadRequestException("Не хватает наличных для завершения продажи");
      }

      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: {
          cashCents:
            proceeds >= 0n
              ? { increment: proceeds }
              : { decrement: proceeds * -1n },
          ...(cashflowAdjustment > 0n
            ? { basePassiveIncomeCents: { increment: cashflowAdjustment } }
            : cashflowAdjustment < 0n
              ? { baseExpensesCents: { increment: cashflowAdjustment * -1n } }
              : {})
        }
      });
      await tx.playerAsset.update({
        where: { id: asset.id },
        data: {
          marketValueCents: 0n,
          cashflowCents: 0n,
          status: AssetStatus.SOLD,
          soldAt: new Date()
        }
      });
      const updatedState = await this.recalculatePlayer(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: realtimeEvents.dealSell,
        gamePlayerId: player.id,
        payload: {
          cardId: pending.cardId,
          title: pending.title,
          assetId: asset.id,
          assetName: asset.name,
          salePriceCents: pending.salePriceCents,
          mortgageCents: pending.mortgageCents,
          proceedsCents: pending.proceedsCents,
          removedCashflowCents: Number(asset.cashflowCents),
          netCashflowChangeCents: pending.netCashflowChangeCents,
          beforeCashCents: cents(state.cashCents),
          afterCashCents: cents(updatedState.cashCents)
        }
      });
      const gameWon = await this.checkGameWon(tx, player.id, emittedEvents);
      if (gameWon) {
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      await this.continueMarketSaleQueue(
        tx,
        game,
        pending,
        emittedEvents,
        "market_sale_completed_turn_ended"
      );
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async declineMarketSale(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      if (
        pending?.type !== "market_sale" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("Сейчас нет предложения рынка, требующего вашего решения");
      }

      emittedEvents.push({
        type: "market:sale_declined",
        gamePlayerId: player.id,
        payload: {
          cardId: pending.cardId,
          title: pending.title,
          assetId: pending.assetId,
          assetName: pending.assetName,
          salePriceCents: pending.salePriceCents,
          mortgageCents: pending.mortgageCents,
          proceedsCents: pending.proceedsCents,
          offerNumber: pending.offerNumber,
          totalOffers: pending.totalOffers
        }
      });
      await this.continueMarketSaleQueue(
        tx,
        game,
        pending,
        emittedEvents,
        "market_sale_declined_turn_ended"
      );
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  private async continueMarketSaleQueue(
    tx: Tx,
    game: {
      id: string;
      settings: Prisma.JsonValue;
      currentRound: number;
      currentTurnIndex: number;
      players: Array<{ id: string }>;
    },
    pending: Extract<GamePendingAction, { type: "market_sale" }>,
    emittedEvents: PendingEvent[],
    completedReason: string
  ) {
    if (pending.remainingOffers.length > 0) {
      const nextPending = this.marketPendingAction(
        { id: pending.cardId, title: pending.title },
        pending.remainingOffers,
        pending.offerNumber + 1
      );
      await tx.game.update({
        where: { id: game.id },
        data: { settings: this.settingsWithPending(game.settings, nextPending) }
      });
      this.emitMarketSaleOffer(nextPending, emittedEvents);
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "market_sale_next_offer" }
      });
      return;
    }

    await tx.game.update({
      where: { id: game.id },
      data: { settings: this.settingsWithPending(game.settings, null) }
    });
    const activeIndex = game.currentTurnIndex % game.players.length;
    await this.advanceTurn(tx, game, activeIndex);
    emittedEvents.push({
      type: realtimeEvents.stateUpdate,
      payload: { reason: completedReason }
    });
  }

  async acceptCharity(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        pending?.type !== "charity_choice" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("Сейчас нет выбора благотворительности, требующего вашего решения");
      }

      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      const donation = BigInt(pending.donationCents);
      if (state.cashCents < donation) {
        throw new BadRequestException("Не хватает наличных для благотворительности");
      }

      const updatedState = await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: {
          cashCents: { decrement: donation },
          charityTurns: pending.turns
        },
        select: { cashCents: true }
      });
      await tx.game.update({
        where: { id: gameId },
        data: { settings: this.settingsWithPending(game.settings, null) }
      });
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: "player:charity",
        gamePlayerId: player.id,
        payload: {
          donationCents: Number(donation),
          beforeCashCents: cents(state.cashCents),
          afterCashCents: cents(updatedState.cashCents),
          diceCount: 2,
          turns: pending.turns,
          charityTurnsRemaining: pending.turns
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "charity_accepted_turn_ended" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async declineCharity(gameId: string, userId: string) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        pending?.type !== "charity_choice" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("Сейчас нет выбора благотворительности, требующего вашего решения");
      }

      await tx.game.update({
        where: { id: gameId },
        data: { settings: this.settingsWithPending(game.settings, null) }
      });
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: "player:charity_declined",
        gamePlayerId: player.id,
        payload: {
          donationCents: pending.donationCents,
          diceCount: 2,
          turns: pending.turns
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "charity_declined_turn_ended" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async sendBabyGift(gameId: string, userId: string, dto: BabyGiftDto) {
    if (!Number.isSafeInteger(dto.amountCents) || dto.amountCents <= 0) {
      throw new BadRequestException("Укажите положительную сумму поздравления");
    }

    const emittedEvents: PendingEvent[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        const sender = await this.requirePlayer(tx, gameId, userId, true);
        const birthEvent = await tx.gameEvent.findFirst({
          where: {
            id: dto.birthEventId,
            gameId,
            type: "player:baby"
          },
          select: {
            id: true,
            sequence: true,
            gamePlayerId: true
          }
        });
        if (!birthEvent?.gamePlayerId) {
          throw new NotFoundException("Событие рождения ребёнка не найдено");
        }
        if (birthEvent.gamePlayerId === sender.id) {
          throw new BadRequestException("Нельзя поздравить самого себя");
        }

        const laterTurnStarts = await tx.gameEvent.findMany({
          where: {
            gameId,
            sequence: { gt: birthEvent.sequence },
            type: {
              in: ["player:roll_dice", "turn:skipped", "bankruptcy:turn_skipped"]
            }
          },
          select: { type: true, sequence: true }
        });
        if (!isBabyGiftWindowOpen(laterTurnStarts, birthEvent.sequence)) {
          throw new BadRequestException("Срок поздравления уже закончился");
        }

        const existingGift = await tx.babyGift.findUnique({
          where: {
            birthEventId_senderGamePlayerId: {
              birthEventId: birthEvent.id,
              senderGamePlayerId: sender.id
            }
          },
          select: { id: true }
        });
        if (existingGift) {
          throw new ConflictException("Вы уже поздравили этого игрока");
        }

        const [senderState, recipientState] = await Promise.all([
          tx.playerFinancialState.findUniqueOrThrow({
            where: { gamePlayerId: sender.id }
          }),
          tx.playerFinancialState.findUniqueOrThrow({
            where: { gamePlayerId: birthEvent.gamePlayerId }
          })
        ]);
        const amount = BigInt(dto.amountCents);
        if (senderState.cashCents < amount) {
          throw new BadRequestException("Не хватает наличных для поздравления");
        }

        await tx.babyGift.create({
          data: {
            gameId,
            birthEventId: birthEvent.id,
            senderGamePlayerId: sender.id,
            recipientGamePlayerId: birthEvent.gamePlayerId,
            amountCents: amount
          }
        });
        const [updatedSenderState, updatedRecipientState] = await Promise.all([
          tx.playerFinancialState.update({
            where: { gamePlayerId: sender.id },
            data: { cashCents: { decrement: amount } },
            select: { cashCents: true }
          }),
          tx.playerFinancialState.update({
            where: { gamePlayerId: birthEvent.gamePlayerId },
            data: { cashCents: { increment: amount } },
            select: { cashCents: true }
          })
        ]);

        emittedEvents.push({
          type: realtimeEvents.babyGift,
          payload: {
            birthEventId: birthEvent.id,
            senderGamePlayerId: sender.id,
            recipientGamePlayerId: birthEvent.gamePlayerId,
            amountCents: cents(amount),
            senderBeforeCashCents: cents(senderState.cashCents),
            senderAfterCashCents: cents(updatedSenderState.cashCents),
            recipientBeforeCashCents: cents(recipientState.cashCents),
            recipientAfterCashCents: cents(updatedRecipientState.cashCents)
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "baby_gift_sent" }
        });
        await this.appendEvents(tx, gameId, userId, emittedEvents);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Вы уже поздравили этого игрока");
      }
      throw error;
    }

    return this.actionResult(gameId, emittedEvents);
  }

  async resolveDoodadPayment(
    gameId: string,
    userId: string,
    method: "cash" | "credit"
  ) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: {
          players: {
            where: { role: GameRole.PLAYER, status: "JOINED" },
            orderBy: { seat: "asc" }
          }
        }
      });
      const pending = this.pendingAction(game.settings);
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        pending?.type !== "doodad_payment_choice" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("Сейчас нет выбора оплаты «Всякой всячины»");
      }

      if (method === "cash") {
        await tx.playerFinancialState.update({
          where: { gamePlayerId: player.id },
          data: { cashCents: { decrement: BigInt(pending.cashPriceCents) } }
        });
      } else {
        await tx.playerLiability.create({
          data: {
            gamePlayerId: player.id,
            type: "credit_cards",
            name: pending.title,
            balanceCents: BigInt(pending.creditBalanceCents),
            paymentCents: BigInt(pending.creditPaymentCents)
          }
        });
      }

      await this.recalculatePlayer(tx, player.id, emittedEvents);
      await tx.game.update({
        where: { id: gameId },
        data: { settings: this.settingsWithPending(game.settings, null) }
      });
      await this.advanceTurn(tx, game, activeIndex);
      emittedEvents.push({
        type: "doodad:payment_resolved",
        gamePlayerId: player.id,
        payload: {
          cardId: pending.cardId,
          title: pending.title,
          method,
          cashPriceCents: pending.cashPriceCents,
          creditBalanceCents: pending.creditBalanceCents,
          creditPaymentCents: pending.creditPaymentCents
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "doodad_payment_resolved_turn_ended" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async takeLoan(gameId: string, userId: string, dto: TakeLoanDto) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const bankruptcyState = await tx.playerFinancialState.findUnique({
        where: { gamePlayerId: player.id },
        select: { bankruptcyStatus: true }
      });
      if (bankruptcyState?.bankruptcyStatus === BankruptcyStatus.LIQUIDATING) {
        throw new BadRequestException("Во время банкротства нельзя брать новые кредиты");
      }
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new ForbiddenException("Кредиты доступны только во время игры");
      }
      const amount = BigInt(dto.amountCents);
      if (dto.amountCents < 1000 || dto.amountCents % 1000 !== 0) {
        throw new BadRequestException("Сумма кредита должна быть кратна 1 000");
      }
      const payment = amount / 10n;

      await tx.playerLiability.create({
        data: {
          gamePlayerId: player.id,
          type: "bank_loan",
          name: "Bank loan",
          balanceCents: amount,
          paymentCents: payment
        }
      });
      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: {
          cashCents: { increment: amount }
        }
      });
      await this.recalculatePlayer(tx, player.id, emittedEvents);

      emittedEvents.push({
        type: realtimeEvents.loanTake,
        gamePlayerId: player.id,
        payload: {
          amountCents: Number(amount),
          paymentCents: Number(payment)
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "loan_taken" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async repayLoan(gameId: string, userId: string, dto: RepayLoanDto) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      if (state.bankruptcyStatus === BankruptcyStatus.LIQUIDATING) {
        throw new BadRequestException("Погасите долг через действия в разделе банкротства");
      }
      const amount = BigInt(dto.amountCents);
      if (state.cashCents < amount) {
        throw new BadRequestException("Не хватает наличных для погашения кредита");
      }

      const liability = dto.liabilityId
        ? await tx.playerLiability.findFirst({
            where: { id: dto.liabilityId, gamePlayerId: player.id }
          })
        : await tx.playerLiability.findFirst({
            where: { gamePlayerId: player.id, type: "bank_loan" },
            orderBy: { createdAt: "asc" }
          });

      if (!liability) throw new NotFoundException("Кредит не найден");
      const repayAmount = amount > liability.balanceCents ? liability.balanceCents : amount;
      const newBalance = liability.balanceCents - repayAmount;
      const newPayment =
        newBalance === 0n
          ? 0n
          : (liability.paymentCents * newBalance) / liability.balanceCents;

      const updatedState = await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: {
          cashCents: { decrement: repayAmount }
        },
        select: { cashCents: true }
      });

      if (newBalance === 0n) {
        await tx.playerLiability.delete({ where: { id: liability.id } });
      } else {
        await tx.playerLiability.update({
          where: { id: liability.id },
          data: {
            balanceCents: newBalance,
            paymentCents: newPayment
          }
        });
      }

      await this.recalculatePlayer(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: realtimeEvents.loanRepay,
        gamePlayerId: player.id,
        payload: {
          liabilityId: liability.id,
          liabilityType: liability.type,
          liabilityName: liability.name,
          amountCents: Number(repayAmount),
          balanceCents: Number(liability.balanceCents),
          paymentCents: Number(liability.paymentCents),
          beforeCashCents: cents(state.cashCents),
          afterCashCents: cents(updatedState.cashCents),
          closed: newBalance === 0n
        }
      });
      const gameWon = await this.checkGameWon(tx, player.id, emittedEvents);
      if (gameWon) {
        await this.appendEvents(tx, gameId, userId, emittedEvents);
        return;
      }
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "loan_repaid" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
  }

  async sellBankruptcyAsset(
    gameId: string,
    userId: string,
    dto: SellBankruptcyAssetDto
  ) {
    const timelineEvents = await this.syncGameTimelineIfNeeded(gameId);
    if (timelineEvents) return this.actionResult(gameId, timelineEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId, true);
      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      if (state.bankruptcyStatus !== BankruptcyStatus.LIQUIDATING) {
        throw new BadRequestException("Игрок сейчас не проходит процедуру банкротства");
      }

      const asset = await tx.playerAsset.findFirst({
        where: { id: dto.assetId, gamePlayerId: player.id, status: AssetStatus.ACTIVE }
      });
      if (!asset) throw new NotFoundException("Актив игрока не найден");
      if (dto.quantity > asset.quantity) {
        throw new BadRequestException("Нельзя продать больше единиц, чем есть в активе");
      }

      const proceeds = proportionalAmount(
        asset.downPaymentCents / 2n,
        dto.quantity,
        asset.quantity
      );
      const removedCashflow = proportionalAmount(
        asset.cashflowCents,
        dto.quantity,
        asset.quantity
      );
      const sellAll = dto.quantity === asset.quantity;

      if (sellAll) {
        await tx.playerAsset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.SOLD, soldAt: new Date() }
        });
      } else {
        await tx.playerAsset.update({
          where: { id: asset.id },
          data: {
            quantity: { decrement: dto.quantity },
            units: { decrement: Math.min(dto.quantity, asset.units) },
            costBasisCents: {
              decrement: proportionalAmount(asset.costBasisCents, dto.quantity, asset.quantity)
            },
            marketValueCents: {
              decrement: proportionalAmount(asset.marketValueCents, dto.quantity, asset.quantity)
            },
            downPaymentCents: {
              decrement: proportionalAmount(asset.downPaymentCents, dto.quantity, asset.quantity)
            },
            cashflowCents: { decrement: removedCashflow }
          }
        });
      }

      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: { cashCents: { increment: proceeds } }
      });
      await this.recalculatePlayer(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: "bankruptcy:asset_sold",
        gamePlayerId: player.id,
        payload: {
          assetId: asset.id,
          assetName: asset.name,
          quantity: dto.quantity,
          proceedsCents: cents(proceeds),
          removedCashflowCents: cents(removedCashflow)
        }
      });
      await this.resolveBankruptcy(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "bankruptcy_updated" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return this.actionResult(gameId, emittedEvents);
  }

  async repayBankruptcyDebt(
    gameId: string,
    userId: string,
    dto: RepayBankruptcyDebtDto
  ) {
    const timelineEvents = await this.syncGameTimelineIfNeeded(gameId);
    if (timelineEvents) return this.actionResult(gameId, timelineEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId, true);
      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      if (state.bankruptcyStatus !== BankruptcyStatus.LIQUIDATING) {
        throw new BadRequestException("Игрок сейчас не проходит процедуру банкротства");
      }
      const liability = await tx.playerLiability.findFirst({
        where: { id: dto.liabilityId, gamePlayerId: player.id }
      });
      if (!liability) throw new NotFoundException("Долг не найден");

      const requested = BigInt(dto.amountCents);
      const amount = bigintMin(
        requested,
        bigintMin(state.cashCents, liability.balanceCents)
      );
      if (amount <= 0n) throw new BadRequestException("Нет наличных для погашения долга");
      const newBalance = liability.balanceCents - amount;
      const newPayment = newBalance === 0n
        ? 0n
        : (liability.paymentCents * newBalance) / liability.balanceCents;

      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: { cashCents: { decrement: amount } }
      });
      if (newBalance === 0n) {
        await tx.playerLiability.delete({ where: { id: liability.id } });
      } else {
        await tx.playerLiability.update({
          where: { id: liability.id },
          data: { balanceCents: newBalance, paymentCents: newPayment }
        });
      }
      await this.recalculatePlayer(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: "bankruptcy:debt_repaid",
        gamePlayerId: player.id,
        payload: {
          liabilityId: liability.id,
          liabilityType: liability.type,
          amountCents: cents(amount),
          balanceCents: cents(newBalance),
          paymentCents: cents(newPayment)
        }
      });
      await this.resolveBankruptcy(tx, player.id, emittedEvents);
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "bankruptcy_updated" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return this.actionResult(gameId, emittedEvents);
  }

  async sendChat(gameId: string, userId: string, dto: ChatDto) {
    await this.ensureGameAccess(gameId, userId);
    const message = await this.prisma.gameChatMessage.create({
      data: {
        gameId,
        userId,
        body: dto.body.trim()
      },
      include: {
        user: { select: { id: true, displayName: true } }
      }
    });

    return toSerializable(message);
  }

  async recordBotDecision(
    gameId: string,
    gamePlayerId: string,
    decision: { action: string; reason: string }
  ) {
    const player = await this.prisma.gamePlayer.findFirst({
      where: {
        id: gamePlayerId,
        gameId,
        controller: PlayerController.BOT
      },
      select: { id: true }
    });
    if (!player) throw new ForbiddenException("Системный игрок не найден");
    const event: PendingEvent = {
      type: "bot:decision",
      gamePlayerId,
      payload: {
        strategy: "balanced_v1",
        action: decision.action,
        reason: decision.reason
      }
    };
    await this.prisma.$transaction((tx) =>
      this.appendEvents(tx, gameId, this.botActorId(gamePlayerId), [event])
    );
    return this.actionResult(gameId, [event]);
  }

  async replay(gameId: string, userId: string) {
    await this.ensureGameAccess(gameId, userId);
    const events = await this.prisma.gameEvent.findMany({
      where: { gameId },
      orderBy: { sequence: "asc" },
      include: {
        actor: { select: { id: true, displayName: true } },
        gamePlayer: { select: { id: true, seat: true, role: true } }
      }
    });
    return toSerializable({ events });
  }

  async professions() {
    const professions = await this.prisma.profession.findMany({
      where: { isActive: true },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" }
    });
    return toSerializable(professions);
  }

  async cards(cardType?: CardType) {
    const cardSet = await this.requirePlayableCardSet();
    const cards = await this.prisma.card.findMany({
      where: {
        cardSetId: cardSet.id,
        isActive: true,
        ...(cardType ? { cardType } : {})
      },
      include: {
        meta: true,
        effects: true,
        conditions: true
      },
      orderBy: { id: "asc" },
      take: 200
    });
    return toSerializable(cards);
  }

  private async createInitialFinancialState(
    tx: Tx,
    gamePlayerId: string,
    profession: {
      salaryCents: bigint | null;
      passiveIncomeCents: bigint | null;
      totalIncomeCents: bigint | null;
      taxesCents: bigint | null;
      mortgagePaymentCents: bigint | null;
      schoolLoanPaymentCents: bigint | null;
      carLoanPaymentCents: bigint | null;
      creditCardPaymentCents: bigint | null;
      retailPaymentCents: bigint | null;
      otherExpensesCents: bigint | null;
      totalExpensesCents: bigint | null;
      monthlyCashflowCents: bigint | null;
      savingsCents: bigint | null;
      homeMortgageCents: bigint | null;
      schoolDebtCents: bigint | null;
      carDebtCents: bigint | null;
      creditCardsDebtCents: bigint | null;
      retailDebtCents: bigint | null;
      perChildCostCents: bigint | null;
    }
  ) {
    await tx.playerFinancialState.deleteMany({ where: { gamePlayerId } });
    await tx.playerAsset.deleteMany({ where: { gamePlayerId } });
    await tx.playerLiability.deleteMany({ where: { gamePlayerId } });

    const liabilityRows = [
      {
        type: "home_mortgage",
        name: "Home mortgage",
        balanceCents: profession.homeMortgageCents,
        paymentCents: profession.mortgagePaymentCents
      },
      {
        type: "school_debt",
        name: "School debt",
        balanceCents: profession.schoolDebtCents,
        paymentCents: profession.schoolLoanPaymentCents
      },
      {
        type: "car_debt",
        name: "Car debt",
        balanceCents: profession.carDebtCents,
        paymentCents: profession.carLoanPaymentCents
      },
      {
        type: "credit_cards",
        name: "Credit cards",
        balanceCents: profession.creditCardsDebtCents,
        paymentCents: profession.creditCardPaymentCents
      },
      {
        type: "retail_debt",
        name: "Retail debt",
        balanceCents: profession.retailDebtCents,
        paymentCents: profession.retailPaymentCents
      }
    ].filter((row) => (row.balanceCents ?? 0n) > 0n);

    const liabilityPayments = liabilityRows.reduce(
      (sum, row) => sum + (row.paymentCents ?? 0n),
      0n
    );
    const totalExpenses = profession.totalExpensesCents ?? 0n;
    const baseExpenses =
      totalExpenses > liabilityPayments ? totalExpenses - liabilityPayments : 0n;

    await tx.playerFinancialState.create({
      data: {
        gamePlayerId,
        cashCents: profession.savingsCents ?? 0n,
        salaryCents: profession.salaryCents ?? 0n,
        basePassiveIncomeCents: profession.passiveIncomeCents ?? 0n,
        passiveIncomeCents: profession.passiveIncomeCents ?? 0n,
        totalIncomeCents:
          profession.totalIncomeCents ??
          (profession.salaryCents ?? 0n) + (profession.passiveIncomeCents ?? 0n),
        baseExpensesCents: baseExpenses,
        totalExpensesCents: totalExpenses,
        monthlyCashflowCents:
          profession.monthlyCashflowCents ??
          ((profession.totalIncomeCents ?? 0n) - totalExpenses),
        perChildCostCents: profession.perChildCostCents ?? 0n
      }
    });

    if (liabilityRows.length > 0) {
      await tx.playerLiability.createMany({
        data: liabilityRows.map((row) => ({
          gamePlayerId,
          type: row.type,
          name: row.name,
          balanceCents: row.balanceCents ?? 0n,
          paymentCents: row.paymentCents ?? 0n
        }))
      });
    }
  }

  private async resolveCell(
    tx: Tx,
    gameId: string,
    gameSettings: Prisma.JsonValue,
    gamePlayerId: string,
    cellType: string,
    emittedEvents: PendingEvent[]
  ) {
    const cardType = normalizeCardTypeForCell(cellType) as CardType | null;
    let currentSettings = gameSettings;
    if (cardType) {
      const draw = await this.drawCardFromDeck(
        tx,
        gameId,
        currentSettings,
        cardType
      );
      const { card } = draw;
      currentSettings = draw.settings;
      emittedEvents.push({
        type: realtimeEvents.cardDraw,
        gamePlayerId,
        payload: this.cardPayload(card, draw.drawState)
      });

      if (cardType === CardType.MARKET) {
        const pendingMarketAction = await this.resolveMarketCard(
          tx,
          gameId,
          currentSettings,
          gamePlayerId,
          card,
          emittedEvents
        );
        if (pendingMarketAction) return true;
      }

      if (cardType === CardType.DOODAD) {
        const paymentChoice = this.doodadPaymentChoice(card);
        if (paymentChoice) {
          await tx.game.update({
            where: { id: gameId },
            data: {
              settings: this.settingsWithPending(currentSettings, {
                type: "doodad_payment_choice",
                gamePlayerId,
                cardId: card.id,
                title: card.title,
                ...paymentChoice
              })
            }
          });
          emittedEvents.push({
            type: "doodad:payment_choice_required",
            gamePlayerId,
            payload: { cardId: card.id, title: card.title, ...paymentChoice }
          });
          emittedEvents.push({
            type: realtimeEvents.stateUpdate,
            payload: { reason: "doodad_payment_choice_required" }
          });
          return true;
        }
        await this.applyDoodad(tx, gamePlayerId, card, emittedEvents);
      } else if (this.hasAutomaticCardEffects(card)) {
        const affectedPlayerIds = await this.applyAutomaticCardEffects(
          tx,
          gameId,
          gamePlayerId,
          card,
          emittedEvents
        );
        for (const affectedPlayerId of affectedPlayerIds) {
          await this.recalculatePlayer(tx, affectedPlayerId, emittedEvents);
        }
      }
      return false;
    }

    if (cellType === "baby") {
      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId }
      });
      if (state.childrenCount < 3) {
        await tx.playerFinancialState.update({
          where: { gamePlayerId },
          data: { childrenCount: { increment: 1 } }
        });
        emittedEvents.push({
          type: "player:baby",
          gamePlayerId,
          payload: { childrenCount: state.childrenCount + 1 }
        });
      }
      return false;
    }

    if (cellType === "downsized") {
      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId }
      });
      await tx.playerFinancialState.update({
        where: { gamePlayerId },
        data: {
          cashCents: { decrement: state.totalExpensesCents },
          downsizedTurns: 2
        }
      });
      emittedEvents.push({
        type: "player:downsized",
        gamePlayerId,
        payload: {
          costCents: Number(state.totalExpensesCents),
          turns: 2
        }
      });
      return false;
    }

    if (cellType === "charity") {
      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId }
      });
      const donation = state.totalIncomeCents / 10n;
      if (donation > 0n) {
        await tx.game.update({
          where: { id: gameId },
          data: {
            settings: this.settingsWithPending(gameSettings, {
              type: "charity_choice",
              gamePlayerId,
              donationCents: Number(donation),
              turns: 3
            })
          }
        });
        emittedEvents.push({
          type: "player:charity_choice_required",
          gamePlayerId,
          payload: {
            donationCents: Number(donation),
            diceCount: 2,
            turns: 3
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "charity_choice_required" }
        });
        return true;
      }
    }
    return false;
  }

  private async resolveMarketCard(
    tx: Tx,
    gameId: string,
    gameSettings: Prisma.JsonValue,
    currentGamePlayerId: string,
    card: CardWithRules,
    emittedEvents: PendingEvent[]
  ) {
    const rule = this.marketRule(card);
    if (!rule) {
      this.emitMarketNoEffect(card, currentGamePlayerId, "unsupported_rule", emittedEvents);
      return false;
    }

    if (rule.action === "business_cashflow") {
      await this.applyMarketBusinessCashflow(
        tx,
        gameId,
        card,
        rule.amountCents,
        emittedEvents
      );
      return false;
    }

    if (rule.action === "surrender") {
      await this.applyMarketSurrender(
        tx,
        currentGamePlayerId,
        card,
        rule,
        emittedEvents
      );
      return false;
    }

    const offers = await this.findMarketSaleOffers(
      tx,
      gameId,
      currentGamePlayerId,
      card,
      rule
    );
    if (offers.length === 0) {
      this.emitMarketNoEffect(card, currentGamePlayerId, "no_matching_assets", emittedEvents);
      return false;
    }

    const pending = this.marketPendingAction(card, offers, 1);
    await tx.game.update({
      where: { id: gameId },
      data: { settings: this.settingsWithPending(gameSettings, pending) }
    });
    this.emitMarketSaleOffer(pending, emittedEvents);
    emittedEvents.push({
      type: realtimeEvents.stateUpdate,
      payload: { reason: "market_sale_offer" }
    });
    return true;
  }

  private marketRule(card: CardWithRules): MarketRule | null {
    const stableRule = originalMarketRule(card.slug);
    if (stableRule) return stableRule;

    const marketText = this.normalizedSearchText(card.title, card.bodyText);
    const target = this.marketTargetKeys(marketText)[0];
    if (!target) return null;
    const scope = marketText.includes("но не другие игроки") ? "current" : "all";
    if (marketText.includes("втрое")) {
      return {
        action: "sale",
        target,
        scope,
        pricing: { type: "down_payment_multiplier", multiplier: 3 }
      };
    }
    if (marketText.includes("вдвое")) {
      return {
        action: "sale",
        target,
        scope,
        pricing: { type: "down_payment_multiplier", multiplier: 2 }
      };
    }
    if (marketText.includes("первоначальную стоимость") && marketText.includes("50 000")) {
      return {
        action: "sale",
        target,
        scope,
        pricing: { type: "cost_plus", amountCents: 50000 }
      };
    }

    const meta = this.metaMap(card.meta);
    const priceCents = Number(
      this.metaMoneyCents(meta, "price") ||
      this.parseFirstMoneyCents(`${card.title}\n${card.bodyText}`)
    );
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) return null;
    return {
      action: "sale",
      target,
      scope,
      pricing:
        marketText.includes("каждый блок") || marketText.includes("каждый номер")
          ? { type: "per_unit", priceCents }
          : { type: "fixed", priceCents }
    };
  }

  private async findMarketSaleOffers(
    tx: Tx,
    gameId: string,
    currentGamePlayerId: string,
    card: CardWithRules,
    rule: Extract<MarketRule, { action: "sale" }>
  ): Promise<MarketSaleOfferState[]> {
    const assets = await tx.playerAsset.findMany({
      where: {
        status: AssetStatus.ACTIVE,
        ...(rule.scope === "current" ? { gamePlayerId: currentGamePlayerId } : {}),
        gamePlayer: {
          gameId,
          role: GameRole.PLAYER,
          status: GamePlayerStatus.JOINED
        }
      },
      include: {
        gamePlayer: { select: { seat: true } },
        sourceCard: { include: { meta: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return assets
      .flatMap((asset): Array<MarketSaleOfferState & { seat: number }> => {
        const sourceCard = asset.sourceCard;
        const assetText = this.normalizedSearchText(
          asset.type,
          asset.name,
          sourceCard?.title,
          sourceCard?.bodyText,
          sourceCard?.category,
          sourceCard?.subcategory
        );
        if (!marketAssetMatchesTarget(rule.target, assetText)) return [];

        const noteSale = rule.pricing.type === "no_cash_note";
        const salePrice = marketRuleSalePriceCents(rule, asset, assetText);
        if (!noteSale && salePrice <= 0n) return [];
        const sourceMeta = sourceCard ? this.metaMap(sourceCard.meta) : {};
        const mortgage = noteSale
          ? 0n
          : this.metaMoneyCents(sourceMeta, "mortgage") ||
            bigintMax(0n, asset.costBasisCents - asset.downPaymentCents);
        const proceeds = noteSale ? 0n : salePrice - mortgage;
        const netCashflowChange =
          rule.pricing.type === "no_cash_note"
            ? BigInt(rule.pricing.cashflowChangeCents)
            : asset.cashflowCents * -1n;
        const cashflowAdjustment = noteSale
          ? netCashflowChange + asset.cashflowCents
          : 0n;

        return [{
          gamePlayerId: asset.gamePlayerId,
          assetId: asset.id,
          assetName: asset.name,
          salePriceCents: Number(salePrice),
          mortgageCents: Number(mortgage),
          proceedsCents: Number(proceeds),
          cashflowCents: Number(asset.cashflowCents),
          netCashflowChangeCents: Number(netCashflowChange),
          cashflowAdjustmentCents: Number(cashflowAdjustment),
          seat: asset.gamePlayer.seat ?? Number.MAX_SAFE_INTEGER
        }];
      })
      .sort((left, right) => left.seat - right.seat)
      .map(({ seat: _seat, ...offer }) => offer);
  }

  private async applyMarketBusinessCashflow(
    tx: Tx,
    gameId: string,
    card: CardWithRules,
    amountCents: number,
    emittedEvents: PendingEvent[]
  ) {
    const assets = await tx.playerAsset.findMany({
      where: {
        status: AssetStatus.ACTIVE,
        type: "business",
        gamePlayer: {
          gameId,
          role: GameRole.PLAYER,
          status: GamePlayerStatus.JOINED
        }
      },
      select: { id: true, gamePlayerId: true }
    });
    if (assets.length === 0) {
      this.emitMarketNoEffect(card, null, "no_matching_businesses", emittedEvents);
      return;
    }

    await tx.playerAsset.updateMany({
      where: { id: { in: assets.map((asset) => asset.id) } },
      data: { cashflowCents: { increment: BigInt(amountCents) } }
    });
    const affectedPlayerIds = [...new Set(assets.map((asset) => asset.gamePlayerId))];
    for (const gamePlayerId of affectedPlayerIds) {
      const assetCount = assets.filter((asset) => asset.gamePlayerId === gamePlayerId).length;
      await this.recalculatePlayer(tx, gamePlayerId, emittedEvents);
      emittedEvents.push({
        type: "market:cashflow_applied",
        gamePlayerId,
        payload: {
          cardId: card.id,
          title: card.title,
          assetCount,
          amountPerAssetCents: amountCents,
          totalAmountCents: amountCents * assetCount
        }
      });
    }
  }

  private async applyMarketSurrender(
    tx: Tx,
    gamePlayerId: string,
    card: CardWithRules,
    rule: Extract<MarketRule, { action: "surrender" }>,
    emittedEvents: PendingEvent[]
  ) {
    const assets = await tx.playerAsset.findMany({
      where: { gamePlayerId, status: AssetStatus.ACTIVE },
      include: { sourceCard: true }
    });
    const matching = assets.filter((asset) =>
      marketAssetMatchesTarget(
        rule.target,
        this.normalizedSearchText(
          asset.type,
          asset.name,
          asset.sourceCard?.title,
          asset.sourceCard?.bodyText,
          asset.sourceCard?.category,
          asset.sourceCard?.subcategory
        )
      )
    );
    if (matching.length === 0) {
      this.emitMarketNoEffect(card, gamePlayerId, "no_matching_assets", emittedEvents);
      return;
    }

    await tx.playerAsset.updateMany({
      where: { id: { in: matching.map((asset) => asset.id) } },
      data: {
        marketValueCents: 0n,
        cashflowCents: 0n,
        status: AssetStatus.SOLD,
        soldAt: new Date()
      }
    });
    await this.recalculatePlayer(tx, gamePlayerId, emittedEvents);
    emittedEvents.push({
      type: "market:assets_surrendered",
      gamePlayerId,
      payload: {
        cardId: card.id,
        title: card.title,
        assetCount: matching.length,
        assetNames: matching.map((asset) => asset.name),
        removedCashflowCents: Number(
          matching.reduce((sum, asset) => sum + asset.cashflowCents, 0n)
        )
      }
    });
  }

  private marketPendingAction(
    card: Pick<CardWithRules, "id" | "title">,
    offers: MarketSaleOfferState[],
    offerNumber: number
  ): Extract<GamePendingAction, { type: "market_sale" }> {
    const [offer, ...remainingOffers] = offers;
    if (!offer) throw new Error("Нельзя создать пустую очередь предложений рынка");
    return {
      type: "market_sale",
      cardId: card.id,
      title: card.title,
      ...offer,
      offerNumber,
      totalOffers: offerNumber + remainingOffers.length,
      remainingOffers
    };
  }

  private emitMarketSaleOffer(
    pending: Extract<GamePendingAction, { type: "market_sale" }>,
    emittedEvents: PendingEvent[]
  ) {
    const { remainingOffers: _remainingOffers, cashflowAdjustmentCents: _adjustment, ...payload } = pending;
    emittedEvents.push({
      type: "market:sale_offer",
      gamePlayerId: pending.gamePlayerId,
      payload
    });
  }

  private emitMarketNoEffect(
    card: Pick<CardWithRules, "id" | "title">,
    gamePlayerId: string | null,
    reason: string,
    emittedEvents: PendingEvent[]
  ) {
    emittedEvents.push({
      type: "market:no_effect",
      gamePlayerId,
      payload: { cardId: card.id, title: card.title, reason }
    });
  }

  private marketTargetKeys(marketText: string) {
    const keys: MarketAssetTarget[] = [];
    if (/(?:^|\s)10\s*(?:га|гектар)/.test(marketText)) keys.push("land10");
    if (/(?:^|\s)20\s*(?:га|гектар)/.test(marketText)) keys.push("land20");
    if (marketText.includes("золот") && marketText.includes("монет")) keys.push("gold_coin");
    if (marketText.includes("2у")) keys.push("house2u");
    if (/\b3m\b|\b3м\b|3br|3\/2/.test(marketText)) keys.push("house3m");
    if (marketText.includes("plex") || marketText.includes("квартирн")) keys.push("plex");
    if (marketText.includes("апартамент")) keys.push("apartment");
    if (marketText.includes("автомой")) keys.push("carwash");
    if (marketText.includes("шашлык")) keys.push("kebab");
    if (marketText.includes("циркони")) keys.push("zirconium");
    if (marketText.includes("программн")) keys.push("software");
    if (marketText.includes("салон") && marketText.includes("крас")) keys.push("beauty_salon");
    if (marketText.includes("партнерств")) keys.push("partnership");
    return [...new Set(keys)];
  }

  private normalizedSearchText(...values: Array<string | null | undefined>) {
    return values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\s+/g, " ");
  }

  private ratRaceCellsForMove(from: number, steps: number) {
    const cells: Array<(typeof ratRaceBoard)[number]> = [];
    const boardSize = ratRaceBoard.length;

    for (let offset = 1; offset <= steps; offset += 1) {
      const cellIndex = ((from + offset) % boardSize + boardSize) % boardSize;
      const cell = ratRaceBoard[cellIndex];
      if (cell) cells.push(cell);
    }

    return cells;
  }

  private async applyDoodad(
    tx: Tx,
    gamePlayerId: string,
    card: CardWithRules,
    emittedEvents: PendingEvent[]
  ) {
    const affectedPlayerIds = await this.executeCardActions(tx, {
      gameId: null,
      gamePlayerId,
      card,
      emittedEvents,
      mode: "mandatory_expense"
    });

    for (const affectedPlayerId of affectedPlayerIds) {
      await this.recalculatePlayer(tx, affectedPlayerId, emittedEvents);
    }
  }

  private doodadPaymentChoice(card: CardWithRules) {
    const meta = this.metaMap(card.meta);
    if (meta.payment_choice !== "cash_or_credit") return null;
    const cashPriceCents = Number(meta.cash_price ?? "0");
    const creditBalanceCents = Number(meta.credit_balance ?? "0");
    const creditPaymentCents = Number(meta.credit_payment ?? "0");
    if (
      !Number.isFinite(cashPriceCents) ||
      !Number.isFinite(creditBalanceCents) ||
      !Number.isFinite(creditPaymentCents) ||
      cashPriceCents <= 0 ||
      creditBalanceCents <= 0 ||
      creditPaymentCents <= 0
    ) {
      return null;
    }
    return { cashPriceCents, creditBalanceCents, creditPaymentCents };
  }

  private hasAutomaticCardEffects(card: Pick<CardWithRules, "effects">) {
    return card.effects.some((effect) => this.isAutomaticCardEffect(effect));
  }

  private async applyAutomaticCardEffects(
    tx: Tx,
    gameId: string,
    gamePlayerId: string,
    card: CardWithRules,
    emittedEvents: PendingEvent[]
  ) {
    return this.executeCardActions(tx, {
      gameId,
      gamePlayerId,
      card,
      emittedEvents,
      mode: "automatic"
    });
  }

  private networkMarketingCard(card: CardWithRules) {
    if (card.cardType !== CardType.SMALL_DEAL) return null;

    const text = `${card.title}\n${card.bodyText}`;
    const normalized = text.toLowerCase();
    if (!normalized.includes("уровень")) return null;

    const company = /\bTNI\b/i.test(text)
      ? "TNI"
      : /\bAMWAY\b/i.test(text)
        ? "AMWAY"
        : /бриллиант/iu.test(text)
          ? "AMWAY"
          : null;
    if (!company) return null;

    const levelMatch = text.match(/(\d+)\s*[-\s]*уровень/iu);
    const level = levelMatch?.[1] ? Number(levelMatch[1]) : 0;
    if (!Number.isInteger(level) || level < 1 || level > 4) return null;

    const cashflowCents = this.parseNetworkMarketingCashflowCents(text);
    if (cashflowCents === null) return null;

    return {
      company,
      level,
      cashflowCents
    };
  }

  private async applyNetworkMarketingCard(
    tx: Tx,
    gamePlayerId: string,
    card: CardWithRules,
    rule: { company: string; level: number; cashflowCents: bigint },
    emittedEvents: PendingEvent[]
  ) {
    let existing = await tx.playerAsset.findMany({
      where: {
        gamePlayerId,
        type: "network_marketing",
        symbol: rule.company,
        status: AssetStatus.ACTIVE
      },
      include: {
        sourceCard: {
          select: { title: true, bodyText: true }
        }
      },
      orderBy: [{ quantity: "asc" }, { createdAt: "asc" }]
    });

    const levelsFromAssets = (assets: typeof existing) => {
      const levels = new Set<number>();
      for (const asset of assets) {
        // Legacy assets represented the whole completed chain in one row.
        if (asset.quantity > 1 && asset.units === asset.quantity) {
          for (let level = 1; level <= asset.quantity; level += 1) {
            levels.add(level);
          }
        } else if (asset.quantity >= 1 && asset.quantity <= 4) {
          levels.add(asset.quantity);
        }
      }
      return levels;
    };

    let ownedLevels = levelsFromAssets(existing);
    const completedLevel = contiguousNetworkMarketingLevel(ownedLevels);
    const prematureAssets = existing.filter(
      (asset) =>
        !(asset.quantity > 1 && asset.units === asset.quantity) &&
        asset.quantity > completedLevel
    );
    if (prematureAssets.length > 0) {
      await tx.playerAsset.updateMany({
        where: { id: { in: prematureAssets.map((asset) => asset.id) } },
        data: {
          status: AssetStatus.SOLD,
          soldAt: new Date(),
          cashflowCents: 0n
        }
      });
      const prematureIds = new Set(prematureAssets.map((asset) => asset.id));
      existing = existing.filter((asset) => !prematureIds.has(asset.id));
      ownedLevels = levelsFromAssets(existing);
    }

    const decision = networkMarketingLevelDecision(ownedLevels, rule.level);
    const previousLevel = decision.currentLevel;
    const previousCashflowCents = existing.reduce(
      (sum, asset) => sum + asset.cashflowCents,
      0n
    );

    if (!decision.accepted) {
      emittedEvents.push({
        type: "network_marketing:discarded",
        gamePlayerId,
        payload: {
          cardId: card.id,
          title: card.title,
          company: rule.company,
          level: rule.level,
          currentLevel: previousLevel,
          requiredLevel: decision.requiredLevel,
          reason: decision.reason
        }
      });
      return prematureAssets.length > 0;
    }

    const assetName =
      card.title.trim() && card.title.trim() !== "-"
        ? card.title
        : `${rule.company}: ${rule.level} уровень`;
    await tx.playerAsset.create({
      data: {
        gamePlayerId,
        sourceCardId: card.id,
        type: "network_marketing",
        name: assetName,
        symbol: rule.company,
        quantity: rule.level,
        units: 1,
        cashflowCents: 0n
      }
    });

    ownedLevels.add(rule.level);
    const activeLevel = contiguousNetworkMarketingLevel(ownedLevels);
    const companyAssets = await tx.playerAsset.findMany({
      where: {
        gamePlayerId,
        type: "network_marketing",
        symbol: rule.company,
        status: AssetStatus.ACTIVE
      },
      include: {
        sourceCard: {
          select: { title: true, bodyText: true }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });
    const activeAsset = companyAssets.find((asset) => asset.quantity === activeLevel);
    const activeCashflowCents = activeAsset?.sourceCard
      ? this.parseNetworkMarketingCashflowCents(
          `${activeAsset.sourceCard.title}\n${activeAsset.sourceCard.bodyText}`
        ) ?? 0n
      : 0n;

    for (const asset of companyAssets) {
      const cashflowCents = asset.id === activeAsset?.id ? activeCashflowCents : 0n;
      if (asset.cashflowCents !== cashflowCents) {
        await tx.playerAsset.update({
          where: { id: asset.id },
          data: { cashflowCents }
        });
      }
    }

    emittedEvents.push({
      type: "network_marketing:level_applied",
      gamePlayerId,
      payload: {
        cardId: card.id,
        title: card.title,
        company: rule.company,
        acquiredLevel: rule.level,
        level: activeLevel,
        previousLevel,
        cashflowCents: Number(activeCashflowCents),
        previousCashflowCents: Number(previousCashflowCents)
      }
    });
    return true;
  }

  private async executeCardActions(
    tx: Tx,
    context: {
      gameId: string | null;
      gamePlayerId: string;
      card: CardWithRules;
      emittedEvents: PendingEvent[];
      mode: "automatic" | "mandatory_expense";
    }
  ) {
    const affectedPlayerIds = new Set<string>();
    const meta = this.metaMap(context.card.meta);

    for (const effect of context.card.effects) {
      const actionType = this.cardActionType(effect.effectType);
      if (!this.shouldExecuteCardAction(context.mode, effect)) continue;

      if (actionType === cardActionTypes.cashAdjust) {
        const affected = await this.applyCashAdjustAction(tx, context, effect, meta);
        if (affected) affectedPlayerIds.add(context.gamePlayerId);
        continue;
      }

      if (actionType === cardActionTypes.cashflowAdjust) {
        const affected = await this.applyCashflowAdjustAction(tx, context, effect);
        if (affected) affectedPlayerIds.add(context.gamePlayerId);
        continue;
      }

      if (actionType === cardActionTypes.liabilityCreate) {
        const affected = await this.applyLiabilityCreateAction(tx, context, effect);
        if (affected) affectedPlayerIds.add(context.gamePlayerId);
        continue;
      }

      if (
        context.gameId &&
        (actionType === cardActionTypes.assetQuantityMultiply ||
          actionType === cardActionTypes.assetQuantityDivide ||
          actionType === cardActionTypes.assetWipeout)
      ) {
        const affected = await this.applyStockQuantityEffect(
          tx,
          context.gameId,
          context.card.title,
          meta.symbol,
          actionType,
          this.effectAmount(effect),
          context.emittedEvents
        );
        for (const playerId of affected) affectedPlayerIds.add(playerId);
      }
    }

    return affectedPlayerIds;
  }

  private async applyCashAdjustAction(
    tx: Tx,
    context: {
      gamePlayerId: string;
      card: CardWithRules;
      emittedEvents: PendingEvent[];
      mode: "automatic" | "mandatory_expense";
    },
    effect: CardWithRules["effects"][number],
    meta: Record<string, string>
  ) {
    const conditionsMet = await this.cardConditionsMet(
      tx,
      context.gamePlayerId,
      context.card
    );
    if (!conditionsMet) {
      this.emitConditionNotMet(context);
      return false;
    }

    const state = await tx.playerFinancialState.findUniqueOrThrow({
      where: { gamePlayerId: context.gamePlayerId }
    });
    const perChild =
      meta.per_child === "true" ||
      meta.per_child === "1" ||
      meta.per_child?.toLowerCase() === "yes";
    const amount = this.effectAmount(effect) * (perChild ? BigInt(state.childrenCount) : 1n);
    if (amount === 0n) return false;

    await tx.playerFinancialState.update({
      where: { gamePlayerId: context.gamePlayerId },
      data: {
        cashCents:
          amount > 0n
            ? { increment: amount }
            : { decrement: amount * -1n }
      }
    });
    context.emittedEvents.push({
      type: context.mode === "mandatory_expense" ? "doodad:paid" : "card:cash_delta",
      gamePlayerId: context.gamePlayerId,
      payload: {
        cardId: context.card.id,
        title: context.card.title,
        amountCents: Number(amount),
        actionType: cardActionTypes.cashAdjust,
        mandatory: context.mode === "mandatory_expense" || this.effectIsMandatory(effect)
      }
    });
    return true;
  }

  private async applyCashflowAdjustAction(
    tx: Tx,
    context: {
      gamePlayerId: string;
      card: CardWithRules;
      emittedEvents: PendingEvent[];
    },
    effect: CardWithRules["effects"][number]
  ) {
    const conditionsMet = await this.cardConditionsMet(
      tx,
      context.gamePlayerId,
      context.card
    );
    if (!conditionsMet) {
      this.emitConditionNotMet(context);
      return false;
    }

    const amount = this.effectAmount(effect);
    if (amount === 0n) return false;

    await tx.playerFinancialState.update({
      where: { gamePlayerId: context.gamePlayerId },
      data:
        amount > 0n
          ? { basePassiveIncomeCents: { increment: amount } }
          : { baseExpensesCents: { increment: amount * -1n } }
    });
    context.emittedEvents.push({
      type: "card:cashflow_delta",
      gamePlayerId: context.gamePlayerId,
      payload: {
        cardId: context.card.id,
        title: context.card.title,
        amountCents: Number(amount),
        actionType: cardActionTypes.cashflowAdjust
      }
    });
    return true;
  }

  private async applyLiabilityCreateAction(
    tx: Tx,
    context: {
      gamePlayerId: string;
      card: CardWithRules;
      emittedEvents: PendingEvent[];
    },
    effect: CardWithRules["effects"][number]
  ) {
    const conditionsMet = await this.cardConditionsMet(
      tx,
      context.gamePlayerId,
      context.card
    );
    if (!conditionsMet) {
      this.emitConditionNotMet(context);
      return false;
    }

    const payload = this.effectPayload(effect);
    const balance = this.payloadMoney(payload, "balanceCents") ?? this.effectAmount(effect);
    const payment = this.payloadMoney(payload, "paymentCents") ?? 0n;
    if (balance <= 0n && payment <= 0n) return false;

    await tx.playerLiability.create({
      data: {
        gamePlayerId: context.gamePlayerId,
        type: this.payloadText(payload, "type") ?? "card_liability",
        name: this.payloadText(payload, "name") ?? context.card.title,
        balanceCents: balance > 0n ? balance : 0n,
        paymentCents: payment > 0n ? payment : 0n
      }
    });
    context.emittedEvents.push({
      type: "card:liability_created",
      gamePlayerId: context.gamePlayerId,
      payload: {
        cardId: context.card.id,
        title: context.card.title,
        balanceCents: Number(balance),
        paymentCents: Number(payment),
        actionType: cardActionTypes.liabilityCreate,
        mandatory: this.effectIsMandatory(effect)
      }
    });
    return true;
  }

  private emitConditionNotMet(context: {
    gamePlayerId: string;
    card: CardWithRules;
    emittedEvents: PendingEvent[];
  }) {
    context.emittedEvents.push({
      type: "card:condition_not_met",
      gamePlayerId: context.gamePlayerId,
      payload: {
        title: context.card.title,
        conditions: context.card.conditions.map((condition) => condition.condType)
      }
    });
  }

  private isAutomaticCardEffect(effect: CardWithRules["effects"][number]) {
    const actionType = this.cardActionType(effect.effectType);
    if (
      actionType === cardActionTypes.assetQuantityMultiply ||
      actionType === cardActionTypes.assetQuantityDivide ||
      actionType === cardActionTypes.assetWipeout
    ) {
      return true;
    }
    if (effect.effectType === "conditional_cash_delta") return true;
    return this.effectIsAutomatic(effect);
  }

  private shouldExecuteCardAction(
    mode: "automatic" | "mandatory_expense",
    effect: CardWithRules["effects"][number]
  ) {
    const actionType = this.cardActionType(effect.effectType);
    if (mode === "mandatory_expense") {
      if (
        actionType === cardActionTypes.cashAdjust ||
        actionType === cardActionTypes.liabilityCreate
      ) {
        return true;
      }

      return (
        actionType === cardActionTypes.cashflowAdjust &&
        effect.effectType === cardActionTypes.cashflowAdjust
      );
    }

    return this.isAutomaticCardEffect(effect);
  }

  private cardActionType(effectType: string) {
    return legacyCardEffectAliases[effectType] ?? effectType;
  }

  private buyableCardActionAmount(
    effects: CardWithRules["effects"],
    actionType: string
  ) {
    const effect = effects.find(
      (candidate) =>
        this.cardActionType(candidate.effectType) === actionType &&
        candidate.effectType !== "conditional_cash_delta" &&
        !this.effectIsAutomatic(candidate)
    );
    return effect?.amountCents === null || effect?.amountCents === undefined
      ? null
      : BigInt(cents(effect.amountCents));
  }

  private effectAmount(effect: CardWithRules["effects"][number]) {
    return BigInt(cents(effect.amountCents));
  }

  private effectPayload(effect: CardWithRules["effects"][number]) {
    return isPlainObject(effect.payload) ? effect.payload : {};
  }

  private effectIsAutomatic(effect: CardWithRules["effects"][number]) {
    const payload = this.effectPayload(effect);
    return payload.automatic === true || payload.mode === "automatic";
  }

  private effectIsMandatory(effect: CardWithRules["effects"][number]) {
    const payload = this.effectPayload(effect);
    return payload.mandatory === true || payload.required === true;
  }

  private payloadMoney(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    if (value === null || value === undefined || value === "") return null;
    const amount = typeof value === "number" ? value : Number(value);
    return Number.isFinite(amount) ? BigInt(Math.round(amount)) : null;
  }

  private payloadText(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private async applyStockQuantityEffect(
    tx: Tx,
    gameId: string,
    title: string,
    symbol: string | undefined,
    actionType: string,
    amount: bigint,
    emittedEvents: PendingEvent[]
  ) {
    const normalizedSymbol = symbol?.trim();
    const affectedPlayerIds = new Set<string>();
    if (!normalizedSymbol) return affectedPlayerIds;

    const assets = await tx.playerAsset.findMany({
      where: {
        status: AssetStatus.ACTIVE,
        symbol: normalizedSymbol,
        gamePlayer: { gameId }
      },
      select: {
        id: true,
        gamePlayerId: true,
        quantity: true,
        units: true
      }
    });

    const factor = Number(amount);
    for (const asset of assets) {
      const beforeQuantity = asset.quantity;
      let afterQuantity = beforeQuantity;
      let update: Prisma.PlayerAssetUpdateInput | null = null;

      if (actionType === cardActionTypes.assetQuantityMultiply && factor > 0) {
        afterQuantity = beforeQuantity * factor;
        update = {
          quantity: afterQuantity,
          units: asset.units * factor
        };
      }

      if (actionType === cardActionTypes.assetQuantityDivide && factor > 0) {
        afterQuantity = Math.floor(beforeQuantity / factor);
        update =
          afterQuantity > 0
            ? {
                quantity: afterQuantity,
                units: Math.floor(asset.units / factor)
              }
            : {
                quantity: 0,
                units: 0,
                costBasisCents: 0n,
                marketValueCents: 0n,
                cashflowCents: 0n,
                status: AssetStatus.SOLD,
                soldAt: new Date()
              };
      }

      if (actionType === cardActionTypes.assetWipeout) {
        afterQuantity = 0;
        update = {
          quantity: 0,
          units: 0,
          costBasisCents: 0n,
          marketValueCents: 0n,
          cashflowCents: 0n,
          status: AssetStatus.SOLD,
          soldAt: new Date()
        };
      }

      if (!update || afterQuantity === beforeQuantity) continue;
      await tx.playerAsset.update({
        where: { id: asset.id },
        data: update
      });
      affectedPlayerIds.add(asset.gamePlayerId);
      emittedEvents.push({
        type: "card:stock_quantity_changed",
        gamePlayerId: asset.gamePlayerId,
        payload: {
          title,
          symbol: normalizedSymbol,
          effectType: actionType,
          beforeQuantity,
          afterQuantity
        }
      });
    }

    if (affectedPlayerIds.size === 0) {
      emittedEvents.push({
        type: "card:no_matching_assets",
        payload: {
          title,
          symbol: normalizedSymbol,
          effectType: actionType
        }
      });
    }

    return affectedPlayerIds;
  }

  private async cardConditionsMet(
    tx: Tx,
    gamePlayerId: string,
    card: { conditions: Array<{ condType: string }> }
  ) {
    for (const condition of card.conditions) {
      if (condition.condType === "has_rental_realestate") {
        if (!(await this.hasRentalRealEstate(tx, gamePlayerId))) return false;
        continue;
      }
      if (condition.condType === "has_8_plex") {
        if (!(await this.hasAssetMatching(tx, gamePlayerId, /8[\s-]*(кв|plex)|8-квартир/i))) {
          return false;
        }
        continue;
      }
      if (condition.condType === "has_children") {
        const state = await tx.playerFinancialState.findUniqueOrThrow({
          where: { gamePlayerId }
        });
        if (state.childrenCount === 0) return false;
      }
    }
    return true;
  }

  private async hasRentalRealEstate(tx: Tx, gamePlayerId: string) {
    const assets = await tx.playerAsset.findMany({
      where: { gamePlayerId, status: AssetStatus.ACTIVE },
      include: {
        sourceCard: {
          select: {
            title: true,
            bodyText: true,
            category: true,
            subcategory: true
          }
        }
      }
    });

    return assets.some((asset) => {
      const sourceCard = asset.sourceCard;
      return isRentalRealEstateAsset(
        [
          asset.type,
          asset.name,
          sourceCard?.title,
          sourceCard?.bodyText,
          sourceCard?.category,
          sourceCard?.subcategory
        ]
          .filter(Boolean)
          .join(" ")
      );
    });
  }

  private async hasAssetMatching(tx: Tx, gamePlayerId: string, pattern: RegExp) {
    const assets = await tx.playerAsset.findMany({
      where: { gamePlayerId, status: AssetStatus.ACTIVE },
      include: {
        sourceCard: {
          select: {
            title: true,
            bodyText: true,
            category: true,
            subcategory: true
          }
        }
      }
    });

    return assets.some((asset) => {
      const sourceCard = asset.sourceCard;
      const text = [
        asset.type,
        asset.name,
        sourceCard?.title,
        sourceCard?.bodyText,
        sourceCard?.category,
        sourceCard?.subcategory
      ]
        .filter(Boolean)
        .join(" ");
      return pattern.test(text);
    });
  }

  private async recalculatePlayer(
    tx: Tx,
    gamePlayerId: string,
    emittedEvents?: PendingEvent[]
  ) {
    const [state, assets, liabilities] = await Promise.all([
      tx.playerFinancialState.findUniqueOrThrow({ where: { gamePlayerId } }),
      tx.playerAsset.findMany({
        where: { gamePlayerId, status: AssetStatus.ACTIVE }
      }),
      tx.playerLiability.findMany({ where: { gamePlayerId } })
    ]);

    const assetCashflow = assets.reduce(
      (sum, asset) => sum + asset.cashflowCents,
      0n
    );
    const liabilityPayments = liabilities.reduce(
      (sum, liability) => sum + liability.paymentCents,
      0n
    );
    const childrenExpense =
      state.perChildCostCents * BigInt(state.childrenCount);
    const passiveIncome = state.basePassiveIncomeCents + assetCashflow;
    const totalIncome = state.salaryCents + passiveIncome;
    const totalExpenses =
      state.baseExpensesCents + liabilityPayments + childrenExpense;

    const updated = await tx.playerFinancialState.update({
      where: { gamePlayerId },
      data: {
        passiveIncomeCents: passiveIncome,
        totalIncomeCents: totalIncome,
        totalExpensesCents: totalExpenses,
        monthlyCashflowCents: totalIncome - totalExpenses
      }
    });

    const deficit = updated.monthlyCashflowCents < 0n
      ? updated.monthlyCashflowCents * -1n
      : 0n;
    const canDeclare =
      updated.bankruptcyStatus === BankruptcyStatus.NONE ||
      updated.bankruptcyStatus === BankruptcyStatus.RECOVERED;
    if (canDeclare && deficit > 0n && updated.cashCents < deficit) {
      const declared = await tx.playerFinancialState.update({
        where: { gamePlayerId },
        data: {
          bankruptcyStatus: BankruptcyStatus.LIQUIDATING,
          bankruptcyTurns: 0,
          bankruptcyDeclaredAt: new Date(),
          bankruptcyEliminatedAt: null
        }
      });
      emittedEvents?.push({
        type: "bankruptcy:declared",
        gamePlayerId,
        payload: {
          cashCents: cents(declared.cashCents),
          monthlyCashflowCents: cents(declared.monthlyCashflowCents),
          deficitCents: cents(deficit)
        }
      });

      const activeAssets = await tx.playerAsset.count({
        where: { gamePlayerId, status: AssetStatus.ACTIVE }
      });
      if (activeAssets === 0) {
        await this.resolveBankruptcy(tx, gamePlayerId, emittedEvents ?? []);
      }
      return declared;
    }

    return updated;
  }

  private async resolveBankruptcy(
    tx: Tx,
    gamePlayerId: string,
    emittedEvents: PendingEvent[]
  ) {
    let state = await tx.playerFinancialState.findUniqueOrThrow({
      where: { gamePlayerId }
    });
    if (state.bankruptcyStatus !== BankruptcyStatus.LIQUIDATING) return state;

    if (state.monthlyCashflowCents > 0n) {
      state = await tx.playerFinancialState.update({
        where: { gamePlayerId },
        data: {
          bankruptcyStatus: BankruptcyStatus.RECOVERED,
          bankruptcyTurns: 3
        }
      });
      emittedEvents.push({
        type: "bankruptcy:recovered",
        gamePlayerId,
        payload: { turnsToSkip: 3, monthlyCashflowCents: cents(state.monthlyCashflowCents) }
      });
      return state;
    }

    const activeAssets = await tx.playerAsset.count({
      where: { gamePlayerId, status: AssetStatus.ACTIVE }
    });
    if (activeAssets > 0) return state;

    const payableLiabilities = await tx.playerLiability.count({
      where: { gamePlayerId, balanceCents: { gt: 0n } }
    });
    if (state.cashCents > 0n && payableLiabilities > 0) return state;

    const reducibleTypes = ["car_debt", "credit_cards", "retail_debt"];
    const reducible = await tx.playerLiability.findMany({
      where: { gamePlayerId, type: { in: reducibleTypes } }
    });
    if (reducible.length > 0) {
      for (const liability of reducible) {
        await tx.playerLiability.update({
          where: { id: liability.id },
          data: {
            balanceCents: liability.balanceCents / 2n,
            paymentCents: liability.paymentCents / 2n
          }
        });
      }
      emittedEvents.push({
        type: "bankruptcy:debts_halved",
        gamePlayerId,
        payload: { liabilityTypes: reducibleTypes }
      });
      state = await this.recalculatePlayer(tx, gamePlayerId);
    }

    if (state.monthlyCashflowCents > 0n) {
      state = await tx.playerFinancialState.update({
        where: { gamePlayerId },
        data: { bankruptcyStatus: BankruptcyStatus.RECOVERED, bankruptcyTurns: 3 }
      });
      emittedEvents.push({
        type: "bankruptcy:recovered",
        gamePlayerId,
        payload: { turnsToSkip: 3, monthlyCashflowCents: cents(state.monthlyCashflowCents) }
      });
      return state;
    }

    const playerBeforeElimination = await tx.gamePlayer.findUniqueOrThrow({
      where: { id: gamePlayerId },
      select: { gameId: true, controller: true }
    });
    const [game, activePlayers] = await Promise.all([
      tx.game.findUniqueOrThrow({
        where: { id: playerBeforeElimination.gameId },
        select: { currentTurnIndex: true, mode: true, settings: true }
      }),
      tx.gamePlayer.findMany({
        where: {
          gameId: playerBeforeElimination.gameId,
          role: GameRole.PLAYER,
          status: GamePlayerStatus.JOINED
        },
        select: { id: true },
        orderBy: { seat: "asc" }
      })
    ]);
    const eliminatedIndex = activePlayers.findIndex((player) => player.id === gamePlayerId);
    const currentIndex = activePlayers.length > 0
      ? game.currentTurnIndex % activePlayers.length
      : 0;

    state = await tx.playerFinancialState.update({
      where: { gamePlayerId },
      data: {
        bankruptcyStatus: BankruptcyStatus.ELIMINATED,
        bankruptcyTurns: 0,
        bankruptcyEliminatedAt: new Date()
      }
    });
    const player = await tx.gamePlayer.update({
      where: { id: gamePlayerId },
      data: { status: GamePlayerStatus.BANKRUPT, leftAt: new Date() },
      select: { gameId: true }
    });
    if (eliminatedIndex >= 0 && eliminatedIndex < currentIndex) {
      await tx.game.update({
        where: { id: player.gameId },
        data: { currentTurnIndex: currentIndex - 1 }
      });
    }
    emittedEvents.push({
      type: "bankruptcy:eliminated",
      gamePlayerId,
      payload: { monthlyCashflowCents: cents(state.monthlyCashflowCents) }
    });

    const remainingPlayers = await tx.gamePlayer.findMany({
      where: {
        gameId: player.gameId,
        role: GameRole.PLAYER,
        status: GamePlayerStatus.JOINED
      },
      select: { id: true, controller: true }
    });
    const soloHumanEliminated =
      game.mode === GameMode.SOLO &&
      playerBeforeElimination.controller === PlayerController.HUMAN;
    const soloBotsEliminated =
      game.mode === GameMode.SOLO &&
      remainingPlayers.some((candidate) => candidate.controller === PlayerController.HUMAN) &&
      remainingPlayers.every((candidate) => candidate.controller !== PlayerController.BOT);
    if (remainingPlayers.length === 0 || soloHumanEliminated || soloBotsEliminated) {
      await tx.game.update({
        where: { id: player.gameId },
        data: {
          status: GameStatus.ENDED,
          endedAt: new Date(),
          currentTurnIndex: 0,
          settings: this.settingsWithPending(game.settings, null)
        }
      });
      emittedEvents.push({
        type: realtimeEvents.gameEnded,
        payload: {
          reason: soloHumanEliminated
            ? "human_bankrupt"
            : soloBotsEliminated
              ? "bots_eliminated"
              : "all_players_bankrupt"
        }
      });
    }
    return state;
  }

  private async checkAnyGameWon(
    tx: Tx,
    gameId: string,
    emittedEvents: PendingEvent[]
  ) {
    const players = await tx.gamePlayer.findMany({
      where: {
        gameId,
        role: GameRole.PLAYER,
        status: GamePlayerStatus.JOINED
      },
      include: { financialState: true },
      orderBy: { seat: "asc" }
    });
    const winner = players.find((player) => {
      const state = player.financialState;
      return (
        state &&
        !state.wonAt &&
        canEscapeRatRace(
          cents(state.passiveIncomeCents),
          cents(state.totalExpensesCents)
        )
      );
    });
    return winner
      ? this.checkGameWon(tx, winner.id, emittedEvents)
      : false;
  }

  private async checkGameWon(
    tx: Tx,
    gamePlayerId: string,
    emittedEvents: PendingEvent[]
  ) {
    const player = await tx.gamePlayer.findUniqueOrThrow({
      where: { id: gamePlayerId },
      include: { financialState: true, game: true }
    });
    const state = player.financialState;
    if (
      !state ||
      state.wonAt ||
      player.game.status !== GameStatus.IN_PROGRESS
    ) {
      return false;
    }
    if (
      canEscapeRatRace(
        cents(state.passiveIncomeCents),
        cents(state.totalExpensesCents)
      )
    ) {
      const wonAt = new Date();
      await tx.game.update({
        where: { id: player.gameId },
        data: {
          status: GameStatus.ENDED,
          endedAt: wonAt,
          settings: this.settingsWithPending(player.game.settings, null)
        }
      });
      await tx.playerFinancialState.update({
        where: { gamePlayerId },
        data: {
          escapedRatRaceAt: wonAt,
          wonAt
        }
      });
      emittedEvents.push({
        type: realtimeEvents.gameEnded,
        gamePlayerId,
        payload: {
          reason: "financial_freedom",
          winnerGamePlayerId: gamePlayerId,
          passiveIncomeCents: Number(state.passiveIncomeCents),
          totalExpensesCents: Number(state.totalExpensesCents)
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "financial_freedom_reached" }
      });
      return true;
    }
    return false;
  }

  private async advanceTurn(
    tx: Tx,
    game: { id: string; currentRound: number; currentTurnIndex: number },
    activeIndex: number
  ) {
    const playerCount = await tx.gamePlayer.count({
      where: {
        gameId: game.id,
        role: GameRole.PLAYER,
        status: GamePlayerStatus.JOINED
      }
    });
    const nextIndex = playerCount === 0 ? 0 : (activeIndex + 1) % playerCount;
    const data: Prisma.GameUpdateInput = {
      currentTurnIndex: nextIndex
    };
    if (nextIndex === 0) data.currentRound = { increment: 1 };

    await tx.game.update({
      where: { id: game.id },
      data
    });
  }

  private async drawCardFromDeck(
    tx: Tx,
    gameId: string,
    settings: Prisma.JsonValue,
    cardType: CardType
  ): Promise<CardDeckDrawResult> {
    const game = await tx.game.findUniqueOrThrow({
      where: { id: gameId },
      select: { cardSetId: true }
    });
    const baseSettings = this.normalizedSettings(settings);
    const cardDecks = baseSettings.cardDecks
      ? { ...baseSettings.cardDecks }
      : await this.initialCardDecks(tx, game.cardSetId);
    if (!cardDecks[cardType]) {
      const initialized = await this.initialCardDecks(tx, game.cardSetId);
      for (const deckCardType of Object.values(CardType)) {
        cardDecks[deckCardType] ??= initialized[deckCardType] ?? {
          drawPile: [],
          discardPile: [],
          deckSize: 0
        };
      }
    }
    let deck = this.normalizedDeck(cardDecks[cardType]);
    if (deck.drawPile.length === 0 && deck.discardPile.length > 0) {
      deck = {
        drawPile: this.shuffled(deck.discardPile),
        discardPile: [],
        deckSize: deck.discardPile.length
      };
    }
    if (deck.drawPile.length === 0) {
      throw new BadRequestException(`Не найдены карточки типа ${cardTypeLabel(cardType)}`);
    }

    const reshuffled = this.normalizedDeck(cardDecks[cardType]).drawPile.length === 0;
    const deckPosition = deck.deckSize - deck.drawPile.length + 1;
    const cardId = deck.drawPile[0];
    if (!cardId) {
      throw new BadRequestException(`Не найдены карточки типа ${cardTypeLabel(cardType)}`);
    }
    const drawPile = deck.drawPile.slice(1);
    const nextDeck: CardDeckState = {
      drawPile,
      discardPile: [...deck.discardPile, cardId],
      deckSize: deck.deckSize
    };
    const nextSettings: GameSettings = {
      ...baseSettings,
      cardDecks: {
        ...cardDecks,
        [cardType]: nextDeck
      }
    };

    await tx.game.update({
      where: { id: gameId },
      data: { settings: nextSettings as Prisma.InputJsonValue }
    });

    const card = await tx.card.findUnique({
      where: { id: cardId },
      include: { meta: true, effects: true, conditions: true }
    });
    if (
      !card ||
      card.cardSetId !== game.cardSetId ||
      card.cardType !== cardType ||
      !card.isActive
    ) {
      throw new BadRequestException(`Не найдены карточки типа ${cardTypeLabel(cardType)}`);
    }

    return {
      card,
      settings: nextSettings as Prisma.JsonValue,
      drawState: {
        cardId,
        deckPosition,
        reshuffled,
        remainingInDeck: nextDeck.drawPile.length
      }
    };
  }

  private normalizedSettings(settings: Prisma.JsonValue): GameSettings {
    return settings && typeof settings === "object" && !Array.isArray(settings)
      ? ({ ...(settings as Record<string, unknown>) } as GameSettings)
      : {};
  }

  private async initialCardDecks(
    tx: Pick<Tx, "card">,
    cardSetId: string
  ): Promise<Partial<Record<CardType, CardDeckState>>> {
    const cards = await tx.card.findMany({
      where: { cardSetId, isActive: true },
      select: { id: true, cardType: true },
      orderBy: { id: "asc" }
    });
    const decks: Partial<Record<CardType, CardDeckState>> = {};
    for (const cardType of Object.values(CardType)) {
      const ids = cards
        .filter((card) => card.cardType === cardType)
        .map((card) => card.id);
      decks[cardType] = {
        drawPile: this.shuffled(ids),
        discardPile: [],
        deckSize: ids.length
      };
    }
    return decks;
  }

  private normalizedDeck(value: unknown): CardDeckState {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { drawPile: [], discardPile: [], deckSize: 0 };
    }
    const record = value as Record<string, unknown>;
    const drawPile = this.cardIdList(record.drawPile);
    const discardPile = this.cardIdList(record.discardPile);
    const deckSize =
      typeof record.deckSize === "number" && Number.isInteger(record.deckSize)
        ? Math.max(record.deckSize, drawPile.length + discardPile.length)
        : drawPile.length + discardPile.length;
    return { drawPile, discardPile, deckSize };
  }

  private cardIdList(value: unknown) {
    return Array.isArray(value)
      ? value.filter((cardId): cardId is number => Number.isInteger(cardId) && cardId > 0)
      : [];
  }

  private shuffled<T>(items: T[]) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      const current = shuffled[index]!;
      shuffled[index] = shuffled[swapIndex]!;
      shuffled[swapIndex] = current;
    }
    return shuffled;
  }

  private cardPayload(
    card: CardWithRules,
    drawState?: CardDrawState
  ) {
    return toSerializable({
      id: card.id,
      cardId: card.id,
      cardType: card.cardType,
      title: card.title,
      bodyText: card.bodyText,
      category: card.category,
      subcategory: card.subcategory,
      meta: this.metaMap(card.meta),
      effects: card.effects,
      conditions: card.conditions,
      ...(drawState
        ? {
            deckPosition: drawState.deckPosition,
            reshuffled: drawState.reshuffled,
            remainingInDeck: drawState.remainingInDeck
          }
        : {})
    });
  }

  private isStockDeal(
    card: { title: string; bodyText: string; category: string | null; subcategory: string | null },
    meta: Record<string, string>
  ) {
    const category = (card.category ?? "").toLowerCase();
    const subcategory = (card.subcategory ?? "").toLowerCase();
    const text = `${card.title}\n${card.bodyText}`.toLowerCase();
    return (
      Boolean(meta.symbol) ||
      category.includes("stock") ||
      subcategory.includes("stock") ||
      category.includes("share") ||
      subcategory.includes("share") ||
      /акци|stock|share/.test(text)
    );
  }

  private stockSymbol(
    card: { title: string; bodyText: string },
    meta: Record<string, string>
  ) {
    const explicitSymbol = meta.symbol?.trim();
    if (explicitSymbol) return explicitSymbol.toUpperCase();

    const text = `${card.title}\n${card.bodyText}`;
    const priceIndex = text.search(/сегодняшняя\s+цена|today(?:'s)?\s+price/iu);
    const beforePrice = priceIndex >= 0 ? text.slice(0, priceIndex) : text;
    const matches = [...beforePrice.matchAll(/\b[A-ZА-ЯЁ0-9]{2,12}\b/giu)]
      .map((match) => match[0].toUpperCase())
      .filter((value) => !["CO", "INC", "FUND"].includes(value));
    return matches.at(-1) ?? null;
  }

  private async stockSellerGamePlayerIds(tx: Tx, gameId: string, symbol: string) {
    const normalizedSymbol = symbol.toLowerCase();
    const assets = await tx.playerAsset.findMany({
      where: {
        status: AssetStatus.ACTIVE,
        quantity: { gt: 0 },
        gamePlayer: {
          gameId,
          role: GameRole.PLAYER,
          status: GamePlayerStatus.JOINED
        }
      },
      select: {
        gamePlayerId: true,
        symbol: true
      }
    });
    return [
      ...new Set(
        assets
          .filter((asset) => (asset.symbol ?? "").toLowerCase() === normalizedSymbol)
          .map((asset) => asset.gamePlayerId)
      )
    ];
  }

  private stockSaleWindowResolved(
    pending: Extract<GamePendingAction, { type: "stock_sale_window" }>
  ) {
    const resolved = new Set(pending.resolvedGamePlayerIds);
    return pending.sellerGamePlayerIds.every((gamePlayerId) => resolved.has(gamePlayerId));
  }

  private resolveStockSalePlayer(
    pending: Extract<GamePendingAction, { type: "stock_sale_window" }>,
    gamePlayerId: string
  ) {
    return {
      ...pending,
      resolvedGamePlayerIds: [
        ...new Set([...pending.resolvedGamePlayerIds, gamePlayerId])
      ]
    };
  }

  private dealUnitPriceCents(
    card: { title: string; bodyText: string },
    meta: Record<string, string>,
    stockDeal: boolean
  ) {
    if (stockDeal) {
      return (
        this.metaMoneyCents(meta, "today_price") ||
        this.metaMoneyCents(meta, "price") ||
        this.parseTodayPriceCents(`${card.title}\n${card.bodyText}`)
      );
    }

    return this.metaMoneyCents(meta, "price");
  }

  private metaMoneyCents(meta: Record<string, string>, key: string) {
    const value = meta[key];
    if (!value) return 0n;
    const amount = Number(value.replace(",", "."));
    if (!Number.isFinite(amount)) return 0n;
    return BigInt(Math.round(amount));
  }

  private parseTodayPriceCents(text: string) {
    const match = text.match(/(?:сегодняшняя\s+цена|today(?:'s)?\s+price)[^\d$]*\$?\s*(\d+(?:[.,]\d+)?)/iu);
    if (!match?.[1]) return 0n;
    const amount = Number(match[1].replace(",", "."));
    if (!Number.isFinite(amount)) return 0n;
    return BigInt(Math.round(amount));
  }

  private parseFirstMoneyCents(text: string) {
    const match = text.match(/\$\s*([0-9][0-9\s,.]*)/u);
    if (!match?.[1]) return 0n;
    const normalized = match[1].replace(/\s/g, "").replace(/,/g, "");
    const amount = Number(normalized);
    return Number.isFinite(amount) ? BigInt(Math.round(amount)) : 0n;
  }

  private parseNetworkMarketingCashflowCents(text: string) {
    const match =
      text.match(/денежный\s+поток\s*\$?\s*([+-]?\s*[0-9][0-9\s,.]*)/iu) ??
      text.match(/добавьте\s*\+?\s*\$?\s*([+-]?\s*[0-9][0-9\s,.]*)/iu);
    if (!match?.[1]) return null;

    const normalized = match[1].replace(/\s/g, "").replace(/,/g, "");
    const amount = Number(normalized);
    return Number.isFinite(amount) ? BigInt(Math.round(amount)) : null;
  }

  private metaMap(meta: Array<{ metaKey: string; metaValue: string }>) {
    return meta.reduce<Record<string, string>>((acc, item) => {
      acc[item.metaKey] = item.metaValue;
      return acc;
    }, {});
  }

  private pendingAction(settings: Prisma.JsonValue): GamePendingAction | null {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return null;
    }
    const pending = (settings as Record<string, unknown>).pendingAction;
    if (!pending || typeof pending !== "object" || Array.isArray(pending)) {
      return null;
    }
    const value = pending as Record<string, unknown>;
    if (value.type === "choose_deal" && typeof value.gamePlayerId === "string") {
      return {
        type: "choose_deal",
        gamePlayerId: value.gamePlayerId
      };
    }
    if (
      value.type === "deal_card_drawn" &&
      typeof value.gamePlayerId === "string" &&
      typeof value.cardId === "number" &&
      (value.cardType === "SMALL_DEAL" ||
        value.cardType === "BIG_DEAL" ||
        value.cardType === "FAST_TRACK")
    ) {
      return {
        type: "deal_card_drawn",
        gamePlayerId: value.gamePlayerId,
        cardId: value.cardId,
        cardType: value.cardType
      };
    }
    if (
      value.type === "stock_sale_window" &&
      typeof value.gamePlayerId === "string" &&
      typeof value.cardId === "number" &&
      (value.cardType === "SMALL_DEAL" ||
        value.cardType === "BIG_DEAL" ||
        value.cardType === "FAST_TRACK") &&
      typeof value.title === "string" &&
      typeof value.symbol === "string" &&
      typeof value.salePriceCents === "number" &&
      Array.isArray(value.sellerGamePlayerIds) &&
      Array.isArray(value.resolvedGamePlayerIds)
    ) {
      return {
        type: "stock_sale_window",
        gamePlayerId: value.gamePlayerId,
        cardId: value.cardId,
        cardType: value.cardType,
        title: value.title,
        symbol: value.symbol,
        salePriceCents: value.salePriceCents,
        sellerGamePlayerIds: value.sellerGamePlayerIds.filter(
          (item): item is string => typeof item === "string"
        ),
        resolvedGamePlayerIds: value.resolvedGamePlayerIds.filter(
          (item): item is string => typeof item === "string"
        )
      };
    }
    if (
      value.type === "charity_choice" &&
      typeof value.gamePlayerId === "string" &&
      typeof value.donationCents === "number" &&
      typeof value.turns === "number"
    ) {
      return {
        type: "charity_choice",
        gamePlayerId: value.gamePlayerId,
        donationCents: value.donationCents,
        turns: value.turns
      };
    }
    if (
      value.type === "doodad_payment_choice" &&
      typeof value.gamePlayerId === "string" &&
      typeof value.cardId === "number" &&
      typeof value.title === "string" &&
      typeof value.cashPriceCents === "number" &&
      typeof value.creditBalanceCents === "number" &&
      typeof value.creditPaymentCents === "number"
    ) {
      return {
        type: "doodad_payment_choice",
        gamePlayerId: value.gamePlayerId,
        cardId: value.cardId,
        title: value.title,
        cashPriceCents: value.cashPriceCents,
        creditBalanceCents: value.creditBalanceCents,
        creditPaymentCents: value.creditPaymentCents
      };
    }
    if (
      value.type === "market_sale" &&
      typeof value.gamePlayerId === "string" &&
      typeof value.cardId === "number" &&
      typeof value.title === "string" &&
      typeof value.assetId === "string" &&
      typeof value.assetName === "string" &&
      typeof value.salePriceCents === "number" &&
      typeof value.mortgageCents === "number" &&
      typeof value.proceedsCents === "number" &&
      typeof value.cashflowCents === "number"
    ) {
      const remainingOffers = Array.isArray(value.remainingOffers)
        ? value.remainingOffers.flatMap((candidate) => {
            const offer = this.marketSaleOfferState(candidate);
            return offer ? [offer] : [];
          })
        : [];
      return {
        type: "market_sale",
        gamePlayerId: value.gamePlayerId,
        cardId: value.cardId,
        title: value.title,
        assetId: value.assetId,
        assetName: value.assetName,
        salePriceCents: value.salePriceCents,
        mortgageCents: value.mortgageCents,
        proceedsCents: value.proceedsCents,
        cashflowCents: value.cashflowCents,
        netCashflowChangeCents:
          typeof value.netCashflowChangeCents === "number"
            ? value.netCashflowChangeCents
            : value.cashflowCents * -1,
        cashflowAdjustmentCents:
          typeof value.cashflowAdjustmentCents === "number"
            ? value.cashflowAdjustmentCents
            : 0,
        offerNumber:
          typeof value.offerNumber === "number" && value.offerNumber >= 1
            ? Math.floor(value.offerNumber)
            : 1,
        totalOffers:
          typeof value.totalOffers === "number" && value.totalOffers >= 1
            ? Math.floor(value.totalOffers)
            : 1 + remainingOffers.length,
        remainingOffers
      };
    }
    return null;
  }

  private marketSaleOfferState(value: unknown): MarketSaleOfferState | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const offer = value as Record<string, unknown>;
    if (
      typeof offer.gamePlayerId !== "string" ||
      typeof offer.assetId !== "string" ||
      typeof offer.assetName !== "string" ||
      typeof offer.salePriceCents !== "number" ||
      typeof offer.mortgageCents !== "number" ||
      typeof offer.proceedsCents !== "number" ||
      typeof offer.cashflowCents !== "number"
    ) {
      return null;
    }
    return {
      gamePlayerId: offer.gamePlayerId,
      assetId: offer.assetId,
      assetName: offer.assetName,
      salePriceCents: offer.salePriceCents,
      mortgageCents: offer.mortgageCents,
      proceedsCents: offer.proceedsCents,
      cashflowCents: offer.cashflowCents,
      netCashflowChangeCents:
        typeof offer.netCashflowChangeCents === "number"
          ? offer.netCashflowChangeCents
          : offer.cashflowCents * -1,
      cashflowAdjustmentCents:
        typeof offer.cashflowAdjustmentCents === "number"
          ? offer.cashflowAdjustmentCents
          : 0
    };
  }

  private settingsWithPending(
    settings: Prisma.JsonValue,
    pendingAction: GamePendingAction | null
  ): Prisma.JsonObject {
    const base =
      settings && typeof settings === "object" && !Array.isArray(settings)
        ? { ...(settings as Record<string, unknown>) }
        : {};
    if (pendingAction) {
      base.pendingAction = pendingAction;
    } else {
      delete base.pendingAction;
    }
    return base as Prisma.JsonObject;
  }

  private async syncGameTimelineIfNeeded(gameId: string) {
    const emittedEvents: PendingEvent[] = [];
    const transitioned = await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      const timeline = gameTimeline(game.settings, game.startedAt);
      const deadline = timeline.periodDeadlineAt;
      if (
        game.status !== GameStatus.IN_PROGRESS ||
        !deadline ||
        deadline.getTime() > Date.now()
      ) {
        return false;
      }

      const finalPeriod = timeline.currentPeriod >= timeline.periodCount;
      const update = await tx.game.updateMany({
        where: { id: gameId, status: GameStatus.IN_PROGRESS },
        data: finalPeriod
          ? {
              status: GameStatus.ENDED,
              endedAt: deadline,
              settings: this.settingsWithPending(game.settings, null)
            }
          : {
              status: GameStatus.PAUSED,
              settings: pauseGameTimeline(
                game.settings,
                game.startedAt,
                deadline,
                "period_complete"
              )
            }
      });
      if (update.count === 0) return false;

      if (finalPeriod) {
        emittedEvents.push({
          type: realtimeEvents.gameEnded,
          payload: {
            reason: "time_limit",
            deadlineAt: deadline.toISOString(),
            currentPeriod: timeline.currentPeriod,
            periodCount: timeline.periodCount
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "time_limit_reached" }
        });
      } else {
        emittedEvents.push({
          type: realtimeEvents.gamePaused,
          payload: {
            reason: "period_complete",
            currentPeriod: timeline.currentPeriod,
            periodCount: timeline.periodCount
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "period_complete" }
        });
      }
      await this.appendEvents(tx, gameId, null, emittedEvents);
      return true;
    });
    return transitioned ? emittedEvents : null;
  }

  private async expireGameIfNeeded(gameId: string) {
    return this.syncGameTimelineIfNeeded(gameId);
  }

  private botGamePlayerId(actorId: string) {
    return actorId.startsWith(botActorPrefix)
      ? actorId.slice(botActorPrefix.length)
      : null;
  }

  private humanActorUserId(actorId: string) {
    return this.botGamePlayerId(actorId) ? null : actorId;
  }

  private playerControlledBy(
    player: { id: string; userId: string | null; controller: PlayerController },
    actorId: string
  ) {
    const botGamePlayerId = this.botGamePlayerId(actorId);
    return botGamePlayerId
      ? player.controller === PlayerController.BOT && player.id === botGamePlayerId
      : player.controller === PlayerController.HUMAN && player.userId === actorId;
  }

  private async requirePlayer(
    tx: Tx,
    gameId: string,
    userId: string,
    allowLiquidation = false
  ) {
    const botGamePlayerId = this.botGamePlayerId(userId);
    const player = await tx.gamePlayer.findFirst({
      where: botGamePlayerId
        ? {
            id: botGamePlayerId,
            gameId,
            controller: PlayerController.BOT,
            status: "JOINED"
          }
        : {
            gameId,
            userId,
            controller: PlayerController.HUMAN,
            status: "JOINED"
          },
      include: {
        financialState: true,
        game: { select: { status: true } }
      }
    });
    if (!player) throw new ForbiddenException("Вы не участвуете в этой игре");
    if (player.role !== GameRole.PLAYER) {
      throw new ForbiddenException("Это действие доступно только игрокам");
    }
    if (player.game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException("Игра на паузе или ещё не началась");
    }
    if (
      !allowLiquidation &&
      player.financialState?.bankruptcyStatus === BankruptcyStatus.LIQUIDATING
    ) {
      throw new BadRequestException("Сначала завершите процедуру банкротства");
    }
    return player;
  }

  private async ensureGameAccess(gameId: string, userId: string) {
    const player = await this.prisma.gamePlayer.findFirst({
      where: {
        gameId,
        userId,
        status: { in: [GamePlayerStatus.JOINED, GamePlayerStatus.BANKRUPT] }
      }
    });
    if (!player && (await this.canManageGame(gameId, userId))) {
      return null;
    }
    if (!player) throw new ForbiddenException("Вы не участвуете в этой игре");
    return player;
  }

  private async ensureCanManageGame(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });
    if (!game) throw new NotFoundException("Игра не найдена");
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, status: true }
    });
    const admin = user.role === SystemRole.ADMIN;
    const soloCreator =
      game.mode === GameMode.SOLO && game.createdById === userId;
    const hostCreator =
      user.role === SystemRole.HOST && game.createdById === userId;
    const gameHost = game.players.some(
      (player) => player.userId === userId && player.role === GameRole.HOST
    );
    if (
      user.status !== AccountStatus.ACTIVE ||
      (!admin && !soloCreator && !hostCreator && !gameHost)
    ) {
      throw new ForbiddenException("Управлять игрой могут только ведущий или администратор");
    }
    return game;
  }

  private async ensureHostOrAdmin(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, status: true }
    });
    if (
      user.status !== AccountStatus.ACTIVE ||
      (user.role !== SystemRole.HOST && user.role !== SystemRole.ADMIN)
    ) {
      throw new ForbiddenException("Создавать игры могут только ведущий или администратор");
    }
    return user;
  }

  private async requirePlayableCardSet(cardSetId?: string) {
    const cardSet = cardSetId
      ? await this.prisma.cardSet.findUnique({
          where: { id: cardSetId },
          select: { id: true, name: true }
        })
      : await this.prisma.cardSet.findFirst({
          where: { isDefault: true },
          select: { id: true, name: true }
        });
    if (!cardSet) throw new NotFoundException("Набор карточек не найден");

    const counts = await this.prisma.card.groupBy({
      by: ["cardType"],
      where: { cardSetId: cardSet.id, isActive: true },
      _count: { _all: true }
    });
    const missingTypes = missingCardTypes(
      counts.map((row) => ({ cardType: row.cardType, count: row._count._all }))
    );
    if (missingTypes.length > 0) {
      throw new BadRequestException(
        `В наборе «${cardSet.name}» не хватает карточек: ${missingTypes
          .map((cardType) => cardTypeLabel(cardType))
          .join(", ")}`
      );
    }
    return cardSet;
  }

  private async canManageGame(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });
    if (!game) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true }
    });
    if (!user || user.status !== AccountStatus.ACTIVE) return false;
    if (user.role === SystemRole.ADMIN) return true;
    if (game.mode === GameMode.SOLO && game.createdById === userId) return true;
    return (
      user.role === SystemRole.HOST &&
      (game.createdById === userId ||
        game.players.some(
          (player) => player.userId === userId && player.role === GameRole.HOST
        ))
    );
  }

  private async appendEvents(
    tx: Tx,
    gameId: string,
    actorUserId: string | null,
    events: PendingEvent[]
  ) {
    if (events.length === 0) return;
    const persistedActorUserId = actorUserId
      ? this.humanActorUserId(actorUserId)
      : null;
    let sequence =
      (await tx.gameEvent.count({
        where: { gameId }
      })) + 1;

    const stateSnapshot = await this.compactSnapshot(tx, gameId);

    for (const event of events) {
      const data: Prisma.GameEventUncheckedCreateInput = {
        gameId,
          actorUserId: persistedActorUserId,
        gamePlayerId: event.gamePlayerId ?? null,
        type: event.type,
        sequence,
        payload: toSerializable(event.payload) as Prisma.InputJsonValue
      };
      if (event.type === realtimeEvents.stateUpdate) {
        data.stateSnapshot = stateSnapshot as unknown as Prisma.InputJsonValue;
      }

      await tx.gameEvent.create({
        data
      });
      sequence += 1;
    }

    if (events.some((event) => event.type === realtimeEvents.gameEnded)) {
      const announcement = await tx.telegramAnnouncement.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: "desc" }
      });
      await tx.gameSummary.upsert({
        where: { gameId },
        create: {
          gameId,
          announcementId: announcement?.id ?? null,
          sourceSequence: sequence - 1
        },
        update: {
          ...(announcement ? { announcementId: announcement.id } : {}),
          sourceSequence: sequence - 1,
          status: "PENDING",
          lastError: null
        }
      });
    }
  }

  private async compactSnapshot(tx: Tx, gameId: string) {
    const game = await tx.game.findUniqueOrThrow({
      where: { id: gameId },
      include: {
        players: {
          include: {
            financialState: true,
            assets: { where: { status: AssetStatus.ACTIVE } },
            liabilities: true
          },
          orderBy: { seat: "asc" }
        }
      }
    });

    return toSerializable({
      game: {
        id: game.id,
        status: game.status,
        currentTurnIndex: game.currentTurnIndex,
        currentRound: game.currentRound
      },
      players: game.players.map((player) => ({
        id: player.id,
        userId: player.userId,
        seat: player.seat,
        role: player.role,
        track: player.track,
        position: player.position,
        fastTrackPosition: player.fastTrackPosition,
        financialState: player.financialState,
        assets: player.assets,
        liabilities: player.liabilities
      }))
    });
  }

  private async snapshot(gameId: string) {
    const game = await this.prisma.game.findUniqueOrThrow({
      where: { id: gameId },
      include: {
        cardSet: { select: { id: true, name: true } },
        players: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                figurine: true,
                gameRoomView: true
              }
            },
            profession: true,
            financialState: true,
            assets: {
              where: { status: AssetStatus.ACTIVE },
              include: { sourceCard: true },
              orderBy: { createdAt: "asc" }
            },
            liabilities: { orderBy: { createdAt: "asc" } }
          },
          orderBy: [{ seat: "asc" }, { joinedAt: "asc" }]
        },
        events: {
          include: {
            actor: { select: { id: true, displayName: true } },
            gamePlayer: { select: { id: true, seat: true, role: true } }
          },
          orderBy: { sequence: "desc" },
          take: 80
        },
        chatMessages: {
          include: {
            user: { select: { id: true, displayName: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    const activePlayers = game.players.filter(
      (player) => player.role === GameRole.PLAYER && player.status === "JOINED"
    );
    const currentPlayer =
      activePlayers.length > 0
        ? activePlayers[game.currentTurnIndex % activePlayers.length]
        : null;
    const timeline = gameTimeline(game.settings, game.startedAt);

    return toSerializable({
      game: {
        id: game.id,
        code: game.code,
        title: game.title,
        status: game.status,
        mode: game.mode,
        maxPlayers: game.maxPlayers,
        currentTurnIndex: game.currentTurnIndex,
        currentRound: game.currentRound,
        currentPlayerId: currentPlayer?.id ?? null,
        createdById: game.createdById,
        cardSet: game.cardSet,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        timeLimitMinutes: timeline.timeLimitMinutes,
        periodCount: timeline.periodCount,
        currentPeriod: timeline.currentPeriod,
        periodDeadlineAt: timeline.periodDeadlineAt,
        deadlineAt: timeline.periodDeadlineAt,
        remainingPeriodSeconds: timeline.remainingPeriodSeconds,
        pauseReason: timeline.pauseReason,
        pausedAt: timeline.pausedAt,
        pendingAction: this.pendingAction(game.settings)
      },
      board: ratRaceBoard,
      players: game.players,
      events: [...game.events].reverse(),
      chatMessages: [...game.chatMessages].reverse()
    });
  }

  private async actionResult(gameId: string, events: PendingEvent[]) {
    return {
      snapshot: await this.snapshot(gameId),
      events: events.map((event) => ({
        type: event.type,
        payload: event.payload
      }))
    };
  }

  private async generateGameCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
      const existing = await this.prisma.game.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error("Could not generate unique game code");
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bigintMax(left: bigint, right: bigint) {
  return left > right ? left : right;
}

function bigintMin(left: bigint, right: bigint) {
  return left < right ? left : right;
}

function proportionalAmount(amount: bigint, part: number, total: number) {
  if (total <= 0) return 0n;
  return (amount * BigInt(part)) / BigInt(total);
}
