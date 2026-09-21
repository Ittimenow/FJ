import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DreamPicker, FastTrackPanel } from '../../apps/web/src/components/game/fast-track-panel';
import { GameActionHistory } from '../../apps/web/src/components/game/game-action-history';
import { ratRaceBoard } from '@cashflow/shared';
import { DesktopGameBoard } from '../../apps/web/src/components/game/game-room';
import { AppShell } from '../../apps/web/src/components/layout/app-shell';
import { GameRoomHeaderProvider } from '../../apps/web/src/components/layout/game-room-header-context';
import logo from '../../apps/web/public/logo.svg';
import { DiceAction } from '../../apps/web/src/components/game/dice-action';
import { TestGameOptions } from '../../apps/web/src/components/game/test-game-options';
import { GameMenuFixture } from './game-menu-ui';
import duck from '../../apps/web/public/figurines/rubber-duck.png';
import cat from '../../apps/web/public/figurines/cat-in-box.png';
import robot from '../../apps/web/public/figurines/robot.png';
const avatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#bbccf3"/><circle cx="32" cy="24" r="12" fill="#946746"/><ellipse cx="32" cy="65" rx="26" ry="28" fill="#2967df"/></svg>');
const user:any={id:'anna',userId:'admin',guestName:'Анна',user:{id:'admin',displayName:'Анна',avatarUrl:avatar},figurine:'rubber-duck',controller:'HUMAN',role:'PLAYER',status:'JOINED',seat:1,color:'#2967df',track:'FAST_TRACK',position:0,assets:[],liabilities:[],profession:{name:'Медсестра'},fastTrackPosition:23,dreamCellIndex:4,financialState:{cashCents:450000,salaryCents:3100,passiveIncomeCents:0,totalIncomeCents:3100,totalExpensesCents:1980,monthlyCashflowCents:1120,childrenCount:0,fastTrackStartIncomeCents:100000,fastTrackIncomeCents:139000,fastTrackCharity:true}};
const event = (sequence:number,type='player:roll_dice') => ({id:`event-${sequence}`,sequence,type,payload:{dice:[sequence%6+1],total:sequence%6+1},createdAt:'2026-09-20T10:00:00Z',gamePlayer:{id:sequence%2?'anna':'boris',seat:1,role:'PLAYER'}});
const history=Array.from({length:25},(_,i)=>event(i+1));
const archiveWindow=Array.from({length:80},(_,i)=>event(i+21,i<75?'state:update':'player:roll_dice'));
const archived=Array.from({length:20},(_,i)=>event(i+1));
function App(){
 const mode=new URLSearchParams(location.search).get('mode');
 const [player,setPlayer]=useState(user);const [count,setCount]=useState(2);const [decision,setDecision]=useState(!['ready','roll-error','desktop-small','desktop-large'].includes(mode ?? ''));const [notice,setNotice]=useState('');
 const [rolling,setRolling]=useState(false);
 const [phase,setPhase]=useState<'ready'|'rolling'|'landed'>('ready');
 useEffect(()=>{const reset=()=>{setDecision(false);setPhase('ready');};window.addEventListener('fixture:next-turn',reset);return()=>window.removeEventListener('fixture:next-turn',reset);},[]);
 const roll=()=>{setRolling(true);setPhase('rolling');setNotice('Бросок принят');setTimeout(()=>{setRolling(false);if(mode==='roll-error'){setPhase('ready');setNotice('Не удалось бросить кубик');}else{setPhase('landed');setDecision(true);}},200);};
 const attempts=useRef(0);
 useEffect(()=>{
   const images:Record<string,string>={'/logo.svg':logo,'/figurines/rubber-duck.png':duck,'/figurines/cat-in-box.png':cat,'/figurines/robot.png':robot};
   const update=()=>document.querySelectorAll<HTMLImageElement>('img').forEach(img=>{const src=img.getAttribute('src')??'';if(images[src])img.src=images[src];});
   const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});update();return ()=>observer.disconnect();
 },[]);
 if(mode==='menu') return <GameMenuFixture />;
 const snapshot:any={game:{id:'synthetic',status:mode==='paused'?'PAUSED':'IN_PROGRESS',currentPlayerId:mode==='waiting'?'boris':'anna',currentRound:3,currentTurnIndex:0,rulesVersion:2,isTest:true,fastTrackWorld:{owners:{1:'anna',3:'boris'},influence:{4:['boris','vera']},dreamPurchases:{0:['anna']}},pendingAction:decision?{type:'fast_track_choice',cellIndex:23,gamePlayerId:'anna',decisionId:'demo',priceCents:300000}:null},players:[player,{...user,id:'boris',userId:null,user:null,figurine:'cat-in-box',controller:'BOT',guestName:'Борис',fastTrackPosition:12,dreamCellIndex:12,financialState:{...user.financialState,fastTrackCharity:false}},{...user,id:'vera',userId:null,user:null,figurine:'robot',guestName:'Вера',track:'RAT_RACE',dreamCellIndex:16}],events:history,board:ratRaceBoard};
 if(mode==='occupied') snapshot.players=snapshot.players.map((p:any,i:number)=>({...p,track:'FAST_TRACK',fastTrackPosition:i===0?36:12}));
 const feed=<GameActionHistory gameId="synthetic" players={snapshot.players} events={mode==='archive'?archiveWindow:history} loadEarlier={async()=>{if(++attempts.current===1)throw new Error('Не удалось загрузить историю партии');return [...archived,...archiveWindow];}}/>;
 const fast=<FastTrackPanel snapshot={snapshot} player={player} rolling={rolling} phase={phase} diceValues={Array.from({length:count},(_,i)=>i+4)} diceCount={count} onDiceCount={setCount} onRoll={roll} onSkip={()=>setNotice('Ход пропущен')} busy={false} onDecision={(buy)=>{setDecision(false);setPhase('ready');setNotice(buy?'Покупка принята':'Отказ принят')}}>{feed}</FastTrackPanel>;
 if(mode==='desktop-small'||mode==='desktop-large') {
   const small=mode==='desktop-small';
   const view=new URLSearchParams(location.search).get('view')==='journey'?'journey':'classic';
   const smallPlayer={...player,track:'RAT_RACE'};
   return <GameRoomHeaderProvider><AppShell userName="Анна" gameViewportMode={view}>
     <div className={`game-room game-room--${view}-active ${small?'':'game-room--fast-track-active'}`}>
       {small?<div className="desktop-game-board-viewport"><DesktopGameBoard snapshot={{...snapshot,players:[smallPlayer]}} selectedPlayer={smallPlayer} players={[smallPlayer]} outsidePlayers={[]} canManageLiabilities={false} onCloseLiability={()=>{}} canOpenBank={false} onOpenBank={()=>{}}>
         <DiceAction canRoll rolling={false} diceValues={[4]} onRoll={roll} onSkip={()=>setNotice('Ход пропущен')} pinnedToPanel/>{feed}
       </DesktopGameBoard></div>:fast}
     </div><output className="sr-only">{notice}</output>
   </AppShell></GameRoomHeaderProvider>;
 }
 return <main style={{maxWidth:1440,margin:'0 auto',padding:16}}><header style={{marginBottom:16}}><strong>Финансовое путешествие · демонстрационные данные</strong></header>{mode==='lobby'?<DreamPicker player={player} saving={false} onChoose={index=>setPlayer({...player,dreamCellIndex:index})}/>:mode==='admin'?<form><TestGameOptions/></form>:mode==='small'?<section style={{maxWidth:420}} aria-label="Ход и история игроков"><DiceAction canRoll rolling={false} diceValues={[4]} onRoll={()=>setNotice('Бросок принят')} onSkip={()=>setNotice('Ход пропущен')}/>{feed}</section>:fast}<output>{notice}</output></main>
}
createRoot(document.getElementById('root')!).render(<App/>);
