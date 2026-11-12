import assert from "node:assert/strict";
import test from "node:test";
import type { GameEvent, GamePlayer } from "../../lib/types";
import type { Log202 } from "@cashflow/shared";
import { compact202History, currentCardOpening202, isCardOpening202, legacy202HistoryEvents, recordedMovement202 } from "./game-202-history.logic";

const players = [{ id: "a", seat: 1, role: "PLAYER" }] as GamePlayer[];
const row = (id:string, sequence:number, revision:number, text:string):GameEvent => ({ id, sequence, type:"game202:action", payload:{revision,text}, createdAt:"2026-11-01T12:00:00Z", gamePlayer:{id:"a",seat:1,role:"PLAYER"} });

test("202 roll presentation combines dice and a recorded route while preserving unrelated effects", () => {
  const dice={...row("dice",1,1,"Кубики: 2"),payload:{revision:1,effectType:"dice",diceValues:[2],dice:2,from:-1,to:1,cell:{index:1,type:"doodad",label:"Всякая всячина"}}};
  const command={...row("roll",4,1,"Бросок кубиков"),payload:{revision:1,commandType:"roll"}};
  const events=[dice,row("payday",2,1,"День зарплаты"),row("card",3,1,"Открыта карточка"),command];
  assert.deepEqual(compact202History(events).map(item=>item.id),["dice","payday","card"]);
  assert.deepEqual(recordedMovement202(dice),{diceValues:[2],total:2,from:-1,to:1,cellLabel:"Всякая всячина"});
  assert.equal(events.length,4);
});

test("202 legacy rolls keep known dice and cell labels without inventing positions", () => {
  const dice=row("dice",1,7,"Кубики: 1 + 2");
  const cell=row("cell",3,7,"Клетка: Всякая всячина");
  const command={...row("command",4,7,"Бросок кубиков"),payload:{revision:7,commandType:"roll"}};
  const other={...command,id:"other",gamePlayer:{id:"b",seat:2,role:"PLAYER" as const}};
  const compact=compact202History([dice,row("payday",2,7,"День зарплаты"),cell,command,other]);
  assert.deepEqual(compact.map(item=>item.id),["dice","payday","other"]);
  assert.deepEqual(recordedMovement202(compact[0]!),{diceValues:[1,2],total:3,cellLabel:"Всякая всячина"});
  assert.equal(compact[0]!.payload.from,undefined);
  assert.equal(dice.payload.recordedCellLabel,undefined);
});

test("202 missing roll data never hides a command or borrows a route from a different revision", () => {
  const command={...row("command",4,8,"Бросок кубиков"),payload:{revision:8,commandType:"roll"}};
  const earlier={...row("old",1,7,"Кубики: 4"),payload:{revision:7,diceValues:[4],from:3,to:7}};
  assert.deepEqual(compact202History([earlier,command,row("cell",5,8,"Клетка: Рынок")]).map(item=>item.id),["old","command","cell"]);
  assert.equal(recordedMovement202({...earlier,payload:{diceValues:[0,9]}}),null);
});

test("202 history recovers old starting portfolios and replaces fallback rows when replay arrives", () => {
  const log:Log202[] = [
    {revision:0,playerId:"a",text:"Стартовый портфель"},
    {revision:1,playerId:"a",text:"Бросок"}
  ];
  const recent = [row("roll",20,1,"Бросок")];
  const before = legacy202HistoryEvents(recent,log,players,"room");
  assert.deepEqual(before.map(item=>item.payload.text),["Бросок","Стартовый портфель"]);
  const after = legacy202HistoryEvents([...recent,row("portfolio",1,0,"Стартовый портфель")],log,players,"room");
  assert.deepEqual(after.map(item=>item.id),["roll","portfolio"]);
});

test("202 legacy reconciliation preserves repeated effects inside one revision", () => {
  const log:Log202[] = [
    {revision:4,playerId:"a",text:"День зарплаты"},
    {revision:4,playerId:"a",text:"День зарплаты"},
    {revision:4,playerId:"a",text:"Клетка: рынок"}
  ];
  const partial = [row("paycheck",30,4,"День зарплаты"),row("cell",32,4,"Клетка: рынок")];
  assert.equal(legacy202HistoryEvents(partial,log,players,"room").length,3);
  const full = [...partial,row("paycheck2",31,4,"День зарплаты")];
  assert.deepEqual(legacy202HistoryEvents(full,log,players,"room").map(item=>item.id),["cell","paycheck2","paycheck"]);
});

test("202 legacy fallback never duplicates new setup or structured turn events", () => {
  const log:Log202[] = [
    {revision:0,playerId:"a",text:"Портфель",kind:"setup"},
    {revision:1,playerId:"a",text:"Решение",kind:"command",turnKey:"a:1",turnOwnerGamePlayerId:"a"}
  ];
  assert.deepEqual(legacy202HistoryEvents([],log,players,"room"),[]);
});

test("active card replaces only its most recent opening within the same turn", () => {
  const opening = (id:string, sequence:number, turnKey?:string) => ({
    ...row(id,sequence,sequence,"Открыта карточка"),
    payload:{slug:"set_202_capital_18",effectType:"card_opened",...(turnKey?{turnKey,turnOwnerGamePlayerId:"a"}:{})}
  });
  const earlierTurn=opening("previous",1,"a:1");
  const earlierOccurrence=opening("earlier-in-turn",3,"a:2");
  const current=opening("current",8,"a:2");
  const unknown=opening("legacy",9);
  const events=[current,unknown,earlierOccurrence,earlierTurn];
  assert.equal(currentCardOpening202(events,"set_202_capital_18","a:2")?.id,"current");
  assert.equal(currentCardOpening202(events,"set_202_capital_18","a:1")?.id,"previous");
  assert.equal(currentCardOpening202(events,"set_202_capital_18","a:3"),undefined);
  assert.equal(currentCardOpening202(events,undefined,"a:2"),undefined);
  assert.deepEqual(events.map(event=>event.id),["current","legacy","earlier-in-turn","previous"]);
});

test("legacy opened cards get a full face, but decisions referring to the same card do not", () => {
  const opened={...row("opened",1,1,"Открыта карточка"),payload:{slug:"set_202_doodad_02",text:"Открыта карточка"}};
  assert.equal(isCardOpening202(opened),true);
  assert.equal(isCardOpening202({...opened,payload:{...opened.payload,text:"Отказ от возможности"}}),false);
  assert.equal(isCardOpening202({...opened,payload:{text:"Открыта карточка"}}),false);
});
