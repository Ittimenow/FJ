export type RealEstate = {
  target: "house2u" | "house3m" | "plex" | "apartment";
  units: number;
  label: string;
};

type PropertyCard = {
  title: string;
  bodyText?: string | null;
  subcategory?: string | null;
  category?: string | null;
};

function home(target: "house2u" | "house3m"): RealEstate {
  return { target, units: 1, label: target === "house2u" ? "2/1" : "3/2" };
}

function multiUnit(units: number): RealEstate {
  return { target: units <= 8 ? "plex" : "apartment", units, label: units <= 8 ? `${units}Plex` : `${units} квартир` };
}

/** The first property in a description is the asset, not the seller's next home. */
export function realEstateFromText(value: string): RealEstate | null {
  const text = value.toLowerCase().replace(/ё/g, "е");
  const match = text.match(/(?:^|[^\p{L}\p{N}])(?:(2\s*\/\s*1|2у|2\s*спальн\p{L}*)|(3\s*\/\s*2|3[mм]|3br|3\s*спальн\p{L}*)|(duplex|дуплекс\p{L}*)|((?:2|4|8|12|24|60))[-х\s]*(?:plex|плекс|кв(?:артир)?|апартамент))/u);
  if (!match) return null;
  if (match[1]) return home("house2u");
  if (match[2]) return home("house3m");
  if (match[3]) return multiUnit(2);
  return multiUnit(Number(match[4]));
}

export function cardRealEstate(card: PropertyCard): RealEstate | null {
  // Subcategory is structured identity; unrelated flags (e.g. financing) are not.
  const subtype = card.subcategory?.toLowerCase();
  if (subtype === "house2u" || subtype === "house3m") return home(subtype);
  if (subtype === "duplex") return multiUnit(2);
  if (subtype && /^(2|4|8)plex$/.test(subtype)) return multiUnit(Number.parseInt(subtype));
  return realEstateFromText(card.title) ?? realEstateFromText(card.bodyText ?? "");
}

export function assetRealEstate(asset: { name: string; sourceCard?: PropertyCard | null }) {
  if (asset.sourceCard?.category && /^(stock|business|loan|land|collectible|network_marketing)$/.test(asset.sourceCard.category)) return null;
  return (asset.sourceCard ? cardRealEstate(asset.sourceCard) : null) ?? realEstateFromText(asset.name);
}

export function realEstateAssetName(asset: { name: string; sourceCard?: PropertyCard | null }) {
  const property = assetRealEstate(asset);
  if (!property || asset.name.toLowerCase().includes(property.label.toLowerCase())) return asset.name;
  const priceStart = asset.name.indexOf(":");
  return priceStart < 0 ? `${asset.name} · ${property.label}` : `${asset.name.slice(0, priceStart)} · ${property.label}${asset.name.slice(priceStart)}`;
}
