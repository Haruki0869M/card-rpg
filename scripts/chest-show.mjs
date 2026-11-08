// 宝箱の演出を格ごとに録画する（演出の確認用）。
// 黄金箱で各格が出るシードを探し、そのシードで開ける様子を動画（mp4）とコマ割り画像に保存する。
// 宝箱が開く動画（ChestVideo）が再生されたかも調べる。ffmpeg は環境変数 FFMPEG（無ければ PATH の ffmpeg）。
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ FFMPEG=<ffmpeg.exe> node scripts/chest-show.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const OUT = 'screenshots/chest';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const problems = [];
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
  // 今の始め方: 物語を閉じて、全員を翠の神殿の入口へ移してから入る（scripts/lib.mjs の startBattle と同じ）
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
  await page.waitForTimeout(300);
  return page.evaluate((k) => localStorage.getItem(k), KEY);
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
  let videoPlayed = false;
  for (let i = 0; i < 30; i++) {
    const f = `${OUT}/f-${grade}-${String(i).padStart(2, '0')}.png`;
    await p.screenshot({ path: f });
    frames.push(f);
    if (await p.locator('[data-chest-video="playing"]').count()) {
      // 動画が本当に進んでいるか（止まっていないか）
      const t = await p.locator('[data-chest-video="playing"] video').evaluate((v) => v.currentTime).catch(() => 0);
      if (t > 0) videoPlayed = true;
    }
    if (await p.getByText('先へ進む').count()) break;
    await p.waitForTimeout(350);
  }
  if (!videoPlayed) problems.push(`${grade}: 宝箱が開く動画が再生されなかった`);
  await p.waitForTimeout(1200);
  await c.close();
  const vid = readdirSync(dir).find((f) => f.endsWith('.webm'));
  renameSync(`${dir}/${vid}`, `${OUT}/${grade}.webm`);
  rmSync(dir, { recursive: true, force: true });
  execSync(`"${FFMPEG}" -y -loglevel error -i ${OUT}/${grade}.webm -vf "fps=30,scale=360:-2" -pix_fmt yuv420p ${OUT}/${grade}.mp4`);
  rmSync(`${OUT}/${grade}.webm`);
  // コマ割り（6列）。ImageMagick を使わず ffmpeg の tile で作る
  const rows = Math.ceil(frames.length / 6);
  execSync(`"${FFMPEG}" -y -loglevel error -framerate 1 -i ${OUT}/f-${grade}-%02d.png -vf "scale=iw/2:-1,tile=6x${rows}:padding=3:color=0x111111" -frames:v 1 ${OUT}/${grade}-frames.png`);
  frames.forEach((f) => rmSync(f));
  console.log(`${grade}: seed ${seed} (${look}) → ${OUT}/${grade}.mp4`);
}
await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('chest-show: 4つの格で、宝箱が開く動画が再生された');
