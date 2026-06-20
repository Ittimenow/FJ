import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AccountStatus, CardType, Prisma, SystemRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { toSerializable } from "../common/json";
import { PrismaService } from "../prisma/prisma.service";
import { AdminCardDto } from "./dto/card.dto";
import { AdminCreateUserDto } from "./dto/create-user.dto";
import { AdminUpdateUserRoleDto } from "./dto/update-user-role.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCards(cardType?: CardType) {
    const where: Prisma.CardWhereInput = cardType ? { cardType } : {};
    const cards = await this.prisma.card.findMany({
      where,
      include: {
        meta: { orderBy: { id: "asc" } },
        effects: { orderBy: { id: "asc" } },
        conditions: { orderBy: { id: "asc" } }
      },
      orderBy: [{ cardType: "asc" }, { title: "asc" }]
    });

    return toSerializable(cards);
  }

  async listUnclearCards() {
    const cards = await this.prisma.card.findMany({
      where: {
        isActive: true,
        effects: { none: {} },
        NOT: [
          {
            AND: [
              {
                cardType: {
                  in: [CardType.SMALL_DEAL, CardType.BIG_DEAL, CardType.FAST_TRACK]
                }
              },
              {
                OR: [
                  { category: "stock" },
                  { category: { contains: "share" } },
                  { subcategory: "stock" },
                  { subcategory: { contains: "share" } },
                  { meta: { some: { metaKey: "symbol" } } },
                  { title: { contains: "Акци" } },
                  { title: { contains: "акци" } },
                  { title: { contains: "Stock" } },
                  { title: { contains: "stock" } },
                  { title: { contains: "Share" } },
                  { title: { contains: "share" } },
                  { bodyText: { contains: "Акци" } },
                  { bodyText: { contains: "акци" } },
                  { bodyText: { contains: "Stock" } },
                  { bodyText: { contains: "stock" } },
                  { bodyText: { contains: "Share" } },
                  { bodyText: { contains: "share" } }
                ]
              },
              {
                OR: [
                  { meta: { some: { metaKey: { in: ["price", "today_price"] } } } },
                  { bodyText: { contains: "сегодняшняя цена" } },
                  { bodyText: { contains: "Сегодняшняя цена" } }
                ]
              }
            ]
          },
          {
            AND: [
              { cardType: CardType.SMALL_DEAL },
              {
                OR: [
                  { title: { contains: "TNI" } },
                  { title: { contains: "AMWAY" } },
                  { title: { contains: "сетевого маркетинга" } },
                  { title: { contains: "Бриллиант" } },
                  { title: { contains: "бриллиант" } },
                  { bodyText: { contains: "TNI" } },
                  { bodyText: { contains: "AMWAY" } },
                  { bodyText: { contains: "сетевого маркетинга" } },
                  { bodyText: { contains: "Бриллиант" } },
                  { bodyText: { contains: "бриллиант" } }
                ]
              },
              {
                OR: [
                  { title: { contains: "уровень" } },
                  { bodyText: { contains: "уровень" } }
                ]
              }
            ]
          }
        ]
      },
      include: {
        meta: { orderBy: { id: "asc" } },
        effects: { orderBy: { id: "asc" } },
        conditions: { orderBy: { id: "asc" } }
      },
      orderBy: { id: "asc" }
    });

    return toSerializable(cards);
  }

  async createCard(dto: AdminCardDto) {
    this.validateCardRelations(dto);

    try {
      const card = await this.prisma.$transaction(async (tx) =>
        tx.card.create({
          data: {
            ...this.cardData(dto),
            meta: { create: this.metaData(dto) },
            effects: { create: this.effectData(dto) },
            conditions: { create: this.conditionData(dto) }
          },
          include: {
            meta: { orderBy: { id: "asc" } },
            effects: { orderBy: { id: "asc" } },
            conditions: { orderBy: { id: "asc" } }
          }
        })
      );
      return toSerializable(card);
    } catch (error) {
      this.handleCardWriteError(error);
    }
  }

  async updateCard(cardId: number, dto: AdminCardDto) {
    if (!Number.isInteger(cardId) || cardId <= 0) {
      throw new BadRequestException("Invalid card id");
    }
    this.validateCardRelations(dto);

    try {
      const card = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.card.findUnique({ where: { id: cardId } });
        if (!existing) throw new NotFoundException("Card not found");

        await tx.cardMeta.deleteMany({ where: { cardId } });
        await tx.cardEffect.deleteMany({ where: { cardId } });
        await tx.cardCondition.deleteMany({ where: { cardId } });

        return tx.card.update({
          where: { id: cardId },
          data: {
            ...this.cardData(dto),
            meta: { create: this.metaData(dto) },
            effects: { create: this.effectData(dto) },
            conditions: { create: this.conditionData(dto) }
          },
          include: {
            meta: { orderBy: { id: "asc" } },
            effects: { orderBy: { id: "asc" } },
            conditions: { orderBy: { id: "asc" } }
          }
        });
      });

      return toSerializable(card);
    } catch (error) {
      this.handleCardWriteError(error);
    }
  }

  async deleteCard(cardId: number) {
    if (!Number.isInteger(cardId) || cardId <= 0) {
      throw new BadRequestException("Invalid card id");
    }

    try {
      const card = await this.prisma.card.delete({
        where: { id: cardId },
        include: {
          meta: { orderBy: { id: "asc" } },
          effects: { orderBy: { id: "asc" } },
          conditions: { orderBy: { id: "asc" } }
        }
      });

      return toSerializable(card);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Card not found");
      }
      throw error;
    }
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { status: { not: AccountStatus.DELETED } },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        role: true,
        status: true,
        blockedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { gamePlayers: true, createdGames: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return toSerializable(users);
  }

  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email is already registered");

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        displayName: dto.displayName,
        role: dto.role ?? SystemRole.USER
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    return toSerializable(user);
  }

  async updateRole(actorUserId: string, userId: string, dto: AdminUpdateUserRoleDto) {
    if (actorUserId === userId && dto.role !== SystemRole.ADMIN) {
      throw new ForbiddenException("Admin cannot demote own account");
    }

    const user = await this.requireMutableUser(userId);
    if (user.status === AccountStatus.DELETED) {
      throw new NotFoundException("User not found");
    }

    return toSerializable(
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: dto.role },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          updatedAt: true
        }
      })
    );
  }

  async blockUser(actorUserId: string, userId: string) {
    if (actorUserId === userId) {
      throw new ForbiddenException("Admin cannot block own account");
    }

    await this.requireMutableUser(userId);
    return toSerializable(
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.BLOCKED,
          blockedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          blockedAt: true
        }
      })
    );
  }

  async unblockUser(userId: string) {
    await this.requireMutableUser(userId);
    return toSerializable(
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.ACTIVE,
          blockedAt: null
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          blockedAt: true
        }
      })
    );
  }

  async deleteUser(actorUserId: string, userId: string) {
    if (actorUserId === userId) {
      throw new ForbiddenException("Admin cannot delete own account");
    }

    await this.requireMutableUser(userId);
    const deletedAt = new Date();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.DELETED,
        deletedAt,
        blockedAt: deletedAt
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        deletedAt: true
      }
    });

    return toSerializable(user);
  }

  private async requireMutableUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true
      }
    });
    if (!user || user.status === AccountStatus.DELETED) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  private cardData(dto: AdminCardDto) {
    return {
      cardType: dto.cardType,
      slug: dto.slug.trim(),
      title: dto.title.trim(),
      bodyText: dto.bodyText.trim(),
      category: this.optionalText(dto.category),
      subcategory: this.optionalText(dto.subcategory),
      isActive: dto.isActive ?? true
    };
  }

  private metaData(dto: AdminCardDto) {
    return (dto.meta ?? [])
      .map((row) => ({
        metaKey: row.metaKey.trim(),
        metaValue: row.metaValue.trim()
      }))
      .filter((row) => row.metaKey.length > 0);
  }

  private effectData(dto: AdminCardDto) {
    return (dto.effects ?? [])
      .map((row) => ({
        effectType: row.effectType.trim(),
        amountCents:
          row.amountCents === null || row.amountCents === undefined
            ? null
            : BigInt(row.amountCents),
        payload: (row.payload ?? {}) as Prisma.InputJsonValue
      }))
      .filter((row) => row.effectType.length > 0);
  }

  private conditionData(dto: AdminCardDto) {
    return (dto.conditions ?? [])
      .map((row) => ({
        condType: row.condType.trim(),
        payload: (row.payload ?? {}) as Prisma.InputJsonValue
      }))
      .filter((row) => row.condType.length > 0);
  }

  private optionalText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private validateCardRelations(dto: AdminCardDto) {
    if (!dto.slug.trim()) throw new BadRequestException("Card slug is required");
    if (!dto.title.trim()) throw new BadRequestException("Card title is required");
    if (!dto.bodyText.trim()) throw new BadRequestException("Card body is required");

    const metaKeys = new Set<string>();
    for (const row of dto.meta ?? []) {
      const key = row.metaKey.trim();
      if (!key) continue;
      if (metaKeys.has(key)) {
        throw new BadRequestException(`Duplicate meta key: ${key}`);
      }
      metaKeys.add(key);
    }
  }

  private handleCardWriteError(error: unknown): never {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Card slug or meta key already exists");
    }
    throw error;
  }
}
