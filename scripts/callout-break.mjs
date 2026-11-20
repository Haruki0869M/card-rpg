// 実機の不具合④(2)（2026-11-15）の確認: 2人が続けてカードを使った時、前の「⚡BREAK!」と次の技名の帯が重なって
// 「⚡BREAK!ャンブルボルト」と読めなくなった。早回しで、1人目が BREAK した直後に2人目がカードを使い、
//   (1) 技名の帯は1本だけ（次の技が出たら置き換わる）
//   (2) 帯と「⚡BREAK!」が同時に出ている間、帯の文字の真ん中に BREAK の文字が乗っていない（帯が手前、または重ならない位置）
// を 50ms ごとに測る。1台・オンラインなし（本番の Firebase には何もしない）。
// 狭い画面の直し 回3（2026-11-15）: 「⚡BREAK!」は技名の帯の下の端より下に出す（絵が 40px の時、帯の後ろに隠れていた）。
//   (3) 帯と BREAK の文字が重ならない（帯の文字の範囲に BREAK の文字が入らない）。390×540 と 360×640 の敵3体を足した
// 使い方: URL=http://localhost:<番号>/card-rpg/ node scripts/callout-break.mjs   CALLOUT_OUTPUT で写真の場所
import { mkdirSync } from 'node:fs';
import { chromium, startBattle } from './lib.mjs';

if (/web\.app|firebaseapp/.test(process.env.URL ?? '')) throw new Error('本番の URL では動かしません');
const OUT = process.env.CALLOUT_OUTPUT ?? 'screenshots/callout-break';
mkdirSync(OUT, { recursive: true });
// 既定はふつうの速さ（BREAK の文字が残っている間に、2人目がすぐカードを使う）。CALLOUT_FAST=1 で早送りの設定
const FAST = process.env.CALLOUT_FAST === '1';
const browser = await chromium.launch();
const problems = [];

async function run(W, H, enemies = ['treeWarden']) {
  const tag = `${W}x${H}${enemies.length > 1 ? `-敵${enemies.length}体` : ''}`;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const ng = (t) => problems.push(`${tag}: ${t}`);
  page.on('pageerror', (e) => ng(`画面の例外 ${e.message}`));
  await startBattle(page, 2, enemies, FAST);
  await page.getByText('ターン終了').waitFor();
  // 敵は大技を予告中・HP多め。1人目 = ヘビースイング（完全成功で BREAK）、2人目 = 火球
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const b = d.game.expeditions[0].battle;
    const e = b.enemies[0];
    e.hp = e.maxHp = 900;
    e.intent = { actionId: 'rootBind', targetId: b.allies[0].id };
    delete e.broken;
    delete e.nextActionMultiplier;
    b.phase = 'ally';
    b.allies.forEach((a, i) => {
      a.mana = 9;
      a.focus = 6;
      a.focusMax = Math.max(a.focusMax, 6);
      a.statuses = {};
      a.hand = [{ uid: `t${i}a`, cardId: i === 1 ? 'fireball' : 'heavySwing' }];
    });
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);
  const ids = await page.locator('[data-ally]').evaluateAll((es) => es.map((e) => e.getAttribute('data-ally')));
  const pick = async (i) => {
    await page.locator(`[data-ally="${ids[i]}"]`).click();
    const box = await page.locator('[data-card-index][data-usable]').first().boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(80);
    if (await page.getByText('敵をタップ').count()) {
      const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
      await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
      await page.waitForTimeout(80);
    }
  };
  const fire = async (focus) => {
    for (let i = 0; i < focus; i++) await page.getByLabel('フォーカスを増やす').click();
    await page.locator('button:has-text("発動")').click();
  };
  // 帯と BREAK を 50ms ごとに測る（ページの中で回す）
  await page.evaluate(() => {
    window.__cb = { both: 0, overlap: 0, covered: 0, maxBands: 0, texts: new Set(), withNext: 0 };
    window.__cbTimer = setInterval(() => {
      const bands = [...document.querySelectorAll('[data-callout]')];
      const brk = [...document.querySelectorAll('[data-popup-tone="break"]')];
      const s = window.__cb;
      s.maxBands = Math.max(s.maxBands, bands.length);
      for (const b of bands) s.texts.add(b.getAttribute('data-callout-text'));
      if (brk.length && !s.breakAt) s.breakAt = performance.now();
      if (!bands.length || !brk.length) return;
      s.both++;
      if (bands[0].getAttribute('data-callout-text') === '火球') s.withNext++;
      const t = bands[0].querySelector('.font-display') ?? bands[0];
      const tb = t.getBoundingClientRect();
      for (const p of brk) {
        const pb = p.getBoundingClientRect();
        const hit = pb.left < tb.right && pb.right > tb.left && pb.top < tb.bottom && pb.bottom > tb.top;
        if (!hit) continue;
        s.overlap++;
        // 重なっている所の真ん中で、いちばん手前が BREAK の文字なら「帯の文字の上に乗っている」
        const x = (Math.max(pb.left, tb.left) + Math.min(pb.right, tb.right)) / 2;
        const y = (Math.max(pb.top, tb.top) + Math.min(pb.bottom, tb.bottom)) / 2;
        // 帯も数字も押せない（pointer-events: none）ので、測る間だけ当たるようにして、手前から順に並べる
        const st = document.createElement('style');
        st.textContent = '[data-callout],[data-callout] *,[data-popup-tone],[data-popup-tone] *{pointer-events:auto!important}';
        document.head.appendChild(st);
        const top = document.elementsFromPoint(x, y);
        st.remove();
        const iBand = top.findIndex((el) => bands[0].contains(el));
        const iBreak = top.findIndex((el) => p.contains(el));
        if (iBreak >= 0 && (iBand < 0 || iBreak < iBand)) s.covered++;
      }
    }, 50);
  });
  await pick(0);
  await fire(3);
  // BREAK が出たらすぐ2人目
  await page.waitForFunction(() => window.__cb.breakAt, null, { timeout: 8000, polling: 20 }).catch(() => ng('完全成功で攻撃したのに「⚡BREAK!」が出ない'));
  await page.screenshot({ path: `${OUT}/${tag}-1-break.png` });
  await pick(1);
  await fire(0);
  await page.locator('[data-callout="ally"]').first().waitFor({ timeout: 4000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/${tag}-2-next-callout.png` });
  await page.waitForTimeout(1800);
  const s = await page.evaluate(() => {
    clearInterval(window.__cbTimer);
    const s = window.__cb;
    return { ...s, texts: [...s.texts] };
  });
  const sprite = await page.locator('[data-enemy-sprite]').first().evaluate((el) => Math.round(el.getBoundingClientRect().height)).catch(() => null);
  console.log(`${tag}（敵の絵 ${sprite}px）: 帯と BREAK が同時 ${s.both}回・重なり ${s.overlap}回・BREAK が帯の文字の上 ${s.covered}回・帯は最大 ${s.maxBands}本・帯の文字 ${s.texts.join(' / ')}・2人目の帯（火球）と BREAK が同時 ${s.withNext}回`);
  if (s.maxBands > 1) ng(`技名の帯が同時に ${s.maxBands} 本出た（置き換わっていない）`);
  if (s.covered) ng(`「⚡BREAK!」が技名の帯の文字の上に乗った（${s.covered}回）`);
  if (s.overlap) ng(`「⚡BREAK!」が技名の帯の文字と重なった（帯の後ろに隠れる。${s.overlap}回）`);
  if (!s.texts.length) ng('技名の帯が出ていない');
  if (!s.texts.includes('火球')) ng('2人目の技名の帯（火球）が出ていない');
  if (!s.withNext) console.log('   注意: 2人目の帯が出た時には BREAK の文字が消えていた（重なりの形を作れなかった）');
  await page.close();
}

for (const [w, h, en] of [[390, 540], [390, 844], [360, 640], [390, 540, ['treeWarden', 'forestWolf', 'forestWolf']], [360, 640, ['treeWarden', 'forestWolf', 'forestWolf']]]) await run(w, h, en);
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 技名の帯は1本で置き換わり、「⚡BREAK!」が帯の文字と重ならない（390×540・390×844・360×640・390×540 と 360×640 の敵3体）');
