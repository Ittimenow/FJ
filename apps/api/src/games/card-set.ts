import { CardType } from "@prisma/client";

export type CardTypeCount = {
  cardType: CardType;
  count: number;
};

export const requiredCardTypes: CardType[] = [
  CardType.SMALL_DEAL,
  CardType.BIG_DEAL,
  CardType.DOODAD,
  CardType.MARKET
];

export function missingCardTypes(counts: CardTypeCount[]) {
  const availableTypes = new Set(
    counts.filter((row) => row.count > 0).map((row) => row.cardType)
  );
  return requiredCardTypes.filter((cardType) => !availableTypes.has(cardType));
}
