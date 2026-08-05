export const gameStatusLabels: Record<string, string> = {
  WAITING: "Собираем игроков",
  IN_PROGRESS: "Партия идёт",
  PAUSED: "На паузе",
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
  return gameStatusLabels[status] ?? "Неизвестный статус";
}

export function localizeGameText(value: string) {
  return value
    .replace(/Cashflow Day/g, "День денежного потока")
    .replace(/Fast Track Deal/g, "Сделка Скоростной дорожки")
    .replace(/Dolby Surround/g, "объёмный звук")
    .replace(/Cashflow/g, "Денежный поток")
    .replace(/cashflow/g, "денежный поток")
    .replace(/Doodad/g, "Всякая всячина")
    .replace(/4-Plex/g, "4-квартирный дом")
    .replace(/8-Plex/g, "8-квартирный дом")
    .replace(/Duplex/g, "Двухквартирный дом")
    .replace(/\bPlex\b/g, "многоквартирного дома")
    .replace(/Part Time/g, "Парт Тайм")
    .replace(/\bROI\b/g, "доходность на вложения")
    .replace(/РОИ/g, "доходность на вложения")
    .replace(/\bMBA\b/g, "магистратура по управлению бизнесом")
    .replace(/\bDVD\b/g, "видеодиски");
}
