import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AccountStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
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
        gender: true,
        birthDate: true,
        gameExperience: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    const [history, states] = await Promise.all([
      this.prisma.gamePlayer.findMany({
        where: { userId, game: { status: { not: "CANCELLED" } } },
        include: {
          game: true,
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

    const wins = states.filter((s) => s.wonAt).length;
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
      history: history.map((player) => ({
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
        monthlyCashflowCents: player.financialState?.monthlyCashflowCents ?? 0
      }))
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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
        })
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        gender: true,
        birthDate: true,
        gameExperience: true,
        role: true,
        status: true
      }
    });
    return user;
  }

  async updateAvatar(userId: string, avatarDataUrl: string) {
    if (!avatarDataUrl.startsWith("data:image/")) {
      throw new BadRequestException("Invalid avatar format");
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
}
