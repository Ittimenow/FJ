"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";
import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer, GameSnapshot } from "@/lib/types";

const DepartureContext = createContext<{
  currentUserId: string;
  canManage: boolean;
  active: boolean;
  open: (player: GamePlayer) => void;
} | null>(null);

export function PlayerDepartureButton({ player }: { player: GamePlayer }) {
  const context = useContext(DepartureContext);
  if (!context?.active || player.status !== "JOINED" || player.role !== "PLAYER") return null;
  const own = player.userId === context.currentUserId && player.controller !== "BOT";
  if (!own && !context.canManage) return null;
  return <Button variant="ghost" className="mt-3 h-auto min-h-11 max-w-full whitespace-normal text-left text-xs font-medium text-muted" onClick={() => context.open(player)}>
    {own ? "Самовыпилиться из жизни" : "Выпилить"}
  </Button>;
}

export function PlayerDepartureProvider({ snapshot, token, currentUserId, canManage, onSnapshot, children }: {
  snapshot: GameSnapshot; token: string; currentUserId: string; canManage: boolean;
  onSnapshot: (snapshot: GameSnapshot) => void; children: ReactNode;
}) {
  const [target, setTarget] = useState<GamePlayer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId(), descriptionId = useId();
  const own = target?.userId === currentUserId && target?.controller !== "BOT";
  const active = snapshot.game.status === "IN_PROGRESS" || snapshot.game.status === "PAUSED";
  useEffect(() => {
    if (!target) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancel.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [target]);
  useEffect(() => {
    if (target && (!active || snapshot.players.find(p => p.id === target.id)?.status !== "JOINED")) setTarget(null);
  }, [active, snapshot.players, target]);
  const close = () => { if (!submitting.current) setTarget(null); };
  const confirm = async () => {
    if (!target || submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const path = own ? "leave" : `players/${target.id}/expel`;
      const response = await fetch(`${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${path}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Не удалось завершить участие");
      onSnapshot(result.snapshot); setTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось завершить участие"); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <DepartureContext.Provider value={{ currentUserId, canManage, active, open: player => { setError(null); setTarget(player); } }}>
    {children}
    {target && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4" style={{ top: "var(--app-shell-header-bottom, var(--game-header-height))" }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
          className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 text-ink shadow-panel"
          onKeyDown={event => {
            if (event.key === "Escape") close();
            if (event.key === "Tab") {
              const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
              event.preventDefault(); const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
              buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
            }
          }}>
          <h2 id={titleId} className="break-words text-xl font-extrabold">{own ? `${gamePlayerName(target)} точно хочешь выпилиться из жизни?` : `Выпилить игрока ${gamePlayerName(target)}?`}</h2>
          <p id={descriptionId} className="mt-3 text-sm text-muted">Участие в этой партии завершится без возможности вернуться. Остальные игроки продолжат игру.</p>
          {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button ref={cancel} type="button" onClick={close} disabled={busy} className="min-h-11 rounded-xl px-4 text-sm text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-action disabled:opacity-50">Я передумал</button>
            <Button variant="danger" disabled={busy} onClick={() => void confirm()}>{busy ? "Завершаем участие…" : own ? "Выпилиться" : "Выпилить"}</Button>
          </div>
        </div>
      </div>, document.body) : null}
  </DepartureContext.Provider>;
}
