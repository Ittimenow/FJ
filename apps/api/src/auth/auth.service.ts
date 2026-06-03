import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, SystemRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const [existing, userCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.count()
    ]);
    if (existing) throw new ConflictException("Email is already registered");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const adminEmails = (this.config.get<string>("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName,
        role:
          userCount === 0 || adminEmails.includes(email)
            ? SystemRole.ADMIN
            : SystemRole.USER
      }
    });

    return this.authPayload(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });

    if (!user) throw new UnauthorizedException("Invalid email or password");
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is blocked or deleted");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid email or password");

    return this.authPayload(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
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
        role: user.role,
        status: user.status
      }
    };
  }
}
