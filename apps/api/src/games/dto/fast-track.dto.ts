import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class TestGameOptionsDto {
  @IsOptional() @IsBoolean() testing?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) testCashCents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1_000_000) testIncomeCents?: number;
}
export class ChooseDreamDto {
  @IsInt() @Min(0) @Max(47) cellIndex!: number;
}
export class RollDiceDto {
  @IsOptional() @IsInt() @Min(1) @Max(3) diceCount?: number;
  @IsOptional() @IsString() expectedTurn?: string;
}
export class FastTrackDecisionDto {
  @IsBoolean() buy!: boolean;
  @IsString() decisionId!: string;
}
