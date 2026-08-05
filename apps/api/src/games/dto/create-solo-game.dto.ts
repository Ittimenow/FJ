import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateSoloGameDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  botCount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  timeLimitMinutes?: number;
}
