"use client";

import { ArrowRight, Trophy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { publicApiBaseUrl } from "@/lib/api";
import type { PublicGameSummary } from "@/lib/types";

export function RecentGameResults() {
  const [results, setResults] = useState<PublicGameSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${publicApiBaseUrl()}/api/results?limit=3`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((items: PublicGameSummary[]) => setResults(items))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!results.length) return null;

  return (
    <section className="section recent-results" aria-labelledby="recent-results-title">
      <div className="recent-results-head">
        <div>
          <h2 id="recent-results-title">Последние финансовые путешествия</h2>
          <p>Реальные партии, решения и поворотные моменты — по журналу игры.</p>
        </div>
        <Link href={"/results" as Route}>Все результаты <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      <div className="recent-results-grid">
        {results.map((result) => {
          const facts = result.facts;
          const winner = facts.players.find((player) => player.id === facts.winnerGamePlayerId);
          return (
            <Link href={result.pageUrl as Route} className="recent-result-card" key={result.id}>
              <img src={result.imageUrl} alt="" loading="lazy" />
              <div>
                <span>{formatDate(facts.endedAt)}</span>
                <h3>{result.headline}</h3>
                <p>{winner ? `${winner.mention} первым достиг финансовой свободы.` : facts.highlights[0]?.text ?? "Главные решения партии сохранены."}</p>
                <strong><Trophy size={16} aria-hidden="true" /> {facts.players.length} игроков · {facts.rounds} раундов</strong>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
