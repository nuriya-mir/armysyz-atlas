// Глава «Атласа языков» «Бір сөз — көп тіл · Одно слово — много языков · One word, many languages»
// (решения автора G18–G28, design/greetings-route-2026-10-11/). Пределы, адреса программы записи и чистые функции формы.
// Те же числа — в серверной программе (часть B, api/words/config.php); тест сверяет их.
import type {Locale} from './model';
import wordsFile from '../data/words.json' with {type: 'json'};

export interface Word {
  id: string;
  status: 'open' | 'planned';
  title: Record<Locale, string>;
  series: Record<Locale, string>;
}
export const WORDS = wordsFile.words as Word[];

export const WORDS_API = {status: '/api/words/status.php', submit: '/api/words/submit.php'} as const;

export const WORDS_LIMITS = {
  perWordLanguage: 5,          // G20: опубликованных голосов на слово в языке — поровну для всех языков
  perWordLanguagePending: 5,   // G20: на проверке на слово в языке
  globalPending: 15,           // G22: общая очередь на проверку
  audioMaxBytes: 10 * 1024 * 1024, // G27
  videoMaxBytes: 50 * 1024 * 1024, // G27: жестовые языки
  videoMaxSeconds: 30,             // G27
} as const;

export const CONSENT = {version: 'v1', date: '2026-10-13'} as const;
export const LICENSES = ['CC-BY-NC-4.0', 'CC-BY-4.0', 'CC0-1.0'] as const;

const AUDIO = {types: ['audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'], ext: ['m4a', 'mp4', 'aac', 'mp3', 'ogg', 'oga', 'wav', 'webm']};
const VIDEO = {types: ['video/mp4', 'video/quicktime', 'video/webm'], ext: ['mp4', 'mov', 'webm']};
export const ACCEPT = {
  audio: AUDIO.ext.map(e => '.' + e).join(','),
  video: VIDEO.ext.map(e => '.' + e).join(','),
};

/** Сравнение названий: регистр, диакритика и лишние пробелы не важны. */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Строка списка языков (public/words/languages.json): [glottocode, iso, en, ru, kk, sign]. */
export type LangRow = [string, string, string, string, string, number];
/** name — на языке страницы (если есть), en — английское название Glottolog: показывается рядом, чтобы похожие не путались. */
export interface LangHit {glottocode: string; iso: string; name: string; en: string; sign: boolean}

/** Поиск языка по любому из трёх названий или коду ISO; сначала совпадения с начала названия. */
export function searchLanguages(rows: LangRow[], query: string, locale: Locale, limit = 20): LangHit[] {
  const q = normalizeName(query);
  if (!q) return [];
  const starts: LangHit[] = [], contains: LangHit[] = [];
  for (const [glottocode, iso, en, ru, kk, sign] of rows) {
    const names = [en, ru, kk].filter(Boolean).map(normalizeName);
    const hit = {glottocode, iso, name: (locale === 'ru' ? ru : locale === 'kk' ? kk : en) || en, en, sign: sign === 1};
    if (iso === q || names.some(n => n.startsWith(q))) starts.push(hit);
    else if (names.some(n => n.includes(q))) contains.push(hit);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

/** null — файл подходит; иначе причина. Тип — по MIME или, если браузер его не дал, по расширению. */
export function validateFile(file: {name: string; type: string; size: number}, kind: 'audio' | 'video'): null | 'wrongType' | 'tooBig' {
  const rule = kind === 'audio' ? AUDIO : VIDEO;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = file.type.split(';')[0].trim().toLowerCase();
  const typeOk = mime ? rule.types.includes(mime) : rule.ext.includes(ext);
  if (!typeOk) return 'wrongType';
  const max = kind === 'audio' ? WORDS_LIMITS.audioMaxBytes : WORDS_LIMITS.videoMaxBytes;
  return file.size > max ? 'tooBig' : null;
}

export type StatusKey = 'open' | 'languageFull' | 'queueFull' | 'wordClosed' | 'unavailable';
/** Ответ сервера на «есть ли место» → одно из пяти состояний формы. */
export function statusKey(json: unknown): StatusKey {
  if (!json || typeof json !== 'object') return 'unavailable';
  const j = json as {open?: unknown; reason?: unknown};
  if (j.open === true) return 'open';
  return ({'language-full': 'languageFull', 'queue-full': 'queueFull', 'word-closed': 'wordClosed'} as Record<string, StatusKey>)[String(j.reason)] ?? 'unavailable';
}
