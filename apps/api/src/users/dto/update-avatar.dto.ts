import { IsString, Matches, MaxLength } from "class-validator";

export class UpdateAvatarDto {
  @IsString()
  @MaxLength(200_000, { message: "Фотография слишком большая" })
  @Matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, {
    message: "Неподдерживаемый формат фотографии"
  })
  avatarDataUrl: string;
}
