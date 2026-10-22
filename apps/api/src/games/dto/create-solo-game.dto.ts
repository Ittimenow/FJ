import { TestGameOptionsDto } from "./fast-track.dto";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { botLevels, type BotLevel } from "../bot-strategy";

export class CreateSoloGameDto extends TestGameOptionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  // Seeded card sets use canonical PostgreSQL UUIDs without RFC version bits.
  @IsUUID("loose")
  cardSetId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  botCount!: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(botLevels, { each: true })
  botLevels?: BotLevel[];
}
