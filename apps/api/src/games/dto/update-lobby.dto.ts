import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from "class-validator";

export class UpdateLobbyDto {
  @IsOptional() @IsString() @MaxLength(80) title?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) @Max(12) maxPlayers?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(240) timeLimitMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) periodCount?: number;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) scheduledLocal?: string;
  @IsOptional() @IsUUID("loose") cardSetId?: string;
}
