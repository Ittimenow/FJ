import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { command202, finances202, newGame202, ratRaceBoard, rules202, type State202 } from '@cashflow/shared';
import { Game202Panel } from '../../apps/web/src/components/game/game-202-panel';
import { GameRoomFixture } from './game-room-ui';
import { AppShell } from '../../apps/web/src/components/layout/app-shell';
import { GameRoomHeaderProvider } from '../../apps/web/src/components/layout/game-room-header-context';
import { SessionProvider } from 'next-auth/react';
import cards from '../../dist/recognized_202_cards_ru.json';
import type { GameSnapshot } from '../../apps/web/src/lib/types';

const query = new URLSearchParams(location.search);
const scenario = query.get('scenario') ?? 'quote';
const viewer = query.get('viewer') ?? 'anna';
const random = (max:number) => max-1;
function initial() {
  const state=newGame202(['anna','boris'].map(id=>({id,salary:5000,passive:0,expenses:3000,savings:10000,childCost:300,dream:0,loans:[]})),random);
  state.assets=[]; state.stage='deal'; state.after='market';
  for(const player of state.players) {
    player.cash=1_000_000;player.stocks=[];player.options=[];player.rights=[];player.loans=[];player.position=2;
  }
  const me=state.players[0]!;
  me.stocks=[{id:'stock',symbol:'OK4U',quantity:100,cost:50000}];
  me.options=[{id:'call',side:'call',symbol:'OK4U',quantity:100,cost:10000,strikeTotal:50000,expires:4},{id:'put',side:'put',symbol:'OK4U',quantity:100,cost:10000,strikeTotal:80000,expires:3}];
  state.assets.push({id:'house',kind:'property',name:'Дом 2/1',source:'starter',owners:{anna:10000},cost:5200000,down:600000,mortgage:4600000,income:2000,units:1,acres:0,house:true,lockedUntil:{}});
  state.decks.market=['set_202_market_22'];
  state.queue=[{id:'quote',kind:'quote',playerId:'anna',slug:'set_202_capital_23',symbol:'OK4U',price:1000,buy:true,sell:true}];
  if(['property','poor','incoming'].includes(scenario))state.queue=[{id:'property',kind:'deal',playerId:'anna',slug:'set_202_capital_04',rule:rules202.set_202_capital_04}];
  if(scenario==='inheritance')state.queue=[{id:'inheritance',kind:'deal',playerId:'anna',slug:'set_202_capital_32',rule:rules202.set_202_capital_32}];
  if(scenario==='payday'){me.cash=40000;me.salary=467000;me.position=7;state.stage='roll';state.after='end';state.queue=[{id:'roll',kind:'roll',playerId:'anna'}];return command202(state,'anna',{type:'roll',taskId:'roll',revision:state.revision,quantity:1},random);}
  if(scenario==='poor')me.cash=50000;
  if(scenario==='exchange')state.queue=[{id:'exchange',kind:'deal',playerId:'anna',slug:'set_202_market_19',rule:rules202.set_202_market_19}];
  if(scenario==='debt'){me.cash=-10000;state.queue=[{id:'debt',kind:'debt',playerId:'anna',loanAllowed:false,reason:'Убыток по короткой продаже: кредит недоступен'}];}
  if(scenario==='auction'){state.stage='market';state.after='end';state.queue=[{id:'auction',kind:'auction',playerId:'anna',slug:'set_202_market_07',candidates:['anna','boris'],bids:{}}];}
  if(scenario==='choose'||scenario==='mentor'){
    state.queue=[{id:'choose',kind:'choose',playerId:'anna'}];state.decks.capital=['set_202_capital_04'];
    if(scenario==='mentor')me.mentorUntil=4;
  }
  if(scenario==='incoming')state.offers=[{id:'joint',kind:'joint',from:'anna',to:'boris',price:600000,taskId:'property',shares:{anna:6000,boris:4000},accepted:['anna'],turn:1}];
  if(state.queue[0]?.slug)state.log.push({revision:0,playerId:'anna',kind:'effect',effectType:'card_opened',text:'Открыта карточка',slug:state.queue[0].slug,turnKey:'anna:1',turnOwnerGamePlayerId:'anna',turnNumber:1,round:1,track:'RAT_RACE'});
  return state;
}

function snapshot(state:State202):GameSnapshot {
  return {
    game:{id:'flow-fixture',title:'Проверка интерфейса 202',status:scenario==='paused'?'PAUSED':'IN_PROGRESS',gameType:query.get('mode')==='101'?'CLASSIC_101':'GAME_202',rulesVersion:2,currentPlayerId:state.players[state.current]!.id,currentRound:state.round,currentTurnIndex:state.current,
      ...(query.get('mode')==='101'?{pendingAction:{type:'deal',gamePlayerId:'anna'}}:{})},
    board:ratRaceBoard,cards202:cards,
    players:state.players.map((p,index)=>{
      const f=finances202(state,p);
      return {id:p.id,userId:p.id,guestName:index?'Борис':'Анна',user:{id:p.id,displayName:index?'Борис':'Анна',gameRoomView:'classic'},figurine:index?'cat-in-box':'rubber-duck',controller:'HUMAN',role:'PLAYER',status:'JOINED',seat:index+1,color:index?'#7655c7':'#2967df',track:p.track,position:p.position,fastTrackPosition:-1,dreamCellIndex:0,assets:[],liabilities:[],profession:{name:'Учитель'},financialState:{cashCents:p.cash/100,salaryCents:p.salary/100,passiveIncomeCents:f.passive/100,totalIncomeCents:f.income/100,totalExpensesCents:f.expenses/100,monthlyCashflowCents:f.cashflow/100,childrenCount:0}};
    }),
    events:[{id:'previous-start',sequence:-3,type:'game202:action',payload:{kind:'turn_started',text:'Начало хода',turnKey:'boris:0',turnOwnerGamePlayerId:'boris',turnNumber:0,round:0,track:'RAT_RACE'},createdAt:'2026-11-13T10:00:00Z',gamePlayer:{id:'boris',seat:2,role:'PLAYER'}},
      {id:'previous-effect',sequence:-2,type:'game202:action',payload:{kind:'effect',text:'День зарплаты',turnKey:'boris:0',turnOwnerGamePlayerId:'boris',turnNumber:0,round:0,track:'RAT_RACE'},createdAt:'2026-11-13T10:00:00Z',gamePlayer:{id:'boris',seat:2,role:'PLAYER'}},
      {id:'previous-end',sequence:-1,type:'game202:action',payload:{kind:'turn_ended',text:'Ход завершён',turnKey:'boris:0',turnOwnerGamePlayerId:'boris',turnNumber:0,round:0,track:'RAT_RACE'},createdAt:'2026-11-13T10:00:00Z',gamePlayer:{id:'boris',seat:2,role:'PLAYER'}},
      ...state.log.map((line,index)=>({id:`log-${index}`,sequence:index,type:'game202:action',payload:line,createdAt:'2026-11-13T10:00:00Z',gamePlayer:line.playerId?{id:line.playerId,seat:line.playerId==='anna'?1:2,role:'PLAYER'}:null}))],
    ...(query.get('mode')==='101'?{}:{game202:state})
  } as unknown as GameSnapshot;
}

function App() {
  const [state,setState]=useState(initial);
  const [view,setView]=useState(()=>snapshot(state));
  useEffect(()=>{
    // Only this isolated fixture replaces fetch; commands use the real, in-memory reducer.
    const original=window.fetch;
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(url.endsWith('/202/command')) {
        const command=JSON.parse(String(init?.body));
        window.dispatchEvent(new CustomEvent('fixture:command',{detail:command}));
        await new Promise(resolve=>setTimeout(resolve,80));
        if(document.documentElement.dataset.failNext==='true'){
          delete document.documentElement.dataset.failNext;
          return new Response(JSON.stringify({message:'Проверочная ошибка. Повторите действие.'}),{status:409});
        }
        try {
          const next=command202(state,viewer,command,random);
          if(scenario==='inheritance')next.log.push({revision:next.revision,playerId:viewer,kind:'bot',text:'Решение по открытой карточке',turnKey:'anna:1',turnOwnerGamePlayerId:'anna'});
          setState(next);
          return new Response(JSON.stringify({snapshot:snapshot(next)}),{status:200});
        }catch(error){return new Response(JSON.stringify({message:(error as Error).message}),{status:400});}
      }
      if(url.includes('/api/games/flow-fixture'))return new Response(JSON.stringify(snapshot(state)));
      if(url.includes('/api/auth/session'))return new Response('{}');
      return new Response('[]');
    };
    document.documentElement.dataset.fixtureReady='true';
    return ()=>{window.fetch=original;};
  },[state]);
  if(query.get('mode')==='101')return <GameRoomFixture snapshot={view}/>;
  return <SessionProvider session={null}><GameRoomHeaderProvider><AppShell userName="Анна" gameViewportMode="classic">
    <div className="game-room game-room--classic-active game-room--202"><Game202Panel snapshot={view} token="fixture" currentUserId={viewer} onSnapshot={setView} showFastTrack={false} onTrackChange={()=>{}}/></div>
  </AppShell></GameRoomHeaderProvider></SessionProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
