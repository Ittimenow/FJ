import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: "Введите корректный адрес электронной почты." })
  email!: string;

  @IsString({ message: "Введите пароль." })
  @MinLength(8, { message: "Пароль должен содержать не менее 8 символов." })
  @MaxLength(128, { message: "Пароль должен содержать не более 128 символов." })
  password!: string;
}
