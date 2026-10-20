import React from "react";
import type { GameAward } from "@/lib/types";

type Award = Pick<GameAward, "kind" | "title" | "mention" | "result">;

export function PublicationAwardTile({
  award,
  source,
  showResult = false
}: {
  award: Award;
  source?: string | undefined;
  showResult?: boolean;
}) {
  return (
    <div style={{ width: "100%", height: 76, display: "flex", alignItems: "center", gap: 10, overflow: "hidden", borderRadius: 14, background: "#ffffff", padding: "6px 10px 6px 6px", boxShadow: "0 8px 20px rgba(27,57,118,.08)" }}>
      <div style={{ width: 64, height: 64, display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 10, background: "#fff0cf" }}>
        {source ? <img src={source} width={60} height={60} alt="" style={{ objectFit: "contain" }} /> : null}
      </div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
        <span style={{ display: "flex", color: "#17243f", fontSize: 13, fontWeight: 800, lineHeight: 1.15 }}>{award.title}</span>
        <span style={{ display: "flex", color: "#78500d", fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>
          {shorten(award.mention, 25)}
        </span>
        {showResult ? <span style={{ display: "flex", color: "#526487", fontSize: 10, lineHeight: 1.1 }}>{shorten(award.result, 36)}</span> : null}
      </div>
    </div>
  );
}

function shorten(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
