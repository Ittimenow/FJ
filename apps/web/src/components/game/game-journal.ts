import type { GameEvent, GamePlayer, GameSnapshot } from "@/lib/types";

export type PlayerTurn = {
  id: string;
  events: GameEvent[];
  complete: boolean;
};

const turnStartEventTypes = new Set([
  "player:roll_dice",
  "turn:skipped",
  "bankruptcy:turn_skipped"
]);

const turnEndingStateReasons = new Set([
  "roll_resolved",
  "turn_skipped",
  "bankruptcy_turn_skipped",
  "financial_freedom_reached",
  "time_limit_reached"
]);

const nonGameplayPlayerEventTypes = new Set([
  "player:joined",
  "player:added",
  "player:removed",
  "player:role_changed",
  "player:figurine_selected"
]);

export function gameTurns(events: GameEvent[]): PlayerTurn[] {
  const turns: PlayerTurn[] = [];
  let activeTurn: GameEvent[] | null = null;

  const finish = (complete = false) => {
    if (!activeTurn?.length) return;
    turns.push({
      id: `turn-${activeTurn[0]?.id ?? activeTurn[0]?.sequence ?? turns.length}`,
      events: activeTurn,
      complete
    });
    activeTurn = null;
  };

  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    if (turnStartEventTypes.has(event.type)) {
      const activePlayerId = activeTurn?.find((item) => item.gamePlayer?.id)?.gamePlayer?.id;
      const activeHasStart = activeTurn?.some((item) => turnStartEventTypes.has(item.type));
      if (activeTurn && !activeHasStart && activePlayerId === event.gamePlayer?.id) {
        activeTurn.push(event);
        continue;
      }
      finish(true);
      activeTurn = [event];
      continue;
    }

    if (event.type === "state:update") {
      if (activeTurn) {
        activeTurn.push(event);
        if (isTurnEndingStateEvent(event)) finish(true);
      }
      continue;
    }

    if (activeTurn) {
      const activeHasStart = activeTurn.some((item) => turnStartEventTypes.has(item.type));
      const activePlayerId = activeTurn.find((item) => item.gamePlayer?.id)?.gamePlayer?.id;
      if (
        !activeHasStart &&
        isPlayerGameplayEvent(event) &&
        activePlayerId &&
        activePlayerId !== event.gamePlayer?.id
      ) {
        finish(true);
        activeTurn = [event];
        continue;
      }
      activeTurn.push(event);
      if (event.type === "game:ended") finish(true);
      continue;
    }

    if (isPlayerGameplayEvent(event)) activeTurn = [event];
  }

  finish(false);
  return turns;
}

export function playerIdForTurn(turn: PlayerTurn) {
  return (
    turn.events.find((event) => turnStartEventTypes.has(event.type))?.gamePlayer?.id ??
    turn.events.find((event) => event.gamePlayer?.id)?.gamePlayer?.id ??
    null
  );
}

export function turnsForPlayer(events: GameEvent[], playerId: string) {
  return gameTurns(events)
    .filter((turn) => playerIdForTurn(turn) === playerId)
    .sort((left, right) => turnSequence(right) - turnSequence(left));
}

export function latestGameTurn(snapshot: GameSnapshot) {
  const turns = gameTurns(snapshot.events);
  const current = [...turns]
    .reverse()
    .find((turn) => playerIdForTurn(turn) === snapshot.game.currentPlayerId && !turn.complete);
  return current ?? turns[turns.length - 1] ?? null;
}

export function visibleTurnEvents(turn: PlayerTurn) {
  return turn.events.filter((event) => event.type !== "state:update");
}

export function turnSequence(turn: PlayerTurn) {
  return turn.events[turn.events.length - 1]?.sequence ?? 0;
}

export function turnHeadline(turn: PlayerTurn) {
  const events = visibleTurnEvents(turn);
  const last = events[events.length - 1];
  if (!last) return turn.complete ? "Ход завершён" : "Ожидаем действие";
  return eventHeadline(last);
}

export function eventHeadline(event: GameEvent) {
  const payload = event.payload;
  switch (event.type) {
    case "player:roll_dice": {
      const values = Array.isArray(payload.diceValues) ? payload.diceValues.join(" + ") : payload.dice;
      return `Бросок кубиков: ${values ?? "—"}`;
    }
    case "player:move":
      return `Переход на клетку ${Number(payload.to ?? 0) + 1}`;
    case "card:draw":
      return typeof payload.title === "string" ? `Карточка «${payload.title}»` : "Открыта карточка";
    case "card:cash_delta":
      return "Изменилась сумма наличных";
    case "card:cashflow_delta":
      return "Изменился денежный поток";
    case "card:liability_created":
      return "Создано новое обязательство";
    case "card:condition_not_met":
      return "Условие карточки не выполнено";
    case "card:no_matching_assets":
      return "Подходящих активов нет";
    case "card:stock_quantity_changed":
      return "Изменилось количество акций";
    case "deal:choice_required":
      return "Выбирает размер сделки";
    case "deal:buy":
      return typeof payload.name === "string" ? `Куплен актив «${payload.name}»` : "Куплен актив";
    case "deal:decline":
      return "Отказ от сделки";
    case "deal:sell":
      return typeof payload.name === "string" ? `Продан актив «${payload.name}»` : "Продан актив";
    case "paycheck:receive":
      return "Получен расчётный чек";
    case "loan:take":
      return "Получен кредит";
    case "loan:repay":
      return "Погашен кредит";
    case "charity:accepted":
      return "Принята благотворительность";
    case "charity:declined":
      return "Отказ от благотворительности";
    case "market:sale_offer":
      return "Получено предложение рынка";
    case "market:sale_declined":
      return "Отказ от продажи";
    case "player:baby":
      return "В семье появился ребёнок";
    case "player:baby_gift":
      return "Отправлено поздравление с рождением ребёнка";
    case "player:downsized":
      return "Игрок потерял работу";
    case "player:charity":
      return "Сделано пожертвование";
    case "player:charity_choice_required":
      return "Выбирает участие в благотворительности";
    case "player:charity_declined":
      return "Отказ от благотворительности";
    case "player:escaped_rat_race":
      return "Переход на Скоростную дорожку";
    case "doodad:paid":
      return "Оплачена незапланированная покупка";
    case "turn:skipped":
    case "bankruptcy:turn_skipped":
      return "Ход пропущен";
    case "bankruptcy:declared":
      return "Объявлено банкротство";
    case "bankruptcy:eliminated":
      return "Игрок выбыл";
    case "bankruptcy:asset_sold":
      return "Актив продан при банкротстве";
    case "bankruptcy:debt_repaid":
      return "Долг погашен при банкротстве";
    case "bankruptcy:debts_halved":
      return "Долги сокращены вдвое";
    case "bankruptcy:recovered":
      return "Игрок вышел из банкротства";
    case "network_marketing:level_applied":
      return "Получен уровень сетевого маркетинга";
    case "network_marketing:level_stored":
      return "Уровень сетевого маркетинга сохранён";
    case "network_marketing:discarded":
      return "Карточка сетевого маркетинга сброшена";
    case "game:created":
      return "Партия создана";
    case "game:started":
      return "Партия началась";
    case "game:paused":
      return "Партия поставлена на паузу";
    case "game:resumed":
      return "Партия продолжена";
    case "game:period_started":
      return `Начался период ${payload.currentPeriod ?? "—"}`;
    case "game:ended":
      return "Партия завершена";
    case "state:update":
      return "Состояние партии обновлено";
    default:
      return event.type
        .replaceAll(":", " · ")
        .replaceAll("_", " ");
  }
}

export function pendingActionLabel(snapshot: GameSnapshot, player: GamePlayer) {
  if (snapshot.game.pendingAction?.gamePlayerId !== player.id) return null;
  const labels: Record<string, string> = {
    choose_deal: "Выбирает сделку",
    deal_card_drawn: "Принимает решение по сделке",
    stock_sale_window: "Решает, продавать ли акции",
    charity_choice: "Решает вопрос благотворительности",
    doodad_payment_choice: "Выбирает способ оплаты",
    market_sale: "Рассматривает предложение рынка"
  };
  return labels[snapshot.game.pendingAction.type] ?? "Принимает решение";
}

export function playerGameStatus(snapshot: GameSnapshot, player: GamePlayer) {
  const state = player.financialState;
  if (state?.bankruptcyStatus === "ELIMINATED" || player.status !== "JOINED") return "Выбыл";
  if ((state?.downsizedTurns ?? 0) > 0) return "Пропускает ход";
  if (snapshot.game.currentPlayerId === player.id) {
    return pendingActionLabel(snapshot, player) ? "Решает" : "Ходит";
  }
  if (player.track === "FAST_TRACK") return "Скоростная дорожка";
  return "Ожидает";
}

function isPlayerGameplayEvent(event: GameEvent) {
  return Boolean(event.gamePlayer?.id) && !nonGameplayPlayerEventTypes.has(event.type);
}

function isTurnEndingStateEvent(event: GameEvent) {
  const reason = String(event.payload.reason ?? "");
  return turnEndingStateReasons.has(reason) || reason.endsWith("_turn_ended");
}
