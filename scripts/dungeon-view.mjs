// ダンジョンの通路の画面確認（抜本的な見直し 段階2: 扉1つ＝手番1回・扉の予兆・扉の絵とボタンが同じ並び）
// 幅 360/390/480 と低い画面 360×560 で、入口（扉1つ。サイコロは無く、すぐ押せる）→ 扉を開ける（選んだ扉へ寄る演出）→ 扉2つ（絵の扉2つ＝ボタン2つ）
// → 周囲の警戒（フォーカス1で先読み）→ 右の扉 → 扉3つ（鍵3つ目のダンジョン）・5色・中ボスの重い扉・フクロウの先読み → 地図、
// を写真に撮り、絵の扉の数と並び＝ボタンの数と並び・はみ出し・12px未満の文字・小さすぎるボタン・通路の絵の高さ（200px以上）を調べる。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/dungeon-view.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.DUNGEON_VIEW_OUTPUT ?? 'screenshots/dungeon-view';
// 入るダンジョン（ID:名前）。ほかのダンジョンの通路の絵を見る時に変える（例 lavaCavern:溶岩の大空洞）
const [DUNGEON_ID, DUNGEON_NAME] = (process.env.DUNGEON_VIEW_DUNGEON ?? 'emeraldTemple:翠の神殿').split(':');
// 通路の絵だけを別のダンジョンのものにする（ID）。鍵が要る・部屋の並びが毎回変わるダンジョンでも、同じ道順で見え方を確かめられる
const LOOK = process.env.DUNGEON_VIEW_LOOK;
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
  [480, 854],
  [360, 560],
];
const browser = await chromium.launch();
const problems = [];

async function run(width, height, reduced = false, three = false) {
  const tag = `${width}x${height}${reduced ? '-reduced' : ''}${three ? '-three' : ''}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  const check = async (where, view = true) => {
    const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""')); // 地図のマス（文字なし）は除く
    if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
    if (!view) return;
    const h = await page.locator('[data-dungeon-view]').evaluate((e) => e.getBoundingClientRect().height).catch(() => 0);
    if (h < 200) problems.push(`${tag} ${where}: 通路の絵の高さが ${Math.round(h)}px（200px未満）`);
  };
  const edit = async (fn, arg) => {
    await page.evaluate(({ src, arg }) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d.game, arg);
      localStorage.setItem(k, JSON.stringify(d));
    }, { src: fn.toString(), arg });
    await page.reload();
    await page.getByText('つづきから').click();
    await page.waitForTimeout(300);
  };
  const expectEnd = async (face, where) => {
    const end = await page.locator('[data-dungeon-view]').getAttribute('data-end');
    if (end !== face) problems.push(`${tag} ${where}: 正面が「${end}」（期待は「${face}」）`);
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
  await edit((g, dungeonId) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === dungeonId);
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
  }, DUNGEON_ID);
  await page.getByText(`${DUNGEON_NAME}に入る`).click();
  await page.waitForTimeout(300);
  if (LOOK) {
    await edit((g, look) => {
      (g.expeditions?.[0] ?? g).dungeon.dungeonId = look;
    }, LOOK);
  }
  // 扉3つの確認: 2行目に強敵の部屋を1つ足して、最初の部屋の先を3つの扉にする（翠の神殿は2つまでなので、保存の上で足す）
  if (three) {
    await edit((g) => {
      const d = g.expeditions[0].dungeon;
      const elite = d.rooms.find((r) => r.type === 'elite');
      d.rooms.push({ ...d.rooms.find((r) => r.id === 'r1c1'), id: 'r1c2', col: 2, type: 'elite', enemies: elite.enemies, eventId: undefined, chest: undefined });
      d.rooms.find((r) => r.id === 'r0c0').next.push('r1c2');
    });
  }
  // 絵の扉（左から右）とボタン（左から右）が、同じ数・同じ並び・同じ種類か
  const sameDoors = async (where, want) => {
    const r = await page.evaluate(() => {
      const view = document.querySelector('[data-dungeon-view]');
      const drawn = [...view.querySelectorAll('[data-wall-door]')]
        .map((e) => ({ id: e.getAttribute('data-wall-door'), kind: e.getAttribute('data-wall-door-kind'), top: document.elementFromPoint(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2, e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)?.closest('[data-wall-door]')?.getAttribute('data-wall-door'), x: e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2, w: e.getBoundingClientRect().width, vx: view.getBoundingClientRect().left, vw: view.getBoundingClientRect().width }))
        .sort((a, b) => a.x - b.x);
      const buttons = [...document.querySelectorAll('[data-door-choice]')].map((e) => ({ id: e.getAttribute('data-door-choice'), kind: e.getAttribute('data-door-omen'), x: e.getBoundingClientRect().left }));
      return { wall: view.getAttribute('data-door-wall'), drawn, buttons };
    });
    if (want !== undefined && r.buttons.length !== want) problems.push(`${tag} ${where}: 扉のボタンが ${r.buttons.length} 個（${want} 個のはず）`);
    if (String(r.buttons.length) !== r.wall) problems.push(`${tag} ${where}: 絵の扉の壁が ${r.wall} 枚ぶん、ボタンは ${r.buttons.length} 個`);
    if (r.drawn.map((d) => d.id).join() !== r.buttons.map((b) => b.id).join()) problems.push(`${tag} ${where}: 絵の扉の並び（${r.drawn.map((d) => d.id).join()}）とボタンの並び（${r.buttons.map((b) => b.id).join()}）が違う`);
    if (r.drawn.map((d) => d.kind).join() !== r.buttons.map((b) => b.kind).join()) problems.push(`${tag} ${where}: 絵の扉の種類（${r.drawn.map((d) => d.kind).join()}）とボタンの種類（${r.buttons.map((b) => b.kind).join()}）が違う`);
    // 扉の真ん中が、壁やほかの物に隠れていないか
    for (const d of r.drawn) if (d.top !== d.id) problems.push(`${tag} ${where}: 絵の扉 ${d.id} が、手前の壁などに隠れている`);
    for (const d of r.drawn) if (d.x - d.w / 2 < d.vx - 1 || d.x + d.w / 2 > d.vx + d.vw + 1) problems.push(`${tag} ${where}: 絵の扉 ${d.id} が画面の外にはみ出している`);
    return r;
  };
  // 無くなった物（サイコロ・だれが振る？・手番を終える）が出ていないか
  const noDice = async (where) => {
    for (const sel of ['[data-explore-roll-button]', '[data-explore-picker]', '[data-explore-end]', '[data-dice-overlay]', '[data-move-guide]']) if (await page.locator(sel).count()) problems.push(`${tag} ${where}: 無くしたはずの ${sel} が出ている`);
    for (const t of ['サイコロを振る', '手番を終える']) if (await page.getByText(t).count()) problems.push(`${tag} ${where}: 「${t}」の文字が残っている`);
  };
  // 入口: 目の前に扉が1つ。サイコロは無く、すぐ押せる
  await expectEnd('door', '入口');
  await check('入口');
  await noDice('入口');
  if (await page.locator('[data-vote-hint]').count()) problems.push(`${tag}: 1台で遊んでいるのに扉の全員一致の案内が出た`);
  if (await page.locator('[data-dir]').count()) problems.push(`${tag}: 方向のボタン（左へ・前進など）が残っている`);
  const doors = page.locator('[data-door-choice]');
  await sameDoors('入口', 1);
  if ((await doors.count()) === 1) {
    const text = await doors.first().innerText();
    if (!text.includes('正面の扉')) problems.push(`${tag}: 扉1つなのに「正面の扉」ではない（${text}）`);
    if (!text.includes('魔物の群れ')) problems.push(`${tag}: 入口の扉に予兆「魔物の群れ」が出ない（${text}）`);
    if ((await doors.first().getAttribute('data-door-omen')) !== 'danger') problems.push(`${tag}: 入口の扉の予兆が赤（danger）でない`);
    if (!(await doors.first().isEnabled())) problems.push(`${tag}: 入口の扉をすぐ押せない（サイコロは無くなった）`);
    if (await doors.first().locator('[data-door-detail]').count()) problems.push(`${tag}: 先読みが無いのに扉の中身が出ている`);
  }
  if ((await page.locator('[data-scout-bar]').getAttribute('data-scout-bar').catch(() => null)) !== 'none') problems.push(`${tag}: 入口に「周囲の警戒」の帯が出ない`);
  await shot('1-entrance');
  await doors.first().click();
  // 扉が開く演出（選んだ扉へ寄る）→ 戦闘の画面（動作軽減では演出なし）
  const doorScene = page.locator('[data-door-open]');
  const openScene = async (slot, name) => {
    if (reduced) {
      if (await doorScene.count()) problems.push(`${tag}: 動作軽減なのに扉の演出が出た`);
      return;
    }
    const ok = await doorScene.waitFor({ timeout: 1500 }).then(() => true).catch(() => false);
    if (!ok) return problems.push(`${tag}: 扉が開く演出が出ない（${name}）`);
    const got = await doorScene.getAttribute('data-door-open-slot').catch(() => null);
    if (got !== slot) problems.push(`${tag}: 扉の演出が寄る先が「${got}」（${name} は「${slot}」のはず）`);
    if (!(await page.locator('[data-door-open] [data-door-opening]').count())) problems.push(`${tag}: 選んだ扉（${name}）が開いていない`);
    await page.waitForTimeout(250);
    await shot(`${name}-door-opening`);
    await doorScene.waitFor({ state: 'detached', timeout: 4000 }).catch(() => problems.push(`${tag}: 扉の演出が終わらない（${name}）`));
  };
  await openScene('center', '2a');
  await page.getByText('ターン終了').waitFor({ timeout: 5000 }).catch(() => problems.push(`${tag}: 扉の後に戦闘の画面にならない`));
  await page.waitForTimeout(400); // 保存が書かれるのを待つ（次で保存を書き換えるため）
  // 戦闘は確認の対象外: 保存を書き換えて「勝った後」にする（部屋を済ませて通路に戻った形）
  const afterBattle = (mut) => edit((g, mut) => {
    const x = g.expeditions[0];
    x.mode = 'dungeon';
    x.battle = undefined;
    x.battleInfo = undefined;
    x.event = undefined;
    x.chest = undefined;
    x.reward = undefined;
    x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
    x.dungeon.opened = undefined;
    for (const h of g.heroes) {
      h.focus = 3;
      h.hp = Math.max(h.hp, 10);
      if (mut?.owl && h.id === g.heroes[0].id) h.pet = { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 };
    }
    // 全員がダンジョンの中: この組の番にする
    g.world.turn = x.heroes[0];
    g.world.acted = [];
    if (mut?.nextType) for (const id of x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).next) x.dungeon.rooms.find((r) => r.id === id).type = mut.nextType;
  }, mut ?? null);
  await afterBattle();
  if (three) {
    await check('扉3つ');
    const r3 = await sameDoors('扉3つ', 3);
    const names = [];
    for (let i = 0; i < (await doors.count()); i++) names.push(await doors.nth(i).innerText());
    if (!(names[0]?.includes('左の扉') && names[1]?.includes('真ん中の扉') && names[2]?.includes('右の扉'))) problems.push(`${tag}: 扉3つの名前が左・真ん中・右でない（${names.join(' / ')}）`);
    if (!r3.buttons.some((b) => b.kind === 'elite')) problems.push(`${tag}: 強敵の扉（紫）が無い`);
    if (!names.some((n) => n.includes('強敵の棲処'))) problems.push(`${tag}: 強敵の扉に「強敵の棲処」が出ない`);
    await shot('2-three-doors');
    await doors.nth(1).click();
    await openScene('center', '3c');
    if (errors.length) problems.push(`${tag}: 画面の例外 ${errors.join(' / ')}`);
    await page.close();
    console.log(`${tag}: 確認済み`);
    return;
  }
  await check('扉2つ');
  await noDice('扉2つ');
  const two = await sameDoors('扉2つ', 2);
  if (two.buttons.length === 2) {
    const [l, r] = [await doors.nth(0).innerText(), await doors.nth(1).innerText()];
    if (!l.includes('左の扉') || !r.includes('右の扉')) problems.push(`${tag}: 扉2つの名前が左・右でない（${l} / ${r}）`);
    if (two.drawn.length === 2 && !(two.drawn[0].x < two.drawn[0].vx + two.drawn[0].vw / 2 && two.drawn[1].x > two.drawn[1].vx + two.drawn[1].vw / 2)) problems.push(`${tag}: 絵の扉2つが左右に分かれていない`);
  }
  if (!(await page.locator('[data-door-choice-note]').count())) problems.push(`${tag}: 扉が2つ以上なのに「ほかの扉は閉ざされる」の案内が無い`);
  if (await page.locator('[data-door-detail]').count()) problems.push(`${tag}: 警戒の前なのに扉の中身が出ている`);
  await shot('2-two-doors');
  // 周囲の警戒（フォーカス1・判定なし）→ 扉の先の中身と、その先の扉の色が出る
  await page.locator('[data-scout-open]').click();
  await page.locator('[data-scout-panel]').waitFor({ timeout: 2000 }).catch(() => problems.push(`${tag}: 周囲の警戒の窓が開かない`));
  await check('周囲の警戒の窓');
  await shot('3a-scout-panel');
  const focusOf = () => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes.map((h) => h.focus));
  const f0 = await focusOf();
  // 2人目のキャラ（1台で P2 の担当）で払う: P2 のキャラでも通る
  await page.locator('[data-scout-hero]').nth(1).click();
  await page.waitForTimeout(500);
  const f1 = await focusOf();
  if (!(f1[1] === f0[1] - 1 && f1[0] === f0[0])) problems.push(`${tag}: 警戒で2人目のキャラのフォーカスが1減っていない（${f0} → ${f1}）`);
  if ((await page.locator('[data-scout-bar]').getAttribute('data-scout-bar')) !== 'watched') problems.push(`${tag}: 警戒の後に「警戒中」にならない`);
  if (await page.locator('[data-scout-open]').count()) problems.push(`${tag}: 同じ通路でもう一度警戒できてしまう`);
  if ((await page.locator('[data-door-detail]').count()) < 1) problems.push(`${tag}: 警戒しても扉の中身（敵の名前など）が出ない`);
  if ((await page.locator('[data-door-beyond]').count()) !== 2) problems.push(`${tag}: 警戒しても「その先」の扉の色が出ない`);
  await sameDoors('警戒の後', 2);
  await check('警戒の後');
  await shot('3-scouted');
  // 右の扉を開ける: 右の扉へ寄って開く
  await doors.last().click();
  await openScene('right', '3b');
  await page.waitForTimeout(600);
  // 次の通路: 警戒は消えている（また警戒できる）
  await afterBattle();
  if ((await page.locator('[data-scout-bar]').getAttribute('data-scout-bar').catch(() => null)) !== 'none') problems.push(`${tag}: 次の通路でも前の警戒が残っている`);
  await sameDoors('次の通路');
  await check('次の通路');
  // フクロウのお供: 警戒しなくても先読み。中ボスの重い扉（次の行の部屋の種類を保存の上で差し替えて見た目を確かめる）
  await afterBattle({ owl: true, nextType: 'midboss' });
  if ((await page.locator('[data-scout-bar]').getAttribute('data-scout-bar').catch(() => null)) !== 'sense') problems.push(`${tag}: フクロウがいるのに「先読み中」にならない`);
  const heavy = await sameDoors('中ボスの扉');
  if (!heavy.drawn.length || heavy.drawn.some((d) => d.kind !== 'midboss')) problems.push(`${tag}: 中ボスの部屋が重い扉の見た目になっていない（${heavy.drawn.map((d) => d.kind).join()}）`);
  if (!(await doors.first().innerText()).includes('中ボスの間')) problems.push(`${tag}: 中ボスの扉のボタンに「中ボスの間」が出ない`);
  if ((await page.locator('[data-door-detail]').count()) < 1) problems.push(`${tag}: フクロウがいるのに扉の中身が出ない`);
  await check('中ボスの扉');
  await shot('4-midboss-door-owl');
  for (const label of ['装備', '道具', '撤退']) if (!(await page.getByRole('button', { name: label, exact: true }).count())) problems.push(`${tag}: 下の「${label}」が無い`);
  // 地図（見るだけ）
  await page.getByLabel('地図を開く').click();
  await page.locator('[data-map-overlay]').waitFor();
  if (await page.locator('[data-vote-hint]').count()) problems.push(`${tag}: 地図を開いているのに扉の案内が重なる`);
  await check('大きな地図');
  await shot('5-map');
  await page.getByLabel('地図を閉じる').click();
  // 休憩所の3択（休む・瞑想・技を磨く）。HP・フォーカスが満タンの選択肢は薄く「満タン」。技を磨く → 1人ずつカードを1枚選んで＋に
  await edit((g) => {
    const x = g.expeditions[0];
    x.mode = 'rest';
    x.dungeon.opened = true;
    for (const h of g.heroes) {
      h.hp = 9999;
      h.focus = 0;
      h.pet = undefined;
    }
  });
  await page.locator('[data-rest-choices]').waitFor({ timeout: 4000 }).catch(() => problems.push(`${tag}: 休憩所の3択が出ない`));
  if ((await page.locator('[data-rest]').count()) !== 3) problems.push(`${tag}: 休憩所の選択肢が3つでない`);
  if (!(await page.locator('[data-rest="hp"][data-rest-full]').count())) problems.push(`${tag}: HPが満タンなのに「休む」が薄くなっていない`);
  if (await page.locator('[data-rest="focus"][data-rest-full]').count()) problems.push(`${tag}: フォーカスが減っているのに「瞑想」が満タンの表示`);
  await check('休憩所', false);
  await shot('6-rest-three-choices');
  const upgradedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes.map((h) => h.deck.filter((c) => c.upgraded).length));
  await page.locator('[data-rest="upgrade"]').click();
  for (let i = 0; i < 2; i++) {
    const task = page.locator('[data-hero-task]');
    if (!(await task.waitFor({ timeout: 4000 }).then(() => true).catch(() => false))) {
      problems.push(`${tag}: 技を磨くの後、${i + 1}人目のカードを選ぶ画面が出ない`);
      break;
    }
    if (i === 0) {
      await check('技を磨く（カードを選ぶ）', false);
      await shot('7-hone-pick-card');
    }
    await task.locator('button[aria-pressed]').first().click();
    await task.getByRole('button', { name: /強化する|決める|これにする/ }).click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);
  const upgradedAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes.map((h) => h.deck.filter((c) => c.upgraded).length));
  if (!upgradedAfter.every((n, i) => n === upgradedBefore[i] + 1)) problems.push(`${tag}: 技を磨くで、全員のカードが1枚ずつ＋になっていない（${upgradedBefore} → ${upgradedAfter}）`);
  if (!(await page.locator('[data-door-choice]').count())) problems.push(`${tag}: 技を磨いた後、扉の画面に戻らない`);
  if (errors.length) problems.push(`${tag}: 画面の例外 ${errors.join(' / ')}`);
  await page.close();
  console.log(`${tag}: 確認済み`);
}

for (const [w, h] of SIZES) await run(w, h);
await run(390, 844, true);
await run(360, 640, false, true);
await run(480, 854, false, true);
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 扉の絵とボタンが同じ並び（1つ・2つ・3つ）・5色の予兆・周囲の警戒（フォーカス1）と先読み・中ボスの重い扉・扉の演出・ミニマップ・大きな地図・休憩所の3択と技を磨く（360/390/480・360×560・動作軽減）');
