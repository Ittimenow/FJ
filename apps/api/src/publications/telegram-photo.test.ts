import assert from "node:assert/strict";
import test from "node:test";
import { sendTelegramPhoto } from "./telegram-photo";

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
