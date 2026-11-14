/** Scenario amounts are dollars; adapters convert to each engine's native units. */
export interface SandboxAsset {
  cardId: number;
  quantity: number;
}
export interface SandboxPlayerSetup {
  playerId: string;
  cash: number;
  position: number;
  fastIncome: number;
  assets: SandboxAsset[];
  fastAssets: number[];
  nextCards: number[];
  dice: number[];
}
export interface SandboxScenario {
  track: "RAT_RACE" | "FAST_TRACK";
  firstPlayerId: string;
  players: SandboxPlayerSetup[];
}
export interface SandboxCard {
  id: number;
  slug: string;
  title: string;
  bodyText: string;
  cardType: string;
  typeLabel: string;
  canOwn: boolean;
  quantityStep: number;
  quantityMax: number;
}
export interface SandboxView {
  scenario: SandboxScenario;
  run: number;
  nextCards: Record<string, number[]>;
  dice: Record<string, number[]>;
}

/** A sandbox remains a test game even if malformed settings are supplied elsewhere. */
export function isSandboxGame(game: { isTest?: boolean; settings?: unknown }): boolean {
  if (!game.isTest || !game.settings || typeof game.settings !== "object" || Array.isArray(game.settings)) return false;
  const sandbox = (game.settings as Record<string, unknown>).sandbox;
  return Boolean(sandbox && typeof sandbox === "object" && !Array.isArray(sandbox)
    && (sandbox as Record<string, unknown>).version === 1);
}
