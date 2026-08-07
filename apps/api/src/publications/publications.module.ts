import { Module } from "@nestjs/common";
import { AdminPublicationsController, PublicResultsController } from "./publications.controller";
import { PublicationsService } from "./publications.service";

@Module({
  controllers: [AdminPublicationsController, PublicResultsController],
  providers: [PublicationsService],
  exports: [PublicationsService]
})
export class PublicationsModule {}
