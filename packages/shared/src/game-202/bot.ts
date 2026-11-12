import { canEscape202, fastPrice202, finances202, type Command202, type Player202, type Public202 } from "./engine";

/** Decisions consume only the public snapshot. No future deck contents or RNG are available. */
export function botCommand202(s:Public202,botIds:Record<string,string>):{playerId:string;command:Command202;reason:string}|null {
  if(s.winner)return null;
  const t=s.queue[0];if(!t)return null;
  const candidate=t.kind==="auction"?t.candidates?.find(id=>botIds[id]&&t.bids?.[id]===undefined):t.playerId;
  const p=s.players.find(p=>p.id===candidate&&botIds[p.id]);
  // Answer incoming offers even while the main task belongs to a human.
  for(const o of s.offers) {
    const target=s.players.find(p=>botIds[p.id]&&!o.accepted.includes(p.id)&&(o.to===p.id||o.shares?.[p.id]));
    if(!target)continue;
    const reserve=Math.max(0,finances202(s,target).expenses)*2;
    const asset=s.assets.find(a=>a.id===o.assetId);
    const cost=o.kind==="joint"?Math.round(o.price*(o.shares?.[target.id]??0)/10000):o.price;
    const acceptable=target.cash-cost>=reserve&&(o.kind==="joint"||o.kind==="asset"&&asset&&cost<=(asset.cost-asset.mortgage)*(o.share??0)/10000);
    return {playerId:target.id,command:{type:acceptable?"accept":"reject",revision:s.revision,offerId:o.id},reason:acceptable?"Условия укладываются в стоимость актива и резерв":"Предложение не сохраняет резерв или не имеет подтверждённой стоимости"};
  }
  if(!p)return null;
  const level=botIds[p.id]!,f=finances202(s,p);
  const cautious=level==="cautious_v1"||level==="beginner_v1"||level==="easy_v1";
  const advanced=level==="aggressive_v1"||level==="expert_v1"||level==="hard_v1";
  const reserve=Math.max(0,f.expenses)*(cautious?3:advanced?1:2);
  const make=(choice:string,extra:Partial<Command202>={},reason="Решение по открытой карточке")=>({playerId:p.id,command:{revision:s.revision,type:"decide" as const,taskId:t.id,choice,...extra},reason});
  switch(t.kind) {
    case "roll":return canEscape202(s,p)?make("escape",{},"Достигнут двойной пассивный доход"):make("",{type:"roll",quantity:p.track==="FAST_TRACK"?2:1},"Начало хода");
    case "choose":return make(p.cash>reserve+2000000?"cashflow":"capital",{type:"choose"},"Колода выбрана по доступным наличным");
    case "quote":{
      const profitable=p.options.find(o=>o.symbol===t.symbol&&(o.side==="call"?t.price!*o.quantity-o.strikeTotal:o.strikeTotal-t.price!*o.quantity)>0);
      if(profitable)return make("exercise",{assetId:profitable.id},"Зафиксировать прибыль по опциону");
      const held=p.stocks.filter(a=>a.symbol===t.symbol),quantity=held.reduce((n,a)=>n+a.quantity,0),cost=held.reduce((n,a)=>n+a.cost,0);
      if(t.sell&&quantity&&(p.cash<0||t.price!*quantity>cost&&t.price!>=3000))return make("sell",{quantity},"Продать акции по выгодной цене или покрыть обязательный убыток");
      if(t.buy&&!t.traded?.includes("buy")&&t.price!<=1000&&p.cash>reserve+t.price!){const qty=Math.min(5000,Math.floor((p.cash-reserve)*0.5/t.price!));if(qty>0)return make("buy",{quantity:qty},"Покупка у нижней границы диапазона с сохранением резерва");}
      if(advanced&&t.buy&&!t.traded?.includes("short")&&t.price!>=4000&&p.cash>reserve+500000)return make("short",{quantity:100},"Небольшая короткая позиция с резервом на рост котировки");
      return make("pass");
    }
    case "deal":{
      const r=t.rule!;
      if(r.kind==="exchange"){
        const a=s.assets.find(a=>(a.owners[p.id]??0)>0&&a.units===r.units&&(r.units!==1||a.house)&&r.property.income*100>a.income);
        return a?make("buy",{assetId:a.id}):make("pass");
      }
      if(r.kind==="d2y")return make((r.level===2||!p.d2y.some(a=>a.level===r.level))&&(r.level!==1||p.cash>=20000)?"buy":"pass");
      if(r.kind==="option")return make(!cautious&&p.cash-reserve>=r.premium*10000?"buy":"pass",{quantity:100});
      if(r.kind==="right")return make(p.cash-reserve>r.cost*100+2000000?"buy":"pass");
      const property=r.kind==="market_property"?r.property:r.kind==="property"?r:null;
      const cost=property?(property.fee??property.down)*100:r.kind==="investment"?r.cost*100:Infinity;
      const income=property?property.income*100:r.kind==="investment"?r.income*100:0;
      const valuable=income>0||property?.acres&&advanced;
      if(valuable&&cost<=p.cash-reserve&&!(p.bankrupt&&r.kind==="market_property"&&r.repair))return make("buy",{quantity:1},"Покупка доходного актива с сохранением резерва");
      if(valuable&&!p.bankrupt&&!cautious&&income>cost*0.015&&cost>p.cash){const loan=Math.ceil((cost+reserve-p.cash)/100000)*100000;if(loan>0&&loan<=Math.floor(Math.max(0,f.cashflow)/10000)*100000&&income>=loan/10)return make("",{type:"loan",amount:loan},"Доход покупки покрывает обслуживание кредита");}
      return make("pass");
    }
    case "right":return make("buy");
    case "sale":case "exchange":return make("yes");
    case "insurance":return make(f.cashflow>40000?"yes":"pass");
    case "contamination":return make(p.cash>=5000000?"yes":"pass");
    case "university":return make(p.cash>=5000000+reserve?"cash":"credit");
    case "charity":return make(p.cash>reserve+Math.max(0,f.income/10)&&!cautious?"yes":"pass");
    case "auction":return make("pass");
    case "debt":return t.loanAllowed?make("",{type:"loan",amount:Math.ceil(-p.cash/100000)*100000},"Кредит покрывает обязательный расход"):make("",{type:"bankruptcy"},"Кредит для убытка по короткой позиции запрещён");
    case "escape":return make("yes");
    case "fast":return make(p.cash>=fastPrice202(s,p,t.cell!)?"buy":"pass");
    case "mentor":return make(t.mandatory?"redraw":"keep");
  }
}
