// 観点6: 装備の詳しい説明が見られるか（オーナーの指摘）
// 書き換え: レオンに「精巧の指輪（器用+10）」を装備、持ち物に「相棒の澄心飾り」「熾火の剣」「守りの澄心の衣」、所持金300G、王都へ
import { start } from './rec.mjs';
const r = await start('v6-equip-detail');
const { page, beat, shot, text, note, tap, tryTap, newGame, edit } = r;
await newGame({ n: 2, seats: 'solo' });
await tryTap(page.getByText('つづける'));
await edit((g) => {
  const h = g.heroes[0];
  h.equipment.accessory = { uid: 'gv-ring', itemId: 'steadyHandRing' };
  h.stash.push({ uid: 'gv-charm', itemId: 'petClearOpeningCharm' }, { uid: 'gv-sword', itemId: 'smolderSword' }, { uid: 'gv-mail', itemId: 'clearheartMail' });
  h.gold = 300;
});
await shot('01-world');
await tap(page.getByLabel('メニュー'), 700);
await shot('02-menu');
await tap(page.getByText('パーティ・装備'), 900);
await shot('03-party');
note(`装備の欄: ${(await text()).match(/装備[^]*?山札/)?.[0]?.slice(0, 400)}`);
// 装飾品の欄を押す → 候補の一覧
await tap(page.locator('button').filter({ hasText: /^装飾品/ }), 900);
await page.locator('text=持ち物の装飾品').scrollIntoViewIfNeeded().catch(() => {});
await beat(500);
await shot('04-accessory-candidates');
note(`装飾品の候補: ${(await text()).match(/持ち物の装飾品[^]*?(外す|山札)/)?.[0]?.slice(0, 300)}`);
// 候補の名前を押しても何も開かないか（長押しも）
const cand = page.getByText('相棒の澄心飾り').first();
await cand.click(); await beat(700);
await shot('05-tap-candidate');
await cand.click({ delay: 900 }); await beat(700);
await shot('06-longpress-candidate');
note(`候補を押した後: ${(await page.locator('[role=dialog]').count()) ? '窓が開いた' : '窓は開かない'}`);
// 武器の欄
await tap(page.locator('button').filter({ hasText: /^武器/ }), 900);
await page.locator('text=持ち物の武器').scrollIntoViewIfNeeded().catch(() => {});
await beat(500);
await shot('07-weapon-candidates');
note(`武器の候補: ${(await text()).match(/持ち物の武器[^]*?(外す|山札)/)?.[0]?.slice(0, 300)}`);
// 持ち物の一覧（名前だけ）
await page.getByText('レオンの持ち物').scrollIntoViewIfNeeded(); await beat(600);
await shot('08-stash-list');
await page.getByText('熾火の剣').last().click(); await beat(700);
await shot('09-tap-stash-item');
// 装備中の欄の説明（1行で切れるか）
await page.locator('button').filter({ hasText: /^装飾品/ }).scrollIntoViewIfNeeded(); await beat(500);
const trunc = await page.evaluate(() => [...document.querySelectorAll('.truncate')].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.slice(0, 60)));
note(`1行で切れている説明: ${JSON.stringify(trunc)}`);
await shot('10-equipped-truncated');
await tap(page.getByLabel('閉じる'), 600);
// 町の店（品物の説明が1行で切れるか）
await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'town'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; });
const enter = page.getByRole('button', { name: /に入る$/ });
await tryTap(enter, 1500);
await shot('11-town-shop');
const trunc2 = await page.evaluate(() => [...document.querySelectorAll('.truncate')].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.slice(0, 70)));
note(`店で1行で切れている説明: ${JSON.stringify(trunc2)}`);
const firstItem = page.locator('main button, [data-shop-item]').first();
await r.finish();
