import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class TakeLoanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(Number.MAX_SAFE_INTEGER)
  amountCents!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  paymentCents?: number;
}

export class RepayLoanDto {
  @IsOptional()
  liabilityId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amountCents!: number;
}
