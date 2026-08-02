import { IsEmail } from "class-validator";
import { Transform } from "class-transformer";

export class ForgotPasswordDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: "Введите корректный адрес электронной почты." })
  email!: string;
}
