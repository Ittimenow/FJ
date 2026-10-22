import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, "../../../.env");
try {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
} catch {
  // Production supplies DATABASE_URL through the environment.
}

const names = JSON.parse(readFileSync(resolve(here, "data/bot-names.json"), "utf8")) as string[];

export async function seedBotNames(prisma: PrismaClient) {
  await prisma.botName.createMany({
    data: names.map((name) => ({ name })),
    skipDuplicates: true
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const prisma = new PrismaClient();
  seedBotNames(prisma)
    .then(() => console.log(`Имена ботов готовы: ${names.length}`))
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
