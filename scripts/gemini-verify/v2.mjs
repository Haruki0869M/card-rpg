// 観点2: 1人・少人数の時の生存（回復役が先に倒れる → 残った人に戻す手段はあるか → 全滅 → 命の灯火）
// 書き換え: 2人目を僧侶に（作成の画面で選ぶ）、戦闘中に僧侶のHPを3、次に剣士のHPを2にした
import { start } from './rec.mjs';
const r = await start('v2-survival');
const { page, beat, shot, text, note, tap, tryTap, edit } = r;
await page.goto((await import('./rec.mjs')).URL);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false })); });
await page.reload(); await beat(800);
await tap(page.getByText('新しい冒険'));
await tap(page.getByText('2人', { exact: true }));
await tap(page.getByText('キャラクター作成へ'), 800);
await tap(page.getByText('2人目', { exact: true }));
await tap(page.getByText('僧侶', { exact: true }).first(), 800);
await tap(page.getByText('1人目', { exact: true }));
await tap(page.getByText('冒険に出発'), 700);
await tryTap(page.getByRole('dialog').getByText('出発する', { exact: true }), 800);
await tryTap(page.getByText('つづける'));
await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; });
await tap(page.getByText('翠の神殿に入る'), 1200);
await edit((g) => { (g.expeditions?.[0]?.dungeon ?? g.dungeon).rooms.find((r) => r.id === 'r0c0').enemies = ['forestWolf', 'forestWolf', 'toxicShroom'].map((defId) => ({ defId, level: 3 })); });
await tryTap(page.locator('[data-explore-roll-button]'), 1300);
await tap(page.getByRole('button', { name: /扉を開ける/ }), 2600);
// 僧侶のHPを3に（敵の狙いも僧侶に）
await edit((g) => { const b = g.expeditions[0].battle; b.allies[1].hp = 3; });
await shot('01-priest-low');
note(`戦闘の始め: ${(await text()).slice(0, 300)}`);
// 何もせずターン終了 → 僧侶が倒れる
await tap(page.getByRole('button', { name: 'ターン終了' }), 300);
await tryTap(page.getByRole('button', { name: 'ターンを終了する' }), 200);
await page.waitForTimeout(6500);
await shot('02-priest-down');
note(`僧侶が倒れた後: ${(await text()).slice(0, 400)}`);
// 剣士の手札と道具袋に、戻す手段があるか
await page.locator('[data-card-index]').first().click({ delay: 900 }).catch(() => {}); await beat();
await tryTap(page.getByLabel('道具袋'), 900);
await shot('03-pouch');
note(`剣士の道具袋: ${(await text()).match(/道具袋[^]*?$/)?.[0]?.slice(0, 200)}`);
await tryTap(page.getByLabel('閉じる'), 500);
// 倒れた僧侶をタップ
await tryTap(page.locator('[data-ally]').nth(1), 800);
await shot('04-tap-fallen');
// 剣士も倒れる → 全滅 → 命の灯火
await edit((g) => { const b = g.expeditions[0].battle; b.allies[0].hp = 2; });
await tap(page.getByRole('button', { name: 'ターン終了' }), 300);
await tryTap(page.getByRole('button', { name: 'ターンを終了する' }), 200);
for (let i = 0; i < 16; i++) { await page.waitForTimeout(600); if (i % 3 === 0) await shot(`05-wipe-${i}`); if (/全滅|命の灯火|力尽き|目を覚ま/.test(await text())) break; }
await shot('06-defeat');
note(`全滅の画面: ${(await text()).slice(0, 500)}`);
for (let i = 0; i < 4; i++) { if (!(await tryTap(page.getByRole('button', { name: /冒険の結果へ|つづける|町へ|戻る|次へ|閉じる|地上|先へ/ }), 1500))) break; await shot(`07-after-${i}`); }
note(`その後: ${(await text()).slice(0, 500)}`);
await shot('08-town');
await r.finish();
