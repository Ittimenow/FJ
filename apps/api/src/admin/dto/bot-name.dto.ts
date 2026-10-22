import { IsString, MaxLength } from "class-validator";

export class CreateBotNameDto {
  @IsString()
  @MaxLength(30)
  name!: string;
}
