"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";

export function CreateSandboxForm({ token }: { token: string }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [gameType, setGameType] = useState<"101" | "202">("101");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${publicApiBaseUrl()}/api/games/sandbox/access`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { if (response.ok) setAllowed(Boolean((await response.json()).allowed)); })
      .catch(() => {});
    return () => controller.abort();
  }, [token]);
  if (!allowed) return null;
  async function create() {
    if (busy) return;
    setBusy(true);setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/games/sandbox`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ gameType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Не удалось создать песочницу");
      router.push(`/games/${data.game.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Нет связи с сервером. Повторите создание."); }
    finally { setBusy(false); }
  }
  return <section className="mb-5 rounded-2xl bg-card p-4 text-ink sm:p-5" aria-labelledby="create-sandbox-title">
    <h2 id="create-sandbox-title" className="flex items-center gap-2 text-lg font-extrabold"><FlaskConical size={20} aria-hidden="true" />Песочница</h2>
    <p className="mt-2 max-w-prose text-sm leading-6">Два игрока под вашим управлением. Выберите карточки, подготовьте активы и проверьте ситуацию на игровом поле.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm font-bold">Режим<select aria-label="Режим песочницы" className="h-11 rounded-xl border border-line bg-white px-3 focus-visible:outline-action" value={gameType} onChange={event => setGameType(event.target.value as "101" | "202")} disabled={busy}><option value="101">101</option><option value="202">202</option></select></label>
      <Button type="button" variant="action" onClick={() => void create()} disabled={busy}>{busy ? "Готовим песочницу…" : "Создать песочницу"}</Button>
    </div>
    {error ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
  </section>;
}
