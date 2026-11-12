export interface LobbyDraft {
  title: string;
  maxPlayers: number;
  timeLimitMinutes: number | null;
  periodCount: number;
  isPublic: boolean;
  scheduledLocal: string;
}

export type LobbyField = keyof LobbyDraft;
export type LobbyPatch = Partial<Omit<LobbyDraft, "timeLimitMinutes">> & { timeLimitMinutes?: number };
export interface LobbyValidationContext { occupied: number; timeZone: string | null; isTest: boolean; now?: number }

function validLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number) as [number, number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return year >= 2000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && hour < 24 && minute < 60;
}

export function lobbyDraftErrors(draft: LobbyDraft, dirty: ReadonlySet<LobbyField>, context: LobbyValidationContext) {
  const errors: Partial<Record<LobbyField, string>> = {};
  if (dirty.has("title") && !draft.title.trim()) errors.title = "Введите название игры.";
  if (dirty.has("maxPlayers") && draft.maxPlayers < context.occupied) errors.maxPlayers = `В партии уже ${context.occupied} игроков. Увеличьте количество мест.`;
  if (draft.isPublic && (dirty.has("isPublic") || dirty.has("scheduledLocal"))) {
    if (context.isTest) errors.isPublic = "Тестовую партию нельзя открыть для всех.";
    else if (!context.timeZone) errors.isPublic = "Для открытой игры сначала выберите город в профиле.";
    else if (!validLocalDate(draft.scheduledLocal)) errors.scheduledLocal = "Укажите дату и время — после этого игра станет открытой.";
    else {
      try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: context.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(context.now ?? Date.now())).map(part => [part.type, part.value]));
        if (draft.scheduledLocal <= `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`) errors.scheduledLocal = "Укажите будущее время начала игры.";
      } catch {
        errors.isPublic = "Проверьте часовой пояс в профиле.";
      }
    }
  }
  return errors;
}

export function prepareLobbyPatch(draft: LobbyDraft, saved: LobbyDraft, ready: ReadonlySet<LobbyField>, context: LobbyValidationContext): LobbyPatch {
  const errors = lobbyDraftErrors(draft, ready, context);
  const patch: LobbyPatch = {};
  if (ready.has("title") && !errors.title) patch.title = draft.title.trim();
  if (ready.has("maxPlayers") && !errors.maxPlayers) patch.maxPlayers = draft.maxPlayers;
  if (ready.has("timeLimitMinutes") && draft.timeLimitMinutes !== null) patch.timeLimitMinutes = draft.timeLimitMinutes;
  if (ready.has("periodCount")) patch.periodCount = draft.periodCount;

  if (ready.has("isPublic") && !draft.isPublic) patch.isPublic = false;
  else if (draft.isPublic && !errors.isPublic && !errors.scheduledLocal && validLocalDate(draft.scheduledLocal)) {
    // Publication and its schedule are one change. A half-entered date must
    // never publish the game, and unrelated edits remain independently savable.
    const dateReady = ready.has("scheduledLocal") || draft.scheduledLocal === saved.scheduledLocal;
    if (ready.has("isPublic") && dateReady) {
      patch.isPublic = true;
      if (!saved.isPublic || draft.scheduledLocal !== saved.scheduledLocal) patch.scheduledLocal = draft.scheduledLocal;
    } else if (saved.isPublic && ready.has("scheduledLocal")) patch.scheduledLocal = draft.scheduledLocal;
  }
  return patch;
}

export interface LobbySaveResult { values: LobbyDraft; revision: number }
export interface LobbySaveState {
  draft: LobbyDraft;
  dirty: ReadonlySet<LobbyField>;
  pending: boolean;
  saving: boolean;
  error: string | null;
}

/** Coalesces field edits while allowing only one write to be in flight. */
export class LobbyAutosaveQueue {
  private saved: LobbyDraft;
  private draft: LobbyDraft;
  private revision: number;
  private dirty = new Set<LobbyField>();
  private ready = new Set<LobbyField>();
  private generations = new Map<LobbyField, number>();
  private timers = new Map<LobbyField, ReturnType<typeof setTimeout>>();
  private inFlight = new Set<LobbyField>();
  private saving = false;
  private error: string | null = null;
  private listeners = new Set<(state: LobbySaveState) => void>();

  constructor(initial: LobbySaveResult, private options: {
    save: (patch: LobbyPatch) => Promise<LobbySaveResult>;
    prepare: (draft: LobbyDraft, saved: LobbyDraft, ready: ReadonlySet<LobbyField>) => LobbyPatch;
  }) {
    this.saved = { ...initial.values };
    this.draft = { ...initial.values };
    this.revision = initial.revision;
  }

  getState(): LobbySaveState {
    return { draft: { ...this.draft }, dirty: new Set(this.dirty), pending: this.saving || this.dirty.size > 0, saving: this.saving, error: this.error };
  }

  subscribe(listener: (state: LobbySaveState) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  change<K extends LobbyField>(field: K, value: LobbyDraft[K], delay = 0) {
    this.draft[field] = value;
    this.generations.set(field, (this.generations.get(field) ?? 0) + 1);
    this.clearTimer(field);
    if (value === this.saved[field] && !this.inFlight.has(field)) {
      this.dirty.delete(field);
      this.ready.delete(field);
    } else {
      this.dirty.add(field);
      this.ready.delete(field);
      if (delay) this.timers.set(field, setTimeout(() => { this.timers.delete(field); this.ready.add(field); void this.pump(); }, delay));
      else this.ready.add(field);
    }
    this.error = null;
    this.emit();
    void this.pump();
  }

  receive(result: LobbySaveResult) {
    if (result.revision < this.revision) return;
    this.revision = result.revision;
    this.saved = { ...result.values };
    for (const field of Object.keys(this.draft) as LobbyField[]) {
      if (!this.dirty.has(field) && !this.inFlight.has(field)) this.assignDraft(field, result.values);
      if (!this.inFlight.has(field) && this.draft[field] === this.saved[field]) this.clearDirty(field);
    }
    this.emit();
    void this.pump();
  }

  flush(field?: LobbyField) {
    for (const key of field ? [field] : this.dirty) {
      this.clearTimer(key);
      if (this.dirty.has(key)) this.ready.add(key);
    }
    void this.pump();
  }

  retry() { this.error = null; this.emit(); this.flush(); }

  private emit() { const state = this.getState(); for (const listener of this.listeners) listener(state); }
  private assignDraft<K extends LobbyField>(field: K, source: LobbyDraft) { this.draft[field] = source[field]; }
  private clearTimer(field: LobbyField) { const timer = this.timers.get(field); if (timer) clearTimeout(timer); this.timers.delete(field); }
  private clearDirty(field: LobbyField) { this.dirty.delete(field); this.ready.delete(field); this.clearTimer(field); }

  private async pump() {
    if (this.saving || this.error) return;
    const patch = this.options.prepare(this.draft, this.saved, this.ready);
    const fields = Object.keys(patch) as LobbyField[];
    if (!fields.length) return;
    const sentGenerations = new Map(fields.map(field => [field, this.generations.get(field)]));
    this.inFlight = new Set(fields);
    this.saving = true;
    this.emit();
    try {
      this.receive(await this.options.save(patch));
      for (const field of fields) {
        if (this.generations.get(field) === sentGenerations.get(field)) {
          this.clearDirty(field);
          this.assignDraft(field, this.saved);
        }
      }
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : "Не удалось сохранить настройки. Попробуйте ещё раз.";
    } finally {
      this.saving = false;
      this.inFlight.clear();
      for (const field of this.dirty) if (this.draft[field] === this.saved[field]) this.clearDirty(field);
      if (!this.dirty.size) this.error = null;
      this.emit();
      if (!this.error) void this.pump();
    }
  }
}
