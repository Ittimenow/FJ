import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, SystemRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { PERSONAL_DATA_CONSENT_TEXT } from "@cashflow/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const AVATAR_COLORS = [
  "#e11d48","#db2777","#9333ea","#7c3aed","#2563eb",
  "#0891b2","#0d9488","#16a34a","#ca8a04","#ea580c","#dc2626","#4f46e5"
];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService
  ) {}

  async register(dto: RegisterDto, metadata: { ipAddress: string | null; userAgent: string | null }) {
    const email = dto.email.toLowerCase();
    const [existing, userCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.count()
    ]);
    if (existing) throw new ConflictException("Аккаунт с такой электронной почтой уже существует.");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const adminEmails = (this.config.get<string>("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const user = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName,
          avatarColor: randomAvatarColor() ?? null,
          role: registrationSystemRole(
            dto.accountType,
            userCount === 0 || adminEmails.includes(email)
          )
        }
      });
      await transaction.personalDataConsent.create({
        data: {
          userId: created.id,
          version: dto.consentVersion,
          documentHash: createHash("sha256").update(PERSONAL_DATA_CONSENT_TEXT).digest("hex"),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      });
      return created;
    });

    return this.authPayload(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });

    if (!user) throw new UnauthorizedException("Неверная электронная почта или пароль.");
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Аккаунт заблокирован или удалён.");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Неверная электронная почта или пароль.");

    return this.authPayload(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, displayName: true, status: true }
    });

    if (user?.status === AccountStatus.ACTIVE) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() }
        }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt }
        })
      ]);

      const appUrl = (this.config.get<string>("APP_PUBLIC_URL") ?? this.config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000").replace(/\/+$/, "");
      await this.mail.sendPasswordReset(user.email, user.displayName, `${appUrl}/reset-password?token=${token}`);
    }

    return { message: "Если аккаунт существует, письмо со ссылкой уже отправлено." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashResetToken(dto.token);
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true, displayName: true, status: true } } }
    });

    if (!reset || reset.usedAt || reset.expiresAt <= new Date() || reset.user.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException("Ссылка восстановления недействительна или устарела.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.updateMany({
        where: {
          id: reset.id,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        data: { usedAt: new Date() }
      });
      if (consumed.count !== 1) {
        throw new BadRequestException("Ссылка восстановления недействительна или устарела.");
      }

      await transaction.user.update({
        where: { id: reset.userId },
        data: { passwordHash }
      });
      await transaction.passwordResetToken.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() }
      });
    });

    void this.mail.sendPasswordChanged(reset.user.email, reset.user.displayName);
    return { message: "Пароль успешно изменён." };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        figurine: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    return user;
  }

  private authPayload(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    figurine?: string | null;
    role: SystemRole;
    status: AccountStatus;
  }) {
    const accessToken = this.jwt.sign(
      {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status
      },
      {
        subject: user.id,
        expiresIn: this.config.get<string>("JWT_EXPIRES_IN") ?? "7d"
      }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        figurine: user.figurine ?? null,
        role: user.role,
        status: user.status
      }
    };
  }
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function registrationSystemRole(
  accountType: RegisterDto["accountType"],
  isAdmin: boolean
) {
  if (isAdmin) return SystemRole.ADMIN;
  return accountType === "HOST" ? SystemRole.HOST : SystemRole.USER;
}
