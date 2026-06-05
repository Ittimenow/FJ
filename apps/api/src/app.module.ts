import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { GamesModule } from "./games/games.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaService } from "./prisma/prisma.service";
import { UsersModule } from "./users/users.module";

@Controller()
class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  root() {
    const web = process.env.APP_PUBLIC_URL ?? process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const publicAppUrl =
      process.env.API_PUBLIC_URL === undefined && process.env.APP_PUBLIC_URL
        ? process.env.APP_PUBLIC_URL.replace(/\/+$/, "")
        : null;
    const api =
      process.env.API_PUBLIC_URL ??
      (publicAppUrl
        ? `${publicAppUrl}${process.env.API_PROXY_PATH ?? "/backend"}/api`
        : `http://localhost:${process.env.API_PORT ?? 4000}/api`);

    return {
      service: "Financial Journey API",
      status: "ok",
      web,
      api
    };
  }

  @Get("health/db")
  async databaseHealth() {
    if (!process.env.DATABASE_URL) {
      return {
        status: "error",
        databaseUrlConfigured: false,
        databaseConnected: false,
        error: "DATABASE_URL is not set"
      };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        databaseUrlConfigured: true,
        databaseConnected: true,
        error: null
      };
    } catch (error) {
      return {
        status: "error",
        databaseUrlConfigured: true,
        databaseConnected: false,
        error: classifyDatabaseError(error)
      };
    }
  }
}

function classifyDatabaseError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : null;
  const message = error instanceof Error ? error.message : String(error);

  if (code === "P1001" || message.includes("Can't reach database server")) {
    return "Database server is unreachable";
  }
  if (code === "P1000" || message.includes("Authentication failed")) {
    return "Database authentication failed";
  }
  if (code === "P1003" || message.includes("does not exist")) {
    return "Database does not exist";
  }
  if (message.includes("Environment variable `DATABASE_URL`")) {
    return "DATABASE_URL is invalid";
  }

  return code ? `Database error ${code}` : "Database error";
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
