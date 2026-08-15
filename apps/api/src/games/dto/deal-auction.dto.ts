import { Type } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";

export class StartDealAuctionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cardId!: number;
}

export class DealAuctionBidDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;
}

export class SelectDealAuctionOfferDto {
  @IsString()
  buyerGamePlayerId!: string;
}
