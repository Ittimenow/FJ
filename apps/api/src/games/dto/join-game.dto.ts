import { IsIn, IsOptional, IsString } from "class-validator";

export class JoinGameDto {
  @IsString()
  codeOrId!: string;

  @IsOptional()
  @IsIn(["PLAYER", "BANKER", "OBSERVER"])
  role?: "PLAYER" | "BANKER" | "OBSERVER";
}
