import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class ClientDiagnosticDto {
  @IsIn([
    "socket_connect_error",
    "socket_disconnect",
    "socket_timeout",
    "api_unavailable",
    "client_error"
  ])
  kind!: string;

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsUUID()
  gameId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  connectionState?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60_000)
  apiLatencyMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60_000)
  socketLatencyMs?: number;
}
