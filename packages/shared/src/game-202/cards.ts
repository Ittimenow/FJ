/** Rules are keyed by the immutable transcription IDs, never inferred from prose. Amounts here are dollars; the engine converts them to cents. */
export type Symbol202 = "MYT4U" | "OK4U";
export type Property202 = { kind: "property"; cost: number; mortgage: number; down: number; income: number; units: number; acres: number; house: boolean; fee?: number };
export type Rule202 =
  | Property202
  | { kind: "option"; symbol: Symbol202; side: "call" | "put"; premium: number; strike: number }
  | { kind: "quote"; symbols: Symbol202[]; price: number; split?: boolean; bankrupt?: boolean; buy: "owner" | "neighbor" | "all" | "none"; sell?: "all" | "eligible"; forced?: boolean }
  | { kind: "d2y"; level: 1 | 2 | 3; income: number }
  | { kind: "right"; cost: number }
  | { kind: "investment"; cost: number; income: number; repeat: boolean; royalty: boolean }
  | { kind: "expense"; cash: number; monthly: number; children?: boolean; perChild?: boolean; threshold?: number; loan?: [number, number]; university?: boolean }
  | { kind: "sale"; filter: "house" | "plex" | "apartment" | "large" | "land" | "highest"; price: number; acres?: number }
  | { kind: "exchange"; units: number; property: Property202 }
  | { kind: "rent"; amount: number }
  | { kind: "wedding"; cost: number }
  | { kind: "auction" }
  | { kind: "airport" }
  | { kind: "disaster" }
  | { kind: "insurance" }
  | { kind: "contamination" }
  | { kind: "mentor" }
  | { kind: "market_property"; property: Property202; repair: number };
export type Deck202 = "capital" | "cashflow" | "market" | "doodad";
export const rules202: Record<string, Rule202> = {};
export const slug202 = (deck: Deck202, id: number | string) => `set_202_${deck}_${String(id).replace(".", "_").padStart(2, "0")}`;
const put = (deck: Deck202, id: number | string, rule: Rule202) => { rules202[slug202(deck, id)] = rule; };
const property = (cost: number, mortgage: number, down: number, income: number, units = 1, acres = 0, house = false): Property202 => ({ kind: "property", cost, mortgage, down, income, units, acres, house });
const quote = (symbol: Symbol202, price: number, buy: "owner" | "neighbor" | "all" | "none" = "owner"): Rule202 => ({ kind: "quote", symbols: [symbol], price, buy, sell: "all" });
for (const [id, symbol, premium, strike, side] of [
  [1,"MYT4U",4,10,"call"],[2,"MYT4U",2,15,"call"],[5,"OK4U",4,10,"call"],[11,"OK4U",1,20,"call"],[13,"OK4U",2,15,"call"],[14,"MYT4U",1,20,"call"],
  [10,"OK4U",4,40,"put"],[15,"MYT4U",4,40,"put"],[16,"OK4U",2,35,"put"],[35,"MYT4U",2,35,"put"]
] as const) put("capital",id,{kind:"option",symbol,premium,strike,side});
for (const [id,symbol,price] of [[3,"OK4U",5],[7,"MYT4U",40],[12,"MYT4U",5],[17,"MYT4U",50],[21,"OK4U",50],[22,"OK4U",40],[23,"OK4U",10],[26,"MYT4U",40],[28,"OK4U",40],[29,"MYT4U",10]] as const) put("capital",id,quote(symbol,price));
for (const [id,cost,mortgage,down,income] of [[4,52000,46000,6000,20],[6,52000,48000,4000,10],[19,49000,46000,3000,10],[24,46000,40000,6000,20],[36,52000,50000,2000,-10]] as const) put("capital",id,property(cost,mortgage,down,income,1,0,true));
for (const [id,cost,mortgage,down,income,acres] of [[8,30000,0,30000,0,40],[9,30000,15000,15000,-150,20],[20,20000,0,20000,0,20],[30,40000,20000,20000,-200,40]] as const) put("capital",id,property(cost,mortgage,down,income,0,acres));
put("capital",32,{...property(60000,51000,9000,300,2),fee:3000});
put("capital",33,property(36000,34500,1500,150,2));
for(const id of [18,27,31]) put("capital",id,{kind:"d2y",level:1,income:0});
put("capital",25,quote("OK4U",5,"neighbor")); put("capital",34,quote("MYT4U",5,"neighbor"));
for (const [id,cost] of [["1.1",1000],["1.4",2000],["1.7",1500]] as const) put("cashflow",id,{kind:"right",cost});
for(const [id,cost,income,repeat,royalty] of [["1.5",14000,500,false,true],["1.6",8000,200,false,true],["3.1",12000,400,false,true],["3.8",8000,250,false,true],["2.5",50000,880,true,false],["2.6",50000,1000,true,false],["4.8",25000,380,true,false]] as const) put("cashflow",id,{kind:"investment",cost,income,repeat,royalty});
for(const [id,income] of [["1.3",1000],["1.9",500],["2.1",500],["2.2",1500],["3.6",2000]] as const) put("cashflow",id,{kind:"d2y",level:2,income});
put("cashflow","2.3",{kind:"d2y",level:3,income:5000});
for(const id of ["2.4","3.9","4.1"]) put("cashflow",id,{kind:"d2y",level:1,income:0});
for(const [id,cost,mortgage,down,income,units] of [
 ["1.2",200000,160000,40000,1600,8],["1.8",230000,200000,30000,1250,8],["2.7",60000,48000,12000,400,2],["2.8",200000,168000,32000,1500,8],["2.9",45000,37000,8000,320,2],
 ["3.2",100000,80000,20000,800,4],["3.3",800000,700000,100000,4500,30],["3.4",350000,300000,50000,2000,12],["3.5",65000,55000,10000,280,2],["3.7",80000,64000,16000,750,4],
 ["4.2",125000,110000,15000,600,4],["4.3",50000,42000,8000,240,2],["4.4",140000,108000,32000,1500,4],["4.5",210000,170000,40000,1700,8],["4.6",90000,75000,15000,500,4],["4.7",650000,585000,65000,2500,24],["4.9",1000000,800000,200000,8000,50]
] as const) put("cashflow",id,property(cost,mortgage,down,income,units));
put("market",1,{kind:"market_property",property:property(90000,90000,0,200,4),repair:12000});
put("market",2,{kind:"exchange",units:2,property:property(100000,80000,20000,800,4)});
put("market",3,{kind:"rent",amount:-50});
for(const [id,symbol,price,all] of [[4,"OK4U",40,false],[10,"MYT4U",30,true],[33,"OK4U",30,false],[35,"MYT4U",40,false]] as const) put("market",id,{kind:"quote",symbols:[symbol],price,split:true,buy:all?"all":"owner",sell:all?"all":"eligible"});
put("market",5,{kind:"sale",filter:"large",price:30000});
put("market",6,{kind:"wedding",cost:5000}); put("market",17,{kind:"wedding",cost:2000});
put("market",7,{kind:"auction"});
for(const [id,symbol] of [[8,"OK4U"],[16,"MYT4U"]] as const) put("market",id,{kind:"quote",symbols:[symbol],price:5,buy:"none",forced:true,sell:"eligible"});
put("market",9,{kind:"airport"}); put("market",11,{kind:"sale",filter:"highest",price:1.5});
for(const [id,price] of [[12,85000],[24,80000],[32,75000]] as const) put("market",id,{kind:"sale",filter:"house",price});
for(const [id,symbol,price] of [[13,"OK4U",0],[14,"OK4U",4],[21,"MYT4U",4],[31,"MYT4U",0]] as const) put("market",id,{kind:"quote",symbols:[symbol],price,bankrupt:true,buy:price?"owner":"none",sell:"all"});
for(const [id,price,acres] of [[15,125000,10],[20,150000,10],[28,40000,5]] as const) put("market",id,{kind:"sale",filter:"land",price,acres});
put("market",18,{kind:"disaster"});
put("market",19,{kind:"exchange",units:1,property:property(110000,90000,20000,700,4)});
put("market",23,{kind:"exchange",units:4,property:property(190000,150000,40000,1700,8)});
put("market",39,{kind:"exchange",units:8,property:property(450000,380000,70000,3500,16)});
for(const id of [22,27]) put("market",id,{kind:"insurance"});
for(const [id,price] of [[25,35000],[26,30000],[34,40000]] as const) put("market",id,{kind:"sale",filter:"plex",price});
for(const [id,price] of [[36,40000],[41,35000]] as const) put("market",id,{kind:"sale",filter:"apartment",price});
put("market",29,{kind:"market_property",property:property(190000,190000,0,300,4),repair:0});
put("market",30,{kind:"contamination"}); put("market",37,{kind:"mentor"}); put("market",38,{kind:"d2y",level:3,income:7000});
put("market",40,{kind:"quote",symbols:["OK4U","MYT4U"],price:10,buy:"none",sell:"all"});
put("market",42,{kind:"rent",amount:30});
const cash: Record<number,number>={1:100,2:500,3:25000,6:50,7:1500,12:20000,13:12000,15:3000,17:10,19:500,20:20,21:3000,22:15000};
const monthly:Record<number,number>={2:100,4:200,5:20,8:150,9:1000,11:30,12:400,13:140,14:80,16:100,18:750,21:150,23:200,24:500};
const loans:Record<number,[number,number]>={3:[50000,500],13:[20000,260],21:[5000,250]};
for(let id=1;id<=24;id++) put("doodad",id,{kind:"expense",cash:cash[id]??0,monthly:monthly[id]??0,...([2,4,6,10,21].includes(id)?{children:true}:{}),...(id===6?{perChild:true}:{}),...(id===15?{threshold:500}:{}),...(id===10?{university:true}:{}),...(loans[id]?{loan:loans[id]}:{})});
export const decks202 = Object.fromEntries((["capital","cashflow","market","doodad"] as const).map(deck=>[deck,Object.keys(rules202).filter(slug=>slug.startsWith(`set_202_${deck}_`))])) as Record<Deck202,string[]>;
export interface Starter202 { cash:number; stocks: Array<[Symbol202,number,number]>; property?: Property202 }
export const starters202: readonly Starter202[] = [
 {cash:0,stocks:[["MYT4U",100,20],["OK4U",200,30]]}, {cash:0,stocks:[["MYT4U",700,40],["OK4U",200,50]]},
 {cash:3000,stocks:[["MYT4U",100,5],["OK4U",100,10]]}, {cash:23000,stocks:[]},
 {cash:3000,stocks:[],property:property(110000,90000,20000,330,4)},
 {cash:3000,stocks:[["OK4U",500,15]],property:property(48000,45000,3000,100,2)},
 {cash:10000,stocks:[["MYT4U",100,20]]}, {cash:5000,stocks:[["MYT4U",300,15]],property:property(56000,49000,7000,210,2)},
 {cash:12000,stocks:[["OK4U",400,15]],property:property(46000,42000,4000,120,2)},
 {cash:0,stocks:[["OK4U",300,20]],property:property(64000,56000,8000,300,2)},
 {cash:2000,stocks:[],property:property(90000,73000,17000,320,4)}, {cash:8000,stocks:[],property:property(20000,0,20000,0,0,10)}
];
