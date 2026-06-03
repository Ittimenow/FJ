import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import {
  AuthenticatedUser,
  CurrentUser
} from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AdminService } from "./admin.service";
import { AdminCreateUserDto } from "./dto/create-user.dto";
import { AdminUpdateUserRoleDto } from "./dto/update-user-role.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
@Controller("admin/users")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  listUsers() {
    return this.admin.listUsers();
  }

  @Post()
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.admin.createUser(dto);
  }

  @Patch(":id/role")
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateUserRoleDto
  ) {
    return this.admin.updateRole(user.userId, id, dto);
  }

  @Patch(":id/block")
  block(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.blockUser(user.userId, id);
  }

  @Patch(":id/unblock")
  unblock(@Param("id") id: string) {
    return this.admin.unblockUser(id);
  }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.deleteUser(user.userId, id);
  }
}
