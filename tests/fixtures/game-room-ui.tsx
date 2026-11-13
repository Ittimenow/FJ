import React, { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { GameRoom } from '../../apps/web/src/components/game/game-room';
import { AppShell } from '../../apps/web/src/components/layout/app-shell';
import { GameRoomHeaderProvider } from '../../apps/web/src/components/layout/game-room-header-context';
import type { GameSnapshot } from '../../apps/web/src/lib/types';
import { addRoomMoves, setRoomSnapshot } from './socket';

export function GameRoomFixture({ snapshot }: { snapshot: GameSnapshot }) {
  const [initialSnapshot] = useState(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view') === 'journey' ? 'journey' : 'classic';
    const game: GameSnapshot['game'] = {
      id: snapshot.game.id,
      title: 'Проверка игровой комнаты',
      code: 'DEMO',
      mode: 'SOLO',
      createdById: 'admin',
      status: params.get('status') === 'WAITING' ? 'WAITING' : 'IN_PROGRESS',
      gameType: '101',
      gameTypeSelected: true,
      cardSet: { id: 'fixture-101', name: 'Тестовый 101' },
      maxPlayers: 6,
      isPublic: false,
      scheduledAt: null,
      scheduleTimeZone: null,
      startedAt: null,
      endedAt: null,
      timeLimitMinutes: null,
      currentPeriod: 1,
      periodCount: 3,
      periodDeadlineAt: null,
      deadlineAt: null,
      remainingPeriodSeconds: null,
      pauseReason: null,
      pausedAt: null,
      currentPlayerId: snapshot.game.currentPlayerId,
      currentRound: snapshot.game.currentRound,
      currentTurnIndex: snapshot.game.currentTurnIndex,
      rulesVersion: snapshot.game.rulesVersion,
      isTest: snapshot.game.isTest,
      fastTrackWorld: snapshot.game.fastTrackWorld,
      pendingAction: null,
    };
    return {
      ...snapshot,
      chatMessages: [],
      events: [],
      game,
      players: snapshot.players.map((player, index) => ({ ...player, track: params.has('allFast') || (index === 1 && params.has('fast')) ? 'FAST_TRACK' : 'RAT_RACE', position: index === 1 ? 22 : 0, userId: index === 1 && params.has("multiplayer") ? "second-user" : player.userId, user: player.user ? { ...player.user, gameRoomView: view } : index === 1 && params.has("multiplayer") ? { id: "second-user", displayName: "Борис", gameRoomView: view } : null }))
    } as GameSnapshot;
  });
  const [version, setVersion] = useState(0);
  const [restored, setRestored] = useState(initialSnapshot);
  useEffect(() => {
    setRoomSnapshot(initialSnapshot);
    const update = (event: Event) => setRoomSnapshot((event as CustomEvent).detail);
    const moves = (event: Event) => addRoomMoves((event as CustomEvent).detail);
    const restore = () => { setRestored((window as any).roomSnapshot); setVersion(value => value + 1); };
    window.addEventListener('fixture:room-update', update);
    window.addEventListener('fixture:room-moves', moves);
    window.addEventListener('fixture:room-remount', restore);
    document.documentElement.dataset.roomReady = 'true';
    return () => {
      window.removeEventListener('fixture:room-update', update);
      window.removeEventListener('fixture:room-moves', moves);
      window.removeEventListener('fixture:room-remount', restore);
      delete document.documentElement.dataset.roomReady;
    };
  }, [initialSnapshot]);
  return <SessionProvider session={null}><GameRoomHeaderProvider><AppShell userName="Анна" gameViewportMode={initialSnapshot.game.status === 'WAITING' ? null : initialSnapshot.players[0]!.user!.gameRoomView}>
    <GameRoom key={version} initialSnapshot={restored} token="fixture" currentUserId={new URLSearchParams(location.search).get("viewer") ?? "admin"} currentUserRole="ADMIN" gameRoomView={initialSnapshot.players[0]!.user!.gameRoomView ?? 'classic'} timeZone={null} />
  </AppShell></GameRoomHeaderProvider></SessionProvider>;
}
