import { IsUUID } from "class-validator";

export class MarketSaleDecisionDto {
  @IsUUID()
  assetId!: string;
}
