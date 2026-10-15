import { BadRequestException } from "@nestjs/common";
import { CardType } from "@prisma/client";
import * as XLSX from "xlsx";

export interface WorkbookCard {
  id: number | null;
  cardSetId: string;
  cardType: CardType;
  slug: string;
  title: string;
  bodyText: string;
  category: string | null;
  subcategory: string | null;
  isActive: boolean;
  meta: Array<{ metaKey: string; metaValue: string }>;
  effects: Array<{ effectType: string; amountCents: number | null; payload: Record<string, unknown> }>;
  conditions: Array<{ condType: string; payload: Record<string, unknown> }>;
}

export interface WorkbookSet { id: string; name: string; isDefault: boolean }

const cardHeaders = ["id", "cardSetId", "cardType", "slug", "title", "bodyText", "category", "subcategory", "isActive", "meta", "effects", "conditions"];
const setHeaders = ["id", "name", "isDefault"];

function cellText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function requiredText(value: unknown, label: string): string {
  const text = cellText(value).trim();
  if (!text) throw new BadRequestException(`${label}: значение обязательно`);
  return text;
}

function jsonArray(value: unknown, label: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(cellText(value) || "[]");
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new BadRequestException(`${label}: ожидается JSON-массив`);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRelations(row: Record<string, unknown>, index: number) {
  const meta = jsonArray(row.meta, `Строка ${index}, meta`).map((item) => {
    if (!record(item) || typeof item.metaKey !== "string" || typeof item.metaValue !== "string") {
      throw new BadRequestException(`Строка ${index}: неверный элемент meta`);
    }
    return { metaKey: item.metaKey, metaValue: item.metaValue };
  });
  const effects = jsonArray(row.effects, `Строка ${index}, effects`).map((item) => {
    if (!record(item) || typeof item.effectType !== "string" || !record(item.payload) ||
      (item.amountCents !== null && (!Number.isSafeInteger(item.amountCents)))) {
      throw new BadRequestException(`Строка ${index}: неверный элемент effects`);
    }
    return { effectType: item.effectType, amountCents: item.amountCents as number | null, payload: item.payload };
  });
  const conditions = jsonArray(row.conditions, `Строка ${index}, conditions`).map((item) => {
    if (!record(item) || typeof item.condType !== "string" || !record(item.payload)) {
      throw new BadRequestException(`Строка ${index}: неверный элемент conditions`);
    }
    return { condType: item.condType, payload: item.payload };
  });
  return { meta, effects, conditions };
}

function rows(sheet: XLSX.WorkSheet | undefined, headers: string[], name: string) {
  if (!sheet) throw new BadRequestException(`Лист «${name}» не найден`);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  if (JSON.stringify(matrix[0]) !== JSON.stringify(headers)) {
    throw new BadRequestException(`На листе «${name}» изменены названия или порядок столбцов`);
  }
  return matrix.slice(1).filter((values) => values.some((value) => cellText(value).trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
}

export function writeCardWorkbook(sets: WorkbookSet[], cards: WorkbookCard[]): Buffer {
  if (sets.length > 65535 || cards.length > 65535) {
    throw new BadRequestException("Для формата .xls превышен предел в 65 535 строк на лист");
  }
  for (const card of cards) {
    for (const value of [card.slug, card.title, card.bodyText, card.category, card.subcategory,
      JSON.stringify(card.meta), JSON.stringify(card.effects), JSON.stringify(card.conditions)]) {
      if (value && value.length > 32767) {
        throw new BadRequestException(`Карточка #${card.id}: значение не помещается в ячейку .xls`);
      }
    }
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    setHeaders,
    ...sets.map((set) => [set.id, set.name, String(set.isDefault)])
  ]), "Наборы");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    cardHeaders,
    ...cards.map((card) => [
      card.id ?? "", card.cardSetId, card.cardType, card.slug, card.title, card.bodyText,
      card.category ?? "", card.subcategory ?? "", String(card.isActive),
      JSON.stringify(card.meta), JSON.stringify(card.effects), JSON.stringify(card.conditions)
    ])
  ]), "Карточки");
  return XLSX.write(book, { type: "buffer", bookType: "biff8" }) as Buffer;
}

export function readCardWorkbook(buffer: Buffer): { sets: WorkbookSet[]; cards: WorkbookCard[] } {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(buffer, { type: "buffer", cellFormula: false, cellHTML: false, cellStyles: false });
  } catch {
    throw new BadRequestException("Не удалось прочитать Excel-файл");
  }
  const sets = rows(book.Sheets["Наборы"], setHeaders, "Наборы").map((row, index) => ({
    id: requiredText(row.id, `Наборы, строка ${index + 2}, id`),
    name: requiredText(row.name, `Наборы, строка ${index + 2}, name`),
    isDefault: cellText(row.isDefault).toLowerCase() === "true"
  }));
  if (!sets.length || new Set(sets.map((set) => set.id)).size !== sets.length) {
    throw new BadRequestException("Лист «Наборы» пуст или содержит повторяющиеся ID");
  }
  const cards = rows(book.Sheets["Карточки"], cardHeaders, "Карточки").map((row, index) => {
    const line = index + 2;
    const idText = cellText(row.id).trim();
    const id = idText ? Number(idText) : null;
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) {
      throw new BadRequestException(`Карточки, строка ${line}: неверный id`);
    }
    const cardType = requiredText(row.cardType, `Карточки, строка ${line}, cardType`);
    if (!Object.values(CardType).includes(cardType as CardType)) {
      throw new BadRequestException(`Карточки, строка ${line}: неизвестный тип карточки`);
    }
    const active = cellText(row.isActive).toLowerCase();
    if (active !== "true" && active !== "false") {
      throw new BadRequestException(`Карточки, строка ${line}: isActive должен быть true или false`);
    }
    const cardSetId = requiredText(row.cardSetId, `Карточки, строка ${line}, cardSetId`);
    if (!sets.some((set) => set.id === cardSetId)) {
      throw new BadRequestException(`Карточки, строка ${line}: набор отсутствует на листе «Наборы»`);
    }
    return {
      id,
      cardSetId,
      cardType: cardType as CardType,
      slug: requiredText(row.slug, `Карточки, строка ${line}, slug`),
      title: requiredText(row.title, `Карточки, строка ${line}, title`),
      bodyText: requiredText(row.bodyText, `Карточки, строка ${line}, bodyText`),
      category: cellText(row.category).trim() || null,
      subcategory: cellText(row.subcategory).trim() || null,
      isActive: active === "true",
      ...parseRelations(row, line)
    };
  });
  const ids = cards.filter((card) => card.id !== null).map((card) => card.id);
  const slugs = cards.map((card) => `${card.cardSetId}:${card.slug}`);
  if (new Set(ids).size !== ids.length || new Set(slugs).size !== slugs.length) {
    throw new BadRequestException("В файле повторяются ID карточек или slug внутри набора");
  }
  return { sets, cards };
}

export function cardSnapshot(card: WorkbookCard): string {
  const { id: _id, ...content } = card;
  return JSON.stringify(content);
}

export function cardDifferences(before: WorkbookCard, after: WorkbookCard): string[] {
  const fields: Array<keyof WorkbookCard> = ["cardSetId", "cardType", "slug", "title", "bodyText", "category", "subcategory", "isActive", "meta", "effects", "conditions"];
  return fields.filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}
