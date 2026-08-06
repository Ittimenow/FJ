import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { GameMode, GameStatus, Prisma } from "@prisma/client";
import { toSerializable } from "../common/json";
import { PrismaService } from "../prisma/prisma.service";

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  status?: GameStatus;
  limit?: string;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async listGames(query: AnalyticsQuery) {
    const where = this.gameWhere(query);
    const limit = this.limit(query.limit, 200, 1000);

    const games = await this.prisma.game.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        mode: true,
        maxPlayers: true,
        currentRound: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, displayName: true } },
        players: {
          select: {
            id: true,
            userId: true,
            guestName: true,
            controller: true,
            botStrategy: true,
            role: true,
            status: true,
            seat: true,
            joinedAt: true,
            user: { select: { id: true, displayName: true } },
            profession: { select: { id: true, slug: true, name: true } },
            financialState: {
              select: {
                cashCents: true,
                passiveIncomeCents: true,
                totalIncomeCents: true,
                totalExpensesCents: true,
                monthlyCashflowCents: true,
                escapedRatRaceAt: true,
                wonAt: true
              }
            }
          },
          orderBy: { seat: "asc" }
        },
        _count: { select: { events: true, chatMessages: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return toSerializable(games.map((game) => this.gameSummary(game)));
  }

  async gameDetail(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        createdBy: { select: { id: true, displayName: true } },
        players: {
          include: {
            user: { select: { id: true, displayName: true } },
            profession: { select: { id: true, slug: true, name: true } },
            financialState: true,
            assets: {
              include: {
                sourceCard: {
                  select: {
                    id: true,
                    cardType: true,
                    title: true,
                    category: true,
                    subcategory: true
                  }
                }
              },
              orderBy: { createdAt: "asc" }
            },
            liabilities: { orderBy: { createdAt: "asc" } }
          },
          orderBy: { seat: "asc" }
        },
        _count: { select: { events: true, chatMessages: true } }
      }
    });

    if (!game) throw new NotFoundException("Game not found");
    return toSerializable({
      kind: "game_detail",
      game: this.gameSummary(game),
      players: game.players.map((player) => ({
        id: player.id,
        userId: player.userId,
        displayName: player.user?.displayName ?? player.guestName,
        guestName: player.guestName,
        controller: player.controller,
        botStrategy: player.botStrategy,
        role: player.role,
        status: player.status,
        seat: player.seat,
        track: player.track,
        position: player.position,
        fastTrackPosition: player.fastTrackPosition,
        joinedAt: player.joinedAt,
        leftAt: player.leftAt,
        profession: player.profession,
        financialState: player.financialState,
        assets: player.assets,
        liabilities: player.liabilities
      }))
    });
  }

  async replay(gameId: string) {
    const exists = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true }
    });
    if (!exists) throw new NotFoundException("Game not found");

    const events = await this.prisma.gameEvent.findMany({
      where: { gameId },
      orderBy: { sequence: "asc" },
      include: {
        actor: { select: { id: true, displayName: true } },
        gamePlayer: {
          select: {
            id: true,
            userId: true,
            guestName: true,
            controller: true,
            botStrategy: true,
            seat: true,
            role: true,
            user: { select: { id: true, displayName: true } }
          }
        }
      }
    });

    return toSerializable({
      kind: "game_replay",
      gameId,
      events: events.map((event) => ({
        id: event.id,
        gameId: event.gameId,
        gamePlayerId: event.gamePlayerId,
        actorUserId: event.actorUserId,
        type: event.type,
        sequence: event.sequence,
        version: event.version,
        payload: event.payload,
        stateSnapshot: event.stateSnapshot,
        createdAt: event.createdAt,
        actor: event.actor,
        gamePlayer: event.gamePlayer
          ? {
              id: event.gamePlayer.id,
              userId: event.gamePlayer.userId,
              displayName:
                event.gamePlayer.user?.displayName ?? event.gamePlayer.guestName,
              guestName: event.gamePlayer.guestName,
              controller: event.gamePlayer.controller,
              botStrategy: event.gamePlayer.botStrategy,
              seat: event.gamePlayer.seat,
              role: event.gamePlayer.role
            }
          : null
      }))
    });
  }

  async exportNdjson(query: AnalyticsQuery) {
    const where = this.gameWhere(query);
    const limit = this.limit(query.limit, 500, 5000);
    const games = await this.prisma.game.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: limit
    });

    const lines: string[] = [
      this.line({
        kind: "export_meta",
        schemaVersion: 2,
        generatedAt: new Date(),
        filters: {
          from: query.from ?? null,
          to: query.to ?? null,
          status: query.status ?? null,
          limit
        }
      })
    ];

    for (const gameRef of games) {
      const detail = await this.gameDetail(gameRef.id);
      const replay = await this.replay(gameRef.id);
      lines.push(this.line({ kind: "game", ...detail.game }));
      for (const player of detail.players) {
        lines.push(this.line({ kind: "player", gameId: gameRef.id, ...player }));
      }
      for (const event of replay.events) {
        lines.push(this.line({ kind: "event", ...event }));
      }
    }

    return `${lines.join("\n")}\n`;
  }

  private gameWhere(query: AnalyticsQuery) {
    const where: Prisma.GameWhereInput = {};
    const createdAt = this.dateRange(query.from, query.to);
    if (createdAt) where.createdAt = createdAt;
    if (query.status) {
      if (!Object.values(GameStatus).includes(query.status)) {
        throw new BadRequestException("Invalid game status");
      }
      where.status = query.status;
    }
    return where;
  }

  private dateRange(from?: string, to?: string) {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = this.parseDate(from, "from");
    if (to) range.lte = this.parseDate(to, "to");
    return Object.keys(range).length > 0 ? range : null;
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return date;
  }

  private limit(value: string | undefined, fallback: number, max: number) {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
      throw new BadRequestException(`limit must be an integer from 1 to ${max}`);
    }
    return parsed;
  }

  private gameSummary(game: {
    id: string;
    code: string;
    title: string;
    status: GameStatus;
    mode: GameMode;
    maxPlayers: number | null;
    currentRound: number;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: { id: string; displayName: string } | null;
    players: Array<{
      id: string;
      userId: string | null;
      guestName: string | null;
      controller: string;
      botStrategy: string | null;
      role: string;
      status: string;
      seat: number | null;
      joinedAt: Date;
      user?: { id: string; displayName: string } | null;
      profession?: { id: number; slug: string; name: string } | null;
      financialState?: {
        monthlyCashflowCents: bigint | number;
        passiveIncomeCents: bigint | number;
        escapedRatRaceAt: Date | null;
        wonAt: Date | null;
      } | null;
    }>;
    _count?: { events: number; chatMessages: number };
  }) {
    const playerRows = game.players.filter((player) => player.role === "PLAYER");
    const winner = playerRows.find((player) => player.financialState?.wonAt);
    return {
      id: game.id,
      code: game.code,
      title: game.title,
      status: game.status,
      mode: game.mode,
      maxPlayers: game.maxPlayers,
      currentRound: game.currentRound,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      updatedAt: game.updatedAt,
      durationMinutes:
        game.startedAt && game.endedAt
          ? Math.round((game.endedAt.getTime() - game.startedAt.getTime()) / 60000)
          : null,
      createdBy: game.createdBy ?? null,
      playersCount: playerRows.length,
      eventsCount: game._count?.events ?? null,
      chatMessagesCount: game._count?.chatMessages ?? null,
      winnerGamePlayerId: winner?.id ?? null,
      winnerUserId: winner?.userId ?? null,
      winnerName: winner?.user?.displayName ?? winner?.guestName ?? null,
      players: playerRows.map((player) => ({
        id: player.id,
        userId: player.userId,
        displayName: player.user?.displayName ?? player.guestName,
        guestName: player.guestName,
        controller: player.controller,
        botStrategy: player.botStrategy,
        status: player.status,
        seat: player.seat,
        joinedAt: player.joinedAt,
        profession: player.profession ?? null,
        monthlyCashflowCents: player.financialState?.monthlyCashflowCents ?? null,
        passiveIncomeCents: player.financialState?.passiveIncomeCents ?? null,
        escapedRatRaceAt: player.financialState?.escapedRatRaceAt ?? null,
        wonAt: player.financialState?.wonAt ?? null
      }))
    };
  }

  private line(value: unknown) {
    return JSON.stringify(toSerializable(value));
  }
}
