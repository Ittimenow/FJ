import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { notifyIndexNow } from "./indexnow";

test("IndexNow receives the changed public result URL and its ownership key", async () => {
  const requests: URL[] = [];
  const warnings: string[] = [];
  const fetchImplementation: typeof fetch = async (input) => {
    requests.push(new URL(String(input)));
    return new Response(null, { status: 202 });
  };

  await notifyIndexNow("https://gamefj.ru", "/results/summary-id", {
    warn: (message) => warnings.push(message)
  }, fetchImplementation);

  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.origin, "https://yandex.com");
  assert.equal(requests[0]?.pathname, "/indexnow");
  assert.equal(requests[0]?.searchParams.get("url"), "https://gamefj.ru/results/summary-id");
  const key = requests[0]?.searchParams.get("key") ?? "";
  assert.match(key, /^[a-zA-Z0-9-]{8,128}$/);
  assert.equal(readFileSync(new URL(`../../../web/public/${key}.txt`, import.meta.url), "utf8").trim(), key);
  assert.deepEqual(warnings, []);
});

test("IndexNow skips non-production domains and does not interrupt publication on errors", async () => {
  const warnings: string[] = [];
  let requests = 0;
  const fetchImplementation: typeof fetch = async () => {
    requests += 1;
    throw new Error("network unavailable");
  };
  const logger = { warn: (message: string) => warnings.push(message) };

  await notifyIndexNow("http://localhost:3000", "/results/summary-id", logger, fetchImplementation);
  assert.equal(requests, 0);

  await notifyIndexNow("https://gamefj.ru", "/results/summary-id", logger, fetchImplementation);
  assert.equal(requests, 1);
  assert.match(warnings[0] ?? "", /network unavailable/);
});
