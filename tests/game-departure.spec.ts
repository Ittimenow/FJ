import { test, expect, type Page } from '@playwright/test';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const origin='http://fj-departure.test';
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

for(const mode of ['101','202'])for(const size of [{width:375,height:667},{width:1440,height:900}]) {
  test(`${mode} departure dialog and manager actions at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${origin}/index.html?mode=${mode}&departure&viewer=anna`);
    await expect(page.locator('html')).toHaveAttribute('data-room-ready','true');
    await page.getByRole('tab',{name:/Игрок/}).filter({visible:true}).click();
    const leave=page.getByRole('button',{name:'Самовыпилиться из жизни',exact:true}).filter({visible:true});
    await leave.click();
    const dialog=page.getByRole('alertdialog');
    await expect(dialog).toContainText('Анна точно хочешь выпилиться из жизни?');
    await expect(dialog.getByRole('button',{name:'Я передумал'})).toBeFocused();
    const bounds=await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThan(60);
    expect(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight-25)?.closest('[role="alertdialog"]')!==null||document.elementFromPoint(innerWidth/2,innerHeight-25)?.classList.contains('fixed'))).toBe(true);
    expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`${mode}-departure-${size.width}.png`),fullPage:true});
    await dialog.getByRole('button',{name:'Я передумал'}).click();
    await expect(dialog).toHaveCount(0);
    await expect(leave).toBeFocused();
    const expel=page.getByRole('button',{name:'Выпилить',exact:true}).filter({visible:true});
    await expel.first().click();
    await expect(dialog).toContainText('Выпилить игрока Борис?');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    let calls=0;
    await page.route('**/api/games/*/leave',async route=>{
      calls++;
      if(calls===1){await route.fulfill({status:409,json:{message:'Проверочная ошибка'}});return;}
      const snapshot=await page.evaluate(()=>structuredClone((window as any).roomSnapshot));
      snapshot.players.find((p:any)=>p.id==='anna').status='LEFT';
      snapshot.game.currentPlayerId='boris';
      snapshot.game.lastEventSequence=(snapshot.game.lastEventSequence??0)+10;
      if(snapshot.game202){snapshot.game202.players=snapshot.game202.players.filter((p:any)=>p.id!=='anna');snapshot.game202.current=0;snapshot.game202.queue=[{id:'next',kind:'roll',playerId:'boris'}];snapshot.game202.revision++;}
      await route.fulfill({json:{snapshot}});
    });
    await leave.click();
    await dialog.getByRole('button',{name:'Выпилиться',exact:true}).click();
    await expect(dialog.getByRole('alert')).toHaveText('Проверочная ошибка');
    await dialog.getByRole('button',{name:'Выпилиться',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(leave).toHaveCount(0);
    expect(calls).toBe(2);
    expect(errors).toEqual([]);
  });
}

test('ordinary player cannot see manager controls',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto(`${origin}/index.html?mode=101&departure&viewer=anna&ordinary=1`);
  await page.getByRole('tab',{name:/Игрок/}).filter({visible:true}).click();
  await expect(page.getByRole('button',{name:'Самовыпилиться из жизни',exact:true}).filter({visible:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Выпилить',exact:true})).toHaveCount(0);
});

for(const mode of ['101','202'])for(const size of [{width:375,height:667},{width:1440,height:900}]) {
  test(`${mode} fast track departure at ${size.width}`,async({page})=>{
    await page.setViewportSize(size);
    await page.goto(`${origin}/index.html?mode=${mode}&departure&viewer=anna&allFast=1`);
    await expect(page.locator('html')).toHaveAttribute('data-room-ready','true');
    const tab=page.getByRole('tab',{name:/Игрок/}).filter({visible:true});
    if(await tab.count())await tab.click();
    const leave=page.getByRole('button',{name:'Самовыпилиться из жизни',exact:true}).filter({visible:true});
    await expect(leave).toBeVisible();
    await leave.click();
    const dialog=page.getByRole('alertdialog');
    await expect(dialog).toContainText('Анна точно хочешь выпилиться из жизни?');
    await page.screenshot({path:test.info().outputPath(`${mode}-fast-departure-${size.width}.png`),fullPage:true});
    await dialog.getByRole('button',{name:'Я передумал'}).click();
    await expect(dialog).toHaveCount(0);
    const expel=page.getByRole('button',{name:'Выпилить',exact:true}).filter({visible:true}).first();
    await expect(expel).toBeVisible();
    let calls=0;
    await page.route('**/api/games/*/players/boris/expel',async route=>{
      calls++;
      const snapshot=await page.evaluate(()=>structuredClone((window as any).roomSnapshot));
      snapshot.players.find((p:any)=>p.id==='boris').status='KICKED';
      if(snapshot.game202){snapshot.game202.players=snapshot.game202.players.filter((p:any)=>p.id!=='boris');snapshot.game202.current=0;snapshot.game202.revision++;}
      await route.fulfill({json:{snapshot}});
    });
    await expel.click();
    await dialog.getByRole('button',{name:'Выпилить',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Выпилить',exact:true}).filter({visible:true})).toHaveCount(0);
    expect(calls).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
