type FetchImplementation = typeof fetch;

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
  const imageResponse = await fetchImplementation(options.photoUrl, {
    signal: AbortSignal.timeout(15_000)
  });
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

  const response = await fetchImplementation(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15_000)
    }
  );
  const payload = await response.json() as {
    ok?: boolean;
    description?: string;
    result?: TelegramPhotoResult;
  };
  if (!response.ok || !payload.ok || !payload.result?.message_id) {
    throw new Error(payload.description || `Telegram вернул статус ${response.status}`);
  }

  return payload.result;
}
