import { expect, test } from "@playwright/test";
import { buildSync } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const origin = "http://fj-notifications.test";
const items = Array.from({ length: 3 }, (_, index) => ({
  id: `note-${index + 1}`,
  kind: "OPEN_GAME_PUBLISHED",
  readAt: null,
  createdAt: "2026-10-19T10:00:00.000Z",
  game: {
    id: `game-${index + 1}`,
    code: `code-${index + 1}`,
    title: `Партия ${index + 1}: ` + "длинное название открытой игры ".repeat(4),
    status: "WAITING",
    scheduledAt: "2026-10-20T10:00:00.000Z",
    createdBy: { displayName: "Ведущий игры" }
  }
}));
let output: string;

test.beforeAll(() => {
  output = mkdtempSync(join(tmpdir(), "fj-notifications-ui-"));
  buildSync({
    entryPoints: ["tests/fixtures/notifications-ui.tsx"], outfile: join(output, "app.js"),
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env": JSON.stringify({ NODE_ENV: "development", NEXT_PUBLIC_API_PROXY_PATH: "" }) },
    tsconfig: "apps/web/tsconfig.json",
    alias: {
      "next/link": resolve("tests/fixtures/link.tsx"),
      "next-auth/react": resolve("tests/fixtures/notifications-session.ts")
    }
  });
  execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-c", "apps/web/tailwind.config.ts", "-i", "apps/web/src/app/globals.css", "-o", join(output, "style.css"), "--content", "apps/web/src/**/*.{ts,tsx}", "--minify"]);
  writeFileSync(join(output, "index.html"), '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><div id="root"></div><script src="app.js"></script></html>');
});

test("полностью видимая карточка читается без перехода со страницы", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  const readIds: string[] = [];
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (["/", "/index.html", "/app.js", "/style.css"].includes(url.pathname)) {
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      await route.fulfill({ path: join(output, file) });
    } else if (url.pathname === "/api/users/me/notifications/unread-count") {
      await route.fulfill({ json: { unreadCount: items.length - readIds.length } });
    } else if (url.pathname === "/api/users/me/notifications") {
      await route.fulfill({ json: { items: items.map((item) => ({ ...item, readAt: readIds.includes(item.id) ? "2026-10-19T11:00:00.000Z" : null })), unreadCount: items.length - readIds.length } });
    } else if (url.pathname === "/api/users/me") {
      await route.fulfill({ json: { user: { timeZone: "Europe/Moscow" } } });
    } else if (url.pathname.endsWith("/read") && route.request().method() === "PATCH") {
      readIds.push(url.pathname.split("/").at(-2)!);
      await route.fulfill({ json: { ok: true } });
    } else {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${origin}/`);
  await expect(page.getByRole("button", { name: "Оповещения, непрочитанных: 3" })).toBeVisible();
  await page.getByRole("button", { name: "Оповещения, непрочитанных: 3" }).click();
  await expect(page.getByRole("dialog", { name: "Оповещения" })).toBeVisible();
  await expect(page.getByText("Текущий экран игры")).toBeVisible();
  await expect.poll(() => readIds).toContain("note-1");
  expect(readIds).not.toContain("note-2");
  await expect(page.getByRole("button", { name: "Оповещения, непрочитанных: 2" })).toBeVisible();
  await page.screenshot({ path: join(output, "notifications-mobile.png") });
  await page.locator('[data-notification-id="note-2"]').scrollIntoViewIfNeeded();
  await expect.poll(() => readIds).toContain("note-2");
  await expect(page.getByRole("button", { name: "Оповещения, непрочитанных: 1" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: join(output, "notifications-desktop.png") });
  console.log(`Notifications screenshots: ${output}`);
});

test("оповещение о добавлении игрока открывает лобби по нажатию на карточку", async ({ page }) => {
  const added = { ...items[0], kind: "GAME_PLAYER_ADDED", game: { ...items[0].game, id: "invited-game", title: "Командная игра" } };
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (["/", "/index.html", "/app.js", "/style.css"].includes(url.pathname)) {
      await route.fulfill({ path: join(output, url.pathname === "/" ? "index.html" : url.pathname.slice(1)) });
    } else if (url.pathname === "/api/users/me/notifications/unread-count") {
      await route.fulfill({ json: { unreadCount: 1 } });
    } else if (url.pathname === "/api/users/me/notifications") {
      await route.fulfill({ json: { items: [added], unreadCount: 1 } });
    } else if (url.pathname === "/api/users/me") {
      await route.fulfill({ json: { user: { timeZone: "Europe/Moscow" } } });
    } else if (url.pathname.endsWith("/read")) {
      await route.fulfill({ json: { ok: true } });
    } else {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${origin}/`);
  await page.getByRole("button", { name: /Оповещения/ }).click();
  const card = page.getByRole("link", { name: /Вас добавили в игру/ });
  await expect(card).toHaveAttribute("href", "/games/invited-game");
  await card.click();
  await expect(page).toHaveURL(`${origin}/games/invited-game`);
});
