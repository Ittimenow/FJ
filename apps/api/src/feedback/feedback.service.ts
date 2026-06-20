import { Injectable } from "@nestjs/common";
import { toSerializable } from "../common/json";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const message = await this.prisma.feedbackMessage.create({
      data: { userId, body: dto.body.trim() },
      select: { id: true, body: true, createdAt: true }
    });
    return toSerializable(message);
  }

  async listAll() {
    const messages = await this.prisma.feedbackMessage.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        isRead: true,
        createdAt: true,
        user: { select: { id: true, displayName: true, email: true } }
      }
    });
    return toSerializable(messages);
  }

  async markRead(id: string) {
    const message = await this.prisma.feedbackMessage.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, isRead: true }
    });
    return toSerializable(message);
  }
}
