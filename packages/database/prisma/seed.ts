import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CardType, Prisma, PrismaClient, ProfessionLineSection } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function loadRootEnv() {
  const file = resolve(repoRoot, ".env");
  if (!existsSync(file)) return;

  const env = readFileSync(file, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

loadRootEnv();

const prisma = new PrismaClient();

type SqlValue = string | number | null | { variable: string };
type SqlRow = Record<string, SqlValue>;
type SqlContext = Record<string, SqlValue>;

interface ParsedInsert {
  table: string;
  columns: string[];
  rows: SqlValue[][];
}

const cardTypeMap: Record<string, CardType> = {
  small_deal: CardType.SMALL_DEAL,
  big_deal: CardType.BIG_DEAL,
  market: CardType.MARKET,
  doodad: CardType.DOODAD,
  fast_track: CardType.FAST_TRACK,
  dream: CardType.DREAM
};

const sectionMap: Record<string, ProfessionLineSection> = {
  income: ProfessionLineSection.INCOME,
  expense: ProfessionLineSection.EXPENSE,
  asset: ProfessionLineSection.ASSET,
  liability: ProfessionLineSection.LIABILITY,
  total: ProfessionLineSection.TOTAL
};

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inString && char === "\\") {
      current += char;
      if (next) {
        current += next;
        index += 1;
      }
      continue;
    }

    if (char === "'") {
      current += char;
      if (inString && next === "'") {
        current += next;
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === ";" && !inString) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function splitColumns(columns: string): string[] {
  return columns
    .split(",")
    .map((column) => column.trim().replace(/`/g, ""))
    .filter(Boolean);
}

function parseInsert(statement: string): ParsedInsert | null {
  const match = statement.match(
    /^INSERT\s+INTO\s+`?([a-z_]+)`?\s*\(([\s\S]+?)\)\s+VALUES\s+([\s\S]+)$/i
  );

  if (!match) return null;

  const [, table, rawColumns, rawValues] = match;
  const values = rawValues
    .replace(/\s+ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, "")
    .trim();

  return {
    table,
    columns: splitColumns(rawColumns),
    rows: parseValueRows(values)
  };
}

function parseValueRows(values: string): SqlValue[][] {
  const rows: SqlValue[][] = [];
  let depth = 0;
  let inString = false;
  let current = "";

  for (let index = 0; index < values.length; index += 1) {
    const char = values[index];
    const next = values[index + 1];

    if (inString && char === "\\") {
      current += char;
      if (next) {
        current += next;
        index += 1;
      }
      continue;
    }

    if (char === "'") {
      current += char;
      if (inString && next === "'") {
        current += next;
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (!inString && char === "(") {
      if (depth === 0) {
        current = "";
        depth = 1;
        continue;
      }
      depth += 1;
    }

    if (!inString && char === ")") {
      depth -= 1;
      if (depth === 0) {
        rows.push(parseTuple(current));
        current = "";
        continue;
      }
    }

    if (depth > 0) current += char;
  }

  return rows;
}

function parseTuple(tuple: string): SqlValue[] {
  const values: string[] = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < tuple.length; index += 1) {
    const char = tuple[index];
    const next = tuple[index + 1];

    if (inString && char === "\\") {
      current += char;
      if (next) {
        current += next;
        index += 1;
      }
      continue;
    }

    if (char === "'") {
      current += char;
      if (inString && next === "'") {
        current += next;
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === "," && !inString) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map(parseSqlValue);
}

function parseSqlValue(value: string): SqlValue {
  if (/^null$/i.test(value)) return null;
  if (/^@[a-z_]+$/i.test(value)) return { variable: value.slice(1) };
  if (/^[+-]?\d+$/.test(value)) return Number(value);

  if (value.startsWith("'") && value.endsWith("'")) {
    return value
      .slice(1, -1)
      .replace(/''/g, "'")
      .replace(/\\'/g, "'")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r");
  }

  return value;
}

function rowFromInsert(
  insert: ParsedInsert,
  values: SqlValue[],
  context: SqlContext
): SqlRow {
  return insert.columns.reduce<SqlRow>((row, column, index) => {
    const value = values[index] ?? null;
    row[column] =
      typeof value === "object" && value !== null && "variable" in value
        ? context[value.variable] ?? null
        : value;
    return row;
  }, {});
}

function requireString(value: SqlValue, field: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  throw new Error(`Expected string for ${field}`);
}

function nullableString(value: SqlValue): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : String(value);
}

function nullableBigInt(value: SqlValue): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value.trim() !== "") return BigInt(value);
  return null;
}

function bigIntOrZero(value: SqlValue): bigint {
  return nullableBigInt(value) ?? 0n;
}

function intOrDefault(value: SqlValue, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return fallback;
}

function jsonOrDefault(value: SqlValue): Prisma.InputJsonValue {
  if (value === null || value === undefined || value === "") return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed === null ? {} : (parsed as Prisma.InputJsonValue);
    } catch {
      return {};
    }
  }
  return {};
}

async function seedProfessions() {
  const file = resolve(repoRoot, "dist/seed_professions.sql");
  if (!existsSync(file)) {
    console.warn("Skipping professions: dist/seed_professions.sql not found");
    return;
  }

  console.log("Seeding professions from dist/seed_professions.sql");
  await prisma.professionLine.deleteMany();
  await prisma.profession.deleteMany();

  const context: SqlContext = {};
  const statements = splitSqlStatements(readFileSync(file, "utf8"));

  for (const statement of statements) {
    const insert = parseInsert(statement);
    if (!insert) continue;

    if (insert.table === "professions") {
      const row = rowFromInsert(insert, insert.rows[0] ?? [], context);
      const profession = await prisma.profession.create({
        data: {
          slug: requireString(row.slug, "profession.slug"),
          name: requireString(row.name, "profession.name"),
          salaryCents: nullableBigInt(row.salary_cents),
          interestCents: nullableBigInt(row.interest_cents),
          dividendsCents: nullableBigInt(row.dividends_cents),
          realestateBusinessCents: nullableBigInt(
            row.realestate_business_cents
          ),
          passiveIncomeCents: nullableBigInt(row.passive_income_cents),
          totalIncomeCents: nullableBigInt(row.total_income_cents),
          taxesCents: nullableBigInt(row.taxes_cents),
          mortgagePaymentCents: nullableBigInt(row.mortgage_payment_cents),
          schoolLoanPaymentCents: nullableBigInt(
            row.school_loan_payment_cents
          ),
          carLoanPaymentCents: nullableBigInt(row.car_loan_payment_cents),
          creditCardPaymentCents: nullableBigInt(
            row.credit_card_payment_cents
          ),
          retailPaymentCents: nullableBigInt(row.retail_payment_cents),
          otherExpensesCents: nullableBigInt(row.other_expenses_cents),
          childrenExpenseCents: nullableBigInt(row.children_expense_cents),
          perChildCostCents: nullableBigInt(row.per_child_cost_cents),
          totalExpensesCents: nullableBigInt(row.total_expenses_cents),
          monthlyCashflowCents: nullableBigInt(row.monthly_cashflow_cents),
          savingsCents: nullableBigInt(row.savings_cents),
          homeMortgageCents: nullableBigInt(row.home_mortgage_cents),
          schoolDebtCents: nullableBigInt(row.school_debt_cents),
          carDebtCents: nullableBigInt(row.car_debt_cents),
          creditCardsDebtCents: nullableBigInt(row.credit_cards_debt_cents),
          retailDebtCents: nullableBigInt(row.retail_debt_cents)
        }
      });
      context.pid = profession.id;
      continue;
    }

    if (insert.table === "profession_lines") {
      const rows = insert.rows.map((values) =>
        rowFromInsert(insert, values, context)
      );
      await prisma.professionLine.createMany({
        data: rows.map((row) => {
          const section = requireString(row.section, "profession_lines.section");
          return {
            professionId: intOrDefault(row.profession_id, 0),
            section: sectionMap[section],
            label: requireString(row.label, "profession_lines.label"),
            amountCents: nullableBigInt(row.amount_cents),
            sortOrder: intOrDefault(row.sort_order, 100)
          };
        })
      });
    }
  }
}

async function seedCards() {
  const file = resolve(repoRoot, "dist/seed_cards.sql");
  if (!existsSync(file)) {
    console.warn("Skipping cards: dist/seed_cards.sql not found");
    return;
  }

  console.log("Seeding cards from dist/seed_cards.sql");
  await prisma.cardCondition.deleteMany();
  await prisma.cardEffect.deleteMany();
  await prisma.cardMeta.deleteMany();
  await prisma.card.deleteMany();

  const context: SqlContext = {};
  const statements = splitSqlStatements(readFileSync(file, "utf8"));
  const usedSlugs = new Map<string, number>();

  for (const statement of statements) {
    const insert = parseInsert(statement);
    if (!insert) continue;

    if (insert.table === "cards") {
      const row = rowFromInsert(insert, insert.rows[0] ?? [], context);
      const sourceSlug = requireString(row.slug, "cards.slug");
      const slugCount = usedSlugs.get(sourceSlug) ?? 0;
      usedSlugs.set(sourceSlug, slugCount + 1);
      const slug = slugCount === 0 ? sourceSlug : `${sourceSlug}-${slugCount + 1}`;
      const rawCardType = requireString(row.card_type, "cards.card_type");
      const cardType = cardTypeMap[rawCardType];
      if (!cardType) throw new Error(`Unsupported card type: ${rawCardType}`);

      const card = await prisma.card.create({
        data: {
          cardType,
          slug,
          title: requireString(row.title, "cards.title"),
          bodyText: requireString(row.body_text, "cards.body_text"),
          category: nullableString(row.category),
          subcategory: nullableString(row.subcategory)
        }
      });
      context.cid = card.id;
      continue;
    }

    if (insert.table === "card_meta") {
      for (const values of insert.rows) {
        const row = rowFromInsert(insert, values, context);
        const cardId = intOrDefault(row.card_id, 0);
        const metaKey = requireString(row.meta_key, "card_meta.meta_key");
        await prisma.cardMeta.upsert({
          where: {
            cardId_metaKey: {
              cardId,
              metaKey
            }
          },
          create: {
            cardId,
            metaKey,
            metaValue: requireString(row.meta_value, "card_meta.meta_value")
          },
          update: {
            metaValue: requireString(row.meta_value, "card_meta.meta_value")
          }
        });
      }
      continue;
    }

    if (insert.table === "card_effects") {
      const rows = insert.rows.map((values) =>
        rowFromInsert(insert, values, context)
      );
      await prisma.cardEffect.createMany({
        data: rows.map((row) => ({
          cardId: intOrDefault(row.card_id, 0),
          effectType: requireString(row.effect_type, "card_effects.effect_type"),
          amountCents: nullableBigInt(row.amount_cents),
          payload: jsonOrDefault(row.payload)
        }))
      });
      continue;
    }

    if (insert.table === "card_conditions") {
      const rows = insert.rows.map((values) =>
        rowFromInsert(insert, values, context)
      );
      await prisma.cardCondition.createMany({
        data: rows.map((row) => ({
          cardId: intOrDefault(row.card_id, 0),
          condType: requireString(row.cond_type, "card_conditions.cond_type"),
          payload: jsonOrDefault(row.payload)
        }))
      });
    }
  }
}

async function main() {
  await seedProfessions();
  await seedCards();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
