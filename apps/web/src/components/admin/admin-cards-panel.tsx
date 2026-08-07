"use client";

import { AlertTriangle, CheckCircle2, Layers3, Pencil, Plus, Save, Trash2 } from "lucide-react";
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
  cardSetId: string;
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

interface ApiCardSet {
  id: string;
  name: string;
  isDefault: boolean;
  totalCards: number;
  activeCards: number;
  gamesCount: number;
  counts: Partial<Record<AdminCardType, number>>;
}

const cardTypes: Array<{ value: AdminCardType; label: string }> = [
  { value: "SMALL_DEAL", label: "Сделка мелкая" },
  { value: "BIG_DEAL", label: "Сделка крупная" },
  { value: "DOODAD", label: "Всякая всячина" },
  { value: "MARKET", label: "Рынок" },
  { value: "FAST_TRACK", label: "Быстрая дорожка" },
  { value: "DREAM", label: "Мечта" }
];

const requiredCardTypes: AdminCardType[] = [
  "SMALL_DEAL",
  "BIG_DEAL",
  "DOODAD",
  "MARKET"
];

export function AdminCardsPanel({ token }: { token: string }) {
  const [view, setView] = useState<AdminCardsView>("editor");
  const [filter, setFilter] = useState<AdminCardType>("SMALL_DEAL");
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createSetFormOpen, setCreateSetFormOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [renameFormOpen, setRenameFormOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [cardSets, setCardSets] = useState<ApiCardSet[]>([]);
  const [selectedCardSetId, setSelectedCardSetId] = useState<string | null>(null);
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setSaving, setSetSaving] = useState(false);
  const [renameSaving, setRenameSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function loadCardSets(preferredId?: string) {
    setSetsLoading(true);
    setSetsError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/sets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const nextSets = (await response.json()) as ApiCardSet[];
      setCardSets(nextSets);
      setSelectedCardSetId((current) => {
        const candidate = preferredId ?? current;
        if (candidate && nextSets.some((set) => set.id === candidate)) return candidate;
        return nextSets.find((set) => set.isDefault)?.id ?? nextSets[0]?.id ?? null;
      });
    } catch (loadError) {
      setSetsError(
        loadError instanceof Error ? loadError.message : "Не удалось загрузить наборы карточек"
      );
    } finally {
      setSetsLoading(false);
    }
  }

  async function createCardSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetSaving(true);
    setSetsError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/sets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newSetName })
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const created = (await response.json()) as Pick<ApiCardSet, "id">;
      setNewSetName("");
      setCreateSetFormOpen(false);
      setFilter("SMALL_DEAL");
      setCards([]);
      await loadCardSets(created.id);
    } catch (createError) {
      setSetsError(
        createError instanceof Error ? createError.message : "Не удалось создать набор"
      );
    } finally {
      setSetSaving(false);
    }
  }

  async function renameCardSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSet) return;
    setRenameSaving(true);
    setRenameError(null);
    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/admin/cards/sets/${selectedSet.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: renameName })
        }
      );
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const updated = (await response.json()) as Pick<
        ApiCardSet,
        "id" | "name" | "isDefault"
      >;
      setCardSets((current) =>
        current.map((set) => set.id === updated.id ? { ...set, ...updated } : set)
      );
      setRenameName(updated.name);
      setRenameFormOpen(false);
    } catch (renameFailure) {
      setRenameError(
        renameFailure instanceof Error
          ? renameFailure.message
          : "Не удалось переименовать набор"
      );
    } finally {
      setRenameSaving(false);
    }
  }

  async function loadCards() {
    if (!selectedCardSetId) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        cardType: filter,
        cardSetId: selectedCardSetId
      });
      const response = await fetch(
        `${publicApiBaseUrl()}/api/admin/cards?${query.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      setCards((await response.json()) as ApiCard[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Не удалось загрузить карточки"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCardSets();
  }, []);

  useEffect(() => {
    if (view !== "editor" || !selectedCardSetId) return;
    void loadCards();
  }, [filter, selectedCardSetId, view]);

  const selectedSet = cardSets.find((set) => set.id === selectedCardSetId) ?? null;
  const missingTypes = selectedSet
    ? cardTypes.filter(
        (type) =>
          requiredCardTypes.includes(type.value) &&
          (selectedSet.counts[type.value] ?? 0) === 0
      )
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-4 sm:p-5" aria-labelledby="card-sets-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8effe] text-journey">
              <Layers3 size={21} aria-hidden="true" />
            </span>
            <div>
              <h3 id="card-sets-heading" className="text-lg font-extrabold">Наборы карточек</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                Выберите набор для редактирования или подготовьте новый для отдельной партии.
              </p>
            </div>
          </div>
          <Button
            variant={createSetFormOpen ? "secondary" : "action"}
            aria-expanded={createSetFormOpen}
            onClick={() => {
              setRenameFormOpen(false);
              setRenameError(null);
              setCreateSetFormOpen((current) => !current);
            }}
          >
            {!createSetFormOpen ? <Plus className="mr-2" size={16} aria-hidden="true" /> : null}
            {createSetFormOpen ? "Отменить" : "Создать набор"}
          </Button>
        </div>

        {createSetFormOpen ? (
          <form className="mt-5 grid gap-3 border-t border-line/70 pt-5 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={createCardSet}>
            <label className="grid gap-2 text-sm font-extrabold text-ink">
              Название нового набора
              <input
                className="h-12 min-w-0 rounded-xl border border-line bg-white px-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20 sm:text-sm"
                value={newSetName}
                onChange={(event) => setNewSetName(event.target.value)}
                placeholder="Например, Семейная версия"
                maxLength={120}
                required
                autoFocus
              />
            </label>
            <Button type="submit" variant="action" className="self-end" disabled={setSaving}>
              {setSaving ? "Создаём…" : "Создать пустой набор"}
            </Button>
          </form>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
          <label className="grid gap-2 text-sm font-extrabold text-ink">
            Набор для редактирования
            <select
              className="h-12 min-w-0 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
              value={selectedCardSetId ?? ""}
              onChange={(event) => {
                setSelectedCardSetId(event.target.value);
                setCreateFormOpen(false);
                setRenameFormOpen(false);
                setRenameError(null);
              }}
              disabled={setsLoading || cardSets.length === 0}
            >
              {cardSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}{set.isDefault ? " — основной" : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedSet ? (
            <div className="rounded-xl bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="break-words font-extrabold text-ink">{selectedSet.name}</p>
                  <Button
                    variant="ghost"
                    className="h-9 px-3"
                    aria-expanded={renameFormOpen}
                    onClick={() => {
                      setCreateSetFormOpen(false);
                      setRenameName(selectedSet.name);
                      setRenameError(null);
                      setRenameFormOpen((current) => !current);
                    }}
                  >
                    <Pencil className="mr-2" size={15} aria-hidden="true" />
                    Переименовать
                  </Button>
                </div>
                <span className="text-sm font-bold text-muted">
                  {selectedSet.activeCards} активных · {selectedSet.totalCards} всего
                </span>
              </div>
              {renameFormOpen ? (
                <form
                  className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                  onSubmit={renameCardSet}
                  aria-busy={renameSaving}
                >
                  <label className="sr-only" htmlFor="card-set-rename">
                    Новое название набора
                  </label>
                  <input
                    id="card-set-rename"
                    className="h-11 min-w-0 rounded-xl border border-line bg-card px-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20 sm:text-sm"
                    value={renameName}
                    onChange={(event) => setRenameName(event.target.value)}
                    maxLength={120}
                    required
                    autoFocus
                  />
                  <Button type="submit" variant="primary" disabled={renameSaving}>
                    <Save className="mr-2" size={15} aria-hidden="true" />
                    {renameSaving ? "Сохраняем…" : "Сохранить"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={renameSaving}
                    onClick={() => {
                      setRenameFormOpen(false);
                      setRenameError(null);
                    }}
                  >
                    Отменить
                  </Button>
                  {renameError ? (
                    <p className="text-sm font-medium text-red-700 sm:col-span-3" role="alert">
                      {renameError}
                    </p>
                  ) : null}
                </form>
              ) : null}
              {missingTypes.length === 0 ? (
                <p className="mt-2 flex items-start gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                  Набор готов к выбору при создании комнаты.
                </p>
              ) : (
                <p className="mt-2 flex items-start gap-2 text-sm leading-5 text-[#9a4b0b]">
                  <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                  Для запуска добавьте активные карточки: {missingTypes.map((type) => type.label).join(", ")}.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {setsError ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
            {setsError}
          </p>
        ) : null}
      </section>

      <div className="flex gap-2 overflow-x-auto border-b border-line/70 pb-4" role="tablist" aria-label="Режим редактора карточек">
        <Button
          variant={view === "editor" ? "primary" : "secondary"}
          className="shrink-0"
          role="tab"
          aria-selected={view === "editor"}
          onClick={() => setView("editor")}
        >
          Редактор карточек
        </Button>
        <Button
          variant={view === "unclear" ? "primary" : "secondary"}
          className="shrink-0"
          role="tab"
          aria-selected={view === "unclear"}
          onClick={() => setView("unclear")}
        >
          Непонятные карточки
        </Button>
      </div>

      {view === "unclear" && selectedCardSetId ? (
        <UnclearCardsPage token={token} cardSetId={selectedCardSetId} />
      ) : null}

      {view === "editor" && selectedCardSetId ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Тип карточек">
            {cardTypes.map((type) => (
              <Button
                key={type.value}
                className="shrink-0"
                variant={filter === type.value ? "primary" : "secondary"}
                aria-pressed={filter === type.value}
                onClick={() => setFilter(type.value)}
              >
                {type.label} · {selectedSet?.counts[type.value] ?? 0}
              </Button>
            ))}
          </div>

          <section className="rounded-xl bg-card p-4 sm:p-5" aria-labelledby="new-card-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="new-card-heading" className="font-extrabold">Новая карточка</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                  Карточка попадёт в набор «{selectedSet?.name}» и выбранный тип.
                </p>
              </div>
              <Button
                variant={createFormOpen ? "secondary" : "action"}
                aria-expanded={createFormOpen}
                onClick={() => setCreateFormOpen((current) => !current)}
              >
                {!createFormOpen ? <Plus className="mr-2" size={16} aria-hidden="true" /> : null}
                {createFormOpen ? "Скрыть форму" : "Создать карточку"}
              </Button>
            </div>

            {createFormOpen ? (
              <CreateCardForm
                key={`${selectedCardSetId}:${filter}`}
                token={token}
                cardSetId={selectedCardSetId}
                cardType={filter}
                onCardCreated={(createdCard) => {
                  if (createdCard.cardType !== filter) {
                    setFilter(createdCard.cardType);
                    setCards([createdCard]);
                  } else {
                    setCards((current) => sortCards([createdCard, ...current]));
                  }
                  void loadCardSets(selectedCardSetId);
                }}
              />
            ) : null}
          </section>

          {error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold">
              {cardTypeLabel(filter)}: {cards.length}
            </h3>
            {loading ? <span className="text-sm text-muted" role="status">Загрузка…</span> : null}
          </div>

          {cards.length === 0 && !loading ? (
            <p className="rounded-xl bg-card p-4 text-sm text-muted">
              Карточек этого типа пока нет.
            </p>
          ) : null}

          {cards.length > 0 ? (
            <CardsTable
              cards={cards}
              token={token}
              onCardSaved={(savedCard) =>
                setCards((current) =>
                  current.map((card) => card.id === savedCard.id ? savedCard : card)
                )
              }
              onCardDeleted={(deletedCard) => {
                setCards((current) => current.filter((card) => card.id !== deletedCard.id));
                void loadCardSets(selectedCardSetId);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function UnclearCardsPage({ token, cardSetId }: { token: string; cardSetId: string }) {
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCards() {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({ cardSetId });
    const response = await fetch(`${publicApiBaseUrl()}/api/admin/cards/unclear?${query.toString()}`, {
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
  }, [cardSetId]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">
            Непонятные карточки: {cards.length}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Активные карточки без строк в card_effects.
          </p>
        </div>
        {loading ? <span className="text-sm text-muted" role="status">Загрузка…</span> : null}
      </div>

      {cards.length === 0 && !loading ? (
        <p className="rounded-xl bg-card p-4 text-sm text-muted">
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
  cardSetId,
  cardType,
  onCardCreated
}: {
  token: string;
  cardSetId: string;
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
          cardSetId,
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
    <form className="mt-5 grid gap-4 border-t border-line/70 pt-5" onSubmit={createCard} aria-busy={saving}>
      <div className="grid gap-3 lg:grid-cols-[220px_1fr_1fr]">
        <label className="grid gap-2 text-sm font-extrabold text-ink">
          Тип
          <select
            className="h-12 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
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

      <label className="grid gap-2 text-sm font-extrabold text-ink">
        Текст карточки
        <textarea
          className="min-h-28 rounded-lg border border-line bg-white p-3 text-sm leading-6 text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20"
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
        <label className="flex min-h-12 items-center gap-2 self-end rounded-lg bg-white px-3 text-sm font-bold text-ink">
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
        <Button type="submit" variant="action" disabled={saving}>
          <Plus className="mr-2" size={16} aria-hidden="true" />
          {saving ? "Создаём..." : "Создать карточку"}
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
          <p className="break-words text-sm leading-5 text-red-700" role="alert">{error}</p>
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
    <div
      className="max-w-full overflow-x-auto rounded-xl border border-line/70"
      role="region"
      aria-label="Редактор карточек"
      tabIndex={0}
    >
      <table className="min-w-[1280px] table-fixed text-left text-sm">
        <thead className="sticky top-0 z-10 bg-ink text-white">
          <tr>
            <HeaderCell className="w-16">ID</HeaderCell>
            <HeaderCell className="w-64">Название</HeaderCell>
            <HeaderCell className="w-96">Текст карточки</HeaderCell>
            <HeaderCell className="w-80">Meta</HeaderCell>
            <HeaderCell className="w-96">Effects</HeaderCell>
            <HeaderCell className="w-80">Conditions</HeaderCell>
            <HeaderCell className="w-40">Действия</HeaderCell>
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
        cardSetId: card.cardSetId,
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
    <tr className="border-b border-line/70 align-top last:border-b-0 even:bg-card/50">
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
            className="h-9 w-full px-3 text-xs"
            variant={changed ? "action" : "secondary"}
            disabled={!changed || saving || deleting}
            onClick={saveCard}
          >
            <Save className="mr-1.5" size={14} aria-hidden="true" />
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
          <Button
            className="h-9 w-full px-3 text-xs"
            variant="danger"
            disabled={saving || deleting}
            onClick={deleteCard}
          >
            <Trash2 className="mr-1.5" size={14} aria-hidden="true" />
            {deleting ? "Удаляем..." : "Удалить"}
          </Button>
        </div>
        {error ? (
          <p className="mt-2 break-words text-xs leading-4 text-red-700" role="alert">{error}</p>
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
    <th className={`px-3 py-3 font-extrabold ${className ?? ""}`}>
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
        className="min-h-32 w-full resize-y rounded-lg border border-line bg-white p-2.5 font-mono text-xs leading-5 text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20"
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
    <label className="grid gap-2 text-sm font-extrabold text-ink">
      {label}
      <input
        className="h-12 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20"
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
    <label className="grid gap-2 text-sm font-extrabold text-ink">
      {label}
      <textarea
        className="min-h-32 w-full resize-y rounded-lg border border-line bg-white p-2.5 font-mono text-xs leading-5 text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20"
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

async function apiErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(". ");
    if (typeof payload.message === "string") return payload.message;
  } catch {
    // The fallback below is intentionally user-friendly for non-JSON failures.
  }
  return "Сервер не смог выполнить запрос. Попробуйте ещё раз.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
