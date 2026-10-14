import net from "node:net";

export function proxyUpgrade(
  req,
  socket,
  head,
  { isReady, selectTarget, connect = net.connect }
) {
  let upstream;
  const closeBoth = () => {
    socket.destroy();
    upstream?.destroy();
  };

  socket.on("error", closeBoth);
  socket.on("close", () => upstream?.destroy());

  if (!isReady()) {
    socket.destroy();
    return;
  }

  const target = selectTarget(req.url);
  upstream = connect(target.port, target.host, () => {
    if (socket.destroyed) {
      upstream.destroy();
      return;
    }

    const headers = {
      ...req.headers,
      host: `${target.host}:${target.port}`,
      "x-forwarded-host": req.headers.host ?? "",
      "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "https"
    };
    const headerLines = Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\r\n");

    upstream.write(`${req.method} ${target.path} HTTP/${req.httpVersion}\r\n`);
    upstream.write(`${headerLines}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });

  upstream.on("error", closeBoth);
  upstream.on("close", () => socket.destroy());
}
