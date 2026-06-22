import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AccountStatus,
  AssetStatus,
  BoardTrack,
  CardType,
  GamePlayerStatus,
  GameRole,
  GameStatus,
  Prisma,
  SystemRole
} from "@prisma/client";
import {
  cardActionTypes,
  canEscapeRatRace,
  legacyCardEffectAliases,
  moveOnCircularTrack,
  normalizeCardTypeForCell,
  ratRaceBoard,
  realtimeEvents,
  rollDie
} from "@cashflow/shared";
import { randomInt } from "node:crypto";
import { cents, toSerializable } from "../common/json";
import { PrismaService } from "../prisma/prisma.service";
import { AddGameUserDto } from "./dto/add-game-user.dto";
import { BuyDealDto } from "./dto/buy-deal.dto";
import { ChatDto } from "./dto/chat.dto";
import { CreateGameDto } from "./dto/create-game.dto";
import { DrawCardDto } from "./dto/draw-card.dto";
import { JoinGameDto } from "./dto/join-game.dto";
import { RepayLoanDto, TakeLoanDto } from "./dto/loan.dto";

type Tx = Prisma.TransactionClient;

interface PendingEvent {
  type: string;
  payload: Record<string, unknown>;
  gamePlayerId?: string | null;
}

type CardWithRules = {
  id: number;
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
      type: "charity_choice";
      gamePlayerId: string;
      donationCents: number;
      turns: number;
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
    };

interface GameSettings {
  pendingAction?: GamePendingAction | null;
  timeLimitMinutes?: number;
}

const defaultGameTimeLimitMinutes = 90;

const playerColors = [
  "#166534",
  "#b45309",
  "#991b1b",
  "#0f766e",
  "#7c2d12",
  "#3f3f46"
];

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async createGame(userId: string, dto: CreateGameDto) {
    await this.ensureHostOrAdmin(userId);

    const code = await this.generateGameCode();
    const game = await this.prisma.game.create({
      data: {
        code,
        title: dto.title?.trim() || "Новая партия",
        maxPlayers: dto.maxPlayers ?? 6,
        settings: {
          timeLimitMinutes: dto.timeLimitMinutes ?? defaultGameTimeLimitMinutes
        },
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
        payload: toSerializable({ code: game.code, title: game.title })
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
          ...(canSeeAll
            ? {}
            : {
                players: {
                  none: { userId }
                }
              })
        },
        include: {
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
    await this.expireGameIfNeeded(gameId);
    return this.snapshot(gameId);
  }

  async joinGame(userId: string, dto: JoinGameDto) {
    const codeOrId = dto.codeOrId.trim();
    if (!codeOrId) throw new BadRequestException("Game code is required");
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
    if (!game) throw new NotFoundException("Game not found");
    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException("Only waiting games can be joined");
    }

    const existing = game.players.find((player) => player.userId === userId);
    if (existing) return this.snapshot(game.id);

    const role = dto.role ?? "PLAYER";
    const currentPlayers = game.players.filter(
      (player) => player.role === GameRole.PLAYER
    );
    if (role === "PLAYER" && currentPlayers.length >= game.maxPlayers) {
      throw new BadRequestException("Game is full");
    }

    const occupiedSeats = new Set(
      game.players
        .map((player) => player.seat)
        .filter((seat): seat is number => typeof seat === "number")
    );
    const seat: number | null =
      role === "PLAYER"
        ? (Array.from(
            { length: game.maxPlayers },
            (_value, index) => index + 1
          ).find((candidate) => !occupiedSeats.has(candidate)) ?? null)
        : null;
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
      throw new BadRequestException("userId or email is required");
    }
    if (dto.role === GameRole.HOST) {
      throw new BadRequestException("HOST role is assigned only to game creator");
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
    if (!targetUser) throw new NotFoundException("Active user not found");

    await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId },
        include: { players: true }
      });
      if (game.status !== GameStatus.WAITING) {
        throw new BadRequestException("Users can be added only before game start");
      }

      const existing = game.players.find(
        (player) => player.userId === targetUser.id
      );
      if (existing) return;

      const currentPlayers = game.players.filter(
        (player) => player.role === GameRole.PLAYER
      );
      if (dto.role === GameRole.PLAYER && currentPlayers.length >= game.maxPlayers) {
        throw new BadRequestException("Game is full");
      }

      const occupiedSeats = new Set(
        game.players
          .map((player) => player.seat)
          .filter((seat): seat is number => typeof seat === "number")
      );
      const seat =
        dto.role === GameRole.PLAYER
          ? (Array.from(
              { length: game.maxPlayers },
              (_value, index) => index + 1
            ).find((candidate) => !occupiedSeats.has(candidate)) ?? null)
          : null;
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
        throw new BadRequestException("Game is already started");
      }
      if (game.players.length < 2) {
        throw new BadRequestException("At least two players are required");
      }

      const professions = await tx.profession.findMany({
        where: { isActive: true },
        orderBy: { id: "asc" }
      });
      if (professions.length < game.players.length) {
        throw new BadRequestException("Not enough professions. Run db:seed.");
      }

      const shuffledProfessions = [...professions].sort(() => Math.random() - 0.5);

      for (const [index, player] of game.players.entries()) {
        const profession = shuffledProfessions[index];
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

      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.IN_PROGRESS,
          startedAt: new Date(),
          endedAt: null,
          currentTurnIndex: 0,
          currentRound: 1
        }
      });

      await this.appendEvents(tx, gameId, userId, [
        {
          type: "game:started",
          payload: {
            playerCount: game.players.length,
            timeLimitMinutes: this.timeLimitMinutes(game.settings)
          }
        },
        {
          type: realtimeEvents.stateUpdate,
          payload: { reason: "game_started" }
        }
      ]);
    });

    return this.actionResult(gameId, [
      { type: "game:started", payload: {} },
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
        throw new BadRequestException("Game is not in progress");
      }
      if (this.pendingAction(game.settings)) {
        throw new BadRequestException("Current player must finish pending action");
      }
      if (game.players.length === 0) {
        throw new BadRequestException("No active players");
      }

      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (!currentPlayer || currentPlayer.userId !== userId) {
        throw new ForbiddenException("It is not your turn");
      }
      if (!currentPlayer.financialState) {
        throw new BadRequestException("Financial state is not initialized");
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

      await this.recalculatePlayer(tx, currentPlayer.id);
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
            orderBy: { seat: "asc" }
          }
        }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException("Game is not in progress");
      }
      if (this.pendingAction(game.settings)) {
        throw new BadRequestException("Current player must finish pending action");
      }
      if (game.players.length === 0) {
        throw new BadRequestException("No active players");
      }

      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (!currentPlayer || currentPlayer.userId !== userId) {
        throw new ForbiddenException("It is not your turn");
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
          throw new ForbiddenException("Choose a deal only during your deal turn");
        }
      } else if (!currentPlayer || currentPlayer.id !== player.id) {
        throw new ForbiddenException("Draw a card only during your turn");
      } else if (pending) {
        throw new BadRequestException("Current player must finish pending action");
      }

      const card = await this.drawRandomCard(tx, dto.cardType);
      emittedEvents.push({
        type: realtimeEvents.cardDraw,
        gamePlayerId: player.id,
        payload: this.cardPayload(card)
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
          await this.recalculatePlayer(tx, player.id);
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
          await this.recalculatePlayer(tx, affectedPlayerId);
        }
        const gameWon = await this.checkAnyGameWon(tx, gameId, emittedEvents);
        if (gameWon) {
          await this.appendEvents(tx, gameId, userId, emittedEvents);
          return;
        }
        await tx.game.update({
          where: { id: gameId },
          data: { settings: this.settingsWithPending(game.settings, null) }
        });
        if (activeIndex !== null) {
          await this.advanceTurn(tx, game, activeIndex);
        }
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "automatic_card_resolved_turn_ended" }
        });
      } else if (isDealChoice) {
        await tx.game.update({
          where: { id: gameId },
          data: {
            settings: this.settingsWithPending(game.settings, {
              type: "deal_card_drawn",
              gamePlayerId: player.id,
              cardId: card.id,
              cardType: card.cardType as "SMALL_DEAL" | "BIG_DEAL"
            })
          }
        });
        emittedEvents.push({
          type: realtimeEvents.stateUpdate,
          payload: { reason: "deal_card_drawn" }
        });
      } else if (card.cardType === CardType.MARKET) {
        const offer = await this.findMarketSaleOffer(tx, player.id, card);
        if (offer) {
          await tx.game.update({
            where: { id: gameId },
            data: {
              settings: this.settingsWithPending(game.settings, {
                type: "market_sale",
                gamePlayerId: player.id,
                cardId: card.id,
                title: card.title,
                assetId: offer.assetId,
                assetName: offer.assetName,
                salePriceCents: offer.salePriceCents,
                mortgageCents: offer.mortgageCents,
                proceedsCents: offer.proceedsCents,
                cashflowCents: offer.cashflowCents
              })
            }
          });
          emittedEvents.push({
            type: "market:sale_offer",
            gamePlayerId: player.id,
            payload: {
              cardId: card.id,
              title: card.title,
              ...offer
            }
          });
          emittedEvents.push({
            type: realtimeEvents.stateUpdate,
            payload: { reason: "market_sale_offer" }
          });
        }
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
        pending?.type !== "deal_card_drawn" ||
        pending.gamePlayerId !== player.id ||
        pending.cardId !== dto.cardId
      ) {
        throw new ForbiddenException("This deal is not available now");
      }
      const card = await tx.card.findUnique({
        where: { id: dto.cardId },
        include: { meta: true, effects: true, conditions: true }
      });
      if (!card) throw new NotFoundException("Card not found");
      const buyableCardTypes: CardType[] = [
        CardType.SMALL_DEAL,
        CardType.BIG_DEAL,
        CardType.FAST_TRACK
      ];
      if (!buyableCardTypes.includes(card.cardType)) {
        throw new BadRequestException("This card is not buyable");
      }
      if (this.hasAutomaticCardEffects(card)) {
        throw new BadRequestException("This card resolves automatically");
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
            : this.metaMoneyCents(meta, "down_payment") || unitPriceCents;
      const cashflowCents =
        cashflowEffectAmount ?? BigInt(Math.round(Number(meta.cashflow_monthly ?? "0")));
      const totalDownPayment = downPaymentCents * BigInt(quantity);
      const beforeCashCents = state.cashCents;
      const afterCashCents = beforeCashCents - totalDownPayment;

      if (state.cashCents < totalDownPayment) {
        throw new BadRequestException("Not enough cash for down payment");
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
          symbol: meta.symbol ?? null,
          quantity,
          units: quantity,
          costBasisCents: unitPriceCents * BigInt(quantity),
          marketValueCents: unitPriceCents * BigInt(quantity),
          downPaymentCents: totalDownPayment,
          cashflowCents: cashflowCents * BigInt(quantity)
        }
      });

      await this.recalculatePlayer(tx, player.id);
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
        pending?.type !== "deal_card_drawn" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("No deal is waiting for your decision");
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
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        pending?.type !== "market_sale" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("No market sale is waiting for your decision");
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
      if (!asset) throw new NotFoundException("Asset not found");

      const proceeds = BigInt(pending.proceedsCents);
      if (proceeds < 0n && state.cashCents < proceeds * -1n) {
        throw new BadRequestException("Not enough cash to close this sale");
      }

      await tx.playerFinancialState.update({
        where: { gamePlayerId: player.id },
        data: {
          cashCents:
            proceeds >= 0n
              ? { increment: proceeds }
              : { decrement: proceeds * -1n }
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
      const updatedState = await this.recalculatePlayer(tx, player.id);
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
          beforeCashCents: cents(state.cashCents),
          afterCashCents: cents(updatedState.cashCents)
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
        payload: { reason: "market_sale_completed_turn_ended" }
      });
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
      const activeIndex = game.currentTurnIndex % game.players.length;
      const currentPlayer = game.players[activeIndex];
      if (
        !currentPlayer ||
        currentPlayer.id !== player.id ||
        pending?.type !== "market_sale" ||
        pending.gamePlayerId !== player.id
      ) {
        throw new ForbiddenException("No market sale is waiting for your decision");
      }

      await tx.game.update({
        where: { id: gameId },
        data: { settings: this.settingsWithPending(game.settings, null) }
      });
      await this.advanceTurn(tx, game, activeIndex);
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
          proceedsCents: pending.proceedsCents
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "market_sale_declined_turn_ended" }
      });
      await this.appendEvents(tx, gameId, userId, emittedEvents);
    });

    return this.actionResult(gameId, emittedEvents);
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
        throw new ForbiddenException("No charity choice is waiting for your decision");
      }

      const state = await tx.playerFinancialState.findUniqueOrThrow({
        where: { gamePlayerId: player.id }
      });
      const donation = BigInt(pending.donationCents);
      if (state.cashCents < donation) {
        throw new BadRequestException("Not enough cash for charity");
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
        throw new ForbiddenException("No charity choice is waiting for your decision");
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

  async takeLoan(gameId: string, userId: string, dto: TakeLoanDto) {
    const expirationEvents = await this.expireGameIfNeeded(gameId);
    if (expirationEvents) return this.actionResult(gameId, expirationEvents);
    const emittedEvents: PendingEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayer(tx, gameId, userId);
      const game = await tx.game.findUniqueOrThrow({
        where: { id: gameId }
      });
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new ForbiddenException("Loans are available only during an active game");
      }
      const amount = BigInt(dto.amountCents);
      if (dto.amountCents < 1000 || dto.amountCents % 1000 !== 0) {
        throw new BadRequestException("Loan amount must be a multiple of 1000");
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
      await this.recalculatePlayer(tx, player.id);

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
      const amount = BigInt(dto.amountCents);
      if (state.cashCents < amount) {
        throw new BadRequestException("Not enough cash to repay loan");
      }

      const liability = dto.liabilityId
        ? await tx.playerLiability.findFirst({
            where: { id: dto.liabilityId, gamePlayerId: player.id }
          })
        : await tx.playerLiability.findFirst({
            where: { gamePlayerId: player.id, type: "bank_loan" },
            orderBy: { createdAt: "asc" }
          });

      if (!liability) throw new NotFoundException("Loan not found");
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

      await this.recalculatePlayer(tx, player.id);
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
    const cards = await this.prisma.card.findMany({
      where: cardType ? { isActive: true, cardType } : { isActive: true },
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
    if (cardType) {
      const card = await this.drawRandomCard(tx, cardType);
      emittedEvents.push({
        type: realtimeEvents.cardDraw,
        gamePlayerId,
        payload: this.cardPayload(card)
      });

      if (cardType === CardType.MARKET) {
        const offer = await this.findMarketSaleOffer(tx, gamePlayerId, card);
        if (offer) {
          await tx.game.update({
            where: { id: gameId },
            data: {
              settings: this.settingsWithPending(gameSettings, {
                type: "market_sale",
                gamePlayerId,
                cardId: card.id,
                title: card.title,
                assetId: offer.assetId,
                assetName: offer.assetName,
                salePriceCents: offer.salePriceCents,
                mortgageCents: offer.mortgageCents,
                proceedsCents: offer.proceedsCents,
                cashflowCents: offer.cashflowCents
              })
            }
          });
          emittedEvents.push({
            type: "market:sale_offer",
            gamePlayerId,
            payload: {
              cardId: card.id,
              title: card.title,
              ...offer
            }
          });
          emittedEvents.push({
            type: realtimeEvents.stateUpdate,
            payload: { reason: "market_sale_offer" }
          });
          return true;
        }
      }

      if (cardType === CardType.DOODAD) {
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
          await this.recalculatePlayer(tx, affectedPlayerId);
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

  private async findMarketSaleOffer(tx: Tx, gamePlayerId: string, card: CardWithRules) {
    const marketText = this.normalizedSearchText(card.title, card.bodyText);
    if (this.marketSaleIsUnsupported(marketText)) return null;

    const targetKeys = this.marketTargetKeys(marketText);
    if (targetKeys.length === 0) return null;

    const assets = await tx.playerAsset.findMany({
      where: { gamePlayerId, status: AssetStatus.ACTIVE },
      include: {
        sourceCard: {
          include: { meta: true }
        }
      }
    });

    const offers = assets.flatMap((asset) => {
      const sourceCard = asset.sourceCard;
      const assetText = this.normalizedSearchText(
        asset.type,
        asset.name,
        sourceCard?.title,
        sourceCard?.bodyText,
        sourceCard?.category,
        sourceCard?.subcategory
      );
      if (!targetKeys.some((key) => this.assetMatchesMarketTarget(key, assetText))) {
        return [];
      }

      const salePrice = this.marketSalePriceCents(card, marketText, asset, assetText);
      if (salePrice <= 0n) return [];

      const sourceMeta = sourceCard ? this.metaMap(sourceCard.meta) : {};
      const mortgage =
        this.metaMoneyCents(sourceMeta, "mortgage") ||
        bigintMax(0n, asset.costBasisCents - asset.downPaymentCents);
      const proceeds = salePrice - mortgage;

      return [
        {
          assetId: asset.id,
          assetName: asset.name,
          salePriceCents: Number(salePrice),
          mortgageCents: Number(mortgage),
          proceedsCents: Number(proceeds),
          cashflowCents: Number(asset.cashflowCents)
        }
      ];
    });

    return offers.sort((left, right) => right.proceedsCents - left.proceedsCents)[0] ?? null;
  }

  private marketSaleIsUnsupported(marketText: string) {
    return (
      marketText.includes("племянник") ||
      marketText.includes("сдайте обратно в банк") ||
      marketText.includes("расширение малого бизнеса")
    );
  }

  private marketTargetKeys(marketText: string) {
    const keys: string[] = [];
    if (marketText.includes("10 гектар")) keys.push("land10");
    if (marketText.includes("20 гектар")) keys.push("land20");
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

  private assetMatchesMarketTarget(targetKey: string, assetText: string) {
    if (targetKey === "land10") return assetText.includes("10 гектар");
    if (targetKey === "land20") return assetText.includes("20 гектар");
    if (targetKey === "gold_coin") {
      return assetText.includes("золот") && assetText.includes("монет");
    }
    if (targetKey === "house2u") return assetText.includes("2у");
    if (targetKey === "house3m") return /\b3m\b|\b3м\b|3\/2|3br/.test(assetText);
    if (targetKey === "plex") {
      return /duplex|plex|[248][\s-]*(кв|квартир)/.test(assetText);
    }
    if (targetKey === "apartment") return assetText.includes("апартамент");
    if (targetKey === "carwash") return assetText.includes("автомой");
    if (targetKey === "kebab") return assetText.includes("шашлык");
    if (targetKey === "zirconium") return assetText.includes("циркони");
    if (targetKey === "software") return assetText.includes("программ");
    if (targetKey === "beauty_salon") {
      return assetText.includes("салон") && assetText.includes("крас");
    }
    if (targetKey === "partnership") return assetText.includes("партнерств");
    return false;
  }

  private marketSalePriceCents(
    card: CardWithRules,
    marketText: string,
    asset: { downPaymentCents: bigint; costBasisCents: bigint; quantity: number },
    assetText: string
  ) {
    const meta = this.metaMap(card.meta);

    if (marketText.includes("втрое")) {
      return asset.downPaymentCents * 3n;
    }
    if (marketText.includes("вдвое")) {
      return asset.downPaymentCents * 2n;
    }
    if (marketText.includes("первоначальную стоимость") && marketText.includes("50 000")) {
      return asset.costBasisCents + 50000n;
    }

    const basePrice =
      this.metaMoneyCents(meta, "price") ||
      this.parseFirstMoneyCents(`${card.title}\n${card.bodyText}`);
    if (basePrice <= 0n) return 0n;

    if (marketText.includes("каждый блок") || marketText.includes("каждый номер")) {
      return basePrice * BigInt(this.marketAssetUnits(assetText));
    }
    if (marketText.includes("каждую по") || marketText.includes("каждая по")) {
      return basePrice * BigInt(Math.max(asset.quantity, 1));
    }

    return basePrice;
  }

  private marketAssetUnits(assetText: string) {
    if (/24[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 24;
    if (/12[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 12;
    if (/8[\s-]*(кв|квартир|plex)/.test(assetText)) return 8;
    if (/4[\s-]*(кв|квартир|plex)|4х-кварт/.test(assetText)) return 4;
    if (/2[\s-]*(кв|квартир|plex)|duplex|двух-кварт/.test(assetText)) return 2;
    return 1;
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
      await this.recalculatePlayer(tx, affectedPlayerId);
    }
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
    const existing = await tx.playerAsset.findFirst({
      where: {
        gamePlayerId,
        type: "network_marketing",
        symbol: rule.company,
        status: AssetStatus.ACTIVE
      },
      orderBy: [{ quantity: "desc" }, { createdAt: "desc" }]
    });
    const currentLevel = existing?.quantity ?? 0;
    const requiredLevel = rule.level - 1;

    if (currentLevel !== requiredLevel) {
      emittedEvents.push({
        type: "network_marketing:discarded",
        gamePlayerId,
        payload: {
          cardId: card.id,
          title: card.title,
          company: rule.company,
          level: rule.level,
          currentLevel,
          requiredLevel,
          reason:
            rule.level === 1 && currentLevel > 0
              ? "already_has_level"
              : "missing_previous_level"
        }
      });
      return false;
    }

    const previousCashflowCents = existing?.cashflowCents ?? 0n;
    const assetName =
      card.title.trim() && card.title.trim() !== "-"
        ? card.title
        : `${rule.company}: ${rule.level} уровень`;
    if (existing) {
      await tx.playerAsset.update({
        where: { id: existing.id },
        data: {
          sourceCardId: card.id,
          name: assetName,
          quantity: rule.level,
          units: rule.level,
          cashflowCents: rule.cashflowCents
        }
      });
    } else {
      await tx.playerAsset.create({
        data: {
          gamePlayerId,
          sourceCardId: card.id,
          type: "network_marketing",
          name: assetName,
          symbol: rule.company,
          quantity: rule.level,
          units: rule.level,
          cashflowCents: rule.cashflowCents
        }
      });
    }

    emittedEvents.push({
      type: "network_marketing:level_applied",
      gamePlayerId,
      payload: {
        cardId: card.id,
        title: card.title,
        company: rule.company,
        level: rule.level,
        previousLevel: currentLevel,
        cashflowCents: Number(rule.cashflowCents),
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
    return this.hasAssetMatching(
      tx,
      gamePlayerId,
      /realestate|недвиж|дом|квартир|plex|duplex|коттедж|таунхаус|3m|2у|2br|3br/i
    );
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

  private async recalculatePlayer(tx: Tx, gamePlayerId: string) {
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

    return tx.playerFinancialState.update({
      where: { gamePlayerId },
      data: {
        passiveIncomeCents: passiveIncome,
        totalIncomeCents: totalIncome,
        totalExpensesCents: totalExpenses,
        monthlyCashflowCents: totalIncome - totalExpenses
      }
    });
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

  private async drawRandomCard(tx: Tx, cardType: CardType) {
    const count = await tx.card.count({
      where: { cardType, isActive: true }
    });
    if (count === 0) {
      throw new BadRequestException(`No cards found for ${cardType}`);
    }
    const card = await tx.card.findFirst({
      where: { cardType, isActive: true },
      include: { meta: true, effects: true, conditions: true },
      skip: randomInt(count)
    });
    if (!card) throw new BadRequestException(`No cards found for ${cardType}`);
    return card;
  }

  private cardPayload(card: Awaited<ReturnType<GamesService["drawRandomCard"]>>) {
    return toSerializable({
      id: card.id,
      cardType: card.cardType,
      title: card.title,
      bodyText: card.bodyText,
      category: card.category,
      subcategory: card.subcategory,
      meta: this.metaMap(card.meta),
      effects: card.effects,
      conditions: card.conditions
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
        cashflowCents: value.cashflowCents
      };
    }
    return null;
  }

  private settingsWithPending(
    settings: Prisma.JsonValue,
    pendingAction: GamePendingAction | null
  ) {
    const base =
      settings && typeof settings === "object" && !Array.isArray(settings)
        ? { ...(settings as Record<string, unknown>) }
        : {};
    if (pendingAction) {
      base.pendingAction = pendingAction;
    } else {
      delete base.pendingAction;
    }
    return base as Prisma.InputJsonValue;
  }

  private timeLimitMinutes(settings: Prisma.JsonValue) {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return defaultGameTimeLimitMinutes;
    }
    const value = (settings as Record<string, unknown>).timeLimitMinutes;
    return typeof value === "number" && Number.isInteger(value) && value > 0
      ? value
      : defaultGameTimeLimitMinutes;
  }

  private gameDeadline(startedAt: Date | null, settings: Prisma.JsonValue) {
    if (!startedAt) return null;
    return new Date(
      startedAt.getTime() + this.timeLimitMinutes(settings) * 60_000
    );
  }

  private async expireGameIfNeeded(gameId: string) {
    const emittedEvents: PendingEvent[] = [];
    const expired = await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      const deadline = this.gameDeadline(game.startedAt, game.settings);
      if (
        game.status !== GameStatus.IN_PROGRESS ||
        !deadline ||
        deadline.getTime() > Date.now()
      ) {
        return false;
      }

      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.ENDED,
          endedAt: deadline,
          settings: this.settingsWithPending(game.settings, null)
        }
      });
      emittedEvents.push({
        type: realtimeEvents.gameEnded,
        payload: {
          reason: "time_limit",
          deadlineAt: deadline.toISOString()
        }
      });
      emittedEvents.push({
        type: realtimeEvents.stateUpdate,
        payload: { reason: "time_limit_reached" }
      });
      await this.appendEvents(tx, gameId, null, emittedEvents);
      return true;
    });
    return expired ? emittedEvents : null;
  }

  private async requirePlayer(tx: Tx, gameId: string, userId: string) {
    const player = await tx.gamePlayer.findFirst({
      where: {
        gameId,
        userId,
        status: "JOINED"
      }
    });
    if (!player) throw new ForbiddenException("You are not in this game");
    if (player.role !== GameRole.PLAYER) {
      throw new ForbiddenException("Only players can perform this action");
    }
    return player;
  }

  private async ensureGameAccess(gameId: string, userId: string) {
    const player = await this.prisma.gamePlayer.findFirst({
      where: { gameId, userId, status: "JOINED" }
    });
    if (!player && (await this.canManageGame(gameId, userId))) {
      return null;
    }
    if (!player) throw new ForbiddenException("You are not in this game");
    return player;
  }

  private async ensureCanManageGame(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });
    if (!game) throw new NotFoundException("Game not found");
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, status: true }
    });
    const admin = user.role === SystemRole.ADMIN;
    const hostCreator =
      user.role === SystemRole.HOST && game.createdById === userId;
    const gameHost = game.players.some(
      (player) => player.userId === userId && player.role === GameRole.HOST
    );
    if (user.status !== AccountStatus.ACTIVE || (!admin && !hostCreator && !gameHost)) {
      throw new ForbiddenException("Only game host or admin can manage game");
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
      throw new ForbiddenException("Only host or admin can create games");
    }
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
    let sequence =
      (await tx.gameEvent.count({
        where: { gameId }
      })) + 1;

    const stateSnapshot = await this.compactSnapshot(tx, gameId);

    for (const event of events) {
      const data: Prisma.GameEventUncheckedCreateInput = {
        gameId,
        actorUserId,
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
        players: {
          include: {
            user: { select: { id: true, email: true, displayName: true } },
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
    const timeLimitMinutes = this.timeLimitMinutes(game.settings);
    const deadlineAt = this.gameDeadline(game.startedAt, game.settings);

    return toSerializable({
      game: {
        id: game.id,
        code: game.code,
        title: game.title,
        status: game.status,
        maxPlayers: game.maxPlayers,
        currentTurnIndex: game.currentTurnIndex,
        currentRound: game.currentRound,
        currentPlayerId: currentPlayer?.id ?? null,
        createdById: game.createdById,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        timeLimitMinutes,
        deadlineAt,
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
