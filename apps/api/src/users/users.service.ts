import { Injectable } from "@nestjs/common";
import { AccountStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { cents, toSerializable } from "../common/json";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
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
        where: {
          gamePlayer: {
            userId
          }
        }
      })
    ]);

    const wins = states.filter((state) => state.wonAt).length;
    const escaped = states.filter((state) => state.escapedRatRaceAt).length;
    const avgCashflow =
      states.length === 0
        ? 0
        : Math.round(
            states.reduce(
              (sum, state) => sum + cents(state.monthlyCashflowCents),
              0
            ) / states.length
          );
    const avgPassive =
      states.length === 0
        ? 0
        : Math.round(
            states.reduce(
              (sum, state) => sum + cents(state.passiveIncomeCents),
              0
            ) / states.length
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
}
