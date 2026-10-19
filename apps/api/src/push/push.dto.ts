import { Type } from "class-transformer";
import { IsDefined, IsString, IsUrl, Matches, MaxLength, ValidateNested } from "class-validator";

export class PushKeysDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(256)
  p256dh!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(128)
  auth!: string;
}

export class PushSubscriptionDto {
  @IsUrl({ protocols: ["https"], require_protocol: true, require_tld: true })
  @MaxLength(2048)
  endpoint!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class RemovePushSubscriptionDto {
  @IsUrl({ protocols: ["https"], require_protocol: true, require_tld: true })
  @MaxLength(2048)
  endpoint!: string;
}
