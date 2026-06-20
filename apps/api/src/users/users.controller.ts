import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UseGuards
} from "@nestjs/common";
import {
  AuthenticatedUser,
  CurrentUser
} from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateAvatarDto } from "./dto/update-avatar.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.profile(user.userId);
  }

  @Patch("me")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto
  ) {
    return this.users.updateProfile(user.userId, dto);
  }

  @Put("me/avatar")
  updateAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvatarDto
  ) {
    return this.users.updateAvatar(user.userId, dto.avatarDataUrl);
  }

  @Delete("me/avatar")
  @HttpCode(HttpStatus.OK)
  removeAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.users.removeAvatar(user.userId);
  }

  @Patch("me/password")
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto
  ) {
    return this.users.changePassword(user.userId, dto);
  }
}
