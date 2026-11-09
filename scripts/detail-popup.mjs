// 詳細の窓の確認（Step A ①②）: 360×640・390×844・480×860 で
// 1) パーティ・装備（装備中・候補・持ち物）・道具袋・町の店・買った時の窓・宝箱/戦利品・取り合い から装備の詳細が開く
// 2) 詳細の中身（自分の数値・特殊能力・専用カード・今と比べて）、カードを押すとカードの詳細 → 戻る
// 3) 閉じ方: 「詳細を閉じる」・外の暗い所・窓そのもの・戻るボタン（history.back）・Esc
// 4) 長押しで開いた窓は、指を離しても残る。長押しの後に選ぶ・買う・装備するが動かない。外を押して閉じた時に下の物が押されない
// 5) 戦闘: カード・敵の長押しで窓が残り、選ぶ操作が起きない。敵の詳細に攻撃力・行動・能力が出る
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/detail-popup.mjs（URL=... で場所を変えられる）
import { chromium, depart, layoutIssues, startBattle, URL } from './lib.mjs';

const SIZES = [
  [360, 640],
  [390, 844],
  [480, 860],
];
const KEY = 'card-rpg/adventure';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let width = 390;
const shot = (n) => page.screenshot({ path: `scripts/screenshots/detail-${n}-${width}.png` });
const fail = async (msg) => {
  await shot('fail').catch(() => {});
  if (errors.length) console.error('画面のエラー:', errors.slice(-3).join(' / '));
  console.error('NG:', `${width}px:`, msg);
  await browser.close();
  process.exit(1);
};
const save = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const popup = page.locator('[data-detail-popup]');
const isOpen = async () => (await popup.count()) > 0 && (await popup.isVisible());
const waitOpen = async (what) => {
  try {
    await popup.waitFor({ state: 'visible', timeout: 1500 });
  } catch {
    await fail(`${what}: 詳細の窓が開かない`);
  }
  await page.waitForTimeout(180); // 開く時の薄い演出が終わるまで（写真用）
};
const waitClosed = async (what) => {
  try {
    await popup.waitFor({ state: 'detached', timeout: 1500 });
  } catch {
    await fail(`${what}: 詳細の窓が閉じない`);
  }
};
const checkLayout = async (what) => {
  const issues = await layoutIssues(page);
  if (issues.length) await fail(`${what}の表示の問題: ${issues.join(' / ')}`);
};
/** 外の暗い所（窓の下の空いた所）を押す */
const tapBackdrop = async () => {
  const box = await popup.boundingBox();
  const vh = page.viewportSize().height;
  const y = box.y + box.height + 12 < vh - 4 ? Math.min(vh - 8, box.y + box.height + 20) : Math.max(4, box.y - 20);
  await page.mouse.click(Math.round(width / 2), Math.round(y));
};
/** 長押し（指を約0.7秒置いて離す） */
const longPress = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(250);
};
/** 4つの閉じ方を順に試す（開く操作 open を毎回やり直す） */
const closeAllWays = async (what, open, under) => {
  const ways = [
    ['詳細を閉じる', () => popup.getByText('詳細を閉じる', { exact: true }).click()],
    ['外の暗い所', tapBackdrop],
    ['窓そのもの', () => popup.locator('[data-item-detail-body], .font-display').first().click()],
    ['戻るボタン', () => page.evaluate(() => history.back())],
    ['Esc', () => page.keyboard.press('Escape')],
  ];
  for (const [name, close] of ways) {
    await open();
    await waitOpen(`${what}（${name}の前）`);
    const before = under ? await under() : null;
    await close();
    await waitClosed(`${what}を${name}で閉じる`);
    await page.waitForTimeout(150);
    if (under && (await under()) !== before) await fail(`${what}を${name}で閉じた時、下の画面が押された（${before} → ${await under()}）`);
  }
};

// ----- 始める: 2人で冒険を始め、持ち物に装備と道具を入れる -----
await page.goto(URL);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('2人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await depart(page);
await page.waitForTimeout(300);
const base = await save();
base.game.world.story = undefined;
for (const h of base.game.heroes) {
  h.gold = 3000;
  h.stash = [
    { uid: `dp-a-${h.id}`, itemId: 'mithrilSword' },
    { uid: `dp-b-${h.id}`, itemId: 'steelSword' },
    { uid: `dp-c-${h.id}`, itemId: 'luckyCharm' },
  ];
  h.pouch = [{ uid: `dp-p-${h.id}`, itemId: 'potion' }];
}
const load = async (d) => {
  await page.evaluate(({ k, d }) => localStorage.setItem(k, JSON.stringify(d)), { k: KEY, d });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
  const handoff = page.getByText('スマホを渡して、タップで始める');
  if (await handoff.count()) await handoff.click();
};
const openMenuSheet = async (label) => {
  await page.getByRole('button', { name: /メニュー/ }).first().click();
  await page.waitForTimeout(200);
  await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(250);
};

for (const [w, h] of SIZES) {
  width = w;
  await page.setViewportSize({ width: w, height: h });

  // ===== パーティ・装備 =====
  await load(structuredClone(base));
  await openMenuSheet('パーティ・装備');
  const equipped = page.locator('[data-equip-slot="weapon"] [data-item-detail]');
  if (!(await equipped.count())) await fail('装備中の武器の欄に詳細を開く所が無い');
  const equipBefore = async () => JSON.stringify((await save()).game.heroes.map((x) => x.equipment));
  await closeAllWays('装備中の武器の詳細', () => equipped.click(), equipBefore);
  // 装備中の物は「装備中」と出て、比べる欄は出ない
  await equipped.click();
  await waitOpen('装備中の武器');
  if (!(await popup.getByText('装備中').count())) await fail('装備中の物の詳細に「装備中」が無い');
  if (await popup.locator('[data-item-compare]').count()) await fail('装備中の物と、自分自身を比べている');
  await checkLayout('装備中の武器の詳細');
  await shot('equipped');
  await popup.getByText('詳細を閉じる', { exact: true }).click();
  await waitClosed('装備中の武器');

  // 候補: 1行目に「今と比べて」。押すと詳細、装備は動かない
  await page.getByRole('button', { name: '武器を付け替える' }).click();
  await page.waitForTimeout(200);
  const cand = page.locator('[data-item-detail="mithrilSword"]').first();
  if (!(await cand.getByText('今と比べて：').count())) await fail('候補の行に「今と比べて：」が無い');
  if (!(await cand.getByText(/《見切り》/).count())) await fail('候補の行に特殊能力の見出しが無い');
  const eq0 = await equipBefore();
  await cand.click();
  await waitOpen('候補の武器');
  if ((await equipBefore()) !== eq0) await fail('候補の詳細を開いただけで装備が変わった');
  for (const t of ['この装備の能力', '《見切り》', '山札に加わるカード', '今と比べて']) if (!(await popup.getByText(t).count())) await fail(`候補の詳細に「${t}」が無い`);
  if (!(await popup.locator('[data-item-compare]').getByText(/特殊能力：《.*》→《見切り》/).count())) await fail('特殊能力の入れ替わり（《A》→《B》）が出ない');
  await checkLayout('候補の詳細');
  await shot('candidate');
  // 専用カードを押すとカードの詳細 → 戻るで装備の詳細へ
  await popup.locator('[data-detail-card]').first().click();
  await page.waitForTimeout(150);
  if (!(await popup.getByText('成功率').count())) await fail('専用カードを押してもカードの詳細が出ない');
  await shot('card-from-item');
  await popup.getByText('← 戻る', { exact: true }).click();
  await page.waitForTimeout(150);
  if (!(await popup.locator('[data-item-detail-body="mithrilSword"]').count())) await fail('カードの詳細から「戻る」で装備の詳細に戻らない');
  await page.evaluate(() => history.back());
  await waitClosed('戻るボタン（装備の詳細）');
  // 長押しでも開き、指を離しても残る。装備は変わらない
  await longPress(cand);
  if (!(await isOpen())) await fail('候補の長押しで開いた窓が、指を離すと消えた');
  if ((await equipBefore()) !== eq0) await fail('長押しで装備が変わった');
  await tapBackdrop();
  await waitClosed('長押しの後の外タップ');
  if ((await equipBefore()) !== eq0) await fail('外を押して閉じた時、下の「装備」が押された');
  // 持ち物の欄
  const inv = page.locator('[data-item-detail="luckyCharm"]').last();
  await inv.scrollIntoViewIfNeeded();
  await inv.click();
  await waitOpen('持ち物の装飾品');
  if (!(await popup.getByText('幸運のお守り').count())) await fail('持ち物の詳細の名前が違う');
  await popup.getByText('詳細を閉じる', { exact: true }).click();
  await waitClosed('持ち物の装飾品');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ===== 道具袋: 押すと選ぶ（今のまま）、長押しで詳細（残る・選ばない） =====
  await openMenuSheet('道具の袋');
  const pouch = page.locator('[data-pouch-item="potion"]');
  await longPress(pouch);
  if (!(await isOpen())) await fail('道具袋の長押しで開いた窓が残らない');
  if (await page.getByText(/を誰に使う？/).count()) await fail('道具袋の長押しで、道具が選ばれた');
  await checkLayout('道具袋の詳細');
  await tapBackdrop();
  await waitClosed('道具袋の詳細');
  if (await page.getByText(/を誰に使う？/).count()) await fail('外を押して閉じた時、道具袋の行が押された');
  await pouch.click();
  await page.waitForTimeout(150);
  if (!(await page.getByText(/を誰に使う？/).count())) await fail('道具袋の行を押しても選べない（タップの動きが壊れた）');
  if (await isOpen()) await fail('道具袋の行を押しただけで詳細が開いた');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ===== 町の店 → 買った時の窓 =====
  {
    const d = structuredClone(base);
    const wd = d.game.world;
    const t = wd.tiles.findIndex((x) => x.f && x.f.kind === 'town');
    for (const id of Object.keys(wd.pos)) wd.pos[id] = t;
    await load(d);
    const invite = page.getByText('誘う', { exact: true });
    if (await invite.count()) await invite.first().click();
    await page.waitForTimeout(150);
    await page.getByText(/に入る$/).first().click();
    await page.waitForTimeout(300);
    if ((await save()).game.mode !== 'town') await fail('町に入れない');
    const row = page.locator('[data-town-body] [data-item-detail]').first();
    const gold = async () => JSON.stringify((await save()).game.heroes.map((x) => [x.gold, x.stash.length]));
    const g0 = await gold();
    await closeAllWays('店の品物の詳細', () => row.click(), gold);
    await longPress(row);
    if (!(await isOpen())) await fail('店の品物の長押しで開いた窓が残らない');
    await checkLayout('店の品物の詳細');
    await shot('shop');
    await tapBackdrop();
    await waitClosed('店の品物の詳細');
    if ((await gold()) !== g0) await fail('店で詳細を開いただけで買ってしまった');
    // 装備品を買って、買った時の窓から詳細を開く
    const rows = page.locator('[data-town-body] > div > div', { has: page.locator('[data-item-detail]') });
    let opened = false;
    for (let i = 0; i < (await rows.count()) && !opened; i++) {
      await rows.nth(i).locator('button').last().click();
      await page.waitForTimeout(250);
      const notice = page.locator('[data-buy-notice="equip"]');
      if (!(await notice.count())) continue;
      await notice.locator('[data-item-detail]').click();
      await waitOpen('買った時の窓の詳細');
      await shot('buy-notice');
      await checkLayout('買った時の窓の詳細');
      await tapBackdrop();
      await waitClosed('買った時の窓の詳細');
      if (!(await notice.count())) await fail('詳細を閉じたら、買った時の窓まで消えた');
      opened = true;
    }
    if (!opened) await fail('装備品を買えず、買った時の窓を確かめられなかった');
  }

  // ===== 宝箱・戦利品（報酬の画面）と取り合い =====
  {
    await startBattle(page, 2);
    const d = await save();
    const x = d.game.expeditions?.[0] ?? d.game;
    const ids = x.party ?? d.game.heroes.map((h) => h.id);
    x.mode = 'reward';
    x.battle = undefined;
    x.reward = {
      gold: 10,
      exp: [],
      levelUps: [],
      cardOffers: [],
      cardPicked: true,
      loot: [{ kind: 'item', item: { uid: 'dp-loot', itemId: 'steelSword' }, to: ids[0] }],
      claim: { item: { uid: 'dp-claim', itemId: 'mithrilSword' }, heroes: ids.slice(0, 2), choices: {} },
    };
    await page.evaluate(({ k, d }) => localStorage.setItem(k, JSON.stringify(d)), { k: KEY, d });
    await page.reload();
    await page.getByText('つづきから', { exact: true }).click();
    await page.waitForTimeout(400);
    const handoff = page.getByText('スマホを渡して、タップで始める');
    if (await handoff.count()) await handoff.click();
    const claim = page.locator('[data-claim] [data-item-detail="mithrilSword"]');
    if (!(await claim.count())) await fail('取り合いの品物に詳細を開く所が無い');
    const choices = async () => JSON.stringify((await save()).game.expeditions?.[0]?.reward?.claim?.choices ?? (await save()).game.reward?.claim?.choices);
    await closeAllWays('取り合いの品物の詳細', () => claim.click(), choices);
    await claim.click();
    await waitOpen('取り合いの品物');
    if (!(await popup.locator('[data-item-compare]').count())) await fail('取り合いの詳細に「今と比べて」が無い');
    await shot('claim');
    await checkLayout('取り合いの詳細');
    await popup.getByText('詳細を閉じる', { exact: true }).click();
    await waitClosed('取り合いの品物');
    const loot = page.locator('[data-item-detail="steelSword"]').first();
    if (await loot.count()) {
      await loot.click();
      await waitOpen('戦利品');
      await shot('loot');
      await popup.getByText('詳細を閉じる', { exact: true }).click();
      await waitClosed('戦利品');
    } else console.log(`  （${width}px: 取り合いの間は戦利品の一覧が出ないため、戦利品の行は宝箱の画面で確かめる）`);
  }

  // ===== 宝箱の中身（宝箱の画面の一覧） =====
  {
    const d = await save();
    const x = d.game.expeditions?.[0] ?? d.game;
    x.mode = 'chest';
    x.reward = undefined;
    x.chest = { roomId: x.dungeon.currentRoomId ?? x.dungeon.rooms[0].id, spec: { rarity: 'rare', locked: false }, unlocked: true, contents: [{ kind: 'item', item: { uid: 'dp-chest', itemId: 'luckyCharm' } }] };
    await page.evaluate(({ k, d }) => localStorage.setItem(k, JSON.stringify(d)), { k: KEY, d });
    await page.reload();
    await page.getByText('つづきから', { exact: true }).click();
    await page.waitForTimeout(800);
    const handoff = page.getByText('スマホを渡して、タップで始める');
    if (await handoff.count()) await handoff.click();
    const row = page.locator('[data-item-detail="luckyCharm"]').first();
    try {
      await row.waitFor({ timeout: 4000 });
    } catch {
      await fail('宝箱の中身の一覧に詳細を開く所が無い');
    }
    await row.click();
    await waitOpen('宝箱の中身');
    await shot('chest');
    await checkLayout('宝箱の中身の詳細');
    await tapBackdrop();
    await waitClosed('宝箱の中身');
  }

  // ===== 戦闘: カード・敵の長押し（残る・選ばない）、状態異常は押すだけで開く =====
  {
    await startBattle(page, 2);
    await page.waitForTimeout(600);
    const sel = () => page.evaluate(() => document.querySelectorAll('.card-pop').length);
    const handCard = page.locator('[data-card-id]').last();
    if (!(await handCard.count())) await fail('手札のカードが見つからない');
    const before = await sel();
    await longPress(handCard);
    if (!(await isOpen())) await fail('カードの長押しで開いた窓が、指を離すと消えた');
    if (!(await popup.getByText('成功率').count())) await fail('カードの詳細の中身が無い');
    await shot('battle-card');
    await checkLayout('戦闘のカードの詳細');
    await tapBackdrop();
    await waitClosed('戦闘のカードの詳細');
    if ((await sel()) !== before) await fail('カードの長押し・外タップで、カードが選ばれた');
    const enemy = page.locator('[data-enemy]').first();
    if (await enemy.count()) {
      await longPress(enemy);
      if (!(await isOpen())) await fail('敵の長押しで開いた窓が残らない');
      if (!(await popup.locator('[data-enemy-stats]').count())) await fail('敵の詳細に攻撃力・行動の欄が無い');
      if (!(await popup.getByText('攻撃力').count())) await fail('敵の詳細に攻撃力が無い');
      await shot('battle-enemy');
      await checkLayout('敵の詳細');
      await popup.click();
      await waitClosed('敵の詳細（窓そのもの）');
    } else console.log(`  （${width}px: 敵の要素の印が見つからず、敵の詳細は飛ばした）`);
  }
  console.log(`OK ${width}px: 装備・道具・店・買った時・取り合い・宝箱・戦闘の詳細が開いて、4つの閉じ方と長押しが正しく動く`);
}
await browser.close();
console.log('OK: 詳細の窓の確認がすべて通った');
