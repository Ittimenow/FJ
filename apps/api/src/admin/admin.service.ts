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
import { missingCardTypes } from "../games/card-set";
import { AdminCardDto } from "./dto/card.dto";
import { CreateCardSetDto, UpdateCardSetDto } from "./dto/card-set.dto";
import { AdminCreateUserDto } from "./dto/create-user.dto";
import { AdminUpdateUserRoleDto } from "./dto/update-user-role.dto";

const requiredCardTypeLabels: Partial<Record<CardType, string>> = {
  SMALL_DEAL: "мелкая сделка",
  BIG_DEAL: "крупная сделка",
  DOODAD: "всякая всячина",
  MARKET: "рынок"
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCardSets() {
    const [sets, activeCounts] = await Promise.all([
      this.prisma.cardSet.findMany({
        include: { _count: { select: { cards: true, games: true } } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      }),
      this.prisma.card.groupBy({
        by: ["cardSetId", "cardType"],
        where: { isActive: true },
        _count: { _all: true }
      })
    ]);

    return toSerializable(
      sets.map((set) => ({
        id: set.id,
        name: set.name,
        isDefault: set.isDefault,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        totalCards: set._count.cards,
        gamesCount: set._count.games,
        activeCards: activeCounts
          .filter((row) => row.cardSetId === set.id)
          .reduce((total, row) => total + row._count._all, 0),
        counts: Object.fromEntries(
          activeCounts
            .filter((row) => row.cardSetId === set.id)
            .map((row) => [row.cardType, row._count._all])
        )
      }))
    );
  }

  async createCardSet(dto: CreateCardSetDto) {
    const name = this.cardSetName(dto.name);

    try {
      return toSerializable(
        await this.prisma.cardSet.create({
          data: { name },
          select: {
            id: true,
            name: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true
          }
        })
      );
    } catch (error) {
      this.handleCardSetWriteError(error);
    }
  }

  async updateCardSet(cardSetId: string, dto: UpdateCardSetDto) {
    const name = this.cardSetName(dto.name);

    try {
      return toSerializable(
        await this.prisma.cardSet.update({
          where: { id: cardSetId },
          data: { name },
          select: {
            id: true,
            name: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true
          }
        })
      );
    } catch (error) {
      this.handleCardSetWriteError(error);
    }
  }

  async setDefaultCardSet(cardSetId: string) {
    const cardSet = await this.prisma.cardSet.findUnique({
      where: { id: cardSetId },
      select: {
        id: true,
        name: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!cardSet) throw new NotFoundException("Набор карточек не найден");

    const activeCounts = await this.prisma.card.groupBy({
      by: ["cardType"],
      where: { cardSetId, isActive: true },
      _count: { _all: true }
    });
    const missingTypes = missingCardTypes(
      activeCounts.map((row) => ({
        cardType: row.cardType,
        count: row._count._all
      }))
    );
    if (missingTypes.length > 0) {
      throw new BadRequestException(
        `Нельзя сделать набор основным: добавьте активные карточки — ${missingTypes
          .map((cardType) => requiredCardTypeLabels[cardType] ?? cardType)
          .join(", ")}`
      );
    }
    if (cardSet.isDefault) return toSerializable(cardSet);

    return toSerializable(
      await this.prisma.$transaction(
        async (tx) => {
          await tx.cardSet.updateMany({
            where: { isDefault: true, id: { not: cardSetId } },
            data: { isDefault: false }
          });
          return tx.cardSet.update({
            where: { id: cardSetId },
            data: { isDefault: true },
            select: {
              id: true,
              name: true,
              isDefault: true,
              createdAt: true,
              updatedAt: true
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
  }

  async listCards(cardType?: CardType, cardSetId?: string) {
    const resolvedCardSetId = await this.resolveCardSetId(cardSetId);
    const where: Prisma.CardWhereInput = {
      cardSetId: resolvedCardSetId,
      ...(cardType ? { cardType } : {})
    };
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

  async createCard(dto: AdminCardDto) {
    this.validateCardRelations(dto);
    await this.requireCardSet(dto.cardSetId);

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
    await this.requireCardSet(dto.cardSetId);

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
      cardSetId: dto.cardSetId,
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

  private async resolveCardSetId(cardSetId?: string) {
    if (cardSetId) {
      await this.requireCardSet(cardSetId);
      return cardSetId;
    }
    const defaultSet = await this.prisma.cardSet.findFirst({
      where: { isDefault: true },
      select: { id: true }
    });
    if (!defaultSet) throw new NotFoundException("Основной набор карточек не найден");
    return defaultSet.id;
  }

  private async requireCardSet(cardSetId: string) {
    const cardSet = await this.prisma.cardSet.findUnique({
      where: { id: cardSetId },
      select: { id: true }
    });
    if (!cardSet) throw new NotFoundException("Набор карточек не найден");
    return cardSet;
  }

  private cardSetName(value: string) {
    const name = value.trim();
    if (!name) throw new BadRequestException("Название набора обязательно");
    return name;
  }

  private handleCardSetWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Набор с таким названием уже есть");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundException("Набор карточек не найден");
    }
    throw error;
  }

  private handleCardWriteError(error: unknown): never {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Такой slug уже есть в этом наборе или повторяется meta-ключ");
    }
    throw error;
  }
}
