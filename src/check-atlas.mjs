// Проверка «Атласа языков» в браузере (Playwright): 320, 375, 768, 1440, 3840 × KK / RU / EN.
// Запуск при работающем dev-сервере: npx astro dev --host 127.0.0.1 --port 4366, затем
//   ATLAS_BASE=http://127.0.0.1:4366 node scripts/check-atlas.mjs
// Скриншоты и отчёт — checks/atlas-2026-10-10/. Проверяется: карта загрузилась, выбран казахский (золото и ореолы),
// поиск «español», нажатие на точку японского — карточка со ссылкой на встречу, Esc закрывает карточку, «Сотня шара»
// выбирает язык, слой «Семьи», нет горизонтальной прокрутки, один h1, нет ошибок в консоли, меню разделов и ☰ главной
// ведут на атлас, /ru/materials/ ведёт на /ru/atlas/, «← Весь шар» не наезжает на карту, переходы ClientRouter.
// Вес страницы считает scripts/measure-atlas-weight.mjs (dev-сервер отдаёт несжатые модули Vite).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const BASE = process.env.ATLAS_BASE || 'http://127.0.0.1:4366';
const OUT = path.resolve('checks/atlas-2026-10-10');
fs.mkdirSync(OUT, {recursive: true});
const SIZES = [[320, 640], [375, 812], [768, 1024], [1440, 900], [3840, 2160]];
const LOCALES = ['kk', 'ru', 'en'];
const report = {base: BASE, date: new Date().toISOString(), pages: [], interactions: [], failures: []};
const browser = await chromium.launch();

async function open(url, [w, h]) {
  const context = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1, hasTouch: w < 700});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(url, {waitUntil: 'networkidle'});
  return {page, context, errors};
}
const check = async (name, fn) => {
  try { await fn(); report.interactions.push({name, ok: true}); }
  catch (e) { report.interactions.push({name, ok: false, error: String(e.message || e)}); report.failures.push(`${name}: ${e.message || e}`); }
};

// 1. Все размеры и языки: карта, казахский, прокрутка, h1, консоль, меню
for (const loc of LOCALES) for (const size of SIZES) {
  const label = `${loc}-${size[0]}`;
  const {page, context, errors} = await open(`${BASE}/${loc}/atlas/`, size);
  await page.locator('#atlas-map').scrollIntoViewIfNeeded();
  await page.waitForSelector('.atlas-svg', {timeout: 20000});
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const d = sel => document.querySelector(sel)?.getAttribute('d') || '';
    return {
      h1: document.querySelectorAll('h1').length,
      scrollX: document.documentElement.scrollWidth - window.innerWidth,
      selected: document.querySelector('.atlas-point.is-selected')?.dataset.id,
      gold: d('.atlas-t-kz').split('M').length - 1,
      halo: d('.atlas-t-pale').split('M').length - 1 + d('.atlas-t-faint').split('M').length - 1,
      card: document.querySelector('.atlas-card-native')?.textContent,
      nav: [...document.querySelectorAll('.site-nav a')].map(a => [a.getAttribute('href'), a.getAttribute('aria-current')]),
      wide: Math.round(document.querySelector('.atlas-wide')?.getBoundingClientRect().width || 0),
      points: document.querySelectorAll('.atlas-point').length,
    };
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path: path.join(OUT, `${label}.png`)});
  const map = page.locator('.atlas-map-block');
  await map.screenshot({path: path.join(OUT, `${label}-map.png`)});
  const entry = {label, ...info, errors};
  report.pages.push(entry);
  try {
    assert.equal(info.h1, 1, 'один h1');
    assert.ok(info.scrollX <= 0, `нет горизонтальной прокрутки (${info.scrollX})`);
    assert.equal(info.selected, 'kaz', 'выбран казахский');
    assert.ok(info.gold > 50, 'золото Казахстана');
    assert.ok(info.halo > 5, 'ореолы общин');
    assert.equal(info.card, 'Қазақша');
    assert.equal(info.points, 100);
    assert.ok(info.nav.some(([href, cur]) => href === `/${loc}/atlas/` && cur === 'page'), 'пункт меню «Атлас языков»');
    assert.deepEqual(errors, [], 'консоль без ошибок');
  } catch (e) { report.failures.push(`${label}: ${e.message}`); }
  await context.close();
}

// 2. Взаимодействие: поиск, точка, Esc, «Сотня», семьи — на компьютере и телефоне, на трёх языках
for (const [loc, size] of [['ru', [1440, 900]], ['kk', [1440, 900]], ['en', [1440, 900]], ['ru', [375, 812]], ['en', [320, 640]]]) {
  const tag = `${loc}-${size[0]}`;
  const {page, context, errors} = await open(`${BASE}/${loc}/atlas/`, size);
  await page.locator('#atlas-map').scrollIntoViewIfNeeded();
  await page.waitForSelector('.atlas-svg');
  await check(`${tag}: поиск «español»`, async () => {
    await page.fill('#atlas-q', 'español');
    await page.waitForSelector('#atlas-options li[role="option"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.atlas-card-native')?.textContent === 'español');
    assert.match(page.url(), /\?lang=spa/);
    await page.locator('.atlas-map-block').screenshot({path: path.join(OUT, `${tag}-spanish.png`)});
  });
  await check(`${tag}: точка японского → карточка со ссылкой на встречу`, async () => {
    await page.locator('.atlas-point[data-id="jpn"]').click();
    await page.waitForFunction(() => document.querySelector('.atlas-card-native')?.textContent === '日本語');
    const href = await page.locator('.atlas-card-open').getAttribute('href');
    assert.equal(href, `/meet/jpn/ja/?ui=${loc}`);
    const res = await page.request.get(`${BASE}${href}`);
    assert.equal(res.status(), 200, 'встреча открывается');
    await page.locator('.atlas-stage').screenshot({path: path.join(OUT, `${tag}-japanese-card.png`)}); // сцена карты (F21)
  });
  await check(`${tag}: Esc закрывает карточку, фокус на точке`, async () => {
    await page.locator('.atlas-point[data-id="jpn"]').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#atlas-card').isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.id), 'jpn');
    await page.keyboard.press('ArrowRight');
    const next = await page.evaluate(() => document.activeElement?.dataset.id);
    assert.ok(next && next !== 'jpn', 'стрелка ведёт к следующей точке');
    await page.keyboard.press('Enter');
    await page.waitForFunction(id => document.querySelector('.atlas-point.is-selected')?.dataset.id === id, next);
    assert.equal(await page.locator('#atlas-card').isVisible(), true, 'Enter открывает карточку');
  });
  await check(`${tag}: «Сотня шара» выбирает язык`, async () => {
    await page.locator('.atlas-rank a[data-atlas-lang="hin"]').click();
    await page.waitForFunction(() => document.querySelector('.atlas-point.is-selected')?.dataset.id === 'hin');
    await page.waitForTimeout(500);
    const top = await page.evaluate(() => document.querySelector('#atlas-map').getBoundingClientRect().top);
    assert.ok(Math.abs(top) < 120, `карта на экране (${top})`);
  });
  await check(`${tag}: слой «Семьи» (тюркская при открытии)`, async () => {
    await page.locator('[data-atlas-layer="families"]').click();
    await page.waitForSelector('.atlas-fam-list');
    const fam = await page.locator('.atlas-point.is-family').evaluateAll(els => els.map(e => e.dataset.id).sort());
    assert.ok(fam.length > 0);
    await page.locator('[data-atlas-family="turk1311"]').click();
    const turkic = await page.locator('.atlas-point.is-family').evaluateAll(els => els.map(e => e.dataset.id).sort());
    assert.deepEqual(turkic, ['azb', 'kaz', 'tur', 'uig', 'uzn']);
    await page.locator('.atlas-map-block').screenshot({path: path.join(OUT, `${tag}-families.png`)});
    await page.locator('.atlas-fam-lang[data-atlas-lang="uzn"]').click();
    await page.waitForFunction(() => document.querySelector('.atlas-point.is-selected')?.dataset.id === 'uzn');
  });
  await check(`${tag}: без горизонтальной прокрутки после действий, консоль чистая`, async () => {
    const sx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(sx <= 0, `scrollX ${sx}`);
    assert.deepEqual(errors, []);
  });
  await context.close();
}

// 3. «← Весь шар» у левого края не наезжает на карту и её переключатели (1280, 1366, 1440; KK / RU / EN)
for (const loc of LOCALES) for (const w of [1280, 1366, 1440]) {
  await check(`${loc}-${w}: «← Весь шар» не наезжает на карту`, async () => {
    const {page, context} = await open(`${BASE}/${loc}/atlas/`, [w, 900]);
    const r = await page.evaluate(() => {
      const link = document.querySelector('.whole-side-link').getBoundingClientRect();
      const lefts = [...document.querySelectorAll('.atlas-controls, .atlas-pick, .atlas-canvas')].map(e => e.getBoundingClientRect().left);
      return {right: link.right, left: Math.min(...lefts)};
    });
    assert.ok(r.right + 4 <= r.left, `ссылка до ${r.right}, карта с ${r.left}`);
    await context.close();
  });
}

// 4. Переходы без перезагрузки (ClientRouter): из «О проекте» в атлас, смена языка KZ / RU / EN на атласе
await check('переход из меню разделов и смена языка — карта монтируется заново', async () => {
  const {page, context, errors} = await open(`${BASE}/ru/about/`, [1440, 900]);
  await page.locator('.site-nav a[href="/ru/atlas/"]').click();
  await page.waitForURL(/\/ru\/atlas\/$/);
  await page.waitForSelector('.atlas-svg');
  assert.equal(await page.locator('.atlas-svg').count(), 1);
  await page.locator('.site-locale a[lang="kk"]').click();
  await page.waitForURL(/\/kk\/atlas\/$/);
  await page.waitForFunction(() => document.querySelector('.atlas-card-name')?.textContent === 'Қазақ тілі');
  await page.waitForSelector('.atlas-svg');
  assert.equal(await page.locator('.atlas-svg').count(), 1, 'одна карта после смены языка');
  await page.locator('.atlas-point[data-id="spa"]').click();
  await page.waitForFunction(() => document.querySelector('.atlas-card-native')?.textContent === 'español');
  assert.deepEqual(errors, []);
  await context.close();
});

// 5. Меню ☰ главной, переадресация «Материалов», ссылки из каталога
await check('☰ главной ведёт на атлас (ru)', async () => {
  const {page, context} = await open(`${BASE}/ru/`, [1440, 900]);
  await page.locator('.menu-wrap .icon-button').click();
  await page.waitForSelector('.menu-panel a[href="/ru/atlas/"]');
  await page.screenshot({path: path.join(OUT, 'home-menu-ru.png')});
  await context.close();
});
await check('/ru/materials/ → /ru/atlas/', async () => {
  const {page, context} = await open(`${BASE}/ru/materials/`, [1440, 900]);
  await page.waitForURL(/\/ru\/atlas\/$/, {timeout: 10000});
  await context.close();
});
await check('«Все языки» ссылается на атлас (kk)', async () => {
  const {page, context} = await open(`${BASE}/kk/languages/`, [1440, 900]);
  assert.equal(await page.locator('main a[href="/kk/atlas/"]').count(), 1);
  await context.close();
});

await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`Страниц: ${report.pages.length}, проверок: ${report.interactions.length}, ошибок: ${report.failures.length}`);
if (report.failures.length) { console.log(report.failures.join('\n')); process.exitCode = 1; }
