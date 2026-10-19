import assert from "node:assert/strict";
import test from "node:test";
import { UsersService } from "./users.service";

test("смена города одновременно обновляет часовой пояс профиля", async () => {
  let updatedData: Record<string, unknown> | null = null;
  const prisma = {
    city: { findUnique: async () => ({ id: "city-id", timeZone: "Asia/Irkutsk" }) },
    user: { update: async ({ data }: { data: Record<string, unknown> }) => {
      updatedData = data;
      return data;
    } }
  };
  const service = new UsersService(prisma as never, {} as never);
  await service.updateProfile("user-id", { cityId: "city-id" });
  assert.equal((updatedData as Record<string, unknown> | null)?.cityId, "city-id");
  assert.equal((updatedData as Record<string, unknown> | null)?.timeZone, "Asia/Irkutsk");
});

test("счётчик оповещений учитывает только непрочитанные сообщения пользователя", async () => {
  let receivedWhere: unknown;
  const service = new UsersService({
    userNotification: { count: async ({ where }: { where: unknown }) => {
      receivedWhere = where;
      return 3;
    } }
  } as never, {} as never);
  assert.deepEqual(await service.unreadNotificationCount("user-id"), { unreadCount: 3 });
  assert.deepEqual(receivedWhere, { userId: "user-id", readAt: null });
});
