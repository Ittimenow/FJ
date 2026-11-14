import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsObject, IsOptional, IsUUID, Max, Min, ValidateNested } from "class-validator";
import type { SandboxScenario, SandboxPlayerSetup, SandboxAsset } from "@cashflow/shared";

export class CreateSandboxDto {
  @IsIn(["101", "202"]) gameType!: "101" | "202";
  @IsOptional() @IsUUID("loose") cardSetId?: string;
}
export class SandboxAssetDto implements SandboxAsset {
  @IsInt() @Min(1) cardId!: number;
  @IsInt() @Min(1) @Max(1_000_000) quantity!: number;
}
export class SandboxPlayerDto implements SandboxPlayerSetup {
  @IsUUID("loose") playerId!: string;
  @IsInt() @Min(0) @Max(10_000_000) cash!: number;
  @IsInt() @Min(-1) @Max(47) position!: number;
  @IsInt() @Min(1) @Max(1_000_000) fastIncome!: number;
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => SandboxAssetDto) assets!: SandboxAssetDto[];
  @IsArray() @ArrayMaxSize(48) @ArrayUnique() @IsInt({ each: true }) @Min(0, { each: true }) @Max(47, { each: true }) fastAssets!: number[];
  @IsArray() @ArrayMaxSize(20) @IsInt({ each: true }) @Min(1, { each: true }) nextCards!: number[];
  @IsArray() @ArrayMaxSize(3) @IsInt({ each: true }) @Min(1, { each: true }) @Max(6, { each: true }) dice!: number[];
}
export class SandboxScenarioDto implements SandboxScenario {
  @IsIn(["RAT_RACE", "FAST_TRACK"]) track!: "RAT_RACE" | "FAST_TRACK";
  @IsUUID("loose") firstPlayerId!: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) @ValidateNested({ each: true }) @Type(() => SandboxPlayerDto) players!: SandboxPlayerDto[];
}
export const sandboxActions = [
  "player:roll_dice", "turn:skip", "card:draw", "deal:buy", "deal:decline",
  "deal:auction_start", "deal:auction_bid", "deal:auction_decline", "deal:auction_select", "deal:auction_cancel",
  "stock:sell", "stock:decline", "market:sell", "market:decline", "charity:accept", "charity:decline",
  "baby:gift", "doodad:pay_cash", "doodad:pay_credit", "loan:take", "loan:repay",
  "bankruptcy:asset_sell", "bankruptcy:debt_repay", "fast-track/enter", "fast-track/decision", "roll", "202/command"
] as const;
export class SandboxActionDto {
  @IsInt() @Min(1) run!: number;
  @IsUUID("loose") playerId!: string;
  @IsIn(sandboxActions) action!: typeof sandboxActions[number];
  @IsObject() payload!: Record<string, unknown>;
}
