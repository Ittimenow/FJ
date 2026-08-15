type FetchImplementation = typeof fetch;

const TELEGRAM_REQUEST_TIMEOUT_MS = 15_000;
const NETWORK_REQUEST_ATTEMPTS = 2;

type PublicationCardBaseUrlOptions = {
  publicUrl: string;
  internalUrl?: string | undefined;
  webHost?: string | undefined;
  webPort?: string | undefined;
};

type TelegramPhotoOptions = {
  chatId: string;
  photoUrl: string;
  caption: string;
  replyParameters?: {
    message_id: number;
    allow_sending_without_reply: boolean;
  };
};

export type TelegramPhotoResult = {
  message_id: number;
  chat?: {
    id?: number | string;
    username?: string;
  };
};

export function resolvePublicationCardBaseUrl(options: PublicationCardBaseUrlOptions) {
  const explicitInternalUrl = options.internalUrl?.trim();
  if (explicitInternalUrl) return explicitInternalUrl.replace(/\/+$/, "");

  const webHost = options.webHost?.trim();
  const webPort = options.webPort?.trim();
  if (webHost && webPort) {
    const connectHost = webHost === "0.0.0.0"
      ? "127.0.0.1"
      : webHost === "::"
        ? "[::1]"
        : webHost.includes(":") && !webHost.startsWith("[")
          ? `[${webHost}]`
          : webHost;
    return `http://${connectHost}:${webPort}`;
  }

  return options.publicUrl.replace(/\/+$/, "");
}

export async function sendTelegramPhoto(
  botToken: string,
  options: TelegramPhotoOptions,
  fetchImplementation: FetchImplementation = fetch
): Promise<TelegramPhotoResult> {
  const imageResponse = await fetchWithRetry(
    fetchImplementation,
    options.photoUrl,
    {},
    "Не удалось загрузить карточку публикации"
  );
  if (!imageResponse.ok) {
    throw new Error(`Карточка публикации недоступна: HTTP ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("Карточка публикации вернула не изображение");
  }

  const image = await imageResponse.arrayBuffer();
  if (image.byteLength === 0) {
    throw new Error("Карточка публикации вернула пустое изображение");
  }

  const form = new FormData();
  form.set("chat_id", options.chatId);
  form.set("caption", options.caption);
  form.set("photo", new Blob([image], { type: contentType }), "publication.png");
  if (options.replyParameters) {
    form.set("reply_parameters", JSON.stringify(options.replyParameters));
  }

  const response = await fetchWithRetry(
    fetchImplementation,
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      body: form
    },
    "Не удалось связаться с Telegram"
  );
  const payload = await telegramResponsePayload(response);
  if (!response.ok || !payload.ok || !payload.result?.message_id) {
    throw new Error(payload.description || `Telegram вернул статус ${response.status}`);
  }

  return payload.result;
}

async function fetchWithRetry(
  fetchImplementation: FetchImplementation,
  input: string,
  init: RequestInit,
  failureMessage: string
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < NETWORK_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      return await fetchImplementation(input, {
        ...init,
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`${failureMessage}: ${networkErrorDetails(lastError)}`);
}

async function telegramResponsePayload(response: Response) {
  try {
    return await response.json() as {
      ok?: boolean;
      description?: string;
      result?: TelegramPhotoResult;
    };
  } catch {
    throw new Error(`Telegram вернул некорректный ответ (HTTP ${response.status})`);
  }
}

function networkErrorDetails(error: unknown) {
  const cause = errorCause(error);
  const code = errorCode(cause) ?? errorCode(error);
  const descriptions: Record<string, string> = {
    ABORT_ERR: "истекло время ожидания ответа",
    ECONNREFUSED: "соединение отклонено сервером",
    ECONNRESET: "соединение было сброшено",
    ENETUNREACH: "сеть недоступна",
    ENOTFOUND: "не удалось определить адрес сервера",
    ETIMEDOUT: "истекло время ожидания соединения",
    UND_ERR_CONNECT_TIMEOUT: "истекло время ожидания соединения"
  };
  if (code && descriptions[code]) return `${descriptions[code]} (${code})`;
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "истекло время ожидания ответа";
  }

  const message = errorMessage(cause) ?? errorMessage(error);
  return message && message !== "fetch failed" ? message : "сетевая ошибка";
}

function errorCause(error: unknown) {
  if (!error || typeof error !== "object" || !("cause" in error)) return undefined;
  return error.cause;
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message.trim() : undefined;
}
