export function marketAssetUnits(assetText: string) {
  if (/60[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 60;
  if (/24[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 24;
  if (/12[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 12;
  if (/8[\s-]*(кв|квартир|plex)/.test(assetText)) return 8;
  if (/4[\s-]*(кв|квартир|plex)|4х-кварт/.test(assetText)) return 4;
  if (/2[\s-]*(кв|квартир|plex)|duplex|двух-кварт/.test(assetText)) return 2;
  return 1;
}

export function marketSalePriceForUnits(basePrice: bigint, assetText: string) {
  return basePrice * BigInt(marketAssetUnits(assetText));
}

export function isRentalRealEstateAsset(assetText: string) {
  const normalized = assetText.toLowerCase().replace(/ё/g, "е");
  if (
    /part\s*time|брат\s+просит|другу\s+срочно|монет|гектар|свободная\s+земл|циркониев/.test(normalized)
  ) {
    return false;
  }

  return /(?:^|\s)(?:2у|3m|3м)(?:\s|$)|plex|duplex|коттедж|таунхаус|апартамент|квартирн(?:ый|ого)\s+(?:дом|комплекс)|дом:\s*\$/.test(
    normalized
  );
}
