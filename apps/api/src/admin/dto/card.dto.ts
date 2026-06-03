import { CardType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";

export class AdminCardMetaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @MaxLength(120)
  metaKey!: string;

  @IsString()
  @MaxLength(2000)
  metaValue!: string;
}

export class AdminCardEffectDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @MaxLength(120)
  effectType!: string;

  @IsOptional()
  @IsInt()
  amountCents?: number | null;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class AdminCardConditionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @MaxLength(120)
  condType!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class AdminCardDto {
  @IsEnum(CardType)
  cardType!: CardType;

  @IsString()
  @MaxLength(160)
  slug!: string;

  @IsString()
  @MaxLength(240)
  title!: string;

  @IsString()
  @MaxLength(4000)
  bodyText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subcategory?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCardMetaDto)
  meta?: AdminCardMetaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCardEffectDto)
  effects?: AdminCardEffectDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCardConditionDto)
  conditions?: AdminCardConditionDto[];
}
