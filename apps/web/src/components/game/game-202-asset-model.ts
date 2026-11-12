import { assetPortion202 } from "@cashflow/shared";
import type { GameSnapshot } from "../../lib/types";
import type { PortfolioAsset } from "./asset-portfolio";
import { money202 } from "./financial-presentation";

/** 202 does not store a persistent market quote or each owner's trade cost. */
export function portfolioAssets202(snapshot: GameSnapshot, playerId: string): PortfolioAsset[] {
  const state = snapshot.game202;
  const player = state?.players.find(candidate => candidate.id === playerId);
  if (!state || !player) return [];
  const base = { symbol: null, quantity: 1, marketValueCents: null, downPaymentCents: 0, cashflowCents: 0 };
  const assets: PortfolioAsset[] = state.assets.filter(asset => (asset.owners[playerId] ?? 0) > 0).map(asset => ({
    ...base, id: asset.id, name: asset.name, type: asset.kind, stock: false,
    category: asset.kind === "property" ? "real_estate" : "other",
    kindLabel: asset.kind === "property" ? "Недвижимость" : asset.kind === "royalty" ? "Отчисления" : "Процентный доход",
    costBasisCents: assetPortion202(asset, playerId, asset.down),
    downPaymentCents: assetPortion202(asset, playerId, asset.down),
    costLabel: "Первоначальный взнос доли",
    cashflowCents: assetPortion202(asset, playerId, asset.income),
    details: [
      { label: "Ваша доля", value: `${(asset.owners[playerId] ?? 0) / 100}%` },
      { label: "Стоимость доли по карточке", value: money202(assetPortion202(asset, playerId, asset.cost)) },
      { label: "Ипотека доли", value: money202(assetPortion202(asset, playerId, asset.mortgage)) },
      ...((asset.lockedUntil[playerId] ?? 0) > player.laps ? [{ label: "Продажа временно запрещена", value: `До круга ${asset.lockedUntil[playerId]}` }] : [])
    ]
  }));
  assets.push(...player.stocks.map(stock => ({ ...base, id: stock.id, name: stock.symbol, type: "stock", symbol: stock.symbol, quantity: stock.quantity, costBasisCents: stock.cost })));
  assets.push(...player.options.map(option => ({
    ...base, id: option.id, name: `${option.side.toUpperCase()} ${option.symbol}`, type: "option", symbol: option.symbol,
    quantity: option.quantity, stock: false, kindLabel: "Опцион", category: "stocks" as const, costBasisCents: option.cost, costLabel: "Премия",
    details: [
      { label: "Цена исполнения за акцию", value: money202(option.strikeTotal / option.quantity) },
      { label: "Полная цена исполнения", value: money202(option.strikeTotal) },
      { label: "Действует до конца своего хода", value: String(option.expires) }
    ]
  })));
  assets.push(...player.shorts.map(short => ({
    ...base, id: short.id, name: `Короткая продажа ${short.symbol}`, type: "short", symbol: short.symbol,
    quantity: short.quantity, stock: false, kindLabel: "Короткая продажа", category: "stocks" as const, costBasisCents: 0, costLabel: "Вложено",
    details: [{ label: "В банке до расчёта", value: money202(short.cost) }, { label: "Расчёт", value: "Следующая котировка" }]
  })));
  assets.push(...player.rights.map(right => ({
    ...base, id: right.id, name: "Опцион на следующую недвижимость", type: "right", stock: false, kindLabel: "Право покупки",
    costBasisCents: right.cost, costLabel: "Премия", details: [{ label: "Очередь права", value: String(right.order) }]
  })));
  const level1 = player.d2y.some(level => level.level === 1);
  const level2 = player.d2y.some(level => level.level === 2);
  assets.push(...player.d2y.map((level, index) => {
    const active = level1 && (level.level === 2 || level.level === 3 && level2);
    return {
      ...base, id: `d2y-${playerId}-${index}`, name: `D2Y · уровень ${level.level}`, type: "network", stock: false,
      kindLabel: "Бизнес", category: "business" as const, costBasisCents: level.level === 1 ? 20000 : 0,
      cashflowCents: active ? level.income : 0,
      details: !active && level.level > 1 ? [
        { label: "Поток после активации", value: `${money202(level.income)}/мес` },
        { label: "Для активации нужен уровень", value: !level1 ? "1" : "2" }
      ] : []
    };
  }));
  return assets;
}
