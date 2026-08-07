import type { Metadata } from "next";
import { apiBaseUrl } from "@/lib/api";

interface GameInviteDetails {
  title: string;
  hostName: string | null;
}

const fallbackTitle = "Приглашение в игру — Финансовое путешествие";
const fallbackDescription =
  "Присоединяйтесь к онлайн-партии в игре «Финансовое путешествие» и принимайте финансовые решения вместе с командой.";

export async function gameInviteMetadata(code: string): Promise<Metadata> {
  const details = await fetchGameInviteDetails(code);
  const title = details
    ? `${details.title} — Финансовое путешествие`
    : fallbackTitle;
  const description = details
    ? `Онлайн-партия в финансовой игре «Финансовое путешествие». Ведущий: ${details.hostName ?? "не указан"}. Присоединяйтесь по ссылке-приглашению.`
    : fallbackDescription;
  const inviteUrl = `/join/${encodeURIComponent(code)}`;

  return {
    title,
    description,
    alternates: { canonical: inviteUrl },
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: inviteUrl,
      siteName: "Финансовое путешествие",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: "/social-preview-v2.png",
          width: 1200,
          height: 630,
          alt: "Игровой маршрут «Финансовое путешествие»"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/social-preview-v2.png"]
    }
  };
}

async function fetchGameInviteDetails(code: string): Promise<GameInviteDetails | null> {
  try {
    const response = await fetch(
      `${apiBaseUrl()}/api/game-invites/${encodeURIComponent(code)}/metadata`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as Partial<GameInviteDetails>;
    if (typeof data.title !== "string") return null;
    if (data.hostName !== null && typeof data.hostName !== "string") return null;

    return { title: data.title, hostName: data.hostName };
  } catch {
    return null;
  }
}
