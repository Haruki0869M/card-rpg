// ダンジョンの通路のチカチカの確認（手直し → 扉を選ぶだけの形）: 1倍速で扉のボタンを押し、扉の前まで自動で歩く演出の間に、
// (1) 歩く演出の通路の絵（2枚の景色）が歩く途中で作り直されていないか（DOM の要素が同じまま）
// (2) 演出の途中のコマで、黒い所が急に増えていないか（押す前の止まった景色と、歩き終えた景色と比べる）
// を調べる。CDP の画面の流し撮り（screencast）で全部のコマを受け取り、別のタブのキャンバスで暗い画素の割合を数える。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/dungeon-frames.mjs（URL・DUNGEON_FRAMES_OUTPUT で変更可）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, depart, URL } from './lib.mjs';

const OUT = process.env.DUNGEON_FRAMES_OUTPUT ?? 'screenshots/dungeon-frames';
const [W, H] = (process.env.SIZE ?? '390x844').split('x').map(Number);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
// ゆっくり再生（SLOW）: ページの時計を遅らせる（framer-motion の JS の動き）。CSS・WAAPI の動きは CDP で遅らせる
await ctx.addInitScript(() => {
  const realNow = performance.now.bind(performance);
  let speed = 1, rb = realNow(), vb = rb;
  const now = () => vb + (realNow() - rb) * speed;
  performance.now = now;
  window.__setSpeed = (s) => { vb = now(); rb = realNow(); speed = s; };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(now()));
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const edit = async (fn, arg) => {
  await page.evaluate(({ src, arg }) => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    (0, eval)(src)(d.game, arg);
    localStorage.setItem(k, JSON.stringify(d));
  }, { src: fn.toString(), arg });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(600);
};
await page.goto(URL);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('2人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await depart(page);
await page.waitForTimeout(300);
await edit((g) => {
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const id of Object.keys(w.pos)) w.pos[id] = t;
  w.story = undefined;
});
await page.getByText('翠の神殿に入る').click();
await page.waitForTimeout(800);
await page.locator('[data-explore-roll-button]').click();
await page.locator('[data-dice-overlay]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
await page.locator('[data-door-choice]').first().click();
await page.getByText('ターン終了').waitFor({ timeout: 8000 }).catch(() => problems.push('扉の後に戦闘にならない'));
await page.waitForTimeout(500);
await edit((g) => {
  const x = g.expeditions[0];
  x.mode = 'dungeon';
  x.battle = undefined;
  x.battleInfo = undefined;
  x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
  x.dungeon.explore = 3;
  for (const h of g.heroes) h.focus = 4;
});

// (1) 作り直しの見張り: 歩く演出（扉の演出の中）の2枚の景色の入れ物と、通路の絵の根元の要素に印を付け、歩く途中で変わったら数える
// （保存を書き換えると読み込み直すので、読み込むたびに付け直し、扉1つごとに数を足す）
const mount = { layers: 0, roots: 0 };
const installWatch = async () => {
  await page.evaluate(() => {
    const s = (window.__mount = { layers: 0, roots: 0, seen: null, rootTags: null });
    const tag = (el) => (el.__tag ??= Math.random().toString(36).slice(2, 8));
    const loop = () => {
      const l = document.querySelector('[data-door-open="walk"] [data-dungeon-layers]');
      if (!l) s.seen = null;
      else {
        if (s.seen && tag(l) !== s.seen) s.layers++;
        s.seen = tag(l);
        s.rootTags ??= new Set();
        for (const v of l.querySelectorAll('[data-dungeon-layer] > div')) s.rootTags.add(tag(v));
        s.roots = Math.max(s.roots, s.rootTags.size);
      }
      if (!l) s.rootTags = null;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
};
const readWatch = async () => {
  const m = await page.evaluate(() => window.__mount ?? { layers: 0, roots: 0 });
  mount.layers += m.layers;
  mount.roots = Math.max(mount.roots, m.roots);
};
await installWatch();

// (2) 1倍速の流し撮り
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', (f) => {
  frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'png', maxWidth: W, maxHeight: H, everyNthFrame: 1 });
const rect = await page.locator('[data-dungeon-layers]').evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});
const windows = [];
// 扉のボタンを押す → 扉の前まで歩く演出（data-door-open="walk"）→ 扉が開く。歩く間だけを調べる
const act = async (name, pick) => {
  const btns = page.locator('[data-door-choice]:not([disabled])');
  if (!(await btns.count())) return console.log(`  （${name}: 押せない。とばす）`);
  const t0 = Date.now();
  await (pick === 'last' ? btns.last() : btns.first()).click();
  const walk = page.locator('[data-door-open="walk"]');
  if (!(await walk.waitFor({ timeout: 1000 }).then(() => true).catch(() => false))) return console.log(`  （${name}: 歩く演出なし＝扉の前にいた）`);
  await walk.waitFor({ state: 'detached', timeout: 5000 }).catch(() => problems.push(`${name}: 歩く演出が終わらない`));
  const t1 = Date.now();
  windows.push({ name, t0: t0 + 40, t1: t1 - 30, rest0: t0 - 400, rest1: t1 + 60 });
  console.log(`  ${name}`);
  await readWatch();
  await page.getByText('ターン終了').waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
};
const back = async () =>
  edit((g) => {
    const x = g.expeditions[0];
    x.mode = 'dungeon';
    x.battle = undefined;
    x.battleInfo = undefined;
    x.event = undefined;
    x.chest = undefined;
    x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
    x.dungeon.explore = 3;
  });
await page.waitForTimeout(400);
await act('右の扉（遠い扉まで歩く）', 'last');
await back();
await installWatch();
await act('左の扉', 'first');
await page.waitForTimeout(300);
await cdp.send('Page.stopScreencast');
if (mount.layers) problems.push(`歩く途中で景色の入れ物が ${mount.layers} 回作り直された`);
if (mount.roots > 2) problems.push(`通路の絵の根元が ${mount.roots} 個できた（2枚のはず＝作り直されている）`);

// 暗い画素の割合（輝度 < 14）を別のタブで数える
const lab = await ctx.newPage();
await lab.setContent('<canvas id=c></canvas>');
const darkOf = (b64) =>
  lab.evaluate(async ({ b64, rect }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.getElementById('c');
    c.width = rect.w;
    c.height = rect.h;
    const g = c.getContext('2d');
    g.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const d = g.getImageData(0, 0, rect.w, rect.h).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 14) dark++;
    return dark / (d.length / 4);
  }, { b64, rect });
const report = [];
for (const w of windows) {
  const before = frames.filter((f) => f.t >= w.rest0 && f.t < w.t0).at(-1) ?? frames.filter((f) => f.t < w.t0).at(-1);
  const after = frames.filter((f) => f.t > w.t1 && f.t <= w.rest1).at(-1) ?? frames.filter((f) => f.t > w.t1).at(0);
  const mid = frames.filter((f) => f.t >= w.t0 && f.t <= w.t1);
  if (!before || !after) {
    report.push(`${w.name}: 前後のコマが取れなかった`);
    continue;
  }
  const b = await darkOf(before.data);
  const a = await darkOf(after.data);
  let worst = 0;
  let worstFrame;
  for (const f of mid) {
    const v = await darkOf(f.data);
    if (v > worst) [worst, worstFrame] = [v, f];
  }
  const limit = Math.max(b, a) + 0.05;
  const line = `${w.name}: 途中${mid.length}コマ・暗い所 前${(b * 100).toFixed(1)}% 後${(a * 100).toFixed(1)}% 途中の最大${(worst * 100).toFixed(1)}%`;
  report.push(line);
  console.log(line);
  if (worst > limit) {
    problems.push(`${w.name}: 途中で黒い所が増えた（${(worst * 100).toFixed(1)}%、前後は ${(b * 100).toFixed(1)}%・${(a * 100).toFixed(1)}%）`);
    writeFileSync(`${OUT}/flash-${windows.indexOf(w)}.png`, Buffer.from(worstFrame.data, 'base64'));
  }
  if (!mid.length) report.push(`${w.name}: 途中のコマが無い（演出が短すぎる？）`);
  report.push(`${w.name}: 歩く時間 ${((w.t1 - w.t0) / 1000).toFixed(2)}秒`);
  // 前後の見比べ用（DUNGEON_FRAMES_STRIP=1）: 歩く間のコマを 0.1秒おきに保存する
  if (process.env.DUNGEON_FRAMES_STRIP) {
    let next = -Infinity, n = 0;
    for (const f of [before, ...mid, after]) {
      if (f !== after && f.t < next) continue;
      next = f.t + 100;
      writeFileSync(`${OUT}/strip-${windows.indexOf(w)}-${String(n++).padStart(2, '0')}.png`, Buffer.from(f.data, 'base64'));
    }
  }
}
await lab.close();

writeFileSync(`${OUT}/report.txt`, [...report, `景色の入れ物の作り直し ${mount.layers}回・絵の根元 ${mount.roots}個・`, ...problems.map((p) => `問題: ${p}`), ...errors.map((e) => `例外: ${e}`)].join('\n'));
console.log(`景色の入れ物の作り直し ${mount.layers}回・絵の根元 ${mount.roots}個・`);
if (errors.length) problems.push(`画面の例外 ${errors.join(' / ')}`);
await browser.close();
if (problems.length) {
  console.log(`問題 ${problems.length}件:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('チカチカの確認: 問題なし');
