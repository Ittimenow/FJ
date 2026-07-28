import { IsString } from "class-validator";

export class ChooseFigurineDto {
  @IsString()
  figurine!: string;
}
