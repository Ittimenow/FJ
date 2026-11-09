import { apiBaseUrl } from "@/lib/api";
import type { PublicGameSummary } from "@/lib/types";

type PublicResultSitemapEntry = { id: string; updatedAt: string };

export async function publicResults(limit = 24) {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/results?limit=${limit}`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) return [];
    return response.json() as Promise<PublicGameSummary[]>;
  } catch {
    return [];
  }
}

export async function publicResult(id: string, card = false) {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/results/${id}${card ? "/card" : ""}`, {
      cache: "no-store"
    });
    if (!response.ok) return null;
    return response.json() as Promise<PublicGameSummary>;
  } catch {
    return null;
  }
}

export async function publicResultSitemapEntries(): Promise<PublicResultSitemapEntry[]> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/results/sitemap`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) return [];
    return response.json() as Promise<PublicResultSitemapEntry[]>;
  } catch {
    return [];
  }
}
