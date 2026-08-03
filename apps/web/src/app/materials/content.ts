export type MaterialSlug = "financial-game" | "how-to-play" | "game-for-teams";

export type Material = {
  slug: MaterialSlug;
  title: string;
  description: string;
  summary: string;
  readTime: string;
};

export const materials: Material[] = [
  {
    slug: "financial-game",
    title: "Что такое финансовая игра",
    description:
      "Разбираемся, как финансовая игра превращает доходы, расходы, сделки и последствия решений в понятный практический опыт.",
    summary: "Зачем учиться на игровых решениях и чем такой формат отличается от лекции.",
    readTime: "2 минуты"
  },
  {
    slug: "how-to-play",
    title: "Как проходит партия",
    description:
      "Пошаговое знакомство с онлайн-партией «Финансового путешествия»: от комнаты и профессии до сделок и финансовой цели.",
    summary: "Комната, роли, ход игрока, финансовый отчёт и путь к цели.",
    readTime: "2 минуты"
  },
  {
    slug: "game-for-teams",
    title: "Финансовая игра для команды",
    description:
      "Как провести «Финансовое путешествие» с друзьями, финансовым клубом или рабочей командой и подготовить участников.",
    summary: "Форматы совместной игры и практичный чек-лист организатора.",
    readTime: "2 минуты"
  }
];

export function materialBySlug(slug: MaterialSlug) {
  return materials.find((material) => material.slug === slug)!;
}
