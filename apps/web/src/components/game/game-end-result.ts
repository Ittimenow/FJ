export type GameEndIcon =
  | "shield-check"
  | "hourglass"
  | "user-x"
  | "circle-off"
  | "circle-alert";

export type GameEndTone = "victory" | "survival" | "timeout" | "danger" | "neutral";

export interface GameEndPresentation {
  icon: GameEndIcon | null;
  tone: GameEndTone;
  title: string;
  description: string | null;
}

export function gameEndPresentation({
  reason,
  winnerName
}: {
  reason: string | null;
  winnerName?: string | null;
}): GameEndPresentation {
  if (winnerName || reason === "financial_freedom") {
    return {
      icon: null,
      tone: "victory",
      title: "Победа!",
      description: null
    };
  }

  if (reason === "bots_eliminated") {
    return {
      icon: "shield-check",
      tone: "survival",
      title: "Вы победили!",
      description: "Все виртуальные соперники выбыли"
    };
  }

  if (reason === "time_limit") {
    return {
      icon: "hourglass",
      tone: "timeout",
      title: "Время истекло",
      description: "Лимит партии завершён, победителя нет"
    };
  }

  if (reason === "human_bankrupt") {
    return {
      icon: "user-x",
      tone: "danger",
      title: "Вы выбыли",
      description: "Одиночная партия завершена из-за банкротства"
    };
  }

  if (reason === "all_players_bankrupt") {
    return {
      icon: "circle-off",
      tone: "danger",
      title: "Все игроки выбыли",
      description: "Партия завершилась без победителя"
    };
  }

  return {
    icon: "circle-alert",
    tone: "neutral",
    title: "Игра окончена",
    description: "Причина завершения не указана"
  };
}
