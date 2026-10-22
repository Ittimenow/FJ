import { IsIn, IsOptional } from "class-validator";
import { botLevels, type BotLevel } from "../bot-strategy";

export class AddBotDto {
  @IsOptional()
  @IsIn(botLevels)
  level?: BotLevel;
}
