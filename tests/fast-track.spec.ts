import { test, expect } from '@playwright/test';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const output = join(tmpdir(), 'fj-game-ui');
test.beforeAll(() => {
  mkdirSync(output, { recursive: true });
  buildSync({ entryPoints: ['tests/fixtures/fast-track-ui.tsx'], outfile: join(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json', loader: { '.svg': 'dataurl', '.png': 'dataurl' }, alias: { 'next/navigation': resolve('tests/fixtures/navigation.ts'), 'next/link': resolve('tests/fixtures/link.tsx'), '@sentry/nextjs': '@sentry/browser' } });
  execFileSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-c', 'apps/web/tailwind.config.ts', '-i', 'apps/web/src/app/globals.css', '-o', join(output, 'style.css'), '--content', 'apps/web/src/**/*.{ts,tsx}', '--minify']);
  let fonts = '';
  try {
    const css = readFileSync('apps/web/.next-dev/static/css/app/layout.css', 'utf8');
    fonts = (css.match(/@font-face\s*\{[^}]*font-family: 'Manrope'[^}]*\}/g) ?? []).join('\n').replaceAll('/_next/static/media/', './media/');
    mkdirSync(join(output, 'media'), { recursive: true });
    for (const name of readdirSync('apps/web/.next-dev/static/media').filter((name) => name.endsWith('.woff2'))) copyFileSync(join('apps/web/.next-dev/static/media', name), join(output, 'media', name));
  } catch { /* UI checks also work before the first development build. */ }
  writeFileSync(join(output, 'index.html'), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="app.css"><style>${fonts} body{font-family:Manrope,Arial,sans-serif}button{cursor:pointer}</style><div id="root"></div><script src="app.js"></script></html>`);
});

for (const size of [{ width: 1440, height: 900 }, { width: 1024, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
  test(`large-track controls, dreams and admin settings at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const url = pathToFileURL(resolve(output, 'index.html')).href;
    await page.goto(url);
    await expect(page.locator('[data-fast-cell]')).toHaveCount(48);
    await expect(page.getByRole('button', { name: /Оплатить/ })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.locator('.cell-number,.cell-letter,.mobile-detail,.is-selected')).toHaveCount(0);
    await expect(page.locator('[data-fast-cell] button,[data-fast-cell][aria-pressed]')).toHaveCount(0);
    await expect(page.locator('.player-identity img')).toHaveCount(1);
    await expect(page.locator('.cell-tokens img')).toHaveCount(2);
    await expect(page.locator('[data-fast-cell="1"]').getByRole('img', { name: 'Владелец: Анна', exact: true })).toHaveCount(1);
    await expect(page.locator('.purchased-card')).toHaveCount(3);
    await expect(page.getByRole('article', {name:'Приобретено: Семейная сеть ресторанов'})).toHaveCount(1);
    expect(await page.locator('.player-metrics > div').evaluateAll(items => new Set(items.map(item => item.getBoundingClientRect().top)).size)).toBe(1);
    expect(await page.locator('.player-overview').evaluate(el => Boolean(el.querySelector('.player-goal')!.compareDocumentPosition(el.querySelector('.player-assets')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.getByText('До победы по доходу', {exact:true})).toHaveCount(0);
    await expect(page.getByRole('button', {name:'Выберите действие',exact:true})).toBeDisabled();
    await expect(page.locator('.game-action-entry')).toHaveCount(10);
    await expect(page.locator('.game-action-entry').first()).toContainText('Анна');
    await expect(page.locator('.game-action-entry').nth(1)).toContainText('Борис');
    const overflow = await page.locator('[data-fast-cell]').evaluateAll(cells => cells.filter(cell => [...cell.querySelectorAll('.cell-title,.cell-price,.cell-effect')].some(content => { const a=cell.getBoundingClientRect(),b=content.getBoundingClientRect();return b.top < a.top || b.bottom > a.bottom || b.right > a.right; })).map(cell => cell.getAttribute('aria-label')));
    expect(overflow).toEqual([]);
    await page.screenshot({ path: join(output, `classic-${size.width}.png`), fullPage: true });
    await expect(page.getByRole('group', { name: 'Вариант игрового поля' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Скоростная дорожка' })).toHaveCount(0);
    await expect(page.locator('.board-journey')).toHaveCount(0);
    // Route cards keep their geometry and never overlap.
    const overlap = await page.locator('[data-fast-cell]').evaluateAll((cells) => cells.some((cell, i) => cells.slice(i + 1).some((other) => {
      const a = cell.getBoundingClientRect(), b = other.getBoundingClientRect();
      return Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
    })));
    expect(overlap).toBe(false);
    await page.getByRole('button', { name: 'Отказаться и завершить ход' }).click();
    await expect(page.getByText('Отказ принят', { exact: true })).toBeVisible();
    await page.getByLabel('Количество кубиков').selectOption('3');
    await page.screenshot({path:join(output,`roll-${size.width}.png`),fullPage:true});
    await page.getByRole('button', { name: 'Бросить кубики' }).click();
    await expect(page.getByText('Бросок принят', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(`${url}?mode=occupied`);
    await page.screenshot({ path: join(output, `classic-occupied-${size.width}.png`), fullPage: true });
    await page.goto(`${url}?mode=lobby`);
    await page.getByLabel('Мечта большого круга').selectOption('0');
    await expect(page.locator('p').filter({ hasText: /^Купите лес ·/ })).toBeVisible();
    await page.getByText('Посмотреть все мечты', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Купите лес/ })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: join(output, `dreams-${size.width}.png`), fullPage: true });
    await page.goto(`${url}?mode=admin`);
    await page.getByRole('checkbox', { name: 'Начать сразу на большом круге' }).check();
    await expect(page.getByLabel('Наличные каждого игрока, $')).toHaveValue('500000');
    await expect(page.getByLabel('Начальный доход CASHFLOW, $')).toHaveValue('100000');
    await page.screenshot({ path: join(output, `admin-${size.width}.png`), fullPage: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

// Compare the approved artifact itself, so changes to route geometry cannot silently drift.
test('the remaining route preserves the approved prototype geometry and colors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const source = pathToFileURL(resolve('dist/fast-track-prototype/index.html')).href;
  const app = pathToFileURL(resolve(output, 'index.html')).href;
  const reference: Record<string, unknown> = {};
  for (const view of ['classic']) {
    await page.goto(source);
    reference[view] = await page.locator(`#${view}-board .board-cell`).evaluateAll(cells => cells.map(cell => {
      const s = getComputedStyle(cell);
      return { x: (cell as HTMLElement).offsetLeft, y: (cell as HTMLElement).offsetTop, width: s.width, height: s.height, background: s.backgroundColor, radius: s.borderRadius };
    }));
    await page.screenshot({ path: join(output, `prototype-${view}-1440.png`), fullPage: true });
    await page.goto(app);
    expect(await page.locator('[data-fast-cell]').evaluateAll(cells => cells.map(cell => {
      const s = getComputedStyle(cell);
      return { x: (cell as HTMLElement).offsetLeft, y: (cell as HTMLElement).offsetTop, width: s.width, height: s.height, background: s.backgroundColor, radius: s.borderRadius };
    }))).toEqual(reference[view]);
    await page.screenshot({ path: join(output, `approved-${view}-1440.png`), fullPage: true });
    const cell = page.locator('[data-fast-cell="23"]');
    const before = await cell.evaluate(el => ({shadow:getComputedStyle(el).boxShadow,transform:getComputedStyle(el).transform,background:getComputedStyle(el).backgroundColor}));
    await cell.hover();
    await cell.click();
    expect(await cell.evaluate(el => ({shadow:getComputedStyle(el).boxShadow,transform:getComputedStyle(el).transform,background:getComputedStyle(el).backgroundColor}))).toEqual(before);
    await expect(page.locator('[data-fast-cell][aria-pressed],.cell-detail')).toHaveCount(0);
  }
  await page.goto(source);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, 'prototype-classic-390.png'), fullPage: true });
});

for (const width of [1440, 768, 390, 320]) {
  test(`active game menu and administrator chat at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${pathToFileURL(resolve(output, 'index.html')).href}?mode=menu`);
    const header = page.locator('header');
    await expect(header.getByRole('button', {name:'Большой круг',exact:true})).toHaveAttribute('aria-pressed','true');
    await header.getByRole('button', {name:'Малый круг',exact:true}).click();
    await expect(page.getByLabel('Открытый круг')).toHaveText('RAT_RACE');
    await header.getByRole('button', {name:'Большой круг',exact:true}).click();
    await expect(page.getByLabel('Открытый круг')).toHaveText('FAST_TRACK');
    await expect(header.getByRole('link', { name: 'Пульт ведущего', exact: true })).toHaveAttribute('href', '/games/synthetic/host');
    await expect(header.getByRole('link', { name: 'Открыть поле', exact: true })).toHaveAttribute('href', '/games/synthetic/display?view=classic');
    await expect(header.getByRole('link', { name: 'Открыть поле', exact: true })).toHaveAttribute('target', '_blank');
    await expect(header.getByText(/Вечерняя партия|5C8G8M|Раунд|Ход:/)).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Удалить игру' })).toHaveCount(0);
    await expect(page.getByText(/^Тестовая партия ·/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Открыть чат, непрочитанных сообщений: 2' })).toBeVisible();
    const brand = await header.getByRole('link', { name: 'Финансовое путешествие — личный кабинет' }).boundingBox();
    const shortcuts = await header.getByRole('navigation', { name: 'Экраны ведущего' }).boundingBox();
    if (width >= 1280) expect(brand!.x + brand!.width).toBeLessThanOrEqual(shortcuts!.x);
    else expect(brand!.y + brand!.height).toBeLessThanOrEqual(shortcuts!.y);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: join(output, `menu-${width}.png`), fullPage: true });

    await page.getByRole('button', { name: /Открыть чат/ }).click();
    const chat = page.getByRole('dialog', { name: 'Чат', exact: true });
    await expect(chat.getByText('Администратор', { exact: true })).toHaveCount(2);
    await expect(chat.getByText(/^Тестовая партия ·/)).toHaveCount(1);
    await expect.poll(async () => (await chat.boundingBox())!.y >= (await header.boundingBox())!.y + (await header.boundingBox())!.height).toBe(true);
    await chat.getByPlaceholder('Сообщение').fill('Привет участникам');
    await chat.getByRole('button', { name: 'Отправить сообщение' }).click();
    await expect(chat.getByText('Привет участникам', { exact: true })).toBeVisible();
    await expect(chat.getByText('Администратор', { exact: true })).toHaveCount(2);
    await page.screenshot({ path: join(output, `chat-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(chat).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Открыть чат', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Синхронизировать' }).click();
    await expect(page.getByRole('button', { name: 'Открыть чат', exact: true })).toBeVisible();

    if (width < 768) {
      await page.getByRole('button', { name: 'Управление игрой', exact: true }).click();
      await page.getByRole('button', { name: 'Поставить на паузу', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Поставить игру на паузу' }).click();
    }
    await page.getByRole('button', { name: 'Открыть чат, непрочитанных сообщений: 1' }).click();
    await expect(chat.getByText('Игра поставлена на паузу. Весь прогресс сохранён.', { exact: true })).toHaveCount(1);
    await page.keyboard.press('Escape');
    if (width < 768) {
      await page.getByRole('button', { name: 'Игра на паузе', exact: true }).click();
      await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Продолжить игру' }).click();
    }
    await page.getByRole('button', { name: /Открыть чат/ }).click();
    await expect(chat.getByText('Игра продолжена.', { exact: true })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await page.reload();
    await page.getByRole('button', { name: 'Открыть чат', exact: true }).click();
    await expect(chat.getByText(/^Тестовая партия ·/)).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test('host shortcuts stay hidden for players and solo games', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const role of ['player', 'solo']) {
    await page.goto(`${pathToFileURL(resolve(output, 'index.html')).href}?mode=menu&role=${role}`);
    await expect(page.getByRole('button', { name: /Открыть чат/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Экраны ведущего' })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const mode of ['', 'small']) {
  test(`shared action history loads ten at a time: ${mode || 'large'}`, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(`${pathToFileURL(resolve(output,'index.html')).href}?mode=${mode}`);
    await expect(page.locator('.game-action-entry')).toHaveCount(10);
    if(mode === 'small') {
      await expect(page.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible();
      await page.screenshot({path:join(output,'small-turn-390.png'),fullPage:true});
    }
    await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
    await expect(page.locator('.game-action-entry')).toHaveCount(20);
    await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
    await expect(page.locator('.game-action-entry')).toHaveCount(25);
    await expect(page.getByRole('button',{name:'Показать ещё',exact:true})).toHaveCount(0);
  });
}

test('archive retries without losing recent actions or duplicating events', async ({page}) => {
  await page.goto(`${pathToFileURL(resolve(output,'index.html')).href}?mode=archive`);
  await expect(page.locator('.game-action-entry')).toHaveCount(5);
  await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить');
  await expect(page.locator('.game-action-entry')).toHaveCount(5);
  await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.game-action-entry')).toHaveCount(20);
  await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
  await expect(page.locator('.game-action-entry')).toHaveCount(25);
});

test('decisions stay disabled on pause and during another player’s turn', async ({page}) => {
  for(const mode of ['paused','waiting']) {
    await page.goto(`${pathToFileURL(resolve(output,'index.html')).href}?mode=${mode}`);
    await expect(page.getByRole('button',{name:/Оплатить/})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Отказаться и завершить ход'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Ожидайте ход'})).toBeDisabled();
  }
});
