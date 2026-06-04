"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";

type AdminCardsView = "editor" | "unclear";
type AdminCardType =
  | "SMALL_DEAL"
  | "BIG_DEAL"
  | "DOODAD"
  | "MARKET"
  | "FAST_TRACK"
  | "DREAM";

interface ApiCard {
  id: number;
  cardType: AdminCardType;
  slug: string;
  title: string;
  bodyText: string;
  category: string | null;
  subcategory: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  meta: Array<{
    id: number;
    metaKey: string;
    metaValue: string;
  }>;
  effects: Array<{
    id: number;
    effectType: string;
    amountCents: number | null;
    payload: Record<string, unknown>;
  }>;
  conditions: Array<{
    id: number;
    condType: string;
    payload: Record<string, unknown>;
  }>;
}

const cardTypes: Array<{ value: AdminCardType; label: string }> = [
  { value: "SMALL_DEAL", label: "Сделка мелкая" },
  { value: "BIG_DEAL", label: "Сделка крупная" },
  { value: "DOODAD", label: "Всякая всячина" },
  { value: "MARKET", label: "Рынок" },
  { value: "FAST_TRACK", label: "Быстрая дорожка" },
  { value: "DREAM", label: "Мечта" }
];

export function AdminCardsPanel({ token }: { token: string }) {
  const [view, setView] = useState<AdminCardsView>("editor");
  const [filter, setFilter] = useState<AdminCardType>("SMALL_DEAL");
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCards() {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `${publicApiBaseUrl()}/api/admin/cards?cardType=${filter}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    setLoading(false);

    if (!response.ok) {
      setError("Не удалось загрузить карточки");
      return;
    }

    setCards((await response.json()) as ApiCard[]);
  }

  useEffect(() => {
    if (view !== "editor") return;
    void loadCards();
  }, [filter, view]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-line pb-4">
        <Button
          variant={view === "editor" ? "primary" : "secondary"}
          onClick={() => setView("editor")}
        >
          Редактор карточек
        </Button>
        <Button
          variant={view === "unclear" ? "primary" : "secondary"}
          onClick={() => setView("unclear")}
        >
          Непонятные карточки
        </Button>
      </div>

      {view === "unclear" ? <UnclearCardsPage token={token} /> : null}

      {view === "editor" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {cardTypes.map((type) => (
              <Button
                key={type.value}
                variant={filter === type.value ? "primary" : "secondary"}
                onClick={() => setFilter(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>

          <div className="rounded-md border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Новая карточка</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Создается в выбранном типе карточек. Meta, effects и conditions используют формат редактора.
                </p>
              </div>
              <Button
                variant={createFormOpen ? "secondary" : "primary"}
                onClick={() => setCreateFormOpen((current) => !current)}
              >
                {createFormOpen ? "Скрыть форму" : "Создать карточку"}
              </Button>
            </div>

            {createFormOpen ? (
              <CreateCardForm
                key={filter}
                token={token}
                cardType={filter}
                onCardCreated={(createdCard) => {
                  if (createdCard.cardType !== filter) {
                    setFilter(createdCard.cardType);
                    setCards([createdCard]);
                    return;
                  }

                  setCards((current) => sortCards([createdCard, ...current]));
                }}
              />
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {cardTypeLabel(filter)}: {cards.length}
            </h3>
            {loading ? <span className="text-xs text-neutral-500">Загрузка...</span> : null}
          </div>

          {cards.length === 0 && !loading ? (
            <p className="rounded-md border border-line bg-surface p-3 text-sm text-neutral-600">
              Карточек этого типа пока нет.
            </p>
          ) : null}

          {cards.length > 0 ? (
            <CardsTable
              cards={cards}
              token={token}
              onCardSaved={(savedCard) =>
                setCards((current) =>
                  current.map((card) =>
                    card.id === savedCard.id ? savedCard : card
                  )
                )
              }
              onCardDeleted={(deletedCard) =>
                setCards((current) =>
                  current.filter((card) => card.id !== deletedCard.id)
                )
              }
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function UnclearCardsPage({ token }: { token: string }) {
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCards() {
    setLoading(true);
    setError(null);

    const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/unclear`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setLoading(false);

    if (!response.ok) {
      setError("Не удалось загрузить непонятные карточки");
      return;
    }

    setCards((await response.json()) as ApiCard[]);
  }

  useEffect(() => {
    void loadCards();
  }, []);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            Непонятные карточки: {cards.length}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Активные карточки без строк в card_effects.
          </p>
        </div>
        {loading ? <span className="text-xs text-neutral-500">Загрузка...</span> : null}
      </div>

      {cards.length === 0 && !loading ? (
        <p className="rounded-md border border-line bg-surface p-3 text-sm text-neutral-600">
          Таких карточек сейчас нет.
        </p>
      ) : null}

      {cards.length > 0 ? (
        <CardsTable
          cards={cards}
          token={token}
          onCardSaved={() => void loadCards()}
          onCardDeleted={() => void loadCards()}
        />
      ) : null}
    </div>
  );
}

function CreateCardForm({
  token,
  cardType,
  onCardCreated
}: {
  token: string;
  cardType: AdminCardType;
  onCardCreated: (card: ApiCard) => void;
}) {
  const [form, setForm] = useState(() => emptyCardForm(cardType));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cardType: form.cardType,
          slug: form.slug,
          title: form.title,
          bodyText: form.bodyText,
          category: form.category,
          subcategory: form.subcategory,
          isActive: form.isActive,
          meta: parseMeta(form.metaText),
          effects: parseEffects(form.effectsText),
          conditions: parseConditions(form.conditionsText)
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const createdCard = (await response.json()) as ApiCard;
      onCardCreated(createdCard);
      setForm(emptyCardForm(cardType));
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать карточку"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={createCard}>
      <div className="grid gap-3 lg:grid-cols-[220px_1fr_1fr]">
        <label className="grid gap-1 text-xs font-medium text-neutral-600">
          Тип
          <select
            className="h-10 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-ink"
            value={form.cardType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                cardType: event.target.value as AdminCardType
              }))
            }
          >
            {cardTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <TextInput
          label="Slug"
          value={form.slug}
          onChange={(slug) => setForm((current) => ({ ...current, slug }))}
          placeholder="small_deal_custom_001"
        />
        <TextInput
          label="Название"
          value={form.title}
          onChange={(title) => setForm((current) => ({ ...current, title }))}
          placeholder="Название карточки"
        />
      </div>

      <label className="grid gap-1 text-xs font-medium text-neutral-600">
        Текст карточки
        <textarea
          className="min-h-24 rounded-md border border-line bg-white p-2 text-sm leading-5 text-ink outline-none transition placeholder:text-neutral-400 focus:border-ink"
          value={form.bodyText}
          placeholder="Описание карточки"
          onChange={(event) =>
            setForm((current) => ({ ...current, bodyText: event.target.value }))
          }
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <TextInput
          label="Category"
          value={form.category}
          onChange={(category) => setForm((current) => ({ ...current, category }))}
          placeholder="asset"
        />
        <TextInput
          label="Subcategory"
          value={form.subcategory}
          onChange={(subcategory) =>
            setForm((current) => ({ ...current, subcategory }))
          }
          placeholder="real_estate"
        />
        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          Активна
        </label>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <TextAreaInput
          label="Meta"
          value={form.metaText}
          onChange={(metaText) => setForm((current) => ({ ...current, metaText }))}
          placeholder="symbol = POP1"
        />
        <TextAreaInput
          label="Effects"
          value={form.effectsText}
          onChange={(effectsText) =>
            setForm((current) => ({ ...current, effectsText }))
          }
          placeholder="cash_delta = -500"
        />
        <TextAreaInput
          label="Conditions"
          value={form.conditionsText}
          onChange={(conditionsText) =>
            setForm((current) => ({ ...current, conditionsText }))
          }
          placeholder="has_children"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Создание" : "Создать карточку"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(emptyCardForm(cardType));
            setError(null);
          }}
          disabled={saving}
        >
          Очистить
        </Button>
        {error ? (
          <p className="break-words text-xs leading-4 text-red-700">{error}</p>
        ) : null}
      </div>
    </form>
  );
}

function CardsTable({
  cards,
  token,
  onCardSaved,
  onCardDeleted
}: {
  cards: ApiCard[];
  token: string;
  onCardSaved: (card: ApiCard) => void;
  onCardDeleted: (card: ApiCard) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-md border border-line">
      <table className="min-w-[1280px] table-fixed text-left text-sm">
        <thead className="border-b border-line bg-surface text-neutral-500">
          <tr>
            <HeaderCell className="w-16">ID</HeaderCell>
            <HeaderCell className="w-64">title</HeaderCell>
            <HeaderCell className="w-96">bodyText</HeaderCell>
            <HeaderCell className="w-80">meta</HeaderCell>
            <HeaderCell className="w-96">effects</HeaderCell>
            <HeaderCell className="w-80">conditions</HeaderCell>
            <HeaderCell className="w-40">actions</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <EditableCardRow
              key={card.id}
              card={card}
              token={token}
              onCardSaved={onCardSaved}
              onCardDeleted={onCardDeleted}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableCardRow({
  card,
  token,
  onCardSaved,
  onCardDeleted
}: {
  card: ApiCard;
  token: string;
  onCardSaved: (card: ApiCard) => void;
  onCardDeleted: (card: ApiCard) => void;
}) {
  const [metaText, setMetaText] = useState(() => formatMeta(card.meta));
  const [effectsText, setEffectsText] = useState(() => formatEffects(card.effects));
  const [conditionsText, setConditionsText] = useState(() =>
    formatConditions(card.conditions)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMetaText(formatMeta(card.meta));
    setEffectsText(formatEffects(card.effects));
    setConditionsText(formatConditions(card.conditions));
    setError(null);
  }, [card]);

  const changed =
    metaText !== formatMeta(card.meta) ||
    effectsText !== formatEffects(card.effects) ||
    conditionsText !== formatConditions(card.conditions);

  async function saveCard() {
    setSaving(true);
    setError(null);

    try {
      const dto = {
        cardType: card.cardType,
        slug: card.slug,
        title: card.title,
        bodyText: card.bodyText,
        category: card.category,
        subcategory: card.subcategory,
        isActive: card.isActive,
        meta: parseMeta(metaText),
        effects: parseEffects(effectsText),
        conditions: parseConditions(conditionsText)
      };
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/${card.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dto)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      onCardSaved((await response.json()) as ApiCard);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить карточку"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard() {
    const confirmed = window.confirm(
      `Удалить карточку #${card.id} "${card.title}"?`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/${card.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      onCardDeleted((await response.json()) as ApiCard);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить карточку"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b border-line align-top last:border-b-0">
      <BodyCell>{card.id}</BodyCell>
      <BodyCell>{card.title}</BodyCell>
      <BodyCell>{card.bodyText}</BodyCell>
      <EditableTextCell
        value={metaText}
        onChange={setMetaText}
        placeholder="symbol = POP1"
      />
      <EditableTextCell
        value={effectsText}
        onChange={setEffectsText}
        placeholder="cash_delta = -500"
      />
      <EditableTextCell
        value={conditionsText}
        onChange={setConditionsText}
        placeholder="has_children"
      />
      <td className="px-3 py-3">
        <div className="grid gap-2">
          <Button
            className="h-8 w-full px-3 text-xs"
            variant={changed ? "primary" : "secondary"}
            disabled={!changed || saving || deleting}
            onClick={saveCard}
          >
            {saving ? "Сохранение" : "Сохранить"}
          </Button>
          <Button
            className="h-8 w-full px-3 text-xs"
            variant="danger"
            disabled={saving || deleting}
            onClick={deleteCard}
          >
            {deleting ? "Удаление" : "Удалить"}
          </Button>
        </div>
        {error ? (
          <p className="mt-2 break-words text-xs leading-4 text-red-700">{error}</p>
        ) : null}
      </td>
    </tr>
  );
}

function HeaderCell({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <th className={`px-3 py-2 font-medium ${className ?? ""}`}>
      {children}
    </th>
  );
}

function BodyCell({ children }: { children: ReactNode }) {
  return (
    <td className="break-words px-3 py-3 leading-5 text-ink">
      {children}
    </td>
  );
}

function EditableTextCell({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <td className="px-3 py-3">
      <textarea
        className="min-h-32 w-full resize-y rounded-md border border-line bg-white p-2 font-mono text-xs leading-5 text-ink outline-none transition placeholder:text-neutral-400 focus:border-ink"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-neutral-600">
      {label}
      <input
        className="h-10 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-neutral-400 focus:border-ink"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-neutral-600">
      {label}
      <textarea
        className="min-h-32 w-full resize-y rounded-md border border-line bg-white p-2 font-mono text-xs leading-5 text-ink outline-none transition placeholder:text-neutral-400 focus:border-ink"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function cardTypeLabel(value: AdminCardType) {
  return cardTypes.find((type) => type.value === value)?.label ?? value;
}

function emptyCardForm(cardType: AdminCardType) {
  return {
    cardType,
    slug: "",
    title: "",
    bodyText: "",
    category: "",
    subcategory: "",
    isActive: true,
    metaText: "",
    effectsText: "",
    conditionsText: ""
  };
}

function sortCards(cards: ApiCard[]) {
  return [...cards].sort((left, right) => {
    const typeOrder = left.cardType.localeCompare(right.cardType);
    return typeOrder === 0 ? left.title.localeCompare(right.title) : typeOrder;
  });
}

function formatMeta(meta: ApiCard["meta"]) {
  return meta.map((row) => `${row.metaKey} = ${row.metaValue}`).join("\n");
}

function formatEffects(effects: ApiCard["effects"]) {
  return effects
    .map((row) => {
      const amount = row.amountCents === null ? "" : ` = ${row.amountCents}`;
      return `${row.effectType}${amount}${formatPayload(row.payload)}`;
    })
    .join("\n");
}

function formatConditions(conditions: ApiCard["conditions"]) {
  return conditions
    .map((row) => `${row.condType}${formatPayload(row.payload)}`)
    .join("\n");
}

function formatPayload(payload: Record<string, unknown>) {
  return Object.keys(payload).length > 0
    ? ` | payload = ${JSON.stringify(payload)}`
    : "";
}

function parseMeta(text: string) {
  return nonEmptyLines(text).map((line) => {
    const [key, value] = splitAssignment(line);
    return {
      metaKey: key,
      metaValue: value
    };
  });
}

function parseEffects(text: string) {
  return nonEmptyLines(text).map((line) => {
    const [main, payload] = splitPayload(line);
    const [effectType, rawAmount] = splitAssignment(main);
    const normalizedAmount = rawAmount.trim();
    return {
      effectType,
      amountCents: normalizedAmount ? parseInteger(normalizedAmount) : null,
      payload
    };
  });
}

function parseConditions(text: string) {
  return nonEmptyLines(text).map((line) => {
    const [condType, payload] = splitPayload(line);
    return {
      condType: condType.trim(),
      payload
    };
  });
}

function nonEmptyLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitAssignment(line: string): [string, string] {
  const match = line.match(/^([^=:]+?)\s*(?:=|:)\s*(.*)$/);
  if (!match) return [line.trim(), ""];
  return [(match[1] ?? "").trim(), (match[2] ?? "").trim()];
}

function splitPayload(line: string): [string, Record<string, unknown>] {
  const match = line.match(/^(.*?)\s+\|\s+payload\s*=\s*(.*)$/);
  if (!match) return [line.trim(), {}];
  return [(match[1] ?? "").trim(), parsePayload((match[2] ?? "").trim())];
}

function parsePayload(text: string) {
  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    throw new Error(`Некорректный payload JSON: ${text}`);
  }
}

function parseInteger(value: string) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isInteger(amount)) {
    throw new Error(`Сумма должна быть целым числом: ${value}`);
  }
  return amount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
