import { normalizeTelegramChannel, TELEGRAM_CHANNEL_PATTERN } from "@cashflow/shared";
import { Transform, Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min, MinLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  gameExperience?: number;

  @IsOptional()
  @IsString()
  figurine?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["classic", "journey"])
  gameRoomView?: "classic" | "journey";

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? normalizeTelegramChannel(value) : value)
  @IsString({ message: "Введите Telegram-имя." })
  @Matches(TELEGRAM_CHANNEL_PATTERN, {
    message: "Введите Telegram-имя из 5–32 латинских букв, цифр или подчёркиваний."
  })
  telegramChannel?: string;

  @IsOptional()
  @IsUUID(undefined, { message: "Выберите город из списка." })
  cityId?: string;
}
