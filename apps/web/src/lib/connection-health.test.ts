import assert from "node:assert/strict";
import test from "node:test";
import {
  connectionPresentation,
  phaseFromConnectError,
  phaseFromDisconnect
} from "./connection-health";

test("distinguishes an expired session from a server outage", () => {
  assert.equal(
    phaseFromConnectError({ data: { code: "SESSION_EXPIRED" } }, true),
    "session_expired"
  );
  assert.equal(phaseFromConnectError(new Error("websocket error"), true), "server_unavailable");
});

test("offline state takes precedence over socket reasons", () => {
  assert.equal(phaseFromConnectError(new Error("timeout"), false), "offline");
  assert.equal(phaseFromDisconnect("transport close", false), "offline");
});

test("normal transport loss is shown as reconnecting", () => {
  assert.equal(phaseFromDisconnect("transport close", true), "reconnecting");
  assert.equal(connectionPresentation("reconnecting").label, "Переподключение");
});
