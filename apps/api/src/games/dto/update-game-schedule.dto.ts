import { IsString, Matches } from "class-validator";

export class UpdateGameScheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  scheduledLocal!: string;
}
