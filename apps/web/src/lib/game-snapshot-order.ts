import type { GameSnapshot } from "./types";

export function acceptGameSnapshot(current: GameSnapshot, incoming: GameSnapshot): GameSnapshot {
  if (incoming.game.id !== current.game.id) return current;
  const currentSequence = current.events.at(-1)?.sequence ?? 0;
  const incomingSequence = incoming.events.at(-1)?.sequence ?? 0;
  return incomingSequence < currentSequence ? current : incoming;
}
