import { TestGameOptionsDto } from "./fast-track.dto";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

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
}
