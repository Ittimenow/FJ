import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const children = new Set();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

loadRootEnvFile();

const publicHost = process.env.HOST ?? "0.0.0.0";
const publicPort = numberEnv("PORT", 3000);
const exposedPort = numberEnv("EXPOSED_PORT", 3000);
const publicPorts = [...new Set([publicPort, exposedPort])];
const apiHost = process.env.API_HOST ?? "127.0.0.1";
const apiPort = numberEnv("API_PORT", 4000);
const webHost = process.env.WEB_HOST ?? "127.0.0.1";
const webPort = numberEnv("WEB_PORT", 3001);
const apiProxyPath = normalizePrefix(
  process.env.API_PROXY_PATH ?? process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/backend"
);
const socketProxyPath = normalizePrefix(
  process.env.NEXT_PUBLIC_SOCKET_PATH ?? `${apiProxyPath}/socket.io`
);

let appReady = false;
let startupErrorMessage = null;

function numberEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function normalizePrefix(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function log(message) {
  console.log(`[cashflow-prod] ${message}`);
}

function loadRootEnvFile() {
  if (!existsSync(".env")) return;

  const content = readFileSync(".env", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        ...options.env
      }
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            signal ? `signal ${signal}` : `code ${code}`
          }`
        )
      );
    });
  });
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...options.env
    }
  });

  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      startupErrorMessage = `child exited: ${command} ${args.join(" ")} ${
        signal ? `signal ${signal}` : `code ${code}`
      }`;
      appReady = false;
      console.error(`[cashflow-prod] ${startupErrorMessage}`);
    }
  });
  return child;
}

async function waitForPort(host, port, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (ready) return true;
    await delay(1000);
  }

  return false;
}

async function setupDatabaseIfNeeded() {
  if (!process.env.DATABASE_URL) {
    log("DATABASE_URL is not set, skipping database setup.");
    return;
  }
  if (process.env.DATABASE_AUTO_SETUP === "false") {
    log("DATABASE_AUTO_SETUP=false, skipping database setup.");
    return;
  }

  log("Generating Prisma Client.");
  await run(npmCommand, ["run", "db:generate"]);

  log("Syncing database schema.");
  await run(npmCommand, ["run", "db:push"]);

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const [professions, cards] = await Promise.all([
      prisma.profession.count(),
      prisma.card.count()
    ]);

    if (professions > 0 && cards > 0) {
      log(`Reference data already exists: ${professions} professions, ${cards} cards.`);
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  log("Reference data is empty. Running db:seed.");
  await run(npmCommand, ["run", "db:seed"]);
}

function rewriteApiPath(url) {
  const original = url || "/";
  if (socketProxyPath && original.startsWith(`${socketProxyPath}/`)) {
    return `/socket.io/${original.slice(socketProxyPath.length + 1)}`;
  }
  if (socketProxyPath && original === socketProxyPath) return "/socket.io";
  if (socketProxyPath && original.startsWith(`${socketProxyPath}?`)) {
    return `/socket.io${original.slice(socketProxyPath.length)}`;
  }

  if (apiProxyPath && original.startsWith(`${apiProxyPath}/`)) {
    return original.slice(apiProxyPath.length) || "/";
  }
  if (apiProxyPath && original === apiProxyPath) return "/";
  if (apiProxyPath && original.startsWith(`${apiProxyPath}?`)) {
    return `/${original.slice(apiProxyPath.length + 1)}`;
  }

  return null;
}

function selectTarget(url) {
  const apiPath = rewriteApiPath(url);
  if (apiPath !== null) {
    return { host: apiHost, port: apiPort, path: apiPath };
  }
  return { host: webHost, port: webPort, path: url || "/" };
}

function proxyHttp(req, res) {
  if (req.url === "/healthz") {
    const status = startupErrorMessage ? "error" : appReady ? "ok" : "starting";
    const statusCode = startupErrorMessage ? 500 : 200;
    res.writeHead(statusCode, { "content-type": "application/json" });
    res.end(JSON.stringify({ status, error: startupErrorMessage }));
    return;
  }

  if (!appReady) {
    res.writeHead(startupErrorMessage ? 500 : 503, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        statusCode: startupErrorMessage ? 500 : 503,
        message: startupErrorMessage ?? "Application is starting"
      })
    );
    return;
  }

  const target = selectTarget(req.url);
  const headers = {
    ...req.headers,
    host: `${target.host}:${target.port}`,
    "x-forwarded-host": req.headers.host ?? "",
    "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "https"
  };

  const proxyReq = http.request(
    {
      hostname: target.host,
      port: target.port,
      method: req.method,
      path: target.path,
      headers
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    console.error(`[cashflow-prod] proxy error: ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ statusCode: 502, message: "Upstream unavailable" }));
  });

  req.pipe(proxyReq);
}

function proxyUpgrade(req, socket, head) {
  if (!appReady) {
    socket.destroy();
    return;
  }

  const target = selectTarget(req.url);
  const upstream = net.connect(target.port, target.host, () => {
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

  upstream.on("error", () => socket.destroy());
}

let shuttingDown = false;
const servers = new Set();

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  if (servers.size > 0) {
    let pending = servers.size;
    for (const server of servers) {
      server.close(() => {
        pending -= 1;
        if (pending === 0) process.exit(code);
      });
    }
    setTimeout(() => process.exit(code), 5000).unref();
    return;
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function startApplication() {
  await setupDatabaseIfNeeded();

  log(`Starting API on ${apiHost}:${apiPort}.`);
  start("node", ["apps/api/dist/main.js"], {
    env: {
      API_HOST: apiHost,
      API_PORT: String(apiPort),
      API_URL: `http://${apiHost}:${apiPort}`
    }
  });

  const apiReady = await waitForPort(apiHost, apiPort);
  if (!apiReady) throw new Error("API did not become ready.");

  log(`Starting Next.js on ${webHost}:${webPort}.`);
  start(npmCommand, ["run", "start", "--workspace=@cashflow/web", "--", "-H", webHost, "-p", String(webPort)], {
    env: {
      API_URL: process.env.API_URL ?? `http://${apiHost}:${apiPort}`,
      PORT: String(webPort)
    }
  });

  const webReady = await waitForPort(webHost, webPort);
  if (!webReady) throw new Error("Next.js did not become ready.");

  appReady = true;
  log(`Application is ready.`);
  log(`Proxying ${apiProxyPath} to API and all other traffic to Next.js.`);
}

for (const port of publicPorts) {
  const publicServer = http.createServer(proxyHttp);
  servers.add(publicServer);
  publicServer.on("error", (error) => {
    startupErrorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[cashflow-prod] server error on ${publicHost}:${port}: ${startupErrorMessage}`);
    shutdown(1);
  });
  publicServer.on("upgrade", proxyUpgrade);
  publicServer.listen(port, publicHost, () => {
    log(`Listening on ${publicHost}:${port}.`);
  });
}

void startApplication().catch((error) => {
  startupErrorMessage = (error instanceof Error && error.message) || String(error);
  appReady = false;
  console.error(`[cashflow-prod] ${startupErrorMessage}`);
});
