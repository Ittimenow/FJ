import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, GameStatus, type Prisma } from "@prisma/client";
import * as webPush from "web-push";
import { PrismaService } from "../prisma/prisma.service";
import { PushSubscriptionDto } from "./push.dto";

type DeliveryWithDetails = Prisma.PushDeliveryGetPayload<{
  include: {
    subscription: true;
    notification: {
      include: {
        user: { select: { status: true; openGameNotifications: true } };
        game: { select: { status: true } };
      };
    };
  };
}>;

export function allowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

function pushText(kind: string) {
  if (kind === "GAME_PLAYER_ADDED") return { title: "Вас добавили в игру", body: "Откройте оповещение, чтобы перейти в лобби игры." };
  if (kind === "OPEN_GAME_CANCELLED") return { title: "Игра отменена", body: "Откройте оповещения, чтобы узнать подробности." };
  if (kind === "OPEN_GAME_RESCHEDULED") return { title: "Время игры изменено", body: "Откройте оповещения, чтобы узнать новое время." };
  return { title: "Новая открытая игра", body: "В разделе оповещений появилась новая партия." };
}

@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private readonly vapid: { subject: string; publicKey: string; privateKey: string } | null;
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const publicKey = (config.get<string>("WEB_PUSH_PUBLIC_KEY") ?? "").trim();
    const privateKey = (config.get<string>("WEB_PUSH_PRIVATE_KEY") ?? "").trim();
    const subject = (config.get<string>("WEB_PUSH_CONTACT") ?? "").trim();
    this.vapid = /^[A-Za-z0-9_-]{87}$/.test(publicKey) &&
      /^[A-Za-z0-9_-]{43}$/.test(privateKey) &&
      /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/.test(subject) &&
      !subject.includes("localhost")
      ? { subject, publicKey, privateKey }
      : null;
    if ((publicKey || privateKey || subject) && !this.vapid) {
      this.logger.warn("Web Push configuration is incomplete or invalid; device notifications are disabled");
    }
  }

  onModuleInit() {
    if (!this.vapid) return;
    this.timer = setInterval(() => void this.drainPending(), 5_000);
    this.timer.unref();
    setTimeout(() => void this.drainPending(), 1_500).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  config() {
    return { publicKey: this.vapid?.publicKey ?? null };
  }

  async subscribe(userId: string, dto: PushSubscriptionDto) {
    if (!this.vapid) throw new ServiceUnavailableException("Push-уведомления пока недоступны.");
    if (!allowedPushEndpoint(dto.endpoint)) {
      throw new BadRequestException("Адрес push-подписки не поддерживается.");
    }
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.pushSubscription.findUnique({ where: { endpoint: dto.endpoint } });
      if (!existing || existing.userId !== userId) {
        const deviceCount = await tx.pushSubscription.count({ where: { userId } });
        if (deviceCount >= 10) {
          throw new BadRequestException("Можно подключить не более 10 устройств.");
        }
      }
      if (existing && existing.userId !== userId) {
        await tx.pushSubscription.delete({ where: { id: existing.id } });
      }
      await tx.pushSubscription.upsert({
        where: { endpoint: dto.endpoint },
        create: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
        update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth }
      });
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  async drainPending() {
    if (!this.vapid || this.draining) return;
    this.draining = true;
    try {
      await this.prepareDeliveries();
      if (this.vapid) await this.sendDeliveries();
    } catch (error) {
      this.logger.error(`Push delivery cycle failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.draining = false;
    }
  }

  private async prepareDeliveries() {
    const freshAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.prisma.userNotification.updateMany({
      where: { pushPreparedAt: null, createdAt: { lt: freshAfter } },
      data: { pushPreparedAt: new Date() }
    });
    const notifications = await this.prisma.userNotification.findMany({
      where: { pushPreparedAt: null },
      select: {
        id: true, kind: true, readAt: true, createdAt: true,
        user: { select: { status: true, openGameNotifications: true,
          pushSubscriptions: { select: { id: true } }
        } }
      },
      orderBy: { createdAt: "asc" },
      take: 100
    });
    for (const notification of notifications) {
      const shouldSend = this.vapid && !notification.readAt &&
        notification.createdAt >= freshAfter &&
        notification.user.status === AccountStatus.ACTIVE &&
        (notification.kind !== "OPEN_GAME_PUBLISHED" || notification.user.openGameNotifications);
      await this.prisma.$transaction(async (tx) => {
        if (shouldSend && notification.user.pushSubscriptions.length > 0) {
          await tx.pushDelivery.createMany({
            data: notification.user.pushSubscriptions.map((subscription) => ({
              notificationId: notification.id, subscriptionId: subscription.id
            })),
            skipDuplicates: true
          });
        }
        await tx.userNotification.update({
          where: { id: notification.id }, data: { pushPreparedAt: new Date() }
        });
      });
    }
  }

  private async sendDeliveries() {
    if (!this.vapid) return;
    const claimed = await this.prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE push_deliveries
      SET next_attempt_at = NOW() + INTERVAL '5 minutes'
      WHERE id IN (
        SELECT id FROM push_deliveries
        WHERE sent_at IS NULL AND failed_at IS NULL AND next_attempt_at <= NOW()
        ORDER BY next_attempt_at ASC
        LIMIT 100 FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;
    if (claimed.length === 0) return;
    const deliveries = await this.prisma.pushDelivery.findMany({
      where: { id: { in: claimed.map((item) => item.id) } },
      include: {
        subscription: true,
        notification: {
          include: {
            user: { select: { status: true, openGameNotifications: true } },
            game: { select: { status: true } }
          }
        }
      }
    });
    for (let index = 0; index < deliveries.length; index += 10) {
      const results = await Promise.allSettled(
        deliveries.slice(index, index + 10).map((delivery) => this.sendDelivery(delivery))
      );
      for (const result of results) {
        if (result.status === "rejected") {
          this.logger.error(`Push delivery failed before retry could be saved: ${String(result.reason)}`);
        }
      }
    }
  }

  private async sendDelivery(delivery: DeliveryWithDetails) {
    const { notification, subscription } = delivery;
    if (subscription.userId !== notification.userId || notification.readAt ||
      notification.user.status !== AccountStatus.ACTIVE ||
      (notification.kind === "OPEN_GAME_PUBLISHED" &&
        (!notification.user.openGameNotifications || notification.game.status !== GameStatus.WAITING))) {
      await this.prisma.pushDelivery.update({ where: { id: delivery.id }, data: { sentAt: new Date() } });
      return;
    }
    try {
      const unreadCount = await this.prisma.userNotification.count({
        where: { userId: notification.userId, readAt: null }
      });
      await webPush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({ ...pushText(notification.kind), id: notification.id, unreadCount }),
        { vapidDetails: this.vapid!, TTL: 3600, timeout: 10_000 }
      );
      await this.prisma.pushDelivery.update({
        where: { id: delivery.id }, data: { sentAt: new Date(), attempts: { increment: 1 } }
      });
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode) : null;
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        return;
      }
      const attempts = delivery.attempts + 1;
      await this.prisma.pushDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts,
          ...(attempts >= 6 || (statusCode !== null && statusCode < 500 && statusCode !== 429)
            ? { failedAt: new Date() }
            : { nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000) })
        }
      });
      this.logger.warn(`Push delivery failed for notification ${notification.id}: ${statusCode ?? "network error"}`);
    }
  }
}
