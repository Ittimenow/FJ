import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicationCardBaseUrl, sendTelegramPhoto } from "./telegram-photo";

test("production card URL uses the internal web server instead of the public proxy", () => {
  assert.equal(resolvePublicationCardBaseUrl({
    publicUrl: "https://gamefj.ru",
    webHost: "127.0.0.1",
    webPort: "3011"
  }), "http://127.0.0.1:3011");
});

test("explicit internal card URL takes priority and local setup falls back to public URL", () => {
  assert.equal(resolvePublicationCardBaseUrl({
    publicUrl: "https://gamefj.ru",
    internalUrl: "http://web:3000/",
    webHost: "127.0.0.1",
    webPort: "3011"
  }), "http://web:3000");
  assert.equal(resolvePublicationCardBaseUrl({
    publicUrl: "http://localhost:3000/"
  }), "http://localhost:3000");
});

test("Telegram photo is downloaded by the app and uploaded as a file", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), ...(init ? { init } : {}) });
    if (requests.length === 1) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/png" }
      });
    }
    return Response.json({
      ok: true,
      result: { message_id: 42, chat: { id: -100123, username: "fj_channel" } }
    });
  };

  const result = await sendTelegramPhoto("test-token", {
    chatId: "@fj_channel",
    photoUrl: "https://gamefj.ru/results/summary-id/opengraph-image",
    caption: "Итоги игры",
    replyParameters: {
      message_id: 7,
      allow_sending_without_reply: false
    }
  }, fetchImplementation);

  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.url, "https://gamefj.ru/results/summary-id/opengraph-image");
  assert.equal(requests[1]?.url, "https://api.telegram.org/bottest-token/sendPhoto");
  assert.equal(requests[1]?.init?.method, "POST");
  assert.equal(requests[1]?.init?.headers, undefined);

  const form = requests[1]?.init?.body;
  assert.ok(form instanceof FormData);
  assert.equal(form.get("chat_id"), "@fj_channel");
  assert.equal(form.get("caption"), "Итоги игры");
  assert.equal(
    form.get("reply_parameters"),
    JSON.stringify({ message_id: 7, allow_sending_without_reply: false })
  );
  const photo = form.get("photo");
  assert.ok(photo instanceof Blob);
  assert.equal(photo.type, "image/png");
  assert.equal(photo.size, 4);
  assert.equal(result.message_id, 42);
});

test("Telegram request is not sent when the publication card is unavailable", async () => {
  let requests = 0;
  const fetchImplementation: typeof fetch = async () => {
    requests += 1;
    return new Response(null, { status: 503 });
  };

  await assert.rejects(
    sendTelegramPhoto("test-token", {
      chatId: "@fj_channel",
      photoUrl: "https://gamefj.ru/card.png",
      caption: "Итоги игры"
    }, fetchImplementation),
    /Карточка публикации недоступна: HTTP 503/
  );
  assert.equal(requests, 1);
});

test("non-image response is rejected before publication", async () => {
  const fetchImplementation: typeof fetch = async () => new Response("error", {
    headers: { "content-type": "text/html; charset=utf-8" }
  });

  await assert.rejects(
    sendTelegramPhoto("test-token", {
      chatId: "@fj_channel",
      photoUrl: "https://gamefj.ru/card.png",
      caption: "Итоги игры"
    }, fetchImplementation),
    /вернула не изображение/
  );
});

test("temporary card download failure is retried", async () => {
  let requests = 0;
  const fetchImplementation: typeof fetch = async () => {
    requests += 1;
    if (requests === 1) throw new TypeError("fetch failed");
    if (requests === 2) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/png" }
      });
    }
    return Response.json({ ok: true, result: { message_id: 42 } });
  };

  const result = await sendTelegramPhoto("test-token", {
    chatId: "@fj_channel",
    photoUrl: "https://gamefj.ru/card.png",
    caption: "Итоги игры"
  }, fetchImplementation);

  assert.equal(requests, 3);
  assert.equal(result.message_id, 42);
});

test("Telegram network failure reports its stage and connection cause", async () => {
  let requests = 0;
  const connectionError = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:443"), {
    code: "ECONNREFUSED"
  });
  const fetchError = Object.assign(new TypeError("fetch failed"), { cause: connectionError });
  const fetchImplementation: typeof fetch = async () => {
    requests += 1;
    if (requests === 1) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/png" }
      });
    }
    throw fetchError;
  };

  await assert.rejects(
    sendTelegramPhoto("test-token", {
      chatId: "@fj_channel",
      photoUrl: "https://gamefj.ru/card.png",
      caption: "Итоги игры"
    }, fetchImplementation),
    /Не удалось связаться с Telegram: соединение отклонено сервером \(ECONNREFUSED\)/
  );
  assert.equal(requests, 3);
});

test("invalid Telegram response has a clear error", async () => {
  let requests = 0;
  const fetchImplementation: typeof fetch = async () => {
    requests += 1;
    if (requests === 1) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/png" }
      });
    }
    return new Response("upstream error", { status: 502 });
  };

  await assert.rejects(
    sendTelegramPhoto("test-token", {
      chatId: "@fj_channel",
      photoUrl: "https://gamefj.ru/card.png",
      caption: "Итоги игры"
    }, fetchImplementation),
    /Telegram вернул некорректный ответ \(HTTP 502\)/
  );
  assert.equal(requests, 2);
});
