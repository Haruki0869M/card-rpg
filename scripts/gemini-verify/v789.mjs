// 観点7（ヘルプ）・8（情報の見えやすさ）・9（学びやすさ）。それぞれ別の動画
import { start } from './rec.mjs';
const which = process.env.WHICH ?? '7';
const r = await start(which === '7' ? 'v7-help' : which === '8' ? 'v8-info' : 'v9-learn');
const { page, beat, shot, text, note, tap, tryTap, newGame, edit, btns } = r;
const dialogs = () => page.evaluate(() => [...document.querySelectorAll('[role=dialog],[role=tooltip],[data-detail],[data-tile-info]')].filter((e) => e.offsetParent).map((e) => e.textContent.trim().slice(0, 160)));
/** 押して何が出たか（窓・お知らせ）を記録 */
const probe = async (label, loc, { long = false } = {}) => {
  const before = await text();
  try {
    if (long) { const b = await loc.first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(900); await shot(`${label}`); const d = await dialogs(); await page.mouse.up(); await beat(); note(`長押し【${label}】→ ${d.length ? d.join(' | ') : '窓なし'}`); return; }
    await loc.first().click({ timeout: 3000 });
  } catch (e) { note(`押せない【${label}】`); return; }
  await beat(700);
  await shot(`${label}`);
  const d = await dialogs();
  const after = await text();
  const diff = after.replace(before, '').slice(0, 200);
  note(`タップ【${label}】→ ${d.length ? d.join(' | ') : after === before ? '何も起きない' : '変化: ' + diff}`);
};
const close = async () => { for (const l of ['閉じる']) if (await tryTap(page.getByLabel(l), 400)) return; await page.keyboard.press('Escape'); await beat(300); };

if (which === '7') {
  // タイトル → 準備 → 世界マップ → メニュー → 戦闘。「遊び方・ヘルプ・用語」の入口を探す
  await page.goto((await import('./rec.mjs')).URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false })); });
  await page.reload(); await beat(900);
  await shot('01-title');
  note(`タイトルのボタン: ${await btns()}`);
  await tap(page.getByText('設定'), 900); await shot('02-settings'); note(`設定: ${(await text()).slice(0, 400)}`); await close();
  await newGame({ n: 2, seats: 'solo' });
  await shot('03-story');
  await tryTap(page.getByText('つづける'));
  await shot('04-world');
  await probe('05-corruption', page.getByRole('button', { name: /侵食度/ }));
  await close();
  await probe('06-lives', page.getByLabel('命の灯火'));
  await close();
  await probe('07-hero-chip', page.getByRole('button', { name: /レオン HP/ }));
  await close();
  await tap(page.getByLabel('メニュー'), 800);
  await shot('08-menu');
  await page.mouse.wheel(0, 800); await beat(600);
  await shot('09-menu-bottom');
  note(`メニューのボタン: ${await btns()}`);
  await close();
  // 戦闘
  await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; });
  await tap(page.getByText('翠の神殿に入る'), 1200);
  await shot('10-dungeon');
  await probe('11-explore-help', page.getByText('探索力', { exact: false }).first());
  await tryTap(page.locator('[data-explore-roll-button]'), 1300);
  await tap(page.getByRole('button', { name: /扉を開ける/ }), 2600);
  await shot('12-battle');
  await tap(page.getByLabel('メニュー'), 800);
  await shot('13-battle-menu');
  note(`戦闘のメニュー: ${await btns()}`);
  await close();
}

if (which === '8') {
  // いろいろな物をタップ・長押しして「それが何で、何をするか」が出るか
  await newGame({ n: 2, seats: 'solo' });
  await tryTap(page.getByText('つづける'));
  await edit((g) => { g.heroes[0].pet = { petId: 'cockatiel', color: 'normal', name: 'ぽぽ', love: 40, acts: 0 }; });
  // 世界マップ: 地形のマス・町のマス・お供・ジョブ
  const hex = page.locator('[data-hex]');
  const n = await hex.count();
  await probe('01-tile', hex.nth(Math.floor(n / 2) + 1));
  await probe('02-town-tile', page.locator('[data-feature]').first());
  await probe('03-pet-on-map', page.locator('[data-hero] img, [data-hero]').last());
  await probe('04-time', page.getByText(/日目/).first());
  await probe('05-focus-star', page.getByText(/★?\d\/6/).first());
  await tap(page.getByLabel('メニュー'), 600);
  await tap(page.getByText('転職'), 900);
  await shot('06-jobs');
  await probe('07-job-row', page.locator('button').filter({ hasText: /剣豪|騎士|中位/ }).first());
  await close(); await close();
  // 戦闘: 敵・予告・状態・カード・お供
  await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; });
  await tap(page.getByText('翠の神殿に入る'), 1200);
  await probe('08-dungeon-omen', page.locator('[data-omen], [data-room-omen]').first());
  await tryTap(page.locator('[data-explore-roll-button]'), 1300);
  await tap(page.getByRole('button', { name: /扉を開ける/ }), 2600);
  await probe('09-enemy-tap', page.locator('[data-enemy]').first());
  await close();
  await probe('10-enemy-long', page.locator('[data-enemy]').first(), { long: true });
  await probe('11-intent', page.locator('[data-intent]').first());
  await close();
  await probe('12-card-long', page.locator('[data-card-index]').first(), { long: true });
  await probe('13-pet-battle', page.getByLabel(/の詳細$/).first());
  await close();
  await probe('14-ally', page.locator('[data-ally]').first(), { long: true });
  await probe('15-mana', page.getByText(/^\d$/).first());
  // ターンを終えて状態異常（毒など）が付いたらタップ
  await tap(page.getByRole('button', { name: 'ターン終了' }), 300);
  await tryTap(page.getByRole('button', { name: 'ターンを終了する' }), 300);
  await page.waitForTimeout(6500);
  await probe('16-status', page.locator('[data-status], [aria-label*="状態"]').first());
  await close();
  await probe('17-pouch-item', page.getByLabel('道具袋'));
  await probe('18-pouch-item-row', page.locator('button').filter({ hasText: /ポーション|薬/ }).first(), { long: true });
}

if (which === '9') {
  // 初めての人の最初の数分（説明書を読まずに分かるか）。人の速さで
  await page.goto((await import('./rec.mjs')).URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false })); });
  await page.reload(); await beat(1200);
  await shot('01-title');
  await tap(page.getByText('新しい冒険'), 1200);
  await shot('02-setup'); note(`準備: ${(await text()).slice(0, 500)}`);
  await tap(page.getByText('1人', { exact: true }), 900);
  await tap(page.getByText('キャラクター作成へ'), 1200);
  await shot('03-create'); note(`作成: ${(await text()).slice(0, 600)}`);
  await page.mouse.wheel(0, 700); await beat(900); await shot('04-create-down');
  await tap(page.getByText('冒険に出発'), 1500);
  await shot('05-story'); note(`物語: ${(await text()).slice(0, 500)}`);
  await tryTap(page.getByText('つづける'), 1200);
  await shot('06-world'); note(`最初の世界マップ: ${(await text()).slice(0, 600)}`);
  await tap(page.locator('[data-roll-move]'), 1600);
  await shot('07-rolled'); note(`判定の後: ${(await text()).slice(0, 500)}`);
  const t = page.locator('[data-reach]').filter({ hasText: /^[1-9]$/ }).first();
  const b = await t.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await beat(900);
  await shot('08-picked');
  await tap(page.locator('button:has-text("移動する")'), 2500);
  await shot('09-moved');
  // 最初の戦闘（翠の神殿へ書き換え）
  await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; w.turn = g.heroes[0].id; g.mode = 'world'; delete g.event; });
  await tap(page.getByText('翠の神殿に入る'), 1500);
  await shot('10-dungeon'); note(`ダンジョン: ${(await text()).slice(0, 500)}`);
  await tryTap(page.locator('[data-explore-roll-button]'), 1500);
  await shot('11-explored');
  await tap(page.getByRole('button', { name: /扉を開ける/ }), 2800);
  await shot('12-battle'); note(`最初の戦闘: ${(await text()).slice(0, 600)}`);
  await tap(page.locator('[data-card-index]').first(), 1000);
  await shot('13-card'); note(`カードを押した後: ${(await text()).slice(0, 600)}`);
}
await r.finish();
