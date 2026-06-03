import { GameRole } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class AddGameUserDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(GameRole)
  role!: GameRole;
}
