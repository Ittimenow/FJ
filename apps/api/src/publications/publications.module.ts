import { Module } from "@nestjs/common";
import {
  AdminPublicationsController,
  PublicResultsController,
  PublicTelegramPublicationsController
} from "./publications.controller";
import { PublicationsService } from "./publications.service";

@Module({
  controllers: [AdminPublicationsController, PublicResultsController, PublicTelegramPublicationsController],
  providers: [PublicationsService],
  exports: [PublicationsService]
})
export class PublicationsModule {}
