// 賢いマルチプレイ検証 bot: 土台「端末を立てる」（計画 §2-1・直し5・直し7）
// - ブラウザは1つ。端末ごとに別の context（別の人として部屋に入る）
// - 画面の大きさ: P1 390×844・P2 390×540・P3 360×640・P4 412×860。タッチの端末（hasTouch・isMobile）・等倍
// - 本番に書かない守りを二重に: (1) URL に ?emu=127.0.0.1（か localhost）が無ければ動かない
//   (2) ブラウザを「127.0.0.1 と localhost 以外に届かない」設定で起こす（名前の引き先を無くす＋届かない中継＋ほかの宛先の通信を捨てる）
// - 読み込み直しは、同じ context のままページを読み込み直す（端末を閉じて開き直すと別の人になる。直し7）
import os from 'node:os';
import { chromium } from '../lib.mjs';
import { now } from './util.mjs';

/** 席ごとの画面の大きさ（骨組み §1・計画 §2-1） */
export const SEATS = [
  { seat: 'P1', width: 390, height: 844 },
  { seat: 'P2', width: 390, height: 540 },
  { seat: 'P3', width: 360, height: 640 },
  { seat: 'P4', width: 412, height: 860 },
];

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const isLocalHost = (h) => LOCAL_HOSTS.has(String(h).toLowerCase());

/**
 * 守り(1): 手元の確認用サーバー（エミュレーター）につなぐ URL でなければ例外。
 * - ゲームのページも 127.0.0.1 か localhost から配られている事
 * - ?emu= が 127.0.0.1 か localhost（emu=1・空なら、ページのホスト名 = 手元）
 * - 本番の名前（firebaseio・web.app・firebaseapp）が入っていない事
 */
export function assertLocalUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`URL が読めません: ${url}`);
  }
  if (/firebaseio|web\.app|firebaseapp|googleapis/i.test(url)) throw new Error(`本番には書きません（URL に本番の名前があります）: ${url}`);
  if (!isLocalHost(u.hostname)) throw new Error(`ゲームのページが手元（127.0.0.1・localhost）ではありません: ${u.hostname}`);
  if (!u.searchParams.has('emu')) throw new Error(`URL に ?emu= がありません（エミュレーターにつなぐ時だけ動きます）: ${url}`);
  const emu = u.searchParams.get('emu');
  const emuHost = emu === '' || emu === '1' ? u.hostname : emu;
  if (!isLocalHost(emuHost)) throw new Error(`?emu= が手元ではありません: ${emu}`);
  return true;
}

/** 守り(2)の一部: この URL へ通信してよいか（手元だけ・data: など中で済む物） */
export function isAllowedRequest(url) {
  if (/^(data|blob|about|chrome|chrome-extension|devtools):/i.test(url)) return true;
  try {
    return isLocalHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** 手元以外に届かないブラウザを起こす（自己テストでも使う） */
export async function launchGuardedBrowser() {
  return chromium.launch({
    args: [
      // 名前の引き先: localhost・127.0.0.1 以外は「見つからない」
      '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--no-pings',
    ],
    // 数字の宛先（例: 8.8.8.8）は名前の引き先を通らないので、届かない中継（127.0.0.1:9）を通す。手元だけ中継を通さない
    proxy: { server: 'http://127.0.0.1:9', bypass: 'localhost,127.0.0.1' },
  });
}

/** 空いているメモリ（GB） */
export const freeGB = () => os.freemem() / 1024 ** 3;

/**
 * 端末を people 台立てる。onEvent(ev) に画面のエラー・console の error・捨てた通信を知らせる。
 * 返す物: { browser, devices: [{ seat, viewport, ctx, page, errors, blocked, reload }], close }
 */
export async function launchFleet({ people, onEvent = () => {}, minFreeGB } = {}) {
  if (!(people === 2 || people === 4)) throw new Error('人数は 2 か 4 です（計画 §2-1）');
  // 計画 §8-1: メモリの残りが少なければ、始める前に止まる（目安は【提案】2人 1.5GB・4人 2.5GB。SMART_MIN_FREE_GB で変えられる）
  const need = minFreeGB ?? Number(process.env.SMART_MIN_FREE_GB ?? (people === 2 ? 1.5 : 2.5));
  if (freeGB() < need) throw new Error(`メモリが足りません（空き ${freeGB().toFixed(1)}GB・目安 ${need}GB）。ほかの作業を止めてください`);
  const browser = await launchGuardedBrowser();
  const devices = [];
  for (const s of SEATS.slice(0, people)) devices.push(await openDevice(browser, s, onEvent));
  return {
    browser,
    devices,
    async close() {
      for (const d of devices) await d.ctx.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

/** 端末を1台立てる（自己テストでも使う） */
export async function openDevice(browser, { seat, width, height }, onEvent = () => {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'ja-JP' });
  // 設定を先に入れる: 高速・振動なし・最初の案内なし・見取り図の案内なし（coop-agree.mjs と同じ）
  await ctx.addInitScript(() => {
    try {
      if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
    } catch {
      /* about:blank など、保存の無いページ */
    }
  });
  const dev = { seat, viewport: { width, height }, ctx, page: null, errors: [], blocked: [] };
  // 守り(2): 手元以外への通信（http・https）は捨てて記録する。WebSocket は中継と名前の引き先で届かない
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (isAllowedRequest(url)) return route.continue();
    dev.blocked.push({ at: now(), url });
    onEvent({ type: 'blocked', seat, url });
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  dev.page = page;
  page.on('pageerror', (e) => {
    const ev = { type: 'pageerror', seat, at: now(), text: String(e?.message ?? e) };
    dev.errors.push(ev);
    onEvent(ev);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const ev = { type: 'console', seat, at: now(), text: m.text() };
    dev.errors.push(ev);
    onEvent(ev);
  });
  /** 読み込み直し: 同じ context のまま（同じ人のまま）ページを読み込み直す（直し7。揺さぶり S7・S8 で使う） */
  dev.reload = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
  };
  return dev;
}
