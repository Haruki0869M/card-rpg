// ボスの門の絵の確認: 5つのダンジョンの通路の絵で、ボスの部屋の扉の前に立った所を撮る。
// 翠の神殿に入ってから、保存データでダンジョンの種類（絵）を変え、ボスの1つ手前の部屋を通った後の通路に立たせる。
// 立つ位置は engine/game/dungeonMap.ts の dungeonGrid・doorFront と同じ計算（部屋の行 r → y=2r+1、扉の前は y=2r）。
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/boss-door.mjs
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.BOSS_DOOR_OUTPUT ?? 'screenshots/boss-door';
mkdirSync(OUT, { recursive: true });
const DUNGEONS = ['emeraldTemple', 'lavaCavern', 'silentCatacomb', 'demonCastle', 'randomForest'];
const SIZES = [[360, 640], [390, 844], [480, 854]];
const problems = [];
const browser = await chromium.launch();

for (const [width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
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
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const w = d.game.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.getByText('翠の神殿に入る').click();
  await page.waitForTimeout(300);
  const base = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
  for (const id of DUNGEONS) {
    await page.evaluate(
      ({ base, id }) => {
        const d = JSON.parse(base);
        const g = d.game;
        const x = g.expeditions?.[0] ?? g;
        const run = x.dungeon;
        run.dungeonId = id;
        const boss = run.rooms.find((r) => r.next.length === 0);
        const before = run.rooms.find((r) => r.next.includes(boss.id));
        for (const r of run.rooms) if (r.row < boss.row) r.cleared = true;
        run.currentRoomId = before.id;
        // dungeonGrid と同じ列の計算
        const rows = Math.max(...run.rooms.map((r) => r.row)) + 1;
        const widths = Array.from({ length: rows }, (_, r) => run.rooms.filter((q) => q.row === r).length);
        const maxW = Math.max(1, ...widths);
        const gridW = maxW === 1 ? 1 : Math.max(3, maxW);
        const xOf = (r) => (widths[r.row] <= 1 ? Math.floor((gridW - 1) / 2) : Math.round((r.col * (gridW - 1)) / (widths[r.row] - 1)));
        const bx = xOf(boss);
        run.pos = { x: bx, y: 2 * boss.row, facing: 0 };
        run.seen = [...new Set([...(run.seen ?? []), `${bx},${2 * boss.row}`, `${bx},${2 * boss.row + 1}`])];
        localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
      },
      { base, id },
    );
    await page.reload();
    await page.getByText('つづきから').click();
    await page.waitForTimeout(400);
    const view = page.locator('[data-dungeon-view]');
    const end = await view.getAttribute('data-end').catch(() => null);
    if (end !== 'boss') problems.push(`${width} ${id}: 目の前がボスの門にならない（${end}）`);
    const issues = await layoutIssues(page);
    if (issues.length) problems.push(`${width} ${id}: ${issues.join(' / ')}`);
    await page.screenshot({ path: `${OUT}/${width}-${id}.png` });
  }
  if (errors.length) problems.push(`${width}: 画面の例外 ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: ボスの門（5つのダンジョン・360/390/480）');
