"use client";

import { Badge } from "@/components/ui/badge";
import { localizeGameText } from "@/lib/game-labels";
import type { PlayerAsset } from "@/lib/types";
import { Metric, ProgressBar } from "./financial-report";
import { classicFinancialPresentation, type FinancialPresentation } from "./financial-presentation";

/** A missing quote stays unknown; an acquisition cost is never a market valuation. */
export type PortfolioAsset = Omit<PlayerAsset, "marketValueCents"> & {
  marketValueCents: number | null;
  kindLabel?: string;
  category?: "stocks" | "real_estate" | "business" | "other";
  stock?: boolean;
  costLabel?: string;
  details?: Array<{ label: string; value: string }>;
};

export function CompactAssets({ assets, presentation = classicFinancialPresentation }: { assets: PortfolioAsset[]; presentation?: FinancialPresentation }) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Активов пока нет, но амбиции уже на балансе!
      </p>
    );
  }

  const maxAbsCashflowCents = Math.max(
    1,
    ...assets.map((asset) => Math.abs(asset.cashflowCents))
  );

  return (
    <div className="space-y-2">
      <PortfolioSummary assets={assets} presentation={presentation} />
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          presentation={presentation}
          maxAbsCashflowCents={maxAbsCashflowCents}
        />
      ))}
    </div>
  );
}

const portfolioSegmentClasses: Record<string, string> = {
  stocks: "bg-[#7b9cc6]",
  real_estate: "bg-[#73a865]",
  business: "bg-[#9d82b8]",
  other: "bg-[#b99c5d]"
};

const portfolioCategoryLabels: Record<string, string> = {
  stocks: "Акции",
  real_estate: "Недвижимость",
  business: "Бизнес",
  other: "Другие активы"
};

export function PortfolioSummary({ assets, presentation = classicFinancialPresentation }: { assets: PortfolioAsset[]; presentation?: FinancialPresentation }) {
  const money = presentation.money;
  const marketKnown = assets.every(asset => asset.marketValueCents !== null);
  const totalCostCents = assets.reduce((sum, asset) => sum + asset.costBasisCents, 0);
  const totalMarketCents = assets.reduce((sum, asset) => sum + (asset.marketValueCents ?? 0), 0);
  const totalCashflowCents = assets.reduce((sum, asset) => sum + asset.cashflowCents, 0);
  const resultCents = totalMarketCents - totalCostCents;
  const grouped = Array.from(
    assets.reduce((items, asset) => {
      const category = assetPortfolioCategory(asset);
      items.set(
        category,
        (items.get(category) ?? 0) +
          Math.max(0, asset.marketValueCents || asset.costBasisCents)
      );
      return items;
    }, new Map<string, number>())
  ).filter(([, value]) => value > 0);
  const compositionTotal = grouped.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="text-sm font-semibold">Портфель</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric className="bg-white" label={presentation.gameType === "202" ? "Учётная стоимость" : "Вложено"} value={money(totalCostCents)} />
        <Metric className="bg-white" label="Текущая стоимость" value={marketKnown ? money(totalMarketCents) : "Нет котировки"} />
        <Metric
          className="bg-white"
          label={marketKnown ? resultCents >= 0 ? "Прибыль" : "Убыток" : "Результат"}
          value={marketKnown ? money(Math.abs(resultCents)) : "Нет котировки"}
        />
        <Metric
          className="bg-white"
          label="Денежный поток активов"
          value={`${money(totalCashflowCents)}/мес`}
        />
      </div>
      {compositionTotal > 0 ? (
        <>
          <div
            className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-200"
            role="img"
            aria-label={marketKnown ? "Распределение стоимости портфеля по типам активов" : "Распределение учётной стоимости портфеля по типам активов"}
          >
            {grouped.map(([category, value]) => (
              <div
                key={category}
                className={portfolioSegmentClasses[category] ?? "bg-neutral-400"}
                style={{ width: `${(value / compositionTotal) * 100}%` }}
                title={`${portfolioCategoryLabels[category] ?? "Другие активы"}: ${money(value)}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {grouped.map(([category, value]) => (
              <div key={category} className="inline-flex items-center gap-1.5 text-xs">
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${portfolioSegmentClasses[category] ?? "bg-neutral-400"}`}
                  aria-hidden="true"
                />
                <span className="text-neutral-600">
                  {portfolioCategoryLabels[category] ?? "Другие активы"}
                </span>
                <strong>{Math.round((value / compositionTotal) * 100)}%</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function assetPortfolioCategory(asset: PortfolioAsset) {
  if (asset.category) return asset.category;
  if (isStockAsset(asset)) return "stocks";
  const type = asset.type.toLowerCase();
  if (type.includes("realestate") || type.includes("real_estate")) {
    return "real_estate";
  }
  if (type.includes("network") || type.includes("business")) return "business";
  return "other";
}

export function AssetCard({
  asset,
  presentation = classicFinancialPresentation,
  maxAbsCashflowCents
}: {
  asset: PortfolioAsset;
  presentation?: FinancialPresentation;
  maxAbsCashflowCents: number;
}) {
  const stock = isStockAsset(asset);
  const money = presentation.money;

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{localizeGameText(asset.name)}</div>
          {asset.symbol ? (
            <div className="mt-1 text-xs text-neutral-500">{asset.symbol}</div>
          ) : null}
        </div>
        <Badge className="shrink-0 bg-white text-ink">{assetTypeLabel(asset)}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {stock ? (
          <>
            <AssetInfoRow label="Количество" value={`${asset.quantity} шт.`} />
            <AssetInfoRow label="Стоимость за единицу" value={money(presentation.gameType === "202" && asset.quantity > 0 ? asset.costBasisCents / asset.quantity : assetUnitCostCents(asset))} />
          </>
        ) : asset.quantity > 1 ? (
          <AssetInfoRow label="Количество" value={String(asset.quantity)} />
        ) : null}
        <AssetInfoRow label={asset.costLabel ?? "Стоимость"} value={money(asset.costBasisCents)} />
        <AssetInfoRow label="Денежный поток" value={`${money(asset.cashflowCents)}/мес`} />
        {asset.details?.map(detail => <AssetInfoRow key={detail.label} {...detail} />)}
      </div>
      <AssetCashflowBar
        presentation={presentation}
        cashflowCents={asset.cashflowCents}
        maxAbsCashflowCents={maxAbsCashflowCents}
      />
    </div>
  );
}

function AssetCashflowBar({
  cashflowCents,
  presentation = classicFinancialPresentation,
  maxAbsCashflowCents
}: {
  cashflowCents: number;
  presentation?: FinancialPresentation;
  maxAbsCashflowCents: number;
}) {
  const money = presentation.money;
  if (cashflowCents === 0) {
    return (
      <div className="mt-3 inline-flex rounded-full bg-neutral-200 px-2 py-1 text-xs text-neutral-600">
        Без ежемесячного денежного потока
      </div>
    );
  }

  const positive = cashflowCents > 0;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={positive ? "text-success" : "text-red-700"}>
          {positive ? "Вклад в денежный поток" : "Снижение денежного потока"}
        </span>
        <strong>{money(cashflowCents)}/мес</strong>
      </div>
      <ProgressBar
        className="mt-1.5"
        value={Math.abs(cashflowCents)}
        max={Math.max(1, maxAbsCashflowCents)}
        label={`${positive ? "Вклад" : "Снижение"} денежного потока ${money(Math.abs(cashflowCents))} в месяц`}
        tone={positive ? "success" : "danger"}
      />
    </div>
  );
}

function AssetInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span className="shrink-0 font-semibold">{value}</span>
    </div>
  );
}

export function isStockAsset(asset: PortfolioAsset) {
  if (asset.stock !== undefined) return asset.stock;
  const type = asset.type.toLowerCase();
  const name = asset.name.toLowerCase();
  return Boolean(asset.symbol) || type.includes("stock") || type.includes("share") || /акци/.test(name);
}

function assetTypeLabel(asset: PortfolioAsset) {
  if (asset.kindLabel) return asset.kindLabel;
  if (isStockAsset(asset)) return "Акции";

  const type = asset.type.toLowerCase();
  if (type.includes("realestate") || type.includes("real_estate")) return "Недвижимость";
  if (type.includes("network")) return "Бизнес";
  return "Актив";
}

function assetUnitCostCents(asset: PortfolioAsset) {
  return asset.quantity > 0 ? Math.round(asset.costBasisCents / asset.quantity) : 0;
}
