import { SystemRole } from "@prisma/client";
import { IsEnum } from "class-validator";

export class AdminUpdateUserRoleDto {
  @IsEnum(SystemRole)
  role!: SystemRole;
}
