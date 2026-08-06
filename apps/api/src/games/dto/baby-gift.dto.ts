import { Type } from "class-transformer";
import { IsInt, IsUUID, Max, Min } from "class-validator";

export class BabyGiftDto {
  @IsUUID()
  birthEventId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountCents!: number;
}
