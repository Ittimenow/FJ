import { apiBaseUrl } from "@/lib/api";
import type { TelegramChannelPostCard } from "@/lib/types";

export async function telegramChannelPostCard(id: string) {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/telegram-publications/${id}/card`, {
      cache: "no-store"
    });
    if (!response.ok) return null;
    return response.json() as Promise<TelegramChannelPostCard>;
  } catch {
    return null;
  }
}
