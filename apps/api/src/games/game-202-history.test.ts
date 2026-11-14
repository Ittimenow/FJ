import { assert202CashHistory } from "./game-202-cash-history.assert";
import assert from "node:assert/strict";
import test from "node:test";
import { command202, fastTrackCells, fastTrackRoute, newGame202, ratRaceBoard, type Command202, type State202 } from "@cashflow/shared";
import { GamesService } from "./games.service";

const random = (max: number) => max - 1;
function fresh(count = 3) {
  return newGame202(Array.from({ length: count }, (_, index) => ({
    id: String.fromCharCode(97 + index), dream: fastTrackCells.find(cell => cell.rule.kind === "dream")!.index,
    salary: 10000, passive: 0, expenses: 4000, savings: 1000000, childCost: 500, loans: []
  })), random);
}
function act(state: State202, actor: string, command: Omit<Command202, "revision">) {
  const next=command202(state, actor, { ...command, revision: state.revision }, random);
  assert202CashHistory(state,next);
  return next;
}

test("202 history separates preparation and establishes a stable first-turn identity", () => {
  const state = fresh();
  const preparation = state.log.filter(line => line.kind === "setup");
  assert.equal(preparation.length, 3);
  assert.ok(preparation.every(line => line.turnKey === undefined));
  const start = state.log.find(line => line.kind === "turn_started")!;
  assert.equal(start.turnKey, "a:1");
  assert.equal(start.turnOwnerGamePlayerId, "a");
  assert.equal(start.track, "RAT_RACE");
});

test("202 roll records an exact route from start in the same event as the dice", () => {
  const initial=fresh();
  const state=command202(initial,"a",{revision:initial.revision,type:"roll",taskId:initial.queue[0]!.id,quantity:1},()=>1);
  assert202CashHistory(initial,state);
  const movement=state.log.find(line=>line.effectType==="dice")!;
  assert.deepEqual({from:movement.from,to:movement.to,dice:movement.dice,values:movement.diceValues,cell:movement.cell},
    {from:-1,to:1,dice:2,values:[2],cell:{index:1,type:"doodad",label:"Всякая всячина"}});
  assert.equal(movement.turnKey,"a:1");
  assert.equal(state.players[0]!.position,1);
  assert.equal(initial.players[0]!.position,-1,"recording movement must not mutate the input");
  assert.equal(state.log.some(line=>line.text.startsWith("Клетка: ")),false);
  assert.equal(state.log.filter(line=>line.commandType==="roll").length,1,"the command remains in the durable audit log");
});

test("202 multi-dice movement keeps wraparound and every crossed payday", () => {
  const initial=fresh();
  initial.players[0]!.position=20;
  initial.players[0]!.permanentCharity=true;
  const state=command202(initial,"a",{revision:initial.revision,type:"roll",taskId:initial.queue[0]!.id,quantity:3},()=>5);
  assert202CashHistory(initial,state);
  const movement=state.log.find(line=>line.effectType==="dice")!;
  assert.deepEqual([movement.from,movement.to,movement.dice,movement.diceValues],[20,14,18,[6,6,6]]);
  assert.deepEqual(movement.cell,ratRaceBoard[14]);
  assert.equal(state.log.filter(line=>line.revision===state.revision&&line.text==="День зарплаты").length,3);
  assert.equal(state.players[0]!.position,14);
});

test("202 large-track movement records the route actually followed by the engine", () => {
  const initial=fresh();
  initial.players[0]!.track="FAST_TRACK";
  initial.players[0]!.fastPosition=-1;
  const state=command202(initial,"a",{revision:initial.revision,type:"roll",taskId:initial.queue[0]!.id,quantity:2},()=>0);
  const destination=fastTrackRoute(-1,2).at(-1)!;
  assert202CashHistory(initial,state);
  const movement=state.log.find(line=>line.effectType==="dice")!;
  assert.deepEqual([movement.from,movement.to,movement.dice,movement.diceValues],[-1,destination.index,2,[1,1]]);
  assert.deepEqual(movement.cell,{index:destination.index,type:destination.type,label:destination.label});
  assert.equal(movement.track,"FAST_TRACK");
  assert.equal(state.players[0]!.fastPosition,destination.index);
});

test("202 history records every quote operation under the turn owner, including another player's responses", () => {
  let state = fresh();
  state.players[1]!.stocks = [];
  state.players[1]!.options = [{ id: "option-b", side: "call", symbol: "OK4U", quantity: 100, cost: 2000, strikeTotal: 10000, expires: 5 }];
  state.queue = [{ id: "quote", kind: "quote", playerId: "b", symbol: "OK4U", price: 200, buy: true, sell: true }];
  state.after = "end";
  for (const command of [
    { choice: "buy", quantity: 100 }, { choice: "sell", quantity: 100 },
    { choice: "short", quantity: 100 }, { choice: "exercise", assetId: "option-b" }, { choice: "pass" }
  ]) state = act(state, "b", { type: "decide", taskId: "quote", ...command });
  const commands = state.log.filter(line => line.kind === "command");
  assert.deepEqual(commands.map(line => line.choice), ["buy", "sell", "short", "exercise", "pass"]);
  assert.ok(commands.every(line => line.playerId === "b" && line.turnOwnerGamePlayerId === "a" && line.turnKey === "a:1"));
  assert.equal(state.log.find(line => line.kind === "turn_ended")?.turnKey, "a:1");
  assert.equal(state.log.at(-1)?.turnKey, "b:1");
});

test("202 history retains all skipped-turn boundaries in a single large revision", () => {
  let state = fresh(12);
  for (const player of state.players) {
    player.skip = 3;
    player.options = [{ id: `expired-${player.id}`, side: "call", symbol: "OK4U", quantity: 100, cost: 100, strikeTotal: 100, expires: 0 }];
  }
  state.queue = [{ id: "insurance", kind: "insurance", playerId: "a" }];
  state.after = "end";
  state = act(state, "a", { type: "decide", taskId: "insurance", choice: "pass" });
  const revision = state.log.filter(line => line.revision === state.revision);
  assert.ok(revision.length > 120, "the API must receive all new rows before history is trimmed");
  assert.equal(revision.filter(line => line.kind === "command").length, 1);
  assert.equal(revision.filter(line => line.kind === "turn_skipped").length, 36);
  assert.equal(revision.filter(line => line.kind === "turn_ended").length, 37);
  const starts = revision.filter(line => line.kind === "turn_started");
  assert.equal(starts.length, 37);
  assert.equal(new Set(starts.map(line => line.turnKey)).size, 37);
  assert.equal(state.log.at(-1)?.turnKey, "b:4");
});

test("202 history records auction responses without publishing sealed amounts or task/deck state", () => {
  let state = fresh();
  state.queue = [{ id: "auction", kind: "auction", playerId: "a", candidates: ["a", "b"], bids: {} }];
  state.after = "end";
  state = act(state, "a", { type: "decide", taskId: "auction", choice: "bid", amount: 987654 });
  const bid = state.log.find(line => line.kind === "command")!;
  assert.equal(bid.choice, "bid");
  assert.equal(bid.amountCents, undefined);
  assert.equal(JSON.stringify(bid).includes("987654"), false);
  assert.equal("bids" in bid || "decks" in bid || "resume" in bid, false);
  state = act(state, "b", { type: "decide", taskId: "auction", choice: "pass" });
  assert.deepEqual(state.log.filter(line => line.kind === "command").map(line => [line.playerId, line.choice, line.turnKey]), [["a", "bid", "a:1"], ["b", "pass", "a:1"]]);
});

test("202 history persists partial joint consent and rejected offers, and old saved logs stay readable", () => {
  let state = fresh();
  state.log = [{ revision: 0, playerId: "a", text: "Старое событие" }];
  state.queue = [{ id: "deal", kind: "deal", playerId: "a", rule: { kind: "investment", cost: 1000, income: 100, royalty: true, repeat: false } }];
  state = act(state, "a", { type: "offer", taskId: "deal", choice: "joint", target: "b", shares: { a: 5000, b: 2500, c: 2500 } });
  const offerId = state.offers[0]!.id;
  state = act(state, "b", { type: "accept", offerId });
  assert.equal(state.offers.length, 1, "a partial acceptance must remain open");
  state = act(state, "c", { type: "reject", offerId });
  assert.deepEqual(state.log.filter(line => line.kind === "command").map(line => line.commandType), ["offer", "accept", "reject"]);
  assert.equal(state.log[0]?.turnKey, undefined);
  assert.ok(state.log.slice(1).every(line => line.turnKey === "a:1"));
});

test("202 joint-offer history never presents an ignored amount as the agreed price", () => {
  let state = fresh();
  state.queue = [{ id: "deal", kind: "deal", playerId: "a", rule: { kind: "investment", cost: 2345, income: 100, royalty: true, repeat: false } }];
  state = act(state, "a", { type: "offer", taskId: "deal", choice: "joint", target: "b", amount: 77700, shares: { a: 5000, b: 5000 } });
  assert.equal(state.offers[0]?.price, 234500);
  const entry = state.log.find(line => line.kind === "command");
  assert.equal(entry?.choice, "joint");
  assert.equal(entry?.amountCents, undefined);
  assert.equal(JSON.stringify(entry).includes("77700"), false);
});

test("202 API preserves turn metadata and command records in the durable event stream", async () => {
  const state = fresh();
  state.queue = [{ id: "insurance", kind: "insurance", playerId: "a" }];
  state.after = "end";
  const emitted: Array<{ type: string; gamePlayerId?: string; payload: Record<string, unknown> }> = [];
  const tx = {
    $queryRaw: async () => [],
    game: {
      findUniqueOrThrow: async () => ({ gameType: "ADVANCED_202", game202State: state, status: "IN_PROGRESS", players: [{ id: "a", role: "PLAYER", status: "JOINED", controller: "HUMAN", userId: "owner" }] }),
      update: async () => ({})
    }
  };
  const service = new GamesService({ $transaction: async (work: (client: unknown) => Promise<unknown>) => work(tx) } as never);
  Object.assign(service, {
    expireGameIfNeeded: async () => null,
    project202: async () => undefined,
    appendEvents: async (_tx: unknown, _id: string, _actor: string, events: typeof emitted) => emitted.push(...events),
    actionResult: async () => ({})
  });
  await service.act202("room", "owner", { revision: state.revision, type: "decide", taskId: "insurance", choice: "pass" });
  const rows = emitted.filter(event => event.type === "game202:action");
  assert.equal(rows.find(event => event.payload.kind === "command")?.payload.turnKey, "a:1");
  assert.equal(rows.find(event => event.payload.kind === "turn_ended")?.payload.turnOwnerGamePlayerId, "a");
  assert.equal(rows.find(event => event.payload.kind === "turn_started")?.payload.turnKey, "b:1");
  assert.ok(rows.every(event => event.payload.gameType === "202"));
});

test("202 API persists exact movement and cash balances instead of reconstructing history", async () => {
  const state=fresh();
  state.players[0]!.position=4;
  const emitted:Array<{type:string;payload:Record<string,unknown>}>=[];
  const tx={
    $queryRaw:async()=>[],
    game:{
      findUniqueOrThrow:async()=>({gameType:"ADVANCED_202",game202State:state,status:"IN_PROGRESS",players:[{id:"a",role:"PLAYER",status:"JOINED",controller:"HUMAN",userId:"owner"}]}),
      update:async()=>({})
    }
  };
  const service=new GamesService({$transaction:async(work:(client:unknown)=>Promise<unknown>)=>work(tx)} as never);
  Object.assign(service,{
    expireGameIfNeeded:async()=>null,project202:async()=>undefined,
    appendEvents:async(_tx:unknown,_id:string,_actor:string,events:typeof emitted)=>emitted.push(...events),
    actionResult:async()=>({})
  });
  await service.act202("room","owner",{revision:state.revision,type:"roll",taskId:state.queue[0]!.id,quantity:1});
  const move=emitted.find(event=>event.payload.effectType==="dice")!.payload;
  assert.equal(move.from,4);
  assert.equal(move.to,Number(move.dice)+4);
  assert.deepEqual(move.diceValues,[move.dice]);
  assert.deepEqual(move.cell,ratRaceBoard[Number(move.to)]);
  assert.equal(move.turnKey,"a:1");
  const cash=emitted.find(event=>event.payload.effectType==="paycheck")!.payload;
  assert.equal(cash.beforeCashCents,state.players[0]!.cash);
  assert.equal(Number(cash.afterCashCents)-Number(cash.beforeCashCents),cash.cashChangeCents);
});

test("202 a roll keeps each payday and the following unemployment expense separate",()=>{
  const before=fresh();before.assets=[];
  const p=before.players[0]!;p.position=1;p.permanentCharity=true;p.cash=40000;p.salary=0;p.basePassive=0;p.baseExpenses=100000;
  const after=command202(before,"a",{revision:before.revision,type:"roll",taskId:before.queue[0]!.id,quantity:3},()=>5);
  assert202CashHistory(before,after);
  const cash=after.log.filter(row=>row.revision===after.revision&&row.cashChangeCents!==undefined);
  assert.deepEqual(cash.map(row=>[row.text,row.beforeCashCents,row.cashChangeCents,row.afterCashCents]),[
    ["День зарплаты",40000,-100000,-60000],["День зарплаты",-60000,-100000,-160000],["Увольнение",-160000,-100000,-260000]
  ]);
});

test("202 fast-track cash losses preserve exact balances including odd cents",()=>{
  for(const kind of ["half_cash","lose_cash"]){
    const before=fresh();const p=before.players[0]!;p.track="FAST_TRACK";p.cash=10001;p.fastIncome=0;
    const target=fastTrackCells.find(cell=>cell.rule.kind===kind)!;
    p.fastPosition=fastTrackCells.find(cell=>fastTrackRoute(cell.index,2).at(-1)!.index===target.index)!.index;
    const after=command202(before,"a",{revision:before.revision,type:"roll",taskId:before.queue[0]!.id,quantity:2},()=>0);
    assert202CashHistory(before,after);
    const expense=after.log.find(row=>row.effectType==="expense")!;
    assert.equal(expense.beforeCashCents,10001);
    assert.equal(expense.afterCashCents,kind==="half_cash"?5001:0);
  }
});
