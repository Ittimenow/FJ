export type NetworkMarketingLevelRejection =
  | "already_has_level"
  | "missing_previous_level";

export type NetworkMarketingLevelDecision = {
  accepted: boolean;
  currentLevel: number;
  requiredLevel: number;
  reason?: NetworkMarketingLevelRejection;
};

export function contiguousNetworkMarketingLevel(levels: Iterable<number>) {
  const ownedLevels = new Set(levels);
  let level = 0;
  while (ownedLevels.has(level + 1)) level += 1;
  return level;
}

export function networkMarketingLevelDecision(
  levels: Iterable<number>,
  drawnLevel: number
): NetworkMarketingLevelDecision {
  const ownedLevels = new Set(levels);
  const currentLevel = contiguousNetworkMarketingLevel(ownedLevels);
  const requiredLevel = currentLevel + 1;

  if (drawnLevel === requiredLevel && !ownedLevels.has(drawnLevel)) {
    return { accepted: true, currentLevel, requiredLevel };
  }

  return {
    accepted: false,
    currentLevel,
    requiredLevel,
    reason:
      ownedLevels.has(drawnLevel) || drawnLevel <= currentLevel
        ? "already_has_level"
        : "missing_previous_level"
  };
}
