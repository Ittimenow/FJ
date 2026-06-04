import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { GamesModule } from "./games/games.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Controller()
class AppController {
  @Get()
  root() {
    return {
      service: "Financial Journey API",
      status: "ok",
      web: "http://localhost:3000",
      api: "http://localhost:4000/api"
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AdminModule,
    UsersModule,
    GamesModule
  ],
  controllers: [AppController]
})
export class AppModule {}
