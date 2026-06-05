import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

for (const envPath of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../..", ".env")
]) {
  if (existsSync(envPath)) loadEnv({ path: envPath });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
