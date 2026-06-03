import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GamesController, ReferenceController } from "./games.controller";
import { GamesGateway } from "./games.gateway";
import { GamesRealtimeService } from "./games-realtime.service";
import { GamesService } from "./games.service";

@Module({
  imports: [AuthModule],
  controllers: [GamesController, ReferenceController],
  providers: [GamesService, GamesGateway, GamesRealtimeService],
  exports: [GamesService]
})
export class GamesModule {}
