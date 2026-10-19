// Список языков для формы главы «Одно слово — много языков» (решения G19, G28): живые разговорные и жестовые языки
// Glottolog 5.3 (CC BY 4.0, research/atlas/glottolog-5.3). Названия: у ста языков шара — из content/site.json
// (name, nameRu, nameKk); у остальных — Unicode CLDR через Intl.DisplayNames по коду ISO 639, если название есть;
// иначе — английское название Glottolog. Строка: [glottocode, iso, en, ru, kk, sign].
// Запуск — вручную при смене Glottolog или site.json: node scripts/build-words-languages.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GLOT = path.resolve(ROOT, '../research/atlas/glottolog-5.3');
const OUT = path.join(ROOT, 'public/words/languages.json');

// Тот же разбор CSV, что в build-atlas-data.mjs (кавычки, запятые и переводы строк внутри полей).
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

const values = new Map();
for (const v of csv(path.join(GLOT, 'values-languages.csv'))) {
  const o = values.get(v.Language_ID) || {};
  o[v.Parameter_ID] = v.Code_ID;
  values.set(v.Language_ID, o);
}
const KEEP = new Set(['category-Spoken_L1_Language', 'category-Sign_Language']);

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
const siteByIso = new Map(site.languages.map(l => [l.id, l]));
const display = Object.fromEntries(['ru', 'kk'].map(l => [l, new Intl.DisplayNames([l], {type: 'language', fallback: 'none'})]));
// В списке — с заглавной буквы, как названия ста языков в site.json («Казахский», а не «казахский»).
const cldr = (locale, iso) => {
  if (!iso) return '';
  let name = '';
  try { name = display[locale].of(iso) || ''; } catch { return ''; }
  return name ? name[0].toLocaleUpperCase(locale) + name.slice(1) : '';
};

const langs = [];
for (const r of csv(path.join(GLOT, 'languages.csv'))) {
  if (r.Level !== 'language') continue;
  const v = values.get(r.Glottocode) || {};
  if (!KEEP.has(v.category) || v.aes === 'aes-extinct') continue;
  const iso = r.ISO639P3code || '';
  const s = siteByIso.get(iso);
  langs.push([r.Glottocode, iso, s?.name || r.Name, s?.nameRu || cldr('ru', iso), s?.nameKk || cldr('kk', iso), v.category === 'category-Sign_Language' ? 1 : 0]);
}
langs.sort((a, b) => a[2].localeCompare(b[2], 'en'));

fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, JSON.stringify({v: 1, source: 'Glottolog 5.3 (CC BY 4.0); Unicode CLDR', langs}));
console.log(`${langs.length} languages (${langs.filter(l => l[5]).length} sign) → ${path.relative(ROOT, OUT)}, ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
