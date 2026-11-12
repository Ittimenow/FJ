"use client";

import { assetPortion202, finances202 } from "@cashflow/shared";
import { CheckCircle2, Circle } from "lucide-react";
import type { GameSnapshot, PlayerLiability } from "@/lib/types";
import { CreditList, DebtComposition, FinancialExpenses, FinancialPlayerReport } from "./financial-report";
import { advancedFinancialPresentation } from "./financial-presentation";
import { expenseItems202, financialPlayers202 } from "./game-202-financial-model";
import { repayableLiabilityRows } from "./financial-report-model";
import { CompactAssets } from "./asset-portfolio";
import { portfolioAssets202 } from "./game-202-asset-model";
import { FastTrackResult } from "./other-players-list";

export function Game202Assets({ snapshot, playerId }: { snapshot: GameSnapshot; playerId: string }) {
  return <CompactAssets assets={portfolioAssets202(snapshot, playerId)} presentation={advancedFinancialPresentation}/>;
}

export function Game202PlayerReport({ snapshot, playerId, currentPlayerId, onOpenBank, canOpenBank, variant }: {
  snapshot: GameSnapshot;
  playerId: string;
  currentPlayerId: string | null;
  onOpenBank: () => void;
  canOpenBank: boolean;
  variant: "mobile" | "desktop";
}) {
  const players = financialPlayers202(snapshot);
  const player = players.find(candidate => candidate.id === playerId);
  if (!player) return null;
  const purchasedDreams = Object.entries(snapshot.game202?.world.dreamPurchases ?? {}).filter(([, owners]) => owners.includes(playerId)).map(([cell]) => Number(cell));
  const ownDream = purchasedDreams.includes(player.dreamCellIndex ?? -1);
  const otherDreams = purchasedDreams.filter(cell => cell !== player.dreamCellIndex).length;
  const dreamsReached = ownDream || otherDreams >= 2;
  const goalProgress = player.track === "FAST_TRACK" ? <section className="mt-3 rounded-md bg-surface px-3 py-2.5" aria-label="Условия победы на большом круге">
    <h3 className="text-xs font-medium text-neutral-700">Победа на большом круге</h3>
    <FastTrackResult player={player} presentation={advancedFinancialPresentation}/>
    <p className="mt-2 text-xs text-neutral-600">Для победы нужны прирост дохода {advancedFinancialPresentation.money(advancedFinancialPresentation.fastIncomeTarget)} и покупка своей мечты или двух чужих.</p>
    <div className={`mt-2 flex items-start gap-1.5 text-xs ${dreamsReached ? "text-success" : "text-neutral-600"}`}>
      {dreamsReached ? <CheckCircle2 className="mt-0.5 shrink-0" size={14} aria-hidden="true"/> : <Circle className="mt-0.5 shrink-0" size={14} aria-hidden="true"/>}
      <span>Своя мечта: {ownDream ? "куплена" : "не куплена"}. Чужие мечты: {otherDreams} из 2.</span>
    </div>
  </section> : undefined;
  return <FinancialPlayerReport player={player} players={players} currentPlayerId={currentPlayerId}
    onOpenBank={onOpenBank} canOpenBank={canOpenBank} variant={variant}
    goalProgress={goalProgress}
    outsidePlayers={players.filter(candidate => candidate.track === "RAT_RACE" && candidate.position < 0)}
    presentation={advancedFinancialPresentation}/>;
}

export function Game202Expenses({ snapshot, playerId }: { snapshot: GameSnapshot; playerId: string }) {
  const state = snapshot.game202;
  const player = state?.players.find(candidate => candidate.id === playerId);
  const source = snapshot.players.find(candidate => candidate.id === playerId);
  if (!state || !player || !source) return null;
  return <FinancialExpenses items={expenseItems202(player, source)} total={finances202(state, player).expenses} presentation={advancedFinancialPresentation}/>;
}

export function Game202Liabilities({ snapshot, playerId, canManage, onRepay }: {
  snapshot: GameSnapshot;
  playerId: string;
  canManage: boolean;
  onRepay: (id: string) => void;
}) {
  const player = financialPlayers202(snapshot).find(candidate => candidate.id === playerId);
  const state = snapshot.game202;
  if (!player?.financialState || !state) return null;
  const assets = state.assets.filter(asset => (asset.owners[playerId] ?? 0) > 0 && asset.mortgage > 0);
  const mortgages: PlayerLiability[] = assets.map(asset => ({id: asset.id, name: asset.name, type: "property_mortgage", balanceCents: assetPortion202(asset, playerId, asset.mortgage), paymentCents: 0}));
  return <div className="space-y-4">
    <CreditList liabilities={repayableLiabilityRows(player)} currentCashCents={player.financialState.cashCents}
      monthlyIncomeCents={player.financialState.totalIncomeCents} canManageLiabilities={canManage}
      onCloseLiability={loan => onRepay(loan.id)} presentation={advancedFinancialPresentation}/>
    {mortgages.length ? <section aria-label="Ипотеки объектов">
      <h3 className="text-sm font-medium">Ипотеки объектов</h3>
      <DebtComposition liabilities={mortgages} currentCashCents={player.financialState.cashCents} monthlyIncomeCents={player.financialState.totalIncomeCents} presentation={advancedFinancialPresentation}/>
      <div className="mt-3 space-y-2">{assets.map(asset => <div key={asset.id} className="grid gap-2 rounded-md bg-surface p-3">
        <p className="text-sm font-medium">{asset.name}</p>
        <p className="text-xs text-neutral-500">Ваша доля: {(asset.owners[playerId] ?? 0) / 100}% · остаток: {advancedFinancialPresentation.money(assetPortion202(asset, playerId, asset.mortgage))}</p>
        <p className="text-xs text-neutral-500">Ипотека учитывается в стоимости объекта при продаже. Её платёж уже включён в денежный поток объекта.</p>
      </div>)}</div>
    </section> : null}
  </div>;
}
