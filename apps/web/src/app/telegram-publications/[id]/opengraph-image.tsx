import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import React from "react";
import { telegramChannelPostCard } from "@/lib/telegram-posts";
import type { TelegramChannelPostCard } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "Итоги финансовых игр";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type SummaryPlayer = TelegramChannelPostCard["items"][number]["summary"]["facts"]["players"][number];
type PublicationPlayer = SummaryPlayer & { winner: boolean };
type FigurineSources = Record<string, string>;

export default async function TelegramPublicationImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await telegramChannelPostCard(id);
  if (!post) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf2e8", color: "#17243f", fontSize: 54, fontWeight: 800 }}>Финансовое путешествие</div>,
      size
    );
  }
  const figurineSources = await loadPublicationFigurines(post);
  return new ImageResponse(<TelegramPublicationCard post={post} figurineSources={figurineSources} />, size);
}

export function TelegramPublicationCard({
  post,
  figurineSources = {}
}: {
  post: TelegramChannelPostCard;
  figurineSources?: FigurineSources;
}) {
  const facts = post.items.map((item) => item.summary.facts);
  const players = publicationPlayers(post);
  const visiblePlayers = players.slice(0, 8);
  const rounds = facts.reduce((total, item) => total + item.rounds, 0);
  const winners = players.filter((player) => player.winner).map((player) => player.mention);
  const firstHighlight = facts.flatMap((item) => item.highlights)[0]?.text;
  const supportingText = winners.length
    ? `Финансовой свободы достигли: ${winners.slice(0, 4).join(", ")}`
    : firstHighlight ?? "Главные решения и результаты сохранены по журналу игры.";
  const titleSize = post.title.length > 92 ? 36 : post.title.length > 68 ? 41 : 47;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", background: "#faf2e8", color: "#17243f", padding: "42px 54px", fontFamily: "Manrope, Arial, sans-serif" }}>
      <div style={{ position: "absolute", top: -96, right: -72, width: 330, height: 330, display: "flex", borderRadius: 165, background: "#e8effe" }} />
      <div style={{ position: "absolute", top: 118, right: 54, width: 130, height: 18, display: "flex", borderRadius: 9, background: "#bbccf3", transform: "rotate(-7deg)" }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 15, background: "#2967df", color: "#ffffff", fontSize: 27, fontWeight: 800, boxShadow: "0 10px 28px rgba(41,103,223,.25)" }}>ФП</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Финансовое путешествие</span>
            <span style={{ marginTop: 3, color: "#657597", fontSize: 15 }}>{dateRange(facts.map((item) => item.endedAt))}</span>
          </div>
        </div>
        <div style={{ display: "flex", borderRadius: 12, background: "#fff0df", color: "#8a3d0a", padding: "11px 17px", fontSize: 17, fontWeight: 800 }}>
          {post.kind === "GAME_SERIES" ? "Серия игр" : "Итоги игры"}
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", marginTop: 28, width: 930 }}>
        <div style={{ display: "flex", fontSize: titleSize, lineHeight: 1.04, letterSpacing: "-0.035em", fontWeight: 800 }}>{post.title}</div>
        <div style={{ display: "flex", marginTop: 15, maxWidth: 850, color: "#526487", fontSize: 19, lineHeight: 1.3 }}>{supportingText}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 18, color: "#17243f", fontSize: 17 }}>
          <Fact value={facts.length} label={plural(facts.length, "игра", "игры", "игр")} />
          <Separator />
          <Fact value={players.length} label={plural(players.length, "участник", "участника", "участников")} />
          <Separator />
          <Fact value={rounds} label={plural(rounds, "раунд", "раунда", "раундов")} />
        </div>
      </div>

      <div style={{ position: "absolute", left: 54, right: 54, bottom: 42, height: 184, display: "flex", alignItems: "center", borderRadius: 26, background: "#102a5c", padding: "20px 24px", boxShadow: "0 20px 45px rgba(27,57,118,.18)" }}>
        <div style={{ width: 134, display: "flex", flexDirection: "column", alignSelf: "stretch", justifyContent: "center" }}>
          <span style={{ color: "#ffffff", fontSize: 24, fontWeight: 800 }}>Играли</span>
          <span style={{ marginTop: 7, color: "#bbccf3", fontSize: 14, lineHeight: 1.35 }}>
            {players.length > visiblePlayers.length ? `На карточке ${visiblePlayers.length} из ${players.length}` : `${players.length} ${plural(players.length, "участник", "участника", "участников")}`}
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "100%" }}>
          {visiblePlayers.map((player) => (
            <PlayerPiece key={player.mention} player={player} source={player.figurine ? figurineSources[player.figurine] : undefined} />
          ))}
        </div>

        <div style={{ width: 118, display: "flex", alignSelf: "stretch", alignItems: "flex-end", justifyContent: "flex-end", color: "#ffffff", fontSize: 17, fontWeight: 800 }}>gamefj.ru</div>
      </div>
    </div>
  );
}

function PlayerPiece({ player, source }: { player: PublicationPlayer; source?: string | undefined }) {
  const figureSize = player.winner ? 88 : 74;
  return (
    <div style={{ width: 96, height: 144, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ height: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        {source ? (
          <img src={source} width={figureSize} height={figureSize} alt="" style={{ objectFit: "contain", filter: "drop-shadow(0 9px 8px rgba(4,15,38,.32))" }} />
        ) : (
          <div style={{ width: figureSize - 10, height: figureSize - 10, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: (figureSize - 10) / 2, background: "#bbccf3", color: "#17243f", fontSize: 18, fontWeight: 800, boxShadow: "0 9px 18px rgba(4,15,38,.26)" }}>{initials(player.name)}</div>
        )}
      </div>
      <div style={{ width: player.winner ? 66 : 54, height: 7, display: "flex", marginTop: -2, borderRadius: 4, background: player.winner ? "#f5aa24" : "#2967df", boxShadow: "0 5px 10px rgba(4,15,38,.32)" }} />
      <span style={{ display: "flex", marginTop: 8, maxWidth: 94, color: "#ffffff", fontSize: 13, fontWeight: 800, textAlign: "center" }}>{shortName(player.mention)}</span>
      <span style={{ display: "flex", marginTop: 2, color: player.winner ? "#f5d071" : "#8fa7db", fontSize: 10, fontWeight: 700 }}>{player.winner ? "Победитель" : "Игрок"}</span>
    </div>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}><strong style={{ fontSize: 24 }}>{value}</strong><span style={{ color: "#657597" }}>{label}</span></span>;
}

function Separator() {
  return <span style={{ width: 5, height: 5, display: "flex", margin: "0 15px", borderRadius: 3, background: "#f98f2f" }} />;
}

function publicationPlayers(post: TelegramChannelPostCard): PublicationPlayer[] {
  const players = new Map<string, PublicationPlayer>();
  for (const item of post.items) {
    const winnerId = item.summary.facts.winnerGamePlayerId;
    for (const player of item.summary.facts.players) {
      const key = player.mention.trim().toLocaleLowerCase("ru-RU");
      const existing = players.get(key);
      const winner = player.id === winnerId || existing?.winner === true;
      players.set(key, {
        ...(existing ?? player),
        figurine: player.figurine ?? existing?.figurine ?? null,
        winner
      });
    }
  }
  return [...players.values()].sort((left, right) => Number(right.winner) - Number(left.winner));
}

export async function loadPublicationFigurines(post: TelegramChannelPostCard): Promise<FigurineSources> {
  const ids = unique(publicationPlayers(post).slice(0, 8).map((player) => player.figurine ?? "")).filter(isSafeFigurineId);
  const publicDirectory = path.basename(process.cwd()) === "web"
    ? path.join(process.cwd(), "public")
    : path.join(process.cwd(), "apps", "web", "public");
  const sources: FigurineSources = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const image = await readFile(path.join(publicDirectory, "figurines", `${id}.png`));
      sources[id] = `data:image/png;base64,${image.toString("base64")}`;
    } catch {
      // The player still renders with initials if a known asset is unavailable.
    }
  }));
  return sources;
}

function isSafeFigurineId(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function initials(value: string) {
  return value.replace(/^@/, "").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "И";
}

function shortName(value: string) {
  const clean = value.trim();
  return clean.length > 13 ? `${clean.slice(0, 12)}…` : clean;
}

function plural(value: number, one: string, few: string, many: string) {
  const rest100 = value % 100;
  const rest10 = value % 10;
  if (rest100 >= 11 && rest100 <= 19) return many;
  if (rest10 === 1) return one;
  if (rest10 >= 2 && rest10 <= 4) return few;
  return many;
}

function dateRange(values: string[]) {
  const dates = values.map((value) => new Date(value)).sort((left, right) => left.getTime() - right.getTime());
  const format = (value: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(value);
  if (!dates.length) return "Итоги игр";
  if (dates.length === 1) return format(dates[0]!);
  return `${format(dates[0]!)} — ${format(dates[dates.length - 1]!)}`;
}
