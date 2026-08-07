import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import {
  GameInvitesController,
  GamesController,
  ReferenceController
} from "./games.controller";
import { GamesBotService } from "./games-bot.service";
import { GamesGateway } from "./games.gateway";
import { GamesRealtimeService } from "./games-realtime.service";
import { GamesService } from "./games.service";

@Module({
  imports: [AuthModule],
  controllers: [GameInvitesController, GamesController, ReferenceController],
  providers: [GamesService, GamesGateway, GamesRealtimeService, GamesBotService],
  exports: [GamesService]
})
export class GamesModule {}
