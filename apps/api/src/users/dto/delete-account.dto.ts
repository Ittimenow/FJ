import { IsString, MaxLength, MinLength } from "class-validator";

export class DeleteAccountDto {
  @IsString({ message: "Введите текущий пароль." })
  @MinLength(8, { message: "Пароль должен содержать не менее 8 символов." })
  @MaxLength(128, { message: "Пароль должен содержать не более 128 символов." })
  currentPassword!: string;
}
