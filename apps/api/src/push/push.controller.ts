import { Body, Controller, Delete, Get, Put, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { PushService } from "./push.service";
import { PushSubscriptionDto, RemovePushSubscriptionDto } from "./push.dto";

@UseGuards(JwtAuthGuard)
@Controller("users/me/push")
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get("config")
  config() {
    return this.push.config();
  }

  @Put("subscription")
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: PushSubscriptionDto) {
    return this.push.subscribe(user.userId, dto);
  }

  @Delete("subscription")
  unsubscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: RemovePushSubscriptionDto) {
    return this.push.unsubscribe(user.userId, dto.endpoint);
  }
}
