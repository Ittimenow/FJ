import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_CONSENT_VERSION,
  createAnalyticsConsent,
  parseAnalyticsConsent
} from "./consent-storage";

test("создаёт версионированное решение пользователя", () => {
  const consent = createAnalyticsConsent(true, new Date("2026-08-03T10:00:00.000Z"));
  assert.deepEqual(consent, {
    analytics: true,
    updatedAt: "2026-08-03T10:00:00.000Z",
    version: ANALYTICS_CONSENT_VERSION
  });
});

test("читает только корректное решение актуальной версии", () => {
  assert.equal(parseAnalyticsConsent(null), null);
  assert.equal(parseAnalyticsConsent("not-json"), null);
  assert.equal(parseAnalyticsConsent('{"analytics":true,"updatedAt":"2026-08-03","version":0}'), null);
  assert.deepEqual(
    parseAnalyticsConsent('{"analytics":false,"updatedAt":"2026-08-03T10:00:00.000Z","version":1}'),
    { analytics: false, updatedAt: "2026-08-03T10:00:00.000Z", version: 1 }
  );
});
