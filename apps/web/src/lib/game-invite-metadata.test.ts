import assert from "node:assert/strict";
import test from "node:test";
import { gameInviteMetadata } from "./game-invite-metadata";

test("метаданные приглашения содержат название игры и ведущего", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ title: "Вечерняя партия", hostName: "Анна" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  try {
    const metadata = await gameInviteMetadata("ABC123");

    assert.equal(metadata.title, "Вечерняя партия — Финансовое путешествие");
    assert.match(String(metadata.description), /Ведущий: Анна/);
    assert.equal(metadata.openGraph?.url, "/join/ABC123");
    assert.deepEqual(metadata.robots, { index: false, follow: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("при недоступном приглашении используются общие метаданные", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 404 });

  try {
    const metadata = await gameInviteMetadata("UNKNOWN");

    assert.equal(metadata.title, "Приглашение в игру — Финансовое путешествие");
    assert.match(String(metadata.description), /онлайн-партии/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
