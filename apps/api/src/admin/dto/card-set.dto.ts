import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateCardSetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class UpdateCardSetDto extends CreateCardSetDto {}
