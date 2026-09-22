"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fastTrackCells } from "@cashflow/shared";
import type { GameSnapshot } from "@/lib/types";
import { boardMove, boardStepDuration } from "./board-movement";

type Move = NonNullable<ReturnType<typeof boardMove>>;

export function useBoardMovement(snapshot: GameSnapshot, track: "RAT_RACE" | "FAST_TRACK", rollingPlayerId?: string, phase?: string) {
  const size = track === "FAST_TRACK" ? fastTrackCells.length : snapshot.board.length;
  const cursor = useRef({ gameId: snapshot.game.id, sequence: Math.max(0, ...snapshot.events.map((event) => event.sequence)) });
  const [moves, setMoves] = useState<Move[]>([]);
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const sequence = Math.max(0, ...snapshot.events.map((event) => event.sequence));
    if (cursor.current.gameId !== snapshot.game.id) {
      cursor.current = { gameId: snapshot.game.id, sequence };
      setMoves([]);
      setStep(0);
      return;
    }
    const added = snapshot.events
      .filter((event) => event.sequence > cursor.current.sequence && (event.payload.track ?? "RAT_RACE") === track)
      .sort((a, b) => a.sequence - b.sequence)
      .map((event) => boardMove(event, size))
      .filter((move): move is Move => Boolean(move));
    cursor.current.sequence = Math.max(cursor.current.sequence, sequence);
    if (added.length) setMoves((current) => [...current, ...added]);
  }, [snapshot.game.id, snapshot.events, track, size]);

  const move = moves[0];
  const holdForDice = move?.playerId === rollingPlayerId && phase === "rolling";
  useEffect(() => {
    if (!move || holdForDice) return;
    if (reduced) { setMoves([]); setStep(0); return; }
    const timer = window.setTimeout(() => {
      if (step < move.positions.length) setStep((value) => value + 1);
      else { setMoves((current) => current.slice(1)); setStep(0); }
    }, step === 0 ? 0 : boardStepDuration);
    return () => window.clearTimeout(timer);
  }, [move, step, holdForDice, reduced]);

  const positions = new Map<string, number>();
  for (const pending of moves) {
    if (!positions.has(pending.playerId)) positions.set(pending.playerId, pending.from);
  }
  if (move) positions.set(move.playerId, move.positions[step - 1] ?? move.from);
  const displayedSnapshot: GameSnapshot = {
    ...snapshot,
    players: snapshot.players.map((player) => player.track === track && positions.has(player.id)
      ? { ...player, [track === "FAST_TRACK" ? "fastTrackPosition" : "position"]: positions.get(player.id)! }
      : player)
  };
  return { positions, movingPlayerId: move?.playerId ?? null, snapshot: displayedSnapshot };
}
