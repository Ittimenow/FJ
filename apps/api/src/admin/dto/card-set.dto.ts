import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateCardSetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class CreateCardSetDto extends UpdateCardSetDto {
  @IsOptional()
  @IsIn(["101", "202"])
  gameType?: "101" | "202";
}
