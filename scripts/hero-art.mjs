// 職業の立ち絵・顔の見え方の確認（J4）: 4人パーティの職を差し替えて、世界マップ・パーティ・戦闘のスクリーンショットを撮る
// 使い方: URL=http://localhost:5173/card-rpg/ node scripts/hero-art.mjs pope,hadesLord,necromancer,bard [出力名]
import { chromium, URL, depart } from './lib.mjs';
const jobs = (process.argv[2] ?? 'pope,hadesLord,necromancer,bard').split(',');
const tag = process.argv[3] ?? 'a';
// 4つ目の引数: お供（例 babyDragon:azure,wolfPup:gray,owl:snowy,cockatiel:pearl）。懐き度は5
const pets = process.argv[4]?.split(',');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const shot = (n) => page.screenshot({ path: `scripts/screenshots/hero-${tag}-${n}.png` });
await page.goto(URL);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('4人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await depart(page);
await page.waitForTimeout(300);
const edit = async (fn, arg) => {
  await page.evaluate(({ src, arg }) => { const k = 'card-rpg/adventure'; const d = JSON.parse(localStorage.getItem(k)); (0, eval)(src)(d.game, arg); localStorage.setItem(k, JSON.stringify(d)); }, { src: fn.toString(), arg });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(400);
};
await edit((g, a) => { g.world.story = undefined; g.heroes.forEach((h, i) => { h.classId = a.jobs[i]; h.gender = i % 2 ? 'male' : 'female'; if (a.pets) { const [petId, color] = a.pets[i].split(':'); h.pet = { petId, color, name: 'ぴよ', love: 5, acts: 0 }; } }); }, { jobs, pets });
await shot('map');
await page.locator('[data-party-row] button').first().click().catch(() => {});
await page.waitForTimeout(400);
await shot('party');
await page.keyboard.press('Escape');
// 戦闘へ
await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; });
await page.getByText('翠の神殿に入る').click();
await page.waitForTimeout(200);
if (await page.getByText('探索力の判定').count()) await page.getByText('探索力の判定').click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: /^扉を開ける/ }).click();
await page.waitForTimeout(600);
await shot('battle');
console.log('saved hero-' + tag + '-{map,party,battle}.png', errs.length ? errs : '');
await browser.close();
