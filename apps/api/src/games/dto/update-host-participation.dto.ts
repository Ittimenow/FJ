import { IsBoolean } from "class-validator";

export class UpdateHostParticipationDto {
  @IsBoolean()
  participates!: boolean;
}
