export const gameChatNoticeTypes = [
  "game:started",
  "game:paused",
  "game:resumed",
  "game:ended",
  "bankruptcy:recovered",
  "bankruptcy:eliminated"
];

interface NoticeEvent {
  id: string;
  type: string;
  createdAt: Date;
  gamePlayerId: string | null;
  payload: unknown;
}

interface NoticePlayer {
  id: string;
  guestName: string | null;
  user: { displayName: string } | null;
}

export function gameChatNotices(
  game: { id: string; isTest: boolean; createdAt: Date },
  events: NoticeEvent[],
  players: NoticePlayer[]
) {
  const messages = new Map<string, {
    id: string;
    body: string;
    createdAt: Date;
    sender: "ADMINISTRATOR";
    user: null;
  }>();
  function add(id: string, body: string, createdAt: Date) {
    messages.set(id, { id, body, createdAt, sender: "ADMINISTRATOR", user: null });
  }
  function playerName(id: unknown) {
    const player = players.find((candidate) => candidate.id === id);
    return player?.user?.displayName ?? player?.guestName ?? "Игрок";
  }

  if (game.isTest) {
    add(`notice:${game.id}:test`, "Тестовая партия · результаты не учитываются в статистике и не публикуются", game.createdAt);
  }
  for (const event of events) {
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? event.payload as Record<string, unknown>
      : {};
    const period = typeof payload.currentPeriod === "number" ? ` ${payload.currentPeriod}` : "";
    let body: string;
    switch (event.type) {
      case "game:started":
        body = "Партия началась.";
        break;
      case "game:paused":
        body = payload.reason === "period_complete"
          ? `Период${period} завершён. Игра поставлена на паузу. Следующий период начнёт ведущий или администратор.`
          : payload.reason === "player_left"
            ? "Партия автоматически поставлена на паузу после выхода игрока. Весь прогресс сохранён."
            : "Игра поставлена на паузу. Весь прогресс сохранён.";
        break;
      case "game:resumed":
        body = payload.startsNextPeriod ? `Начался период${period}.` : "Игра продолжена.";
        break;
      case "game:ended":
        body = payload.winnerGamePlayerId
          ? `Партия завершена. Победитель: ${playerName(payload.winnerGamePlayerId)}.`
          : payload.reason === "time_limit"
            ? "Время партии истекло. Игра завершена."
            : "Партия завершена.";
        break;
      case "bankruptcy:recovered":
        body = `${playerName(event.gamePlayerId)}: банкротство преодолено.${typeof payload.turnsToSkip === "number" ? ` Предстоит пропустить ходов: ${payload.turnsToSkip}.` : ""}`;
        break;
      case "bankruptcy:eliminated":
        body = `${playerName(event.gamePlayerId)}: денежный поток не удалось восстановить — игрок выбыл из игры.`;
        break;
      default:
        continue;
    }
    add(`notice:${game.id}:${event.id}`, body, event.createdAt);
  }
  return [...messages.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
