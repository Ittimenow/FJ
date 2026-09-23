import { test, expect, type Page } from '@playwright/test';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const fixtureOrigin = 'http://fj-game.test';
const fixtureUrl = `${fixtureOrigin}/index.html`;
let output: string;
test.beforeAll(() => {
  output = mkdtempSync(join(tmpdir(), 'fj-game-ui-'));
  buildSync({ entryPoints: ['tests/fixtures/fast-track-ui.tsx'], outfile: join(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }, tsconfig: 'apps/web/tsconfig.json', loader: { '.svg': 'dataurl', '.png': 'dataurl' }, alias: { 'next/navigation': resolve('tests/fixtures/navigation.ts'), 'next/link': resolve('tests/fixtures/link.tsx'), 'socket.io-client': resolve('tests/fixtures/socket.ts'), '@sentry/nextjs': '@sentry/browser' } });
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

async function serveFixture(page: Page) {
  page.on('pageerror', error => console.error(error.stack));
  // Serve real assets before navigation so root-relative image URLs work in every browser.
  await page.route(`${fixtureOrigin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/logo.svg' || /^\/figurines\/[a-z0-9-]+\.png$/.test(pathname)) {
      await route.fulfill({ path: resolve('apps/web/public', `.${pathname}`) });
    } else if (['/index.html', '/app.js', '/app.css', '/style.css'].includes(pathname) || /^\/media\/[\w.-]+\.woff2$/.test(pathname)) {
      await route.fulfill({ path: join(output, pathname) });
    } else {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
}
test.beforeEach(async ({ page }) => { await serveFixture(page); });

for (const size of [{ width: 1440, height: 900 }, { width: 1024, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
  test(`large-track controls, dreams and admin settings at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const url = fixtureUrl;
    await page.goto(url);
    await expect(page.locator('[data-fast-cell]')).toHaveCount(size.width < 1024 ? 0 : 48);
    await expect(page.getByRole('button', { name: /Оплатить/ })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(size.width < 1024 ? 3 : 0);
    await expect(page.locator('.cell-number,.cell-letter,.mobile-detail,.is-selected')).toHaveCount(0);
    await expect(page.locator('[data-fast-cell] button,[data-fast-cell][aria-pressed]')).toHaveCount(0);
    await expect(page.locator('.player-identity img')).toHaveCount(1);
    const tokenContainer = size.width < 1024 ? '.fast-track-timeline-players' : '.cell-tokens';
    await expect(page.locator(`${tokenContainer} img`)).toHaveCount(2);
    for (const [id, figurine] of [['anna', 'rubber-duck'], ['boris', 'cat-in-box']]) {
      const image = page.locator(`${tokenContainer} [data-player-id="${id}"] img`);
      await expect(image).toHaveAttribute('src', `/figurines/${figurine}.png`);
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    if (size.width >= 1024) await expect(page.locator('[data-fast-cell="1"]').getByRole('img', { name: 'Владелец: Анна', exact: true })).toHaveCount(1);
    if (size.width < 1024) await page.getByRole('tab', { name: 'Игрок', exact: true }).click();
    expect(await page.locator('.player-metrics > div').evaluateAll(items => new Set(items.map(item => item.getBoundingClientRect().top)).size)).toBe(1);
    if (size.width < 1024) {
      await expect(page.locator('.player-overview .player-assets')).toHaveCount(0);
      await page.getByRole('tab', { name: /Активы/ }).click();
    } else {
      expect(await page.locator('.player-overview').evaluate(el => Boolean(el.querySelector('.player-goal')!.compareDocumentPosition(el.querySelector('.player-assets')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    }
    await expect(page.locator('.purchased-card')).toHaveCount(3);
    await expect(page.getByRole('article', {name:'Приобретено: Семейная сеть ресторанов'})).toHaveCount(1);
    if (size.width < 1024) await page.getByRole('tab', { name: /^Ход/ }).click();
    await expect(page.getByText('До победы по доходу', {exact:true})).toHaveCount(0);
    if (size.width >= 1024) await expect(page.getByRole('button', {name:'Выберите действие',exact:true})).toBeDisabled();
    else await expect(page.locator('.dice-action')).toHaveCount(0);
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
    await page.getByRole('button', { name: /Купите лес/ }).click();
    await expect(page.locator('p').filter({ hasText: /^Купите лес ·/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Мечта большого круга', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Мечта большого круга', exact: true }).click();
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

// Resizing preserves the continuous route and its semantic cell colors.
test('the responsive route preserves the prototype proportions and colors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const source = pathToFileURL(resolve('dist/fast-track-prototype/index.html')).href;
  const app = fixtureUrl;
  const reference: Record<string, unknown> = {};
  for (const view of ['classic']) {
    await page.goto(source);
    // The prototype imports the live stylesheet but stores pixel coordinates.
    // Keep its canvas at the original size when reading the reference route.
    await page.locator(`#${view}-board`).evaluate(el => { (el as HTMLElement).style.width = '1240px'; });
    reference[view] = await page.locator(`#${view}-board .board-cell`).evaluateAll(cells => cells.map(cell => {
      const s = getComputedStyle(cell);
      const r = cell.getBoundingClientRect(), board = cell.parentElement!.getBoundingClientRect();
      return { x: Math.round((r.left-board.left)*1240/board.width), y: Math.round((r.top-board.top)*714/board.height), width: Math.round(r.width*1240/board.width), height: Math.round(r.height*714/board.height), background: s.backgroundColor, radius: s.borderRadius };
    }));
    await page.screenshot({ path: join(output, `prototype-${view}-1440.png`), fullPage: true });
    await page.goto(app);
    expect(await page.locator('[data-fast-cell]').evaluateAll(cells => cells.map(cell => {
      const s = getComputedStyle(cell);
      const r = cell.getBoundingClientRect(), board = cell.parentElement!.getBoundingClientRect();
      return { x: Math.round((r.left-board.left)*1240/board.width), y: Math.round((r.top-board.top)*714/board.height), width: Math.round(r.width*1240/board.width), height: Math.round(r.height*714/board.height), background: s.backgroundColor, radius: s.borderRadius };
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
    await page.goto(`${fixtureUrl}?mode=menu`);
    const header = page.locator('header');
    await expect(header.getByRole('button', {name:'Большой круг',exact:true})).toHaveAttribute('aria-pressed','true');
    await header.getByRole('button', {name:'Малый круг',exact:true}).click();
    await expect(page.getByLabel('Открытый круг')).toHaveText('RAT_RACE');
    await header.getByRole('button', {name:'Большой круг',exact:true}).click();
    await expect(page.getByLabel('Открытый круг')).toHaveText('FAST_TRACK');
    await expect(header.getByRole('link', { name: 'Правила игры' })).toBeVisible();
    if (width < 1280) await header.getByRole('button', { name: 'Меню игры', exact: true }).click();
    const hostLink = header.getByRole('link', { name: 'Пульт ведущего', exact: true });
    await expect(hostLink).toBeVisible();
    await expect(hostLink).toHaveAttribute('href', '/games/synthetic/host');
    await expect(header.getByRole('link', { name: 'Открыть поле', exact: true })).toHaveAttribute('target', '_blank');
    if (width < 1280) {
      await expect(header.getByRole('link', { name: /Открыть профиль/ })).toBeVisible();
      await expect(header.getByRole('button', { name: /Открыть диагностику/ })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(header.getByRole('button', { name: 'Меню игры', exact: true })).toBeFocused();
    }
    await expect(header.getByText(/Вечерняя партия|5C8G8M|Раунд|Ход:/)).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Удалить игру' })).toHaveCount(0);
    await expect(page.getByText(/^Тестовая партия ·/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Открыть чат, непрочитанных сообщений: 2' })).toBeVisible();
    const brand = await header.getByRole('link', { name: 'Финансовое путешествие — личный кабинет' }).boundingBox();
    const rules = await header.getByRole('link', { name: 'Правила игры' }).boundingBox();
    const tracks = await header.getByRole('group', { name: 'Показать круг' }).boundingBox();
    if (width < 1280) {
      expect(Math.abs(brand!.y - rules!.y)).toBeLessThanOrEqual(4);
      expect(Math.abs(tracks!.y - rules!.y)).toBeLessThanOrEqual(4);
      expect(brand!.x + brand!.width).toBeLessThanOrEqual(tracks!.x);
      const chatBox = await header.getByRole('button', { name: /Открыть чат/ }).boundingBox();
      expect(Math.abs(chatBox!.y - rules!.y)).toBeLessThanOrEqual(4);
    }
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

    if (width < 1280) {
      await page.getByRole('button', { name: 'Меню игры', exact: true }).click();
      await page.getByRole('button', { name: 'Поставить на паузу', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Поставить игру на паузу' }).click();
    }
    await page.getByRole('button', { name: 'Открыть чат, непрочитанных сообщений: 1' }).click();
    await expect(chat.getByText('Игра поставлена на паузу. Весь прогресс сохранён.', { exact: true })).toHaveCount(1);
    await page.keyboard.press('Escape');
    if (width < 1280) {
      await page.getByRole('button', { name: 'Меню игры', exact: true }).click();
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
    await page.goto(`${fixtureUrl}?mode=menu&role=${role}`);
    await expect(page.getByRole('button', { name: /Открыть чат/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Экраны ведущего' })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const mode of ['', 'small']) {
  test(`shared action history loads ten at a time: ${mode || 'large'}`, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(`${fixtureUrl}?mode=${mode}`);
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
  await page.goto(`${fixtureUrl}?mode=archive`);
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
    await page.goto(`${fixtureUrl}?mode=${mode}`);
    await expect(page.getByRole('button',{name:/Оплатить/})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Отказаться и завершить ход'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Ожидайте ход'})).toBeDisabled();
  }
});

for (const size of [{width:1366,height:768},{width:1920,height:1080},{width:2560,height:1440},{width:3440,height:1440},{width:3840,height:2160}]) {
  for (const track of ['small','large']) {
    test(`${track} board fills the desktop viewport at ${size.width}px`, async ({page}) => {
      await page.setViewportSize(size);
      const errors:string[]=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${fixtureUrl}?mode=desktop-${track}`);
      const shell=page.locator(track==='large'?'.board-shell':'.desktop-game-board-shell');
      const cells=page.locator(track==='large'?'[data-fast-cell]':'.desktop-game-board-grid > .relative');
      await expect(cells).toHaveCount(track==='large'?48:24);
      await expect(page.locator('.player-status')).toHaveCount(0);
      const bounds=await shell.boundingBox();
      expect(bounds!.x).toBeLessThanOrEqual(16);
      expect(bounds!.width).toBeGreaterThanOrEqual(size.width-32);
      expect(Math.abs(bounds!.y+bounds!.height-size.height)).toBeLessThanOrEqual(9);
      const geometry=await cells.evaluateAll(items=>{
        const rects=items.map(item=>item.getBoundingClientRect());
        return {
          widths:rects.map(r=>r.width),heights:rects.map(r=>r.height),
          overlap:rects.some((a,i)=>rects.slice(i+1).some(b=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)))
        };
      });
      expect(Math.max(...geometry.widths)-Math.min(...geometry.widths)).toBeLessThan(.1);
      expect(Math.max(...geometry.heights)-Math.min(...geometry.heights)).toBeLessThan(.1);
      expect(geometry.overlap).toBe(false);
      const turnHeader=page.locator('.dice-action');
      expect(await turnHeader.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 245, 237)');
      expect(await turnHeader.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('0px');
      if(track==='large') {
        const overflow=await cells.evaluateAll(items=>items.filter(cell=>[...cell.querySelectorAll('.cell-title,.cell-price,.cell-effect')].some(content=>{
          const a=cell.getBoundingClientRect(),b=content.getBoundingClientRect();return b.top<a.top||b.bottom>a.bottom||b.right>a.right;
        })).map(cell=>cell.getAttribute('aria-label')));
        expect(overflow).toEqual([]);
        expect(await page.locator('.player-metrics dt').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
        if(size.width>=1920) {
          expect(await page.locator('.cell-title').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
          expect(await page.locator('.board-scroll').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
        }
      }
      await page.screenshot({path:join(output,`desktop-${track}-${size.width}.png`),fullPage:true});
      await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
      await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
      await expect(page.locator('.game-action-entry')).toHaveCount(25);
      const after=await shell.boundingBox();
      expect(after).toEqual(bounds);
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(page.getByRole('button',{name:'Пропустить ход',exact:true})).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

for(const count of [2,3]) {
  test(`${count} dice replace the roll button and reset for a new turn`,async({page})=>{
    await page.setViewportSize({width:1920,height:1080});
    await page.goto(`${fixtureUrl}?mode=desktop-large`);
    await page.getByLabel('Количество кубиков').selectOption(String(count));
    await expect(page.getByLabel('Результат броска')).toHaveCount(0);
    await page.getByRole('button',{name:'Пропустить ход',exact:true}).click();
    await expect(page.locator('output')).toHaveText('Ход пропущен');
    await page.getByRole('button',{name:'Бросить кубики',exact:true}).click();
    await expect(page.getByRole('button',{name:'Бросить кубики',exact:true})).toHaveCount(0);
    await expect(page.getByLabel('Результат броска').locator('[aria-label^="На кубике"]')).toHaveCount(count);
    await expect(page.getByRole('heading',{name:'Ход выполнен',exact:true})).toBeVisible();
    await page.evaluate(()=>window.dispatchEvent(new Event('fixture:next-turn')));
    await expect(page.getByRole('button',{name:'Бросить кубики',exact:true})).toBeEnabled();
    await expect(page.getByLabel('Результат броска')).toHaveCount(0);
  });
}

test('a failed roll restores the button',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${fixtureUrl}?mode=roll-error`);
  await page.getByRole('button',{name:'Бросить кубики',exact:true}).click();
  await expect(page.locator('output')).toHaveText('Не удалось бросить кубик');
  await expect(page.getByRole('button',{name:'Бросить кубики',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Результат броска')).toHaveCount(0);
});

for(const view of ['classic','journey']) {
  test(`large board keeps its panels when resizing the ${view} room`,async({page})=>{
    await page.setViewportSize({width:1920,height:1080});
    await page.goto(`${fixtureUrl}?mode=desktop-large&view=${view}`);
    await expect(page.locator('.central-panel')).toBeVisible();
    await page.setViewportSize({width:1024,height:768});
    await expect(page.locator('.mobile-controls')).toBeVisible();
    expect(await page.locator('.fast-track').evaluate(el=>el.clientHeight)).toBeGreaterThan(300);
    await page.locator('.board-scroll').scrollIntoViewIfNeeded();
    await expect(page.locator('.board-scroll')).toBeInViewport();
    await page.setViewportSize({width:390,height:844});
    await expect(page.locator('.board-shell')).toHaveCount(0);
    await expect(page.locator('.dice-action')).toHaveCount(0);
    await expect(page.locator('[data-fast-timeline-cell]')).toHaveCount(49);
    await page.setViewportSize({width:1024,height:768});
    await expect(page.locator('.board-shell')).toBeVisible();
    await expect(page.locator('[data-fast-cell="23"]')).toBeInViewport();
    await page.setViewportSize({width:1920,height:1080});
    await expect(page.locator('.central-panel')).toBeVisible();
    await expect(page.locator('.mobile-controls')).toHaveCount(0);
    expect(await page.locator('.board-scroll').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
  });
}

for (const width of [320, 390, 430]) {
  test(`mobile room keeps one header row, scroll and floating dice at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${fixtureUrl}?mode=mobile-room`);
    const bar = page.getByRole('region', { name: 'Действия текущего хода' });
    await expect(bar).toBeVisible();
    await expect(page.getByRole('link', { name: 'Правила игры' })).toBeInViewport();
    await page.getByRole('tab', { name: 'Игрок', exact: true }).click();
    await expect(page.locator('.player-identity [data-figurine="rubber-duck"] img')).toBeVisible();
    const others = page.getByRole('region', { name: 'Остальные игроки', exact: true });
    await expect(others.locator('[data-other-player]')).toHaveCount(2);
    await expect(others.locator('[data-other-player="boris"]').getByRole('img', { name: 'Большой круг', exact: true })).toBeVisible();
    await expect(others.locator('[data-other-player="vera"]').getByRole('img', { name: 'Большой круг', exact: true })).toHaveCount(0);
    await page.getByRole('tab', { name: /^Ход/ }).click();
    await expect(page.locator('.dice-action')).toHaveCount(0);
    await expect(bar.getByRole('heading', { name: 'Ваш ход', exact: true })).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Пропустить ход', exact: true })).toBeVisible();
    await expect(page.locator('.game-action-entry [data-player-id="boris"]').first()).toHaveAttribute('data-figurine', 'cat-in-box');
    await page.getByLabel('Количество кубиков').selectOption('3');
    const bounds = await bar.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(await bar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.locator('.board-shell')).toHaveCount(0);
    await expect(page.locator('[data-fast-cell]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.mouse.move(width / 2, 350);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await expect(bar).toBeInViewport();
    await page.locator('.fast-track-timeline').scrollIntoViewIfNeeded();
    expect(await page.locator('.fast-track-timeline').evaluate(el => {
      el.scrollLeft = 200;
      return el.scrollLeft > 0;
    })).toBe(true);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: join(output, `mobile-room-${width}.png`) });
    await page.getByRole('tab', { name: /Активы/ }).click();
    await bar.getByRole('button', { name: 'Бросить кубики', exact: true }).click();
    await expect(page.getByText('Бросок принят', { exact: true })).toBeVisible();
    await expect(bar.getByLabel('Результат броска')).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Бросить кубики', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^Ход/ })).toHaveAttribute('aria-selected', 'true');
  });
}

for (const width of [1440, 390]) {
test(`large track animates humans and queued bot moves through each route cell at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${fixtureUrl}?mode=movement`);
  await expect(page.locator('html')).toHaveAttribute('data-fixture-ready', 'true');
  if (width < 1024) await expect(page.locator('[data-fast-timeline-cell]')).toHaveCount(49);
  await expect(page.locator('[data-moving-player]')).toHaveCount(0);
  await page.evaluate(() => {
    const visited: Record<string, number[]> = { anna: [], boris: [] };
    (window as any).visited = visited;
    new MutationObserver(() => {
      for (const id of Object.keys(visited)) {
        const token = document.querySelector(`.cell-tokens [data-player-id="${id}"],.fast-track-timeline-players [data-player-id="${id}"]`);
        const cell = token?.closest('[data-fast-cell],[data-fast-timeline-cell]');
        const position = Number(cell?.getAttribute('data-fast-cell') ?? cell?.getAttribute('data-fast-timeline-cell'));
        if (token && visited[id]!.at(-1) !== position) visited[id]!.push(position);
      }
    }).observe(document.querySelector('.fast-track')!, { childList: true, subtree: true });
    const move = (id: string, sequence: number, from: number, route: number[]) => ({ id: `move-${sequence}`, sequence, type: 'player:move', createdAt: new Date().toISOString(), gamePlayer: { id, seat: 1, role: 'PLAYER' }, payload: { track: 'FAST_TRACK', from, to: route.at(-1), steps: route.length, route } });
    window.dispatchEvent(new CustomEvent('fixture:moves', { detail: [move('anna', 101, 23, [24,25,26]), move('boris', 102, 46, [47,0,1])] }));
  });
  await expect(page.locator('.fast-track')).toHaveAttribute('data-moving-player', 'anna');
  if (width >= 1024) {
    await expect(page.locator('[data-fast-cell="26"] .cell-tokens [data-player-id="anna"]')).toHaveCount(1);
    await expect(page.locator('[data-fast-cell="1"] .cell-tokens [data-player-id="boris"]')).toHaveCount(1);
  }
  if (width < 1024) {
    await expect(page.locator('[data-fast-timeline-cell="26"] [data-player-id="anna"]')).toHaveCount(1);
    await expect(page.locator('[data-fast-timeline-cell="1"] [data-player-id="boris"]')).toHaveCount(1);
  }
  await expect(page.locator('[data-moving-player]')).toHaveCount(0);
  const visited = await page.evaluate(() => (window as any).visited);
  expect(visited.anna).toEqual(expect.arrayContaining([24,25,26]));
  expect(visited.boris).toEqual(expect.arrayContaining([47,0,1]));
});
}

test('reduced motion immediately shows the final large-track position', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${fixtureUrl}?mode=movement`);
  await expect(page.locator('html')).toHaveAttribute('data-fixture-ready', 'true');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:moves', { detail: [{ id: 'move-101', sequence: 101, type: 'player:move', createdAt: '', gamePlayer: { id: 'boris', seat: 2, role: 'PLAYER' }, payload: { track: 'FAST_TRACK', from: 12, to: 15, steps: 3, route: [13,14,15] } }] })));
  await expect(page.locator('[data-fast-cell="15"] .cell-tokens [data-player-id="boris"]')).toHaveCount(1);
  await expect(page.locator('[data-moving-player]')).toHaveCount(0);
});


test('movement waits for the local dice and never replays duplicate or restored events', async ({ page }) => {
  await page.goto(`${fixtureUrl}?mode=movement`);
  await expect(page.locator('html')).toHaveAttribute('data-fixture-ready', 'true');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('fixture:phase', { detail: 'rolling' }));
    const moves = [{ id: 'move-101', sequence: 101, type: 'player:move', createdAt: '', gamePlayer: { id: 'anna', seat: 1, role: 'PLAYER' }, payload: { track: 'FAST_TRACK', from: 23, to: 25, steps: 2, route: [24,25] } }];
    (window as any).moves = moves;
    window.dispatchEvent(new CustomEvent('fixture:moves', { detail: moves }));
  });
  await expect(page.locator('.fast-track')).toHaveAttribute('data-moving-player', 'anna');
  await page.waitForTimeout(300);
  await expect(page.locator('[data-fast-cell="23"] .cell-tokens [data-player-id="anna"]')).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:phase', { detail: 'moving' })));
  await expect(page.locator('[data-fast-cell="25"] .cell-tokens [data-player-id="anna"]')).toHaveCount(1);
  await expect(page.locator('[data-moving-player]')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:moves', { detail: (window as any).moves })));
  await expect(page.locator('[data-moving-player]')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:remount')));
  await expect(page.locator('[data-moving-player]')).toHaveCount(0);
  await expect(page.locator('[data-fast-cell="25"] .cell-tokens [data-player-id="anna"]')).toHaveCount(1);
});

for (const width of [320, 390, 430]) {
  test(`mobile large-track tabs separate history, player and assets at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${fixtureUrl}?mode=mixed-history`);
    const timeline = page.getByRole('list', { name: 'Ячейки большого круга и позиции игроков' });
    const turn = page.getByRole('tab', { name: /^Ход/ });
    const player = page.getByRole('tab', { name: 'Игрок', exact: true });
    const assets = page.getByRole('tab', { name: /Активы/ });
    await expect(page.getByRole('tab')).toHaveCount(3);
    await expect(turn).toHaveAttribute('aria-selected', 'true');
    await expect(timeline.locator('li')).toHaveCount(49);
    await expect(timeline.locator('[data-player-id="vera"]')).toHaveCount(0);
    await expect(timeline.locator('[data-fast-timeline-cell="23"] [data-player-id="anna"]')).toHaveAttribute('data-figurine', 'rubber-duck');
    await expect(timeline.locator('[data-fast-timeline-cell="12"] [data-player-id="boris"]')).toHaveAttribute('data-figurine', 'cat-in-box');
    await expect(timeline.locator('[data-fast-timeline-cell="23"]')).toBeInViewport();
    expect((await timeline.boundingBox())!.y).toBeLessThan((await turn.boundingBox())!.y);
    await expect(page.getByRole('region', { name: 'История большого круга' })).toBeVisible();
    await expect(page.locator('.game-action-entry')).toHaveCount(10);
    await expect(page.locator('.game-action-entry').first()).toContainText('Анна');
    await page.screenshot({ path: testInfo.outputPath('turn.png') });
    await page.getByRole('button', { name: 'Показать ещё', exact: true }).click();
    await expect(page.locator('.game-action-entry')).toHaveCount(20);

    await player.click();
    await expect(page.getByRole('heading', { name: 'Цель игры', exact: true })).toBeVisible();
    await expect(page.getByText('Начальный доход', { exact: true })).toBeVisible();
    await expect(page.getByText('Целевая мечта', { exact: true })).toBeVisible();
    await expect(page.getByText('Активна · 1–3 кубика', { exact: true })).toBeVisible();
    await expect(page.locator('.player-identity [data-figurine="rubber-duck"] img')).toBeVisible();
    await expect(page.getByRole('region', { name: 'История большого круга' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Активы большого круга', exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('player.png'), fullPage: true });

    await assets.click();
    await expect(page.getByRole('article', { name: /^Приобретено:/ })).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Цель игры', exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('assets.png') });
    await assets.press('Home');
    await expect(turn).toBeFocused();
    await expect(page.locator('.game-action-entry')).toHaveCount(20);
    await page.getByRole('button', { name: 'Показать ещё', exact: true }).click();
    await expect(page.locator('.game-action-entry')).toHaveCount(25);
    await expect(page.getByRole('region', { name: 'История большого круга' })).not.toContainText('Ячейка малого круга');
    await turn.press('ArrowRight');
    await expect(player).toBeFocused();
    await player.press('End');
    await expect(assets).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('mobile large track shows empty tabs, start tokens and every player sharing a cell', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixtureUrl}?mode=empty`);
  await expect(page.getByText('Действий пока нет.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Активы/ }).click();
  await expect(page.getByText('Пока нет приобретённых карточек.', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Активы/ })).toContainText('0');
  await page.goto(`${fixtureUrl}?mode=start`);
  const start = page.locator('[data-fast-timeline-cell="-1"]');
  await expect(start.locator('[data-player-id]')).toHaveCount(2);
  await expect(start).toBeInViewport();
  await page.goto(`${fixtureUrl}?mode=occupied`);
  const sharedCell = page.locator('[data-fast-timeline-cell="12"]');
  await expect(sharedCell).toHaveAttribute('aria-label', /Борис, Вера/);
  await expect(sharedCell.locator('[data-player-id]')).toHaveCount(2);
  await sharedCell.scrollIntoViewIfNeeded();
  for (const id of ['boris', 'vera']) await expect(sharedCell.locator(`[data-player-id="${id}"]`)).toBeInViewport();
  const tokens = await sharedCell.locator('[data-player-id]').evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }; }));
  expect(tokens[0]!.top).toBe(tokens[1]!.top);
  expect(tokens[0]!.right).toBeLessThanOrEqual(tokens[1]!.left);
});

for (const scenario of [{ width: 390, mode: 'mixed-history' }, { width: 1440, mode: 'desktop-large' }, { width: 1440, mode: 'desktop-small' }]) {
  test(`other players show results from both tracks in ${scenario.mode} at ${scenario.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await page.goto(`${fixtureUrl}?mode=${scenario.mode}`);
    if (scenario.width < 1024) await page.getByRole('tab', { name: 'Игрок', exact: true }).click();
    const others = page.getByRole('region', { name: 'Остальные игроки', exact: true });
    await expect(others.locator('[data-other-player]')).toHaveCount(2);
    await expect(others.locator('[data-other-player="anna"]')).toHaveCount(0);
    const boris = others.locator('[data-other-player="boris"]');
    const vera = others.locator('[data-other-player="vera"]');
    await expect(boris).toContainText('Борис');
    await expect(boris.getByRole('img', { name: 'Большой круг', exact: true })).toBeVisible();
    await expect(boris.locator('[data-player-id="boris"]')).toHaveAttribute('data-figurine', 'cat-in-box');
    await expect(boris).toContainText(/CASHFLOW 139\s000/);
    await expect(boris.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '39000');
    await expect(boris.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '50000');
    await expect(vera).toContainText('Вера');
    await expect(vera).toContainText(/Поток 1\s120/);
    await expect(vera.getByRole('img', { name: 'Большой круг', exact: true })).toHaveCount(0);
    await expect(vera.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await expect(vera).toContainText('Финансовая свобода');
    await vera.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('other-players.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const width of [320, 390, 1024, 1440]) {
  test(`dream cards scroll and collapse after selection at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${fixtureUrl}?mode=lobby`);
    const toggle = page.getByRole('button', { name: 'Мечта большого круга', exact: true });
    const cards = page.getByRole('group', { name: 'Карточки мечт', exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(page.getByText('Для начала партии мечту должен выбрать каждый игрок.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Выберите вашу мечту. Покупка этой мечты принесёт победу в этой игре. После старта изменить выбор нельзя.', { exact: true })).toBeVisible();
    await expect(cards).toBeVisible();
    expect(await cards.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    if (width >= 1024) {
      const frame = await cards.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const children = [...el.querySelectorAll('button')].map(card => card.getBoundingClientRect());
        return { height: rect.height, cardHeight: children[0]!.height, gap: parseFloat(getComputedStyle(el).rowGap), fullyVisible: children.filter(card => card.top >= rect.top && card.bottom <= rect.bottom + 1).length };
      });
      expect(frame.height).toBeCloseTo(frame.cardHeight * 3 + frame.gap * 2);
      expect(frame.fullyVisible).toBe(9);
      const overflowingCards = await cards.getByRole('button').evaluateAll(buttons => buttons.filter(button => button.scrollHeight > button.clientHeight + 1).length);
      expect(overflowingCards).toBe(0);
    }
    await page.screenshot({ path: testInfo.outputPath('dreams-expanded.png'), fullPage: true });
    const last = cards.getByRole('button').last();
    const name = (await last.locator('span').first().innerText()).trim();
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(cards).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('dreams-collapsed.png'), fullPage: true });
    await toggle.click();
    await expect(cards.getByRole('button', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Купите лес/ }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('p').filter({ hasText: /^Купите лес ·/ })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('fixture:remount')));
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('dream selection stays open during saving and failure, then collapses after confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixtureUrl}?mode=lobby-delayed`);
  const toggle = page.getByRole('button', { name: 'Мечта большого круга', exact: true });
  const dream = page.getByRole('button', { name: /Купите лес/ });
  await dream.click();
  await expect(dream).toBeDisabled();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:save-dream', { detail: false })));
  await expect(dream).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await dream.click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:save-dream', { detail: true })));
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await dream.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:save-dream', { detail: true })));
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

for (const width of [1440, 390]) {
  test(`room starts, switches tracks and enters the large track without reloading at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${fixtureUrl}?mode=room&status=WAITING`);
    await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
    await expect(page.getByRole('group', { name: 'Показать круг' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Начать партию', exact: true }).click();
    await expect(page.locator('.app-shell--game-classic-active')).toHaveCount(1);
    await expect(page.getByRole('group', { name: 'Показать круг' })).toHaveCount(0);
    if (width >= 1024) {
      await expect.poll(() => page.locator('.desktop-game-board-shell').evaluate(el => el.clientHeight)).toBeGreaterThan(650);
      await expect(page.locator('.desktop-game-board-shell [data-board-cell="19"]')).toBeInViewport();
      await expect(page.getByRole('heading', { name: 'Действия', exact: true })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Банк', exact: true }).filter({ visible: true })).toHaveCount(1);
    } else {
      await page.getByRole('tab', { name: 'Ход', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Действия', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Банк', exact: true }).filter({ visible: true })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Игрок', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Банк', exact: true }).filter({ visible: true })).toHaveCount(1);
    }
    await page.evaluate(() => {
      const snapshot = structuredClone((window as any).roomSnapshot);
      snapshot.players[1].track = 'FAST_TRACK';
      // Dispatch a fresh server snapshot, as the real socket does.
      window.dispatchEvent(new CustomEvent('fixture:room-update', { detail: structuredClone(snapshot) }));
    });
    await page.getByRole('button', { name: 'Большой круг', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Поле большого круга', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Малый круг', exact: true }).click();
    if (width >= 1024) {
      await expect.poll(() => page.locator('.desktop-game-board-shell').evaluate(el => el.clientHeight)).toBeGreaterThan(650);
      await expect(page.locator('.desktop-game-board-shell [data-board-cell="19"]')).toBeInViewport();
    } else await page.getByRole('tab', { name: 'Ход', exact: true }).click();
    await page.evaluate(() => {
      const snapshot = structuredClone((window as any).roomSnapshot);
      snapshot.players[0].financialState.passiveIncomeCents = 10000;
      window.dispatchEvent(new CustomEvent('fixture:room-update', { detail: snapshot }));
    });
    const history = page.getByRole('region', { name: 'История действий игроков', exact: true }).filter({ visible: true });
    const entry = history.getByRole('button', { name: 'Перейти на большой круг', exact: true });
    await expect(entry).toBeVisible();
    await page.screenshot({ path: join(output, `room-small-${width}.png`), fullPage: true });
    await page.route('**/api/games/synthetic/fast-track/enter', async route => {
      const snapshot = await page.evaluate(() => {
        const next = structuredClone((window as any).roomSnapshot);
        next.players[0].track = 'FAST_TRACK';
        next.players[0].fastTrackPosition = -1;
        return next;
      });
      await route.fulfill({ json: { snapshot } });
    });
    await entry.click();
    await expect(page.getByRole('region', { name: 'Поле большого круга', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Большой круг', exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (width >= 1024) {
      const gap = await page.locator('.turn-activity').evaluate(el => {
        const dice = el.querySelector('.dice-action')!.getBoundingClientRect();
        const history = el.querySelector('.game-action-history')!.getBoundingClientRect();
        return history.top - dice.bottom;
      });
      expect(gap).toBeGreaterThanOrEqual(12);
    }
    await page.screenshot({ path: join(output, `room-large-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

for (const view of ['classic', 'journey']) {
  for (const width of [1440, 390]) {
    test(`small-track ${view} room animates every human and queued bot cell at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${fixtureUrl}?mode=room&view=${view}`);
      await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
      if (view === 'journey' && width < 1280) await page.getByRole('tab', { name: 'Поле', exact: true }).click();
      const board = view === 'journey' ? '.journey-board-canvas' : width >= 1024 ? '.desktop-game-board-shell' : '[aria-label="Малый круг"]';
      await page.evaluate(({ board }) => {
        const visited: Record<string, number[]> = { anna: [], boris: [] };
        (window as any).visited = visited;
        new MutationObserver(() => {
          for (const id of Object.keys(visited)) {
            const token = document.querySelector(`${board} [data-board-cell] [data-player-id="${id}"]`);
            const cell = token?.closest('[data-board-cell]');
            const position = Number(cell?.getAttribute('data-board-cell'));
            if (token && visited[id]!.at(-1) !== position) visited[id]!.push(position);
          }
        }).observe(document.querySelector(board)!, { childList: true, subtree: true });
        const move = (id: string, sequence: number, from: number, to: number) => ({ id: `small-${sequence}`, sequence, type: 'player:move', createdAt: new Date().toISOString(), gamePlayer: { id, seat: 1, role: 'PLAYER' }, payload: { from, to, steps: 3 } });
        const moves = [move('anna', 101, 0, 3), move('boris', 102, 22, 1)];
        (window as any).smallMoves = moves;
        window.dispatchEvent(new CustomEvent('fixture:room-moves', { detail: moves }));
      }, { board });
      await expect(page.locator(`${board} [data-board-cell="3"] [data-player-id="anna"]`)).toHaveCount(1);
      await expect(page.locator(`${board} [data-board-cell="1"] [data-player-id="boris"]`)).toHaveCount(1);
      await expect(page.locator('.timeline-moving-token')).toHaveCount(0);
      const visited = await page.evaluate(() => (window as any).visited);
      expect(visited.anna).toEqual(expect.arrayContaining([1, 2, 3]));
      expect(visited.boris).toEqual(expect.arrayContaining([23, 0, 1]));
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:room-moves', { detail: (window as any).smallMoves })));
      await expect(page.locator('.timeline-moving-token')).toHaveCount(0);
      await page.evaluate(() => window.dispatchEvent(new Event('fixture:room-remount')));
      await expect(page.locator('.timeline-moving-token')).toHaveCount(0);
    });
  }
}

test('small-track movement waits for dice, uses no white frame, and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${fixtureUrl}?mode=room`);
  await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
  await page.getByRole('button', { name: 'Бросить кубик', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('.desktop-game-board-shell [data-board-cell="0"] [data-player-id="anna"]')).toHaveCount(1);
  await expect(page.locator('.desktop-game-board-shell')).toHaveAttribute('data-moving-player', 'anna');
  const shadow = await page.locator('.desktop-game-board-shell .timeline-moving-token').evaluate(el => getComputedStyle(el).boxShadow);
  expect(shadow).toBe('none');
  await expect(page.locator('.desktop-game-board-shell [data-board-cell="3"] [data-player-id="anna"]')).toHaveCount(1);
  await expect(page.locator('.timeline-moving-token')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture:room-moves', { detail: [{ id: 'reduced', sequence: 102, type: 'player:move', createdAt: '', gamePlayer: { id: 'boris', seat: 2, role: 'PLAYER' }, payload: { from: 22, to: 1, steps: 3 } }] })));
  await expect(page.locator('.desktop-game-board-shell [data-board-cell="1"] [data-player-id="boris"]')).toHaveCount(1);
  await expect(page.locator('.timeline-moving-token')).toHaveCount(0);
});

for (const track of ['small', 'large']) {
  for (const width of [1440, 390, 320]) {
    test(`restored turn controls keep ${track} dice hidden until rolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${fixtureUrl}?mode=room${track === 'large' ? '&allFast=1' : ''}`);
      await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
      const controls = width < 1024 ? page.locator('.mobile-turn-bar') : page.locator('.dice-action:visible');
      await expect(controls).toBeVisible();
      await expect(controls.getByLabel('Результат броска')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Действия', exact: true })).toHaveCount(0);
      if (width < 1024) {
        await page.getByRole('tab', { name: 'Ход', exact: true }).click();
        await expect(page.locator('.dice-action:visible')).toHaveCount(0);
      }
      const roll = controls.getByRole('button', { name: /Бросить кубик/ });
      await roll.click();
      await expect(roll).toHaveCount(0);
      await expect(controls.locator('.dice-face--rolling')).toHaveCount(track === 'large' ? 2 : 1);
      await expect(controls.locator('.dice-face--rolling')).toHaveCount(0);
      const values = track === 'large' ? [1, 2] : [3];
      for (const value of values) await expect(controls.getByLabel(`На кубике ${value}`, { exact: true })).toBeVisible();
      const history = page.locator('.game-action-history:visible');
      await expect(history.locator('.game-action-entry')).toHaveCount(1);
      await expect(history.locator('[data-action-id]')).toHaveCount(2);
      await expect(history.getByRole('button', { name: 'Только свои', exact: true })).toBeVisible();
      await page.screenshot({ path: join(output, `restored-${track}-${width}.png`), fullPage: true });
      if (width < 1024) {
        const box = await controls.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(900);
        expect(box!.y + box!.height).toBeGreaterThan(875);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.waitForTimeout(3300);
      await page.evaluate(() => {
        const snapshot = structuredClone((window as any).roomSnapshot);
        snapshot.game.currentRound += 1;
        snapshot.game.pendingAction = null;
        window.dispatchEvent(new CustomEvent('fixture:room-update', { detail: snapshot }));
      });
      await expect(roll).toBeEnabled();
      await expect(controls.getByLabel('Результат броска')).toHaveCount(0);
    });
  }
}

test('live turn groups and history filters update for both players before the turn ends', async ({ page, context }) => {
  const other = await context.newPage();
  await serveFixture(other);
  await Promise.all([page.setViewportSize({ width: 1440, height: 900 }), other.setViewportSize({ width: 390, height: 844 })]);
  await Promise.all([page.goto(`${fixtureUrl}?mode=room&multiplayer=1`), other.goto(`${fixtureUrl}?mode=room&multiplayer=1&viewer=second-user`)]);
  await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
  await expect(other.locator('html')).toHaveAttribute('data-room-ready', 'true');
  await other.getByRole('tab', { name: 'Ход', exact: true }).click();
  const history = (view: Page) => view.locator('.game-action-history:visible');
  const update = async (sequence: number, type: string, playerId = 'anna') => {
    for (const view of [page, other]) await view.evaluate(({ sequence, type, playerId }) => {
      const snapshot = structuredClone((window as any).roomSnapshot);
      snapshot.game.pendingAction = { type: 'choose_deal', gamePlayerId: 'anna' };
      snapshot.events.push({ id: `live-${sequence}`, sequence, type, createdAt: new Date().toISOString(), gamePlayer: { id: playerId, seat: 1, role: 'PLAYER' }, payload: { diceValues: [3], dice: 3, amountCents: 1000 } });
      window.dispatchEvent(new CustomEvent('fixture:room-update', { detail: snapshot }));
    }, { sequence, type, playerId });
  };
  await update(1, 'player:roll_dice');
  await update(2, 'loan:take');
  for (const view of [page, other]) {
    await expect(history(view).locator('.game-action-entry')).toHaveCount(1);
    await expect(history(view).locator('[data-action-id]').first()).toHaveAttribute('data-action-id', 'live-2');
  }
  await update(3, 'market:sale_declined', 'boris');
  await update(4, 'loan:repay', 'boris');
  for (const view of [page, other]) {
    await expect(history(view).locator('.game-action-entry')).toHaveCount(1);
    await expect(history(view).locator('.game-action-entry').first()).toContainText('Борис');
    await expect(history(view).locator('.game-turn-other-action')).toHaveCount(2);
    await expect(history(view).locator('[data-action-id]').last()).toHaveAttribute('data-action-id', 'live-4');
    await expect(history(view).locator('.game-turn-other-action [data-turn-identity="boris"]')).toBeVisible();
    await history(view).getByRole('button', { name: 'Только свои', exact: true }).click();
    await expect(history(view).locator('.game-action-entry')).toHaveCount(1);
  }
  await expect(history(page).locator('.game-action-entry')).toContainText('Анна');
  await expect(history(other).locator('.game-action-entry')).toContainText('Борис');
  await expect(history(other).locator('.game-action-entry')).toHaveAttribute('data-turn-player-id', 'anna');
  await update(5, 'loan:repay');
  await expect(history(page).locator('[data-action-id]')).toHaveCount(3);
  await expect(history(other).locator('[data-action-id]')).toHaveCount(2);
  await history(other).getByRole('button', { name: 'Все игроки', exact: true }).click();
  await expect(history(other).locator('.game-action-entry').first()).toContainText('Анна');
  await expect(history(other).locator('[data-action-id]').first()).toHaveAttribute('data-action-id', 'live-5');
  await expect(history(other).locator('[data-action-id]').last()).toHaveAttribute('data-action-id', 'live-4');
  await page.screenshot({ path: join(output, 'restored-history-desktop.png'), fullPage: true });
  await other.screenshot({ path: join(output, 'restored-history-mobile.png'), fullPage: true });
  await other.close();
});

for (const track of ['small', 'large']) {
  for (const width of [320, 390]) {
    test(`mobile ${track} route keeps its height with three neighbours at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${fixtureUrl}?mode=room${track === 'large' ? '&allFast=1' : ''}`);
      await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
      const route = track === 'large' ? page.locator('.fast-track-timeline') : page.getByLabel('Малый круг', { exact: true });
      const before = await route.boundingBox();
      await page.evaluate((track) => {
        const snapshot = structuredClone((window as any).roomSnapshot);
        for (const player of snapshot.players) {
          player.position = 0;
          player.fastTrackPosition = 0;
        }
        window.dispatchEvent(new CustomEvent('fixture:room-update', { detail: snapshot }));
      }, track);
      const cell = route.locator(track === 'large' ? '[data-fast-timeline-cell="0"]' : '[data-board-cell="0"]');
      await expect(cell.locator('[data-player-id]')).toHaveCount(3);
      await cell.scrollIntoViewIfNeeded();
      const after = await route.boundingBox();
      expect(after!.height).toBe(before!.height);
      const tokens = await cell.locator('[data-player-id]').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        return { top: box.top, right: box.right, left: box.left, bottom: box.bottom };
      }));
      expect(new Set(tokens.map(box => box.top)).size).toBe(1);
      for (let i = 1; i < tokens.length; i++) expect(tokens[i - 1]!.right).toBeLessThanOrEqual(tokens[i]!.left);
      expect(Math.max(...tokens.map(box => box.bottom))).toBeLessThanOrEqual(after!.y + after!.height);
      if (track === 'large') await expect(route.locator('.bg-action')).toHaveCount(0);
      const bar = page.locator('.mobile-turn-bar');
      await expect(bar.getByRole('heading', { name: 'Ваш ход', exact: true })).toBeVisible();
      await expect(bar.getByRole('button', { name: 'Пропустить ход', exact: true })).toBeVisible();
      await expect(bar.locator('svg')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: join(output, `turn-layout-${track}-${width}-tokens.png`), fullPage: true });
    });
  }
  for (const width of [1440, 390]) {
    test(`${track} decisions and timeline stay inside one turn card at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${fixtureUrl}?mode=room&multiplayer=1${track === 'large' ? '&allFast=1' : ''}`);
      await expect(page.locator('html')).toHaveAttribute('data-room-ready', 'true');
      if (width < 1024) await page.getByRole('tab', { name: 'Ход', exact: true }).click();
      await page.evaluate((track) => {
        const snapshot = structuredClone((window as any).roomSnapshot);
        const event = (sequence: number, type: string, playerId: string, payload: object) => ({ id: `turn-layout-${sequence}`, sequence, type, createdAt: new Date().toISOString(), gamePlayer: { id: playerId, seat: 1, role: 'PLAYER' }, payload });
        snapshot.events = [
          event(1, 'player:roll_dice', 'anna', { diceValues: [3], track: track === 'large' ? 'FAST_TRACK' : 'RAT_RACE' }),
          event(2, 'player:move', 'anna', { from: 0, to: 3, steps: 3, track: track === 'large' ? 'FAST_TRACK' : 'RAT_RACE' }),
          event(3, 'loan:repay', 'boris', { amountCents: 1000, beforeCashCents: 10000, afterCashCents: 9000 }),
          event(4, 'deal:sell', 'boris', { assetName: 'Квартира 2/1', proceedsCents: 5000, beforeCashCents: 9000, afterCashCents: 14000 })
        ];
        snapshot.game.pendingAction = track === 'large'
          ? { type: 'fast_track_choice', gamePlayerId: 'anna', cellIndex: 23, priceCents: 300000, decisionId: 'turn-layout' }
          : { type: 'choose_deal', gamePlayerId: 'anna' };
        window.dispatchEvent(new CustomEvent('fixture:room-update', { detail: snapshot }));
      }, track);
      const history = page.locator('.game-action-history:visible');
      const card = history.locator('.game-action-entry');
      await expect(card).toHaveCount(1);
      const decision = card.getByLabel('Текущее решение', { exact: true });
      await expect(decision).toBeVisible();
      await expect(decision.getByRole('button', { name: track === 'large' ? /Оплатить/ : 'Мелкая сделка', exact: track !== 'large' })).toBeVisible();
      expect((await history.getByRole('group', { name: 'Фильтр истории действий' }).boundingBox())!.y).toBeLessThan((await card.boundingBox())!.y);
      await expect(card.locator('.game-turn-timeline')).toHaveCount(1);
      await expect(card.locator('[data-action-id]')).toHaveCount(4);
      await expect(card.locator('[data-action-id]').first()).toHaveAttribute('data-action-id', 'turn-layout-2');
      await expect(card.locator('[data-action-id]').last()).toHaveAttribute('data-action-id', 'turn-layout-4');
      await expect(card.locator('.game-turn-other-action [data-turn-identity="boris"]')).toContainText('Борис');
      await expect(card.locator('.game-turn-other-action [data-player-id="boris"]')).toHaveAttribute('data-figurine', 'cat-in-box');
      await expect(card.locator('.game-turn-other-action').first()).toContainText('1 000');
      await expect(card.locator('.game-turn-other-action').last()).toContainText('Квартира 2/1');
      const dots = await card.locator('.game-turn-event').evaluateAll(elements => elements.map(element => ({ content: getComputedStyle(element, '::before').content, left: element.getBoundingClientRect().left + parseFloat(getComputedStyle(element, '::before').left) })));
      expect(dots.every(dot => dot.content === '""' && dot.left > (0))).toBe(true);
      expect(new Set(dots.map(dot => dot.left)).size).toBe(1);
      expect(dots[0]!.left).toBeGreaterThan((await card.boundingBox())!.x);
      expect(await card.evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');
      await page.screenshot({ path: join(output, `turn-layout-${track}-${width}-decision.png`), fullPage: true });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
