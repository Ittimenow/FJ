import { execFileSync } from "node:child_process";
import { createServer } from "node:net";

const [projectName, ...portSpecs] = process.argv.slice(2);

if (!projectName || portSpecs.length === 0) {
  console.error(
    "Usage: node scripts/check-dev-ports.mjs <project> <port:service> [...]"
  );
  process.exit(2);
}

const ports = portSpecs.map((spec) => {
  const separator = spec.indexOf(":");
  const portText = separator === -1 ? spec : spec.slice(0, separator);
  const service = separator === -1 ? "server" : spec.slice(separator + 1);
  const port = Number(portText);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[dev-ports] Invalid port specification: ${spec}`);
    process.exit(2);
  }

  return { port, service };
});

const unavailable = (
  await Promise.all(
    ports.map(async ({ port, service }) => ({
      port,
      service,
      available: await isPortAvailable(port),
    }))
  )
).filter(({ available }) => !available);

if (unavailable.length > 0) {
  console.error(`[dev-ports] ${projectName} не запущен: обязательные порты заняты:`);
  for (const { port, service } of unavailable) {
    console.error(`  - ${service}: ${port}${describeListener(port)}`);
  }
  console.error("Остановите указанный сервер в его терминале VS Code и повторите запуск.");
  process.exit(1);
}

console.log(
  `[dev-ports] ${projectName}: ${ports.map(({ port, service }) => `${service}=${port}`).join(", ")} свободны.`
);

function isPortAvailable(port) {
  const lsofResult = checkPortWithLsof(port);
  if (lsofResult !== undefined) return Promise.resolve(lsofResult);

  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });

    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close((error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });
  });
}

function checkPortWithLsof(port) {
  try {
    execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
      stdio: "ignore",
    });
    return false;
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    if (error?.status === 1) return true;
    return undefined;
  }
}

function describeListener(port) {
  try {
    const output = execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpc"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const pid = output.match(/^p(.+)$/m)?.[1];
    const command = output.match(/^c(.+)$/m)?.[1];
    let cwd;
    if (pid) {
      try {
        const cwdOutput = execFileSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        cwd = cwdOutput.match(/^n(.+)$/m)?.[1];
      } catch {
        // PID and command are still useful when the working directory is unavailable.
      }
    }
    const details = [command, pid && `PID ${pid}`, cwd].filter(Boolean).join(", ");
    return details ? ` (${details})` : "";
  } catch {
    return "";
  }
}
