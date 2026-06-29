import packageJson from "../../../../package.json";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const gameReleaseVersion = resolveGameReleaseVersion();

function resolveGameReleaseVersion() {
  const envVersion = normalizeVersion(
    process.env.GAME_RELEASE_VERSION ?? process.env.NEXT_PUBLIC_GAME_RELEASE_VERSION
  );
  if (envVersion) return envVersion;

  const releaseFileVersion = readReleaseFileVersion();
  if (releaseFileVersion) return releaseFileVersion;

  return packageJson.version;
}

function readReleaseFileVersion() {
  const releaseFiles = [
    join(process.cwd(), ".game-release-version"),
    join(process.cwd(), "..", "..", ".game-release-version")
  ];

  const releaseFile = releaseFiles.find((candidate) => existsSync(candidate));
  if (!releaseFile) return "";

  return normalizeVersion(readFileSync(releaseFile, "utf8"));
}

function normalizeVersion(value?: string) {
  return String(value ?? "")
    .trim()
    .replace(/^v/i, "");
}
