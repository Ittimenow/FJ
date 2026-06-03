import { Module } from "@nestjs/common";
import { AdminCardsController } from "./admin-cards.controller";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController, AdminCardsController],
  providers: [AdminService]
})
export class AdminModule {}
