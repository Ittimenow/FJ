import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DreamPicker, FastTrackPanel } from '../../apps/web/src/components/game/fast-track-panel';
import { TestGameOptions } from '../../apps/web/src/components/game/test-game-options';
import { GameMenuFixture } from './game-menu-ui';
const user={id:'anna',userId:'admin',guestName:'Анна',controller:'HUMAN',role:'PLAYER',status:'JOINED',seat:1,color:'#2967df',track:'FAST_TRACK',position:0,fastTrackPosition:23,dreamCellIndex:4,financialState:{cashCents:450000,fastTrackStartIncomeCents:100000,fastTrackIncomeCents:139000,fastTrackCharity:true}};
function App(){
 const [player,setPlayer]=useState(user);const [count,setCount]=useState(2);const [decision,setDecision]=useState(true);const [notice,setNotice]=useState('');
 const mode=new URLSearchParams(location.search).get('mode');
 if(mode==='menu') return <GameMenuFixture />;
 const snapshot:any={game:{id:'synthetic',status:'IN_PROGRESS',currentPlayerId:'anna',currentRound:3,currentTurnIndex:0,rulesVersion:2,isTest:true,fastTrackWorld:{owners:{1:'anna',3:'boris'},influence:{4:['boris','vera']},dreamPurchases:{}},pendingAction:decision?{type:'fast_track_choice',cellIndex:23,gamePlayerId:'anna',decisionId:'demo',priceCents:300000}:null},players:[player,{...user,id:'boris',userId:null,controller:'BOT',guestName:'Борис',fastTrackPosition:12,dreamCellIndex:12},{...user,id:'vera',guestName:'Вера',track:'RAT_RACE',dreamCellIndex:16}],events:[],board:[]};
 if(mode==='occupied') snapshot.players = snapshot.players.map((p:any, i:number)=>({...p,track:'FAST_TRACK',fastTrackPosition:i===0?36:12}));
 return <main style={{maxWidth:1440,margin:'0 auto',padding:16}}><header style={{marginBottom:16,display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>Финансовое путешествие · демонстрационные данные</strong></header>{mode==='lobby'?<DreamPicker player={player as any} saving={false} onChoose={index=>setPlayer({...player,dreamCellIndex:index})}/>:mode==='admin'?<form><TestGameOptions/></form>:<FastTrackPanel snapshot={snapshot} player={player as any} rolling={false} diceValues={[4,5]} diceCount={count} onDiceCount={setCount} onRoll={()=>setNotice('Бросок принят')} busy={false} onDecision={(buy)=>{setDecision(false);setNotice(buy?'Покупка принята':'Отказ принят')}}/>}<output>{notice}</output></main>
}
createRoot(document.getElementById('root')!).render(<App/>);
