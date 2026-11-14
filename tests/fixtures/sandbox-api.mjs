// Local verification bridge: uses disposable PostgreSQL and the real game service.
import "reflect-metadata";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { GamesService } = require("../../apps/api/dist/games/games.service.js");
const { SandboxScenarioDto, SandboxActionDto, CreateSandboxDto } = require("../../apps/api/dist/games/dto/sandbox.dto.js");
const { sandboxPayload } = require("../../apps/api/dist/games/sandbox-actions.js");
const url = new URL(process.env.FJ_TEST_DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.port !== "55439") throw new Error("Only disposable PostgreSQL on 127.0.0.1:55439 is allowed");
const fixtures = Object.fromEntries(["101", "202"].map(mode => [mode, JSON.parse(readFileSync(resolve(process.env.FJ_SANDBOX_ARTIFACT_DIR, `${mode}.json`), "utf8"))]));
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const games = new GamesService(db);
const ownerId = fixtures["101"].ownerId;
process.env.SANDBOX_ADMIN_EMAIL = (await db.user.findUniqueOrThrow({ where: { id: ownerId } })).email;
const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  try {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    const chunks = [];for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    let result;
    const fixture = path.match(/^\/fixtures\/(101|202)$/);
    if (fixture) {
      const data = fixtures[fixture[1]];
      if (request.method === "POST") await games.applySandboxScenario(data.snapshot.game.id, ownerId, data.snapshot.sandbox.scenario);
      result = { snapshot: await games.getGame(data.snapshot.game.id, ownerId), ownerId };
    } else if (path === "/api/games/sandbox/access") result = await games.sandboxAvailability(ownerId);
    else if (path === "/api/games/sandbox") result = await games.createSandbox(ownerId, sandboxPayload(CreateSandboxDto, body));
    else {
      const route = path.match(/^\/api\/games\/([^/]+)(?:\/(.*))?$/);
      if (!route) { response.statusCode = 404;response.end("{}");return; }
      const [, gameId, action] = route;
      switch (action) {
        case undefined: result = await games.getGame(gameId, ownerId);break;
        case "sandbox/cards": result = await games.sandboxCatalog(gameId, ownerId);break;
        case "sandbox/scenario": result = await games.applySandboxScenario(gameId, ownerId, sandboxPayload(SandboxScenarioDto, body));break;
        case "sandbox/reset": result = await games.resetSandbox(gameId, ownerId);break;
        case "sandbox/action": result = await games.sandboxAction(gameId, ownerId, sandboxPayload(SandboxActionDto, body));break;
        case "replay": result = await games.replay(gameId, ownerId);break;
        case "pause": result = await games.pauseGame(gameId, ownerId);break;
        case "resume": result = await games.resumeGame(gameId, ownerId);break;
        default: response.statusCode = 404;response.end("{}");return;
      }
    }
    response.end(JSON.stringify(result));
  } catch (error) { response.statusCode = error.getStatus?.() ?? 500;response.end(JSON.stringify({ message: error.message })); }
});
server.listen(55440, "127.0.0.1", () => process.stdout.write("Sandbox verification API ready on 127.0.0.1:55440\n"));
async function close() { server.close();await db.$disconnect();process.exit(0); }
process.on("SIGTERM", close);process.on("SIGINT", close);
