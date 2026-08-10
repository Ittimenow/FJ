import React from "react";
import { ImageResponse } from "next/og";
import { telegramChannelPostCard } from "@/lib/telegram-posts";
import type { TelegramChannelPostCard } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "Итоги финансовых игр";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TelegramPublicationImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await telegramChannelPostCard(id);
  if (!post) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf2e8", color: "#17243f", fontSize: 54, fontWeight: 800 }}>Финансовое путешествие</div>,
      size
    );
  }
  return new ImageResponse(<TelegramPublicationCard post={post} />, size);
}

export function TelegramPublicationCard({ post }: { post: TelegramChannelPostCard }) {
  const facts = post.items.map((item) => item.summary.facts);
  const players = unique(facts.flatMap((item) => item.players.map((player) => player.mention)));
  const rounds = facts.reduce((total, item) => total + item.rounds, 0);
  const winners = unique(facts.flatMap((item) => {
    const winner = item.players.find((player) => player.id === item.winnerGamePlayerId);
    return winner ? [winner.mention] : [];
  }));
  const firstHighlight = facts.flatMap((item) => item.highlights)[0]?.text;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf2e8", color: "#17243f", padding: "52px 60px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "#2967df", color: "white", fontSize: 28, fontWeight: 800 }}>ФП</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Финансовое путешествие</span>
            <span style={{ marginTop: 4, color: "#657597", fontSize: 16 }}>{dateRange(facts.map((item) => item.endedAt))}</span>
          </div>
        </div>
        <div style={{ display: "flex", borderRadius: 12, background: "#fff0df", color: "#8a3d0a", padding: "12px 18px", fontSize: 18, fontWeight: 800 }}>
          {post.kind === "GAME_SERIES" ? "Серия игр" : "Итоги игры"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", maxWidth: 800, fontSize: post.title.length > 72 ? 38 : 46, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800 }}>{post.title}</div>
          <div style={{ display: "flex", marginTop: 20, maxWidth: 790, color: "#657597", fontSize: 21, lineHeight: 1.35 }}>
            {winners.length ? `Финансовой свободы достигли: ${winners.slice(0, 5).join(", ")}` : firstHighlight ?? "Главные решения и результаты сохранены по журналу игры."}
          </div>
        </div>
        <div style={{ width: 250, display: "flex", flexDirection: "column", gap: 13, borderRadius: 16, background: "#fff", padding: 24, boxShadow: "0 20px 45px rgba(27,57,118,.12)" }}>
          <Stat label="Игр" value={String(facts.length)} />
          <Stat label="Участников" value={String(players.length)} />
          <Stat label="Раундов" value={String(rounds)} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {players.slice(0, 8).map((player) => (
            <div key={player} style={{ width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 23, background: "#bbccf3", color: "#17243f", fontSize: 15, fontWeight: 800 }}>{initials(player)}</div>
          ))}
        </div>
        <div style={{ color: "#2967df", fontSize: 20, fontWeight: 800 }}>gamefj.ru</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#657597", fontSize: 16 }}>{label}</span><strong style={{ fontSize: 25 }}>{value}</strong></div>;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function initials(value: string) {
  return value.replace(/^@/, "").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "И";
}

function dateRange(values: string[]) {
  const dates = values.map((value) => new Date(value)).sort((left, right) => left.getTime() - right.getTime());
  const format = (value: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(value);
  if (!dates.length) return "Итоги игр";
  if (dates.length === 1) return format(dates[0]!);
  return `${format(dates[0]!)} — ${format(dates[dates.length - 1]!)}`;
}
