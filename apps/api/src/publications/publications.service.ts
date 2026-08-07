import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GameStatus, Prisma, PublicationMode, SummaryStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { toSerializable } from "../common/json";
import {
  composeGameSummary,
  GameSummaryFacts,
  SummaryHighlight,
  SummaryPlayerFacts,
  money
} from "./game-summary.logic";
import { CreateAnnouncementDto, UpdateAnnouncementDto, UpdateSummaryDto } from "./publications.dto";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class PublicationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicationsService.name);
  private readonly botToken: string;
  private readonly publicUrl: string;
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService
  ) {
    this.botToken = (config.get<string>("TELEGRAM_BOT_TOKEN") ?? "").trim();
    this.publicUrl = (config.get<string>("APP_PUBLIC_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  }

  onModuleInit() {
    this.timer = setInterval(() => void this.drainPending(), 15_000);
    this.timer.unref();
    setTimeout(() => void this.drainPending(), 1_500).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async publicList(limit = 6) {
    const summaries = await this.prisma.gameSummary.findMany({
      where: { visibleOnSite: true, status: SummaryStatus.PUBLISHED },
      include: { game: { select: { title: true, endedAt: true, currentRound: true } } },
      orderBy: { sitePublishedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 24)
    });
    return toSerializable(summaries.map((summary) => this.publicSummary(summary)));
  }

  async publicDetail(id: string) {
    const summary = await this.prisma.gameSummary.findFirst({
      where: { id, visibleOnSite: true, status: SummaryStatus.PUBLISHED },
      include: { game: { select: { title: true, endedAt: true, currentRound: true } } }
    });
    if (!summary) throw new NotFoundException("Итоги игры не найдены");
    return toSerializable(this.publicSummary(summary));
  }

  async cardData(id: string) {
    const summary = await this.prisma.gameSummary.findFirst({
      where: {
        id,
        OR: [
          { visibleOnSite: true },
          { status: { in: [SummaryStatus.PUBLISHING, SummaryStatus.PUBLISHED] } }
        ]
      },
      include: { game: { select: { title: true, endedAt: true, currentRound: true } } }
    });
    if (!summary) throw new NotFoundException("Карточка итогов не найдена");
    return toSerializable(this.publicSummary(summary));
  }

  async adminOverview() {
    await this.drainPending();
    const [announcements, summaries, eligibleGames] = await Promise.all([
      this.prisma.telegramAnnouncement.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.gameSummary.findMany({
        include: {
          announcement: true,
          game: { select: { id: true, title: true, code: true, endedAt: true, currentRound: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      this.prisma.game.findMany({
        where: { status: GameStatus.ENDED, summary: null },
        select: { id: true, title: true, code: true, endedAt: true, currentRound: true },
        orderBy: { endedAt: "desc" },
        take: 50
      })
    ]);
    return toSerializable({ announcements, summaries, eligibleGames });
  }

  async createAnnouncement(dto: CreateAnnouncementDto) {
    const parsed = parseTelegramPostUrl(dto.postUrl);
    return this.prisma.$transaction(async (tx) => {
      await tx.telegramAnnouncement.updateMany({ data: { isActive: false } });
      return tx.telegramAnnouncement.create({
        data: {
          title: dto.title.trim(),
          postUrl: dto.postUrl,
          channelUsername: parsed.channelUsername,
          channelChatId: `@${parsed.channelUsername}`,
          channelMessageId: parsed.messageId,
          discussionChatId: dto.discussionChatId?.trim() || null,
          discussionMessageId: dto.discussionMessageId ?? null,
          mode: dto.mode,
          isActive: true
        }
      });
    });
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementDto) {
    if (dto.isActive) {
      await this.prisma.telegramAnnouncement.updateMany({
        where: { id: { not: id } },
        data: { isActive: false }
      });
    }
    return this.prisma.telegramAnnouncement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.discussionChatId !== undefined && {
          discussionChatId: dto.discussionChatId?.trim() || null
        }),
        ...(dto.discussionMessageId !== undefined && {
          discussionMessageId: dto.discussionMessageId
        }),
        ...(dto.mode !== undefined && { mode: dto.mode }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive })
      }
    });
  }

  async generateGame(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          where: { role: "PLAYER" },
          include: {
            user: {
              select: {
                displayName: true,
                telegramChannel: true,
                telegramMentionConsent: true,
                figurine: true
              }
            },
            profession: { select: { name: true } },
            financialState: true,
            assets: { where: { status: "ACTIVE" }, select: { id: true } }
          },
          orderBy: { seat: "asc" }
        },
        events: { orderBy: { sequence: "asc" } }
      }
    });
    if (!game) throw new NotFoundException("Игра не найдена");
    if (game.status !== GameStatus.ENDED || !game.endedAt) {
      throw new BadRequestException("Саммари можно создать только после завершения игры");
    }

    const facts = buildFacts(game);
    const composed = composeGameSummary(facts);
    const activeAnnouncement = await this.prisma.telegramAnnouncement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
    const sourceSequence = game.events[game.events.length - 1]?.sequence ?? 0;
    const summary = await this.prisma.gameSummary.upsert({
      where: { gameId },
      create: {
        gameId,
        announcementId: activeAnnouncement?.id ?? null,
        status: SummaryStatus.DRAFT,
        headline: composed.headline,
        body: composed.body,
        facts: facts as unknown as Prisma.InputJsonValue,
        sourceSequence
      },
      update: {
        ...(activeAnnouncement ? { announcementId: activeAnnouncement.id } : {}),
        status: SummaryStatus.DRAFT,
        headline: composed.headline,
        body: composed.body,
        facts: facts as unknown as Prisma.InputJsonValue,
        sourceSequence,
        generationVersion: { increment: 1 },
        lastError: null
      },
      include: { announcement: true }
    });

    if (summary.announcement?.mode === PublicationMode.AUTOMATIC) {
      return this.publish(summary.id);
    }
    return toSerializable(summary);
  }

  async updateSummary(id: string, dto: UpdateSummaryDto) {
    return this.prisma.gameSummary.update({
      where: { id },
      data: {
        ...(dto.headline !== undefined && { headline: dto.headline.trim() }),
        ...(dto.body !== undefined && { body: dto.body.trim() }),
        ...(dto.announcementId !== undefined && { announcementId: dto.announcementId }),
        ...(dto.visibleOnSite !== undefined && {
          visibleOnSite: dto.visibleOnSite,
          sitePublishedAt: dto.visibleOnSite ? new Date() : null,
          ...(dto.visibleOnSite ? { status: SummaryStatus.PUBLISHED } : {})
        })
      }
    });
  }

  async publish(id: string) {
    const summary = await this.prisma.gameSummary.findUnique({
      where: { id },
      include: { announcement: true }
    });
    if (!summary) throw new NotFoundException("Саммари не найдено");
    if (summary.telegramMessageId) return toSerializable(summary);
    if (!summary.body || !summary.headline) {
      throw new BadRequestException("Сначала сгенерируйте текст саммари");
    }
    if (!summary.announcement) {
      throw new BadRequestException("Выберите Telegram-анонс для публикации");
    }
    if (summary.announcement.mode === PublicationMode.DISABLED) {
      throw new BadRequestException("Публикация в Telegram отключена для этого анонса");
    }
    if (!summary.announcement.discussionChatId || !summary.announcement.discussionMessageId) {
      throw new BadRequestException("Укажите чат и корневое сообщение обсуждения анонса");
    }
    if (!this.botToken) throw new BadRequestException("TELEGRAM_BOT_TOKEN не настроен");

    await this.prisma.gameSummary.update({
      where: { id },
      data: { status: SummaryStatus.PUBLISHING, attempts: { increment: 1 }, lastError: null }
    });
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendPhoto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: summary.announcement.discussionChatId,
          photo: `${this.publicUrl}/results/${summary.id}/opengraph-image`,
          caption: telegramCaption(summary.body),
          reply_parameters: {
            message_id: summary.announcement.discussionMessageId,
            allow_sending_without_reply: false
          }
        }),
        signal: AbortSignal.timeout(15_000)
      });
      const payload = await response.json() as {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number; chat?: { id?: number | string } };
      };
      if (!response.ok || !payload.ok || !payload.result?.message_id) {
        throw new Error(payload.description || `Telegram вернул статус ${response.status}`);
      }
      return toSerializable(await this.prisma.gameSummary.update({
        where: { id },
        data: {
          status: SummaryStatus.PUBLISHED,
          visibleOnSite: true,
          sitePublishedAt: summary.sitePublishedAt ?? new Date(),
          telegramMessageId: payload.result.message_id,
          telegramChatId: String(payload.result.chat?.id ?? summary.announcement.discussionChatId),
          publishedAt: new Date(),
          lastError: null
        }
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка Telegram";
      await this.prisma.gameSummary.update({
        where: { id },
        data: { status: SummaryStatus.FAILED, lastError: message }
      });
      throw new BadRequestException(`Не удалось опубликовать: ${message}`);
    }
  }

  private async drainPending() {
    if (this.draining) return;
    this.draining = true;
    try {
      const pending = await this.prisma.gameSummary.findMany({
        where: { status: SummaryStatus.PENDING },
        select: { gameId: true },
        orderBy: { createdAt: "asc" },
        take: 10
      });
      for (const item of pending) {
        try {
          await this.generateGame(item.gameId);
        } catch (error) {
          this.logger.error(`Summary generation failed for game ${item.gameId}`, error);
          await this.prisma.gameSummary.update({
            where: { gameId: item.gameId },
            data: {
              status: SummaryStatus.FAILED,
              attempts: { increment: 1 },
              lastError: error instanceof Error ? error.message : "Неизвестная ошибка генерации"
            }
          });
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private publicSummary(summary: {
    id: string;
    headline: string | null;
    body: string | null;
    facts: Prisma.JsonValue;
    publishedAt: Date | null;
    sitePublishedAt: Date | null;
    game: { title: string; endedAt: Date | null; currentRound: number };
  }) {
    return {
      id: summary.id,
      headline: summary.headline,
      body: summary.body,
      facts: summary.facts,
      publishedAt: summary.publishedAt ?? summary.sitePublishedAt,
      game: summary.game,
      imageUrl: `/results/${summary.id}/opengraph-image`,
      pageUrl: `/results/${summary.id}`
    };
  }
}

export function parseTelegramPostUrl(url: string) {
  const match = url.match(/^https:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (!match) throw new BadRequestException("Введите ссылку на пост Telegram");
  return { channelUsername: match[1]!, messageId: Number(match[2]!) };
}

function buildFacts(game: {
  id: string;
  title: string;
  startedAt: Date | null;
  endedAt: Date | null;
  currentRound: number;
  players: Array<{
    id: string;
    guestName: string | null;
    status: string;
    track: string;
    figurine: string | null;
    user: { displayName: string; telegramChannel: string | null; telegramMentionConsent: boolean; figurine: string | null } | null;
    profession: { name: string } | null;
    financialState: { cashCents: bigint; monthlyCashflowCents: bigint; passiveIncomeCents: bigint } | null;
    assets: Array<{ id: string }>;
  }>;
  events: Array<{ sequence: number; type: string; gamePlayerId: string | null; payload: Prisma.JsonValue; stateSnapshot: Prisma.JsonValue | null }>;
}): GameSummaryFacts {
  const firstSnapshot = game.events.find((event) => event.stateSnapshot)?.stateSnapshot;
  const startingPlayers = record(firstSnapshot)?.players;
  const startingRows = Array.isArray(startingPlayers) ? startingPlayers : [];
  const startingById = new Map(startingRows.map((row) => [String(record(row)?.id ?? ""), record(record(row)?.financialState)]));
  const endEvent = [...game.events].reverse().find((event) => event.type === "game:ended");
  const endPayload = record(endEvent?.payload);
  const players: SummaryPlayerFacts[] = game.players.map((player) => {
    const start = startingById.get(player.id);
    const finalCashflowCents = Number(player.financialState?.monthlyCashflowCents ?? 0);
    const finalPassiveIncomeCents = Number(player.financialState?.passiveIncomeCents ?? 0);
    const name = player.user?.displayName ?? player.guestName ?? "Игрок";
    return {
      id: player.id,
      name,
      mention: player.user?.telegramMentionConsent && player.user.telegramChannel
        ? player.user.telegramChannel
        : name,
      profession: player.profession?.name ?? null,
      figurine: player.figurine ?? player.user?.figurine ?? null,
      finalCashCents: Number(player.financialState?.cashCents ?? 0),
      finalCashflowCents,
      finalPassiveIncomeCents,
      cashflowDeltaCents: finalCashflowCents - number(start?.monthlyCashflowCents),
      passiveIncomeDeltaCents: finalPassiveIncomeCents - number(start?.passiveIncomeCents),
      assetsCount: player.assets.length,
      track: player.track,
      status: player.status
    };
  });
  const winnerGamePlayerId = typeof endPayload?.winnerGamePlayerId === "string"
    ? endPayload.winnerGamePlayerId
    : null;
  const highlights = selectHighlights(game.events, players, winnerGamePlayerId);
  return {
    gameId: game.id,
    title: game.title,
    endedAt: game.endedAt?.toISOString() ?? new Date().toISOString(),
    durationMinutes: game.startedAt && game.endedAt
      ? Math.max(1, Math.round((game.endedAt.getTime() - game.startedAt.getTime()) / 60_000))
      : null,
    rounds: game.currentRound,
    endReason: typeof endPayload?.reason === "string" ? endPayload.reason : null,
    winnerGamePlayerId,
    players,
    highlights
  };
}

function selectHighlights(
  events: Array<{ type: string; gamePlayerId: string | null; payload: Prisma.JsonValue }>,
  players: SummaryPlayerFacts[],
  winnerId: string | null
) {
  const result: SummaryHighlight[] = [];
  const seen = new Set<string>();
  const player = (id: string | null) => players.find((item) => item.id === id);
  const add = (highlight: SummaryHighlight) => {
    const key = `${highlight.playerId ?? "game"}:${highlight.kind}`;
    if (seen.has(key) || result.length >= 3) return;
    seen.add(key);
    result.push(highlight);
  };

  const escaped = events.find((event) => event.type === "player:escaped_rat_race");
  if (escaped) {
    const target = player(escaped.gamePlayerId);
    if (target && target.id !== winnerId) add({
      playerId: target.id,
      kind: "escaped_rat_race",
      text: `${target.mention} вышел на Скоростную дорожку.`
    });
  }
  const growth = [...players]
    .filter((item) => item.cashflowDeltaCents > 0 && item.id !== winnerId)
    .sort((left, right) => right.cashflowDeltaCents - left.cashflowDeltaCents)[0];
  if (growth) add({
    playerId: growth.id,
    kind: "cashflow_growth",
    text: `${growth.mention} увеличил денежный поток на ${money(growth.cashflowDeltaCents)} в месяц.`
  });

  const eventLabels: Record<string, (name: string, payload: JsonRecord | null) => string> = {
    "bankruptcy:recovered": (name) => `${name} восстановился после банкротства и продолжил игру.`,
    "deal:buy": (name, payload) => `${name} приобрёл актив «${String(payload?.name ?? payload?.title ?? "новый актив")}».`,
    "deal:sell": (name, payload) => `${name} удачно завершил продажу актива «${String(payload?.name ?? "актив")}».`,
    "player:baby": (name) => `${name} встретил важное семейное событие и перестроил финансовый план.`,
    "player:downsized": (name) => `${name} пережил потерю работы и продолжил маршрут.`,
    "network_marketing:level_applied": (name) => `${name} развил направление сетевого маркетинга.`
  };
  for (const event of [...events].reverse()) {
    const format = eventLabels[event.type];
    const target = player(event.gamePlayerId);
    if (format && target) add({
      playerId: target.id,
      kind: event.type,
      text: format(target.mention, record(event.payload))
    });
  }
  return result;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function telegramCaption(body: string) {
  if (body.length <= 1024) return body;
  return `${body.slice(0, 1000).trimEnd()}…\n\nПолные итоги: gamefj.ru`;
}
