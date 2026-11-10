// Step C の画面確認（360×640・390×844・480×860）:
//  ① 冒険の途中（世界マップ・戦闘）にメニューから伝承の書を開き、閉じる・戻るで元のメニューに戻る。開いても冒険の保存は1文字も変わらない
//  ② 敵のタブの「✨めったに会えない敵（n/10）」「👑隠しボス（n/4）」と、まだ見ていない隠しボスのうわさ（本当に出る地域の名前）
//  ③ 重なりの演出: 完全成功＋連携 → 大きな金の数字と揺れ、さらにジョブの能力 → 広がる輪。動きを減らす設定では揺れない
// 使い方: npx vite preview --port 4233 を起こしてから URL=... node scripts/stepc.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle, URL } from './lib.mjs';

const dir = process.env.STEPC_OUTPUT ?? 'screenshots/stepc';
await mkdir(dir, { recursive: true });
const SIZES = (process.env.STEPC_SIZES ?? '360x640,390x844,480x860').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch();
const check = (ok, text) => { if (!ok) throw new Error(text); };
const KEY = 'card-rpg/adventure';
let failed = false;

// 確認用の冒険（2人・森の狼2体の戦闘）を1回だけ作る
const setupPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
setupPage.setDefaultTimeout(15000);
await startBattle(setupPage, 2, ['forestWolf', 'forestWolf'], false);
await setupPage.waitForTimeout(400);
const base = await setupPage.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const baseProfile = await setupPage.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/profile') ?? 'null'));
await setupPage.close();
check(base?.game?.expeditions?.[0]?.battle, '確認用の戦闘が作れない');

for (const [width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: `${dir}/${n}-${width}.png` });
  const layout = async (where) => {
    const issues = await layoutIssues(page);
    check(!issues.length, `${where}: ${issues.join(' / ')}`);
  };
  const save = () => page.evaluate((k) => localStorage.getItem(k), KEY);
  async function resume(d, opts = {}) {
    await page.goto(URL);
    await page.evaluate(({ d, p, k, mode }) => {
      localStorage.clear();
      localStorage.setItem(k, JSON.stringify(d));
      // 記録: めったに会えない敵を1体、隠しボスを1体だけ見たことにする
      const prof = p ?? {};
      prof.enemies ??= { seen: [], kills: {} };
      prof.enemies.seen = [...new Set([...(prof.enemies.seen ?? []), 'goldenWolf', 'hollowDemonLord'])];
      localStorage.setItem('card-rpg/profile', JSON.stringify(prof));
      localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false, cutinMode: mode }));
    }, { d, p: structuredClone(baseProfile), k: KEY, mode: opts.mode ?? 'standard' });
    await page.reload();
    await page.getByText('つづきから', { exact: true }).click();
    await page.waitForTimeout(500);
  }
  /** メニュー → 伝承の書。開く前と後で冒険の保存が同じか確かめる */
  async function openLore(where) {
    await page.getByLabel('メニュー', { exact: true }).click();
    await page.locator('[data-menu-lore]').click();
    await page.locator('[data-lorebook="adventure"]').waitFor();
    await layout(`${where}: 伝承の書`);
  }
  async function enemyTab(where) {
    await page.locator('[data-lore-tab="enemies"]').click();
    const rare = await page.locator('[data-lore-rare]').innerText(), hidden = await page.locator('[data-lore-hidden]').innerText();
    check(rare.includes('✨めったに会えない敵（1/10）'), `${where}: めったに会えない敵の見出し ${rare.slice(0, 40)}`);
    check(hidden.includes('👑隠しボス（1/4）'), `${where}: 隠しボスの見出し ${hidden.slice(0, 40)}`);
    // まだ見ていない3体はうわさ（本当に出る地域）。見た1体（空ろな魔王の影）はうわさでなく名前
    const hints = await page.locator('[data-lore-hidden-hint]').allInnerTexts();
    check(hints.length === 3, `${where}: うわさの数 ${hints.length}`);
    for (const [id, region] of [['drownedBride', '霧の海域'], ['fallenStarSerpent', '星見の丘'], ['ancientEngineHeart', '動力炉']])
      check((await page.locator(`[data-lore-hidden-hint="${id}"]`).innerText()).includes(`${region}の地域のどこかに眠るという…`), `${where}: ${id} のうわさ`);
    check(hidden.includes('空ろな魔王の影'), `${where}: 見た隠しボスの名前が出ない`);
    await layout(`${where}: 敵のタブ`);
    await page.locator('[data-lore-hidden]').scrollIntoViewIfNeeded();
    await shot(`${where}-lore-enemies`);
  }

  try {
    // ---------- ① 世界マップ ----------
    const world = structuredClone(base), g = world.game;
    g.expeditions = []; g.mode = 'world'; delete g.battle; delete g.dungeon; delete g.party;
    g.world.story = undefined; g.world.turn = g.heroes[0].id; g.world.acted = [];
    await resume(world);
    await page.locator('[data-world-moving]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    const w0 = await save();
    await openLore('world');
    await enemyTab('world');
    // 閉じるボタン → メニューに戻る
    await page.locator('[data-lorebook] button[aria-label="閉じる"]').first().click();
    await page.locator('[data-lorebook]').waitFor({ state: 'detached' });
    check(await page.locator('[data-menu-lore]').isVisible(), 'world: 閉じたらメニューに戻らない');
    // もう一度開いて、端末の「戻る」で閉じる → メニューに戻る
    await page.locator('[data-menu-lore]').click();
    await page.locator('[data-lorebook="adventure"]').waitFor();
    await page.goBack();
    await page.locator('[data-lorebook]').waitFor({ state: 'detached' });
    check(await page.locator('[data-menu-lore]').isVisible(), 'world: 戻るでメニューまで閉じた');
    check((await save()) === w0, 'world: 伝承の書を開いたら冒険の保存が変わった');
    await page.getByLabel('閉じる', { exact: true }).click();
    console.log(`OK ${width}px: 世界マップのメニューから伝承の書（閉じる・戻る・保存は同じ）`);

    // ---------- ① 戦闘 ----------
    await resume(base);
    await page.locator('[data-battle-presenting]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    const b0 = await save();
    await openLore('battle');
    await enemyTab('battle');
    // 見た敵の詳細を開き、「戻る」1回目は詳細だけ、2回目で本を閉じる
    await page.locator('[data-lore-rare] [data-lore-cell="seen"]').first().click();
    await page.locator('[data-lore-detail]').waitFor();
    await layout('battle: 敵の詳細');
    await page.goBack();
    await page.locator('[data-lore-detail]').waitFor({ state: 'detached' });
    check(await page.locator('[data-lorebook="adventure"]').isVisible(), 'battle: 戻る1回で本まで閉じた');
    await page.goBack();
    await page.locator('[data-lorebook]').waitFor({ state: 'detached' });
    check(await page.locator('[data-menu-lore]').isVisible(), 'battle: 戻るでメニューに戻らない');
    check((await save()) === b0, 'battle: 伝承の書を開いたら冒険の保存が変わった');
    await page.getByLabel('閉じる', { exact: true }).click();
    console.log(`OK ${width}px: 戦闘のメニューから伝承の書（詳細→本の順に戻る・保存は同じ）`);

    // ---------- ③ 重なりの演出 ----------
    const prep = (withJob) => {
      const d = structuredClone(base), b = d.game.expeditions[0].battle;
      b.enemies.forEach((e) => { e.hp = e.maxHp = 9999; e.block = 0; e.hitBy = [b.allies[1].id]; });
      b.allies.forEach((a, i) => { a.hp = a.maxHp = 999; a.mana = 20; a.focus = 6; a.hand = [{ uid: `stepc${i}`, cardId: 'heavySwing' }]; });
      if (withJob) b.allies[0].abilities = [...(b.allies[0].abilities ?? []), { name: '確認の剛力', source: { kind: 'job', id: b.allies[0].classId, label: '確認' }, effect: { when: 'perfect', do: [{ kind: 'block', amount: 1 }] } }];
      return d;
    };
    async function castPerfect() {
      const id = base.game.expeditions[0].battle.allies[0].id;
      await page.locator(`[data-ally="${id}"]`).click();
      const box = await page.locator('[data-card-index][data-usable]').first().boundingBox();
      await page.mouse.click(box.x + 14, box.y + 70); await page.waitForTimeout(80);
      if (await page.getByText('敵をタップ').count()) {
        const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox(); await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
      }
      for (let i = 0; i < 3; i++) await page.getByLabel('フォーカスを増やす').click();
      await page.evaluate(() => {
        window.stepc = { tiers: [], ring: false, shakeMoved: false, sizes: [] };
        const rec = () => {
          for (const e of document.querySelectorAll('[data-popup-tier]')) {
            window.stepc.tiers.push(e.getAttribute('data-popup-tier'));
            window.stepc.sizes.push(parseFloat(getComputedStyle(e).fontSize));
          }
          if (document.querySelector('[data-synergy-ring]')) window.stepc.ring = true;
          const f = document.querySelector('[data-synergy-field]');
          if (f && getComputedStyle(f).transform !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(getComputedStyle(f).transform)) window.stepc.shakeMoved = true;
        };
        window.stepcObs?.disconnect(); window.stepcObs = new MutationObserver(rec);
        window.stepcObs.observe(document.body, { subtree: true, childList: true, attributes: true });
        const loop = () => { rec(); if (window.stepcLoop) requestAnimationFrame(loop); }; window.stepcLoop = true; loop();
      });
      await page.locator('button:has-text("発動")').click();
      await page.locator('[data-popup-tier]').first().waitFor();
      await page.waitForTimeout(60);
    }
    // 段階2以上（完全成功＋連携）
    await resume(prep(false));
    await castPerfect();
    await layout('段階2の演出');
    await shot('synergy-tier2');
    await page.waitForTimeout(700);
    let fx = await page.evaluate(() => { window.stepcLoop = false; return window.stepc; });
    check(fx.tiers.length && fx.tiers.every((t) => Number(t) >= 2), `段階2の数字が出ない ${JSON.stringify(fx)}`);
    check(fx.sizes.every((s) => s >= 27 && s <= 29), `大きな数字が1.25倍（28px）でない ${fx.sizes}`);
    check(fx.shakeMoved, '段階2で戦場が揺れない');
    // 段階3（完全成功＋連携＋ジョブの能力）
    await resume(prep(true));
    await castPerfect();
    await shot('synergy-tier3');
    await page.waitForTimeout(700);
    fx = await page.evaluate(() => { window.stepcLoop = false; return window.stepc; });
    check(fx.tiers.includes('3') && fx.ring, `段階3の輪が出ない ${JSON.stringify(fx)}`);
    const st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game.expeditions[0].battle.allies[0].block, KEY);
    check(st >= 1, '確認用のジョブの能力が働いていない');
    // 動きを減らす設定: 揺れない（数字・輪は出る）
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await resume(prep(true));
    await castPerfect();
    await page.waitForTimeout(700);
    fx = await page.evaluate(() => { window.stepcLoop = false; return window.stepc; });
    check(fx.tiers.includes('3') && !fx.shakeMoved, `動きを減らす設定で揺れた ${JSON.stringify(fx)}`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    console.log(`OK ${width}px: 重なりの演出（段階2の大きな金の数字と揺れ・段階3の輪・動きを減らす設定では揺れない）`);
    check(!errors.length, `ページのエラー: ${errors.join(' / ')}`);
  } catch (e) {
    failed = true;
    console.error(`NG ${width}px:`, e.message);
    await shot('fail').catch(() => {});
  }
  await page.close();
}
await browser.close();
if (failed) process.exit(1);
console.log('stepc: すべて OK');
