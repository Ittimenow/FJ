"use client";

import { useEffect, useRef, useState } from "react";
import { canEscape202, fastTrackCells, finances202, type Command202, type Task202 } from "@cashflow/shared";
import { Button } from "@/components/ui/button";
import { RatRaceBoard, RatRaceMobileBoard, RatRaceTabs } from "./rat-race-layout";
import { MobileTurnDialog } from "./mobile-turn-dialog";
import { BankDialog } from "./bank-dialog";
import { Game202History } from "./game-202-history";
import { JournalCard } from "./journal-card";
import { game202CardContent } from "./game-202-card-model";
import { Game202Decisions, type PendingCommand202 } from "./game-202-decisions";
import { Game202Offers } from "./game-202-offers";
import { Game202PlayerReport, Game202Expenses, Game202Liabilities, Game202Assets } from "./game-202-financials";
import { isDecisionActor202, loanLimit202, offerKinds202 } from "./game-202-actions";
import { GamePlayerMark } from "./game-player-mark";
import { gamePlayerName } from "@/lib/game-player";
import { publicApiBaseUrl } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

const cash = (cents:number) => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"USD",maximumFractionDigits:cents%100?2:0}).format(cents/100);
const taskNames:Record<Task202["kind"],string>={roll:"Ваш ход",choose:"Выберите направление сделки",deal:"Инвестиционная возможность",quote:"Открыты торги",sale:"Предложение покупателя",exchange:"Обмен недвижимости",right:"Приоритет на недвижимость",insurance:"Страхование недвижимости",contamination:"Очистка участка",university:"Образование ребёнка",charity:"Благотворительность",auction:"Благотворительный аукцион",debt:"Покройте обязательный платёж",escape:"Доступен большой круг",fast:"Возможность большого круга",mentor:"Совет наставника"};

/** Extension of the existing game room: warm surfaces, chosen figurines and explicit financial decisions. */
export function Game202Panel({snapshot,token,currentUserId,onSnapshot,showFastTrack,onTrackChange}: {
  snapshot:GameSnapshot;
  token:string;
  currentUserId:string;
  onSnapshot:(next:GameSnapshot)=>void;
  showFastTrack:boolean;
  onTrackChange:(track:"RAT_RACE"|"FAST_TRACK")=>void;
}) {
  const state=snapshot.game202!;
  const me=snapshot.players.find(p=>p.userId===currentUserId&&p.role==="PLAYER"&&p.status==="JOINED");
  const mine=state.players.find(p=>p.id===me?.id);
  const selectedPlayer=mine??state.players[state.current]??state.players[0]!;
  const track=showFastTrack?"FAST_TRACK":"RAT_RACE";
  const [tabRequest,setTabRequest]=useState<{tab:"turn"|"liabilities";sequence:number}>({tab:"turn",sequence:0});
  const turnPanelRef=useRef<HTMLDivElement>(null);
  const showTurn=()=>{
    setTabRequest(previous=>({tab:"turn",sequence:previous.sequence+1}));
  };
  useEffect(()=>{
    if(tabRequest.tab!=="turn"||tabRequest.sequence===0)return;
    const frame=requestAnimationFrame(()=>{
      const decision=Array.from(document.querySelectorAll<HTMLElement>('.game-room--202 [aria-label="Текущее решение"]'))
        .find(element=>element.getClientRects().length>0);
      decision?.scrollIntoView({block:"start",behavior:"instant"});
    });
    return ()=>cancelAnimationFrame(frame);
  },[tabRequest]);
  const [bankOpen,setBankOpen]=useState(false);
  const [loanAmount,setLoanAmount]=useState(1000);
  const showBank=()=>setBankOpen(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [rolling,setRolling]=useState(false);
  const [dice,setDice]=useState(1);
  const [submission,setSubmission]=useState<PendingCommand202|null>(null);
  const [offersOpen,setOffersOpen]=useState(false);
  const t=state.queue[0];
  const acting=isDecisionActor202(mine,t);
  const canOperate=!busy&&snapshot.game.status==="IN_PROGRESS";
  const enabled=acting&&canOperate;
  const person=(id:string)=>snapshot.players.find(p=>p.id===id);
  const name=(id:string)=>gamePlayerName(person(id));
  const card=t?.slug?snapshot.cards202?.find(c=>c.slug===t.slug):null;
  const title=state.winner?`Победитель: ${name(state.winner)}`:card?.title??(t?taskNames[t.kind]:"Партия завершена");
  useEffect(()=>{setOffersOpen(false);setDice(mine?.track==="FAST_TRACK"?2:1);setError(null);},[t?.id,mine?.track]);
  const current=state.players[state.current]!;
  const activeName=t?.kind==="auction"?"Ожидаем ставки участников":name(t?.playerId??current.id);
  
  const request=async(path:string,body:unknown)=>{
    if(busy)return false;setBusy(true);setError(null);
    try {
      const response=await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${path}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
      const result=await response.json();if(!response.ok)throw new Error(typeof result.message==="string"?result.message:"Не удалось выполнить действие");
      if(result.snapshot)onSnapshot(result.snapshot);else if(result.game)onSnapshot(result);
      return true;
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Не удалось выполнить действие");
      try {const fresh=await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}`,{headers:{Authorization:`Bearer ${token}`}});if(fresh.ok)onSnapshot(await fresh.json());}catch{/* Existing snapshot stays visible until reconnection. */}
      return false;
    }finally{setBusy(false);}
  };
  const command=async(data:PendingCommand202)=>{
    if(busy)return false;
    setSubmission(data);
    if(data.type==="roll")setRolling(true);
    try {return await request("202/command",{revision:state.revision,...(t?{taskId:t.id}:{}),...data});}
    finally {setSubmission(null);if(data.type==="roll")setRolling(false);}
  };
  const decide=(choice:string,extra:Partial<Command202>={})=>void command({type:"decide",choice,...extra});
  const availableOfferKinds=offerKinds202(state,mine,t);
  const visibleOffers=state.offers.filter(offer=>mine&&(offer.from===mine.id||offer.to===mine.id||offer.shares?.[mine.id]));
  const incomingOffer=visibleOffers.some(offer=>mine&&(offer.to===mine.id||offer.shares?.[mine.id])&&!offer.accepted.includes(mine.id));

  const decision = <section className="min-w-0" aria-label="Решение по карточке">
    <div className="mb-3 flex items-center gap-3">
      {person(t?.playerId??current.id)?<GamePlayerMark player={person(t?.playerId??current.id)!} active/>:null}
      <div>
        {!card?<h2 className="text-xl font-extrabold">{title}</h2>:null}
        <p className="text-sm text-muted">{acting?"Ваше решение":activeName}</p>
      </div>
    </div>
    {mine&&t&&(acting||t.kind==="auction"&&mine.track==="RAT_RACE")?<Game202Decisions key={t.id} snapshot={snapshot} player={mine} task={t} disabled={!enabled} submission={submission} onCommand={command} onOpenBank={showBank} {...(availableOfferKinds.length?{onOffer:()=>setOffersOpen(true)}:{})}/>:null}
    {!acting&&t&&t.kind!=="auction"?<p className="text-sm leading-6">Ожидаем решение участника. Финансовый отчёт доступен во вкладке «Игрок».</p>:null}
  </section>;
  const portfolio = <Game202Assets snapshot={snapshot} playerId={selectedPlayer.id}/>;

  const playerAssets=state.assets.filter(asset=>(asset.owners[selectedPlayer.id]??0)>0);
  const assetCount=playerAssets.length+selectedPlayer.stocks.length+selectedPlayer.options.length+selectedPlayer.shorts.length+selectedPlayer.rights.length+selectedPlayer.d2y.length;
  const reportProps={snapshot,playerId:selectedPlayer.id,currentPlayerId:current.id,onOpenBank:showBank,canOpenBank:Boolean(mine&&mine.track==="RAT_RACE")&&snapshot.game.status!=="ENDED"};
  const financial=<Game202PlayerReport {...reportProps} variant="desktop"/>;
  const mobileFinancial=<Game202PlayerReport {...reportProps} variant="mobile"/>;
  const expenses=<Game202Expenses snapshot={snapshot} playerId={selectedPlayer.id}/>;
  const liabilities=<Game202Liabilities snapshot={snapshot} playerId={selectedPlayer.id} canManage={selectedPlayer.id===mine?.id&&canOperate&&mine.track==="RAT_RACE"} onRepay={id=>{
    const loan=mine?.loans.find(item=>item.id===id);
    if(loan)void command({type:"repay",assetId:loan.id,amount:loan.balance});
  }}/>;
  const decisionContents=<div className="space-y-4">
    {error&&!bankOpen?<p role="alert" className="text-sm font-bold text-red-700">{error}</p>:null}
    {t&&t.kind!=="roll"?decision:null}
    {mine?<Game202Offers key={t?.id??"offers"} snapshot={snapshot} player={mine} task={t} open={offersOpen} onClose={()=>setOffersOpen(false)} canOperate={canOperate} submission={submission} onCommand={command}/>:null}
  </div>;
  const currentAction=card?<div data-card-slug={card.slug}>
    <JournalCard {...game202CardContent(card,t?.rule)}/>
    <div className="mt-3">{decisionContents}</div>
  </div>:decisionContents;
  const turn=<>
    {state.winner?<p role="status" className="my-3 rounded-xl bg-success/10 p-3 font-bold">Победитель: {name(state.winner)}</p>:null}
    <Game202History snapshot={snapshot} token={token} viewerPlayerId={me?.id??null} currentActionPlayerId={acting||incomingOffer?mine?.id??null:t?.playerId??current.id} currentAction={t&&t.kind!=="roll"||visibleOffers.length?currentAction:null} {...(card?{currentCardSlug:card.slug}:{})}/>
  </>;
  const history=<Game202History snapshot={snapshot} token={token} viewerPlayerId={me?.id??null} {...(card?{currentCardSlug:card.slug}:{})}/>;
  const canChooseDice=Boolean(mine&&(mine.track==="FAST_TRACK"?mine.fastCharity:mine.permanentCharity||mine.charityUntil>=mine.turns));
  const availableLoan=mine?loanLimit202(state,mine,finances202(state,mine).cashflow):0;
  const obligation=state.queue.find(task=>task.kind==="debt"&&task.playerId===mine?.id);
  const bank=mine?<BankDialog
    open={bankOpen}
    loanAmount={loanAmount}
    availableLoanAmountCents={availableLoan}
    currentCashCents={mine.cash/100}
    currentMonthlyCashflowCents={finances202(state,mine).cashflow/100}
    formatMoney={dollars=>cash(Math.round(dollars*100))}
    onLoanDecrease={()=>setLoanAmount(value=>Math.max(1000,value-1000))}
    onLoanIncrease={()=>setLoanAmount(value=>Math.min(availableLoan,value+1000))}
    onLoanAmountChange={setLoanAmount}
    onTakeLoan={async()=>{if(await command({type:"loan",amount:Math.round(loanAmount*100)}))setBankOpen(false);}}
    canTakeLoan={canOperate&&availableLoan>=1000}
    loanSubmitting={busy}
    onClose={()=>setBankOpen(false)}
    error={error}
    {...(obligation?.loanAllowed?{loanNotice:"Кредит доступен для обязательного платежа. Сумма кратна 1 000 $."}:{})}
    {...(availableLoan===0&&obligation&&!obligation.loanAllowed?{unavailableReason:"Этот убыток нельзя покрыть кредитом. Продайте актив через предложение в карточке или объявите банкротство."}:{})}
    {...(availableLoan===0&&mine.bankrupt?{unavailableReason:"После банкротства новый кредит доступен только для обязательных расходов."}:{})}
  >
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-bold text-red-700">Объявить банкротство</summary>
      <p className="my-3 text-sm leading-6">Недвижимость, акции и опционы будут реализованы банку, остаток банковских кредитов списан. Вы пропустите три своих хода и сможете брать новые кредиты только для обязательных расходов. D2Y и авторские отчисления сохранятся.</p>
      <Button variant="secondary" disabled={!canOperate} onClick={async()=>{if(await command({type:"bankruptcy"}))setBankOpen(false);}}>Подтвердить банкротство</Button>
    </details>
  </BankDialog>:null;
  const feedback=<><span role="status" className="sr-only">{busy?"Сохраняем действие…":""}</span>{error&&!bankOpen&&t?.kind==="roll"?<p role="alert" className="shrink-0 px-3 py-2 text-sm font-bold text-red-700">{error}</p>:null}</>;
  const boardSnapshot:GameSnapshot={
    ...snapshot,
    board:snapshot.board.map(cell=>cell.type==="deal"?{...cell,label:"Возможность"}:cell),
    players:snapshot.players.map(player=>{
      const canonical=state.players.find(candidate=>candidate.id===player.id);
      return canonical?{...player,track:canonical.track,position:canonical.position,fastTrackPosition:canonical.fastPosition}:player;
    })
  };
  const boardSelection=boardSnapshot.players.find(player=>player.id===selectedPlayer.id);
  const turnControls=<MobileTurnDialog
    open={snapshot.game.status==="IN_PROGRESS"||snapshot.game.status==="PAUSED"}
    currentPlayer={person(acting||incomingOffer?mine!.id:t?.playerId??current.id)??null}
    isMine={acting||incomingOffer}
    canRoll={t?.kind==="roll"&&acting&&!busy}
    requiresDecision={acting&&t?.kind!=="roll"||incomingOffer}
    paused={snapshot.game.status==="PAUSED"}
    disabled={!canOperate}
    rolling={rolling}
    phase={rolling?"rolling":"ready"}
    diceValues={Array.from({length:dice},()=>1)}
    diceCount={dice}
    {...(canChooseDice?{diceOptions:[1,2,3],onDiceCountChange:setDice}:{})}
    maxCompactViewportWidth={1023}
    desktopDock
    onShowTurn={showTurn}
    onRoll={()=>void command({type:"roll",quantity:dice})}
    onEnterFastTrack={mine&&t?.kind==="roll"&&acting&&canEscape202(state,mine)?()=>decide("escape"):undefined}
  />;

  if(showFastTrack)return <div className="grid min-w-0 gap-5 text-ink">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{snapshot.game.title} · 202</h1><p className="mt-1 text-sm">{state.winner?`Победитель: ${name(state.winner)}`:snapshot.game.status==="PAUSED"?"Партия на паузе":`Ход ${current.turns} · ${name(current.id)}`}</p></div></header>
    {feedback}
    {bank}
    <div className="max-w-lg">{turnControls}</div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-2"><div className="rounded-2xl bg-card p-4 shadow-panel">{t?.kind==="roll"?decision:currentAction}</div><div className="rounded-2xl bg-white p-4 shadow-panel">{financial}</div></div>
    <section className="min-w-0 rounded-2xl bg-card p-4 shadow-panel sm:p-5" aria-label="Игровое поле 202"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Игровое поле</h2><div className="flex gap-2"><Button variant="secondary" aria-pressed={track==="RAT_RACE"} onClick={()=>onTrackChange("RAT_RACE")}>Малый круг</Button><Button variant="secondary" aria-pressed={track==="FAST_TRACK"} onClick={()=>onTrackChange("FAST_TRACK")}>Большой круг</Button></div></div><ol className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{(track==="RAT_RACE"?snapshot.board:fastTrackCells).map(cell=>{const occupants=state.players.filter(p=>p.track===track&&(track==="RAT_RACE"?p.position:p.fastPosition)===cell.index);const owner=track==="FAST_TRACK"?state.world.owners[cell.index]:null;return <li key={cell.index} className={`min-h-24 rounded-xl p-2 text-xs ${occupants.length?"bg-[#e8eefb] ring-2 ring-journey":"bg-white"}`}><p className="font-bold [overflow-wrap:anywhere]">{cell.index+1}. {track==="RAT_RACE"&&cell.type==="deal"?"Возможность":cell.label}</p><div className="mt-2 flex flex-wrap">{occupants.map(p=>person(p.id)?<GamePlayerMark key={p.id} size="sm" player={person(p.id)!} active={current.id===p.id}/>:null)}</div>{owner&&person(owner)?<div className="mt-2 flex items-center gap-1"><GamePlayerMark size="sm" player={person(owner)!}/><span>Владелец</span></div>:null}</li>;})}</ol><div className="mt-3 flex flex-wrap gap-3">{state.players.filter(p=>p.track===track&&(track==="RAT_RACE"?p.position:p.fastPosition)<0).map(p=><div key={p.id} className="flex items-center gap-2 text-sm">{person(p.id)?<GamePlayerMark size="sm" player={person(p.id)!}/>:null}{name(p.id)} · старт</div>)}</div></section>
    <div className="rounded-2xl bg-white p-4 shadow-panel">{portfolio}</div>
    {history}
  </div>;

  return <div className="game-room game-room--classic-active game-room--202 min-w-0 text-ink">
    {feedback}
    {bank}
    <div className="desktop-game-board-viewport hidden lg:block">
      <RatRaceBoard snapshot={boardSnapshot}>
        <div className="grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-3">
          <RatRaceTabs idPrefix="game202-desktop" variant="desktop" player={financial} assets={portfolio} expenses={expenses} liabilities={liabilities} assetCount={assetCount} liabilityCount={selectedPlayer.loans.length} {...(tabRequest.tab==="liabilities"?{tabRequest}:{})}/>
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-panel" aria-label="Ход и история">
            <div ref={turnPanelRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3" tabIndex={0}>{turn}</div>
            {turnControls}
          </section>
        </div>
      </RatRaceBoard>
    </div>
    <div className="mobile-game-region min-h-0 min-w-0 lg:hidden">
      <RatRaceTabs idPrefix="game202-mobile" board={<RatRaceMobileBoard snapshot={boardSnapshot} selectedPlayer={boardSelection}/>} turn={turn} player={mobileFinancial} assets={portfolio} expenses={expenses} liabilities={liabilities} assetCount={assetCount} liabilityCount={selectedPlayer.loans.length} actionAttention={acting&&t?.kind!=="roll"||incomingOffer} tabRequest={tabRequest}/>
    </div>
  </div>;
}
