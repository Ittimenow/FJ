import { test, expect, type Page } from "@playwright/test";
import { buildSync } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const origin = "http://fj-sandbox.test";
const backend = process.env.FJ_SANDBOX_API;
test.skip(!backend, "Start the isolated sandbox verification API first");
let output: string;
test.beforeAll(() => {
  output = mkdtempSync(join(tmpdir(), "fj-sandbox-browser-"));
  buildSync({ entryPoints: ["tests/fixtures/sandbox-ui.tsx"], outfile: join(output, "app.js"), bundle: true, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env": JSON.stringify({ NODE_ENV: "development", NEXT_PUBLIC_API_URL: "" }) }, tsconfig: "apps/web/tsconfig.json", alias: { "next/navigation": resolve("tests/fixtures/navigation.ts"), "next/link": resolve("tests/fixtures/link.tsx"), "socket.io-client": resolve("tests/fixtures/socket.ts"), "@sentry/nextjs": "@sentry/browser" } });
  execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-c", "apps/web/tailwind.config.ts", "-i", "apps/web/src/app/globals.css", "-o", join(output, "style.css"), "--content", "apps/web/src/**/*.{ts,tsx}", "--minify"]);
  let fonts = "";
  try {
    const css = readFileSync("apps/web/.next-dev/static/css/app/layout.css", "utf8");
    fonts = (css.match(/@font-face\s*\{[^}]*font-family: 'Manrope'[^}]*\}/g) ?? []).join("\n").replaceAll("/_next/static/media/", "./media/");
    mkdirSync(join(output, "media"));
    for (const name of readdirSync("apps/web/.next-dev/static/media").filter(n => n.endsWith(".woff2"))) copyFileSync(join("apps/web/.next-dev/static/media", name), join(output, "media", name));
  } catch { /* Existing system fallback. */ }
  writeFileSync(join(output, "index.html"), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="app.css"><style>${fonts}body{font-family:Manrope,Arial,sans-serif}</style><div id="root"></div><script src="app.js"></script></html>`);
});
test.beforeEach(async ({ page }) => {
  await page.route(`${origin}/**`, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/games/") || path.startsWith("/fixtures/")) {
      await route.fulfill({ response: await route.fetch({ url: `${backend}${path}` }) });
    } else if (path === "/logo.svg" || /^\/(figurines|dreams)\/[\w.-]+$/.test(path)) await route.fulfill({ path: resolve("apps/web/public", `.${path}`) });
    else if (["/index.html", "/app.js", "/app.css", "/style.css"].includes(path) || path.startsWith("/media/")) await route.fulfill({ path: join(output, path) });
    else await route.fulfill({ status: 404, body: "{}" });
  });
});
async function open(page: Page, mode: string) {
  await page.request.post(`${backend}/fixtures/${mode}`);
  await page.goto(`${origin}/index.html?mode=${mode}`);
  await expect(page.locator("html")).toHaveAttribute("data-fixture-ready", "true");
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
for (const mode of ["101", "202"]) for (const size of [{ width: 375, height: 667 }, { width: 1440, height: 900 }]) {
  test(`${mode}: configure, preview, control second participant, reset at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);await open(page, mode);
    await page.getByRole("button", { name: "Открыть песочницу" }).click();
    const panel = page.getByRole("dialog", { name: `Песочница ${mode}` });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Второй игрок", exact: true }).click();
    await expect(panel.getByLabel("Наличные, $")).toHaveValue("20000");
    await panel.getByLabel("Поиск карточки").fill(mode === "101" ? "Дом для проверки" : "Опцион на покупку MYT4U");
    await panel.locator('[aria-label="Каталог карточек"] button').first().click();
    await panel.getByRole("button", { name: "Назначить следующей" }).click();
    await page.screenshot({ path: test.info().outputPath(`${mode}-catalog-${size.width}.png`), fullPage: true });
    await panel.getByRole("button", { name: "Администратор", exact: true }).click();
    await panel.getByLabel("Наличные, $").fill("15000");
    await panel.locator("legend").filter({ hasText: "Исходная ситуация" }).scrollIntoViewIfNeeded();
    await noOverflow(page);
    const headerBottom = await page.locator(".app-shell-header").evaluate(el => el.getBoundingClientRect().bottom);
    expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(headerBottom);
    await page.screenshot({ path: test.info().outputPath(`${mode}-panel-${size.width}.png`), fullPage: true });
    await panel.getByRole("button", { name: "Применить и начать заново" }).click();
    await expect(panel).not.toBeVisible();
    await page.getByRole("button", { name: "Бросить кубик", exact: true }).filter({ visible: true }).click();
    if (size.width < 1024) await page.getByRole("tab", { name: /^Ход/ }).click();
    await page.getByRole("button", { name: mode === "101" ? /^Мелкая сделка$/ : /^Прирост капитала/ }).filter({ visible: true }).click();
    await expect(page.locator(".game-action-history:visible")).toContainText(mode === "101" ? "Дом для проверки" : "Дом");
    const buy = page.getByRole("button", { name: /Купить|Приобрести/ }).filter({ visible: true });
    await buy.first().click();
    await expect.poll(async () => {
      const state = await (await page.request.get(`${backend}/fixtures/${mode}`)).json();
      return state.snapshot.players[0].financialState.cashCents;
    }).toBe(9000);
    await noOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`${mode}-board-${size.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Открыть песочницу" }).click();
    await expect(page.getByLabel("Наличные, $")).toHaveValue("15000");
    await page.getByRole("button", { name: "Вернуть исходную ситуацию" }).click();
    await expect(panel).not.toBeVisible();
    const persisted = await (await page.request.get(`${backend}/fixtures/${mode}`)).json();
    expect(persisted.snapshot.players[0].financialState.cashCents).toBe(15000);
    expect(persisted.snapshot.sandbox.scenario.players[1].nextCards).toHaveLength(1);
    await expect(page.locator(".game-action-history:visible")).not.toContainText(mode === "101" ? "Дом для проверки" : "Куплен");
    const replay = await (await page.request.get(`${backend}/api/games/${persisted.snapshot.game.id}/replay`)).json();
    expect(replay.events.every((event: { sequence: number }) => event.sequence >= Math.min(...persisted.snapshot.events.map((event: { sequence: number }) => event.sequence)))).toBe(true);
  });
  test(`${mode}: second player rolls on the big track at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);await open(page, mode);
    await page.getByRole("button", { name: "Открыть песочницу" }).click();
    const panel = page.getByRole("dialog", { name: `Песочница ${mode}` });
    await panel.getByRole("button", { name: "Второй игрок", exact: true }).click();
    await panel.getByRole("combobox", { name: /^Круг/ }).selectOption("FAST_TRACK");
    await panel.getByLabel("Кто ходит первым").selectOption({ label: "Второй игрок" });
    await panel.getByLabel("Следующий бросок").selectOption("fixed");
    await panel.getByLabel("Кубик 1").fill("1");
    await panel.getByLabel("Кубик 2").fill("1");
    await panel.getByRole("checkbox").first().check();
    await panel.getByRole("button", { name: "Применить и начать заново" }).click();
    await expect(panel).not.toBeVisible();
    await page.getByRole("button", { name: "Бросить кубики", exact: true }).filter({ visible: true }).click();
    await expect.poll(async () => {
      const data = await (await page.request.get(`${backend}/fixtures/${mode}`)).json();
      return data.snapshot.players[1].fastTrackPosition;
    }).toBe(2);
    await expect(page.locator(".dice-face--rolling:visible")).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`${mode}-fast-${size.width}.png`), fullPage: true });
  });
}
test("sandbox panel remains usable at intermediate widths", async ({ page }) => {
  for (const width of [360, 390, 420, 768, 1023, 1024]) {
    await page.setViewportSize({ width, height: 900 });await open(page, "202");
    await page.getByRole("button", { name: "Открыть песочницу" }).click();
    await expect(page.getByRole("button", { name: "Применить и начать заново" })).toBeInViewport();
    await noOverflow(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await noOverflow(page);
  }
});
test("only the permitted account sees creation and both modes can be created", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const mode of ["101", "202"]) {
    await page.goto(`${origin}/index.html?mode=${mode}&create`);
    await page.getByLabel("Режим песочницы").selectOption(mode);
    const response = page.waitForResponse(r => r.url().endsWith("/api/games/sandbox") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Создать песочницу", exact: true }).click();
    const created = await response;
    expect(created.ok()).toBe(true);
    const data = await created.json();
    expect(data.game.gameType).toBe(mode);expect(data.sandbox.run).toBe(1);
  }
  await page.screenshot({ path: test.info().outputPath("create-sandbox-1440.png"), fullPage: true });
  await page.route(`${origin}/api/games/sandbox/access`, route => route.fulfill({ json: { allowed: false } }));
  await page.goto(`${origin}/index.html?mode=101&create`);
  await expect(page.locator("html")).toHaveAttribute("data-fixture-ready", "true");
  await expect(page.getByRole("button", { name: "Создать песочницу", exact: true })).toHaveCount(0);
});
