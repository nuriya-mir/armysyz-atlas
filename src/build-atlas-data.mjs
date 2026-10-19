// Данные «Атласа языков» (/{kk,ru,en}/atlas/), шаг 1: карта Equal Earth из плиток, 100 языков шара, факты.
// Запуск: node scripts/build-atlas-data.mjs   (из папки prototype; сеть не нужна — выгрузки лежат в research/atlas/)
//
// Источники (выгрузки — в research/atlas/, обращение 2026-10-10):
//   Natural Earth 1:110m Admin 0 — Countries (общественное достояние): design/homepage/source/natural-earth-countries.geojson.
//     Natural Earth рисует мир «как есть» (de facto); по решению автора A8 спорные территории — по границам,
//     признанным ООН (scripts/atlas-curation.mjs, UN_BORDERS).
//   Glottolog 5.3 (Hammarström, Forkel, Haspelmath, Bank 2026; CC BY 4.0; doi:10.5281/zenodo.18840967),
//     CLDF-выгрузка glottolog/glottolog-cldf v5.3: research/atlas/glottolog-5.3/languages.csv (точки, страны, семьи)
//     и values-languages.csv (выборка из values.csv: aes, category, classification языков).
//   Unicode CLDR 48.2.3 (Unicode License v3): research/atlas/cldr-48.2.3/territoryInfo.json (доли языков по странам)
//     и territories-{kk,ru,en}.json (названия стран).
//   Ethnologue 200, 29-е изд. (2026), открытая таблица: src/data/language-ranks.json (места 1–100, L1 + L2).
//   Рабочая таблица проекта research/languages-100-curated.tsv: письменность и ветвь.
//   Названия языков: content/site.json.
// Результат:
//   src/data/atlas/atlas-{kk,ru,en}.json — данные страницы (сборка Astro) и острова карты;
//   public/atlas/atlas-{kk,ru,en}.json — те же файлы для загрузки картой (адрес с ?v=версия);
//   src/data/atlas/facts.json — числа фактов и источники; public/atlas/map-kaz.svg — карта без JavaScript;
//   public/atlas/grain.webp — вырезка 128 × 128 из matte-grain.webp; research/atlas/countries-check.tsv — сверка стран.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {UN_BORDERS, CLDR_CODES, COUNTRY_FIXES, FAMILIES, BRANCHES, CREOLES, KAZAKH, QUICK} from './atlas-curation.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.resolve(ROOT, '..');
const R = (...p) => path.join(PROJECT, ...p);
const P = (...p) => path.join(ROOT, ...p);
const LOCALES = ['kk', 'ru', 'en'];
const ACCESSED = '2026-10-10';

// ---------- чтение ----------
function csv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const NE = json(R('design/homepage/source/natural-earth-countries.geojson'));
const GLOT = R('research/atlas/glottolog-5.3');
const glotLangs = csv(path.join(GLOT, 'languages.csv'));
const glotById = new Map(glotLangs.map(r => [r.ID, r]));
const glotByIso = new Map(glotLangs.filter(r => r.ISO639P3code && r.Level === 'language').map(r => [r.ISO639P3code, r]));
const glotValues = new Map();
for (const v of csv(path.join(GLOT, 'values-languages.csv'))) {
  if (!glotValues.has(v.Language_ID)) glotValues.set(v.Language_ID, {});
  glotValues.get(v.Language_ID)[v.Parameter_ID] = v;
}
// values-languages.csv не хранит комментарий AES — его проверка ниже читает исходный values.csv, если он рядом.
const CLDR = R('research/atlas/cldr-48.2.3');
const territoryInfo = json(path.join(CLDR, 'territoryInfo.json')).supplemental.territoryInfo;
const territoryNames = Object.fromEntries(LOCALES.map(l => [l, json(path.join(CLDR, `territories-${l}.json`)).main[l].localeDisplayNames.territories]));
const ranks = json(P('src/data/language-ranks.json'));
const site = json(P('content/site.json'));
const tsv = (() => {
  const [head, ...lines] = fs.readFileSync(R('research/languages-100-curated.tsv'), 'utf8').trim().split('\n').map(l => l.split('\t'));
  return new Map(lines.map(l => [l[0], Object.fromEntries(head.map((h, i) => [h, l[i]]))]));
})();

// ---------- Equal Earth (Шаврич, Паттерсон, Йенни, 2018), центральный меридиан 0° ----------
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
function ee(lon, lat) {
  const lam = lon * Math.PI / 180, th = Math.asin(M * Math.sin(lat * Math.PI / 180));
  const t2 = th * th, t6 = t2 ** 3;
  const x = 2 * Math.sqrt(3) * lam * Math.cos(th) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1));
  const y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x, y];
}
const W = 1000;
const S = W / (2 * ee(180, 0)[0]);
const LAT_TOP = 84, LAT_BOTTOM = -56; // Антарктида не показывается: своих языков у неё нет
const Y_TOP = ee(0, LAT_TOP)[1] * S;
const H = Y_TOP - ee(0, LAT_BOTTOM)[1] * S;
const proj = (lon, lat) => { const [x, y] = ee(lon, lat); return [x * S + W / 2, Y_TOP - y * S]; };
const STEP = 6; // шаг сетки: одна плитка ≈ 43 000 км² суши (проекция равновеликая)
const COLS = Math.floor(W / STEP), ROWS = Math.floor(H / STEP) + 1;
const r1 = v => Math.round(v * 10) / 10;

// ---------- страны и плитки ----------
function insideRings(x, y, rings) {
  let hit = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}
const a2Of = p => {
  const eh = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : null;
  return eh || (p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null);
};
const territories = []; // {a2, polys:[{bbox, rings, area, lonlat}]}
const terIndex = new Map();
function territory(a2) {
  if (!terIndex.has(a2)) { terIndex.set(a2, territories.length); territories.push({a2, polys: []}); }
  return territories[terIndex.get(a2)];
}
for (const f of NE.features) {
  const p = f.properties;
  if (p.ADM0_A3 === 'ATA') continue;
  let a2 = UN_BORDERS.mergeFeatures[p.ADM0_A3] || a2Of(p);
  if (!a2) throw new Error(`Natural Earth: нет кода ISO у ${p.ADMIN}`);
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const poly of polys) {
    const outer = poly[0];
    const meanLon = outer.reduce((s, c) => s + c[0], 0) / outer.length;
    const meanLat = outer.reduce((s, c) => s + c[1], 0) / outer.length;
    // Французская Гвиана и Шпицберген — свои коды ISO (у Natural Earth 1:110m они внутри Франции и Норвегии)
    let code = a2;
    if (a2 === 'FR' && meanLon < -30) code = 'GF';
    if (a2 === 'NO' && meanLat > 74) code = 'SJ';
    const rings = poly.map(ring => ring.map(([lo, la]) => proj(lo, la)));
    const xs = rings[0].map(c => c[0]), ys = rings[0].map(c => c[1]);
    let area = 0;
    for (let i = 0; i < rings[0].length - 1; i++) area += rings[0][i][0] * rings[0][i + 1][1] - rings[0][i + 1][0] * rings[0][i][1];
    territory(code).polys.push({feature: `${p.ADM0_A3}:${code}`, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], rings, area: Math.abs(area) / 2, lonlat: poly});
  }
}
// Обратная проекция не нужна: для поправок ООН проверяем центр клетки в долготе/широте численно (бисекцией по y).
function unproject(x, y) {
  // широта по y: Equal Earth монотонна по широте; долгота линейна по x при данной широте
  let lo = -90, hi = 90;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (proj(0, mid)[1] > y) lo = mid; else hi = mid; }
  const lat = (lo + hi) / 2;
  const kx = (proj(180, lat)[0] - W / 2) / 180;
  return [(x - W / 2) / kx, lat];
}
const insideLonLat = (lon, lat, polygon) => insideRings(lon, lat, [polygon]);

const cell = new Int16Array(COLS * ROWS).fill(-1);
const hitFeatures = new Set();
for (let r = 0; r < ROWS; r++) {
  const y = r * STEP + STEP / 2;
  for (let c = 0; c < COLS; c++) {
    const x = c * STEP + STEP / 2;
    for (let t = 0; t < territories.length && cell[r * COLS + c] < 0; t++) {
      for (const pg of territories[t].polys) {
        const b = pg.bbox;
        if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && insideRings(x, y, pg.rings)) { cell[r * COLS + c] = t; hitFeatures.add(pg.feature); break; }
      }
    }
  }
}
// Маленькие страны и острова без плитки (в том числе объединённые по ООН — Тайвань) получают одну плитку
// у центра своего крупнейшего контура (как в макете)
territories.forEach((t, ti) => {
  const features = [...new Set(t.polys.map(pg => pg.feature))].filter(f => !hitFeatures.has(f));
  for (const f of features) placeSmall(ti, t.polys.filter(pg => pg.feature === f));
});
function placeSmall(ti, polys) {
  const big = polys.reduce((a, b) => (b.area > a.area ? b : a));
  const xs = big.rings[0].map(c => c[0]), ys = big.rings[0].map(c => c[1]);
  const cx = xs.reduce((a, b) => a + b) / xs.length, cy = ys.reduce((a, b) => a + b) / ys.length;
  const c0 = Math.floor(cx / STEP), r0 = Math.floor(cy / STEP);
  for (let rad = 0; rad < 4; rad++) {
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      const c = c0 + dc, r = r0 + dr;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && cell[r * COLS + c] < 0) { cell[r * COLS + c] = ti; return; }
    }
  }
}
// Решение A8: плитки по границам, признанным ООН
const unLog = [];
for (const fix of UN_BORDERS.reassign) {
  const from = terIndex.get(fix.from);
  const to = territory(fix.to) && terIndex.get(fix.to);
  let moved = 0;
  for (let i = 0; i < cell.length; i++) {
    if (cell[i] !== from) continue;
    const [lon, lat] = unproject((i % COLS) * STEP + STEP / 2, Math.floor(i / COLS) * STEP + STEP / 2);
    const hit = fix.polygon ? insideLonLat(lon, lat, fix.polygon) : lat < fix.south;
    if (hit) { cell[i] = to; moved++; }
  }
  if (fix.anchor) {
    const [ax, ay] = proj(...fix.anchor);
    const i = Math.floor(ay / STEP) * COLS + Math.floor(ax / STEP);
    if (cell[i] !== to) { cell[i] = to; moved++; }
  }
  unLog.push(`${fix.id}: ${moved} плит. ${fix.from} → ${fix.to}`);
}
// плитки, переданные ООН-стране, не должны оставить пустых территорий
const used = [...new Set([...cell].filter(v => v >= 0))].sort((a, b) => a - b);
const remap = new Map(used.map((t, i) => [t, i]));
const countries = used.map(t => territories[t].a2);
const cIdx = new Map(countries.map((a2, i) => [a2, i]));
const grid = new Int16Array(cell.length).fill(-1);
for (let i = 0; i < cell.length; i++) if (cell[i] >= 0) grid[i] = remap.get(cell[i]);
const tileCount = [...grid].filter(v => v >= 0).length;
// Сжатая запись сетки: для каждой строки — отрезки одной страны [первая колонка, длина, страна, …]
const runs = [];
for (let r = 0; r < ROWS; r++) {
  const row = [];
  let c = 0;
  while (c < COLS) {
    const k = grid[r * COLS + c];
    if (k < 0) { c++; continue; }
    let n = 1;
    while (c + n < COLS && grid[r * COLS + c + n] === k) n++;
    row.push(c, n, k);
    c += n;
  }
  runs.push(row);
}
const tilesOf = new Map(); // страна → [индексы клеток]
for (let i = 0; i < grid.length; i++) if (grid[i] >= 0) { if (!tilesOf.has(grid[i])) tilesOf.set(grid[i], []); tilesOf.get(grid[i]).push(i); }
const cellCenter = i => [(i % COLS) * STEP + STEP / 2, Math.floor(i / COLS) * STEP + STEP / 2];

// Названия стран: CLDR, короткая форма, если есть («США», «Великобритания»)
const unCode = a2 => UN_BORDERS.codes[a2] || a2;
const SHORT = new Set(['US', 'HK', 'MO', 'PS']); // «США», «Гонконг», «Макао», «Палестина»
const VARIANT = new Set(['CD', 'CG']); // «Конго (ДРК)», «Республика Конго» вместо «Конго - Киншаса»
const NAME_FIXES = {ru: {KG: 'Кыргызстан'}}; // как в статьях сайта (CLDR: «Киргизия»)
function countryName(a2, l) {
  const t = territoryNames[l];
  const name = NAME_FIXES[l]?.[a2] || (SHORT.has(a2) && t[`${a2}-alt-short`]) || (VARIANT.has(a2) && t[`${a2}-alt-variant`]) || t[a2];
  if (!name) throw new Error(`CLDR ${l}: нет названия территории ${a2}`);
  return name;
}

// ---------- CLDR: доли языков по странам ----------
const NATIONAL = new Set(['official', 'de_facto_official']);
function cldrFor(id) {
  const out = new Map();
  for (const code of CLDR_CODES[id] || []) {
    for (const [t, info] of Object.entries(territoryInfo)) {
      const lp = info.languagePopulation?.[code];
      if (!lp) continue;
      const a2 = unCode(t);
      const pct = Number(lp._populationPercent || 0);
      const speakers = Number(info._population || 0) * pct / 100;
      const prev = out.get(a2);
      if (!prev || prev.pct < pct) out.set(a2, {pct, speakers, status: lp._officialStatus || ''});
    }
  }
  return out;
}

// ---------- 100 языков ----------
const scriptGroup = s => {
  const first = s.split(';')[0].trim().toLowerCase();
  if (s.toLowerCase().startsWith('cyrillic')) return 'Cyrillic';
  if (first.startsWith('latin')) return 'Latin';
  if (/arab|shahmukhi|nastaliq/.test(first)) return 'Arabic';
  if (first.startsWith('chinese')) return 'Han';
  if (first.startsWith('kanji')) return 'Japanese';
  if (first.startsWith('devanagari')) return 'Devanagari';
  if (first.startsWith('bengali') || first.startsWith('assamese')) return 'Bengali';
  if (first.startsWith('ethiopic')) return 'Ethiopic';
  if (first.startsWith('myanmar')) return 'Myanmar';
  if (first.startsWith('gurmukhi')) return 'Gurmukhi';
  if (first.startsWith('thai')) return 'Thai';
  return first.split(' ')[0].replace(/^./, ch => ch.toUpperCase());
};
const siteLangs = new Map(site.languages.map(l => [l.id, l]));
const ids = Object.entries(ranks.ranks).sort((a, b) => a[1].rank - b[1].rank).map(([id]) => id);
if (ids.length !== 100) throw new Error(`language-ranks.json: ${ids.length} языков, нужно 100`);

// Точки Glottolog, раздвинутые, если совпали бы на карте (не ближе MIN единиц друг к другу)
const points = ids.map(id => {
  const g = glotByIso.get(id);
  if (!g) throw new Error(`Glottolog 5.3: нет языка с кодом ISO ${id}`);
  const lon = Number(g.Longitude), lat = Number(g.Latitude);
  return {id, lon, lat, xy: proj(lon, lat)};
});
const MIN = 4.2;
const placed = points.map(p => [...p.xy]);
for (let it = 0; it < 80; it++) {
  let movedAny = false;
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    let dx = placed[j][0] - placed[i][0], dy = placed[j][1] - placed[i][1];
    let d = Math.hypot(dx, dy);
    if (d >= MIN) continue;
    if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
    const push = (MIN - d) / 2 + 0.01;
    placed[i][0] -= dx / d * push; placed[i][1] -= dy / d * push;
    placed[j][0] += dx / d * push; placed[j][1] += dy / d * push;
    movedAny = true;
  }
  if (!movedAny) break;
}

function countryAt(x, y) {
  const c = Math.floor(x / STEP), r = Math.floor(y / STEP);
  const k = c >= 0 && c < COLS && r >= 0 && r < ROWS ? grid[r * COLS + c] : -1;
  if (k >= 0) return countries[k];
  // точка в море или на маленьком острове — ближайшая плитка
  let best = null, bd = Infinity;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] < 0) continue;
    const [cx, cy] = cellCenter(i), d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bd) { bd = d; best = countries[grid[i]]; }
  }
  return best;
}

const check = []; // строки сверки для research/atlas/countries-check.tsv
const languages = ids.map((id, n) => {
  const s = siteLangs.get(id), g = glotByIso.get(id), t = tsv.get(id);
  if (!s) throw new Error(`content/site.json: нет языка ${id}`);
  if (!t) throw new Error(`languages-100-curated.tsv: нет языка ${id}`);
  const vals = glotValues.get(g.ID) || {};
  const family = g.Family_ID || g.ID;
  if (!FAMILIES[family]) throw new Error(`Нет подписи семьи ${family} (${glotById.get(family)?.Name}) для ${id}`);
  const branchKey = (t.family.split(';')[1] || '').trim();
  const branch = BRANCHES[branchKey] || null;
  const G = new Set(g.Countries.split(';').filter(Boolean).map(unCode));
  const C = cldrFor(id);
  const [px, py] = placed[n];
  const pointCountry = countryAt(...points[n].xy);
  const core = new Set(), also = new Set(), minor = new Set();
  const reasons = {};
  if (id === 'kaz') {
    KAZAKH.core.forEach(a => core.add(a));
  } else {
    for (const a2 of new Set([...G, ...C.keys()])) {
      const c = C.get(a2), inG = G.has(a2);
      const nat = c && NATIONAL.has(c.status);
      const strong = c && (c.pct >= 30 || (nat && c.pct >= 10));
      if (strong && (inG || nat)) { core.add(a2); reasons[a2] = 'core: CLDR'; }
      else if (c && (c.pct >= 10 || (inG && c.pct >= 1) || (c.status.startsWith('official') && c.pct >= 1))) { also.add(a2); reasons[a2] = 'also: CLDR'; }
      else if (!C.size && inG) { also.add(a2); reasons[a2] = 'also: Glottolog (в CLDR языка нет)'; }
      else if (inG) { minor.add(a2); reasons[a2] = 'minor: только Glottolog'; }
    }
    if (pointCountry && !core.has(pointCountry)) { also.add(pointCountry); reasons[pointCountry] ||= 'also: точка Glottolog'; }
    const fix = COUNTRY_FIXES[id];
    if (fix) {
      for (const a2 of fix.core || []) { also.delete(a2); minor.delete(a2); core.add(a2); reasons[a2] = 'core: правка'; }
      for (const a2 of fix.also || []) { core.delete(a2); minor.delete(a2); also.add(a2); reasons[a2] = 'also: правка'; }
      for (const a2 of fix.drop || []) { core.delete(a2); also.delete(a2); minor.add(a2); reasons[a2] = 'drop: правка'; }
    }
  }
  // На карте — только страны с плитками; страны без плитки (Сингапур, Гонконг…) остаются в тексте
  const byShare = a => -(C.get(a)?.speakers || 0);
  const order = list => [...list].sort((a, b) => byShare(a) - byShare(b) || a.localeCompare(b));
  const coreList = order(core), alsoList = order(also).filter(a => !core.has(a));
  for (const a2 of new Set([...G, ...C.keys(), ...core, ...also])) {
    const c = C.get(a2);
    check.push([id, a2, G.has(a2) ? 'да' : '', c ? c.pct : '', c ? Math.round(c.speakers / 1e5) / 10 : '', c?.status || '', core.has(a2) ? 'основная' : also.has(a2) ? 'также' : minor.has(a2) ? 'только в тексте сверки' : '', reasons[a2] || '', (COUNTRY_FIXES[id]?.why && /правка/.test(reasons[a2] || '')) ? COUNTRY_FIXES[id].why : '']);
  }
  // AES Glottolog показывается, только если запись относится к самому языку (в комментарии — его код ISO)
  const aesValue = vals.aes ? Number(vals.aes.Value) : null;
  return {
    id, rank: ranks.ranks[id].rank, speakers: ranks.ranks[id].speakersMillions,
    names: {kk: s.nameKk, ru: s.nameRu, en: s.name}, native: s.nativeName, dir: s.dir, tag: s.readingTag, font: s.font,
    aliases: s.aliases,
    glottocode: g.ID, lonlat: [Number(g.Longitude), Number(g.Latitude)], point: [r1(px), r1(py)],
    family, branch: branch ? branchKey : null, creole: !!CREOLES[id],
    aes: aesValue, script: scriptGroup(t.script),
    core: coreList, also: alsoList, minor: [...minor].sort(),
    glottologCountries: [...G].sort(),
  };
});

// AES: какие записи относятся не к самому языку (например, украинский — по записи о полесских говорах)
const VALUES_FULL = process.env.ATLAS_GLOTTOLOG_VALUES; // путь к полному values.csv (необязательно)
const AES_NOT_OWN = new Set(['ukr']); // проверено по values.csv Glottolog 5.3: «Polesian (1523-) = Vulnerable»
if (VALUES_FULL && fs.existsSync(VALUES_FULL)) {
  const text = fs.readFileSync(VALUES_FULL, 'utf8');
  for (const l of languages) {
    const line = text.split('\n').find(x => x.startsWith(`${l.glottocode}-aes,`)) || '';
    if (line && !line.includes(`-${l.id})`) && !line.includes(`(${l.id}-`) && !line.includes(`${l.id})`)) AES_NOT_OWN.add(l.id);
  }
}
for (const l of languages) l.aesOwn = l.aes !== null && !AES_NOT_OWN.has(l.id);

// Главный язык страны из сотни — для нажатия на страну: наибольшая доля CLDR среди языков с основной территорией там
const mainOf = {};
for (const a2 of countries) {
  let best = null, bp = -1;
  for (const l of languages) {
    if (!l.core.includes(a2) && !(l.id === 'kaz' && a2 === 'KZ')) continue;
    const share = l.id === 'kaz' ? 100 : cldrFor(l.id).get(a2)?.pct ?? 50;
    if (share > bp || (share === bp && l.rank < best.rank)) { bp = share; best = l; }
  }
  if (best) mainOf[a2] = best.id;
}

// ---------- казахский: ореолы общин ----------
const halos = [];
for (const com of KAZAKH.communities) for (const [lo, la, rad, w] of com.halos) { const [x, y] = proj(lo, la); halos.push([r1(x), r1(y), rad, w, com.country]); }

// ---------- факты ----------
const allLang = glotLangs.filter(r => r.Level === 'language');
const isL1 = r => glotValues.get(r.ID)?.category?.Value === 'Spoken_L1_Language';
const famCount = {};
for (const r of allLang) if (isL1(r)) { const f = r.Family_ID || r.ID; famCount[f] = (famCount[f] || 0) + 1; }
const topFamilies = Object.entries(famCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => ({id, count, names: FAMILIES[id], inHundred: languages.filter(l => l.family === id).length}));
const scripts = {};
for (const l of languages) (scripts[l.script] ||= []).push(l.id);
const facts = {
  glottolog: {version: '5.3', spokenL1: allLang.filter(isL1).length, families: topFamilies},
  hundredFamilies: Object.entries(languages.reduce((a, l) => ((a[l.family] = (a[l.family] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]),
  scripts: Object.entries(scripts).sort((a, b) => b[1].length - a[1].length).map(([script, list]) => ({script, count: list.length, ids: list})),
  kazakhCountriesGlottolog: languages.find(l => l.id === 'kaz').glottologCountries,
  ethnologue: {edition: 29, year: 2026, living: 7170, institutional: 482, stable: 3462, endangered: 3226, largest: 20, largestL1Billions: 3.7},
};

// ---------- запись ----------
const out = (file, data) => { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, data); };
const sources = {
  accessed: ACCESSED,
  naturalEarth: 'Natural Earth 1:110m Admin 0 — Countries (public domain); borders: UN-recognised (decision A8)',
  glottolog: 'Glottolog 5.3 (CC BY 4.0), doi:10.5281/zenodo.18840967, glottolog-cldf v5.3',
  cldr: 'Unicode CLDR 48.2.3 (Unicode License v3), territoryInfo + territory names',
  ethnologue: 'Ethnologue 200, 29th ed. (2026), open table; Ethnologue 2026 open summary pages',
  un: unLog,
};
const versionOf = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
const files = {};
// Страны без плитки (Сингапур, Гонконг, острова…) — в конце списка: на карте их нет, в тексте карточки они есть
const textOnly = [...new Set(languages.flatMap(l => [...l.core, ...l.also]))].filter(a => !cIdx.has(a)).sort();
const allCountries = [...countries, ...textOnly];
const aIdx = new Map(allCountries.map((a2, i) => [a2, i]));
for (const loc of LOCALES) {
  const data = {
    locale: loc,
    map: {W, H: r1(H), step: STEP, cols: COLS, rows: ROWS, tiles: tileCount, runs},
    countries: allCountries.map(a2 => countryName(a2, loc)),
    tiled: countries.length,
    langs: languages.map(l => {
      const o = {
        id: l.id, rank: l.rank, speakers: l.speakers, name: l.names[loc], native: l.native, tag: l.tag,
        search: [...new Set([l.names.kk, l.names.ru, l.names.en, l.native, ...l.aliases, l.id])].join(' | '),
        x: l.point[0], y: l.point[1], family: l.family,
        core: l.core.map(a => aIdx.get(a)), also: l.also.map(a => aIdx.get(a)),
      };
      if (l.dir !== 'ltr') o.dir = l.dir;
      if (l.font !== 'Noto') o.font = l.font;
      if (l.branch) o.branch = l.branch;
      if (l.creole) o.creole = CREOLES[l.id][loc];
      if (l.aesOwn) o.aes = l.aes;
      return o;
    }),
    families: Object.fromEntries(Object.entries(FAMILIES).map(([k, v]) => [k, v[loc]])),
    familyCounts: Object.fromEntries(Object.keys(FAMILIES).map(k => [k, famCount[k] || 0])),
    branches: Object.fromEntries(Object.entries(BRANCHES).map(([k, v]) => [k, v[loc]])),
    halos: halos.map(h => h.slice(0, 4)),
    communities: KAZAKH.communities.map(c => ({country: aIdx.get(c.country) ?? null, name: countryName(c.country, loc), regions: c.regions ? c.regions[loc] : null})),
    main: Object.fromEntries(Object.entries(mainOf).map(([a2, id]) => [cIdx.get(a2), id])),
    quick: QUICK,
  };
  const text = JSON.stringify(data);
  files[loc] = {version: versionOf(text), bytes: Buffer.byteLength(text)};
  out(P(`src/data/atlas/atlas-${loc}.json`), text + '\n');
  out(P(`public/atlas/atlas-${loc}.json`), text);
}
// Коды стран (ISO 3166-1) в порядке индексов данных карты — для тестов (tests/atlas.test.mjs: Крым — Украина и т. п.)
const countryCodes = allCountries;
out(P('src/data/atlas/facts.json'), JSON.stringify({sources, files, countryCodes, projection: {W, S, yTop: Y_TOP, latTop: LAT_TOP, latBottom: LAT_BOTTOM}, facts}, null, 1) + '\n');

// Сверка стран — для автора (откройте в таблице): язык, страна, Glottolog, доля CLDR, итог, причина
const tsvOut = [['language', 'country', 'glottolog', 'cldr_percent', 'cldr_speakers_millions', 'cldr_status', 'result', 'rule', 'why'].join('\t'),
  ...check.map(r => r.join('\t'))].join('\n') + '\n';
out(R('research/atlas/countries-check.tsv'), tsvOut);

// ---------- карта без JavaScript: казахский ----------
function tilePath(list) {
  return list.map(i => { const [x, y] = cellCenter(i); return `M${x - STEP / 2} ${y - STEP / 2}h${STEP}v${STEP}h-${STEP}z`; }).join('');
}
const kzTiles = tilesOf.get(cIdx.get('KZ')) || [];
const haloValue = new Float32Array(grid.length);
for (const [x, y, rad, w] of halos) for (let i = 0; i < grid.length; i++) {
  if (grid[i] < 0) continue;
  const [cx, cy] = cellCenter(i), d = Math.hypot(cx - x, cy - y);
  if (d < rad) haloValue[i] = Math.max(haloValue[i], w * (1 - (d / rad) ** 2));
}
const allTiles = [], pale = [], faint = [];
for (let i = 0; i < grid.length; i++) {
  if (grid[i] < 0) continue;
  allTiles.push(i);
  if (grid[i] === cIdx.get('KZ')) continue;
  if (haloValue[i] >= 0.5) pale.push(i); else if (haloValue[i] >= 0.16) faint.push(i);
}
const pad = 0.6, size = STEP - 2 * pad;
const pattern = (id, fill) => `<pattern id="${id}" width="${STEP}" height="${STEP}" patternUnits="userSpaceOnUse"><rect x="${pad}" y="${pad}" width="${size}" height="${size}" rx="1.15" fill="${fill}"/></pattern>`;
const kaz = languages.find(l => l.id === 'kaz');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${r1(H)}" role="img" aria-label="Қазақ тілі · Казахский · Kazakh"><defs>` +
  `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6be"/><stop offset=".55" stop-color="#ffd64a"/><stop offset="1" stop-color="#f5b418"/></linearGradient>` +
  pattern('l', '#e4e7df') + pattern('k', 'url(#g)') + pattern('p', '#ffe27e') + pattern('f', '#ffefb4') + '</defs>' +
  `<path fill="url(#l)" d="${tilePath(allTiles)}"/><path fill="url(#f)" d="${tilePath(faint)}"/><path fill="url(#p)" d="${tilePath(pale)}"/><path fill="url(#k)" d="${tilePath(kzTiles)}"/>` +
  `<circle cx="${kaz.point[0]}" cy="${kaz.point[1]}" r="7" fill="none" stroke="#00758c" stroke-width="1" opacity=".5"/><circle cx="${kaz.point[0]}" cy="${kaz.point[1]}" r="3.2" fill="#00758c" stroke="#fff" stroke-width="1.2"/></svg>`;
out(P('public/atlas/map-kaz.svg'), svg + '\n');

// ---------- зерно: вырезка из matte-grain.webp (бренд), чтобы не грузить 100 КБ ради плиток ----------
try {
  const {default: sharp} = await import('sharp');
  await sharp(P('public/assets/matte-grain.webp')).extract({left: 0, top: 0, width: 128, height: 128}).webp({quality: 72}).toFile(P('public/atlas/grain.webp'));
} catch (e) {
  if (!fs.existsSync(P('public/atlas/grain.webp'))) throw new Error(`grain.webp: ${e.message}`);
}

console.log(`Плиток: ${tileCount}, сетка ${COLS} × ${ROWS}, стран: ${countries.length}`);
console.log(unLog.join('\n'));
console.log(`Языков: ${languages.length}; AES не своя: ${[...AES_NOT_OWN].join(', ')}`);
console.log(`Семьи Glottolog: ${topFamilies.map(f => `${f.id} ${f.count}`).join(', ')}; Spoken L1: ${facts.glottolog.spokenL1}`);
console.log(`Письменности: ${facts.scripts.map(s => `${s.script} ${s.count}`).join(', ')}`);
console.log(Object.entries(files).map(([l, f]) => `atlas-${l}.json ${f.bytes} Б, v=${f.version}`).join('\n'));
