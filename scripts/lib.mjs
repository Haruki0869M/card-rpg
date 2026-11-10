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
export async function startBattle(page, partySize, enemies, fast = true) {
  await page.goto(URL);
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
  // ダンジョンの番の最初に探索力を決める（M3-D）
  if (await page.locator('[data-explore-roll-button]').count()) await page.locator('[data-explore-roll-button]').click();
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

/** 「ターン終了」の確認の窓（まだ行動できる仲間がいる時だけ出る）が出たら「ターンを終了する」を押す */
export async function confirmEndTurn(page) {
  const yes = page.getByRole('button', { name: 'ターンを終了する' });
  try { await yes.waitFor({ timeout: 400 }); } catch { return false; }
  await yes.click();
  return true;
}
