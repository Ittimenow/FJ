import assert from "node:assert/strict";
import test from "node:test";
import type { GameEvent, GamePlayer } from "../../lib/types";
import type { Log202 } from "@cashflow/shared";
import { compact202History, prepare202History, currentCardOpening202, isCardOpening202, legacy202HistoryEvents, recordedMovement202 } from "./game-202-history.logic";

const players = [{ id: "a", seat: 1, role: "PLAYER" }] as GamePlayer[];
const row = (id:string, sequence:number, revision:number, text:string):GameEvent => ({ id, sequence, type:"game202:action", payload:{revision,text}, createdAt:"2026-11-01T12:00:00Z", gamePlayer:{id:"a",seat:1,role:"PLAYER"} });

test("202 commands show their own results once and preserve each card occurrence",()=>{
  const base = {...row("open",1,1,"Открыта карточка"),payload:{revision:1,slug:"house",kind:"effect",effectType:"card_opened",turnKey:"a:1",turnOwnerGamePlayerId:"a"}};
  const make=(id:string,sequence:number,revision:number,payload:Record<string,unknown>):GameEvent=>({...base,id,sequence,payload:{...base.payload,effectType:undefined,revision,...payload}});
  const result=make("result",2,2,{effectType:"financial_result",cashChangeCents:-300000,cashflowChangeCents:30000});
  const command=make("buy",3,2,{kind:"command",commandType:"decide",choice:"buy",text:"Куплена недвижимость"});
  const explanation=make("bot",4,2,{kind:"bot",text:"Доход покупки покрывает обслуживание кредита"});
  const other={...result,id:"other",sequence:5,gamePlayer:{id:"b",seat:2,role:"PLAYER" as const}};
  const repeated=make("repeat",6,3,{effectType:"card_opened"});
  const events=[base,result,command,explanation,other,repeated];
  const prepared=prepare202History(events);
  assert.deepEqual(prepared.map(event=>event.id),["open","buy","other","repeat"]);
  assert.equal(prepared[1]!.payload.cashChangeCents,-300000);
  assert.equal(prepared[1]!.payload.cashflowChangeCents,30000);
  assert.equal(prepared[1]!.payload.explanation,explanation.payload.text);
  assert.equal(command.payload.cashChangeCents,undefined,"archive input remains intact");
});

test("202 hides bot boilerplate and turn-start text including legacy archives",()=>{
  const events=[row("start",1,1,"Начало хода"),row("empty",2,1,"Решение по открытой карточке"),row("payday",3,1,"День зарплаты")];
  assert.deepEqual(prepare202History(events).map(event=>event.id),["payday"]);
});

test("202 never attributes later automatic market effects to an earlier decision",()=>{
  const command={...row("command",2,7,"Отказ от возможности"),payload:{revision:7,kind:"command",slug:"capital",turnKey:"a:1"}};
  const market={...row("market",3,7,"Финансовый результат"),payload:{revision:7,effectType:"financial_result",slug:"market",turnKey:"a:1",cashChangeCents:-50000}};
  const otherTurn={...market,id:"other-turn",sequence:1,payload:{...market.payload,slug:"capital",turnKey:"a:0"}};
  assert.deepEqual(prepare202History([command,market,otherTurn]).map(event=>event.id),["command","market","other-turn"]);
});

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


test("202 keeps exact balances when attaching results and never bridges an unrecorded gap",()=>{
  const event=(id:string,sequence:number,payload:Record<string,unknown>):GameEvent=>({...row(id,sequence,1,"Результат"),payload:{revision:1,turnKey:"a:1",...payload}});
  const first=event("first",1,{effectType:"financial_result",beforeCashCents:40000,afterCashCents:100000,cashChangeCents:60000});
  const second=event("second",2,{effectType:"financial_result",beforeCashCents:100000,afterCashCents:209000,cashChangeCents:109000});
  const command=event("command",3,{kind:"command",commandType:"accept"});
  const merged=prepare202History([first,second,command])[0]!;
  assert.equal(merged.payload.beforeCashCents,40000);
  assert.equal(merged.payload.afterCashCents,209000);
  assert.equal(merged.payload.cashChangeCents,169000);
  const gap={...second,payload:{...second.payload,beforeCashCents:120000,afterCashCents:229000}};
  const incomplete=prepare202History([first,gap,command])[0]!;
  assert.equal(incomplete.payload.beforeCashCents,undefined);
  assert.equal(incomplete.payload.afterCashCents,undefined);
  const legacy={...first,payload:{...first.payload,beforeCashCents:undefined,afterCashCents:undefined}};
  assert.equal(prepare202History([legacy,command])[0]!.payload.beforeCashCents,undefined);
});
