import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createContext, runInContext } from "node:vm";

test("service worker displays an incoming push and updates the app badge", async () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const shown: Array<{ title: string; options: Record<string, unknown> }> = [];
  const messages: unknown[] = [];
  const badges: number[] = [];
  const opened: string[] = [];
  const worker = {
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener),
    registration: { showNotification: async (title: string, options: Record<string, unknown>) => {
      shown.push({ title, options });
    } },
    navigator: { setAppBadge: async (count: number) => { badges.push(count); } },
    clients: {
      matchAll: async () => [{ postMessage: (message: unknown) => messages.push(message), url: "https://example.com/dashboard" }],
      openWindow: async (url: string) => { opened.push(url); }
    },
    location: { origin: "https://example.com" }
  };
  runInContext(readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8"), createContext({ self: worker, URL }));
  let work: Promise<unknown> | null = null;
  listeners.get("push")?.({
    data: { json: () => ({ title: "Новая открытая игра", body: "Игра", id: "note-1", unreadCount: 2 }) },
    waitUntil: (promise: Promise<unknown>) => { work = promise; }
  });
  assert.ok(work);
  await work;
  assert.equal(shown[0]?.title, "Новая открытая игра");
  assert.equal(shown[0]?.options.tag, "note-1");
  assert.deepEqual(badges, [2]);
  assert.equal((messages[0] as { type?: string } | undefined)?.type, "NOTIFICATIONS_CHANGED");

  listeners.get("notificationclick")?.({
    notification: { close: () => {} },
    waitUntil: (promise: Promise<unknown>) => { work = promise; }
  });
  await work;
  assert.deepEqual(opened, ["https://example.com/notifications"]);
});
