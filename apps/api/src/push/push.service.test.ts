import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { AccountStatus } from "@prisma/client";
import { PushService, allowedPushEndpoint } from "./push.service";

test("accepts Apple and Android push services and rejects arbitrary endpoints", () => {
  assert.equal(allowedPushEndpoint("https://web.push.apple.com/abc"), true);
  assert.equal(allowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(allowedPushEndpoint("http://127.0.0.1/push"), false);
  assert.equal(allowedPushEndpoint("https://web.push.apple.com.evil.example/abc"), false);
});

test("moves a browser subscription to the current account without retaining old deliveries", async () => {
  const calls: string[] = [];
  const prisma = {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      pushSubscription: {
        findUnique: async () => ({ id: "old-id", userId: "old-user" }),
        count: async () => 0,
        delete: async () => { calls.push("delete-old"); },
        upsert: async ({ create }: { create: { userId: string } }) => {
          calls.push(`save-${create.userId}`);
        }
      }
    })
  };
  const config = { get: (key: string) => ({
    WEB_PUSH_PUBLIC_KEY: "A".repeat(87), WEB_PUSH_PRIVATE_KEY: "B".repeat(43), WEB_PUSH_CONTACT: "mailto:admin@example.com"
  })[key as "WEB_PUSH_PUBLIC_KEY" | "WEB_PUSH_PRIVATE_KEY" | "WEB_PUSH_CONTACT"] };
  const service = new PushService(prisma as never, config as never);
  await service.subscribe("new-user", {
    endpoint: "https://web.push.apple.com/abc",
    keys: { p256dh: "public-key", auth: "auth-key" }
  });
  assert.deepEqual(calls, ["delete-old", "save-new-user"]);
  await assert.rejects(service.subscribe("new-user", {
    endpoint: "https://127.0.0.1/private", keys: { p256dh: "x", auth: "y" }
  }), BadRequestException);
});

test("queues a new game notification for every subscribed device", async () => {
  const queued: Array<{ notificationId: string; subscriptionId: string }> = [];
  let prepared = false;
  const prisma = {
    userNotification: { updateMany: async () => ({}), findMany: async () => [{
      id: "note-id", kind: "OPEN_GAME_PUBLISHED", readAt: null, createdAt: new Date(),
      user: { status: AccountStatus.ACTIVE, openGameNotifications: true,
        pushSubscriptions: [{ id: "phone" }, { id: "tablet" }] }
    }] },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      pushDelivery: { createMany: async ({ data }: { data: typeof queued }) => { queued.push(...data); } },
      userNotification: { update: async () => { prepared = true; } }
    }),
    $queryRaw: async () => []
  };
  const config = { get: (key: string) => ({
    WEB_PUSH_PUBLIC_KEY: "A".repeat(87), WEB_PUSH_PRIVATE_KEY: "B".repeat(43), WEB_PUSH_CONTACT: "mailto:admin@example.com"
  })[key as "WEB_PUSH_PUBLIC_KEY" | "WEB_PUSH_PRIVATE_KEY" | "WEB_PUSH_CONTACT"] };
  await new PushService(prisma as never, config as never).drainPending();
  assert.deepEqual(queued, [
    { notificationId: "note-id", subscriptionId: "phone" },
    { notificationId: "note-id", subscriptionId: "tablet" }
  ]);
  assert.equal(prepared, true);
});
