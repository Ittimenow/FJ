import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { CardType } from "@prisma/client";
import { AdminService } from "./admin.service";
import { writeCardWorkbook, type WorkbookCard } from "./card-workbook";

const setId = "11111111-1111-4111-8111-111111111111";
const original: WorkbookCard = {
  id: 7, cardSetId: setId, cardType: CardType.SMALL_DEAL, slug: "home_7",
  title: "Дом", bodyText: "Купите дом", category: null, subcategory: null,
  isActive: true, meta: [], effects: [], conditions: []
};
const set = { id: setId, name: "Набор", isDefault: true };

test("предпросмотр показывает изменение и отсутствие карточки без записи", async () => {
  let writes = 0;
  const prisma = {
    cardSet: { findMany: async () => [set] },
    card: { findMany: async () => [original, { ...original, id: 8, slug: "home_8" }] },
    $transaction: async () => { writes++; }
  };
  const service = new AdminService(prisma as never);
  const file = writeCardWorkbook([set], [{ ...original, title: "Новый дом" }]);
  const preview = await service.previewCardWorkbook(file);
  assert.equal(preview.unchanged, 0);
  assert.deepEqual(preview.changes.map((change) => change.action), ["update", "delete"]);
  assert.deepEqual(preview.changes[0]?.fields, ["title"]);
  assert.equal(writes, 0);
});

test("подтверждение отвергает карточку, изменённую после предпросмотра", async () => {
  let writes = 0;
  const prisma = {
    cardSet: { findMany: async () => [set], findUnique: async () => set },
    card: { findMany: async () => [original] },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      card: { findUnique: async () => ({ ...original, title: "Изменено другим администратором" }), update: async () => { writes++; } },
      cardMeta: { deleteMany: async () => { writes++; } },
      cardEffect: { deleteMany: async () => { writes++; } },
      cardCondition: { deleteMany: async () => { writes++; } }
    })
  };
  const service = new AdminService(prisma as never);
  const preview = await service.previewCardWorkbook(writeCardWorkbook([set], [{ ...original, title: "Новый дом" }]));
  await assert.rejects(
    () => service.applyWorkbookCard(preview.changes[0]!),
    ConflictException
  );
  assert.equal(writes, 0);
});

test("подтверждение применяет только выбранную карточку", async () => {
  const updated = { ...original, title: "Новый дом" };
  const writes: string[] = [];
  const prisma = {
    cardSet: { findMany: async () => [set], findUnique: async () => set },
    card: { findMany: async () => [original, { ...original, id: 8, slug: "home_8" }] },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      card: {
        findUnique: async () => original,
        update: async ({ data }: { data: { title: string } }) => {
          writes.push(`update:${data.title}`);
          return updated;
        }
      },
      cardMeta: { deleteMany: async () => { writes.push("meta"); } },
      cardEffect: { deleteMany: async () => { writes.push("effects"); } },
      cardCondition: { deleteMany: async () => { writes.push("conditions"); } }
    })
  };
  const service = new AdminService(prisma as never);
  const preview = await service.previewCardWorkbook(writeCardWorkbook([set], [updated]));
  assert.deepEqual(preview.changes.map((change) => change.action), ["update", "delete"]);
  assert.deepEqual(writes, []);
  await service.applyWorkbookCard(preview.changes[0]!);
  assert.deepEqual(writes, ["meta", "effects", "conditions", "update:Новый дом"]);
});
