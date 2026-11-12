import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { compactTurnMovement, importantActionEventIds, mergeActionEvents, playerActionEvents, playerActionTurns } from './game-action-history.logic';
import type { GameEvent, GamePlayer } from '../../lib/types';
// Shared is a CommonJS workspace; load its runtime exports through the same boundary.
const require = createRequire(import.meta.url);
const { purchasedFastTrackCells, fastTrackCellEffect } = require('./fast-track-presentation') as typeof import('./fast-track-presentation');
const { fastTrackCells } = require('@cashflow/shared') as typeof import('@cashflow/shared');
const players=[{id:'anna',userId:'u1'},{id:'boris',userId:'u2'}] as GamePlayer[];
const event=(sequence:number,type:string,id='anna',payload={}):GameEvent=>({id:`e${sequence}`,sequence,type,payload,createdAt:'2026-09-20T10:00:00Z',gamePlayer:{id,seat:1,role:'PLAYER'}});

test('202 turns retain the owner while grouping every other participant and simultaneous skips', () => {
  const row = (sequence:number, id:string, key:string, owner:string, kind:string) => event(sequence,'game202:action',id,{turnKey:key,turnOwnerGamePlayerId:owner,kind,revision:7,track:'RAT_RACE'});
  const events = [
    row(1,'anna','anna:1','anna','turn_started'), row(2,'boris','anna:1','anna','command'),
    row(3,'anna','anna:1','anna','command'), row(4,'anna','anna:1','anna','turn_ended'),
    row(5,'boris','boris:1','boris','turn_started'), row(6,'boris','boris:1','boris','turn_skipped'), row(7,'boris','boris:1','boris','turn_ended'),
    row(8,'anna','anna:2','anna','turn_started')
  ];
  const turns=playerActionTurns(events,players,null,false,'anna');
  assert.deepEqual(turns.map(turn=>[turn.player.id,turn.turnKey,turn.complete]),[['anna','anna:2',false],['boris','boris:1',true],['anna','anna:1',true]]);
  assert.deepEqual(turns[2]?.events.map(item=>item.sequence),[3]);
  assert.deepEqual(turns[2]?.otherActions.flatMap(group=>group.events.map(item=>item.sequence)),[2]);
  assert.deepEqual(turns[2]?.timeline?.map(item=>item.sequence),[2,3]);
  assert.deepEqual(turns[1]?.events.map(item=>item.sequence),[6]);
});

test('202 replay pages merge by explicit turn identity even when the turn start is not loaded', () => {
  const row=(sequence:number,id:string)=>event(sequence,'game202:action',id,{turnKey:'anna:4',turnOwnerGamePlayerId:'anna',kind:'command',revision:sequence});
  const recent=[row(91,'boris'),row(92,'anna')];
  const earlier=[event(81,'game202:action','anna',{turnKey:'anna:4',turnOwnerGamePlayerId:'anna',kind:'turn_started'}),row(82,'anna')];
  const before=playerActionTurns(recent,players,null,false,'boris');
  const after=playerActionTurns(mergeActionEvents(recent,earlier),players,null,false,'boris');
  assert.equal(before[0]?.id,after[0]?.id);
  assert.equal(after[0]?.player.id,'anna');
  assert.deepEqual(after[0]?.events.map(item=>item.sequence),[82,92]);
  assert.deepEqual(after[0]?.otherActions[0]?.events.map(item=>item.sequence),[91]);
});

test('202 owner actions are oldest first and each other participant gets one ordered group below', () => {
  const people=[...players,{id:'vera',userId:'u3'}] as GamePlayer[];
  const row=(sequence:number,id:string)=>event(sequence,'game202:action',id,{turnKey:'anna:4',turnOwnerGamePlayerId:'anna',kind:'command',revision:sequence});
  const input=[row(7,'anna'),row(6,'boris'),row(5,'vera'),row(4,'anna'),row(3,'boris'),row(2,'anna'),row(1,'anna')];
  const turn=playerActionTurns(input,people)[0]!;
  assert.deepEqual(turn.events.map(item=>item.sequence),[1,2,4,7]);
  assert.deepEqual(turn.otherActions.map(group=>[group.player.id,group.events.map(item=>item.sequence)]),[['boris',[3,6]],['vera',[5]]]);
  assert.deepEqual(input.map(item=>item.sequence),[7,6,5,4,3,2,1]);
});

test('202 old text and preparation never masquerade as reconstructed turns', () => {
  const events=[
    event(1,'game202:action','anna',{text:'Кубики: 6',revision:1}),
    event(2,'game202:action','boris',{text:'Пропущен ход',revision:1}),
    event(3,'game202:action','anna',{text:'Получен стартовый портфель',kind:'setup'}),
    event(4,'game202:action','boris',{turnKey:'anna:2',turnOwnerGamePlayerId:'anna',kind:'command'}),
    event(5,'player:escaped_rat_race','anna',{gameType:'202'})
  ];
  const turns=playerActionTurns(events,players,null,false,'boris');
  assert.equal(turns.length,1);
  assert.equal(turns[0]?.player.id,'anna');
  assert.deepEqual(playerActionEvents(events,players).map(item=>item.sequence),[5,4]);
});
test('a roll and the resulting move occupy one history entry without losing other events',()=>{
  const events=[event(5,'deal:buy'),event(4,'player:move'),event(3,'player:roll_dice'),event(2,'loan:take')];
  const compact=compactTurnMovement(events);
  assert.deepEqual(compact.map(({event,roll})=>[event.id,roll?.id]),[['e5',undefined],['e4','e3'],['e2',undefined]]);
  assert.deepEqual(compactTurnMovement([event(4,'player:move'),event(3,'player:roll_dice','boris')]).map(({roll})=>roll?.id),[undefined,undefined]);
});
test('an unfinished turn updates in place with newest actions first for every viewer',()=>{
  const start=[event(1,'loan:take'),event(2,'player:roll_dice'),event(3,'player:move')];
  const before=playerActionTurns(start,players);
  const after=playerActionTurns(mergeActionEvents(start,[event(4,'card:draw'),event(5,'deal:buy')]),players);
  assert.equal(before.length,1);assert.equal(after.length,1);
  assert.equal(before[0]?.id,after[0]?.id);
  assert.deepEqual(after[0]?.events.map(e=>e.sequence),[5,4,3,2,1]);
});
test('own-action filtering preserves turn boundaries and groups other players market decisions',()=>{
  const events=[event(1,'player:roll_dice'),event(2,'market:sale_offer','boris'),event(3,'market:sale_declined','boris'),event(4,'state:update','anna',{reason:'market_sale_declined_turn_ended'}),event(5,'player:roll_dice','boris'),event(6,'loan:repay'),event(7,'state:update','anna',{reason:'roll_resolved'}),event(8,'player:roll_dice'),event(9,'deal:buy')];
  const all=playerActionTurns(events,players);
  assert.deepEqual(all.map(t=>t.events.map(e=>e.sequence)),[[9,8],[5],[1]]);
  assert.deepEqual(all.map(t=>t.otherActions.flatMap(g=>g.events.map(e=>e.sequence))),[[],[6],[2,3]]);
  assert.deepEqual(all.map(t=>t.player.id),['anna','boris','anna']);
  const mine=playerActionTurns(events,players,'anna');
  assert.deepEqual(mine.map(t=>t.events.map(e=>e.sequence)),[[9,8],[],[1]]);
  assert.deepEqual(mine[1]?.otherActions[0]?.events.map(e=>e.sequence),[6]);
});
test('actions before the roll belong to the upcoming turn and retain their authors',()=>{
  const before = [event(1,'loan:repay','boris'),event(2,'loan:take')];
  const pending = playerActionTurns(before,players,null,false,'anna');
  const rolled = playerActionTurns([...before,event(3,'player:roll_dice')],players,null,false,'anna');
  assert.equal(pending.length,1); assert.equal(rolled.length,1);
  assert.equal(pending[0]?.id,rolled[0]?.id);
  assert.equal(rolled[0]?.player.id,'anna');
  assert.deepEqual(rolled[0]?.events.map(e=>e.sequence),[3,2]);
  assert.deepEqual(rolled[0]?.otherActions[0]?.events.map(e=>e.sequence),[1]);
});
test('a large-track turn includes a small-track players loan and property sale at the bottom',()=>{
  const events=[event(1,'player:roll_dice','anna',{track:'FAST_TRACK'}),event(2,'player:move','anna',{track:'FAST_TRACK'}),event(3,'loan:repay','boris'),event(4,'deal:sell','boris')];
  const turns=playerActionTurns(events,players,null,true,'anna');
  assert.equal(turns.length,1);
  assert.deepEqual(turns[0]?.events.map(e=>e.sequence),[2,1]);
  assert.equal(turns[0]?.otherActions[0]?.player?.id,'boris');
  assert.deepEqual(turns[0]?.otherActions[0]?.events.map(e=>e.sequence),[3,4]);
});
test('a small-track player action appears before the active large-track player rolls',()=>{
  const currentPlayers=players.map(player=>({...player,track:player.id==='anna'?'FAST_TRACK':'RAT_RACE'})) as GamePlayer[];
  const before=[event(1,'loan:repay','boris')];
  const pending=playerActionTurns(before,currentPlayers,null,true,'anna');
  const rolled=playerActionTurns([...before,event(2,'player:roll_dice','anna',{track:'FAST_TRACK'})],currentPlayers,null,true,'anna');
  assert.equal(pending.length,1);
  assert.equal(pending[0]?.player.id,'anna');
  assert.deepEqual(pending[0]?.otherActions[0]?.events.map(e=>e.sequence),[1]);
  assert.equal(pending[0]?.id,rolled[0]?.id);
});
test('history selects actions of all players, ordered newest first, without administrative or preparation messages',()=>{
  const events=[event(1,'player:joined'),event(2,'player:roll_dice'),event(3,'state:update'),event(4,'fast_track:purchased','boris'),event(5,'game:paused'),event(6,'player:dream_chosen'),event(7,'player:fast_track_ready')];
  assert.deepEqual(playerActionEvents(events,players).map(e=>e.sequence),[4,2]);
});
test('replay overlap and repeated snapshots preserve every action once',()=>{
  const fresh=event(3,'player:move','anna',{position:7});
  const result=mergeActionEvents([event(3,'player:move'),event(4,'player:roll_dice')],[event(1,'player:roll_dice'),fresh]);
  assert.deepEqual(result.map(e=>e.sequence),[4,3,1]);assert.equal(result[1]?.payload.position,7);
});
test('history identifies actions with only a payload player id or an actor user id',()=>{
  const payloadEvent={...event(2,'baby:gift'),gamePlayer:null,payload:{senderGamePlayerId:'boris'}};
  const actorEvent={...event(1,'player:roll_dice'),gamePlayer:null,actor:{id:'u1',displayName:'Анна'}};
  assert.deepEqual(playerActionEvents([payloadEvent,actorEvent],players).map(e=>e.sequence),[2,1]);
});
test('important history includes own actions, gifts received, and an open chance to congratulate', () => {
  const participants = players.map((player) => ({ ...player, controller: 'HUMAN', status: 'JOINED' })) as GamePlayer[];
  const events = [
    event(1, 'player:roll_dice', 'boris'),
    event(2, 'player:baby', 'boris'),
    event(3, 'loan:take', 'anna'),
    event(4, 'player:baby_gift', 'boris', { senderGamePlayerId: 'boris', recipientGamePlayerId: 'anna', birthEventId: 'e0' })
  ];
  const important = importantActionEventIds(events, participants, 'anna', 'IN_PROGRESS');
  assert.deepEqual([...important].sort(), ['e2', 'e3', 'e4']);
  const turns = playerActionTurns(events, participants, 'anna', false, 'boris', important);
  assert.deepEqual(turns[0]?.events.map((item) => item.id), ['e4', 'e2']);
  assert.deepEqual(turns[0]?.otherActions.flatMap((group) => group.events.map((item) => item.id)), ['e3']);
});
test('important history stops offering a congratulation after a gift or its turn window', () => {
  const participants = players.map((player) => ({ ...player, controller: 'HUMAN', status: 'JOINED' })) as GamePlayer[];
  const birth = event(1, 'player:baby', 'boris');
  const gift = event(2, 'player:baby_gift', 'anna', { senderGamePlayerId: 'anna', recipientGamePlayerId: 'boris', birthEventId: birth.id });
  assert.equal(importantActionEventIds([birth, gift], participants, 'anna', 'IN_PROGRESS').has(birth.id), false);
  assert.equal(importantActionEventIds([birth], participants, 'anna', 'ENDED').has(birth.id), false);
  const expired = [birth, ...[2, 3, 4, 5].map((sequence) => event(sequence, 'player:roll_dice', 'boris'))];
  assert.equal(importantActionEventIds(expired, participants, 'anna', 'IN_PROGRESS').has(birth.id), false);
});
test('important history includes another player changing the price of the viewers dream', () => {
  const participants = players.map((player) => ({ ...player, dreamCellIndex: player.id === 'anna' ? 12 : 8 })) as GamePlayer[];
  const dream = event(1, 'fast_track:dream_influence', 'boris', { cellIndex: 12 });
  assert.equal(importantActionEventIds([dream], participants, 'anna', 'IN_PROGRESS').has(dream.id), true);
});
test('purchased cards reflect owned businesses, purchased dreams and paid charity, excluding other players',()=>{
  const player={...players[0],financialState:{fastTrackCharity:true}} as GamePlayer;
  const cells=purchasedFastTrackCells(player,{owners:{1:'anna',3:'boris'},dreamPurchases:{0:['anna'],4:['boris']},influence:{}});
  assert.deepEqual(cells.map(c=>c.index),[0,1,7]);
  const afterResale=purchasedFastTrackCells(player,{owners:{1:'boris'},dreamPurchases:{0:['anna','boris']},influence:{}});
  assert.deepEqual(afterResale.map(c=>c.index),[7]);
  assert.equal(purchasedFastTrackCells({...player,financialState:null},{owners:{},dreamPurchases:{},influence:{}}).length,0);
});
test('cell effects expose payout thresholds and losses without a separate detail panel',()=>{
  assert.match(fastTrackCellEffect(fastTrackCells[23]!)!,/4–6/);
  assert.match(fastTrackCellEffect(fastTrackCells[29]!)!,/при 6$/);
  assert.equal(fastTrackCellEffect(fastTrackCells[15]!), '−50% наличных');
  assert.equal(fastTrackCellEffect(fastTrackCells[0]!),null);
});

test('large-track history excludes earlier small-track actions of players who have since moved to the large track', () => {
  const events = [
    event(1, 'player:roll_dice'), event(2, 'turn:skipped'),
    event(3, 'player:escaped_rat_race'), event(4, 'turn:skipped'),
    event(5, 'player:roll_dice', 'anna', { track: 'FAST_TRACK' }),
    event(6, 'player:move', 'anna', { track: 'FAST_TRACK' }),
    event(7, 'fast_track:purchased', 'boris'), event(8, 'player:move', 'boris', { track: 'RAT_RACE' }),
    event(9, 'state:update'), event(10, 'game:ended'), event(11, 'player:dream_chosen')
  ];
  const currentPlayers = players.map(player => ({ ...player, track: 'FAST_TRACK' as const }));
  assert.deepEqual(playerActionEvents(events, currentPlayers, null, true).map(event => event.sequence), [7, 6, 5, 4, 3]);
  assert.deepEqual(playerActionEvents(events, currentPlayers, 'boris', true).map(event => event.sequence), [7]);
});

test('skipped turns are assigned to the large track even when the entry event is outside the loaded history', () => {
  const currentPlayers = [{ ...players[0], financialState: { escapedRatRaceAt: '2026-09-20T10:00:00Z' } }] as GamePlayer[];
  const events = [
    { ...event(1, 'turn:skipped'), createdAt: '2026-09-20T09:59:59Z' },
    { ...event(2, 'turn:skipped'), createdAt: '2026-09-20T10:01:00Z' }
  ];
  assert.deepEqual(playerActionEvents(events, currentPlayers, null, true).map(event => event.sequence), [2]);
});
