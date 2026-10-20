import { readFile } from "node:fs/promises";
import path from "node:path";
import { awardImageFile } from "./award-image";

export async function loadAwardImageSources(kinds: string[]): Promise<Record<string, string>> {
  const publicDirectory = path.basename(process.cwd()) === "web"
    ? path.join(process.cwd(), "public")
    : path.join(process.cwd(), "apps", "web", "public");
  const sources: Record<string, string> = {};

  await Promise.all([...new Set(kinds)].map(async (kind) => {
    const file = awardImageFile(kind);
    if (!file) return;
    try {
      const image = await readFile(path.join(publicDirectory, "awards", file));
      sources[kind] = `data:image/png;base64,${image.toString("base64")}`;
    } catch {
      // An unknown or unavailable image leaves the award text visible.
    }
  }));

  return sources;
}
