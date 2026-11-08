// 宝箱の演出を格ごとに録画する（演出の確認用）。
// 黄金箱で各格が出るシードを探し、そのシードで開ける様子を動画（webm。ffmpeg があれば mp4 も）とコマ割り画像に保存する。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/chest-show.mjs（URL で変更可）
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
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
  await page.waitForTimeout(300);
  // 今は世界マップから始まるので、保存を書き換えて翠の神殿の入口へ移し（物語も閉じる）、入る
  await page.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k));
    const w = d.game.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
    localStorage.setItem(k, JSON.stringify(d));
  }, KEY);
  await page.reload();
  await page.getByText('つづきから').click();
  await page.getByText('翠の神殿に入る').click();
  await page.waitForTimeout(500);
  const base = await page.evaluate((k) => localStorage.getItem(k), KEY);
  if (!JSON.parse(base).game.expeditions?.[0]?.dungeon) throw new Error('翠の神殿に入れなかった');
  return base;
}

/** 保存データを「黄金箱の前」に書き換えて再開する */
async function atChest(page, base, look, seed) {
  await page.evaluate(
    ({ k, base, look, seed }) => {
      const d = JSON.parse(base);
      const g = d.game;
      // ダンジョンは世界マップと別の場面（expeditions）にある
      const x = g.expeditions?.[0] ?? g;
      x.mode = 'chest';
      x.dungeon.currentRoomId = x.dungeon.rooms[0].id;
      x.chest = { roomId: x.dungeon.rooms[0].id, spec: { rarity: look, locked: false }, unlocked: true };
      g.rngState = seed;
      localStorage.setItem(k, JSON.stringify(d));
    },
    { k: KEY, base, look, seed },
  );
  await page.reload();
  await page.getByText('つづきから').click();
  await page.getByText('運のスロットで開ける').waitFor();
}

let hasFfmpeg = true;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch {
  hasFfmpeg = false;
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
    // 宝箱はダンジョンの場面（expeditions）にある
    const grade = await page.evaluate((k) => {
      const g = JSON.parse(localStorage.getItem(k)).game;
      return (g.expeditions?.[0] ?? g).chest?.grade;
    }, KEY);
    if (grade && want[grade] === look && !found[grade]) found[grade] = { seed, look };
  }
}
console.log('seeds', found);
const missing = Object.keys(want).filter((g) => !found[g]);
if (missing.length) {
  console.error(`見つからなかった格: ${missing.join(', ')}`);
  process.exitCode = 1;
}
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
  let video = `${OUT}/${grade}.webm`;
  if (hasFfmpeg) {
    execSync(`ffmpeg -y -loglevel error -i ${OUT}/${grade}.webm -vf "fps=30,scale=360:-2" -pix_fmt yuv420p ${OUT}/${grade}.mp4`);
    rmSync(`${OUT}/${grade}.webm`);
    video = `${OUT}/${grade}.mp4`;
  }
  // コマ割り: ImageMagick を使わず、ブラウザで並べて撮る（Windows の convert.exe は別物のため）
  const imgs = frames.map((f) => `<img width="${VIEW.width / 2}" src="data:image/png;base64,${readFileSync(f).toString('base64')}">`).join('');
  const sheet = await browser.newPage({ viewport: { width: 6 * (VIEW.width / 2 + 6), height: 100 } });
  await sheet.setContent(`<body style="margin:0;background:#111;display:flex;flex-wrap:wrap;gap:6px;padding:3px">${imgs}</body>`);
  await sheet.screenshot({ path: `${OUT}/${grade}-frames.png`, fullPage: true });
  await sheet.close();
  frames.forEach((f) => rmSync(f));
  console.log(`${grade}: seed ${seed} (${look}) → ${video}`);
}
await browser.close();
