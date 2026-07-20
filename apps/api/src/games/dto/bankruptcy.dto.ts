import { Type } from "class-transformer";
import { IsInt, IsUUID, Min } from "class-validator";

export class SellBankruptcyAssetDto {
  @IsUUID()
  assetId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class RepayBankruptcyDebtDto {
  @IsUUID()
  liabilityId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;
}
