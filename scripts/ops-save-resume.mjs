// 運用確認: 保存して再開（途中で保存 → 読み込み → 続きが同じ）を、実際の画面で確かめる。
// 見る場面: 世界マップ・ダンジョンの入口・戦闘の最初・戦闘の途中（敵の番の後）・報酬の画面。3つの幅（360・390・480）。
// 場面ごとに確かめること:
//   ① 読み込み直して「つづきから」を押しても、保存の中身が1文字も変わらない
//   ② 同じ保存から同じ操作を2回して、結果の保存が同じになる（サイコロ・カードのスロット・敵の行動が、再開しても同じ）
//   ③ 再開した画面に、はみ出し・小さい文字・小さいボタンが無い（lib.mjs の layoutIssues）
// 使い方: URL=http://127.0.0.1:4234/card-rpg/ node scripts/ops-save-resume.mjs（OPS_WIDTHS=390 で幅を絞れる）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL, depart, layoutIssues, waitForBattlePresentation, waitForWorldMovement, confirmEndTurn } from './lib.mjs';

const OUT = process.env.OPS_OUTPUT ?? 'screenshots/ops1/save-resume';
mkdirSync(OUT, { recursive: true });
const SIZES = { 360: 640, 390: 844, 480: 860 };
const WIDTHS = (process.env.OPS_WIDTHS ?? '360,390,480').split(',').map(Number);
const KEY = 'card-rpg/adventure';
const rows = [];
const browser = await chromium.launch();

/** 2つの値の違う所（道すじ）を、最大 n 個 */
function diff(a, b, path = '', out = [], n = 8) {
  if (out.length >= n) return out;
  if (a === b) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') { out.push(`${path}: ${JSON.stringify(a)?.slice(0, 60)} → ${JSON.stringify(b)?.slice(0, 60)}`); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${path}.${k}`, out, n);
  return out;
}

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: SIZES[width] ?? 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const note = (scene, what, ok, detail = '') => {
    rows.push({ width, scene, what, ok, detail });
    console.log(`${ok ? 'OK ' : 'NG '} ${width}px ${scene}: ${what}${detail ? ` — ${detail}` : ''}`);
  };
  /** 保存が落ち着く（2回続けて同じ）まで待って読む */
  const read = async () => {
    let prev = null;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(250);
      const cur = await page.evaluate((k) => localStorage.getItem(k), KEY);
      if (cur === prev && !(await page.locator('[data-battle-presenting], [data-world-moving]').count())) return JSON.parse(cur);
      prev = cur;
    }
    return JSON.parse(prev);
  };
  const resume = async (d) => {
    if (d) await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY, d]);
    await page.reload();
    await page.getByText('つづきから', { exact: true }).click();
    await page.waitForTimeout(400);
  };
  const closeStory = async () => {
    for (let i = 0; i < 12; i++) {
      const b = page.getByText('つづける', { exact: true }).first();
      if (!(await b.count())) break;
      await b.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
  };
  /** 場面の確認: ①再開しても同じ ③表示 ②同じ操作を2回して同じ */
  const scene = async (name, act) => {
    const saved = await read();
    await resume();
    await closeStory();
    const again = await read();
    const d1 = diff(saved, again);
    note(name, '再開しても保存が変わらない', d1.length === 0, d1.join(' / '));
    const li = await layoutIssues(page);
    note(name, '再開した画面の表示', li.length === 0, li.slice(0, 6).join(' / '));
    await page.screenshot({ path: `${OUT}/${width}-${name}.png` });
    if (!act) return saved;
    const results = [];
    for (let k = 0; k < 2; k++) {
      await resume(saved);
      await closeStory();
      try { await act(); } catch (e) { note(name, `同じ操作（${k + 1}回目）ができない`, false, String(e.message).split('\n')[0]); await page.screenshot({ path: `${OUT}/${width}-${name}-fail.png` }); return saved; }
      results.push(await read());
    }
    const d2 = diff(results[0], results[1]);
    const moved = diff(saved, results[0], '', [], 1).length > 0;
    note(name, '同じ保存から同じ操作 → 同じ結果', moved && d2.length === 0, !moved ? '操作しても保存が変わらなかった（操作できていない）' : d2.join(' / '));
    writeFileSync(`${OUT}/${width}-${name}.json`, JSON.stringify({ saved, after: results[0] }));
    return results[0];
  };
  /** 戦闘: 使えるカードの1枚目を、最初の敵に使う */
  const playFirstCard = async () => {
    await waitForBattlePresentation(page);
    const ally = page.locator('[data-ally]:not([data-done]):not([data-dead])').first();
    if (await ally.count()) await ally.click({ timeout: 3000 }).catch(() => {});
    const box = await page.locator('[data-card-index][data-usable]').first().boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(150);
    if (await page.getByText('敵をタップ').count()) {
      const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
      await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
    }
    await page.locator('button:has-text("発動")').click();
    await page.waitForTimeout(300);
    await waitForBattlePresentation(page);
  };
  const endTurn = async () => {
    await waitForBattlePresentation(page);
    await page.locator('button:has-text("ターン終了"):not([disabled])').click();
    await confirmEndTurn(page);
    // 敵の番が終わって、また味方の番（ターン終了が押せる）か、結果の画面になるまで
    await page.waitForTimeout(600);
    await page.locator('button:has-text("ターン終了"):not([disabled]), [data-result-button], button:has-text("報酬を受け取る")').first().waitFor({ timeout: 30000 });
    await waitForBattlePresentation(page);
  };

  try {
    // ---- 新しい冒険（2人・やさしい・第1シナリオ） ----
    await page.goto(URL);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
    await page.reload();
    await page.getByText('新しい冒険').click();
    await page.getByText('やさしい', { exact: true }).click();
    await page.getByText('2人', { exact: true }).click();
    await page.getByText('キャラクター作成へ').click();
    await depart(page);
    await page.waitForTimeout(400);
    await closeStory();

    // 1. 世界マップ（移動のサイコロ）
    await scene('world', async () => {
      await page.locator('[data-roll-move]').click();
      await page.waitForTimeout(1500);
    });

    // 2. ダンジョンの入口（周囲の警戒）。全員を翠の神殿の入口へ動かして入る
    {
      const d = await read();
      const w = d.game.world;
      const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
      for (const id of Object.keys(w.pos)) w.pos[id] = t;
      w.story = undefined;
      await resume(d);
      await closeStory();
      await page.getByText('翠の神殿に入る').click();
      await page.waitForTimeout(500);
      await closeStory();
    }
    await scene('dungeon', async () => {
      // 通路（扉の予兆が出ている）で保存して再開し、同じ操作（周囲の警戒: フォーカス1で先読み）をする。サイコロは無くなった
      await page.locator('[data-door-choice]').first().waitFor({ timeout: 5000 });
      await page.locator('[data-scout-open]').click();
      await page.locator('[data-scout-hero]').first().click();
      await page.waitForTimeout(1000);
    });

    // 3. 戦闘の最初（カードを1枚使う）。最初の部屋の敵を森のオオカミ2体にして扉を開ける
    {
      const d = await read();
      (d.game.expeditions?.[0]?.dungeon ?? d.game.dungeon).rooms.find((r) => r.id === 'r0c0').enemies = ['forestWolf', 'forestWolf'].map((defId) => ({ defId, level: 3 }));
      await resume(d);
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: /扉を開ける/ }).first().click();
      await page.waitForTimeout(800);
      if (await page.getByText('戦闘開始', { exact: true }).count()) await page.getByText('戦闘開始', { exact: true }).click();
      await page.locator('[data-card-index]').first().waitFor();
    }
    await scene('battle-start', playFirstCard);

    // 4. 戦闘の途中（ターン終了 → 敵の番 → 次のターン）
    const mid = await scene('battle-endturn', endTurn);

    // 5. 敵の番の後の保存から再開して、もう1枚（途中の保存でも同じ）
    await resume(mid);
    await scene('battle-turn2', playFirstCard);

    // 6. 報酬の画面: 敵のHPを1にして倒し、報酬の画面で保存 → 再開
    {
      const d = await read();
      const b = d.game.expeditions?.find((x) => x.battle)?.battle ?? d.game.battle;
      if (b) {
        for (const e of b.enemies) { if (e.hp > 0) e.hp = 1; e.block = 0; }
        await resume(d);
        for (let i = 0; i < 6 && !(await page.locator('button:has-text("報酬を受け取る")').count()); i++) {
          if (await page.locator('[data-card-index][data-usable]').count()) await playFirstCard().catch(() => {});
          else await endTurn().catch(() => {});
          await page.waitForTimeout(400);
        }
      }
      if (await page.locator('button:has-text("報酬を受け取る")').count()) {
        await scene('battle-won');
        await page.locator('button:has-text("報酬を受け取る")').click();
        await page.waitForTimeout(800);
        await scene('reward');
      } else note('reward', '報酬の画面まで進めなかった（スクリプトの都合）', false);
    }
    note('全体', 'ページのエラーが無い', errors.length === 0, errors.slice(0, 3).join(' / '));
  } catch (e) {
    await page.screenshot({ path: `${OUT}/${width}-failure.png` }).catch(() => {});
    note('全体', '途中で止まった', false, String(e.message).split('\n')[0]);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/result.json`, JSON.stringify(rows, null, 2));
const ng = rows.filter((r) => !r.ok);
console.log(`\n結果: ${rows.length - ng.length}/${rows.length} OK`);
process.exit(ng.length ? 1 : 0);
