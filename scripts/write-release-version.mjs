import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const releaseFile = ".game-release-version";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageVersion = String(packageJson.version || "0.1.0");
const shouldPrintOnly = process.argv.includes("--print");

const releaseVersion = resolveReleaseVersion();

if (shouldPrintOnly) {
  console.log(releaseVersion);
} else {
  writeFileSync(releaseFile, `${releaseVersion}\n`);
  console.log(`Game release version: v${releaseVersion}`);
}

function resolveReleaseVersion() {
  const explicitVersion = firstNonEmpty(
    process.env.GAME_RELEASE_VERSION,
    process.env.NEXT_PUBLIC_GAME_RELEASE_VERSION
  );
  if (explicitVersion) return normalizeVersion(explicitVersion);

  const githubRunNumber = firstNonEmpty(process.env.GITHUB_RUN_NUMBER, process.env.BUILD_NUMBER);
  if (githubRunNumber) {
    return withBuildMetadata(`deploy.${githubRunNumber}`, firstNonEmpty(process.env.GITHUB_SHA));
  }

  const genericCommit = firstNonEmpty(
    process.env.GITHUB_SHA,
    process.env.COMMIT_SHA,
    process.env.SOURCE_COMMIT,
    process.env.SOURCE_VERSION
  );
  if (genericCommit) return withBuildMetadata("commit", genericCommit);

  const gitCommitCount = runGit(["rev-list", "--count", "HEAD"]);
  const gitSha = runGit(["rev-parse", "--short=7", "HEAD"]);
  if (gitCommitCount) {
    return withBuildMetadata(`commit.${gitCommitCount}`, gitSha);
  }

  return withBuildMetadata(`build.${formatTimestamp(new Date())}`);
}

function normalizeVersion(value) {
  return String(value).trim().replace(/^v/i, "");
}

function withBuildMetadata(label, sha) {
  const parts = [label, sha ? String(sha).trim().slice(0, 7) : ""].filter(Boolean);
  return `${packageVersion}+${parts.join(".")}`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function runGit(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join("");
}
