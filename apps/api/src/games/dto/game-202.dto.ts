import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { Command202 } from "@cashflow/shared";

export class Game202CommandDto implements Command202 {
  @IsInt() @Min(0) revision!: number;
  @IsIn(["roll","choose","decide","loan","repay","bankruptcy","offer","accept","reject"]) type!: Command202["type"];
  @IsOptional() @IsString() @MaxLength(80) taskId?: string;
  @IsOptional() @IsString() @MaxLength(30) choice?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000000) quantity?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000000000) amount?: number;
  @IsOptional() @IsString() @MaxLength(80) assetId?: string;
  @IsOptional() @IsString() @MaxLength(80) target?: string;
  @IsOptional() @IsString() @MaxLength(80) offerId?: string;
  @IsOptional() @IsString() @MaxLength(80) rightId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(10000) share?: number;
  @IsOptional() @IsObject() shares?: Record<string,number>;
}
