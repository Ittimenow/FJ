import { assert202CashHistory } from "./game-202-cash-history.assert";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { botCommand202, canEscape202, command202, decks202, fastPrice202, fastTrackCells, finances202, newGame202, public202, rules202, slug202, starters202, type Asset202, type Command202, type Deck202, type State202 } from "@cashflow/shared";

const random=(max:number)=>max-1;
const profiles=["a","b","c"].map(id=>({id,dream:fastTrackCells.find(c=>c.rule.kind==="dream")!.index,salary:10000,passive:0,expenses:4000,savings:1000000,childCost:500,loans:[]}));
function fresh(){return newGame202(profiles,random);}
function asset(s:State202,units=2,acres=0,owner="a"):Asset202 {
  const a:Asset202={id:`asset-${++s.serial}`,name:"Недвижимость",source:"test",kind:"property",owners:{[owner]:10000},cost:10000000,mortgage:6000000,down:4000000,income:40000,units,acres,house:units===1,lockedUntil:{}};s.assets.push(a);return a;
}
function act(s:State202,actor:string,command:Omit<Command202,"revision">){const next=command202(s,actor,{revision:s.revision,...command},random);assert202CashHistory(s,next);return next;}
function decide(s:State202,choice:string,extra:Partial<Command202>={}){const t=s.queue[0]!;return act(s,t.playerId,{type:"decide",taskId:t.id,choice,...extra});}
function open(s:State202,deck:Deck202,id:number|string){
  const slug=slug202(deck,id);s.decks[deck]=[slug];
  if(deck==="capital"||deck==="cashflow") {s.stage="deal";s.after="end";s.queue=[{id:"draw",playerId:"a",kind:"choose"}];return act(s,"a",{type:"choose",choice:deck,taskId:"draw"});}
  if(deck==="market"){s.stage="deal";s.after="end";s.queue=[{id:"market",playerId:"a",kind:"escape"}];return decide(s,"pass");}
  s.players[0]!.position=0;s.queue=[{id:"roll",playerId:"a",kind:"roll"}];return command202(s,"a",{type:"roll",taskId:"roll",revision:s.revision,quantity:1},()=>0);
}
const cards=JSON.parse(readFileSync("../../dist/recognized_202_cards_ru.json","utf8")) as Array<{slug:string;isActive:boolean;meta:Array<{metaKey:string;metaValue:string}>}>;
test("202: keeping a mentor card records one opening and preserves the purchase",()=>{
  let s=fresh();s.players[0]!.mentorUntil=4;
  s=open(s,"capital",4);
  assert.equal(s.queue[0]!.kind,"mentor");
  s=decide(s,"keep");
  assert.equal(s.queue[0]!.kind,"deal");
  assert.equal(s.log.filter(line=>line.effectType==="card_opened"&&line.slug==="set_202_capital_04").length,1);
  s=decide(s,"buy");
  assert.ok(s.assets.some(a=>a.source==="set_202_capital_04"));
});
test("202: automatic expense records the actual cash effect once",()=>{
  const before=fresh();const cash=before.players[0]!.cash;
  const s=open(before,"doodad",1);
  const effects=s.log.filter(line=>line.effectType==="financial_result"&&line.slug==="set_202_doodad_01");
  assert.equal(effects.length,1);
  assert.equal(effects[0]!.cashChangeCents,-10000);
  assert.equal(effects[0]!.cashflowChangeCents,0);
  assert.equal(s.players[0]!.cash,cash-10000);
  assert.equal(effects[0]!.turnKey,"a:1");
});
test("202: purchase and the following market have separate financial results",()=>{
  let s=fresh();s.assets=[];s=open(s,"capital",4);
  s.after="market";s.decks.market=["set_202_market_42"];
  s=decide(s,"buy");
  const effects=s.log.filter(line=>line.effectType==="financial_result"&&line.playerId==="a");
  assert.deepEqual(effects.map(line=>[line.slug,line.cashChangeCents,line.cashflowChangeCents]),[
    ["set_202_capital_04",-600000,2000],["set_202_market_42",0,3000]
  ]);
});
test("202: an automatic market card with no affected assets explains the empty result",()=>{
  const before=fresh();before.assets=[];
  const s=open(before,"market",42);
  assert.ok(s.log.some(line=>line.slug==="set_202_market_42"&&line.text==="Карточка не потребовала действий и не изменила финансы участников"));
  assert.equal(s.log.some(line=>line.slug==="set_202_market_42"&&line.effectType==="financial_result"),false);
});
test("202: all physical cards have active typed rules identical to the import",()=>{
  assert.equal(cards.length,138);assert.equal(Object.keys(rules202).length,138);
  for(const card of cards){assert.equal(card.isActive,true,card.slug);assert.deepEqual(JSON.parse(card.meta.find(m=>m.metaKey==="game202_rule")!.metaValue),rules202[card.slug]);}
  assert.deepEqual(Object.values(decks202).map(deck=>deck.length),[36,36,42,24]);
});
test("202: starting cash includes savings, portfolio cash and adjusted cashflow; portfolios are unique",()=>{
  const s=fresh();assert.deepEqual(s.players.map(p=>p.starter),[1,2,3]);
  for(const p of s.players){assert.equal(p.cash,(1000000+starters202[p.starter-1]!.cash)*100+finances202(s,p).cashflow);}
  const many=newGame202(Array.from({length:12},(_,i)=>({...profiles[0]!,id:String(i)})),random);
  assert.equal(new Set(many.players.map(p=>p.starter)).size,12);assert.equal(many.assets.length,7);
});
for(const [deck,slugs] of Object.entries(decks202) as Array<[Deck202,string[]]>)for(const slug of slugs){
  test(`202: executable physical card ${slug}`,()=>{
    let s=fresh();s.assets=[];
    for(const p of s.players){p.cash=1000000000;p.children=2;p.basePassive=60000;p.stocks=[{id:`stock-${p.id}`,symbol:"OK4U",quantity:100,cost:100000},{id:`stock2-${p.id}`,symbol:"MYT4U",quantity:100,cost:100000}];}
    for(const units of [1,2,4,8,24,30])asset(s,units);asset(s,0,40);
    const index=slug.slice(`set_202_${deck}_`.length).replace("_", ".");s=open(s,deck,deck==="cashflow"?index:Number(index));
    assert.ok(s.log.some(l=>l.slug===slug),slug);
    for(let i=0;s.queue[0]?.kind!=="roll"&&i<40;i++){
      const t=s.queue[0]!;const p=s.players.find(p=>p.id===t.playerId)!;
      if(t.kind==="deal"&&t.rule?.kind==="exchange"){const r=t.rule;const a=s.assets.find(a=>(a.owners[p.id]??0)>0&&a.units===r.units);s=decide(s,a?"buy":"pass",a?{assetId:a.id}:{});}
      else if(t.kind==="deal")s=decide(s,"buy",{quantity:t.rule?.kind==="option"?100:1});
      else if(t.kind==="quote")s=decide(s,"pass");
      else if(t.kind==="university")s=decide(s,"credit");
      else if(t.kind==="auction"){const bidder=t.candidates!.find(id=>t.bids?.[id]===undefined)!;s=act(s,bidder,{type:"decide",taskId:t.id,choice:"bid",amount:10000});}
      else if(t.kind==="mentor")s=decide(s,"keep");
      else if(t.kind==="debt")s=act(s,p.id,{type:"bankruptcy"});
      else s=decide(s,"yes");
    }
    assert.equal(s.queue[0]?.kind,"roll",`${slug} did not finish`);assert.doesNotThrow(()=>JSON.parse(JSON.stringify(s)));
  });
}
test("202: option profit, premium, holder's clock and split conserve aggregate values",()=>{
  let s=fresh();const initial=s.players[0]!.cash;
  s=open(s,"capital",1);s=decide(s,"buy",{quantity:100});
  let p=s.players[0]!;assert.equal(p.cash,initial-40000);assert.equal(p.options[0]!.expires,4);
  s=open(s,"market",10);p=s.players[0]!;assert.equal(p.options[0]!.quantity,200);assert.equal(p.options[0]!.strikeTotal,100000);assert.equal(p.options[0]!.cost,40000);
  s=decide(s,"exercise",{assetId:p.options[0]!.id});assert.equal(s.players[0]!.cash,initial-40000+500000);
  assert.equal(s.players[0]!.options.length,0);
  s=fresh();s=open(s,"capital",14);s=decide(s,"buy",{quantity:100});
  p=s.players[0]!;const expires=p.options[0]!.expires;
  // Complete three owner turns with no card events, then the fourth starts and expires the contract.
  for(let i=0;i<12;i++){const owner=s.players[s.current]!;s.queue=[{id:`pass${i}`,playerId:owner.id,kind:"insurance"}];s.after="end";s=decide(s,"pass");if(s.players[0]!.turns<=expires)assert.equal(s.players[0]!.options.length,1);}
  assert.equal(s.players[0]!.options.length,0);
});
test("202: short proceeds stay in bank, close on next quote and forbid borrowing for a loss",()=>{
  let s=fresh();s.players[0]!.cash=10000;s=open(s,"capital",12);const cash=s.players[0]!.cash;
  s=decide(s,"short",{quantity:100});assert.equal(s.players[0]!.cash,cash);assert.equal(s.players[0]!.shorts[0]!.cost,50000);
  assert.throws(()=>decide(s,"short",{quantity:100}),/уже выполнена/);
  s=open(s,"capital",17);assert.equal(s.players[0]!.cash,cash-450000);assert.equal(s.players[0]!.shorts.length,0);
  assert.throws(()=>act(s,"a",{type:"loan",amount:500000}),/короткой/);
  const old=structuredClone(s);assert.throws(()=>act(s,"b",{type:"decide",taskId:s.queue[0]!.id,choice:"pass"}),/другого/);assert.deepEqual(s,old);
});
test("202: company bankruptcy wipes shares and CALL, settles PUT and shorts at zero; IPO belongs only to drawer",()=>{
  let s=fresh();const p=s.players[0]!;p.options=[{id:"call",symbol:"OK4U",quantity:100,cost:40000,strikeTotal:100000,side:"call",expires:4},{id:"put",symbol:"OK4U",quantity:100,cost:40000,strikeTotal:400000,side:"put",expires:4}];p.shorts=[{id:"short",symbol:"OK4U",quantity:100,cost:300000}];const before=p.cash;
  s=open(s,"market",14);assert.equal(s.players[0]!.cash,before+700000);assert.equal(s.players[0]!.options.length,0);assert.equal(s.players[0]!.shorts.length,0);assert.ok(!s.players[0]!.stocks.some(a=>a.symbol==="OK4U"));assert.equal(s.queue.filter(t=>t.kind==="quote"&&t.buy).length,1);assert.equal(s.queue[0]!.price,400);
});
test("202: land example repays all mortgage and removes all land expense on a partial sale",()=>{
  let s=fresh();s.assets=[];const a=asset(s,0,30);Object.assign(a,{cost:3000000,mortgage:1200000,down:1800000,income:-16000});
  s.queue=[{id:"land",playerId:"a",kind:"sale",assetId:a.id,rule:{kind:"sale",filter:"land",price:40000,acres:10}}];s.after="end";
  const before=s.players[0]!.cash;s=decide(s,"yes");assert.equal(s.players[0]!.cash-before,2800000);const remaining=s.assets[0]!;assert.equal(remaining.acres,20);assert.equal(remaining.cost,2000000);assert.equal(remaining.mortgage,0);assert.equal(remaining.income,0);
});
test("202: D2Y held out of sequence activates only after prerequisites, survives bankruptcy",()=>{
  let s=fresh();s.assets=[];s=open(s,"cashflow","2.3");s=decide(s,"buy");assert.equal(finances202(s,s.players[0]!).passive,0);
  s=open(s,"cashflow","1.3");s=decide(s,"buy");assert.equal(finances202(s,s.players[0]!).passive,0);
  s=open(s,"capital",18);s=decide(s,"buy");assert.equal(finances202(s,s.players[0]!).passive,600000);
  s=act(s,"a",{type:"bankruptcy"});assert.equal(finances202(s,s.players[0]!).passive,600000);
  assert.throws(()=>act(s,"a",{type:"loan",amount:100000}),/После банкротства/);
});
test("202: expenses respect children and strict passive threshold, university loan has the right payment",()=>{
  let s=fresh(),before=s.players[0]!.cash;s=open(s,"doodad",10);assert.equal(s.players[0]!.cash,before);assert.equal(s.players[0]!.loans.length,0);
  s=fresh();s.players[0]!.children=1;s=open(s,"doodad",10);s=decide(s,"credit");assert.deepEqual(s.players[0]!.loans.map(l=>[l.balance,l.payment,l.child]),[[5000000,100000,true]]);
  for(const passive of [50000,50001]) {s=fresh();s.assets=[];s.players[0]!.basePassive=passive;before=s.players[0]!.cash;s=open(s,"doodad",15);assert.equal(before-s.players[0]!.cash,passive>50000?300000:0);}
});
test("202: property rights order, transfer and expiry on another player's opportunity",()=>{
  let s=fresh();s.players[1]!.rights=[{id:"right-b",cost:100000,order:1}];s.players[2]!.rights=[{id:"right-c",cost:100000,order:2}];
  s=open(s,"capital",4);assert.equal(s.queue[0]!.playerId,"b");s=decide(s,"pass");assert.equal(s.queue[0]!.playerId,"c");s=decide(s,"buy");assert.equal(s.queue[0]!.kind,"deal");assert.equal(s.queue[0]!.playerId,"c");assert.ok(s.players.every(p=>!p.rights.length));
  s=decide(s,"buy");assert.ok(s.assets.some(a=>a.owners.c===10000));
});
test("202: joint purchase is atomic; stale accept, insufficient funds and unconsented sale do not change state",()=>{
  let s=open(fresh(),"capital",4);const before=s.players.map(p=>p.cash),taskId=s.queue[0]!.id;
  s=act(s,"a",{type:"offer",choice:"joint",target:"b",taskId,shares:{a:2500,b:7500}});const offer=s.offers[0]!;assert.deepEqual(s.players.map(p=>p.cash),before);
  const accepted=act(s,"b",{type:"accept",offerId:offer.id});assert.equal(before[0]!-accepted.players[0]!.cash,150000);assert.equal(before[1]!-accepted.players[1]!.cash,450000);const a=accepted.assets.find(a=>a.source===slug202("capital",4))!;assert.deepEqual(a.owners,{a:2500,b:7500});
  assert.throws(()=>command202(accepted,"b",{revision:s.revision,type:"accept",offerId:offer.id},random),/Состояние изменилось/);
  s.players[1]!.cash=0;const original=structuredClone(s);assert.throws(()=>act(s,"b",{type:"accept",offerId:offer.id}),/недостаточно/);assert.deepEqual(s,original);
  s=accepted;s.queue=[{id:"sale",kind:"sale",playerId:"a",assetId:a.id,rule:{kind:"sale",filter:"house",price:85000}}];s.after="end";s=decide(s,"yes");assert.equal(s.queue[0]!.playerId,"b");assert.ok(s.assets.some(x=>x.id===a.id));s=decide(s,"pass");assert.ok(s.assets.some(x=>x.id===a.id));
});
test("202: full win requires income AND dream; takeovers cost base, twice, three times",()=>{
  let s=fresh();s.assets=[];let p=s.players[0]!;p.basePassive=800000;assert.equal(canEscape202(s,p),true);p.basePassive=799999;assert.equal(canEscape202(s,p),false);
  p.track="FAST_TRACK";p.cash=1000000000;p.fastIncome=p.initialFastIncome=10000000;
  const dream=fastTrackCells.find(c=>c.rule.kind==="dream")!;p.dream=dream.index;
  s.queue=[{id:"dream",kind:"fast",playerId:"a",cell:dream.index}];s.after="end";s=decide(s,"buy");assert.equal(s.winner,null);
  const business=fastTrackCells.find(c=>c.rule.kind==="business")!;p=s.players[0]!;p.fastIncome=p.initialFastIncome+5000000-business.income*100;s.queue=[{id:"business",kind:"fast",playerId:"a",cell:business.index}];s=decide(s,"buy");assert.equal(s.winner,"a");
  s=fresh();p=s.players[0]!;assert.equal(fastPrice202(s,p,business.index),business.cost*100);s.world.purchaseCounts={[business.index]:1};assert.equal(fastPrice202(s,p,business.index),business.cost*200);s.world.purchaseCounts[business.index]=2;assert.equal(fastPrice202(s,p,business.index),business.cost*300);
});
test("202: deal and market share a turn; market samples 25; public snapshots hide deck order",()=>{
  let s=fresh();s.players[0]!.position=5;s.decks.capital=[slug202("capital",4)];s=command202(s,"a",{revision:s.revision,type:"roll",taskId:s.queue[0]!.id,quantity:1},()=>0);assert.equal(s.queue[0]!.kind,"choose");s=act(s,"a",{type:"choose",choice:"capital",taskId:s.queue[0]!.id});assert.equal(s.current,0);s=decide(s,"pass");assert.equal(s.decks.market.length,24);assert.ok(s.log.some(l=>l.slug?.startsWith("set_202_market")));assert.ok(!("decks" in public202(s)));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
});
test("202: negative cashflow alone does not cause bankruptcy; snapshot round-trip resumes identical decisions",()=>{
  let s=fresh();s.players[0]!.baseExpenses=2000000;assert.equal(s.players[0]!.bankrupt,false);
  const c={type:"roll" as const,revision:s.revision,taskId:s.queue[0]!.id,quantity:1};assert.deepEqual(command202(s,"a",c,()=>0),command202(JSON.parse(JSON.stringify(s)),"a",c,()=>0));
});
test("202: deterministic autonomous game reaches full victory without hidden-deck decisions",()=>{
  let seed=2939485;const rng=(max:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
  let s=newGame202(profiles.map(p=>({...p,savings:200000})),rng);const bots={a:"expert_v1",b:"balanced_v1",c:"beginner_v1"};
  let steps=0;for(;steps<15000&&!s.winner;steps++){const action=botCommand202(public202(s),bots);assert.ok(action,`No decision at ${JSON.stringify(s.queue[0])}`);try{const before=s;s=command202(s,action.playerId,action.command,rng);assert202CashHistory(before,s);}catch(error){throw new Error(`Step ${steps}: ${JSON.stringify(action)}: ${String(error)}`);}}
  assert.ok(s.winner,`No full victory after ${steps} decisions`);assert.equal(s.queue.length,0);
});

test("202: mentor respects a foreign property option and gives its drawer a replacement",()=>{
  let s=fresh();s.players[0]!.mentorUntil=4;s.players[1]!.rights=[{id:"right-b",cost:100000,order:1}];
  s=open(s,"capital",4);assert.equal(s.queue[0]!.kind,"right");s=decide(s,"buy");s=decide(s,"buy");
  assert.equal(s.queue[0]!.kind,"mentor");assert.equal(s.queue[0]!.playerId,"a");assert.equal(s.queue[0]!.mandatory,true);
  s.decks.capital=[slug202("capital",18)];s=decide(s,"redraw");assert.equal(s.queue[0]!.rule?.kind,"d2y");assert.equal(s.players[1]!.rights.length,0);
});
test("202: shared sale allocates every cent exactly once",()=>{
  let s=fresh();s.assets=[];const a=asset(s);a.owners={a:3333,b:3333,c:3334};a.mortgage=0;
  s.queue=[{id:"sale",kind:"sale",playerId:"a",assetId:a.id,rule:{kind:"sale",filter:"house",price:1.01}}];s.after="end";
  const before=s.players.reduce((n,p)=>n+p.cash,0);s=decide(s,"yes");s=decide(s,"yes");s=decide(s,"yes");assert.equal(s.players.reduce((n,p)=>n+p.cash,0)-before,101);
});

test("202: two distinct other dreams win only together with the income target",()=>{
  let s=fresh();const p=s.players[0]!,dreams=fastTrackCells.filter(c=>c.rule.kind==="dream");
  p.track="FAST_TRACK";p.cash=1000000000;p.initialFastIncome=10000000;p.fastIncome=15000000;p.dream=dreams[0]!.index;
  for(const [i,cell] of [dreams[1]!,dreams[1]!,dreams[2]!].entries()){
    s.queue=[{id:`dream${i}`,kind:"fast",playerId:"a",cell:cell.index}];s.after="end";s=decide(s,"buy");assert.equal(s.winner,i===2?"a":null);
  }
});
test("202: inheritance pays the legal fee but records the stated equity; recovered borrowers can finance only doodads",()=>{
  let s=fresh(),before=s.players[0]!.cash;s=open(s,"capital",32);s=decide(s,"buy");assert.equal(before-s.players[0]!.cash,300000);assert.equal(s.assets.find(a=>a.source===slug202("capital",32))!.down,900000);
  s=fresh();s.players[0]!.bankrupt=true;s.players[0]!.cash=0;s=open(s,"doodad",1);assert.equal(s.queue[0]!.loanAllowed,true);s=act(s,"a",{type:"loan",amount:100000});assert.equal(s.players[0]!.cash,90000);
  s=fresh();s.players[0]!.bankrupt=true;s.players[0]!.cash=0;s.players[0]!.children=1;s=open(s,"market",6);assert.equal(s.queue[0]!.loanAllowed,false);assert.throws(()=>act(s,"a",{type:"loan",amount:500000}));
});
