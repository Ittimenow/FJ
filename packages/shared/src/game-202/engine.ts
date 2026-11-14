import { ratRaceBoard } from "../board";
import { fastTrackCells, fastTrackRoute, readFastTrackWorld, type FastTrackWorld } from "../fast-track";
import { decks202, rules202, starters202, type Deck202, type Property202, type Rule202, type Symbol202 } from "./cards";

// All money in this module is integer cents (unlike legacy *Cents DB columns, which hold dollars).
export const dollars202 = (dollars: number) => Math.round(dollars * 100);
const money = dollars202;
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error("Некорректное число");
  return value;
}
export interface Loan202 { id:string; name:string; balance:number; payment:number; bank:boolean; child?:boolean }
export interface Stock202 { id:string; symbol:Symbol202; quantity:number; cost:number }
export interface Option202 extends Stock202 { side:"call"|"put"; strikeTotal:number; expires:number }
export interface Player202 {
  id:string; starter:number; cash:number; salary:number; basePassive:number; baseExpenses:number; childCost:number; children:number;
  loans:Loan202[]; stocks:Stock202[]; shorts:Stock202[]; options:Option202[];
  d2y:Array<{level:1|2|3;income:number}>; rights:Array<{id:string;cost:number;order:number}>;
  insurance:boolean; permanentCharity:boolean; charityUntil:number; mentorUntil:number; mentorUsed:number;
  turns:number; skip:number; bankrupt:boolean; position:number; laps:number; track:"RAT_RACE"|"FAST_TRACK";
  fastPosition:number; fastIncome:number; initialFastIncome:number; fastCharity:boolean; dream:number;
}
export interface Asset202 {
  id:string; name:string; source:string; kind:"property"|"royalty"|"interest";
  owners:Record<string,number>; cost:number; mortgage:number; down:number; income:number;
  units:number; acres:number; house:boolean; lockedUntil:Record<string,number>;
}
export type TaskKind202 = "roll"|"choose"|"deal"|"quote"|"sale"|"exchange"|"right"|"insurance"|"contamination"|"university"|"charity"|"auction"|"debt"|"escape"|"fast"|"mentor";
export interface Task202 {
  id:string; playerId:string; kind:TaskKind202; slug?:string; rule?:Rule202; assetId?:string;
  symbol?:Symbol202; price?:number; buy?:boolean; sell?:boolean; rightId?:string; holderIds?:string[];
  traded?:string[];
  resume?:Task202; candidates?:string[]; bids?:Record<string,number>; approved?:string[]; from?:number;
  mandatory?:boolean; loanAllowed?:boolean; reason?:string; cell?:number; deck?:Deck202;
}
export interface Offer202 {
  id:string; kind:"asset"|"opportunity"|"right"|"joint"; from:string; to:string; price:number;
  assetId?:string; rightId?:string; taskId?:string; share?:number;
  shares?:Record<string,number>; accepted:string[]; turn:number;
}
export interface TurnContext202 {
  turnKey:string; turnOwnerGamePlayerId:string; turnNumber:number; round:number;
  track:"RAT_RACE"|"FAST_TRACK";
}
export interface Log202 extends Partial<TurnContext202> {
  revision:number; playerId:string|null; text:string; slug?:string;
  kind?:"setup"|"turn_started"|"turn_ended"|"turn_skipped"|"effect"|"command"|"bot";
  commandType?:Command202["type"]; taskKind?:TaskKind202; choice?:string;
  quantity?:number; amountCents?:number; assetId?:string; offerId?:string; recipientGamePlayerId?:string;
  diceValues?:number[];
  dice?:number;
  from?:number;
  to?:number;
  cell?:{index:number;type:string;label:string};
  effectType?:"card_opened"|"dice"|"financial_result"|"paycheck"|"expense";
  beforeCashCents?:number;
  afterCashCents?:number;
  cashChangeCents?:number;
  cashflowChangeCents?:number;
}
export interface State202 {
  version:1; revision:number; serial:number; current:number; round:number; players:Player202[]; assets:Asset202[];
  decks:Record<Deck202,string[]>; queue:Task202[]; after:"market"|"end"; stage:"roll"|"deal"|"market"|"other";
  offers:Offer202[]; world:FastTrackWorld; winner:string|null; shortGame:boolean;
  log:Log202[];
  testControls?: { cards: Record<string, string[]>; dice: Record<string, number[]> };
}
export type Public202 = Omit<State202,"decks"|"testControls">;
export interface InitialPlayer202 { id:string; salary:number; passive:number; expenses:number; savings:number; childCost:number; dream:number; loans:Array<Omit<Loan202,"id">> }
export type Command202 = {
  revision:number; type:"roll"|"choose"|"decide"|"loan"|"repay"|"bankruptcy"|"offer"|"accept"|"reject";
  taskId?:string; choice?:string; quantity?:number; amount?:number; assetId?:string; target?:string;
  offerId?:string; rightId?:string; share?:number; shares?:Record<string,number>;
};
export type Random202 = (maxExclusive:number)=>number;
function shuffle<T>(items:readonly T[], random:Random202):T[] {
  const result=[...items]; for(let i=result.length-1;i>0;i--){ const j=integer(random(i+1),0,i); [result[i],result[j]]=[result[j]!,result[i]!]; } return result;
}
function id(s:State202) { return `202-${++s.serial}`; }
export function turnContext202(s:Pick<State202,"players"|"current"|"round">):TurnContext202 {
  const owner=s.players[s.current]!;
  return {turnKey:`${owner.id}:${owner.turns}`,turnOwnerGamePlayerId:owner.id,turnNumber:owner.turns,round:s.round,track:owner.track};
}
function event(s:State202, p:string|null, text:string, slug?:string, details:Partial<Log202>={}) {
  const started=(s.players[s.current]?.turns??0)>0;
  s.log.push({revision:s.revision,playerId:p,text,kind:started?"effect":"setup",...(started?turnContext202(s):{}),...(slug?{slug}:{}),...details});
  // A single command can complete several skipped turns. Preserve every new
  // event until the API has persisted the revision, even if it exceeds 120 rows.
  if(s.log.length>120) s.log=s.log.slice(Math.min(s.log.length-120,Math.max(0,s.log.findIndex(line=>line.revision===s.revision))));
}
function player(s:State202,p:string) { const found=s.players.find(x=>x.id===p); check(found,"Игрок не найден"); return found; }
function current(s:State202) { return s.players[s.current]!; }
function task(s:State202,p:string,kind:TaskKind202, extra:Partial<Task202>={}) { return {id:id(s),playerId:p,kind,...extra}; }
function owners(a:Asset202) { return Object.keys(a.owners).filter(p=>a.owners[p]!>0); }
function portion(a:Asset202,p:string,amount:number) {
  const shares={...a.owners,"__bank__":10000-Object.values(a.owners).reduce((n,v)=>n+v,0)};
  const rows=Object.entries(shares).filter(([,share])=>share>0).map(([who,share])=>({who,value:Math.floor(amount*share/10000),fraction:amount*share/10000-Math.floor(amount*share/10000)}));
  let remainder=amount-rows.reduce((n,row)=>n+row.value,0);
  for(const row of rows.sort((a,b)=>b.fraction-a.fraction||a.who.localeCompare(b.who)))if(remainder>0){row.value++;remainder--;}
  return rows.find(row=>row.who===p)?.value??0;
}
export { portion as assetPortion202 };
function distribute(s:State202,a:Asset202,amount:number) {
  for(const p of owners(a)) player(s,p).cash+=portion(a,p,amount);
}
function assetsOf(s:State202,p:string) { return s.assets.filter(a=>(a.owners[p]??0)>0); }
function properties(s:State202,p:string) { return assetsOf(s,p).filter(a=>a.kind==="property"); }
function highest(s:State202,p:string) { return properties(s,p).sort((a,b)=>portion(b,p,b.income)-portion(a,p,a.income)||a.id.localeCompare(b.id))[0]; }
export function finances202(s:Pick<State202,"assets">,p:Player202) {
  if(p.track==="FAST_TRACK") return {passive:p.fastIncome,expenses:0,income:p.fastIncome,cashflow:p.fastIncome};
  const assetIncome=s.assets.reduce((n,a)=>n+portion(a,p.id,a.income),0);
  const level1=p.d2y.some(x=>x.level===1), level2=p.d2y.some(x=>x.level===2);
  const network=p.d2y.reduce((n,a)=>n+(level1&&(a.level===2||a.level===3&&level2)?a.income:0),0);
  const passive=p.basePassive+assetIncome+network;
  const expenses=p.baseExpenses+p.childCost*p.children+p.loans.reduce((n,l)=>n+l.payment,0)+(p.insurance?money(200):0);
  return {passive,expenses,income:p.salary+passive,cashflow:p.salary+passive-expenses};
}
export function canEscape202(s:Pick<State202,"assets">,p:Player202) { const f=finances202(s,p); return p.track==="RAT_RACE"&&f.passive>=2*f.expenses&&!p.loans.some(l=>l.bank&&l.balance>0)&&p.cash>=0; }
function financialSnapshot(s:State202) {
  return s.players.map(p=>({id:p.id,cash:p.cash,cashflow:finances202(s,p).cashflow}));
}
function financialResults(s:State202,before:ReturnType<typeof financialSnapshot>,slug?:string) {
  for(const previous of before) {
    const p=player(s,previous.id);
    const cashChangeCents=p.cash-previous.cash,cashflowChangeCents=finances202(s,p).cashflow-previous.cashflow;
    if(cashChangeCents||cashflowChangeCents)event(s,p.id,"Финансовый результат",slug,{
      effectType:"financial_result",beforeCashCents:previous.cash,afterCashCents:p.cash,cashChangeCents,cashflowChangeCents
    });
  }
}
/** Capture each automatic cash movement before a later card or turn changes the balance again. */
function cashEvent(s:State202,p:Player202,beforeCashCents:number,text:string,effectType:"paycheck"|"expense") {
  event(s,p.id,text,undefined,{effectType,beforeCashCents,afterCashCents:p.cash,cashChangeCents:p.cash-beforeCashCents});
}
function createProperty(s:State202,p:string,r:Property202,source:string) {
  const a:Asset202={id:id(s),name:r.acres?`Земля, ${r.acres} акров`:r.house?"Дом 2/1":`Дом на ${r.units} квартир`,source,kind:"property",owners:{[p]:10000},cost:money(r.cost),mortgage:money(r.mortgage),down:money(r.down),income:money(r.income),units:r.units,acres:r.acres,house:r.house,lockedUntil:{}};
  s.assets.push(a);return a;
}
export function newGame202(inputs:InitialPlayer202[],random:Random202,shortGame=false):State202 {
  check(inputs.length>=2&&inputs.length<=12&&new Set(inputs.map(p=>p.id)).size===inputs.length,"Нужно от 2 до 12 разных игроков");
  const order=shuffle(starters202.map((_,i)=>i),random);
  const s:State202={version:1,revision:0,serial:0,current:0,round:1,players:[],assets:[],decks:{capital:[],cashflow:[],market:[],doodad:[]},queue:[],after:"end",stage:"roll",offers:[],world:readFastTrackWorld({}),winner:null,shortGame,log:[]};
  for(const [i,input] of inputs.entries()) {
    const starter=order[i]!, bundle=starters202[starter]!;
    const p:Player202={id:input.id,starter:starter+1,cash:money(input.savings+bundle.cash),salary:money(input.salary),basePassive:money(input.passive),baseExpenses:money(input.expenses),childCost:money(input.childCost),children:0,
      loans:input.loans.map(l=>({...l,id:id(s),balance:money(l.balance),payment:money(l.payment)})),stocks:bundle.stocks.map(([symbol,quantity,price])=>({id:id(s),symbol,quantity,cost:money(quantity*price)})),shorts:[],options:[],d2y:[],rights:[],insurance:false,permanentCharity:false,charityUntil:0,mentorUntil:0,mentorUsed:0,turns:0,skip:0,bankrupt:false,position:-1,laps:0,track:"RAT_RACE",fastPosition:-1,fastIncome:0,initialFastIncome:0,fastCharity:false,dream:input.dream};
    s.players.push(p); if(bundle.property)createProperty(s,p.id,bundle.property,"starter");
    p.cash+=finances202(s,p).cashflow;
    event(s,p.id,`Получен стартовый портфель № ${p.starter}`);
  }
  beginTurn(s);return s;
}
function beginTurn(s:State202) {
  // A skipped turn still counts for the holder's option expiry.
  for(let i=0;i<s.players.length*4;i++) {
    const p=current(s); p.turns++;
    event(s,p.id,"Начало хода",undefined,{kind:"turn_started"});
    const expired=p.options.filter(o=>o.expires<p.turns);
    if(expired.length)event(s,p.id,`Истёк срок ${expired.length} опционов`);
    p.options=p.options.filter(o=>o.expires>=p.turns);
    if(!p.skip){s.stage="roll";s.after="end";s.queue=[task(s,p.id,"roll")];return;}
    p.skip--;event(s,p.id,"Пропущен ход",undefined,{kind:"turn_skipped"});
    event(s,p.id,"Ход завершён",undefined,{kind:"turn_ended"});
    s.current=(s.current+1)%s.players.length;if(s.current===0)s.round++;
  }
  throw new Error("Не удалось начать ход");
}
function finishTurn(s:State202) {
  event(s,current(s).id,"Ход завершён",undefined,{kind:"turn_ended"});
  s.offers=[];s.current=(s.current+1)%s.players.length;if(s.current===0)s.round++;beginTurn(s);
}
function draw(s:State202,deck:Deck202,random:Random202) {
  if(!s.decks[deck].length)s.decks[deck]=shuffle(decks202[deck],random).slice(0,deck==="market"?25:undefined);
  const scheduled=s.testControls?.cards[current(s).id];
  const next=scheduled?.findIndex(slug=>decks202[deck].includes(slug))??-1;
  if(scheduled&&next>=0) {
    const slug=scheduled.splice(next,1)[0]!;
    s.decks[deck]=s.decks[deck].filter(item=>item!==slug);
    return slug;
  }
  return s.decks[deck].shift()!;
}
function nextNeighbor(s:State202,p:string) {
  const index=s.players.findIndex(x=>x.id===p);
  return Array.from({length:s.players.length-1},(_,i)=>s.players[(index+i+1)%s.players.length]!).filter(x=>x.track==="RAT_RACE");
}
function spend(p:Player202,amount:number) { integer(amount,0);check(p.cash>=amount,"Недостаточно наличных");p.cash-=amount; }
function debt(s:State202,p:Player202,loanAllowed:boolean,reason:string,expenseCard=false) {
  if(p.cash<0&&!s.queue.some(t=>t.kind==="debt"&&t.playerId===p.id))s.queue.push(task(s,p.id,"debt",{loanAllowed:loanAllowed&&(!p.bankrupt||expenseCard),reason}));
}
function removeAsset(s:State202,a:Asset202) { s.assets=s.assets.filter(x=>x.id!==a.id);s.offers=s.offers.filter(o=>o.assetId!==a.id); }
function bankLoan(s:State202,p:Player202,amount:number) {
  p.cash+=amount;p.loans.push({id:id(s),name:"Банковский кредит",balance:amount,payment:Math.round(amount/10),bank:true});
}
function advance(s:State202,random:Random202) {
  s.queue=s.queue.filter(t=>t.kind!=="debt"||player(s,t.playerId).cash<0);
  if(s.winner){event(s,current(s).id,"Ход завершён",undefined,{kind:"turn_ended"});s.queue=[];s.offers=[];return;}
  if(s.queue.length)return;
  if(s.after==="market"&&current(s).track==="RAT_RACE") {
    s.after="end";
    if(canEscape202(s,current(s))) { s.queue.push(task(s,current(s).id,"escape",{reason:"После сделки"}));return; }
    s.stage="market";reveal(s,draw(s,"market",random),current(s).id,random);
    if(s.queue.length)return;
  }
  finishTurn(s);
}
function quoteEvent(s:State202,slug:string,r:Extract<Rule202,{kind:"quote"}>,owner:string) {
  for(const symbol of r.symbols) {
    for(const p of s.players.filter(p=>p.track==="RAT_RACE")) {
      if(r.split){
        if([...p.stocks,...p.shorts,...p.options].some(a=>a.symbol===symbol))event(s,p.id,`Количество акций и позиций ${symbol} удвоено`,slug);
        for(const a of [...p.stocks,...p.shorts,...p.options].filter(a=>a.symbol===symbol))a.quantity*=2;
        // Aggregate entry proceeds, premium and strike obligation stay constant.
      }
      const price=money(r.bankrupt?0:r.price);
      for(const short of p.shorts.filter(a=>a.symbol===symbol)) {
        const gain=short.cost-price*short.quantity;p.cash+=gain;
        event(s,p.id,`Закрыта короткая продажа ${symbol}: ${gain/100}`,slug);
      }
      p.shorts=p.shorts.filter(a=>a.symbol!==symbol);
      if(r.bankrupt){
        if([...p.stocks,...p.options,...p.shorts].some(a=>a.symbol===symbol))event(s,p.id,`Банкротство ${symbol}: прежние акции списаны, опционы и короткие позиции рассчитаны`,slug);
        p.stocks=p.stocks.filter(a=>a.symbol!==symbol);
        for(const option of p.options.filter(o=>o.symbol===symbol&&o.side==="put"))p.cash+=option.strikeTotal;
        p.options=p.options.filter(o=>o.symbol!==symbol);
      }
      if(r.forced&&p.id===owner){
        for(const stock of p.stocks.filter(a=>a.symbol===symbol))p.cash+=money(r.price)*stock.quantity;
        p.stocks=p.stocks.filter(a=>a.symbol!==symbol);
      }
      const hasOptions=p.options.some(o=>o.symbol===symbol);
      const ordinary=r.buy==="all"||r.buy==="owner"&&p.id===owner||r.buy==="neighbor"&&p.id===nextNeighbor(s,owner)[0]?.id;
      const buy=r.price>0&&(ordinary||hasOptions&&!(r.buy==="neighbor"&&p.id===owner));
      const sell=r.sell==="all"||ordinary||hasOptions;
      if(buy||sell&&p.stocks.some(a=>a.symbol===symbol)||hasOptions)s.queue.push(task(s,p.id,"quote",{slug,symbol,price:money(r.price),buy,sell}));
      debt(s,p,false,"Убыток по короткой продаже: кредит недоступен");
    }
  }
}
function saleMatches(a:Asset202,r:Extract<Rule202,{kind:"sale"}>) {
  return a.kind==="property"&&(r.filter==="house"?a.house:r.filter==="land"?a.acres>=(r.acres??0):r.filter==="plex"?[2,4,8].includes(a.units):r.filter==="large"?a.units>=24:r.filter==="highest"?true:a.units>=2);
}
function saleTask(s:State202,p:string,slug:string,a:Asset202,r:Rule202) {
  if(owners(a).some(owner=>(a.lockedUntil[owner]??0)>player(s,owner).laps))return;
  s.queue.push(task(s,p,r.kind==="exchange"?"exchange":"sale",{slug,assetId:a.id,rule:r,approved:[]}));
}
function propertyOpportunity(s:State202,slug:string,p:string,r:Rule202) {
  let resume=task(s,p,"deal",{slug,rule:r});
  const rights=s.players.filter(p=>p.track==="RAT_RACE").flatMap(p=>p.rights.map(right=>({p,right}))).sort((a,b)=>a.right.order-b.right.order);
  // Every right is consumed by the first subsequent property opportunity, whether accepted or passed.
  for(const holder of [...rights].reverse()) resume=task(s,holder.p.id,"right",{slug,rule:r,rightId:holder.right.id,resume});
  s.queue.push(resume);
}
function reveal(s:State202,slug:string,owner:string,random:Random202,bypassMentor=false,alreadyOpened=false) {
  const r=rules202[slug];check(r,"Правило карточки не найдено");const p=player(s,owner);
  if(!alreadyOpened)event(s,p.id,"Открыта карточка",slug,{effectType:"card_opened"});
  const propertyWithRights=["property","market_property","exchange"].includes(r.kind)&&s.players.some(holder=>holder.track==="RAT_RACE"&&holder.rights.length>0);
  if(!bypassMentor&&p.id===current(s).id&&p.mentorUntil>=p.turns&&p.mentorUsed!==p.turns&&!propertyWithRights) {
    s.queue.push(task(s,p.id,"mentor",{slug,rule:r}));return;
  }
  const before=financialSnapshot(s);
  const lastEffect=s.log.at(-1);
  switch(r.kind){
    case "quote":quoteEvent(s,slug,r,owner);break;
    case "property":case "market_property":case "exchange":propertyOpportunity(s,slug,owner,r);break;
    case "right":case "option":case "d2y":case "investment":s.queue.push(task(s,owner,"deal",{slug,rule:r}));break;
    case "expense":{
      if(r.children&&!p.children||r.threshold!==undefined&&finances202(s,p).passive<=money(r.threshold)) {event(s,p.id,"Карточка вас не затронула: условие не выполнено",slug);break;}
      if(r.university){s.queue.push(task(s,p.id,"university",{slug,rule:r}));break;}
      p.cash-=money(r.cash)*(r.perChild?p.children:1);p.baseExpenses+=money(r.monthly);
      if(r.loan)p.loans.push({id:id(s),name:"Кредит по карточке расходов",balance:money(r.loan[0]),payment:money(r.loan[1]),bank:false});
      debt(s,p,true,"Обязательный расход",true);break;
    }
    case "sale":{
      if(r.filter==="highest"){
        const target=[p,...nextNeighbor(s,owner)].find(p=>highest(s,p.id));
        if(target)saleTask(s,target.id,slug,highest(s,target.id)!,r);
      }else for(const a of s.assets.filter(a=>saleMatches(a,r)))saleTask(s,owners(a)[0]!,slug,a,r);
      break;
    }
    case "rent":{
      for(const a of s.assets.filter(a=>a.kind==="property"&&a.units>0)) {
        a.income+=money(r.amount)*a.units;
        if(r.amount<0&&a.income<0)saleTask(s,owners(a)[0]!,slug,a,r);
      }break;
    }
    case "wedding":if(p.children){p.children--;p.cash-=money(r.cost);const childLoan=p.loans.find(l=>l.child);if(childLoan)childLoan.payment=0;debt(s,p,true,"Свадьба ребёнка");event(s,p.id,"Один ребёнок покинул семью",slug);}else event(s,p.id,"Карточка вас не затронула: детей нет",slug);break;
    case "auction":s.queue.push(task(s,owner,"auction",{slug,candidates:[p,...nextNeighbor(s,owner)].map(p=>p.id),bids:{}}));break;
    case "airport":{const a=highest(s,owner);if(a){distribute(s,a,a.down);event(s,p.id,`Объект «${a.name}» изъят, первоначальный взнос возвращён владельцам`,slug);removeAsset(s,a);}else event(s,p.id,"Карточка вас не затронула: недвижимости нет",slug);break;}
    case "disaster":{const a=highest(s,owner);if(a){a.income=0;for(const ownerId of owners(a)){const o=player(s,ownerId);a.lockedUntil[ownerId]=o.laps+1;if(o.insurance)o.cash+=portion(a,o.id,a.down);event(s,o.id,`Объект «${a.name}»: поток обнулён, продажа запрещена до следующего круга`,slug);}}else event(s,p.id,"Карточка вас не затронула: недвижимости нет",slug);break;}
    case "insurance":if(!p.insurance)s.queue.push(task(s,owner,"insurance",{slug}));else event(s,p.id,"Страховка уже оформлена",slug);break;
    case "contamination":{const target=[...nextNeighbor(s,owner),p].find(p=>highest(s,p.id));if(target){const a=highest(s,target.id)!;if(!target.insurance)s.queue.push(task(s,target.id,"contamination",{slug,assetId:a.id}));}break;}
    case "mentor":p.mentorUntil=p.turns+3;event(s,p.id,"Получена помощь наставника на три следующих своих хода",slug);break;
  }
  financialResults(s,before,slug);
  if(!s.queue.length&&s.log.at(-1)===lastEffect)event(s,p.id,"Карточка не потребовала действий и не изменила финансы участников",slug);
}
function enterFast(s:State202,p:Player202) {
  check(canEscape202(s,p),"Для выхода нужен пассивный доход не меньше двойных расходов и погашенные банковские кредиты");
  if(s.shortGame){s.winner=p.id;event(s,p.id,"Победа: выход на большой круг");return;}
  p.fastIncome=finances202(s,p).passive*100;p.initialFastIncome=p.fastIncome;p.cash+=p.fastIncome;
  for(const a of assetsOf(s,p.id)){delete a.owners[p.id];if(!owners(a).length)removeAsset(s,a);}
  p.options=[];p.shorts=[];p.stocks=[];p.rights=[];p.loans=[];p.d2y=[];p.insurance=false;p.track="FAST_TRACK";p.fastPosition=-1;p.skip=0;
  event(s,p.id,"Выход на большой круг");
}
export function fastPrice202(s:Pick<State202,"world">,p:Player202,index:number) {
  const cell=fastTrackCells[index];check(cell,"Клетка не найдена");
  const influence=index===p.dream?1+(s.world.influence[index]??[]).filter(id=>id!==p.id).length:1;
  const purchases=cell.rule.kind==="dream"?(s.world.dreamPurchases[index]?.length??0):(s.world.purchaseCounts?.[index]??0);
  return money(cell.cost)*influence*(purchases+1);
}
function win(s:State202,p:Player202) {
  if(p.track!=="FAST_TRACK")return;
  const dreams=Object.entries(s.world.dreamPurchases).filter(([,ids])=>ids.includes(p.id)).map(([index])=>Number(index));
  if(p.fastIncome-p.initialFastIncome>=money(50000)&&(dreams.includes(p.dream)||dreams.filter(i=>i!==p.dream).length>=2)) {
    s.winner=p.id;event(s,p.id,"Победа: доход вырос на 50 000 и мечты исполнены");
  }
}
function fastBuy(s:State202,p:Player202,index:number,random:Random202) {
  const cell=fastTrackCells[index]!;const kind=cell.rule.kind;
  check(["business","chance_business","ipo","dream","charity"].includes(kind),"На клетке нет покупки");
  const previous=s.world.owners[index];
  check(previous!==p.id&&!(kind==="ipo"&&previous)&&!(kind==="charity"&&p.fastCharity),"Покупка уже совершена");
  const cost=fastPrice202(s,p,index);spend(p,cost);
  let success=true;
  if((cell.rule.kind==="chance_business"&&!previous)||cell.rule.kind==="ipo") {
    const die=random(6)+1;success=die>=cell.rule.minimum;event(s,p.id,`Проверка инвестиции: ${die}`);
  }
  if(success&&["business","chance_business","ipo"].includes(kind)){
    s.world.owners[index]=p.id;
    if(cell.rule.kind==="ipo")p.cash+=money(cell.rule.payout);
    else{
      p.fastIncome+=money(cell.income);s.world.purchaseCounts??={};s.world.purchaseCounts[index]=(s.world.purchaseCounts[index]??0)+1;
      if(previous){const seller=player(s,previous);seller.cash+=cost;seller.fastIncome-=money(cell.income);}
    }
  }
  if(kind==="dream")s.world.dreamPurchases[index]=[...(s.world.dreamPurchases[index]??[]),p.id];
  if(kind==="charity")p.fastCharity=true;win(s,p);
}
function roll(s:State202,p:Player202,count:number,random:Random202) {
  const charity=p.permanentCharity||p.charityUntil>=p.turns;
  check(p.track==="FAST_TRACK"?(p.fastCharity?count>=1&&count<=3:count===2):(charity?count>=1&&count<=3:count===1),"Недопустимое число кубиков");
  const forced=s.testControls?.dice[p.id];
  if(forced?.length)check(forced.length===count,"В песочнице задано другое количество кубиков. Измените бросок или настройку сценария");
  const dice=forced?.length?forced.map(value=>integer(value,1,6)):Array.from({length:count},()=>integer(random(6),0,5)+1), steps=dice.reduce((n,d)=>n+d,0);
  if(s.testControls)delete s.testControls.dice[p.id];
  const from=p.track==="FAST_TRACK"?p.fastPosition:p.position;
  const route=p.track==="FAST_TRACK"?fastTrackRoute(from,steps):null;
  const destination=route?route.at(-1)!:ratRaceBoard[(from+steps)%ratRaceBoard.length]!;
  event(s,p.id,`Кубики: ${dice.join(" + ")}`,undefined,{
    effectType:"dice",diceValues:dice,dice:steps,from,to:destination.index,
    cell:{index:destination.index,type:destination.type,label:destination.label}
  });
  if(p.track==="FAST_TRACK") {
    const cell=route!.at(-1)!;p.fastPosition=cell.index;
    for(const crossed of route!)if(crossed.rule.kind==="cashflow") {
      const before=p.cash;p.cash+=p.fastIncome;cashEvent(s,p,before,"День денежного потока","paycheck");
    }
    if(cell.rule.kind==="dream"&&s.players.some(o=>o.id!==p.id&&o.dream===cell.index)) {
      s.world.influence[cell.index]??=[];if(!s.world.influence[cell.index]!.includes(p.id))s.world.influence[cell.index]!.push(p.id);
    }
    if(cell.rule.kind==="half_cash") {
      const before=p.cash;p.cash-=Math.floor(p.cash/2);cashEvent(s,p,before,cell.label,"expense");
    }
    else if(cell.rule.kind==="lose_cash") {
      const before=p.cash;p.cash=0;cashEvent(s,p,before,cell.label,"expense");
    }
    else if(["business","chance_business","ipo","dream","charity"].includes(cell.rule.kind)&&s.world.owners[cell.index]!==p.id&&!(cell.rule.kind==="ipo"&&s.world.owners[cell.index])&&!(cell.rule.kind==="charity"&&p.fastCharity))s.queue.push(task(s,p.id,"fast",{cell:cell.index}));
    return;
  }
  for(let i=0;i<steps;i++) {
    p.position=(p.position+1)%ratRaceBoard.length;if(p.position===0)p.laps++;
    if(ratRaceBoard[p.position]!.type==="paycheck") {
      const before=p.cash;p.cash+=finances202(s,p).cashflow;cashEvent(s,p,before,"День зарплаты","paycheck");
    }
  }
  const cell=ratRaceBoard[p.position]!;
  s.stage="other";s.after="end";
  if(cell.type==="deal"||cell.type==="market") {s.stage="deal";s.after="market";s.queue.push(task(s,p.id,"choose"));}
  else if(cell.type==="doodad")reveal(s,draw(s,"doodad",random),p.id,random);
  else if(cell.type==="charity")s.queue.push(task(s,p.id,"charity"));
  else if(cell.type==="baby"&&p.children<3)p.children++;
  else if(cell.type==="downsized") {
    const before=p.cash;p.cash-=finances202(s,p).expenses;p.skip=2;debt(s,p,true,"Увольнение");
    cashEvent(s,p,before,"Увольнение","expense");
  }
  debt(s,p,true,"Обязательные платежи");
}
function buyDeal(s:State202,p:Player202,t:Task202,quantity:number) {
  const r=t.rule!;let asset:Asset202|undefined;
  if(r.kind==="option") {
    check(quantity%100===0&&quantity<=5000,"Опционы покупаются по 100, максимум 5000");spend(p,money(r.premium)*quantity);
    p.options.push({id:id(s),symbol:r.symbol,quantity,cost:money(r.premium)*quantity,strikeTotal:money(r.strike)*quantity,side:r.side,expires:p.turns+3});
  } else if(r.kind==="property"||r.kind==="market_property") {
    const property=r.kind==="property"?r:r.property;
    if(r.kind==="market_property"&&r.repair)check(!p.bankrupt,"После банкротства нельзя брать кредит на инвестиции");
    spend(p,money(property.fee??property.down));asset=createProperty(s,p.id,property,t.slug!);
    if(r.kind==="market_property"&&r.repair){bankLoan(s,p,money(r.repair));p.cash-=money(r.repair);}
  } else if(r.kind==="right") {spend(p,money(r.cost));p.rights.push({id:id(s),cost:money(r.cost),order:s.serial});}
  else if(r.kind==="d2y") {
    check(r.level===2||!p.d2y.some(x=>x.level===r.level),"Этот уровень D2Y уже есть");
    if(r.level===1)spend(p,money(200));p.d2y.push({level:r.level,income:money(r.income)});
  } else if(r.kind==="investment") {
    check(r.repeat||quantity===1,"Покупается один актив");spend(p,money(r.cost)*quantity);
    asset={id:id(s),name:r.royalty?"Авторские отчисления":"Процентный доход",source:t.slug!,kind:r.royalty?"royalty":"interest",owners:{[p.id]:10000},cost:money(r.cost)*quantity,down:money(r.cost)*quantity,mortgage:0,income:money(r.income)*quantity,units:0,acres:0,house:false,lockedUntil:{}};s.assets.push(asset);
  } else throw new Error("Эту карточку нельзя купить");
  event(s,p.id,"Приобретён актив",t.slug);return asset;
}
function settleSale(s:State202,t:Task202) {
  const a=s.assets.find(a=>a.id===t.assetId);if(!a)return;
  const r=t.rule!;
  if(r.kind==="exchange") {
    const n=createProperty(s,owners(a)[0]!,r.property,t.slug!);n.owners={...a.owners};removeAsset(s,a);return;
  }
  if(r.kind==="rent") {distribute(s,a,Math.floor(a.down/2));removeAsset(s,a);return;}
  check(r.kind==="sale","Неизвестная продажа");
  const price=r.filter==="highest"?Math.round(a.cost*r.price):r.filter==="house"||r.filter==="land"?money(r.price):money(r.price)*a.units;
  distribute(s,a,price-a.mortgage);
  if(r.filter==="land"&&a.acres>r.acres!) {
    const sold=r.acres!,remaining=a.acres-sold;a.cost-=Math.round(a.cost*sold/a.acres);a.acres=remaining;a.name=`Земля, ${remaining} акров`;a.mortgage=0;a.income=0;a.down=a.cost;
  }else removeAsset(s,a);
  for(const owner of owners(a))debt(s,player(s,owner),false,"Продажа не покрыла ипотеку");
}
function bankruptcy(s:State202,p:Player202) {
  check(p.track==="RAT_RACE","Банкротство действует на малом круге");
  for(const a of properties(s,p.id)) {
    p.cash+=portion(a,p.id,Math.floor(a.down/2));delete a.owners[p.id];if(!owners(a).length)removeAsset(s,a);
  }
  for(const stock of p.stocks)p.cash+=Math.floor(stock.cost/2);
  for(const option of p.options)p.cash+=Math.floor(option.cost/2);
  // Short obligations are already settled at the quote that caused the debt. Open positions survive voluntary filing.
  p.stocks=[];p.options=[];
  const bankDebt=p.loans.filter(l=>l.bank).reduce((n,l)=>n+l.balance,0);p.cash=Math.max(0,p.cash-bankDebt);p.loans=p.loans.filter(l=>!l.bank);
  p.bankrupt=true;p.skip=3;s.offers=s.offers.filter(o=>o.from!==p.id&&o.to!==p.id);
  s.queue=s.queue.filter(t=>t.playerId!==p.id||t.kind==="roll");event(s,p.id,"Банкротство: активы реализованы, банковские кредиты погашены или списаны, пропуск трёх ходов");
  if(current(s).id===p.id){s.queue=[];s.after="end";}
}
function quoteDecision(s:State202,p:Player202,t:Task202,c:Command202) {
  const symbol=t.symbol!, price=t.price!;
  if(c.choice==="buy"||c.choice==="short"){
    check(!t.traded?.includes(c.choice),"Эта операция уже выполнена на данной котировке");
    check(t.buy&&p.cash>=0,"Покупка по этой котировке недоступна");const q=integer(c.quantity,1,1000000);
    if(c.choice==="short") {check(q%100===0&&q<=5000,"Короткая продажа: от 100 до 5000, кратно 100");p.shorts.push({id:id(s),symbol,quantity:q,cost:q*price});}
    else {spend(p,q*price);p.stocks.push({id:id(s),symbol,quantity:q,cost:q*price});}
    t.traded??=[];t.traded.push(c.choice);
    return false;
  }
  if(c.choice==="sell") {
    check(t.sell,"Продажа на этой карточке недоступна");let q=integer(c.quantity,1);
    check(p.stocks.filter(a=>a.symbol===symbol).reduce((n,a)=>n+a.quantity,0)>=q,"Недостаточно акций");
    p.cash+=q*price;
    for(const stock of p.stocks.filter(a=>a.symbol===symbol)) {const used=Math.min(stock.quantity,q);stock.cost-=Math.round(stock.cost*used/stock.quantity);stock.quantity-=used;q-=used;if(!q)break;}
    p.stocks=p.stocks.filter(a=>a.quantity>0);return false;
  }
  if(c.choice==="exercise") {
    const option=p.options.find(o=>o.id===c.assetId&&o.symbol===symbol);check(option,"Опцион не найден");
    const gain=option.side==="call"?price*option.quantity-option.strikeTotal:option.strikeTotal-price*option.quantity;
    check(gain>0,"Исполнение не приносит прибыли");p.cash+=gain;p.options=p.options.filter(o=>o!==option);return false;
  }
  check(c.choice==="pass","Выберите действие с котировкой");return true;
}
function dealCost(r:Rule202) { return r.kind==="property"?money(r.fee??r.down):r.kind==="market_property"?money(r.property.fee??r.property.down):r.kind==="investment"?money(r.cost):0; }
function makeOffer(s:State202,p:Player202,c:Command202) {
  check(p.track==="RAT_RACE"&&p.cash>=0||p.cash<0&&c.choice==="asset","Предложение недоступно");
  check(s.offers.length<20,"Сначала завершите существующие предложения");
  const to=player(s,String(c.target));check(to.id!==p.id&&to.track==="RAT_RACE","Выберите другого игрока малого круга");
  const price=integer(c.amount??0,0,money(100000000));
  const offer:Offer202={id:id(s),kind:"asset",from:p.id,to:to.id,price,accepted:[p.id],turn:s.round};
  if(c.choice==="asset"){
    const a=s.assets.find(a=>a.id===c.assetId);check(a&&(a.kind==="property"||a.kind==="royalty"),"Можно передавать недвижимость и авторские отчисления");
    const share=integer(c.share??a.owners[p.id],1,a.owners[p.id]??0);
    check((a.lockedUntil[p.id]??0)<=p.laps,"Продажа временно запрещена");check(price>0,"Цена должна превышать принимаемую ипотеку; укажите положительную доплату продавцу");
    Object.assign(offer,{assetId:a.id,share});
  }else if(c.choice==="right"){
    check(p.rights.some(r=>r.id===c.rightId),"Опцион недвижимости не найден");Object.assign(offer,{kind:"right",rightId:c.rightId});
  }else{
    const t=s.queue[0];check(t&&t.playerId===p.id&&t.kind==="deal"&&t.id===c.taskId,"Возможность уже недоступна");
    check(t.rule?.kind==="property"||t.rule?.kind==="market_property"||t.rule?.kind==="investment"&&t.rule.royalty||t.rule?.kind==="exchange","Эту возможность нельзя передавать");
    offer.taskId=t.id;
    if(c.choice==="joint"){
      check(t.rule.kind!=="exchange","Обмен требует согласия собственников существующего объекта");
      const shares=c.shares;check(shares&&typeof shares==="object"&&!Array.isArray(shares),"Укажите доли участников");
      check(Object.keys(shares).length>=2&&Object.keys(shares).length<=s.players.length,"Нужны доли как минимум двух игроков");
      for(const [who,share] of Object.entries(shares)){check(player(s,who).track==="RAT_RACE","Участник вышел на большой круг");integer(share,1,10000);}
      check(Object.values(shares).reduce((a,b)=>a+b,0)===10000&&shares[p.id]&&shares[to.id],"Сумма долей должна равняться 100%");
      Object.assign(offer,{kind:"joint",shares:{...shares},price:dealCost(t.rule)});
    } else {check(c.choice==="opportunity","Неизвестный вид предложения");offer.kind="opportunity";}
  }
  s.offers.push(offer);event(s,p.id,"Сделано предложение другому игроку");
}
function acceptOffer(s:State202,p:Player202,o:Offer202) {
  check(o.kind==="joint"?o.shares?.[p.id]:o.to===p.id,"Предложение адресовано другому игроку");
  check(!o.accepted.includes(p.id),"Ответ уже принят");
  const from=player(s,o.from);
  if(o.kind==="joint"){
    o.accepted.push(p.id);if(!Object.keys(o.shares!).every(id=>o.accepted.includes(id)))return;
    const t=s.queue[0];check(t&&t.id===o.taskId,"Возможность уже закрыта");
    const contributions=Object.fromEntries(Object.entries(o.shares!).map(([id,share])=>[id,Math.round(o.price*share/10000)]));
    // Assign the cent remainder to the proposer; the purchase is never over/underfunded.
    contributions[from.id]!+=o.price-Object.values(contributions).reduce((n,v)=>n+v,0);
    for(const [who,cost] of Object.entries(contributions))check(player(s,who).cash>=cost,"У участника недостаточно средств: предложение не исполнено");
    for(const [who,cost] of Object.entries(contributions))if(who!==from.id){spend(player(s,who),cost);from.cash+=cost;}
    const a=buyDeal(s,from,t,1);check(a,"Совместная покупка не создаёт актив");a.owners={...o.shares!};s.queue.shift();
  }else if(o.kind==="asset"){
    const a=s.assets.find(a=>a.id===o.assetId);check(a&&(a.owners[from.id]??0)>=o.share!,"Доля уже недоступна");
    check((a.lockedUntil[from.id]??0)<=from.laps,"Продажа временно запрещена");spend(p,o.price);from.cash+=o.price;
    a.owners[from.id]!-=o.share!;a.owners[p.id]=(a.owners[p.id]??0)+o.share!;
  }else if(o.kind==="right"){
    const right=from.rights.find(r=>r.id===o.rightId);check(right,"Опцион уже истёк");spend(p,o.price);from.cash+=o.price;from.rights=from.rights.filter(r=>r!==right);p.rights.push(right);
    const pending=s.queue[0];if(pending?.kind==="right"&&pending.rightId===right.id)pending.playerId=p.id;
  }else {
    const t=s.queue[0];check(t&&t.id===o.taskId&&t.playerId===from.id,"Возможность уже закрыта");spend(p,o.price);from.cash+=o.price;t.playerId=p.id;
  }
  s.offers=s.offers.filter(other=>other.id!==o.id&&!(o.taskId&&other.taskId===o.taskId));event(s,p.id,"Предложение принято");
}
function decide(s:State202,p:Player202,t:Task202,c:Command202,random:Random202) {
  const yes=c.choice==="buy"||c.choice==="yes", pass=c.choice==="pass"||c.choice==="no";
  switch(t.kind){
    case "roll":
      if(c.choice==="escape"){enterFast(s,p);s.queue.shift();s.after="end";return;}
      throw new Error("Бросьте кубики");
    case "choose":throw new Error("Выберите колоду");
    case "quote":if(quoteDecision(s,p,t,c))s.queue.shift();return;
    case "deal":{
      if(pass){
        s.queue.shift();
        if(t.rule?.kind==="market_property"&&!t.from){const neighbor=nextNeighbor(s,p.id)[0];if(neighbor)s.queue.unshift({...t,id:id(s),playerId:neighbor.id,from:1});}
      }else if(yes){
        if(t.rule?.kind==="exchange") {
          const r=t.rule,a=s.assets.find(a=>a.id===c.assetId&&(a.owners[p.id]??0)>0&&a.kind==="property"&&a.units===r.units&&(r.units!==1||a.house));
          check(a,"Выберите подходящий объект для обмена");s.queue.shift();saleTask(s,p.id,t.slug!,a,r);
        }else {buyDeal(s,p,t,integer(c.quantity??1,1,100000));s.queue.shift();}
      }else throw new Error("Купите или пропустите возможность");break;
    }
    case "right":{
      check(yes||pass,"Используйте или пропустите опцион");
      p.rights=p.rights.filter(r=>r.id!==t.rightId);s.queue.shift();
      if(yes){
        let original=t.resume!;
        while(original.kind==="right") {player(s,original.playerId).rights=player(s,original.playerId).rights.filter(r=>r.id!==original.rightId);original=original.resume!;}
        s.queue.unshift({...original,id:id(s),playerId:p.id});
        const drawer=player(s,original.playerId);
        if(drawer.id!==p.id&&drawer.mentorUntil>=drawer.turns&&drawer.mentorUsed!==drawer.turns) s.queue.push(task(s,drawer.id,"mentor",{slug:original.slug!,rule:original.rule!,mandatory:true}));
      }else {
        const resume=t.resume!,drawer=player(s,resume.playerId);
        s.queue.unshift(resume.kind==="deal"&&drawer.mentorUntil>=drawer.turns&&drawer.mentorUsed!==drawer.turns?task(s,drawer.id,"mentor",{slug:resume.slug!,rule:resume.rule!}):resume);
      }break;
    }
    case "sale":case "exchange":{
      check(yes||pass,"Примите или отклоните предложение");
      const a=s.assets.find(a=>a.id===t.assetId);if(!a){s.queue.shift();break;}
      if(pass){s.queue.shift();break;}
      t.approved??=[];t.approved.push(p.id);const next=owners(a).find(owner=>!t.approved!.includes(owner));
      if(next)t.playerId=next;else{s.queue.shift();settleSale(s,t);}break;
    }
    case "insurance":check(yes||pass,"Выберите ответ");if(yes)p.insurance=true;s.queue.shift();break;
    case "contamination":{
      check(yes||pass,"Оплатите очистку или откажитесь от объекта");const a=s.assets.find(a=>a.id===t.assetId);
      if(a){if(yes)spend(p,money(50000));else removeAsset(s,a);}s.queue.shift();break;
    }
    case "university":{
      check(c.choice==="cash"||c.choice==="credit","Выберите способ оплаты");
      if(c.choice==="cash")spend(p,money(50000));else p.loans.push({id:id(s),name:"Образовательный кредит",balance:money(50000),payment:money(1000),bank:false,child:true});s.queue.shift();break;
    }
    case "charity":check(yes||pass,"Выберите ответ");if(yes){spend(p,Math.max(0,Math.round(finances202(s,p).income/10)));p.charityUntil=p.turns+3;}s.queue.shift();break;
    case "auction":{
      check(c.choice==="bid"||pass,"Сделайте ставку или пропустите");check(t.bids?.[p.id]===undefined,"Ставка уже сделана");
      const amount=pass?0:integer(c.amount,1,p.cash);t.bids![p.id]=amount;
      if(t.candidates!.every(id=>t.bids![id]!==undefined)){
        const winner=t.candidates!.filter(id=>player(s,id).cash>=t.bids![id]!).sort((a,b)=>t.bids![b]!-t.bids![a]!)[0];
        if(winner&&t.bids![winner]!>0){const winnerPlayer=player(s,winner);spend(winnerPlayer,t.bids![winner]!);winnerPlayer.permanentCharity=true;player(s,t.playerId).cash+=Math.floor(t.bids![winner]!/10);}
        s.queue.shift();
      }return;
    }
    case "debt":check(p.cash>=0,"Нужно покрыть убыток продажей активов или объявить банкротство");s.queue.shift();break;
    case "escape":
      check(yes||pass,"Выберите ответ");s.queue.shift();
      if(yes){enterFast(s,p);s.after="end";}else {s.stage="market";reveal(s,draw(s,"market",random),p.id,random);}break;
    case "fast":check(yes||pass,"Выберите ответ");if(yes)fastBuy(s,p,t.cell!,random);s.queue.shift();break;
    case "mentor":
      check(c.choice==="redraw"||c.choice==="keep"&&!t.mandatory,"Оставьте карточку или вытяните следующую");s.queue.shift();
      if(c.choice==="redraw"){p.mentorUsed=p.turns;const deck=(Object.keys(decks202) as Deck202[]).find(deck=>t.slug!.startsWith(`set_202_${deck}_`))!;reveal(s,draw(s,deck,random),p.id,random,true);}
      else reveal(s,t.slug!,p.id,random,true,true);break;
  }
  s.offers=s.offers.filter(o=>!o.taskId||s.queue.some(t=>t.id===o.taskId));
}
function commandText202(c:Command202,t:Task202|undefined) {
  if(c.type==="roll")return "Бросок кубиков";
  if(c.type==="choose")return c.choice==="capital"?"Выбран прирост капитала":"Выбран денежный поток";
  if(c.type==="loan")return "Оформлен банковский кредит";
  if(c.type==="repay")return "Погашен долг";
  if(c.type==="bankruptcy")return "Объявлено банкротство";
  if(c.type==="offer")return c.choice==="joint"?"Предложена совместная покупка":c.choice==="opportunity"?"Предложена передача возможности":c.choice==="right"?"Предложена передача опциона недвижимости":"Предложена продажа актива";
  if(c.type==="accept")return "Подтверждены условия предложения";
  if(c.type==="reject")return "Предложение отклонено";
  if(t?.kind==="auction")return c.choice==="bid"?"Сделана закрытая ставка":"Отказ от участия в аукционе";
  if(t?.kind==="quote")return ({buy:"Куплены акции",sell:"Проданы акции",short:"Открыта короткая продажа",exercise:"Исполнен опцион",pass:"Торги завершены"} as Record<string,string>)[c.choice??""]??"Принято решение по котировке";
  if(t?.kind==="mentor")return c.choice==="redraw"?"Выбрана новая карточка наставника":"Сохранена текущая карточка";
  if(t?.kind==="university")return c.choice==="credit"?"Образование оплачено в кредит":"Оплачено образование ребёнка";
  if(c.choice==="escape"||t?.kind==="escape"&&c.choice==="yes")return "Выбран переход на большой круг";
  if(c.choice==="pass"||c.choice==="no")return t?.kind==="escape"?"Игрок остаётся на малом круге":"Отказ от возможности";
  if(t?.kind==="right")return "Использован приоритет на недвижимость";
  if(t?.kind==="sale"||t?.kind==="exchange")return "Подтверждено согласие собственника";
  if(t?.kind==="insurance")return "Оформлена страховка недвижимости";
  if(t?.kind==="charity")return "Принята благотворительность";
  if(t?.kind==="contamination")return "Оплачена очистка участка";
  if(t?.kind==="debt")return "Обязательный платёж покрыт";
  if(t?.kind==="deal") {
    const rule=t.rule,kind=rule?.kind;
    if(kind==="property"||kind==="market_property")return "Куплена недвижимость";
    if(rule?.kind==="option")return `Куплен опцион ${rule.symbol}`;
    if(kind==="right")return "Куплен приоритет на недвижимость";
    if(kind==="d2y")return "Приобретён уровень D2Y";
    if(kind==="exchange")return "Предложен обмен недвижимости";
    if(kind==="investment")return "Приобретена инвестиция";
  }
  if(t?.kind==="fast")return "Куплена возможность большого круга";
  return "Принята инвестиционная возможность";
}

/** A public allowlist: never copy task queues, deck contents or sealed bid amounts into history. */
function commandLog202(before:State202,c:Command202):Partial<Log202> {
  const t=before.queue[0];
  const decision=c.type==="decide"||c.type==="choose"||c.type==="roll";
  const publicAmount=c.type==="loan"||c.type==="repay"||c.type==="offer"&&c.choice!=="joint";
  return {
    ...turnContext202(before),kind:"command",commandType:c.type,
    ...(decision&&t?{taskKind:t.kind}:{}),
    ...(decision&&t?.slug?{slug:t.slug}:{}),
    ...((decision||c.type==="offer")&&c.choice?{choice:c.choice}:{}),
    ...(c.quantity!==undefined?{quantity:c.quantity}:{}),
    ...(publicAmount&&c.amount!==undefined?{amountCents:c.amount}:{}),
    ...(c.assetId?{assetId:c.assetId}:{}),
    ...(c.offerId?{offerId:c.offerId}:{}),
    ...(c.target?{recipientGamePlayerId:c.target}:{})
  };
}

/** Pure transactional reducer. Failures leave the supplied state untouched. Randomness is server-injected. */
export function command202(input:State202,actor:string,c:Command202,random:Random202):State202 {
  check(input.version===1,"Неизвестная версия состояния 202");check(!input.winner,"Партия завершена");
  integer(c.revision,0);check(c.revision===input.revision,"Состояние изменилось. Обновите партию");
  const s:State202=structuredClone(input);const p=player(s,actor);s.revision++;
  const beforeFinances=financialSnapshot(s);
  if(c.type==="loan") {
    check(p.track==="RAT_RACE","Кредит доступен на малом круге");
    const amount=integer(c.amount,1,money(100000000));check(amount%money(1000)===0,"Кредит кратен 1000");
    const obligation=s.queue.find(t=>t.kind==="debt"&&t.playerId===p.id);
    check(!obligation||obligation.loanAllowed,"Нельзя брать кредит для короткой продажи");
    if(p.bankrupt)check(obligation?.loanAllowed&&p.cash<0&&amount<=Math.ceil(-p.cash/money(1000))*money(1000),"После банкротства кредит доступен только на обязательные расходы");
    else check(obligation?.loanAllowed||amount<=Math.floor(Math.max(0,finances202(s,p).cashflow)/money(100))*money(1000),"Денежного потока не хватает на кредит");
    bankLoan(s,p,amount);event(s,p.id,`Получен кредит ${amount/100}`);
  }else if(c.type==="repay") {
    const loan=p.loans.find(l=>l.id===c.assetId);check(loan,"Кредит не найден");const amount=integer(c.amount,1,loan.balance);
    check(amount===loan.balance||loan.bank&&amount%money(1000)===0,"Небанковские долги погашаются полностью");spend(p,amount);loan.balance-=amount;if(loan.bank)loan.payment=Math.round(loan.balance/10);p.loans=p.loans.filter(l=>l.balance>0);event(s,p.id,"Погашен кредит");
  }else if(c.type==="bankruptcy")bankruptcy(s,p);
  else if(c.type==="offer")makeOffer(s,p,c);
  else if(c.type==="accept"||c.type==="reject"){
    const o=s.offers.find(o=>o.id===c.offerId);check(o,"Предложение уже закрыто");
    if(c.type==="accept")acceptOffer(s,p,o);else{check(o.from===p.id||o.to===p.id||o.shares?.[p.id],"Нет доступа к предложению");s.offers=s.offers.filter(x=>x!==o);}
  }else{
    const t=s.queue[0];check(t&&t.id===c.taskId,"Решение уже принято или ещё недоступно");
    check(t.playerId===p.id||t.kind==="auction"&&t.candidates?.includes(p.id),"Решение другого игрока");
    if(c.type==="roll") {check(t.kind==="roll","Сначала завершите карточку");s.queue.shift();roll(s,p,integer(c.quantity??(p.track==="FAST_TRACK"?2:1),1,3),random);}
    else if(c.type==="choose") {check(t.kind==="choose"&&(c.choice==="capital"||c.choice==="cashflow"),"Выберите колоду");s.queue.shift();reveal(s,draw(s,c.choice,random),p.id,random);}
    else {check(c.type==="decide","Неизвестная команда");decide(s,p,t,c,random);}
  }
  // Drawing a card records its own automatic effects; advancing to the market does so separately.
  const revealsCard=c.type==="roll"||c.type==="choose"||c.type==="decide"&&(
    input.queue[0]?.kind==="mentor"||input.queue[0]?.kind==="escape"&&(c.choice==="pass"||c.choice==="no")
  );
  if(!revealsCard)financialResults(s,beforeFinances,c.type==="decide"?input.queue[0]?.slug:undefined);
  event(s,p.id,commandText202(c,input.queue[0]),undefined,commandLog202(input,c));
  advance(s,random);validateState202(s);return s;
}
export function validateState202(s:State202) {
  for(const p of s.players)for(const value of [p.cash,p.salary,p.baseExpenses,p.fastIncome,...p.stocks.flatMap(a=>[a.cost,a.quantity]),...p.shorts.flatMap(a=>[a.cost,a.quantity]),...p.options.flatMap(a=>[a.cost,a.quantity,a.strikeTotal])])check(Number.isSafeInteger(value),"Денежное значение вышло за допустимые пределы");
  for(const a of s.assets){check(Object.values(a.owners).every(v=>Number.isInteger(v)&&v>=0)&&Object.values(a.owners).reduce((n,v)=>n+v,0)<=10000,"Нарушены доли собственности");}
}
export function public202(s:State202):Public202 { const {decks,testControls,...view}=structuredClone(s);return view; }

/** Server-authorized scenario setup. Acquired instruments use the normal purchase rules. */
export function prepareSandbox202(input:State202, setup:{
  track:"RAT_RACE"|"FAST_TRACK"; firstPlayerId:string;
  players:Array<{playerId:string;cash:number;position:number;fastIncome:number;assets:Array<{slug:string;quantity:number}>;nextCards:string[];dice:number[]}>;
}):State202 {
  const s=structuredClone(input);
  s.assets=[];s.offers=[];s.queue=[];s.winner=null;s.log=[];
  s.testControls={cards:{},dice:{}};
  s.current=s.players.findIndex(p=>p.id===setup.firstPlayerId);
  check(s.current>=0,"Первый игрок не найден");
  for(const config of setup.players) {
    const p=player(s,config.playerId);
    p.stocks=[];p.options=[];p.shorts=[];p.rights=[];p.d2y=[];
    p.turns=0;
    p.cash=money(10_000_000_000);
    p.track=setup.track;p.position=setup.track==="RAT_RACE"?integer(config.position,-1,23):-1;p.fastPosition=Math.max(0,config.position);
    if(setup.track==="FAST_TRACK") {p.position=-1;p.fastPosition=integer(config.position,0,47);}
    p.fastIncome=p.initialFastIncome=money(integer(config.fastIncome,1,1_000_000));
    for(const holding of config.assets) {
      const rule=rules202[holding.slug];check(rule,"Карточка актива не найдена");
      const quantity=integer(holding.quantity,1,1_000_000);
      if(rule.kind==="quote") {
        check(rule.price>0&&rule.symbols.length===1,"Эта карточка не задаёт начальный актив");
        p.stocks.push({id:id(s),symbol:rule.symbols[0]!,quantity,cost:money(rule.price)*quantity});
      } else {
        if(!["option","investment"].includes(rule.kind))check(quantity===1,"Для этой карточки укажите количество 1");
        buyDeal(s,p,task(s,p.id,"deal",{slug:holding.slug,rule}),quantity);
      }
    }
    p.cash=money(integer(config.cash,0,10_000_000));
    check(config.nextCards.every(slug=>Boolean(rules202[slug])),"Карточка следующего хода не найдена");
    s.testControls.cards[p.id]=[...config.nextCards];
    s.testControls.dice[p.id]=config.dice.map(value=>integer(value,1,6));
  }
  s.log=[];beginTurn(s);
  validateState202(s);return s;
}
