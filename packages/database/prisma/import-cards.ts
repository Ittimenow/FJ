import { CardType, Prisma, PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cardImportScope,
  classifyCardChanges,
  normalizeTargetCardSetName,
  type ImportCard,
  validateCardBatch
} from "../src/card-import";

const repoRoot = resolve(process.cwd(), "../..");

if (!process.env.DATABASE_URL) {
  const envFile = resolve(repoRoot, ".env");
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .find((row) => /^\s*DATABASE_URL\s*=/.test(row));
    const value = line?.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim();
    if (value) {
      process.env.DATABASE_URL = value.replace(/^("|')(.*)\1$/, "$2");
    }
  }
}

const prisma = new PrismaClient();

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function dbCard(card: {
  cardType: CardType;
  slug: string;
  title: string;
  bodyText: string;
  category: string | null;
  subcategory: string | null;
  isActive: boolean;
  meta: Array<{ metaKey: string; metaValue: string }>;
  effects: Array<{ effectType: string; amountCents: bigint | null; payload: Prisma.JsonValue }>;
  conditions: Array<{ condType: string; payload: Prisma.JsonValue }>;
}): ImportCard {
  return {
    cardType: card.cardType,
    slug: card.slug,
    title: card.title,
    bodyText: card.bodyText,
    category: card.category,
    subcategory: card.subcategory,
    isActive: card.isActive,
    meta: card.meta.map(({ metaKey, metaValue }) => ({ metaKey, metaValue })),
    effects: card.effects.map(({ effectType, amountCents, payload }) => ({
      effectType,
      amountCents: amountCents === null ? null : Number(amountCents),
      payload: payload as Record<string, unknown>
    })),
    conditions: card.conditions.map(({ condType, payload }) => ({
      condType,
      payload: payload as Record<string, unknown>
    }))
  };
}

function cardData(card: ImportCard) {
  return {
    cardType: card.cardType,
    slug: card.slug,
    title: card.title,
    bodyText: card.bodyText,
    category: card.category,
    subcategory: card.subcategory,
    isActive: card.isActive
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: npm run db:import-cards -- --set NAME [--file PATH] [--dry-run|--apply] [--allow-production]");
    return;
  }

  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;
  if (apply && process.argv.includes("--dry-run")) throw new Error("Выберите только один режим: --dry-run или --apply");
  if (apply && process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error("Запись в production заблокирована. Требуется отдельное явное разрешение и флаг --allow-production");
  }
  const targetSetName = normalizeTargetCardSetName(argument("--set"));

  const file = resolve(argument("--file") ?? resolve(repoRoot, "dist/recognized_original_cards_ru.json"));
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const validation = validateCardBatch(parsed);
  if (validation.errors.length > 0) {
    console.error(JSON.stringify({ created: 0, updated: 0, unchanged: 0, rejected: validation.errors.length, errors: validation.errors }, null, 2));
    process.exitCode = 1;
    return;
  }

  const targetSet = await prisma.cardSet.findUnique({
    where: { name: targetSetName },
    select: { id: true, name: true }
  });
  const existingRows = targetSet
    ? await prisma.card.findMany({
        where: cardImportScope(
          targetSet.id,
          validation.cards.map((card) => card.slug)
        ),
        include: {
          meta: { orderBy: { id: "asc" } },
          effects: { orderBy: { id: "asc" } },
          conditions: { orderBy: { id: "asc" } }
        }
      })
    : [];
  const plan = classifyCardChanges(validation.cards, existingRows.map(dbCard));

  if (apply && (!targetSet || plan.created.length > 0 || plan.updated.length > 0)) {
    const existingBySlug = new Map(existingRows.map((card) => [card.slug, card]));
    await prisma.$transaction(async (tx) => {
      const writeSet = targetSet ?? await tx.cardSet.create({
        data: { name: targetSetName },
        select: { id: true }
      });
      for (const card of [...plan.created, ...plan.updated]) {
        const current = existingBySlug.get(card.slug);
        if (current) {
          await tx.cardCondition.deleteMany({ where: { cardId: current.id } });
          await tx.cardEffect.deleteMany({ where: { cardId: current.id } });
          await tx.cardMeta.deleteMany({ where: { cardId: current.id } });
          await tx.card.update({ where: { id: current.id }, data: cardData(card) });
          if (card.meta.length > 0) await tx.cardMeta.createMany({ data: card.meta.map((row) => ({ cardId: current.id, ...row })) });
          if (card.effects.length > 0) await tx.cardEffect.createMany({ data: card.effects.map((row) => ({ cardId: current.id, effectType: row.effectType, amountCents: row.amountCents, payload: row.payload as Prisma.InputJsonValue })) });
          if (card.conditions.length > 0) await tx.cardCondition.createMany({ data: card.conditions.map((row) => ({ cardId: current.id, condType: row.condType, payload: row.payload as Prisma.InputJsonValue })) });
        } else {
          await tx.card.create({
            data: {
              cardSetId: writeSet.id,
              ...cardData(card),
              meta: card.meta.length > 0 ? { create: card.meta } : undefined,
              effects: card.effects.length > 0 ? { create: card.effects.map((row) => ({ effectType: row.effectType, amountCents: row.amountCents, payload: row.payload as Prisma.InputJsonValue })) } : undefined,
              conditions: card.conditions.length > 0 ? { create: card.conditions.map((row) => ({ condType: row.condType, payload: row.payload as Prisma.InputJsonValue })) } : undefined
            }
          });
        }
      }
    }, { maxWait: 10_000, timeout: 120_000 });
  }

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "apply",
    file,
    targetSet: targetSetName,
    targetSetExists: Boolean(targetSet),
    targetSetWillBeCreated: !targetSet,
    created: plan.created.length,
    updated: plan.updated.length,
    unchanged: plan.unchanged.length,
    rejected: 0,
    createdSlugs: plan.created.map((card) => card.slug),
    updatedSlugs: plan.updated.map((card) => card.slug)
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
