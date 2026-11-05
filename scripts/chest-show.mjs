// 宝箱の演出を格ごとに録画する（演出の確認用）。
// 黄金箱で各格が出るシードを探し、そのシードで開ける様子を動画（mp4）とコマ割り画像に保存する。
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const OUT = 'screenshots/chest';
mkdirSync(OUT, { recursive: true });
const VIEW = { width: 360, height: 640 };
const KEY = 'card-rpg/adventure';

async function newAdventure(page) {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('1人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await page.getByText('冒険に出発').click();
  await page.getByText('翠の神殿').first().click();
  await page.waitForTimeout(300);
  return page.evaluate((k) => localStorage.getItem(k), KEY);
}

/** 保存データを「黄金箱の前」に書き換えて再開する */
async function atChest(page, base, look, seed) {
  await page.evaluate(
    ({ k, base, look, seed }) => {
      const d = JSON.parse(base);
      const g = d.game;
      g.mode = 'chest';
      g.dungeon.currentRoomId = g.dungeon.rooms[0].id;
      g.chest = { roomId: g.dungeon.rooms[0].id, spec: { rarity: look, locked: false }, unlocked: true };
      g.rngState = seed;
      localStorage.setItem(k, JSON.stringify(d));
    },
    { k: KEY, base, look, seed },
  );
  await page.reload();
  await page.getByText('つづきから').click();
  await page.getByText('運のスロットで開ける').waitFor();
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const base = await newAdventure(page);

// 各格のシードを探す
const want = { common: 'common', rare: 'legend', epic: 'legend', legend: 'legend' };
const found = {};
for (let seed = 1; seed < 400 && Object.keys(found).length < 4; seed++) {
  for (const look of ['common', 'legend']) {
    await atChest(page, base, look, seed);
    await page.getByText('運のスロットで開ける').click();
    await page.waitForTimeout(250);
    const grade = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game.chest?.grade, KEY);
    if (grade && want[grade] === look && !found[grade]) found[grade] = { seed, look };
  }
}
console.log('seeds', found);
await ctx.close();

// 録画
for (const [grade, { seed, look }] of Object.entries(found)) {
  const dir = `${OUT}/tmp-${grade}`;
  rmSync(dir, { recursive: true, force: true });
  const c = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir, size: VIEW } });
  const p = await c.newPage();
  await p.goto(URL);
  await p.evaluate((b) => {
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false }));
    localStorage.setItem('card-rpg/adventure', b);
  }, base);
  await atChest(p, base, look, seed);
  await p.waitForTimeout(600);
  await p.getByText('運のスロットで開ける').click();
  // コマ割り（0.35秒ごと）
  const frames = [];
  for (let i = 0; i < 22; i++) {
    const f = `${OUT}/f-${grade}-${String(i).padStart(2, '0')}.png`;
    await p.screenshot({ path: f });
    frames.push(f);
    if (await p.getByText('先へ進む').count()) break;
    await p.waitForTimeout(350);
  }
  await p.waitForTimeout(1200);
  await c.close();
  const vid = readdirSync(dir).find((f) => f.endsWith('.webm'));
  renameSync(`${dir}/${vid}`, `${OUT}/${grade}.webm`);
  rmSync(dir, { recursive: true, force: true });
  execSync(`ffmpeg -y -loglevel error -i ${OUT}/${grade}.webm -vf "fps=30,scale=360:-2" -pix_fmt yuv420p ${OUT}/${grade}.mp4`);
  rmSync(`${OUT}/${grade}.webm`);
  execSync(`convert ${frames.map((f) => `"${f}"`).join(' ')} -resize 50% miff:- | montage - -tile 6x -geometry +3+3 -background '#111' ${OUT}/${grade}-frames.png`);
  frames.forEach((f) => rmSync(f));
  console.log(`${grade}: seed ${seed} (${look}) → ${OUT}/${grade}.mp4`);
}
await browser.close();
