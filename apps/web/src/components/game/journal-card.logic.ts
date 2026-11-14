import { localizeGameText } from "../../lib/game-labels";

const space = /[\s\u00a0\u202f]+/g;
const amountSource = "[+−-]?(?:\\$\\s*)?\\d[\\d \\u00a0\\u202f.,]*(?:\\s*\\$)?";
const labels: Record<string, string> = {
  "цена": "price", "стоимость": "price", "цена сегодня": "quote", "котировка за акцию": "quote",
  "первый взнос": "down", "первоначальный взнос": "down", "ипотека": "mortgage",
  "денежный поток": "cashflow", "денежный поток объекта": "cashflow",
  "оплата при покупке": "fee"
};

function normalize(text: string) {
  return localizeGameText(text).toLocaleLowerCase("ru").replace(/ё/g, "е").replace(space, " ").trim();
}

function amount(text: string) {
  const compact = text.replace(/[\s\u00a0\u202f$+]/g, "").replace(/−/g, "-");
  // Card imports use both $60,000 and the Russian 60 000,50 $ spelling.
  const value = /^-?\d{1,3}(?:,\d{3})+$/.test(compact) ? compact.replaceAll(",", "") : compact.replace(",", ".");
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Match complete, labelled facts only; equal amounts alone do not mean equal terms. */
function fact(text: string) {
  const match = /^([^:]+):\s*(.+)$/.exec(normalize(text));
  const field = match && labels[match[1]!.trim()];
  if (!match || !field) return null;
  const value = new RegExp(`^(${amountSource})(?:\\s*\\/\\s*мес(?:яц)?\\.?)?$`).exec(match[2]!);
  if (!value || !value[1]!.includes("$")) return null;
  const number = amount(value[1]!);
  const monthly = /\/\s*мес/.test(match[2]!);
  return number === null ? null : `${field}:${number}${monthly && field !== "cashflow" ? ":monthly" : ""}`;
}

type CardText = { title: string; bodyText?: string | null; financialDetails?: string[]; effectDetails?: string[] };

/** One shared presentation pass for 101, 202 and other JournalCard consumers. */
export function uniqueJournalCardText({title, bodyText, financialDetails = [], effectDetails = []}: CardText) {
  const lines = (bodyText ?? "").split(/\r?\n/);
  const narrativeFacts = new Set<string>();
  for (const line of lines) {
    // Keep narrative context, omitting only the corresponding extra summary row.
    const normalized = normalize(line);
    const down = new RegExp(`(?:с )?первоначальным взносом\\s+(${amountSource})`).exec(normalized);
    const fee = new RegExp(`заплатите(?: всего)?\\s+(${amountSource})\\s+гонорара юристу`).exec(normalized);
    if (down?.[1]?.includes("$")) narrativeFacts.add(`down:${amount(down[1])}`);
    if (fee?.[1]?.includes("$")) narrativeFacts.add(`fee:${amount(fee[1])}`);
  }
  const seen = new Set<string>();
  const unique = (rows: string[]) => rows.filter(row => {
    const key = fact(row) ?? normalize(row);
    if (seen.has(key) || narrativeFacts.has(key)) return false;
    seen.add(key);
    return true;
  });
  const financial = unique(financialDetails);
  const effects = unique(effectDetails);
  const body = lines.filter(line => {
    const text = normalize(line);
    if (!text) return true;
    if (text === normalize(title)) return false;
    const key = fact(line) ?? text;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return {bodyText: body, financialDetails: financial, effectDetails: effects};
}
