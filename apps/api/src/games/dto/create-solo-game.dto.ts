import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateSoloGameDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsUUID()
  cardSetId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  botCount!: number;
}
