import { IsHexadecimal, IsString, Length, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString({ message: "Код восстановления отсутствует." })
  @Length(64, 64, { message: "Код восстановления имеет неверный формат." })
  @IsHexadecimal({ message: "Код восстановления имеет неверный формат." })
  token!: string;

  @IsString({ message: "Введите новый пароль." })
  @MinLength(8, { message: "Пароль должен содержать не менее 8 символов." })
  @MaxLength(128, { message: "Пароль должен содержать не более 128 символов." })
  password!: string;
}
