import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class BuyDealDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cardId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}
