import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import type { Task202 } from "@cashflow/shared";
import { isDecisionActor202, loanLimit202, offerKinds202 } from "./game-202-actions";

const require=createRequire(import.meta.url);
const {newGame202}=require("@cashflow/shared") as typeof import("@cashflow/shared");

function fixture() {
  const state=newGame202(["one","two"].map(id=>({id,salary:1000,passive:0,expenses:300,savings:1000,childCost:100,dream:0,loans:[]})),()=>0);
  const player=state.players[0]!;
  state.assets=[{id:"asset",name:"Дом",source:"starter",kind:"property",owners:{[player.id]:10000},cost:1000000,mortgage:500000,down:500000,income:10000,units:2,acres:0,house:false,lockedUntil:{}}];
  player.rights=[{id:"right",cost:100000,order:1}];
  return {state,player};
}

test("negotiations appear only in the participant's pending card",()=>{
  const {state,player}=fixture();
  for(const kind of ["roll","choose","escape","fast"] as const) {
    assert.deepEqual(offerKinds202(state,player,{id:kind,kind,playerId:player.id}),[]);
  }
  assert.deepEqual(offerKinds202(state,player,{id:"quote",kind:"quote",playerId:"two"}),[]);
  assert.deepEqual(offerKinds202(state,player,{id:"quote",kind:"quote",playerId:player.id}),["asset","right"]);
});

test("card negotiations expose only transfers supported by the current rule",()=>{
  const {state,player}=fixture();
  const property={kind:"property" as const,cost:10000,mortgage:5000,down:5000,income:100,units:2,acres:0,house:false};
  const task:Task202={id:"deal",kind:"deal",playerId:player.id,rule:property};
  assert.deepEqual(offerKinds202(state,player,task),["asset","right","opportunity","joint"]);
  task.rule={kind:"exchange",units:2,property};
  assert.deepEqual(offerKinds202(state,player,task),["asset","right","opportunity"]);
  task.rule={kind:"option",side:"call",symbol:"MYT4U",premium:1,strike:10};
  assert.deepEqual(offerKinds202(state,player,task),["asset","right"]);
  player.cash=-1;
  state.assets[0]!.lockedUntil[player.id]=player.laps+1;
  assert.deepEqual(offerKinds202(state,player,{id:"debt",kind:"debt",playerId:player.id}),[]);
});

test("auction participants stop receiving a decision after their bid",()=>{
  const {player}=fixture();
  const task:Task202={id:"auction",kind:"auction",playerId:player.id,candidates:[player.id,"two"],bids:{}};
  assert.equal(isDecisionActor202(player,task),true);
  task.bids![player.id]=100;
  assert.equal(isDecisionActor202(player,task),false);
  task.playerId="two";delete task.bids![player.id];
  assert.equal(isDecisionActor202(player,task),true);
});

test("bank limits preserve cents, mandatory-payment exceptions and post-bankruptcy restrictions",()=>{
  const {state,player}=fixture();
  assert.equal(loanLimit202(state,player,19999),1000);
  assert.equal(loanLimit202(state,player,9999),0);
  state.queue=[{id:"debt",kind:"debt",playerId:player.id,loanAllowed:false}];
  assert.equal(loanLimit202(state,player,999999),0);
  state.queue[0]!.loanAllowed=true;
  assert.equal(loanLimit202(state,player,0),100000000);
  player.bankrupt=true;player.cash=-100001;
  assert.equal(loanLimit202(state,player,0),2000);
  player.cash=-10000000001;
  assert.equal(loanLimit202(state,player,0),100000000);
  state.queue=[];
  assert.equal(loanLimit202(state,player,999999),0);
});
