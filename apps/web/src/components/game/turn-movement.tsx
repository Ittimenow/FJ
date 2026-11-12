import { Dices, MoveRight } from "lucide-react";

export type TurnMovementData = {
  diceValues?: number[];
  total?: number;
  from?: number;
  to?: number;
  cellLabel?: string;
};

/** One shared 101 row for the dice result and the recorded route. Missing history stays unknown. */
export function TurnMovement({ diceValues, total, from, to, cellLabel }: TurnMovementData) {
  const dice = diceValues?.filter(Number.isFinite) ?? [];
  const hasDice = diceValues !== undefined || Number.isFinite(total);
  const hasRoute = Number.isFinite(from) && Number.isFinite(to);
  const result = dice.length
    ? `${dice.join(" + ")} = ${Number.isFinite(total) ? total : dice.reduce((sum, value) => sum + value, 0)}`
    : String(Number.isFinite(total) ? total : "—");
  const position = (value: number) => value < 0 ? "Старт" : String(value + 1);

  return <span className="inline-flex flex-wrap items-center gap-2" data-turn-movement>
    {hasDice ? <>
      <Dices size={16} className="shrink-0 text-journey" aria-hidden="true"/>
      <span className="sr-only">{hasRoute ? "Бросок кубика и перемещение по полю: " : "Бросок кубика: "}</span>
      <span>{result}</span>
      {hasRoute ? <span aria-hidden="true">·</span> : null}
    </> : <>
      <MoveRight size={16} className="shrink-0 text-journey" aria-hidden="true"/>
      <span className="sr-only">Перемещение по полю: </span>
    </>}
    {hasRoute ? <span>{position(from!)} → {position(to!)}</span> : null}
    {cellLabel ? <span className="text-xs font-medium text-neutral-600">{cellLabel}</span> : null}
  </span>;
}
