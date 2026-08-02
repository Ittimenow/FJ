import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  gameExperience?: number;

  @IsOptional()
  @IsString()
  figurine?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["classic", "journey"])
  gameRoomView?: "classic" | "journey";
}
