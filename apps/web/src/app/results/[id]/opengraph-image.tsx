import { ImageResponse } from "next/og";
import { publicResult } from "@/lib/results";

export const runtime = "nodejs";
export const alt = "Итоги игры «Финансовое путешествие»";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ResultImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await publicResult(id, true);
  if (!result) {
    return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf2e8", color: "#17243f", fontSize: 54, fontWeight: 800 }}>Финансовое путешествие</div>, size);
  }
  const facts = result.facts;
  const winner = facts.players.find((player) => player.id === facts.winnerGamePlayerId);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf2e8", color: "#17243f", padding: "54px 60px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "#2967df", color: "white", fontSize: 28, fontWeight: 800 }}>ФП</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Финансовое путешествие</span>
            <span style={{ marginTop: 4, color: "#657597", fontSize: 16 }}>{date(facts.endedAt)}</span>
          </div>
        </div>
        <div style={{ display: "flex", borderRadius: 12, background: "#fff0df", color: "#8a3d0a", padding: "12px 18px", fontSize: 18, fontWeight: 800 }}>Итоги игры</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ color: "#2967df", fontSize: 21, fontWeight: 800 }}>{facts.title}</div>
          <div style={{ display: "flex", marginTop: 14, maxWidth: 760, fontSize: 48, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800 }}>{result.headline}</div>
          <div style={{ display: "flex", marginTop: 22, color: "#657597", fontSize: 22, lineHeight: 1.35 }}>
            {winner ? `${winner.mention} · пассивный доход ${money(winner.finalPassiveIncomeCents)}/мес` : facts.highlights[0]?.text ?? "Главные решения партии сохранены."}
          </div>
        </div>
        <div style={{ width: 250, display: "flex", flexDirection: "column", gap: 12, borderRadius: 22, background: "#fff", padding: 24, boxShadow: "0 20px 45px rgba(27,57,118,.12)" }}>
          <Stat label="Игроков" value={String(facts.players.length)} />
          <Stat label="Раундов" value={String(facts.rounds)} />
          <Stat label="Время" value={duration(facts.durationMinutes)} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {facts.players.slice(0, 6).map((player) => (
            <div key={player.id} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 24, background: player.id === facts.winnerGamePlayerId ? "#f98f2f" : "#bbccf3", color: "#17243f", fontSize: 16, fontWeight: 800 }}>{initials(player.name)}</div>
          ))}
        </div>
        <div style={{ color: "#2967df", fontSize: 20, fontWeight: 800 }}>gamefj.ru</div>
      </div>
    </div>,
    size
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#657597", fontSize: 16 }}>{label}</span><strong style={{ fontSize: 25 }}>{value}</strong></div>;
}

function money(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function duration(value: number | null) {
  if (!value) return "—";
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return hours ? `${hours} ч${rest ? ` ${rest} м` : ""}` : `${rest} мин`;
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "И";
}
