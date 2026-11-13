// 回2 の画面の確認（360×640 と 390×844）:
// 1) 転職の専用カード3枚: 押す前・押した後（下に説明の窓・「このカードにする」が画面の中）
// 2) 町の売却: 装備を押すと説明と、今の装備との違い・「〇Gで売る」は窓の中（P2 のキャラで、1台で P2 以降でも動く）
// 3) 町のカード削除: 押すと説明 → 「このカードを取り除く」→ 確かめの窓に効果の1行
// 4) 町の中のステータス: 開く → 装備を替える → 閉じて同じタブ（カード削除）に戻る
// 5) 大技の予告の BREAK の印（敵1体 = 長い形、4体 = 短い形。BREAK した後は出ない）
// 6) 倒れた演出のコマ（0.05秒おき。ふつうの敵・ボス・「簡易」の設定）。命中の演出 → 倒れる、の順
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/ui-r2.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, depart, layoutIssues, startBattle, URL } from './lib.mjs';
import { loadJobData } from './gameData.mjs';

const dir = 'screenshots/ui-r2';
await mkdir(dir, { recursive: true });
const { jobLevel } = await loadJobData();
const browser = await chromium.launch();
const problems = [];
const frameCounts = {};

const SIZES = [
  [360, 640],
  [390, 844],
];

/** 画面の中（スクロールの欄の中なら、その欄の見えている所）に収まっているか。スクロールが止まるのを待ってから見る */
const inView = async (page, sel) => {
  await page.waitForTimeout(500);
  return page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    let box = { top: 0, left: 0, bottom: innerHeight, right: innerWidth };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden)/.test(cs.overflowY)) {
        const q = p.getBoundingClientRect();
        box = { top: Math.max(box.top, q.top), left: Math.max(box.left, q.left), bottom: Math.min(box.bottom, q.bottom), right: Math.min(box.right, q.right) };
      }
    }
    return r.top >= box.top - 1 && r.left >= box.left - 1 && r.bottom <= box.bottom + 1 && r.right <= box.right + 1;
  });
};

async function newPage(w, h, fast = true, extra = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate(
    ({ fast, extra }) => {
      localStorage.clear();
      localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: fast, vibration: false, firstGuide: false, ...extra }));
    },
    { fast, extra },
  );
  await page.reload();
  return { page, errors };
}

const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
const load = async (page, d) => {
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
};

// ---------- 1) 転職の3択 ----------
async function jobPick(w, h) {
  const tag = `${w}x${h}`;
  const ng = (t) => problems.push(`転職 ${tag}: ${t}`);
  const { page, errors } = await newPage(w, h);
  await page.getByText('新しい冒険').click();
  await page.getByText('1人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
  const d = await save(page);
  d.game.world.story = undefined;
  d.game.heroes[0].level = jobLevel('swordmaster');
  await load(page, d);
  await page.locator('[data-status-button]').click();
  await page.getByText('転職先を見る').click();
  await page.getByText('剣豪に転職する').click();
  await page.getByRole('dialog').getByText('転職する').click();
  await page.locator('[data-job-pick]').waitFor();
  await page.waitForTimeout(250);
  if (await page.getByText('このカードにする').count()) ng('押す前から「このカードにする」が出ている');
  if (!(await page.getByText('カードを押すと、くわしい説明が出ます').count())) ng('押す前の案内が無い');
  await page.screenshot({ path: `${dir}/1-jobpick-before-${tag}.png` });
  await page.locator('[data-job-pick] [data-pick-card="0"]').click();
  await page.waitForTimeout(400);
  const panel = page.locator('[data-job-pick] [data-card-pick-panel]');
  if (!(await panel.count())) ng('カードを押しても説明の窓が開かない');
  else {
    const tiers = await panel.innerText();
    if (!/成功|：/.test(tiers)) ng(`説明の窓に段ごとの効果が無い: ${tiers.slice(0, 40)}`);
    if (!(await inView(page, '[data-job-pick] [data-card-pick-action]'))) ng('「このカードにする」が画面の外');
  }
  const issues = await layoutIssues(page);
  if (issues.length) ng(issues.join(' / '));
  await page.screenshot({ path: `${dir}/1-jobpick-after-${tag}.png` });
  // 別のカードに切り替え → 決める
  await page.locator('[data-job-pick] [data-pick-card="1"]').click();
  await page.waitForTimeout(250);
  const name = await page.locator('[data-job-pick] [data-pick-card="1"]').getAttribute('aria-label');
  await page.locator('[data-card-pick-action]').click();
  await page.waitForTimeout(400);
  if (await page.locator('[data-job-pick]').count()) ng('決めても3択が閉じない');
  const hero = (await save(page)).game.heroes[0];
  if (hero.classId !== 'swordmaster') ng(`転職の結果がおかしい: ${hero.classId}`);
  console.log(`転職 ${tag}: 「${name}」を選んだ・山札 ${hero.deck.length}枚`);
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
}

// ---------- 2〜4) 町（売却・カード削除・ステータス） ----------
async function town(w, h) {
  const tag = `${w}x${h}`;
  const ng = (t) => problems.push(`町 ${tag}: ${t}`);
  const { page, errors } = await newPage(w, h);
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
  const d = await save(page);
  d.game.world.story = undefined;
  d.game.heroes[0].gold = 270;
  d.game.heroes[1].gold = 900;
  // 2人目は P2 の担当（1台で P2 以降でも止まらないこと）。持ち物に装備を2つ
  d.game.heroes[1].playerId = 'P2';
  d.game.heroes[1].stash = [
    { uid: 'r2w', itemId: 'flameSword' },
    { uid: 'r2a', itemId: 'knightArmor' },
  ];
  await load(page, d);
  const handoff = page.getByText('スマホを渡して、タップで始める');
  if (await handoff.count()) await handoff.click();
  const invite = page.getByText('誘う', { exact: true });
  if (await invite.count()) await invite.first().click();
  await page.waitForTimeout(150);
  await page.getByText('王都クリスタリアに入る', { exact: true }).click();
  await page.waitForTimeout(300);
  if ((await save(page)).game.mode !== 'town') return ng('町に入れない');
  await page.locator('[data-facility-members] button').nth(1).click();
  await page.waitForTimeout(150);
  if (!(await page.locator('[data-status-button]').count())) ng('町に「ステータス」のボタンが無い');

  // 2) 売却
  await page.locator('[data-town-tabs] button', { hasText: '売却' }).click();
  await page.waitForTimeout(150);
  if (await page.locator('[data-town-body] button', { hasText: 'で売る' }).count()) ng('押す前から「〇で売る」のボタンが出ている');
  await page.screenshot({ path: `${dir}/2-sell-list-${tag}.png` });
  await page.locator('[data-sell-item="r2w"]').click();
  await page.waitForTimeout(400);
  const sp = page.locator('[data-item-pick-panel]');
  if (!(await sp.count())) ng('装備を押しても説明が開かない');
  else {
    const txt = await sp.innerText();
    if (!(await sp.locator('[data-item-compare]').count())) ng('今の装備との違いが出ない');
    if (!txt.includes('比べて')) ng(`違いの文が無い: ${txt.slice(0, 60)}`);
    if (!(await inView(page, '[data-item-pick-action]'))) ng('「〇Gで売る」が画面の外');
    console.log(`売却 ${tag}: ${txt.replace(/\s+/g, ' ').slice(0, 140)}`);
  }
  const issues = await layoutIssues(page);
  if (issues.length) ng(`売却: ${issues.join(' / ')}`);
  await page.screenshot({ path: `${dir}/2-sell-detail-${tag}.png` });
  const goldBefore = (await save(page)).game.heroes[1].gold;
  await page.locator('[data-item-pick-action]').click();
  await page.waitForTimeout(300);
  const afterSell = (await save(page)).game.heroes[1];
  if (afterSell.stash.some((s) => s.uid === 'r2w') || afterSell.gold <= goldBefore) ng('売れていない（P2 のキャラ）');

  // 3) カード削除
  await page.locator('[data-town-tabs] button', { hasText: 'カード削除' }).click();
  await page.waitForTimeout(150);
  const deckBefore = (await save(page)).game.heroes[1].deck.length;
  await page.locator('[data-town-body] button[data-pick-card]').first().click();
  await page.waitForTimeout(400);
  if (!(await page.locator('[data-card-pick-panel]').count())) ng('カードを押しても説明が開かない');
  if (!(await inView(page, '[data-card-pick-action]'))) ng('「このカードを取り除く」が画面の外');
  await page.screenshot({ path: `${dir}/3-remove-detail-${tag}.png` });
  await page.locator('[data-card-pick-action]').click();
  await page.waitForTimeout(250);
  const dlg = page.getByRole('dialog');
  if (!(await dlg.locator('[data-confirm-detail]').count())) ng('確かめの窓に効果の1行が無い');
  await page.screenshot({ path: `${dir}/3-remove-confirm-${tag}.png` });
  await dlg.getByText('取り除く', { exact: true }).click();
  await page.waitForTimeout(300);
  if ((await save(page)).game.heroes[1].deck.length !== deckBefore - 1) ng('カードが取り除かれていない');

  // 4) 町の中のステータス: 開く → 防具を替える → 閉じて同じタブ
  await page.locator('[data-status-button]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/4-status-open-${tag}.png` });
  await page.getByLabel('防具を付け替える').click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: '装備', exact: true }).first().click();
  await page.waitForTimeout(300);
  const eq = (await save(page)).game.heroes[1].equipment.armor?.itemId;
  if (eq !== 'knightArmor') ng(`町の中で装備を替えられない（P2 のキャラ: ${eq}）`);
  await page.screenshot({ path: `${dir}/4-status-equipped-${tag}.png` });
  await page.getByLabel('閉じる', { exact: true }).click();
  await page.waitForTimeout(300);
  const active = await page.locator('[data-town-tabs] button.btn-gold').innerText();
  if (!active.includes('カード削除')) ng(`閉じた後のタブが変わった（${active}）`);
  if ((await save(page)).game.mode !== 'town') ng('ステータスを閉じたら町から出た');
  await page.screenshot({ path: `${dir}/4-status-closed-${tag}.png` });
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
}

// ---------- 5) 大技の予告の BREAK の印 ----------
async function breakHint(w, h, count) {
  const tag = `${w}x${h}-${count}`;
  const ng = (t) => problems.push(`BREAKの印 ${tag}: ${t}`);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  await startBattle(page, 2, Array(count).fill('treeWarden'), true);
  await page.getByText('ターン終了').waitFor();
  const setup = async (broken) => {
    const d = await save(page);
    const b = d.game.expeditions[0].battle;
    for (const e of b.enemies) {
      e.hp = e.maxHp = 400;
      e.intent = { actionId: 'rootBind', targetId: b.allies[0].id };
      if (broken) e.broken = true;
      else delete e.broken;
    }
    b.phase = 'ally';
    await load(page, d);
    await page.getByText('ターン終了').waitFor();
    await page.waitForTimeout(300);
  };
  await setup(false);
  const hints = page.locator('[data-break-hint]');
  const n = await hints.count();
  if (n !== count) ng(`印の数が ${n}（敵 ${count}体）`);
  const kind = count >= 3 ? 'short' : 'long';
  if (n && (await hints.first().getAttribute('data-break-hint')) !== kind) ng(`印の形が ${kind} でない`);
  const text = n ? await hints.first().innerText() : '';
  if (!text.includes('BREAK')) ng(`印の文: ${text}`);
  // 重なり: 印どうし・印とほかの敵の予告の枠・画面の外・操作パネル（手札の上）。
  // 味方の立ち絵の顔: 予告の枠そのものが、もう同じ味方に重なっている低い画面（前からの並び）は数えない
  const overlap = await page.evaluate(() => {
    const out = [];
    const units = [...document.querySelectorAll('[data-enemy]')];
    // 端が3px以内で触れるだけは数えない（敵が4体の時は、予告の枠どうしが前から少し重なっている）
    const hit = (a, b) => a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3;
    const allies = [...document.querySelectorAll('[data-ally-sprite]')].map((e) => e.getBoundingClientRect());
    // 立ち絵の顔: 絵の箱の上の3割・まん中の半分（箱の左右は透明）
    const face = (a) => ({ left: a.left + a.width * 0.25, right: a.right - a.width * 0.25, top: a.top, bottom: a.top + a.height * 0.3 });
    const panel = document.querySelector('.glass-panel')?.getBoundingClientRect();
    const hints = units.map((u) => u.querySelector('[data-break-hint]')?.getBoundingClientRect());
    units.forEach((u, i) => {
      const r = hints[i];
      if (!r) return;
      const bubble = u.querySelector('[data-intent]')?.getBoundingClientRect();
      if (r.left < 0 || r.right > innerWidth) out.push(`印${i}が画面の外`);
      hints.forEach((q, j) => j > i && q && hit(r, q) && out.push(`印${i}と印${j}が重なる`));
      units.forEach((v, j) => {
        const b = j !== i && v.querySelector('[data-intent]')?.getBoundingClientRect();
        if (b && hit(r, b)) out.push(`印${i}が敵${j}の予告に重なる`);
      });
      if (panel && r.bottom > panel.top + 1) out.push(`印${i}が操作パネルに重なる`);
      // 低い画面（360×640）は、味方の絵の箱の上の端が敵の予告の高さまで来ている（前からの並び）。8px を超えて顔に重なる時だけ数える
      allies.forEach((a, j) => {
        const f = face(a);
        const depth = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
        // 高さ700px未満の画面は、味方の立ち絵が最小の大きさで敵の予告の高さまで来る（前からの並び）ので、メモとして数だけ出す
        if (hit(r, f) && depth > 8 && !(bubble && hit(bubble, f)) && innerHeight >= 700) out.push(`印${i}が味方${j}の顔に ${depth.toFixed(0)}px 重なる`);
        else if (hit(r, f)) window.r2notes = [...(window.r2notes ?? []), `印${i}と味方${j}の絵の箱の上の端が ${depth.toFixed(0)}px 触れる`];
      });
    });
    return out;
  });
  if (overlap.length) ng(overlap.join(' / '));
  const spill = await page.locator('[data-break-hint]').evaluateAll((es) => es.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
  if (spill) ng(`印の文が枠からはみ出す（${spill}個）`);
  const notes = await page.evaluate(() => window.r2notes ?? []);
  if (notes.length) console.log(`  （メモ ${tag}: ${notes.join(' / ')}）`);
  const issues = await layoutIssues(page);
  if (issues.length) ng(issues.join(' / '));
  console.log(`BREAKの印 ${tag}: 「${text}」×${n}`);
  await page.screenshot({ path: `${dir}/5-break-hint-${tag}.png` });
  await setup(true);
  if (await page.locator('[data-break-hint]').count()) ng('BREAK した後も印が出る');
  await page.close();
}

// ---------- 6) 倒れた演出のコマ ----------
async function deathFrames(label, { boss = false, simple = false }) {
  const [w, h] = [390, 844];
  const ng = (t) => problems.push(`倒れた演出 ${label}: ${t}`);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  // 敵は2体（1体を倒しても戦闘が続き、勝った時の暗転がコマに入らないように）
  await startBattle(page, 1, ['treeWarden', 'treeWarden'], false);
  await page.getByText('ターン終了').waitFor();
  const d = await save(page);
  const b = d.game.expeditions[0].battle;
  b.enemies[0].hp = 1;
  b.enemies[0].block = 0;
  b.enemies[1].hp = b.enemies[1].maxHp = 500;
  if (boss) b.boss = true;
  b.allies[0].mana = 9;
  b.allies[0].focus = 6;
  b.allies[0].focusMax = Math.max(b.allies[0].focusMax, 6);
  b.allies[0].hand = [{ uid: 'k1', cardId: 'heavySwing' }];
  await page.evaluate((s) => {
    const cur = JSON.parse(localStorage.getItem('card-rpg/settings'));
    localStorage.setItem('card-rpg/settings', JSON.stringify({ ...cur, fastMode: false, ...(s ? { cutinMode: 'simple' } : {}) }));
  }, simple);
  await load(page, d);
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);
  // 命中の演出と倒れた演出が出た時刻を記録し、倒れた演出の写しを取っておく（コマを 0.05秒おきに撮るため）
  await page.evaluate(() => {
    window.r2 = { impact: 0, death: 0 };
    new MutationObserver((ms) => {
      for (const m of ms)
        for (const n of m.addedNodes) {
          if (!(n instanceof Element)) continue;
          const imp = n.matches('[data-impact]') ? n : n.querySelector('[data-impact]');
          if (imp && !window.r2.impact) window.r2.impact = performance.now();
          const dth = n.matches('[data-death]') ? n : n.querySelector('[data-death]');
          if (dth && !window.r2.death) {
            window.r2.death = performance.now();
            window.r2.boss = dth.hasAttribute('data-death-boss');
            window.r2.calm = dth.hasAttribute('data-death-calm');
            window.r2.shards = dth.querySelectorAll('.death-shard').length;
            const wrap = document.createElement('div');
            wrap.className = 'pointer-events-none absolute inset-0';
            wrap.style.zIndex = '34';
            wrap.dataset.r2Copy = '';
            wrap.appendChild(dth.cloneNode(true));
            document.querySelector('[data-impact-field]').parentElement.appendChild(wrap);
          }
        }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.locator('[data-card-index][data-usable]').first().click({ position: { x: 14, y: 70 } });
  await page.waitForTimeout(150);
  if (await page.getByText('敵をタップ').count()) {
    const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
    await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
    await page.waitForTimeout(120);
  }
  for (let i = 0; i < 6; i++) {
    const plus = page.getByLabel('フォーカスを増やす');
    if (!(await plus.count()) || (await plus.isDisabled())) break;
    await plus.click();
  }
  await page.locator('button:has-text("発動")').click();
  await page.waitForFunction(() => window.r2.death > 0, null, { timeout: 8000 }).catch(() => ng('倒れた演出が出ない'));
  const r = await page.evaluate(() => window.r2);
  if (!r.death) return page.close();
  // 命中と倒れた演出は、同じ描き直しか隣のコマで画面に入る。測る時の揺れ（MutationObserver の知らせの順・数 ms）は通す:
  // 1コマ（17ms）までの遅れは「同時」とみなす。倒れた演出は始めるまでに短い間（--lead・0.08秒）があるので、見た目は命中が先のまま。
  // 17ms を超えて命中が遅れたら、本当に順番が逆なので NG（前は +1ms で NG にしていて、-7ms の揺れで落ちることがあった）
  const JITTER_MS = 17;
  if (!r.impact) ng('命中の演出が出ない');
  else if (r.impact > r.death + JITTER_MS) ng(`倒れた演出が、命中の演出より先に出た（${(r.impact - r.death).toFixed(0)}ms）`);
  if (boss !== r.boss) ng(`ボスの形が ${r.boss}`);
  if (simple !== r.calm) ng(`簡易の形が ${r.calm}`);
  if (simple && r.shards) ng('簡易なのに破片が出た');
  if (!simple && !r.shards) ng('破片が出ない');
  const gone = await page.locator('[data-enemy-gone]').getAttribute('data-enemy-gone').catch(() => null);
  if (gone !== 'burst') ng(`元の絵が隠れていない（${gone}）`);
  // 本物の演出が終わってから、写しのアニメーションを止めて 0.05秒ずつ進めて撮る
  await page.waitForTimeout(900);
  const durMs = await page.evaluate(() => {
    const el = document.querySelector('[data-r2-copy] .death-burst');
    const cs = getComputedStyle(el);
    // 始めるまでの短い間（とどめの命中が先に見える）＋ 演出の長さ
    return (parseFloat(cs.getPropertyValue('--lead')) + parseFloat(cs.getPropertyValue('--d'))) * 1000;
  });
  const box = await page.locator('[data-r2-copy] .death-burst').boundingBox();
  const clip = { x: Math.max(0, box.x - 60), y: Math.max(0, box.y - 50), width: Math.min(w - Math.max(0, box.x - 60), box.width + 120), height: box.height + 100 };
  let count = 0;
  for (let t = 0; t <= durMs + 1; t += 50) {
    await page.evaluate((t) => {
      for (const a of document.querySelector('[data-r2-copy]').getAnimations({ subtree: true })) {
        a.pause();
        a.currentTime = t;
      }
    }, t);
    await page.screenshot({ path: `${dir}/6-death-${label}-${String(t).padStart(3, '0')}ms.png`, clip });
    count++;
  }
  frameCounts[label] = `${count}コマ（演出 ${durMs.toFixed(0)}ms・命中→倒れる ${r.impact ? (r.death - r.impact).toFixed(0) : '?'}ms）`;
  await page.close();
}

for (const [w, h] of SIZES) {
  await jobPick(w, h);
  await town(w, h);
  await breakHint(w, h, 1);
  await breakHint(w, h, 4);
}
await breakHint(390, 844, 2);
await breakHint(360, 640, 3);
await deathFrames('normal', {});
await deathFrames('boss', { boss: true });
await deathFrames('simple', { simple: true });

await browser.close();
console.log('倒れた演出のコマ:', JSON.stringify(frameCounts, null, 1));
if (problems.length) {
  console.error('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: 回2 の画面の確認（画像は ${dir}/）`);
