// 回1（迷わない導線と、寄り道の見つけ方）の画面確認。幅 360×640 と 390×844 で、シナリオ1（広い地図）の2人（1台）の冒険を使って:
// ① 冒険の最初の自分の番: 見取り図のボタン（「見取り図」の字）と、最初の案内。「次の目的」の行（上の帯のすぐ下）
// ② 「次の目的」の行を押すと、霧の中の目的地の印へ地図が動く。戻ると、地図の端に矢印。矢印を押すと動く
// ③ 霧の上の塔の先と、その説明
// ④ 街道を歩いて分かれ道に来た時、脇道と立て札が見えるか（霧の晴れ方は、本物の移動で）。立て札の説明
// ⑤ 扉が開かない時の文（方角と地域）と「場所を見る」
// ⑥ 通り過ぎた時の知らせ（地域の紹介の後の、別の窓。本物の移動で）
// ⑦ 災厄の知らせ（制覇の物語を閉じた後の、別の窓）・上の💀の札の「場所: 〇〇の東（…）」・説明の窓
// ⑧ いちばん縮小した時: 「次の目的」の行・💀の札・上の帯・地図のボタン・矢印が重ならない
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタン・重なりを調べる。
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/guide-r1.mjs（URL で変更可。GUIDE_OUTPUT で保存先）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart, waitForWorldMovement } from './lib.mjs';

const OUT = process.env.GUIDE_OUTPUT ?? 'screenshots/guide-r1';
const KEY = 'card-rpg/adventure';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
];
const browser = await chromium.launch();
const problems = [];
const notes = [];
/** 回1 より前からある問題（見えている地図がとても低い時に、地図の右のボタンどうしが重なる）。数えずに、別に書き出す */
const known = [];

async function start(page, players) {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    // 見取り図の最初の案内は出す（overviewHintSeen を入れない）
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText(`${players}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
}
async function edit(page, fn, arg) {
  await page.evaluate(({ src, arg, k }) => {
    const d = JSON.parse(localStorage.getItem(k));
    (0, eval)(src)(d.game, arg);
    localStorage.setItem(k, JSON.stringify(d));
  }, { src: fn.toString(), arg, k: KEY });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(600);
}
const game = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
async function check(page, tag, where) {
  const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""'));
  if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
}
/** 1台で回す時の「〇〇の番です」の窓を閉じる */
async function handoff(page) {
  for (let k = 0; k < 3; k++) {
    const h = page.locator('[data-handoff]');
    if (!(await h.count())) return;
    await h.first().click();
    await page.waitForTimeout(300);
  }
}
async function closeStory(page) {
  for (let k = 0; k < 4; k++) {
    const b = page.getByRole('button', { name: 'つづける' });
    if (!(await b.count())) return;
    await b.click();
    await page.waitForTimeout(350);
  }
}
const box = (page, sel) => page.locator(sel).first().boundingBox();
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
/** 上の帯・💀の札・「次の目的」の行・地図の右のボタン・矢印・地域の名前が重ならないか */
async function noOverlap(page, tag, where) {
  const sels = ['[data-cutin-anchor]', '[data-scourge-strip]', '[data-goal-line]', '[data-party-row]', '[data-zoom-controls]', '[data-recenter]', '[data-goal-arrow]', '[data-region-name]', '[data-overview-hint]'];
  const boxes = {};
  for (const s of sels) if (await page.locator(s).count()) boxes[s] = await box(page, s);
  const keys = Object.keys(boxes);
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      // 地域の名前は地図の上の飾り（押せない）。案内の吹き出しは地図のボタンの横に出るので、地域の名前とだけ比べる
      if (!overlap(boxes[keys[i]], boxes[keys[j]])) continue;
      const msg = `${tag} ${where}: ${keys[i]} と ${keys[j]} が重なっている`;
      // 拡大のボタンの列と「戻る」のボタンは、見えている地図が100px未満の時、回1 の前から重なる（どちらも回1 で動かしていない）
      const pre = [keys[i], keys[j]].sort().join() === ['[data-recenter]', '[data-zoom-controls]'].sort().join() && (await mapVisibleH(page)) < 100;
      (pre ? known : problems).push(msg);
    }
  const vw = page.viewportSize().width;
  for (const k of keys) {
    const b = boxes[k];
    if (b && (b.x < -0.5 || b.x + b.width > vw + 0.5)) problems.push(`${tag} ${where}: ${k} が画面の横にはみ出している`);
  }
}
/** 操作パネルに隠れていない地図の高さ */
const mapVisibleH = (page) =>
  page.evaluate(() => {
    const m = document.querySelector('[data-world-map]').getBoundingClientRect();
    const p = document.querySelector('[data-world-panel]').getBoundingClientRect();
    return Math.round(p.top - m.top);
  });
/** 地図の中の要素が、見えている地図の枠の中にあるか */
async function inMapView(page, sel) {
  const m = await box(page, '[data-world-map]');
  const b = await box(page, sel);
  if (!m || !b) return false;
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  return cx >= m.x && cx <= m.x + m.width && cy >= m.y && cy <= m.y + m.height;
}
/** 地図の中の要素を、操作パネルに隠れていない所（見えている地図）の真ん中へスクロールする */
async function centerInMap(page, loc) {
  await loc.evaluate((el) => {
    const map = document.querySelector('[data-world-map]');
    const panel = document.querySelector('[data-world-panel]');
    const m = map.getBoundingClientRect();
    const inset = panel ? panel.getBoundingClientRect().height : 0;
    const r = el.getBoundingClientRect();
    map.scrollBy({ left: r.left + r.width / 2 - (m.left + m.width / 2), top: r.top + r.height / 2 - (m.top + (m.height - inset) / 2), behavior: 'instant' });
  });
  await page.waitForTimeout(250);
}
const infoText = async (page) => ((await page.locator('[data-tile-info]').count()) ? await page.locator('[data-tile-info]').innerText() : '');

for (const [width, height] of SIZES) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- ① 最初の自分の番: 見取り図の字と最初の案内・「次の目的」の行 ----
  await start(page, 2);
  await closeStory(page);
  await handoff(page);
  await page.waitForTimeout(400);
  const ovBtn = page.locator('[data-overview-open]');
  if (!(await ovBtn.innerText()).includes('見取り図')) problems.push(`${tag}: 見取り図のボタンに字が無い`);
  if (!(await page.locator('[data-overview-hint]').count())) problems.push(`${tag}: 見取り図の最初の案内が出ない`);
  else if (!(await page.locator('[data-overview-hint]').innerText()).includes('大陸の全体は「見取り図」で見られます')) problems.push(`${tag}: 案内の文がちがう`);
  // 「次の目的」の行は、高さ700px以上の画面だけ（短い画面は、地図がほとんど隠れるので出さない）
  const tall = height >= 700;
  const goalLine = page.locator('[data-goal-line]');
  const goalShown = await goalLine.isVisible();
  if (tall && !goalShown) problems.push(`${tag}: 「次の目的」の行が出ない`);
  if (!tall && goalShown) problems.push(`${tag}: 短い画面なのに「次の目的」の行が出ている`);
  const line1 = goalShown ? await goalLine.innerText() : '';
  notes.push(`${tag} ① 次の目的の行: ${goalShown ? line1 : '（高さ700px未満なので出さない）'}`);
  if (goalShown && !/^次の目的: 翠の神殿（(北|北西|西)・翠の森の西）$/.test(line1.trim())) problems.push(`${tag}: 次の目的の行が「${line1}」`);
  await page.screenshot({ path: `${OUT}/${tag}-01-first-turn.png` });
  await check(page, tag, '最初の番');
  await noOverlap(page, tag, '最初の番');
  // 案内を閉じる → 読み直しても、もう出ない（端末ごとの設定）
  await page.locator('[data-overview-hint-close]').click();
  await page.waitForTimeout(200);
  if (await page.locator('[data-overview-hint]').count()) problems.push(`${tag}: 案内が閉じない`);
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/settings')));
  if (settings.overviewHintSeen !== true) problems.push(`${tag}: 案内を出したことが設定に残っていない`);

  // ---- ② 「次の目的」の行を押す → 目的地の印へ。戻る → 端の矢印 → 押す ----
  await page.locator('[data-recenter]').click();
  await page.waitForTimeout(500);
  const arrow0 = await page.locator('[data-goal-arrow]').count();
  notes.push(`${tag} ② スタートの町で、目的地の矢印: ${arrow0 ? 'あり（向き ' + (await page.locator('[data-goal-arrow]').getAttribute('data-goal-deg')) + '度）' : 'なし（目的地が画面の中）'}`);
  if (arrow0) {
    await page.screenshot({ path: `${OUT}/${tag}-02-edge-arrow.png` });
    await check(page, tag, '端の矢印');
    await noOverlap(page, tag, '端の矢印');
  }
  if (goalShown) {
    await goalLine.click();
    await page.waitForTimeout(700);
    if (!(await inMapView(page, '[data-goal-mark]'))) problems.push(`${tag}: 「次の目的」の行を押しても、目的地の印が見える所へ動かない`);
  } else if (arrow0) {
    await page.locator('[data-goal-arrow]').click();
    await page.waitForTimeout(700);
  }
  if (await page.locator('[data-goal-arrow]').count()) problems.push(`${tag}: 目的地が見えているのに矢印が残っている`);
  const seenGoal = await page.locator('[data-goal-mark]').getAttribute('data-goal-seen');
  if (seenGoal !== null) notes.push(`${tag} ② 目的地はもう霧が晴れていた`);
  await page.screenshot({ path: `${OUT}/${tag}-03-goal-focus.png` });
  if (arrow0) {
    await page.locator('[data-recenter]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-goal-arrow]').click();
    await page.waitForTimeout(700);
    if (!(await inMapView(page, '[data-goal-mark]'))) problems.push(`${tag}: 矢印を押しても目的地へ動かない`);
  }

  // ---- ③ 霧の上の塔の先 ----
  const tops = await page.locator('[data-tower-top]').count();
  notes.push(`${tag} ③ 霧の上の塔の先: ${tops}つ`);
  if (!tops) problems.push(`${tag}: 霧の上に塔の先が無い`);
  else {
    const top = page.locator('[data-tower-top]').first();
    await centerInMap(page, top.locator('[data-tower-foot]'));
    // 塔の立っているマス（霧の面）を押す
    const foot = await top.locator('[data-tower-foot]').boundingBox();
    await page.mouse.click(foot.x + foot.width / 2, foot.y + foot.height / 2);
    await page.waitForTimeout(250);
    const t = await infoText(page);
    if (!t.includes('見晴らしの塔: 登ると、まわりが見える')) problems.push(`${tag}: 塔の先を押した説明が「${t}」`);
    await page.screenshot({ path: `${OUT}/${tag}-04-tower-top.png` });
  }

  // ---- ④ 街道を歩いて分かれ道へ（2つ目の鍵のダンジョン）。霧は「街道を歩いてきた」形にして、最後は本物の移動 ----
  // まず地図を全部見せて、立て札のマスを調べる
  await edit(page, (g) => {
    const w = g.world;
    for (const t of w.tiles) t.seen = true;
    w.story = undefined;
  });
  await handoff(page);
  const postEl = page.locator('[data-signpost="silentCatacomb"]');
  const postTile = (await postEl.count()) ? Number(await postEl.getAttribute('data-tile')) : NaN;
  if (!Number.isFinite(postTile)) {
    await page.screenshot({ path: `${OUT}/${tag}-debug-no-signpost.png` });
    notes.push(`${tag} debug: 立て札 ${await page.locator('[data-signpost]').count()}・mode ${(await game(page)).mode}`);
  }
  if (!Number.isFinite(postTile)) problems.push(`${tag}: 2つ目の鍵のダンジョンの立て札が無い`);
  else {
    await edit(page, (g, post) => {
      const w = g.world;
      const W = w.width;
      const cube = (i) => { const c = i % W, r = Math.floor(i / W); const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
      const dist = (a, b) => { const p = cube(a), q = cube(b); return Math.max(...p.map((v, k) => Math.abs(v - q[k]))); };
      const postRow = Math.floor(post / W);
      // 1つ目の鍵は取った。沼の集落から北へ、街道を歩いてきた（通った街道のマスから2マスが見えている。昼）
      g.clearedDungeons = ['emeraldTemple'];
      w.keys = ['emerald'];
      const road = w.tiles.map((t, i) => i).filter((i) => w.tiles[i].t === 'road' && i % W >= 5 && i % W <= 9);
      const walked = road.filter((i) => Math.floor(i / W) > postRow + 2 && Math.floor(i / W) <= 21);
      for (let i = 0; i < w.tiles.length; i++) w.tiles[i].seen = walked.some((r) => dist(r, i) <= 2) || Math.floor(i / W) >= 21;
      // 分かれ道の3マス手前の街道に立つ（昼）
      const at = road.filter((i) => Math.floor(i / W) === postRow + 3)[0] ?? walked[0];
      for (const h of g.heroes) w.pos[h.id] = at;
      w.turn = g.heroes[0].id;
      w.acted = [];
      w.move = 6;
      w.moveDice = undefined;
      w.worldTurn = 2;
      // 同行はしていない（1人で動く。操作パネルが低い形）
      w.follow = {};
      // 突発イベント（乱数）で移動が止まらないように、この番は起きない事にする（同じキャラに2手番続けては起きない決まり）
      for (const h of g.heroes) h.lastRandomEvent = g.world.worldTurn;
      w.wanderers = w.wanderers.filter((x) => dist(x.tile, at) > 6);
      w.story = undefined;
      w.visitedRegions = [...new Set([...w.visitedRegions, w.tiles[at].r])];
    }, postTile);
    await handoff(page);
    await page.waitForTimeout(400);
    const g0 = await game(page);
    const before = g0.world.tiles[postTile].seen;
    notes.push(`${tag} ④ 分かれ道の3マス手前: 立て札のマス ${before ? '見えている' : '霧の中'}`);
    await page.screenshot({ path: `${OUT}/${tag}-05-before-fork.png` });
    // 本物の移動で街道を北へ。霧の中のマスへは動けないので、見えている所の一番先（分かれ道に一番近い街道のマス）へ動く
    const moveTo = async (tile) => {
      const reach = page.locator(`[data-reach="${tile}"]`);
      if (!(await reach.count())) return false;
      await centerInMap(page, reach);
      for (let k = 0; k < 2; k++) {
        const b = await reach.boundingBox();
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(250);
      }
      try { await waitForWorldMovement(page); } catch { /* 移動の演出なし */ }
      await page.waitForTimeout(900);
      await closeStory(page);
      await handoff(page);
      return true;
    };
    const W0 = g0.world.width;
    const cube = (i) => { const c = i % W0, r = Math.floor(i / W0); const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
    const dist = (a, b) => { const p = cube(a), q = cube(b); return Math.max(...p.map((v, k) => Math.abs(v - q[k]))); };
    const reachTiles = await page.locator('[data-reach]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-reach'))));
    const roadReach = reachTiles.filter((i) => g0.world.tiles[i].t === 'road');
    const step1 = roadReach.sort((a, b) => dist(a, postTile) - dist(b, postTile))[0];
    if (step1 === undefined || !(await moveTo(step1))) problems.push(`${tag}: 街道を北へ動けない`);
    else {
      const g1 = await game(page);
      const d1 = dist(g1.world.pos[g1.heroes[0].id], postTile);
      const vis1 = await page.locator('[data-signpost="silentCatacomb"]').count();
      notes.push(`${tag} ④ 街道を${dist(g0.world.pos[g0.heroes[0].id], step1)}マス北へ動いた所（分かれ道まであと${d1}マス）: 立て札 ${vis1 ? '見える' : '見えない（霧の中）'}`);
      await page.screenshot({ path: `${OUT}/${tag}-06-near-fork.png` });
      // 次の番: 分かれ道のマスへ（まだ移動力が残っていれば、そのまま）
      if (!(await page.locator(`[data-reach="${postTile}"]`).count())) {
        await edit(page, (g) => {
          g.world.move = 6;
          // 突発イベント（乱数）で移動が止まらないように、この番は起きない事にする（同じキャラに2手番続けては起きない決まり）
          for (const h of g.heroes) h.lastRandomEvent = g.world.worldTurn;
          g.world.turn = g.heroes[0].id;
          g.world.story = undefined;
        });
        await handoff(page);
      }
      if (!(await moveTo(postTile))) problems.push(`${tag}: 分かれ道のマスへ動けない`);
      const g2 = await game(page);
      const w2 = g2.world;
      const here = w2.pos[g2.heroes[0].id];
      if (here !== postTile) problems.push(`${tag}: 分かれ道に着いていない（${here}）`);
      // 脇道: 分かれ道からダンジョンまで、道のマスを歩いた順（幅優先）
      const cat = w2.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'silentCatacomb');
      const prev = new Map([[cat, -1]]);
      const q = [cat];
      const nb = (i) => w2.tiles.map((_, j) => j).filter((j) => j !== i && dist(i, j) === 1);
      for (let k = 0; k < q.length && !prev.has(postTile); k++) for (const n of nb(q[k])) if (!prev.has(n) && w2.tiles[n].t === 'road') { prev.set(n, q[k]); q.push(n); }
      const side = [];
      for (let c = prev.get(postTile); c !== undefined && c !== -1; c = prev.get(c)) side.push(c);
      const seenSide = side.filter((i) => w2.tiles[i].seen).length;
      notes.push(`${tag} ④ 分かれ道に着いた時: 立て札 ${(await page.locator('[data-signpost="silentCatacomb"]').count()) ? '見える' : '見えない'}・脇道（ダンジョンを含めて${side.length}マス）のうち ${seenSide}マスが霧の外・ダンジョン ${w2.tiles[cat].seen ? '見える' : '霧の中（目的地の印は霧の上に出る）'}`);
      if (!(await page.locator('[data-signpost="silentCatacomb"]').count())) problems.push(`${tag}: 分かれ道に着いても立て札が見えない`);
      await page.screenshot({ path: `${OUT}/${tag}-07-at-fork.png` });
      await check(page, tag, '分かれ道');
      // 立て札を押す（そのマスの説明）。立て札の足元を押す
      const sp = page.locator('[data-signpost="silentCatacomb"]');
      const sb = (await sp.count()) ? await sp.boundingBox() : null;
      if (sb) await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height - 4);
      await page.waitForTimeout(250);
      const t = await infoText(page);
      notes.push(`${tag} ④ 立て札の説明: ${t}`);
      if (!/立て札「→ 東へ\d+マス: .+」/.test(t)) problems.push(`${tag}: 立て札の説明が「${t}」`);
      await page.screenshot({ path: `${OUT}/${tag}-08-signpost-info.png` });
    }
  }

  // ---- ⑤ 扉が開かない時の文と「場所を見る」 ----
  await edit(page, (g) => {
    const w = g.world;
    const lava = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'lavaCavern');
    for (const h of g.heroes) w.pos[h.id] = lava;
    w.tiles[lava].seen = true;
    g.clearedDungeons = ['emeraldTemple'];
    w.keys = ['emerald'];
    w.turn = g.heroes[0].id;
    w.move = null;
    w.moveDice = undefined;
    w.story = undefined;
  });
  await handoff(page);
  await page.getByRole('button', { name: /溶岩の大空洞に入る/ }).click();
  await page.waitForTimeout(300);
  const gate = page.locator('[data-gate-note]');
  if (!(await gate.count())) problems.push(`${tag}: 扉が開かない時の知らせが出ない`);
  else {
    const t = await gate.innerText();
    notes.push(`${tag} ⑤ 扉の文: ${t.replace(/\n/g, ' ')}`);
    if (!/扉が開かない…。封印の鍵（蒼）が要る。先に「.+」（南東・嘆きの沼の東）を制覇しよう/.test(t)) problems.push(`${tag}: 扉の文が「${t}」`);
    await page.screenshot({ path: `${OUT}/${tag}-09-gate.png` });
    await check(page, tag, '扉の文');
    await page.locator('[data-gate-look]').click();
    await page.waitForTimeout(700);
    if (!(await inMapView(page, '[data-goal-mark]'))) problems.push(`${tag}: 「場所を見る」で鍵のダンジョンへ動かない`);
    await page.screenshot({ path: `${OUT}/${tag}-10-gate-look.png` });
  }

  // ---- ⑥ 通り過ぎた時の知らせ（沼から火山へ、本物の移動） ----
  {
    const g6 = await game(page);
    const w6 = g6.world;
    const W = w6.width;
    const swamp = w6.tiles[w6.tiles.findIndex((t) => t.f?.kind === 'town' && t.f.id === 'swampHamlet')].r;
    const volcano = swamp - 1;
    const nb = (i) => {
      const c = i % W, r = Math.floor(i / W);
      const d = r % 2 ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
      return d.map(([dc, dr]) => [c + dc, r + dr]).filter(([cc, rr]) => cc >= 0 && rr >= 0 && cc < W && rr < w6.height).map(([cc, rr]) => rr * W + cc);
    };
    const from = w6.tiles.findIndex((t, i) => t.r === swamp && t.t === 'road' && nb(i).some((n) => w6.tiles[n].r === volcano && w6.tiles[n].t === 'road'));
    const to = nb(from).find((n) => w6.tiles[n].r === volcano && w6.tiles[n].t === 'road');
    await edit(page, (g, { from, to, swamp, volcano }) => {
      const w = g.world;
      for (const h of g.heroes) w.pos[h.id] = from;
      w.tiles[to].seen = true;
      w.tiles[from].seen = true;
      g.clearedDungeons = ['emeraldTemple'];
      w.keys = ['emerald'];
      w.visitedRegions = [...new Set([...w.visitedRegions, swamp, swamp + 1, swamp + 2])].filter((r) => r !== volcano);
      w.turn = g.heroes[0].id;
      w.move = 3;
      // 同行はしていない（1人で動く。操作パネルが低い形）
      w.follow = {};
      // 突発イベント（乱数）で移動が止まらないように、この番は起きない事にする（同じキャラに2手番続けては起きない決まり）
      for (const h of g.heroes) h.lastRandomEvent = g.world.worldTurn;
      w.moveDice = undefined;
      w.wanderers = w.wanderers.filter((x) => Math.abs(x.tile - from) > 3 * w.width);
      w.story = undefined;
    }, { from, to, swamp, volcano });
    await handoff(page);
    const reach = page.locator(`[data-reach="${to}"]`);
    if (!(await reach.count())) problems.push(`${tag}: 火山への光るマスが無い`);
    else {
      await centerInMap(page, reach);
      for (let k = 0; k < 2; k++) {
        const b = await reach.boundingBox();
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(250);
      }
      try { await waitForWorldMovement(page); } catch { /* なし */ }
      await page.waitForTimeout(900);
      const b1 = await page.locator('body').innerText();
      if (!b1.includes('灼熱の火山')) {
        problems.push(`${tag}: 火山の紹介が出ない`);
        await page.screenshot({ path: `${OUT}/${tag}-debug-pass-by.png` });
        const gx = await game(page);
        notes.push(`${tag} debug: mode ${gx.mode}・pos ${gx.world.pos[gx.heroes[0].id]}・story ${JSON.stringify(gx.world.story)}・visited ${gx.world.visitedRegions}`);
      }
      if (await page.getByRole('button', { name: 'つづける' }).count()) await page.getByRole('button', { name: 'つづける' }).click();
      await page.waitForTimeout(2000);
      const b2 = await page.locator('body').innerText();
      if (!b2.includes('まだ行っていない場所') || !/まだ「.+」に行っていない（.+・嘆きの沼の東）。/.test(b2) || !b2.includes('この先のダンジョンには、封印の鍵（蒼）が要る。')) problems.push(`${tag}: 通り過ぎた時の知らせが出ない`);
      await page.screenshot({ path: `${OUT}/${tag}-11-pass-by.png` });
      await check(page, tag, '通り過ぎた時の知らせ');
      await closeStory(page);
    }
  }

  // ---- ⑦ 災厄の知らせ（制覇の物語を閉じた後の、別の窓）・💀の札の場所 ----
  // 本物の出現の流れ: 1つ目の鍵を取ったワールドターンの終わり。制覇の物語が出ている所を作り、全員が動いた後に終える
  await edit(page, (g) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f?.kind === 'town' && x.f.id === 'royalCapital');
    for (const h of g.heroes) w.pos[h.id] = t;
    g.clearedDungeons = ['emeraldTemple'];
    w.keys = ['emerald'];
    w.scourgeCount = 0;
    w.scourgesMet = ['greedKing', 'miasmaNecro', 'nightmareBeast', 'infernoDemon'];
    w.wanderers = w.wanderers.filter((x) => !x.scourge);
    w.turn = g.heroes[0].id;
    w.acted = g.heroes.filter((h) => h.id !== w.turn).map((h) => h.id);
    w.move = null;
    w.story = undefined;
  });
  await handoff(page);
  await page.getByRole('button', { name: '待機' }).click();
  await page.waitForTimeout(2400);
  {
    const body = await page.locator('body').innerText();
    if (!/💀 氷嵐の魔女が、.+の(西|東)に現れた！/.test(body)) problems.push(`${tag}: 災厄の知らせ（題に地域）が出ない`);
    if (!body.includes('すべての町の店の値段が25%高い')) problems.push(`${tag}: 災厄の知らせに「すべての町の店の値段が25%高い」が無い`);
    // 2026-11-13 から、落とす専用の装備の名前と効果も書く（scourges.ts。エンジンのテスト guide-r1.test.ts と同じ形）
    if (!/倒すと元に戻り、専用の装備「永久凍土の女皇衣」を落とす（.+）。/.test(body)) problems.push(`${tag}: 災厄の知らせに「倒すと元に戻り、専用の装備「永久凍土の女皇衣」を落とす（効果）。」が無い`);
    await page.screenshot({ path: `${OUT}/${tag}-12-scourge-alone.png` });
  }
  // 制覇の物語と重なった時: 物語の窓が出ている時に来た知らせは、閉じた後の別の窓（エンジンの並び。状態はエンジンが作った物を使う）
  await edit(page, (g) => {
    const w = g.world;
    const page2 = w.story;
    w.story = { title: '翠の神殿', lines: ['神殿の奥で、翠の光が静かに消えていった。', '鍵はあと2つ。'] };
    w.storyQueue = [page2];
  });
  await page.waitForTimeout(1500);
  {
    const b1 = await page.locator('body').innerText();
    if (!b1.includes('翠の神殿') || b1.includes('氷嵐の魔女が')) problems.push(`${tag}: 制覇の物語の窓に、災厄の知らせが混ざっている`);
    await page.screenshot({ path: `${OUT}/${tag}-13-clear-story.png` });
    await page.getByRole('button', { name: 'つづける' }).click();
    await page.waitForTimeout(2200);
    const b2 = await page.locator('body').innerText();
    if (!/💀 氷嵐の魔女が、.+に現れた！/.test(b2)) problems.push(`${tag}: 制覇の物語を閉じた後に、災厄の知らせが出ない`);
    await page.screenshot({ path: `${OUT}/${tag}-14-scourge-after-clear.png` });
    await check(page, tag, '災厄の知らせ');
    await closeStory(page);
    await handoff(page);
  }
  {
    // 塔の見張りなどで、もう見えていたら、霧の中に戻して「地域まで」の文を確かめる
    {
      const gs0 = await game(page);
      const wd0 = gs0.world.wanderers.find((x) => x.scourge);
      if (wd0 && gs0.world.tiles[wd0.tile].seen) {
        await edit(page, (g, t) => { g.world.tiles[t].seen = false; g.world.story = undefined; }, wd0.tile);
        await handoff(page);
      }
    }
    // 「次の目的」の行は、上の帯のすぐ下・💀の札の上
    {
      const gb = await box(page, '[data-goal-line]');
      const sb = await box(page, '[data-scourge-strip]');
      if (tall && gb && sb && !(gb.y + gb.height <= sb.y + 0.5)) problems.push(`${tag}: 「次の目的」の行が💀の札の上にない`);
    }
    const place = page.locator('[data-scourge-place]');
    const t = (await place.count()) ? await place.innerText() : '';
    notes.push(`${tag} ⑦ 💀の札の場所: ${t}`);
    const gs = await game(page);
    const wd = gs.world.wanderers.find((x) => x.scourge);
    const seen = wd && gs.world.tiles[wd.tile].seen;
    if (!seen && !/^場所: .+の(西|東)（くわしい場所は、塔に登ると分かる）$/.test(t)) problems.push(`${tag}: 💀の札の場所が「${t}」`);
    if (seen && t !== '場所: 地図の💀の所') problems.push(`${tag}: 見えている💀の札の場所が「${t}」`);
    await page.screenshot({ path: `${OUT}/${tag}-15-scourge-strip.png` });
    await check(page, tag, '💀の札');
    await noOverlap(page, tag, '💀の札と次の目的');
    await page.locator('[data-scourge-strip]').click();
    await page.waitForTimeout(400);
    const dt = await page.locator('[data-scourge-row-place]').first().innerText();
    if (!seen && !/^場所: .+の(西|東)（くわしい場所は、塔に登ると分かる）$/.test(dt)) problems.push(`${tag}: 説明の窓の場所が「${dt}」`);
    await page.screenshot({ path: `${OUT}/${tag}-16-scourge-dialog.png` });
    await page.getByRole('button', { name: '閉じる' }).click();
    await page.waitForTimeout(900);
  }

  // ---- ⑧ いちばん縮小した時 ----
  // 地図のボタンが操作パネルに隠れていないか（押せる所の真ん中が、そのボタン自身か）
  const covered = await page.evaluate(() =>
    ['[data-zoom-out]', '[data-overview-open]', '[data-recenter]'].filter((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !hit || !el.contains(hit);
    }),
  );
  const mapH = await page.evaluate(() => {
    const m = document.querySelector('[data-world-map]').getBoundingClientRect();
    const p = document.querySelector('[data-world-panel]').getBoundingClientRect();
    return Math.round(p.top - m.top);
  });
  notes.push(`${tag} ⑧ 💀の札と次の目的が両方ある時、パネルに隠れていない地図の高さ: ${mapH}px`);
  if (covered.length) (mapH < 100 && covered.every((c) => c === '[data-recenter]') ? known : problems).push(`${tag}: 地図のボタン ${covered.join('・')} が操作パネルに隠れている（見えている地図 ${mapH}px）`);
  for (let k = 0; k < 8 && !covered.length; k++) {
    const out = page.locator('[data-zoom-out]');
    if (await out.isDisabled()) break;
    await out.click();
    await page.waitForTimeout(200);
  }
  if (!covered.length) {
    await page.locator('[data-recenter]').click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: `${OUT}/${tag}-17-min-zoom.png` });
  await check(page, tag, 'いちばん縮小');
  await noOverlap(page, tag, 'いちばん縮小');

  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}

await browser.close();
console.log(notes.join('\n'));
if (known.length) {
  console.log('回1 より前からある問題（見えている地図がとても低い時。回1 とは別に直す）:');
  for (const k of known) console.log(' - ' + k);
}
if (problems.length) {
  console.log('NG');
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('OK');
