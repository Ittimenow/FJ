import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";

export class UpdateLobbyDto {
  @ValidateIf((_, value) => value !== undefined) @IsIn(["101", "202"]) gameType?: "101" | "202";
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(80) title?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(2) @Max(12) maxPlayers?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(15) @Max(240) timeLimitMinutes?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(12) periodCount?: number;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() isPublic?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) scheduledLocal?: string;
  @ValidateIf((_, value) => value !== undefined) @IsUUID("loose") cardSetId?: string;
}

export class PlayableCardSetsQueryDto {
  @ValidateIf((_, value) => value !== undefined) @IsIn(["101", "202"]) gameType?: "101" | "202";
}
