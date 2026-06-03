import { copyFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";
const homebrewPostgresBin = "/opt/homebrew/opt/postgresql@16/bin";
const homebrewRedisBin = "/opt/homebrew/opt/redis/bin";
const children = new Set();

function log(message) {
  console.log(`[cashflow-local] ${message}`);
}

function ensureEnvFile() {
  if (existsSync(".env")) return;
  copyFileSync(".env.example", ".env");
  log("Created .env from .env.example");
}

function loadEnvFile() {
  if (!existsSync(".env")) return {};

  const env = {};
  const content = readFileSync(".env", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    env[key] = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return env;
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

function canRun(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    env: process.env
  });
  return result.status === 0;
}

function commandOutput(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env
    }
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function resolveExecutable(candidates) {
  for (const candidate of candidates) {
    if (candidate.includes("/") && existsSync(candidate)) return candidate;
    if (!candidate.includes("/") && canRun(candidate)) return candidate;
  }
  return null;
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
  child.on("exit", () => children.delete(child));
  return child;
}

async function ensureDatabaseRole(env) {
  const psql = resolveExecutable([
    `${homebrewPostgresBin}/psql`,
    "/usr/local/opt/postgresql@16/bin/psql",
    "psql"
  ]);
  const createdb = resolveExecutable([
    `${homebrewPostgresBin}/createdb`,
    "/usr/local/opt/postgresql@16/bin/createdb",
    "createdb"
  ]);
  if (!psql) return;

  const databaseUrl = env.DATABASE_URL ?? "";
  const user = databaseUrl.match(/postgresql:\/\/([^:]+):/)?.[1] ?? "cashflow";
  const password = databaseUrl.match(/postgresql:\/\/[^:]+:([^@]+)@/)?.[1] ?? "cashflow";
  const database = databaseUrl.match(/\/([^/?]+)(?:\?|$)/)?.[1] ?? "cashflow";

  await run(
    psql,
    [
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${user}') THEN CREATE ROLE ${user} LOGIN PASSWORD '${password}'; END IF; END $$;`
    ],
    { env }
  );

  const databaseExists = commandOutput(
    psql,
    ["-d", "postgres", "-tAc", `SELECT 1 FROM pg_database WHERE datname='${database}'`],
    { env }
  );

  if (!databaseExists) {
    if (!createdb) throw new Error("createdb executable not found");
    await run(createdb, ["-O", user, database], { env });
  }

  await run(psql, ["-d", "postgres", "-c", `GRANT ALL PRIVILEGES ON DATABASE ${database} TO ${user};`], { env });
}

async function ensureInfrastructure(env) {
  if (canRun(dockerCommand, ["--version"])) {
    log("Starting PostgreSQL and Redis with Docker Compose.");
    await run(dockerCommand, ["compose", "up", "-d"], { env });
  } else {
    const postgres = resolveExecutable([
      `${homebrewPostgresBin}/postgres`,
      "/usr/local/opt/postgresql@16/bin/postgres",
      "postgres"
    ]);
    const redis = resolveExecutable([
      `${homebrewRedisBin}/redis-server`,
      "/usr/local/opt/redis/bin/redis-server",
      "redis-server"
    ]);

    if (!postgres) {
      throw new Error(
        "Docker and postgres are both unavailable. Install Docker Desktop or run `brew install postgresql@16 redis`."
      );
    }

    const postgresReady = await waitForPort("127.0.0.1", 5432, 1000);
    if (!postgresReady) {
      log("Docker is not available. Starting Homebrew PostgreSQL on 127.0.0.1:5432.");
      start(
        postgres,
        ["-D", "/opt/homebrew/var/postgresql@16"],
        {
          env: {
            ...env,
            LC_ALL: "en_US.UTF-8"
          }
        }
      );
    }

    if (redis) {
      const redisReady = await waitForPort("127.0.0.1", 6379, 1000);
      if (!redisReady) {
        log("Starting Homebrew Redis on 127.0.0.1:6379.");
        start(redis, ["/opt/homebrew/etc/redis.conf"], { env });
      }
    } else {
      log("Redis is not installed. API will run without Redis adapter.");
      delete env.REDIS_URL;
      delete process.env.REDIS_URL;
    }
  }

  log("Waiting for PostgreSQL on 127.0.0.1:5432.");
  const postgresReady = await waitForPort("127.0.0.1", 5432);
  if (!postgresReady) {
    throw new Error("PostgreSQL did not become ready.");
  }

  await ensureDatabaseRole(env);
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
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

async function installDependenciesIfNeeded(env) {
  if (existsSync("node_modules/.package-lock.json")) return;
  log("node_modules not found. Running npm install.");
  await run(npmCommand, ["install"], { env });
}

async function seedReferenceDataIfNeeded() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const [professions, cards] = await Promise.all([
      prisma.profession.count(),
      prisma.card.count()
    ]);

    if (professions > 0 && cards > 0) {
      log(`Reference data already exists: ${professions} professions, ${cards} cards`);
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  log("Reference data is empty. Running db:seed.");
  await run(npmCommand, ["run", "db:seed"], { env: localEnv });
}

function resetWebDevCache() {
  const nextCachePath = "apps/web/.next";
  if (!existsSync(nextCachePath)) return;

  rmSync(nextCachePath, { recursive: true, force: true });
  log("Cleared Next.js dev cache.");
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

ensureEnvFile();
const localEnv = loadEnvFile();
Object.assign(process.env, localEnv);

try {
  await installDependenciesIfNeeded(localEnv);

  await ensureInfrastructure(localEnv);

  log("Generating Prisma Client.");
  await run(npmCommand, ["run", "db:generate"], { env: localEnv });

  log("Syncing database schema.");
  await run(npmCommand, ["run", "db:push"], { env: localEnv });

  await seedReferenceDataIfNeeded();

  const apiPortFree = await isPortOpen(4000);
  const webPortFree = await isPortOpen(3000);

  if (apiPortFree) {
    log("Starting API on http://localhost:4000");
    start(npmCommand, ["run", "dev:api"], { env: localEnv });
  } else {
    log("Port 4000 is already in use. API was not started by this task.");
  }

  if (webPortFree) {
    resetWebDevCache();
    log("Starting Web on http://localhost:3000");
    start(npmCommand, ["run", "dev:web"], { env: localEnv });
  } else {
    log("Port 3000 is already in use. Web was not started by this task.");
  }

  if (!apiPortFree && !webPortFree) {
    log("Both dev ports are already busy. Nothing else to start.");
    process.exit(0);
  }
} catch (error) {
  shutdown();
  console.error(`[cashflow-local] ${(error instanceof Error && error.message) || error}`);
  process.exit(1);
}
