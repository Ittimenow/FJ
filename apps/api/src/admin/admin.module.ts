import { Module } from "@nestjs/common";
import { AdminAnalyticsController } from "./admin-analytics.controller";
import { AdminBotNamesController } from "./admin-bot-names.controller";
import { AdminAnalyticsService } from "./admin-analytics.service";
import { AdminCardsController } from "./admin-cards.controller";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController, AdminCardsController, AdminAnalyticsController, AdminBotNamesController],
  providers: [AdminService, AdminAnalyticsService]
})
export class AdminModule {}
