import { test, expect, type Page } from '@playwright/test';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const origin='http://fj-202-flow.test';
let output:string;
test.beforeAll(()=>{
  output=mkdtempSync(join(tmpdir(),'fj-202-flow-'));
  buildSync({entryPoints:['tests/fixtures/game-202-flow-ui.tsx'],outfile:join(output,'app.js'),bundle:true,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})},tsconfig:'apps/web/tsconfig.json',alias:{'next/navigation':resolve('tests/fixtures/navigation.ts'),'next/link':resolve('tests/fixtures/link.tsx'),'socket.io-client':resolve('tests/fixtures/socket.ts'),'@sentry/nextjs':'@sentry/browser'}});
  execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-c','apps/web/tailwind.config.ts','-i','apps/web/src/app/globals.css','-o',join(output,'style.css'),'--content','apps/web/src/**/*.{ts,tsx}','--minify']);
  let fonts='';
  try {
    const css=readFileSync('apps/web/.next-dev/static/css/app/layout.css','utf8');
    fonts=(css.match(/@font-face\s*\{[^}]*font-family: 'Manrope'[^}]*\}/g)??[]).join('\n').replaceAll('/_next/static/media/','./media/');
    mkdirSync(join(output,'media'));
    for(const name of readdirSync('apps/web/.next-dev/static/media').filter(n=>n.endsWith('.woff2')))copyFileSync(join('apps/web/.next-dev/static/media',name),join(output,'media',name));
  }catch{/* Use the established fallback when no local font build exists. */}
  writeFileSync(join(output,'index.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="app.css"><style>${fonts}body{font-family:Manrope,Arial,sans-serif}</style><div id="root"></div><script src="app.js"></script></html>`);
});
test.beforeEach(async({page})=>{
  await page.route(`${origin}/**`,async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/logo.svg'||/^\/(figurines|dreams)\/[\w.-]+$/.test(path))await route.fulfill({path:resolve('apps/web/public',`.${path}`)});
    else if(['/index.html','/app.js','/app.css','/style.css'].includes(path)||path.startsWith('/media/'))await route.fulfill({path:join(output,path)});
    else await route.fulfill({status:404,body:'Not found'});
  });
  await page.addInitScript(()=>{(window as any).commands=[];window.addEventListener('fixture:command',(e:any)=>(window as any).commands.push(e.detail));});
});
const decision=(page:Page)=>page.locator('[aria-label="Текущее решение"]:visible');
async function open(page:Page,scenario='quote',suffix='') {
  await page.goto(`${origin}/index.html?scenario=${scenario}${suffix}`);
  await expect(page.locator('html')).toHaveAttribute('data-fixture-ready','true');
}
async function noOverflow(page:Page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}

for(const size of [{width:375,height:667},{width:1440,height:900}]) {
  test(`202 newest results and expanded inheritance card at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    await open(page,'payday');
    const history=page.locator('.game-action-history:visible');
    const current=history.locator('[data-turn-player-id="anna"]').first();
    const lines=await current.locator('.game-turn-event').allTextContents();
    const payday=lines.findIndex(text=>text.includes('День зарплаты'));
    const movement=lines.findIndex(text=>text.includes('Расчётный чек')||text.includes('Расчетный чек'));
    expect(payday).toBeGreaterThanOrEqual(0);
    expect(movement).toBeGreaterThan(payday);
    await expect(history).not.toContainText('Начало хода');
    const equation=current.locator('[data-cash-change]');
    await expect(equation).toHaveCount(1);
    expect((await equation.textContent())!.replace(/[\u00a0\u202f]/g,' ')).toBe('400 $+1 690 $равно=2 090 $');
    await expect(current.locator('[data-action-icon="cash"]')).toHaveCount(1);
    await expect(current.locator('[data-action-icon="dice"]')).toHaveCount(1);
    await expect(current.locator('[data-turn-movement] svg')).not.toBeVisible();
    expect(await current.locator('.game-turn-marker').first().evaluate(el=>getComputedStyle(el).color)).toBe('rgb(115, 115, 115)');
    expect(await current.locator('.game-turn-event').first().evaluate(el=>getComputedStyle(el,'::after').backgroundColor)).toBe('rgb(229, 229, 229)');
    await page.screenshot({path:test.info().outputPath(`202-payday-${size.width}.png`),fullPage:true});
    await open(page,'inheritance');
    await decision(page).getByRole('button',{name:'Отказаться',exact:true}).click();
    const inherited=history.locator('[data-card-slug="set_202_capital_32"]');
    await expect(inherited).toBeVisible();
    await expect(history.getByText('Дом на 2 семьи в наследство',{exact:true})).toHaveCount(1);
    await expect(history.getByText('Отказ от возможности',{exact:true})).toHaveCount(1);
    await expect(history).not.toContainText('Решение по открытой карточке');
    await expect(history).not.toContainText('Начало хода');
    await expect(history.locator('details')).toHaveCount(0);
    await expect(inherited).not.toContainText('Цена: $60 000');
    await expect(inherited).not.toContainText('Первый взнос:');
    await expect(inherited).not.toContainText('Оплата при покупке:');
    await expect(inherited).toContainText('Первоначальный взнос:');
    await inherited.getByText('Денежный поток:',{exact:false}).scrollIntoViewIfNeeded();
    const effectBox=await inherited.getByText('Денежный поток:',{exact:false}).boundingBox();
    const toolbar=await page.getByRole('button',{name:'Требуется ваше решение',exact:true}).filter({visible:true}).boundingBox();
    expect(effectBox!.y+effectBox!.height).toBeLessThanOrEqual(toolbar!.y);
    await page.screenshot({path:test.info().outputPath(`202-inheritance-${size.width}.png`),fullPage:true});
    await noOverflow(page);
  });

  test(`202 quote keeps one form, drafts and one finish at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await open(page);
    const ui=decision(page);
    await expect(ui.getByRole('button',{name:'Купить акции',exact:true})).toBeVisible();
    await expect(ui.getByRole('spinbutton')).toHaveCount(0);
    await page.screenshot({path:test.info().outputPath(`202-quote-${size.width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Требуется ваше решение',exact:true}).filter({visible:true}).click();
    await page.screenshot({path:test.info().outputPath(`202-operations-${size.width}.png`),fullPage:true});
    await ui.getByRole('button',{name:'Купить акции',exact:true}).click();
    await ui.getByLabel('Количество акций',{exact:true}).fill('12');
    await ui.getByRole('button',{name:'Предложить игрокам',exact:true}).click();
    await expect(ui.getByLabel('Количество акций',{exact:true})).not.toBeVisible();
    await ui.getByRole('button',{name:'К решению по карточке',exact:true}).click();
    await expect(ui.getByLabel('Количество акций',{exact:true})).toHaveValue('12');
    await ui.getByRole('button',{name:'К выбору операции',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).commands.length)).toBe(0);
    await ui.getByRole('button',{name:'Продать акции',exact:true}).click();
    await expect(ui.getByRole('button',{name:'Не продавать',exact:true})).toHaveCount(0);
    await ui.getByRole('button',{name:'К выбору операции',exact:true}).click();
    await ui.getByRole('button',{name:'Купить акции',exact:true}).click();
    await page.evaluate(()=>{document.documentElement.dataset.failNext='true';});
    await ui.getByRole('button',{name:'Купить',exact:true}).click();
    await expect(ui.getByRole('alert')).toContainText('Проверочная ошибка');
    await expect(ui.getByLabel('Количество акций',{exact:true})).toHaveValue('12');
    await ui.getByRole('button',{name:'Купить',exact:true}).click();
    await expect(ui.getByRole('spinbutton')).toHaveCount(0);
    await expect(ui.getByRole('button',{name:'Купить акции',exact:true})).toHaveCount(0);
    await expect(ui.getByRole('button',{name:'Завершить мои торги',exact:true})).toBeEnabled();
    await ui.getByRole('button',{name:'Опционы · 2',exact:true}).click();
    await ui.getByLabel('Опцион для исполнения').selectOption('put');
    await expect(ui.getByRole('button',{name:'Исполнить опцион',exact:true})).toBeDisabled();
    await ui.getByLabel('Опцион для исполнения').selectOption('call');
    await ui.getByRole('button',{name:'Исполнить опцион',exact:true}).click();
    await expect(ui.getByRole('button',{name:'Опционы · 1',exact:true})).toBeVisible();
    await ui.getByRole('button',{name:'Короткая продажа',exact:true}).click();
    await ui.getByRole('button',{name:'Открыть короткую продажу',exact:true}).click();
    await expect(ui.getByRole('button',{name:'Короткая продажа',exact:true})).toHaveCount(0);
    await ui.getByRole('button',{name:'Завершить мои торги',exact:true}).click();
    await expect(ui.getByRole('button',{name:'Оформить страховку',exact:true})).toBeVisible();
    await expect(ui.getByRole('status',{name:'Этап хода'})).toContainText('Рынок');
    await expect(ui).not.toContainText('Защита недвижимости по условиям карточек рынка.');
    await expect(ui).not.toContainText('Ежемесячный платёж:');
    await expect(ui).toContainText('Страховой платёж:');
    const history=page.locator('.game-action-history:visible');
    await expect(history.getByText('Торги завершены',{exact:true})).toBeVisible();
    await expect(history.locator('details')).toHaveCount(0);
    await expect(history.locator('.game-turn-event').filter({hasText:'Исполнен опцион'}).locator('[data-cash-change]')).toContainText('+');
    await history.getByText('Торги завершены',{exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:test.info().outputPath(`202-completed-${size.width}.png`),fullPage:true});
    await expect(history.locator('[data-card-slug="set_202_capital_23"]')).toBeVisible();
    await noOverflow(page);expect(errors).toEqual([]);
  });

  test(`202 property, exchange and mandatory debt at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    await open(page,'property');
    await expect(decision(page).getByLabel('Результат операции')).toContainText('6');
    await expect(decision(page).getByRole('button',{name:'Взять кредит',exact:true})).toHaveCount(0);
    await page.screenshot({path:test.info().outputPath(`202-property-${size.width}.png`),fullPage:true});
    await decision(page).getByRole('button',{name:'Купить',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:test.info().outputPath(`202-purchase-form-${size.width}.png`),fullPage:true});
    await decision(page).getByRole('button',{name:'Купить',exact:true}).click();
    await expect(decision(page).getByRole('button',{name:'Оформить страховку',exact:true})).toBeVisible();
    const purchase=page.locator('.game-action-history:visible .game-turn-event').filter({hasText:'Куплена недвижимость'});
    await expect(purchase.locator('[data-cash-change]')).toHaveCount(1);
    expect((await purchase.locator('[data-cash-change]').textContent())!.replace(/[\u00a0\u202f]/g,' ')).toBe('10 000 $−6 000 $равно=4 000 $');
    await expect(purchase.locator('[data-action-icon="purchase"]')).toHaveCount(1);
    await open(page,'poor');
    await expect(decision(page).getByRole('button',{name:'Купить',exact:true})).toBeDisabled();
    await expect(decision(page).getByRole('button',{name:'Взять кредит',exact:true})).toBeEnabled();
    await open(page,'exchange');
    await decision(page).getByLabel('Объект для обмена').selectOption('house');
    await expect(decision(page).getByText('Ипотека вашей доли:',{exact:false})).toBeVisible();
    await decision(page).getByRole('button',{name:'Продолжить обмен',exact:true}).click();
    await decision(page).getByRole('button',{name:'Согласиться на обмен',exact:true}).click();
    await expect(decision(page).getByRole('button',{name:'Оформить страховку',exact:true})).toBeVisible();
    await open(page,'debt');
    await expect(decision(page)).toContainText('Этот убыток нельзя покрыть кредитом');
    await decision(page).getByRole('button',{name:'Банк и обязательства',exact:true}).click();
    await expect(page.getByRole('dialog')).toContainText('Этот убыток нельзя покрыть кредитом');
    await noOverflow(page);
  });

  test(`202 deck choice, mentor, incoming joint offer and auction at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    await open(page,'mentor');
    await page.screenshot({path:test.info().outputPath(`202-decks-${size.width}.png`),fullPage:true});
    await decision(page).getByRole('button',{name:/Прирост капитала/}).click();
    await decision(page).getByRole('button',{name:'Оставить карточку',exact:true}).click();
    await expect(page.locator('.game-action-history:visible [data-card-slug="set_202_capital_04"]')).toHaveCount(1);
    await open(page,'incoming','&viewer=boris');
    await expect(decision(page)).toContainText('Ваш взнос:');
    await decision(page).getByRole('button',{name:'Принять',exact:true}).click();
    await expect(decision(page).getByRole('button',{name:'Принять',exact:true})).toHaveCount(0);
    await open(page,'auction');
    await decision(page).getByLabel('Ваша ставка в долларах').fill('100');
    await decision(page).getByRole('button',{name:'Сделать ставку',exact:true}).click();
    await expect(decision(page)).toContainText('Ваш ответ принят');
    await expect(decision(page).getByRole('status',{name:'Этап хода'})).toContainText('1 из 2');
    await noOverflow(page);
  });

  test(`101 cash equations and neutral timeline at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    await open(page,'property','&mode=101&viewer=anna');
    await expect(page.locator('html')).toHaveAttribute('data-room-ready','true');
    await page.evaluate(()=>{
      const state=structuredClone((window as any).roomSnapshot);
      state.game.pendingAction=null;
      const actor={id:'anna',seat:1,role:'PLAYER'};
      state.events=[{id:'roll',sequence:1,type:'player:roll_dice',createdAt:'2026-11-14T10:00:00Z',gamePlayer:actor,payload:{diceValues:[6],dice:6}},
        {id:'move',sequence:2,type:'player:move',createdAt:'2026-11-14T10:00:00Z',gamePlayer:actor,payload:{from:7,to:13,cell:{type:'paycheck',label:'Расчетный чек'}}},
        {id:'payday',sequence:3,type:'paycheck:receive',createdAt:'2026-11-14T10:00:00Z',gamePlayer:actor,payload:{beforeCashCents:400,afterCashCents:2090,amountCents:1690}}];
      window.dispatchEvent(new CustomEvent('fixture:room-update',{detail:state}));
    });
    if(size.width<1024)await page.getByRole('tab',{name:/^Ход/}).click();
    const history=page.locator('.game-action-history:visible');
    expect((await history.locator('[data-cash-change]').textContent())!.replace(/[\u00a0\u202f]/g,' ')).toBe('400 $+1 690 $равно=2 090 $');
    await expect(history.locator('[data-action-icon="cash"]')).toHaveCount(1);
    await expect(history.locator('[data-action-icon="dice"]')).toHaveCount(1);
    await expect(history.locator('[data-inline-action-icon]:visible')).toHaveCount(0);
    await page.screenshot({path:test.info().outputPath(`101-cash-${size.width}.png`),fullPage:true});
    await noOverflow(page);
  });

  test(`101 shared purchase and history keep their presentation at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await open(page,'property','&mode=101&viewer=anna');
    await expect(page.locator('html')).toHaveAttribute('data-room-ready','true');
    await page.evaluate(()=>{
      const state=structuredClone((window as any).roomSnapshot);
      state.game.pendingAction={type:'deal_card_drawn',gamePlayerId:'anna',cardId:77,cardType:'SMALL_DEAL'};
      state.events=[{id:'old-roll',sequence:1,type:'player:roll_dice',createdAt:new Date().toISOString(),gamePlayer:{id:'boris',seat:2,role:'PLAYER'},payload:{diceValues:[2],dice:2}},
        {id:'old-end',sequence:2,type:'turn:ended',createdAt:new Date().toISOString(),gamePlayer:{id:'boris',seat:2,role:'PLAYER'},payload:{}},
        {id:'roll',sequence:3,type:'player:roll_dice',createdAt:new Date().toISOString(),gamePlayer:{id:'anna',seat:1,role:'PLAYER'},payload:{diceValues:[3],dice:3}},
        {id:'card',sequence:4,type:'card:draw',createdAt:new Date().toISOString(),gamePlayer:{id:'anna',seat:1,role:'PLAYER'},payload:{id:77,cardType:'SMALL_DEAL',title:'Дом 2/1',bodyText:'Дом с первоначальным взносом $6000.\nЦена: $52,000\nДенежный поток: +$20',category:'real_estate',meta:{price:52000,down_payment:6000,cashflow_monthly:20},effects:[]}}];
      window.dispatchEvent(new CustomEvent('fixture:room-update',{detail:state}));
    });
    if(size.width<1024)await page.getByRole('tab',{name:/^Ход/}).click();
    const history=page.locator('.game-action-history:visible');
    await expect(history.getByRole('button',{name:'Купить',exact:true})).toBeVisible();
    await expect(history.getByRole('button',{name:'Отказаться',exact:true})).toBeVisible();
    await expect(history.getByRole('button',{name:'Завершить мои торги',exact:true})).toHaveCount(0);
    await expect(history.locator('[data-journal-card]').first()).not.toContainText('Цена: $52,000');
    await expect(history.locator('[data-journal-card]').first()).not.toContainText('Денежный поток: +$20');
    await expect(history.getByText('Дом 2/1',{exact:true})).toHaveCount(1);
    await expect(history.locator('[data-journal-card]')).toHaveCount(1);
    await expect(history).not.toContainText('Цена: $52,000');
    const color=await history.locator('[data-journal-card="SMALL_DEAL"]').first().evaluate(el=>getComputedStyle(el).backgroundColor);
    await page.screenshot({path:test.info().outputPath(`101-property-${size.width}.png`),fullPage:true});
    await noOverflow(page);
    await open(page,'property');
    expect(await decision(page).locator('[data-journal-card="SMALL_DEAL"]').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(color);
    expect(errors).toEqual([]);
  });

  test(`202 outgoing proposals preserve drafts and remain expanded after sending at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    await open(page,'property');
    const ui=decision(page);
    await ui.getByRole('button',{name:'Предложить игрокам',exact:true}).click();
    await ui.getByLabel('Предложение',{exact:true}).selectOption('joint');
    await ui.getByLabel('Участник',{exact:true}).selectOption('boris');
    await ui.getByLabel('Ваша доля покупки, %',{exact:true}).fill('60');
    await page.evaluate(()=>{document.documentElement.dataset.failNext='true';});
    await ui.getByRole('button',{name:'Предложить условия',exact:true}).click();
    await expect(ui.getByRole('alert')).toContainText('Проверочная ошибка');
    await expect(ui.getByLabel('Ваша доля покупки, %',{exact:true})).toHaveValue('60');
    await ui.getByRole('button',{name:'Предложить условия',exact:true}).click();
    await expect(ui.getByRole('button',{name:'Предложить условия',exact:true})).toHaveCount(0);
    await expect(ui.locator('details')).toHaveCount(0);
    await expect(ui.getByText('Совместная покупка',{exact:true})).toHaveCount(1);
    await expect(ui.getByText('Ваша доля:',{exact:false})).toContainText('60%');
    await expect(ui.getByText('Ожидаем: Борис',{exact:true})).toBeVisible();
    await expect(ui.getByText('Ваш взнос:',{exact:false})).toContainText('3');
    await ui.getByRole('button',{name:'Отменить предложение',exact:true}).click();
    await expect(ui.getByText('Совместная покупка',{exact:true})).toHaveCount(0);
    await expect(ui.getByRole('button',{name:'Купить',exact:true})).toBeEnabled();
  });
}

test('202 pause prevents commands and narrow layouts do not overflow',async({page})=>{
  await open(page,'paused');
  await expect(decision(page).getByRole('button',{name:'Завершить мои торги',exact:true})).toBeDisabled();
  for(const width of [360,390,420,768,1023,1024]){
    await page.setViewportSize({width,height:900});
    await open(page,'choose');
    await expect(decision(page).getByRole('button',{name:/Прирост капитала/})).toBeVisible();
    await noOverflow(page);
  }
});
