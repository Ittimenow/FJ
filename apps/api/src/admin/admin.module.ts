import { Module } from "@nestjs/common";
import { AdminAnalyticsController } from "./admin-analytics.controller";
import { AdminAnalyticsService } from "./admin-analytics.service";
import { AdminCardsController } from "./admin-cards.controller";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController, AdminCardsController, AdminAnalyticsController],
  providers: [AdminService, AdminAnalyticsService]
})
export class AdminModule {}
