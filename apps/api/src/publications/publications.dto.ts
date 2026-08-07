import { PublicationMode } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from "class-validator";

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @Matches(/^https:\/\/t\.me\/(?:s\/)?[A-Za-z0-9_]+\/\d+(?:\?.*)?$/)
  postUrl!: string;

  @IsOptional()
  @IsString()
  discussionChatId?: string;

  @IsOptional()
  @Transform(({ value }) => value === "" || value == null ? undefined : Number(value))
  @IsInt()
  @Min(1)
  discussionMessageId?: number;

  @IsEnum(PublicationMode)
  mode!: PublicationMode;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  discussionChatId?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === "" || value == null ? null : Number(value))
  @IsInt()
  @Min(1)
  discussionMessageId?: number | null;

  @IsOptional()
  @IsEnum(PublicationMode)
  mode?: PublicationMode;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSummaryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  headline?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  body?: string;

  @IsOptional()
  @IsUUID()
  announcementId?: string;

  @IsOptional()
  @IsBoolean()
  visibleOnSite?: boolean;
}
