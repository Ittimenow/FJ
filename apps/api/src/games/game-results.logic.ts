export type ResultEvent = {
  sequence: number;
  type: string;
  gamePlayerId: string | null;
};

export function playerResultCounts(events: ResultEvent[], playerId: string) {
  const own = events.filter((event) => event.gamePlayerId === playerId);
  const escapeSequence = own.find((event) => event.type === "player:escaped_rat_race")?.sequence ?? Infinity;
  const turns = own.filter((event) => ["player:roll_dice", "turn:skipped", "bankruptcy:turn_skipped"].includes(event.type));
  const smallCircleTurns = turns.filter((event) => event.sequence < escapeSequence).length;
  return {
    totalTurns: turns.length,
    smallCircleTurns,
    bigCircleTurns: turns.length - smallCircleTurns,
    childrenBorn: own.filter((event) => event.type === "player:baby").length,
    dismissals: own.filter((event) => event.type === "player:downsized").length
  };
}
