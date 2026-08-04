import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { TelegramRegistrationService } from "./telegram-registration.service";

const notification = {
  email: "player@example.com",
  displayName: "Анна Смирнова",
  accountType: "PLAYER" as const,
  registeredAt: new Date("2026-08-04T09:30:00.000Z")
};

test("Telegram-уведомление пропускается без настроек", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  };

  try {
    const service = new TelegramRegistrationService(new ConfigService({}));
    await service.sendRegistration(notification);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Telegram-уведомление содержит данные новой регистрации", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedBody = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedBody = String(init?.body ?? "");
    return new Response(null, { status: 200 });
  };

  try {
    const service = new TelegramRegistrationService(
      new ConfigService({
        TELEGRAM_BOT_TOKEN: "test-token",
        TELEGRAM_CHAT_ID: "123456"
      })
    );
    await service.sendRegistration(notification);

    assert.equal(
      requestedUrl,
      "https://api.telegram.org/bottest-token/sendMessage"
    );
    const body = JSON.parse(requestedBody) as { chat_id: string; text: string };
    assert.equal(body.chat_id, "123456");
    assert.match(body.text, /Анна Смирнова/);
    assert.match(body.text, /player@example\.com/);
    assert.match(body.text, /Игрок/);
    assert.match(body.text, /4 августа 2026/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("сбой Telegram не прерывает обработку регистрации", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };

  try {
    const service = new TelegramRegistrationService(
      new ConfigService({
        TELEGRAM_BOT_TOKEN: "test-token",
        TELEGRAM_CHAT_ID: "123456"
      })
    );
    await assert.doesNotReject(service.sendRegistration(notification));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
