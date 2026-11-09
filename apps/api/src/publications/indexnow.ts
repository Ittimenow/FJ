import type { Logger } from "@nestjs/common";

// This is a public ownership token, served at the matching path on gamefj.ru.
const INDEXNOW_KEY = "f773c78f10e0b7175031878ddd41f8f0ed483ebccd73d554";

export async function notifyIndexNow(
  publicUrl: string,
  path: string,
  logger: Pick<Logger, "warn">,
  fetchImplementation: typeof fetch = fetch
) {
  if (publicUrl !== "https://gamefj.ru") return;

  const requestUrl = new URL("https://yandex.com/indexnow");
  requestUrl.searchParams.set("url", `${publicUrl}${path}`);
  requestUrl.searchParams.set("key", INDEXNOW_KEY);

  try {
    const response = await fetchImplementation(requestUrl, { signal: AbortSignal.timeout(3000) });
    if (response.status !== 200 && response.status !== 202) {
      logger.warn(`IndexNow rejected ${path}: HTTP ${response.status}`);
    }
  } catch (error) {
    logger.warn(`IndexNow could not notify about ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
