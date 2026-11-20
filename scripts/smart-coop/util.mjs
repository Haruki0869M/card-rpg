// 賢いマルチプレイ検証 bot（区切り 1-S）: 小さな共通の道具（待つ・決まった乱数・短い指紋）
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** fn() が真になるまで待つ。上限を超えたら false（例外にしない。呼ぶ側が失敗の種類を決める） */
export async function until(fn, ms = 15000, step = 100) {
  const t0 = Date.now();
  for (;;) {
    if (await Promise.resolve().then(fn).catch(() => false)) return true;
    if (Date.now() - t0 > ms) return false;
    await wait(step);
  }
}

/** 種から決まる乱数（mulberry32）。bot の判断は乱数を使わないが、ジョブの選び方など「種で決める順番」に使う */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 短い指紋（djb2）。画面の指紋（sig）に使う */
export function shortHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * 区切り 3-S: 上限つきで待つ（ページの中の処理が返らない時に、台本ごと止まらないように）。上限を超えたら例外（呼ぶ側が「読めない」として扱う）
 */
export function withTimeout(p, ms, label = '') {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`Timeout ${ms}ms ${label}`)), ms); })]).finally(() => clearTimeout(t));
}

/** 区切り 3-S: 今どの処理を待っているか（見張りが、長く返らない処理の名前を出す） */
export const phase = { name: '', at: Date.now(), set(n) { this.name = n; this.at = Date.now(); } };

export const now = () => new Date().toISOString();
export const log = (...a) => console.log('[smart-coop]', ...a);
