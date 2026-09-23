import { realtimeEvents } from '@cashflow/shared';
import type { GameSnapshot, GameEvent } from '../../apps/web/src/lib/types';

let snapshot: GameSnapshot;
const sockets = new Set<Socket>();

export function setRoomSnapshot(value: GameSnapshot) {
  snapshot = value;
  (window as any).roomSnapshot = value;
  for (const socket of sockets) socket.receive(realtimeEvents.stateUpdate, value);
}

export function addRoomMoves(events: GameEvent[]) {
  setRoomSnapshot({
    ...snapshot,
    events: [...snapshot.events, ...events],
    players: snapshot.players.map(player => {
      const move = [...events].reverse().find(event => event.gamePlayer?.id === player.id);
      return move ? { ...player, [move.payload.track === 'FAST_TRACK' ? 'fastTrackPosition' : 'position']: move.payload.to } : player;
    })
  });
}

export class Socket {
  connected = true;
  io = { on() {} };
  handlers = new Map<string, (value: any) => void>();
  on(event: string, handler: (value: any) => void) { this.handlers.set(event, handler); return this; }
  receive(event: string, value: unknown) { this.handlers.get(event)?.(value); }
  timeout() { return this; }
  connect() { return this; }
  disconnect() { sockets.delete(this); }
  emit(event: string, _payload: unknown, callback?: (error: null, result: unknown) => void) {
    let events: GameEvent[] = [];
    if (event === 'game:start') setRoomSnapshot({ ...snapshot, game: { ...snapshot.game, status: 'IN_PROGRESS' } });
    if (event === realtimeEvents.playerRollDice) {
      const player = snapshot.players.find(player => player.id === snapshot.game.currentPlayerId)!;
      const sequence = Math.max(0, ...snapshot.events.map(event => event.sequence)) + 1;
      const fast = player.track === 'FAST_TRACK';
      const from = fast ? player.fastTrackPosition : player.position;
      const route = [1, 2, 3].map(step => (from + step) % (fast ? 48 : snapshot.board.length));
      const identity = { id: player.id, seat: player.seat, role: player.role };
      events = [
        { id: `roll-${sequence}`, sequence, type: 'player:roll_dice', createdAt: new Date().toISOString(), gamePlayer: identity, payload: { diceValues: fast ? [1, 2] : [3], dice: 3, track: player.track } },
        { id: `move-${sequence}`, sequence: sequence + 1, type: 'player:move', createdAt: new Date().toISOString(), gamePlayer: identity, payload: { from, to: route.at(-1), steps: route.length, track: player.track } }
      ];
      snapshot = { ...snapshot, game: { ...snapshot.game, pendingAction: fast
        ? { type: 'fast_track_choice', gamePlayerId: player.id, cellIndex: 23, decisionId: 'fixture', priceCents: 300000 }
        : { type: 'choose_deal', gamePlayerId: player.id } } };
      addRoomMoves(events);
    }
    callback?.(null, { snapshot, events });
  }
}

export function io() { const socket = new Socket(); sockets.add(socket); return socket; }
