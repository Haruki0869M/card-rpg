// 確認スクリプトの共通部品
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
export const { chromium } = require('playwright');
export const URL = process.env.URL ?? 'http://localhost:4173/card-rpg/';

/**
 * キャラ作成の「冒険に出発」を押す。2人以上でまだ確かめていないキャラがいる時は、ゲーム内の確認（フェーズ3）で「出発する」を押す
 */
export async function depart(page, opts = {}) {
  await page.getByText('冒険に出発', opts).click();
  const ask = page.getByRole('dialog', { name: 'このまま出発しますか？' });
  try {
    await ask.waitFor({ timeout: 500 });
    await ask.getByText('出発する', { exact: true }).click();
  } catch {
    /* 確認なし（1人・全員を確かめた） */
  }
}

/**
 * 新しい冒険を始めて（人数を指定）、世界マップの翠の神殿の入口から入り、最初の部屋で戦闘を始める。
 * enemies を渡すと、最初の部屋の敵をその組み合わせに差し替える（敵1〜4体の確認用）。
 */
export async function startBattle(page, partySize, enemies, fast = true, url = URL) {
  await page.goto(url);
  await page.evaluate((fast) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: fast, vibration: false, firstGuide: false }));
  }, fast);
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText(`${partySize}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
  // 保存データを書き換えて、全員を翠の神殿の入口へ（物語も閉じる）
  const edit = async (fn, arg) => {
    await page.evaluate(
      ({ src, arg }) => {
        const k = 'card-rpg/adventure';
        const d = JSON.parse(localStorage.getItem(k));
        (0, eval)(src)(d.game, arg);
        localStorage.setItem(k, JSON.stringify(d));
      },
      { src: fn.toString(), arg },
    );
    await page.reload();
    await page.getByText('つづきから').click();
  };
  await edit((g) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
  });
  await page.getByText('翠の神殿に入る').click();
  await page.waitForTimeout(200);
  if (enemies) {
    await edit((g, enemies) => {
      (g.expeditions?.[0]?.dungeon ?? g.dungeon).rooms.find((r) => r.id === 'r0c0').enemies = enemies.map((defId) => ({ defId, level: 3 }));
    }, enemies);
  }
  await page.waitForTimeout(200);
  // 第3段階: 入口は1行目の扉の前（北向き）。扉を開けて最初の部屋へ
  await page.getByRole('button', { name: /扉を開ける/ }).click();
  await page.waitForTimeout(400);
}

export async function layoutIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1) out.push(`page overflow ${de.scrollWidth}x${de.scrollHeight}`);
    // 遊び方・用語集（Step A ③）を開いている時は、その画面を確かめる（後ろの画面は隠れていて押せない）
    // 伝承の書（タイトル・冒険の途中。Step C ②）を開いている時も、その画面を確かめる
    const game = document.querySelector('[data-help]') ?? document.querySelector('[data-lorebook]') ?? document.querySelector('.game-bg') ?? document.body;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    // スクロールできる領域の中は、画面外にあってもスクロールで見られるので対象外
    const inScroller = (el) => {
      for (let p = el.parentElement; p && p !== game; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return true;
      }
      return false;
    };
    for (const el of game.querySelectorAll('button, [data-card-index], [data-enemy], [data-ally]')) {
      if (!visible(el) || inScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1)
        out.push(`offscreen: "${el.textContent.slice(0, 16)}" ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
    }
    for (const el of game.querySelectorAll('button')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.push(`small button: "${el.textContent.slice(0, 12)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    // 重なったカードの押せる幅
    const cs = [...game.querySelectorAll('[data-card-index]')].map((e) => e.getBoundingClientRect());
    for (let i = 0; i + 1 < cs.length; i++) {
      const dx = cs[i + 1].left - cs[i].left;
      if (Math.abs(cs[i + 1].top - cs[i].top) < 30 && dx < 43.5) out.push(`card strip ${i}: ${dx.toFixed(0)}px`);
    }
    // 敵・味方の押せる大きさ
    for (const el of game.querySelectorAll('[data-enemy]:not([data-dead]), [data-ally]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.push(`small target ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    // 12px未満の文字
    const small = new Set();
    for (const el of game.querySelectorAll('*')) {
      if (![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
      if (!visible(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) small.add(`${fs}px "${el.textContent.trim().slice(0, 10)}"`);
    }
    out.push(...[...small].map((s) => `small text ${s}`));
    return out;
  });
}

/** 演出の固定秒数に依存しない。止まった場合は上限で失敗させる。 */
export async function waitForWorldMovement(page) {
  await page.locator('[data-world-moving]').waitFor({ state: 'detached', timeout: 15000 });
}

/** 戦闘の表示順を保ったまま結果画面まで待つ。入力や判定は変更しない。 */
export async function waitForBattlePresentation(page) {
  await page.locator('[data-battle-presenting]').waitFor({ state: 'detached', timeout: 15000 });
}

/** 敵の特殊な行動の札の、敵が3体以上の時の短い形（src/data/enemyBehaviors.ts の short。2026-11-13） */
export const BEHAVIOR_SHORT = { '⚠️手数読み': '⚠️手数', '🛡️かばう': '🛡️かばう', '🚫癒し封じ': '🚫癒封じ', '📢増援': '📢増援', '🎯手負い狙い': '🎯手負い', '🔨盾砕き': '🔨盾砕き', '✨浄化': '✨浄化' };

/**
 * 敵が3体以上の時の、敵の列の下の案内の1行（data-behavior-brief-bar）を確かめる（2026-11-13）。問題の文の配列を返す。
 * - 1つだけ出る・画面の外に出ない・文が枠からはみ出さない・12px より小さい字でない・操作パネルに重ならない
 * - どの敵の名前・HP・予告の枠・BREAK の印にも重ならない
 * - 味方の顔: 高さ700px以上の画面で 8px を超えて重なれば問題。低い画面は前からの並び（味方が最小の大きさで敵の高さまで来る）なのでメモ
 * - 左の敵の札が金の縁（data-brief-on）。2体目の敵の予告の枠を押すと、金の縁と文がその敵に替わる（押すのはこの端末の見た目だけ）
 */
export async function briefBarIssues(page, count) {
  const out = [];
  const notes = [];
  const bars = page.locator('[data-behavior-brief-bar]');
  if ((await bars.count()) !== 1) return { out: [`案内の1行の数が ${await bars.count()}`], notes };
  const look = () => page.evaluate(() => {
    const out = [];
    const notes = [];
    const bar = document.querySelector('[data-behavior-brief-bar]');
    const r = bar.getBoundingClientRect();
    const hit = (a, b) => a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3;
    if (r.left < 0 || r.right > innerWidth) out.push(`案内の1行が画面の外（${r.left.toFixed(0)}〜${r.right.toFixed(0)}）`);
    if (bar.scrollWidth > bar.clientWidth + 1) out.push('案内の1行の文が枠からはみ出す');
    if (parseFloat(getComputedStyle(bar).fontSize) < 12) out.push('案内の1行の字が 12px より小さい');
    const panel = document.querySelector('.glass-panel')?.getBoundingClientRect();
    if (panel && r.bottom > panel.top + 1) out.push('案内の1行が操作パネルに重なる');
    [...document.querySelectorAll('[data-enemy]:not([data-dead])')].forEach((u, j) => {
      const info = u.querySelector('[data-enemy-info]');
      const parts = { 名前: info?.children[0], HP: info?.children[1], 予告: u.querySelector('[data-intent]'), 'BREAK の印': u.querySelector('[data-break-hint]') };
      for (const [k, el] of Object.entries(parts)) if (el && hit(r, el.getBoundingClientRect())) out.push(`案内の1行が敵${j}の${k}に重なる`);
      for (const el of u.querySelectorAll('[data-status]')) if (hit(r, el.getBoundingClientRect())) out.push(`案内の1行が敵${j}の状態異常の印に重なる`);
    });
    [...document.querySelectorAll('[data-ally-sprite]')].forEach((el, k) => {
      const a = el.getBoundingClientRect();
      const f = { left: a.left + a.width * 0.25, right: a.right - a.width * 0.25, top: a.top, bottom: a.top + a.height * 0.3 };
      const depth = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
      if (hit(r, f) && depth > 8 && innerHeight >= 700) out.push(`案内の1行が味方${k}の顔に ${depth.toFixed(0)}px 重なる`);
      else if (hit(r, f)) notes.push(`案内の1行と味方${k}の絵の箱の上の端が ${depth.toFixed(0)}px 触れる`);
    });
    const on = [...document.querySelectorAll('[data-enemy]:not([data-dead])')].findIndex((u) => u.querySelector('[data-brief-on]'));
    return { out, notes, on, text: bar.textContent };
  });
  const first = await look();
  out.push(...first.out);
  notes.push(...first.notes);
  if (first.on !== 0) out.push(`金の縁の札が左の敵でない（${first.on}）`);
  // 2体目の敵の予告の枠を押すと、案内がその敵に替わる
  if (count >= 2) {
    await page.locator('[data-enemy]:not([data-dead])').nth(1).locator('[data-intent]').click();
    await page.waitForTimeout(150);
    const second = await look();
    out.push(...second.out);
    if (second.on !== 1) out.push(`2体目の札を押しても、金の縁が替わらない（${second.on}）`);
    if (second.text === first.text) out.push('2体目の札を押しても、案内の文が替わらない');
  }
  return { out, notes, text: first.text };
}

/** 「ターン終了」の確認の窓（まだ行動できる仲間がいる時だけ出る）が出たら「ターンを終了する」を押す */
export async function confirmEndTurn(page) {
  const yes = page.getByRole('button', { name: 'ターンを終了する' });
  try { await yes.waitFor({ timeout: 400 }); } catch { return false; }
  await yes.click();
  return true;
}
