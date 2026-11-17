// 賢いマルチプレイ検証 bot: 押す（ゲームを操作する道は、ここだけ。計画 §3-1・直し4）
// 流れ（毎回）: 演出が終わるのを待つ → スクロールの窓の中なら見える所へ（人が指で送るのと同じ。overflow auto・scroll の窓だけ）
//   → 四角が止まるのを待つ → 検査①（センサー）→ 当たったら 0.4秒あけてもう1度 → タップ（検査した点を指で押す）→ 効いたかを確かめる → 記録
// 決まり: 上に何か乗っていて押せない時は、絶対に無理に押さない（force・スクリプトでの click・dispatchEvent は使わない）。
//   全端末の証拠を残して「失敗」にし、押さずに返す（オーナーの返事1）。
import { checkTarget, rectInPage, revealInPage } from './sensor.mjs';
import { BUSY } from './view/scenes/game.mjs';
import { readView } from './view/index.mjs';
import { until, wait } from './util.mjs';

const BUSY_MS = 20000;
const STABLE_MS = 1500;
const TOAST_MS = 3000;
const EFFECT_MS = 3000;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 押す物の書き方 { css, text?, exact?, nth? } を Playwright の locator にする（見えている物だけ） */
export function locate(page, target) {
  let loc = page.locator(target.css);
  if (target.text !== undefined) loc = loc.filter({ hasText: target.exact === false ? target.text : new RegExp(`^\\s*${esc(target.text)}\\s*$`) });
  return loc.filter({ visible: true }).nth(target.nth ?? 0);
}

/** 押す物の名前（記録・場所の鍵に使う） */
export const targetKey = (t) => `${t.css}${t.text !== undefined ? `「${t.text}」` : ''}${t.nth ? `#${t.nth}` : ''}`;

/** 演出中でなくなるまで待つ（上限 20秒）。待てたら true */
export async function waitNotBusy(page, ms = BUSY_MS) {
  return until(() => page.evaluate((sels) => !sels.some((s) => document.querySelector(s)), BUSY), ms, 100);
}

/**
 * 押す。
 * @param {object} s セッション { judge, probe? }（probe(dev) = 効いたかを見る印。既定は画面の指紋＋全体の番号）
 * @param {object} dev 端末
 * @param {object} target 押す物 { css, text?, exact?, nth? }
 * @param {object} o { what: 記録の名前, appearMs: 出てくるまで待つ上限, expectEffect: 効いたかを確かめるか }
 * 返す物: { pressed, failed, needPan, effect, problems }
 */
export async function press(s, dev, target, { what = targetKey(target), appearMs = 8000, expectEffect = true } = {}) {
  const { judge } = s;
  const page = dev.page;
  const entry = { seat: dev.seat, what, target: targetKey(target) };
  // 1. 演出が終わるのを待つ
  if (!(await waitNotBusy(page))) {
    await judge.fail('stuck', { seat: dev.seat, text: `演出が ${BUSY_MS / 1000}秒終わらない（${what} を押す前）` });
    judge.record({ ...entry, result: 'busy' });
    return { pressed: false, failed: true };
  }
  const loc = locate(page, target);
  if (!(await until(async () => (await loc.count()) > 0, appearMs, 100))) {
    await judge.fail('missing', { seat: dev.seat, text: `押す物が無い: ${what}（${targetKey(target)}）`, key: `missing|${dev.seat}|${targetKey(target)}` });
    judge.record({ ...entry, result: 'missing' });
    return { pressed: false, failed: true };
  }
  // 2. スクロールの窓の中なら見える所へ（人が指で送るのと同じ）
  const scrolled = await loc.evaluate(revealInPage).catch(() => false);
  // 3. 四角が止まるのを待つ（80ミリ秒あけて2回測って同じ）
  let prev = null;
  await until(async () => {
    const r = JSON.stringify(await loc.evaluate(rectInPage));
    const same = r === prev;
    prev = r;
    return same;
  }, STABLE_MS, 80);
  // 4. 検査①
  let res = await checkTarget(loc);
  if (res.problems.some((p) => p.kind === 'toast')) {
    // 短いお知らせは消えるまで待ってから測り直す（上限3秒）
    await until(async () => !(await checkTarget(loc)).problems.some((p) => p.kind === 'toast'), TOAST_MS, 200);
    res = await checkTarget(loc);
  }
  if (res.needPan) {
    // 地図のマスに地図の外の物が乗っている → 地図を動かすのは頭の仕事（brain/world.mjs。区切り 1-J）
    judge.record({ ...entry, scrolled, result: 'need-pan', sensor: res });
    return { pressed: false, needPan: true, problems: res.problems };
  }
  if (res.problems.length) {
    await wait(400);
    const again = await checkTarget(loc);
    const place = `${dev.seat}|${(await readView(dev)).sig}|${targetKey(target)}`;
    if (!again.problems.length && !again.needPan) {
      // 一瞬の当たり: 写真とメモ。同じ所で2回目なら失敗（オーナーの返事4）
      const failed = await judge.momentaryHit(dev, place, `${what}: ${res.problems.map((p) => p.text).join('／')}`);
      if (failed) {
        judge.record({ ...entry, scrolled, result: 'momentary-fail', sensor: res });
        return { pressed: false, failed: true, problems: res.problems };
      }
      res = again;
    } else {
      // 残っている → 失敗。押さない（無理に押して進めない）
      const p = again.problems[0] ?? res.problems[0];
      const kind = p.kind === 'cover' || p.kind === 'toast' ? 'cover' : p.kind === 'disabled' ? 'missing' : p.kind === 'offscreen' || p.kind === 'strip' ? 'overflow' : 'overlap';
      await judge.fail(kind, { seat: dev.seat, text: `${what}: ${again.problems.map((x) => x.text).join('／')}`, key: `${kind}|${place}` });
      judge.record({ ...entry, scrolled, result: 'blocked', sensor: again });
      return { pressed: false, failed: true, problems: again.problems };
    }
  }
  // 5. タップ（検査した点を指で押す）
  const before = expectEffect ? await probe(s, dev) : null;
  await page.touchscreen.tap(res.point.x, res.point.y);
  // 6. 効いたかを確かめる（3秒以内に、その端末の画面の指紋か、全体の番号が変われば良い）
  let effect = null;
  if (expectEffect) {
    effect = await until(async () => (await probe(s, dev)) !== before, EFFECT_MS, 150);
  }
  judge.record({ ...entry, scrolled, result: 'tap', point: res.point, effect });
  return { pressed: true, effect, problems: [] };
}

/** 効いたかを見る印: 画面の指紋＋全体の番号（審判が読む） */
async function probe(s, dev) {
  if (s.probe) return s.probe(dev);
  const v = await readView(dev);
  const seq = await s.judge.maxSeq();
  return `${v.sig}|${seq}`;
}

/**
 * 字を打つ: 入れ物をタップして（検査つき）、全部選んでから、キーボードで打つ（人が打つのと同じ）
 */
export async function typeText(s, dev, target, text, { what = targetKey(target) } = {}) {
  const r = await press(s, dev, target, { what: `${what}（入れ物をタップ）`, expectEffect: false });
  if (!r.pressed) return r;
  await dev.page.keyboard.press('Control+A');
  await dev.page.keyboard.press('Backspace');
  await dev.page.keyboard.type(String(text), { delay: 20 });
  s.judge.record({ seat: dev.seat, what, result: 'type', text: String(text) });
  return { pressed: true };
}

/** 出てくれば押す（確認の窓など、出ない事もある物）。出なければ false */
export async function pressIfShown(s, dev, target, o = {}) {
  const loc = locate(dev.page, target);
  if (!(await until(async () => (await loc.count()) > 0, o.appearMs ?? 600, 100))) return false;
  return (await press(s, dev, target, { ...o, appearMs: 0 })).pressed;
}
