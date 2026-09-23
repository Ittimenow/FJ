import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mergeActionEvents, playerActionEvents, playerActionTurns } from './game-action-history.logic';
import type { GameEvent, GamePlayer } from '../../lib/types';
// Shared is a CommonJS workspace; load its runtime exports through the same boundary.
const require = createRequire(import.meta.url);
const { purchasedFastTrackCells, fastTrackCellEffect } = require('./fast-track-presentation') as typeof import('./fast-track-presentation');
const { fastTrackCells } = require('@cashflow/shared') as typeof import('@cashflow/shared');
const players=[{id:'anna',userId:'u1'},{id:'boris',userId:'u2'}] as GamePlayer[];
const event=(sequence:number,type:string,id='anna',payload={}):GameEvent=>({id:`e${sequence}`,sequence,type,payload,createdAt:'2026-09-20T10:00:00Z',gamePlayer:{id,seat:1,role:'PLAYER'}});
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
  assert.deepEqual(all.map(t=>t.events.map(e=>e.sequence)),[[9,8],[6],[5],[3,2],[1]]);
  assert.deepEqual(playerActionTurns(events,players,'anna').map(t=>t.events.map(e=>e.sequence)),[[9,8],[6],[1]]);
});
test('history selects actions of all players, ordered newest first, without administrative or preparation messages',()=>{
  const events=[event(1,'player:joined'),event(2,'player:roll_dice'),event(3,'state:update'),event(4,'fast_track:purchased','boris'),event(5,'game:paused'),event(6,'player:dream_chosen')];
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
test('purchased cards reflect owned businesses, purchased dreams and paid charity, excluding other players',()=>{
  const player={...players[0],financialState:{fastTrackCharity:true}} as GamePlayer;
  const cells=purchasedFastTrackCells(player,{owners:{1:'anna',3:'boris'},dreamPurchases:{0:['anna'],4:['boris']},influence:{}});
  assert.deepEqual(cells.map(c=>c.index),[0,1,7]);
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
