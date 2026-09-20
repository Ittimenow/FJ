import { TestGameOptionsDto } from "./fast-track.dto";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateGameDto extends TestGameOptionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  // Seeded card sets use canonical PostgreSQL UUIDs without RFC version bits.
  @IsUUID("loose")
  cardSetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  timeLimitMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  botCount?: number;
}
