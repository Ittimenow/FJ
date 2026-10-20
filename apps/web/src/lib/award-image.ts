const awardImageFiles: Record<string, string> = {
  family_person: "family_person.png",
  career_swings: "career_swings.png",
  cashflow_architect: "cashflow_architect.png",
  deal_hunter: "deal_hunter.png",
  debt_master: "debt_master.png",
  bank_favorite: "bank_favorite.png",
  generous_heart: "generous_heart.png",
  good_neighbor: "good_neighbor.png",
  iron_patience: "iron_patience.png",
  surprise_spending_king: "surprise_spending_king.png",
  financial_phoenix: "financial_phoenix.png"
};

export function awardImagePath(kind: string): string | undefined {
  const file = awardImageFile(kind);
  return file ? `/awards/${file}` : undefined;
}

export function awardImageFile(kind: string): string | undefined {
  return Object.hasOwn(awardImageFiles, kind) ? awardImageFiles[kind] : undefined;
}
