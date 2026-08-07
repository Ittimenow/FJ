import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class ExportGamesDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Выберите хотя бы одну игру" })
  @ArrayMaxSize(5000, { message: "За один раз можно выгрузить не более 5000 игр" })
  @IsUUID("4", { each: true, message: "Список содержит некорректный ID игры" })
  gameIds!: string[];
}
