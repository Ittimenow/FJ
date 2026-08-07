import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { AdminService } from "./admin.service";

const cardSetId = "00000000-0000-0000-0000-000000000001";

test("переименование набора сохраняет идентификатор и убирает пробелы по краям", async () => {
  let savedName = "";
  const prisma = {
    cardSet: {
      update: async ({ data }: { data: { name: string } }) => {
        savedName = data.name;
        return {
          id: cardSetId,
          name: data.name,
          isDefault: true,
          createdAt: new Date("2026-08-07T00:00:00.000Z"),
          updatedAt: new Date("2026-08-07T00:00:00.000Z")
        };
      }
    }
  };
  const service = new AdminService(prisma as never);

  const updated = await service.updateCardSet(cardSetId, {
    name: "  Семейная версия  "
  });

  assert.equal(savedName, "Семейная версия");
  assert.equal(updated.id, cardSetId);
  assert.equal(updated.name, "Семейная версия");
});

test("переименование набора отклоняет название из одних пробелов", async () => {
  const service = new AdminService({} as never);

  await assert.rejects(
    () => service.updateCardSet(cardSetId, { name: "   " }),
    BadRequestException
  );
});

test("готовый набор становится единственным основным", async () => {
  const operations: string[] = [];
  const prisma = {
    cardSet: {
      findUnique: async () => ({
        id: cardSetId,
        name: "Семейная версия",
        isDefault: false,
        createdAt: new Date("2026-08-07T00:00:00.000Z"),
        updatedAt: new Date("2026-08-07T00:00:00.000Z")
      })
    },
    card: {
      groupBy: async () => [
        { cardType: "SMALL_DEAL", _count: { _all: 1 } },
        { cardType: "BIG_DEAL", _count: { _all: 1 } },
        { cardType: "DOODAD", _count: { _all: 1 } },
        { cardType: "MARKET", _count: { _all: 1 } }
      ]
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      cardSet: {
        updateMany: async () => {
          operations.push("unset");
        },
        update: async () => {
          operations.push("set");
          return {
            id: cardSetId,
            name: "Семейная версия",
            isDefault: true,
            createdAt: new Date("2026-08-07T00:00:00.000Z"),
            updatedAt: new Date("2026-08-07T00:00:00.000Z")
          };
        }
      }
    })
  };
  const service = new AdminService(prisma as never);

  const updated = await service.setDefaultCardSet(cardSetId);

  assert.deepEqual(operations, ["unset", "set"]);
  assert.equal(updated.isDefault, true);
});

test("неполный набор нельзя сделать основным", async () => {
  let transactionStarted = false;
  const prisma = {
    cardSet: {
      findUnique: async () => ({
        id: cardSetId,
        name: "Неполный набор",
        isDefault: false,
        createdAt: new Date("2026-08-07T00:00:00.000Z"),
        updatedAt: new Date("2026-08-07T00:00:00.000Z")
      })
    },
    card: {
      groupBy: async () => [
        { cardType: "SMALL_DEAL", _count: { _all: 1 } },
        { cardType: "BIG_DEAL", _count: { _all: 1 } },
        { cardType: "DOODAD", _count: { _all: 1 } }
      ]
    },
    $transaction: async () => {
      transactionStarted = true;
    }
  };
  const service = new AdminService(prisma as never);

  await assert.rejects(
    () => service.setDefaultCardSet(cardSetId),
    (error: unknown) =>
      error instanceof BadRequestException && error.message.includes("рынок")
  );
  assert.equal(transactionStarted, false);
});
