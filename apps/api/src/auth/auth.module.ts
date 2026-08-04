import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { MailModule } from "../mail/mail.module";
import { TelegramRegistrationService } from "./telegram-registration.service";

@Module({
  imports: [
    ConfigModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET") ?? "dev-secret"
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TelegramRegistrationService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
