"use client";

import { figurineImagePath, outstandingBankLoanBalanceCents } from "@cashflow/shared";
import { Baby, CheckCircle2, Circle, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { gamePlayerName } from "@/lib/game-player";
import { localizeGameText } from "@/lib/game-labels";
import { cn } from "@/lib/utils";
import type { FinancialState, GamePlayer, PlayerLiability } from "@/lib/types";
import { OtherPlayersList } from "./other-players-list";
import { PlayerToken } from "./rat-race-layout";
import { liabilityLabels } from "./financial-report-model";
import { classicFinancialPresentation, freedomProgress, type FinancialPresentation } from "./financial-presentation";

export function CreditList({
  liabilities,
  currentCashCents,
  monthlyIncomeCents,
  canManageLiabilities,
  onCloseLiability,
  presentation = classicFinancialPresentation
}: {
  liabilities: PlayerLiability[];
  currentCashCents: number;
  monthlyIncomeCents: number;
  canManageLiabilities: boolean;
  onCloseLiability: (liability: PlayerLiability) => void;
  presentation?: FinancialPresentation;
}) {
  return (
    <div>
      <div className="text-sm font-medium">Кредиты</div>
      {liabilities.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">Нет кредитов для закрытия.</p>
      ) : (
        <>
          <DebtComposition
            liabilities={liabilities}
            currentCashCents={currentCashCents}
            monthlyIncomeCents={monthlyIncomeCents}
            presentation={presentation}
          />
          <div className="mt-3 space-y-2">
            {liabilities.map((liability) => {
              const hasEnoughCash = currentCashCents >= liability.balanceCents;
              const canClose = canManageLiabilities && hasEnoughCash;
              return (
                <div
                  key={liability.id}
                  className="grid gap-2 rounded-md bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {liabilityLabels[liability.type] ?? localizeGameText(liability.name)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Остаток: {presentation.money(liability.balanceCents)}
                      {liability.paymentCents > 0
                        ? ` · платеж: ${presentation.money(liability.paymentCents)}/мес`
                        : ""}
                    </div>
                    {!canManageLiabilities ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        Погашение доступно владельцу финансового отчёта.
                      </div>
                    ) : !hasEnoughCash ? (
                      <div className="mt-1 text-xs text-red-700">
                        Недостаточно наличных для закрытия.
                      </div>
                    ) : (
                      <div className="mt-1 text-xs font-medium text-success">
                        Кредит можно закрыть полностью.
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() => onCloseLiability(liability)}
                    disabled={!canClose}
                  >
                    Закрыть кредит
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function Metric({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 rounded-md bg-surface p-3", className)}>
      <div className="min-h-8 text-xs leading-4 text-neutral-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold leading-5">{value}</div>
    </div>
  );
}

export function PlayerIdentityMark({
  player,
  size = "md"
}: {
  player: GamePlayer;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const name = gamePlayerName(player);
  const figurine = player.figurine;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const sizeClass = figurine
    ? size === "lg"
      ? "h-24 w-24"
      : size === "xs"
        ? "h-8 w-8"
        : size === "sm"
          ? "h-10 w-10"
          : "h-12 w-12"
    : size === "lg"
      ? "h-20 w-20 text-xl"
      : size === "xs"
        ? "h-8 w-8 text-[10px]"
        : size === "sm"
          ? "h-9 w-9 text-xs"
          : "h-11 w-11 text-sm";

  return (
    <span
      className={[
        "grid shrink-0 place-items-center",
        figurine
          ? ""
          : "overflow-hidden rounded-full bg-journey font-extrabold text-white shadow-[0_5px_14px_rgba(27,57,118,.18)]",
        sizeClass
      ].join(" ")}
      title={name}
    >
      {figurine ? (
        <img src={figurineImagePath(figurine)} alt="" className="h-full w-full object-contain" />
      ) : (
        initials
      )}
      <span className="sr-only">Игрок {name}</span>
    </span>
  );
}

export function CashflowEquation({
  state,
  className = "",
  presentation = classicFinancialPresentation
}: {
  state: FinancialState;
  className?: string;
  presentation?: FinancialPresentation;
}) {
  const scale = Math.max(1, state.totalIncomeCents, state.totalExpensesCents);
  const positive = state.monthlyCashflowCents >= 0;

  return (
    <div className={`rounded-md bg-surface p-3 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Как формируется денежный поток
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
        <div className="min-w-0">
          <div className="text-xs text-neutral-500">Доходы</div>
          <div className="mt-0.5 break-words text-sm font-semibold text-success">
            {presentation.money(state.totalIncomeCents)}
          </div>
        </div>
        <span className="text-neutral-400" aria-hidden="true">−</span>
        <div className="min-w-0">
          <div className="text-xs text-neutral-500">Расходы</div>
          <div className="mt-0.5 break-words text-sm font-semibold text-red-700">
            {presentation.money(state.totalExpensesCents)}
          </div>
        </div>
        <span className="text-neutral-400" aria-hidden="true">=</span>
        <div className="min-w-0">
          <div className="text-xs text-neutral-500">Денежный поток</div>
          <div
            className={`mt-0.5 break-words text-sm font-semibold ${
              positive ? "text-success" : "text-red-700"
            }`}
          >
            {presentation.money(state.monthlyCashflowCents)}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <ProgressBar
          value={state.totalIncomeCents}
          max={scale}
          label={`Общие доходы ${presentation.money(state.totalIncomeCents)}`}
          tone="success"
        />
        <ProgressBar
          value={state.totalExpensesCents}
          max={scale}
          label={`Общие расходы ${presentation.money(state.totalExpensesCents)}`}
          tone="danger"
        />
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  tone = "neutral",
  className = ""
}: {
  value: number;
  max: number;
  label: string;
  tone?: ProgressTone;
  className?: string;
}) {
  const safeMax = Math.max(1, max);
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-neutral-200 ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(safeMax, Math.max(0, value))}
      aria-valuetext={label}
    >
      <div
        className={`h-full rounded-full transition-[width] ${progressToneClasses[tone]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function FinancialFreedomProgress({
  passiveIncomeCents,
  totalExpensesCents,
  bankLoanBalanceCents,
  currentCashCents = 0,
  presentation = classicFinancialPresentation,
  className = ""
}: {
  passiveIncomeCents: number;
  totalExpensesCents: number;
  bankLoanBalanceCents: number;
  currentCashCents?: number;
  presentation?: FinancialPresentation;
  className?: string;
}) {
  const { target: incomeTargetCents, incomeReached, reached } = freedomProgress(presentation, passiveIncomeCents, totalExpensesCents, bankLoanBalanceCents, currentCashCents);
  const percentage = incomeReached
    ? 100
    : Math.round(
        Math.min(100, Math.max(0, (passiveIncomeCents / incomeTargetCents) * 100))
      );
  const missingCents = Math.max(0, incomeTargetCents - passiveIncomeCents);
  const label = reached
    ? "Условия выхода с малого круга выполнены"
    : !incomeReached
      ? `Пассивному доходу не хватает ${presentation.money(missingCents)} в месяц`
      : bankLoanBalanceCents > 0 ? `Осталось погасить банковские кредиты на ${presentation.money(bankLoanBalanceCents)}` : "Покройте отрицательный остаток наличных";

  return (
    <div className={`rounded-md bg-surface px-3 py-2.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-neutral-700">Финансовая свобода</span>
        <span className={reached ? "font-semibold text-success" : "font-semibold text-neutral-700"}>
          {reached
            ? "Готово"
            : incomeReached && bankLoanBalanceCents > 0
              ? "Остался кредит"
              : `${percentage}%`}
        </span>
      </div>
      <ProgressBar
        className="mt-2"
        value={incomeReached ? incomeTargetCents : passiveIncomeCents}
        max={incomeTargetCents}
        label={label}
        tone={reached ? "success" : "neutral"}
      />
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-neutral-600">
        <span>
          Пассивный доход: <strong>{presentation.money(passiveIncomeCents)}</strong>/мес
        </span>
        <span>
          Расходы: <strong>{presentation.money(totalExpensesCents)}</strong>/мес
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-xs" aria-label="Условия выхода с малого круга">
        <li className="flex items-start gap-1.5">
          {incomeReached ? (
            <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={14} aria-hidden="true" />
          ) : (
            <Circle className="mt-0.5 shrink-0 text-neutral-500" size={14} aria-hidden="true" />
          )}
          <span className={incomeReached ? "text-success" : "text-neutral-600"}>
            {incomeReached
              ? presentation.incomeReachedLabel
              : `Увеличьте пассивный доход ещё на ${presentation.money(missingCents)}/мес`}
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          {bankLoanBalanceCents <= 0 ? (
            <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={14} aria-hidden="true" />
          ) : (
            <Circle className="mt-0.5 shrink-0 text-neutral-500" size={14} aria-hidden="true" />
          )}
          <span className={bankLoanBalanceCents <= 0 ? "text-success" : "text-neutral-600"}>
            {bankLoanBalanceCents <= 0
              ? "Банковские кредиты погашены"
              : `Погасите банковские кредиты на ${presentation.money(bankLoanBalanceCents)}`}
          </span>
        </li>
        {presentation.gameType === "202" && currentCashCents < 0 ? <li className="flex items-start gap-1.5 text-neutral-600"><Circle className="mt-0.5 shrink-0" size={14} aria-hidden="true"/><span>Покройте обязательные расходы на {presentation.money(-currentCashCents)}</span></li> : null}
      </ul>
    </div>
  );
}

export type ExpenseItem = { id: string; label: string; amountCents: number; calculation?: string | null };

export function ExpenseComposition({ items: allItems, presentation = classicFinancialPresentation }: { items: ExpenseItem[]; presentation?: FinancialPresentation }) {
  const items = allItems.filter(item => item.amountCents > 0);
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  if (total <= 0) return null;

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Структура расходов</span>
        <strong>{presentation.money(total)}/мес</strong>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-200"
        role="img"
        aria-label={`Структура ежемесячных расходов на сумму ${presentation.money(total)}`}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={expenseSegmentClasses[item.id] ?? "bg-neutral-400"}
            style={{ width: `${(item.amountCents / total) * 100}%` }}
            title={`${item.label}: ${presentation.money(item.amountCents)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const percentage = Math.round((item.amountCents / total) * 100);
          return (
            <div key={item.id} className="flex min-w-0 items-center gap-2 text-xs">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${expenseSegmentClasses[item.id] ?? "bg-neutral-400"}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-neutral-600">{item.label}</span>
              <span className="shrink-0 font-semibold">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DebtComposition({
  liabilities,
  currentCashCents,
  monthlyIncomeCents,
  presentation = classicFinancialPresentation
}: {
  liabilities: PlayerLiability[];
  currentCashCents: number;
  monthlyIncomeCents: number;
  presentation?: FinancialPresentation;
}) {
  const grouped = Array.from(
    liabilities.reduce((items, liability) => {
      const current = items.get(liability.type) ?? {
        type: liability.type,
        label: liabilityLabels[liability.type] ?? localizeGameText(liability.name),
        balanceCents: 0,
        paymentCents: 0
      };
      current.balanceCents += liability.balanceCents;
      current.paymentCents += liability.paymentCents;
      items.set(liability.type, current);
      return items;
    }, new Map<string, { type: string; label: string; balanceCents: number; paymentCents: number }>())
      .values()
  ).filter((item) => item.balanceCents > 0);
  const totalBalanceCents = grouped.reduce((sum, item) => sum + item.balanceCents, 0);
  const totalPaymentCents = grouped.reduce((sum, item) => sum + item.paymentCents, 0);
  if (totalBalanceCents <= 0) return null;
  const burdenRatio =
    monthlyIncomeCents > 0
      ? totalPaymentCents / monthlyIncomeCents
      : totalPaymentCents > 0
        ? 1
        : 0;
  const burdenPercent = Math.round(burdenRatio * 100);
  const burdenTone: ProgressTone =
    burdenRatio >= 0.5 ? "danger" : burdenRatio >= 0.3 ? "warning" : "neutral";

  return (
    <div className="mt-3 rounded-md bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        <span className="font-medium">Структура долгов</span>
        <div className="text-right">
          <div className="font-semibold">{presentation.money(totalBalanceCents)}</div>
          <div className="text-xs text-neutral-500">
            {presentation.money(totalPaymentCents)}/мес
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
            <span>Платежи от дохода</span>
            <strong className={burdenRatio >= 0.5 ? "text-red-700" : "text-neutral-800"}>
              {burdenPercent}%
            </strong>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={totalPaymentCents}
            max={Math.max(1, monthlyIncomeCents)}
            label={`Долговые платежи занимают ${burdenPercent}% ежемесячного дохода`}
            tone={burdenTone}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
            <span>Покрытие наличными</span>
            <strong>
              {Math.round(
                Math.min(1, Math.max(0, currentCashCents / totalBalanceCents)) * 100
              )}
              %
            </strong>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={Math.max(0, currentCashCents)}
            max={totalBalanceCents}
            label={`Наличными покрывается ${presentation.money(Math.min(currentCashCents, totalBalanceCents))} из долга ${presentation.money(totalBalanceCents)}`}
            tone={currentCashCents >= totalBalanceCents ? "success" : "neutral"}
          />
        </div>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-200"
        role="img"
        aria-label={`Общая задолженность ${presentation.money(totalBalanceCents)}, ежемесячный платёж ${presentation.money(totalPaymentCents)}`}
      >
        {grouped.map((item) => (
          <div
            key={item.type}
            className={debtSegmentClasses[item.type] ?? "bg-neutral-400"}
            style={{ width: `${(item.balanceCents / totalBalanceCents) * 100}%` }}
            title={`${item.label}: ${presentation.money(item.balanceCents)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {grouped.map((item) => (
          <div key={item.type} className="flex min-w-0 items-center gap-2 text-xs">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-sm ${debtSegmentClasses[item.type] ?? "bg-neutral-400"}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-neutral-600">{item.label}</span>
            <span className="shrink-0 font-semibold">
              {Math.round((item.balanceCents / totalBalanceCents) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionList({
  title,
  titleAlign = "left",
  rows
}: {
  title: string;
  titleAlign?: "left" | "right";
  rows: Array<{ id: string; label: string; value: string; calculation?: string | null }>;
}) {
  return (
    <div>
      <div
        className={[
          "mb-2 text-sm font-medium",
          titleAlign === "right" ? "text-right" : "text-left"
        ].join(" ")}
      >
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">Пусто</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{row.label}</span>
              <span className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums">
                {row.calculation ? (
                  <span className="text-xs text-neutral-500">{row.calculation}</span>
                ) : null}
                <span className="font-medium">{row.value}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChildrenMarks({ count, size = "md" }: { count: number; size?: "sm" | "md" }) {
  if (count <= 0) return null;

  return (
    <span
      className="flex shrink-0 items-center gap-0.5 text-[#718866]"
      role="img"
      aria-label={`Детей: ${count}`}
      title={`Детей: ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <Baby
          key={index}
          size={size === "sm" ? 14 : 16}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

const progressToneClasses: Record<ProgressTone, string> = {
  neutral: "bg-[#8da7c4]",
  success: "bg-[#73a865]",
  warning: "bg-[#d5ad45]",
  danger: "bg-[#cf6679]"
};

const expenseSegmentClasses: Record<string, string> = {
  taxes: "bg-[#7b9cc6]",
  home_mortgage: "bg-[#9d82b8]",
  school_debt: "bg-[#66a7a0]",
  car_debt: "bg-[#d59a62]",
  credit_cards: "bg-[#c87383]",
  retail_debt: "bg-[#b99c5d]",
  other_expenses: "bg-[#8b9a73]",
  children: "bg-[#c98aaf]",
  bank_loan: "bg-[#77818f]"
};

const debtSegmentClasses: Record<string, string> = {
  home_mortgage: "bg-[#9d82b8]",
  school_debt: "bg-[#66a7a0]",
  car_debt: "bg-[#d59a62]",
  credit_cards: "bg-[#c87383]",
  retail_debt: "bg-[#b99c5d]",
  bank_loan: "bg-[#7b9cc6]"
};

type ProgressTone = "neutral" | "success" | "warning" | "danger";

export function FinancialPlayerReport({player,players,currentPlayerId,canOpenBank,onOpenBank,outsidePlayers=[],variant="mobile",presentation=classicFinancialPresentation,goalProgress}: {
  player: GamePlayer;
  players: GamePlayer[];
  currentPlayerId: string | null;
  canOpenBank: boolean;
  onOpenBank: () => void;
  outsidePlayers?: GamePlayer[];
  variant?: "mobile" | "desktop";
  presentation?: FinancialPresentation;
  goalProgress?: ReactNode;
}) {
  const state=player.financialState;
  if(!state)return <p className="py-2 text-sm text-neutral-600">Финансовый отчёт появится после старта партии.</p>;
  return variant==="desktop" ? (<div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <PlayerIdentityMark player={player} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">
                      {gamePlayerName(player)}
                    </h2>
                    <ChildrenMarks count={state.childrenCount} />
                  </div>
                  <div className="mt-1 truncate text-sm text-neutral-500">
                    {player.profession?.name}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                className="h-9 shrink-0 gap-2 px-3 text-xs"
                onClick={onOpenBank}
                disabled={!canOpenBank}
              >
                <Landmark size={15} aria-hidden="true" />
                Банк
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              <Metric label="Наличные" value={presentation.money(state.cashCents)} />
              <Metric label="Зарплата" value={presentation.money(state.salaryCents)} />
              <Metric label="Денежный поток" value={presentation.money(state.monthlyCashflowCents)} />
              <Metric label="Пассивный доход" value={presentation.money(state.passiveIncomeCents)} />
              <Metric label="Расходы" value={presentation.money(state.totalExpensesCents)} />
            </div>
            {goalProgress ?? <FinancialFreedomProgress
              className="mt-3"
              passiveIncomeCents={state.passiveIncomeCents}
              totalExpensesCents={state.totalExpensesCents}
              bankLoanBalanceCents={outstandingBankLoanBalanceCents(player.liabilities)}
              currentCashCents={state.cashCents}
              presentation={presentation}
            />}
            <CashflowEquation className="mt-3" state={state} presentation={presentation} />
            {outsidePlayers.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>Вне поля</span>
                {outsidePlayers.map((outsidePlayer) => (
                  <PlayerToken key={outsidePlayer.id} player={outsidePlayer} />
                ))}
              </div>
            ) : null}
            <OtherPlayersList
              className="mt-4 border-t border-line/70 pt-4"
              players={players.filter((otherPlayer) => otherPlayer.id !== player.id)}
              currentPlayerId={currentPlayerId}
              presentation={presentation}
            />
          </div>) : (<div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <PlayerIdentityMark player={player} size="sm" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate text-sm font-semibold">
                      {gamePlayerName(player)}
                    </div>
                    <ChildrenMarks count={state.childrenCount} size="sm" />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-neutral-500">
                    {player.profession?.name}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                className="h-9 shrink-0 gap-2 px-3 text-xs"
                onClick={onOpenBank}
                disabled={!canOpenBank}
              >
                <Landmark size={15} aria-hidden="true" />
                Банк
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Наличные" value={presentation.money(state.cashCents)} />
              <Metric label="Денежный поток" value={presentation.money(state.monthlyCashflowCents)} />
              <Metric label="Зарплата" value={presentation.money(state.salaryCents)} />
              <Metric label="Пассивный доход" value={presentation.money(state.passiveIncomeCents)} />
              <div className="min-[360px]:col-span-2">
                <Metric label="Расходы" value={presentation.money(state.totalExpensesCents)} />
              </div>
            </div>
            {goalProgress ?? <FinancialFreedomProgress
              passiveIncomeCents={state.passiveIncomeCents}
              totalExpensesCents={state.totalExpensesCents}
              bankLoanBalanceCents={outstandingBankLoanBalanceCents(player.liabilities)}
              currentCashCents={state.cashCents}
              presentation={presentation}
            />}
            <CashflowEquation state={state} presentation={presentation} />
            <OtherPlayersList
              className="border-t border-line/70 pt-3"
              players={players.filter((otherPlayer) => otherPlayer.id !== player.id)}
              currentPlayerId={currentPlayerId}
              presentation={presentation}
            />
          </div>);
}

export function FinancialExpenses({items,total,presentation=classicFinancialPresentation}: {items:ExpenseItem[];total:number;presentation?:FinancialPresentation}) {
  return <div className="space-y-4"><ExpenseComposition items={items} presentation={presentation}/><SectionList title={presentation.money(total)} titleAlign="right" rows={items.map(item=>({id:item.id,label:item.label,value:presentation.money(item.amountCents),calculation:item.calculation??null}))}/></div>;
}
