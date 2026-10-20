import { readFile } from "node:fs/promises";
import path from "node:path";

let fontData: Promise<[ArrayBuffer, ArrayBuffer]> | undefined;

export function publicationFont(): Promise<[ArrayBuffer, ArrayBuffer]> {
  const directory = path.join(
    process.cwd(),
    path.basename(process.cwd()) === "web" ? "public" : path.join("apps", "web", "public"),
    "fonts"
  );
  fontData ??= Promise.all(["manrope-regular.ttf", "manrope-extrabold.ttf"].map((file) =>
    readFile(path.join(directory, file)).then((buffer) => Uint8Array.from(buffer).buffer)
  )).then(([regular, extrabold]) => [regular!, extrabold!]);
  return fontData;
}

export async function publicationImageOptions(size: { width: number; height: number }) {
  const [regular, extrabold] = await publicationFont();
  return {
    ...size,
    fonts: [
      { name: "Manrope", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Manrope", data: extrabold, weight: 800 as const, style: "normal" as const }
    ]
  };
}
