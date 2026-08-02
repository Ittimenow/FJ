export const gameStatusLabels: Record<string, string> = {
  WAITING: "Собираем игроков",
  IN_PROGRESS: "Партия идёт",
  ENDED: "Завершена",
  CANCELLED: "Отменена"
};

export const userRoleLabels: Record<string, string> = {
  USER: "Игрок",
  HOST: "Ведущий",
  ADMIN: "Администратор"
};

export const userStatusLabels: Record<string, string> = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  DELETED: "Удалён"
};

export function gameStatusLabel(status: string) {
  return gameStatusLabels[status] ?? status;
}
