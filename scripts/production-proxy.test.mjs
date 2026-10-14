import assert from "node:assert/strict";
import { once } from "node:events";
import { Duplex } from "node:stream";
import test from "node:test";

import { proxyUpgrade } from "./production-proxy.mjs";

class RecordingSocket extends Duplex {
  writes = [];

  _read() {}

  _write(chunk, _encoding, callback) {
    this.writes.push(Buffer.from(chunk));
    callback();
  }
}

function createUpgrade() {
  const client = new RecordingSocket();
  const upstream = new RecordingSocket();
  const head = Buffer.from([0x81, 0x02, 0x4f, 0x4b]);
  let connectUpstream;
  let connection;

  proxyUpgrade(
    {
      method: "GET",
      url: "/backend/socket.io/?EIO=4&transport=websocket",
      httpVersion: "1.1",
      headers: {
        host: "game.example",
        connection: "Upgrade",
        upgrade: "websocket"
      }
    },
    client,
    head,
    {
      isReady: () => true,
      selectTarget: () => ({
        host: "127.0.0.1",
        port: 4000,
        path: "/socket.io/?EIO=4&transport=websocket"
      }),
      connect(port, host, onConnect) {
        connection = { port, host };
        connectUpstream = onConnect;
        return upstream;
      }
    }
  );

  return { client, upstream, head, connection, connectUpstream };
}

test("WebSocket proxy survives an incoming ECONNRESET and closes its upstream", () => {
  const { client, upstream, head, connection, connectUpstream } = createUpgrade();
  assert.deepEqual(connection, { host: "127.0.0.1", port: 4000 });

  connectUpstream();
  const forwarded = Buffer.concat(upstream.writes);
  assert.match(
    forwarded.toString("utf8"),
    /^GET \/socket\.io\/\?EIO=4&transport=websocket HTTP\/1\.1\r\n/
  );
  assert.match(forwarded.toString("utf8"), /\r\nhost: 127\.0\.0\.1:4000\r\n/);
  assert.ok(forwarded.subarray(-head.length).equals(head));

  const reset = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
  assert.doesNotThrow(() => client.emit("error", reset));
  assert.equal(client.destroyed, true);
  assert.equal(upstream.destroyed, true);
});

test("WebSocket proxy closes both sockets when the upstream errors", () => {
  const { client, upstream, connectUpstream } = createUpgrade();
  connectUpstream();

  assert.doesNotThrow(() => upstream.emit("error", new Error("upstream reset")));
  assert.equal(upstream.destroyed, true);
  assert.equal(client.destroyed, true);
});

test("WebSocket proxy closes the client when the upstream closes", async () => {
  const { client, upstream, connectUpstream } = createUpgrade();
  connectUpstream();

  const upstreamClosed = once(upstream, "close");
  upstream.destroy();
  await upstreamClosed;

  assert.equal(client.destroyed, true);
});
