import packageJson from "../../../../package.json";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const gameReleaseVersion = resolveGameReleaseVersion();
export const gameReleasedAt = readReleaseFile().releasedAt;

function resolveGameReleaseVersion() {
  const envVersion = normalizeVersion(
    process.env.GAME_RELEASE_VERSION ?? process.env.NEXT_PUBLIC_GAME_RELEASE_VERSION
  );
  if (envVersion) return envVersion;

  const releaseFileVersion = readReleaseFile().version;
  if (releaseFileVersion) return releaseFileVersion;

  return packageJson.version;
}

function readReleaseFile() {
  const releaseFiles = [
    join(process.cwd(), ".game-release-version"),
    join(process.cwd(), "..", "..", ".game-release-version")
  ];

  const releaseFile = releaseFiles.find((candidate) => existsSync(candidate));
  if (!releaseFile) return { version: "", releasedAt: "" };

  const [version = "", releasedAt = ""] = readFileSync(releaseFile, "utf8")
    .split(/\r?\n/)
    .map((value) => value.trim());

  return {
    version: normalizeVersion(version),
    releasedAt: normalizeReleaseDate(releasedAt)
  };
}

function normalizeReleaseDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Date(value).toISOString();
}

function normalizeVersion(value?: string) {
  return String(value ?? "")
    .trim()
    .replace(/^v/i, "");
}
