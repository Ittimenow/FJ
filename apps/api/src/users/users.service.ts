import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { isFigurineId, realtimeEvents } from "@cashflow/shared";
import { AccountStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { cents, toSerializable } from "../common/json";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService
  ) {}

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        figurine: true,
        gender: true,
        birthDate: true,
        gameExperience: true,
        gameRoomView: true,
        telegramChannel: true,
        city: { select: { id: true, name: true, region: true } },
        role: true,
        status: true,
        createdAt: true
      }
    });

    const [history, states] = await Promise.all([
      this.prisma.gamePlayer.findMany({
        where: { userId, game: { status: { not: "CANCELLED" } } },
        include: {
          game: {
            include: {
              events: {
                where: { type: realtimeEvents.gameEnded },
                orderBy: { sequence: "desc" },
                take: 1
              }
            }
          },
          profession: { select: { name: true } },
          financialState: true
        },
        orderBy: { joinedAt: "desc" },
        take: 20
      }),
      this.prisma.playerFinancialState.findMany({
        where: { gamePlayer: { userId } }
      })
    ]);

    const survivalWins = history.filter(
      (player) => gameEndReason(player.game.events[0]?.payload) === "bots_eliminated"
    ).length;
    const wins = states.filter((s) => s.wonAt).length + survivalWins;
    const escaped = states.filter((s) => s.escapedRatRaceAt).length;
    const avgCashflow =
      states.length === 0
        ? 0
        : Math.round(
            states.reduce((sum, s) => sum + cents(s.monthlyCashflowCents), 0) /
              states.length
          );
    const avgPassive =
      states.length === 0
        ? 0
        : Math.round(
            states.reduce((sum, s) => sum + cents(s.passiveIncomeCents), 0) /
              states.length
          );

    return toSerializable({
      user,
      stats: {
        gamesPlayed: history.length,
        wins,
        escapedRatRace: escaped,
        averageMonthlyCashflowCents: avgCashflow,
        averagePassiveIncomeCents: avgPassive
      },
      history: history.map((player) => {
        const gameEndPayload = player.game.events[0]?.payload;
        const endReason = gameEndReason(gameEndPayload);
        const winnerGamePlayerId = gameEndWinnerId(gameEndPayload);
        return {
          gameId: player.gameId,
          title: player.game.title,
          code: player.game.code,
          status: player.game.status,
          role: player.role,
          profession: player.profession?.name ?? null,
          joinedAt: player.joinedAt,
          endedAt: player.game.endedAt,
          wonAt: player.financialState?.wonAt ?? null,
          escapedRatRaceAt: player.financialState?.escapedRatRaceAt ?? null,
          monthlyCashflowCents: player.financialState?.monthlyCashflowCents ?? 0,
          gameMode: player.game.mode,
          outcome: player.financialState?.wonAt || endReason === "bots_eliminated"
            ? "WIN"
            : endReason === "human_bankrupt" ||
                (player.game.mode === "SOLO" &&
                  endReason === "financial_freedom" &&
                  winnerGamePlayerId !== null &&
                  winnerGamePlayerId !== player.id)
              ? "LOSS"
              : null
        };
      })
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.figurine != null && !isFigurineId(dto.figurine)) {
      throw new BadRequestException("Unknown figurine");
    }
    if (dto.cityId !== undefined) {
      const city = await this.prisma.city.findUnique({
        where: { id: dto.cityId },
        select: { id: true }
      });
      if (!city) throw new BadRequestException("Выберите город из списка.");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.gender !== undefined && { gender: dto.gender || null }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null
        }),
        ...(dto.gameExperience !== undefined && {
          gameExperience: dto.gameExperience
        }),
        ...(dto.figurine !== undefined && { figurine: dto.figurine || null }),
        ...(dto.gameRoomView !== undefined && { gameRoomView: dto.gameRoomView }),
        ...(dto.telegramChannel !== undefined && { telegramChannel: dto.telegramChannel }),
        ...(dto.cityId !== undefined && { cityId: dto.cityId })
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        figurine: true,
        gender: true,
        birthDate: true,
        gameExperience: true,
        gameRoomView: true,
        telegramChannel: true,
        city: { select: { id: true, name: true, region: true } },
        role: true,
        status: true
      }
    });
    return user;
  }

  async updateAvatar(userId: string, avatarDataUrl: string) {
    if (!avatarDataUrl.startsWith("data:image/")) {
      throw new BadRequestException("Неподдерживаемый формат фотографии");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarDataUrl },
      select: { id: true, avatarUrl: true }
    });
  }

  async removeAvatar(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null }
    });
    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, displayName: true, passwordHash: true, status: true }
    });

    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not active");
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException("Неверный текущий пароль");
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("Новый пароль должен отличаться от текущего");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    void this.mail.sendPasswordChanged(user.email, user.displayName);

    return { ok: true };
  }

  async revokeConsentAndDeleteAccount(userId: string, currentPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true }
    });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException("Неверный текущий пароль.");
    }

    const deletedAt = new Date();
    const replacementPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    await this.prisma.$transaction([
      this.prisma.personalDataConsent.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deletedAt }
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          passwordHash: replacementPasswordHash,
          displayName: "Удалённый пользователь",
          avatarUrl: null,
          avatarColor: null,
          figurine: null,
          gender: null,
          birthDate: null,
          gameExperience: null,
          telegramChannel: null,
          cityId: null,
          status: AccountStatus.DELETED,
          deletedAt
        }
      })
    ]);

    return { ok: true };
  }
}

function gameEndReason(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const reason = (payload as Record<string, unknown>).reason;
  return typeof reason === "string" ? reason : null;
}

function gameEndWinnerId(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const winnerGamePlayerId = (payload as Record<string, unknown>).winnerGamePlayerId;
  return typeof winnerGamePlayerId === "string" ? winnerGamePlayerId : null;
}
