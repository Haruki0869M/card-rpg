// 実機の不具合②（2026-11-14）の確認: 低い画面（既定 390×540）で、シート8種類（パーティ装備・道具袋・メニュー・ログ・山札・捨て札・転職・ヘルプ）
// と依頼・イベント・報酬を開き、数字と写真で見る。
//   (1) 見出しと「閉じる」が押せる（ボタンの真ん中に、ほかの層が乗っていない）
//   (2) 中身のスクロール領域の高さ（中身が多い時は 160px 以上。潰れていない）
//   (3) 中身をいちばん下まで送ると、最後の要素が画面の中に入る（下が切れない）
//   (4) 横にはみ出さない
//   (5) パーティ・装備: 持ち物の行を押すと、その行のすぐ下に枠が開き、画面の中に入る。「渡す」の相手・「使う」の相手が出る
// 1台だけ・オンラインなし（本番の Firebase には何もしない）。
// 使い方: vite preview を起こしてから URL=http://127.0.0.1:4193/card-rpg/ node scripts/small-screen.mjs
//   SIZES=390x540,360x520 で大きさを変えられる。SMALL_SCREEN_OUTPUT で写真の場所。
// 2026-11-15: イベントの画面の下の帯「装備」「道具」（1人・1台で2人・選ぶ段・挑む段）が、選択肢・挑む段のパネルに重ならず押せ、シートが開く。
// ④⑤（2026-11-15）: 報酬（1人・1台で2人の取り合いの順番）と転職のカード選び（背景・1回では決まらない・ボタンが押せる）も通す。
// 狭い画面 回1（2026-11-15）: 世界マップ（scripts/small-screen-world.mjs。WORLD_SIZES=390x540,360x520 が既定）。
//   SMALL_SCREEN_PARTS=sheets,world（既定は両方）で、どれを通すか選べる。戦闘の所は別の作業者が別の関数で足す。
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, startBattle } from './lib.mjs';
import { worldMapChecks } from './small-screen-world.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173/card-rpg/';
if (/web\.app|firebaseapp/.test(BASE)) throw new Error('本番の URL では動かしません');
const OUT = process.env.SMALL_SCREEN_OUTPUT ?? 'screenshots/small-screen';
const SIZES = (process.env.SIZES ?? '390x540').split(',').map((s) => s.split('x').map(Number));
const PARTS = new Set((process.env.SMALL_SCREEN_PARTS ?? 'sheets,world').split(','));
const LATER = new Set([]); // 別の作業者が後で直す所（落ちても全体の失敗にしない）。報酬・転職のカード選びは④⑤で直したので外した
mkdirSync(OUT, { recursive: true });

const problems = [];
const later = [];
const rows = [];
const check = (ok, what, where) => {
  console.log(`${ok ? 'OK ' : 'NG '} ${what}`);
  if (!ok) (LATER.has(where) ? later : problems).push(what);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 開いている層を測る。root = 層のいちばん外、scroll = 中身のスクロール領域、close = 閉じるボタン */
const measure = (page, sel) =>
  page.evaluate(({ root, scroll, close }) => {
    const R = document.querySelector(root);
    if (!R) return { missing: root };
    const S = scroll === '&' ? R : scroll ? R.querySelector(scroll) ?? document.querySelector(scroll) : null;
    const C = close ? R.querySelector(close) ?? document.querySelector(close) : null;
    const rect = (e) => {
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height) };
    };
    let closeHit = null;
    if (C) {
      const b = C.getBoundingClientRect();
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      closeHit = { inView: b.top >= 0 && b.bottom <= innerHeight, onTop: !!top && (top === C || C.contains(top)), by: top && !(top === C || C.contains(top)) ? `${top.tagName}.${String(top.className).slice(0, 60)}` : null };
    }
    let lastVisible = null;
    if (S) {
      S.scrollTop = S.scrollHeight;
      const last = S.lastElementChild;
      const lb = last?.getBoundingClientRect();
      const sb = S.getBoundingClientRect();
      lastVisible = lb ? lb.bottom <= Math.min(innerHeight, sb.bottom) + 2 : true;
      S.scrollTop = 0;
    }
    return {
      innerHeight,
      appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(),
      root: rect(R),
      scroll: rect(S),
      scrollClient: S?.clientHeight ?? null,
      scrollContent: S?.scrollHeight ?? null,
      lastVisible,
      closeHit,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1 || (R.getBoundingClientRect().right > innerWidth + 1),
    };
  }, sel);

async function inspect(page, H, name, sel, where = name) {
  await wait(350);
  const m = await measure(page, sel);
  await page.screenshot({ path: `${OUT}/${H}-${name}.png` });
  if (m.missing) {
    check(false, `${name}: 開いていない（${m.missing}）`, where);
    rows.push({ name, missing: true });
    return m;
  }
  rows.push({ size: `${page.viewportSize().width}x${H}`, name, scrollH: m.scrollClient, contentH: m.scrollContent, root: m.root, close: m.closeHit });
  console.log(`   ${name}: 層 ${m.root.top}〜${m.root.bottom} / スクロール領域 ${m.scrollClient}px（中身 ${m.scrollContent}px） / 高さ ${m.appH}`);
  // 中身が少ない時はシートも低い（その時は中身が全部見えていれば良い）。中身が多い時は 160px 以上
  if (sel.scroll) check(m.scrollClient >= Math.min(160, m.scrollContent), `${name}: スクロール領域が潰れていない（${m.scrollClient}px・中身 ${m.scrollContent}px）`, where);
  if (sel.scroll) check(m.lastVisible, `${name}: いちばん下まで送ると、最後の要素が画面の中に入る`, where);
  if (sel.close) check(!!m.closeHit?.inView && !!m.closeHit?.onTop, `${name}: 閉じるボタンが画面の中で押せる${m.closeHit?.by ? `（上に ${m.closeHit.by}）` : ''}`, where);
  check(m.root.bottom <= m.innerHeight + 1 && m.root.top >= -1, `${name}: 層が画面の中（${m.root.top}〜${m.root.bottom} / ${m.innerHeight}）`, where);
  check(!m.overflowX, `${name}: 横にはみ出さない`, where);
  return m;
}
const SHEET = (n) => ({ root: `[data-sheet="${n}"]`, scroll: '[data-sheet-body]', close: '[data-sheet-close]' });
const closeSheet = async (page, n) => {
  await page.locator(`[data-sheet="${n}"] [data-sheet-close]`).click();
  await wait(300);
  check(!(await page.locator(`[data-sheet="${n}"]`).count()), `${n}: ×で閉じる`, n);
};
const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
const load = async (page, d) => {
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await wait(500);
};
const closeStory = async (p) => {
  for (let i = 0; i < 5 && (await p.getByText('タップで続ける').count()); i++) {
    await p.getByText('タップで続ける').first().click().catch(() => {});
    await wait(250);
  }
};

const browser = await chromium.launch();
try {
  // 狭い画面 回1: 世界マップ（低い画面の形）
  if (PARTS.has('world')) await worldMapChecks({ browser, BASE, OUT, check });
  for (const [W, H] of PARTS.has('sheets') ? SIZES : []) {
    console.log(`\n===== ${W}×${H} =====`);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => check(false, `${W}x${H} pageerror: ${e.message}`, 'page'));
    // ---- 戦闘（2人）: ログ・山札・捨て札・道具袋 ----
    await startBattle(page, 2, ['forestWolf']);
    await wait(800);
    await page.getByRole('button', { name: '山札を見る' }).click();
    await inspect(page, H, 'draw', SHEET('draw'));
    await closeSheet(page, 'draw');
    await page.getByRole('button', { name: '捨札を見る' }).click();
    await inspect(page, H, 'discard', SHEET('discard'));
    await closeSheet(page, 'discard');
    if (await page.getByRole('button', { name: '道具袋' }).isEnabled()) {
      await page.getByRole('button', { name: '道具袋' }).click();
      await inspect(page, H, 'pouch-battle', SHEET('pouch'), 'pouch');
      await closeSheet(page, 'pouch');
    } else check(false, '戦闘の道具袋のボタンが押せない（味方の番でない）', 'pouch');
    await page.getByRole('button', { name: 'メニュー' }).first().click();
    await wait(300);
    await page.getByRole('button', { name: /戦闘ログ/ }).click();
    await inspect(page, H, 'log', SHEET('log'));
    await closeSheet(page, 'log');

    // ---- 世界マップ: メニュー・パーティ装備・道具袋・依頼・転職・ヘルプ ----
    const d = await save(page);
    const g = d.game;
    delete g.expeditions;
    delete g.battle;
    delete g.dungeon;
    delete g.party;
    g.activeScene = undefined;
    g.mode = 'world';
    for (const h of g.heroes) {
      h.pouch = [{ uid: `p-${h.id}-1`, itemId: 'potion' }, { uid: `p-${h.id}-2`, itemId: 'potion' }, { uid: `p-${h.id}-3`, itemId: 'hiPotion' }];
      h.gold = 60;
      h.hp = Math.max(1, h.hp - 20);
    }
    g.world.story = undefined;
    await load(page, d);
    await closeStory(page);
    if (!(await page.getByRole('button', { name: 'メニュー' }).count())) check(false, '世界マップに戻れない（以降の世界マップのシートを通していない）', 'world');
    else {
      await page.getByRole('button', { name: 'メニュー' }).first().click();
      await inspect(page, H, 'menu', SHEET('menu'));
      // 画面の情報
      await page.locator('[data-screen-info] button').click();
      await wait(200);
      const info = await page.locator('[data-screen-info-lines]').innerText().catch(() => '');
      check(/画面 \d+×\d+/.test(info) && /100dvh/.test(info), `メニューの「画面の情報」が出る（${info.split('\n').slice(0, 3).join(' / ')}）`, 'menu');
      await page.screenshot({ path: `${OUT}/${H}-menu-screeninfo.png` });
      // 遊び方（ヘルプ）
      await page.locator('[data-menu-help]').click();
      await inspect(page, H, 'help', { root: '[data-help]', scroll: '[data-help] .overflow-y-auto', close: '[data-help-close]' });
      await page.locator('[data-help-close]').click();
      await wait(300);
      check(!(await page.locator('[data-help]').count()) && (await page.locator('[data-sheet="menu"]').count()) > 0, 'help: 閉じるとメニューに戻る', 'help');
      for (const [label, n] of [['依頼と封印の鍵', 'quests'], ['転職', 'jobs'], ['道具の袋', 'pouch'], ['パーティ・装備', 'party']]) {
        if (!(await page.locator('[data-sheet="menu"]').count())) {
          await page.getByRole('button', { name: 'メニュー' }).first().click();
          await wait(300);
        }
        await page.locator('[data-sheet="menu"]').getByRole('button', { name: label, exact: false }).first().click();
        await inspect(page, H, n === 'pouch' ? 'pouch-world' : n, SHEET(n), n);
        if (n !== 'party') await closeSheet(page, n);
      }
      // ---- パーティ・装備: 持ち物の行（⑥） ----
      const row = page.locator('[data-item-row="potion"]').first();
      await row.scrollIntoViewIfNeeded();
      await row.locator('[data-row-give]').click();
      await wait(700);
      const panel = await page.evaluate(() => {
        const p = document.querySelector('[data-row-panel]');
        const r = document.querySelector('[data-item-row][data-open]');
        if (!p || !r) return null;
        const pb = p.getBoundingClientRect();
        const rb = r.getBoundingClientRect();
        return { inside: r.contains(p), top: Math.round(pb.top), bottom: Math.round(pb.bottom), rowTop: Math.round(rb.top), innerHeight, giveTo: document.querySelectorAll('[data-give-to]').length, useTo: document.querySelectorAll('[data-use-to]').length, first: p.querySelector('[data-row-section]')?.getAttribute('data-row-section') };
      });
      check(!!panel, 'party: 「渡す」を押すと枠が開く', 'party');
      if (panel) {
        check(panel.inside, 'party: 枠は押した行の中（すぐ下）に開く', 'party');
        check(panel.bottom <= panel.innerHeight + 1 && panel.top >= 0, `party: 開いた枠が画面の中（${panel.top}〜${panel.bottom} / ${panel.innerHeight}）`, 'party');
        check(panel.first === 'give' && panel.giveTo >= 1, `party: 「渡す（だれに）」が先に出て、相手が ${panel.giveTo} 人`, 'party');
        check(panel.useTo >= 1, `party: 消耗品には「使う（だれに）」も出る（${panel.useTo} 人）`, 'party');
      }
      await page.screenshot({ path: `${OUT}/${H}-party-give-open.png` });
      // 渡す → 確認 → 知らせ
      await page.locator('[data-give-to]').first().click();
      await wait(300);
      await page.getByRole('button', { name: '渡す', exact: true }).last().click();
      await wait(300);
      const toast = await page.locator('.pointer-events-none.absolute.inset-x-4').first().innerText().catch(() => '');
      check(/回復薬を.+に渡しました/.test(toast), `party: 渡した側の知らせ（${toast}）`, 'party');
      await page.screenshot({ path: `${OUT}/${H}-party-given.png` });
      // 使う
      await page.locator('[data-item-row="potion"] [data-row-use]').first().click();
      await wait(600);
      await page.screenshot({ path: `${OUT}/${H}-party-use-open.png` });
      const hpBefore = (await save(page)).game.heroes.map((h) => h.hp);
      await page.locator('[data-use-to]').first().click();
      await wait(600);
      const hpAfter = (await save(page)).game.heroes.map((h) => h.hp);
      check(hpAfter.some((v, i) => v > hpBefore[i]), `party: 「使う」で HP が戻る（${hpBefore} → ${hpAfter}）`, 'party');
      check((await page.locator('[data-sheet="party"]').count()) > 0, 'party: 使った後もシートは開いたまま', 'party');
      // ゴールド
      await page.locator('[data-gold-row] [data-row-give]').click();
      await wait(500);
      await page.screenshot({ path: `${OUT}/${H}-party-gold-open.png` });
      check((await page.locator('[data-gold-amounts] button').count()) >= 1, 'party: ゴールドの量のボタンが出る', 'party');
      await page.locator('[data-row-cancel]').click();
      await wait(200);
      check(!(await page.locator('[data-row-panel]').count()), 'party: 「やめる」で枠が閉じる', 'party');
      await closeSheet(page, 'party');
      // 渡せる相手がいない時: 理由の文
      const d2 = await save(page);
      const t0 = d2.game.world.pos[d2.game.heroes[0].id];
      d2.game.world.pos[d2.game.heroes[1].id] = d2.game.world.tiles.findIndex((x, i) => i !== t0 && x && !x.f);
      d2.game.world.story = undefined;
      await load(page, d2);
      await closeStory(page);
      await page.getByRole('button', { name: 'メニュー' }).first().click();
      await wait(300);
      await page.locator('[data-sheet="menu"]').getByRole('button', { name: 'パーティ・装備' }).click();
      await wait(300);
      const btn = page.locator('[data-item-row] [data-row-give]').first();
      check((await btn.count()) > 0, 'party: 仲間がいなくても「渡す」のボタンは消えない', 'party');
      if (await btn.count()) {
        await btn.click();
        await wait(400);
        const why = await page.locator('[data-give-reason]').first().innerText().catch(() => '');
        check(/同じ場所に仲間がいないので渡せません/.test(why), `party: 渡せない理由の文（${why}）`, 'party');
        await page.screenshot({ path: `${OUT}/${H}-party-no-mate.png` });
      }
      await closeSheet(page, 'party');
    }

    // ---- イベント（ダンジョンの部屋） ----
    {
      await startBattle(page, 2, ['forestWolf']);
      const d3 = await save(page);
      const x = d3.game.expeditions?.find((e) => e.battle) ?? d3.game;
      x.mode = 'event';
      delete x.battle;
      x.event = { eventId: 'fallenTree', roomId: (x.dungeon ?? d3.game.dungeon).currentRoomId ?? (x.dungeon ?? d3.game.dungeon).rooms[0].id };
      await load(page, d3);
      await inspect(page, H, 'event', { root: '[data-event-scroll]', scroll: '&' }, 'イベント');
      check((await page.locator('[data-event-option]').count()) > 0, 'イベント: 選択肢のボタンがある', 'イベント');
      const opt = await page.locator('[data-event-option]').first().evaluate((el) => {
        el.scrollIntoView({ block: 'nearest' });
        const b = el.getBoundingClientRect();
        const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { inView: b.top >= 0 && b.bottom <= innerHeight, onTop: !!t && (t === el || el.contains(t)) };
      }).catch(() => null);
      check(!!opt?.inView && !!opt?.onTop, `イベント: 1つ目の選択肢が押せる ${JSON.stringify(opt)}`, 'イベント');
    }

    // ---- イベントの画面の「装備」「道具」（2026-11-15）: 1人・1台で2人（選ぶ段）・1台で2人（判定のパネル） ----
    // 1台で遊ぶ時は、選択肢を押すと下に判定のパネル（キャラ・フォーカス）が開く（オンラインの挑む段は coop-agree・coop-layers で見る）
    for (const [players, stage] of [[1, '選ぶ段'], [2, '選ぶ段'], [2, '判定のパネル']]) {
      const L = `イベントの装備・道具（${players}人・${stage}）`;
      await startBattle(page, players, ['forestWolf']);
      const d5 = await save(page);
      const x = d5.game.expeditions?.find((e) => e.battle) ?? d5.game;
      const run = x.dungeon ?? d5.game.dungeon;
      x.mode = 'event';
      delete x.battle;
      delete x.vote;
      x.event = { eventId: 'fallenTree', roomId: run.currentRoomId ?? run.rooms[0].id };
      await load(page, d5);
      await wait(700);
      let focusBefore;
      const focusText = async () => (await page.locator('[data-event-panel]').innerText().catch(() => '')).replace(/\s+/g, ' ').match(/フォーカス \d+ → \d+/)?.[0];
      if (stage === '判定のパネル') {
        await page.locator('[data-event-option="0"]').click();
        await wait(400);
        await page.getByRole('button', { name: 'フォーカスを増やす' }).click().catch(() => {});
        await wait(200);
        focusBefore = await focusText();
      }
      const m = await page.evaluate(() => {
        const rect = (e) => (e ? (({ top, bottom }) => ({ top: Math.round(top), bottom: Math.round(bottom) }))(e.getBoundingClientRect()) : null);
        const bar = document.querySelector('[data-dungeon-bar]');
        const hit = (label) => {
          const el = bar?.querySelector(`[data-bar-button="${label}"]`);
          if (!el) return null;
          const b = el.getBoundingClientRect();
          const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return { top: Math.round(b.top), bottom: Math.round(b.bottom), inView: b.top >= 0 && b.bottom <= innerHeight + 1, onTop: !!t && (t === el || el.contains(t)), w: Math.round(b.width), h: Math.round(b.height) };
        };
        return { bar: rect(bar), scroll: rect(document.querySelector('[data-event-scroll]')), panel: rect(document.querySelector('[data-event-panel]')), party: hit('装備'), pouch: hit('道具'), innerHeight };
      });
      console.log(`   ${L}: ${JSON.stringify(m)}`);
      rows.push({ size: `${W}x${H}`, name: L, ...m });
      await page.screenshot({ path: `${OUT}/${H}-event-bar-${players}p-${stage === '判定のパネル' ? 'check' : 'choose'}.png` });
      check(!!m.bar, `${L}: 下の帯がある`, 'イベント');
      if (!m.bar) continue;
      const above = m.panel ?? m.scroll;
      check(!!above && above.bottom <= m.bar.top + 1, `${L}: 帯が選択肢・パネルの下で重ならない（上の下端 ${above?.bottom} / 帯の上端 ${m.bar.top}）`, 'イベント');
      if (stage === '判定のパネル') check(!!m.panel && !!focusBefore, `${L}: 判定のパネルが出ていて、フォーカスを1つ決めた（${focusBefore}）`, 'イベント');
      for (const [k, label, sheet] of [['party', '装備', 'party'], ['pouch', '道具', 'pouch']]) {
        check(!!m[k]?.inView && !!m[k]?.onTop && m[k].h >= 44, `${L}: 「${label}」が画面の中で押せる（${JSON.stringify(m[k])}）`, 'イベント');
        await page.locator(`[data-dungeon-bar] [data-bar-button="${label}"]`).click();
        await wait(400);
        check((await page.locator(`[data-sheet="${sheet}"]`).count()) > 0, `${L}: 「${label}」でシートが開く`, 'イベント');
        if (players === 2 && stage === '選ぶ段') await inspect(page, H, `event-${sheet}`, SHEET(sheet), 'イベント');
        await closeSheet(page, sheet);
      }
      check((await page.locator(stage === '判定のパネル' ? '[data-event-panel]' : '[data-event-option]').count()) > 0, `${L}: 閉じた後もイベントの画面のまま`, 'イベント');
      if (stage === '判定のパネル') check((await focusText()) === focusBefore, `${L}: シートから戻ってもフォーカスの指定がそのまま（${focusBefore} / ${await focusText()}）`, 'イベント');
    }

    // ---- 報酬（④(1): 成長 → 自分のカード → 全員がそろってから取り合いを真ん中に） ----
    /** 押す物の真ん中に、ほかの層が乗っていないか・画面の中か */
    const hitAt = (sel) =>
      page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        el.scrollIntoView({ block: 'nearest' });
        const b = el.getBoundingClientRect();
        const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), inView: b.top >= 0 && b.bottom <= innerHeight + 1, onTop: !!t && (t === el || el.contains(t)) };
      }, sel);
    const rewardState = async (players, claim) => {
      await startBattle(page, players, ['forestWolf']);
      const d4 = await save(page);
      const x = d4.game.expeditions?.find((e) => e.battle) ?? d4.game;
      const ids = d4.game.heroes.map((h) => h.id);
      x.mode = 'reward';
      delete x.battle;
      x.reward = {
        gold: 12,
        exp: ids.map((heroId) => ({ heroId, gained: 14, fromLevel: 1, toLevel: 1, fromExp: 0, toExp: 14 })),
        levelUps: [],
        cardOffers: ids.flatMap((heroId) => ['lanceCharge', 'cmPrepare', 'warCry'].map((cardId) => ({ cardId, heroId }))),
        cardDone: [],
        cardOdds: [70, 25, 5],
        cardPicked: false,
        loot: [],
        ...(claim ? { claim: { item: { uid: 'claim-1', itemId: 'steelSword' }, heroes: ids, choices: {} } } : {}),
      };
      await load(page, d4);
      await wait(900);
    };
    try {
      // (a) 1人: 開いた時にカード3枚と「選ばない」が画面の中。カードを押すと説明が開き、「このカードを選ぶ」が押せる
      await rewardState(1, false);
      await page.screenshot({ path: `${OUT}/${H}-reward.png` });
      const cards = await page.evaluate(() => [...document.querySelectorAll('[data-pick-card]')].map((e) => {
        const b = e.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), inView: b.top >= 0 && b.bottom <= innerHeight };
      }));
      console.log('   報酬のカード', JSON.stringify(cards));
      check(cards.length === 3 && cards.every((c) => c.inView), `報酬: 開いた時にカード3枚が画面の中（${cards.map((c) => `${c.top}〜${c.bottom}`).join(' ')} / ${H}）`, '報酬');
      const skip = await hitAt('[data-reward-skip-card]');
      check(!!skip?.inView && !!skip?.onTop, `報酬: 「カードを選ばない」が押せる ${JSON.stringify(skip)}`, '報酬');
      await page.locator('[data-pick-card="1"]').click();
      await wait(500);
      const act = await hitAt('[data-card-pick-action]');
      check(!!act?.inView && !!act?.onTop, `報酬: カードを押すと説明が開き「このカードを選ぶ」が押せる ${JSON.stringify(act)}`, '報酬');
      const rw = (d) => (d.game.expeditions?.find((e) => e.reward) ?? d.game).reward;
      check(!(rw(await save(page))?.cardDone ?? []).length, '報酬: カードを1回押しただけでは決まらない', '報酬');
      await page.screenshot({ path: `${OUT}/${H}-reward-card-open.png` });

      // (b) 1台で2人＋取り合い: カードの間は取り合いを出さない → 2人ともカードが終わると真ん中に取り合い
      await rewardState(2, true);
      check((await page.locator('[data-reward-step="card"]').count()) > 0, '報酬（2人）: 最初はカード', '報酬');
      check(!(await page.locator('[data-claim-center]').count()) && (await page.locator('[data-claim-later]').count()) > 0, '報酬（2人）: カードの間は取り合いを出さず「全員が…選び終えたら…取り合いが出ます」と書く', '報酬');
      await page.locator('[data-pick-card="0"]').click();
      await wait(400);
      const skip2 = await hitAt('[data-reward-skip-card]');
      check(!!skip2?.inView && !!skip2?.onTop, `報酬（2人）: カードの説明を開いても「選ばない」が押せる ${JSON.stringify(skip2)}`, '報酬');
      await page.screenshot({ path: `${OUT}/${H}-reward2-card-open.png` });
      for (let i = 0; i < 2; i++) {
        await page.locator('[data-reward-skip-card]').click();
        await wait(700);
      }
      await page.locator('[data-claim-center]').waitFor({ timeout: 3000 }).catch(() => {});
      await page.screenshot({ path: `${OUT}/${H}-reward2-claim.png` });
      check((await page.locator('[data-claim-center]').count()) > 0, '報酬（2人）: 2人ともカードが終わると、取り合いが真ん中に出る', '報酬');
      const claimBtns = await page.evaluate(() => [...document.querySelectorAll('[data-claim-center] button')].filter((b) => /欲しい|余れば|いらない/.test(b.textContent)).map((el) => {
        const b = el.getBoundingClientRect();
        const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return b.top >= 0 && b.bottom <= innerHeight + 1 && !!t && (t === el || el.contains(t));
      }));
      check(claimBtns.length === 6 && claimBtns.every(Boolean), `報酬（2人）: 取り合いの「欲しい／余れば／いらない」が全部画面の中で押せる（${claimBtns.filter(Boolean).length}/${claimBtns.length}）`, '報酬');
      if (claimBtns.length) {
        for (let i = 0; i < 2; i++) {
          await page.locator('[data-claim-center] button', { hasText: '余れば' }).nth(i).click();
          await wait(500);
        }
        await wait(400);
        const fin = await hitAt('[data-reward-finish]');
        check(!(await page.locator('[data-claim-center]').count()) && !!fin?.inView, `報酬（2人）: 2人とも答えると、真ん中の窓が消えて「先へ進む」 ${JSON.stringify(fin)}`, '報酬');
        await page.screenshot({ path: `${OUT}/${H}-reward2-done.png` });
      }
    } catch (e) {
      check(false, `報酬: 開けない（${e.message.split('\n')[0]}）`, '報酬');
    }

    // ---- 転職のカード選び（⑤: 背景が透けない・1回押しただけでは決まらない・説明とボタンが画面の中） ----
    try {
      await startBattle(page, 1, ['forestWolf']);
      const d5 = await save(page);
      const g5 = d5.game;
      delete g5.expeditions;
      delete g5.battle;
      delete g5.dungeon;
      delete g5.party;
      g5.activeScene = undefined;
      g5.mode = 'world';
      g5.world.story = undefined;
      g5.heroes[0].jobPick = ['lanceCharge', 'cmPrepare', 'warCry'];
      await load(page, d5);
      await closeStory(page);
      await page.locator('[data-job-pick]').waitFor({ timeout: 3000 });
      const bg = await page.locator('[data-job-pick]').evaluate((el) => getComputedStyle(el).backgroundColor);
      const alpha = /rgba\(.*,\s*([\d.]+)\)/.exec(bg)?.[1];
      check(!alpha || Number(alpha) >= 0.99, `転職のカード選び: 背景が不透明（${bg}）`, 'jobpick');
      await page.screenshot({ path: `${OUT}/${H}-jobpick.png` });
      const jc = await page.evaluate(() => [...document.querySelectorAll('[data-job-pick] [data-pick-card]')].map((e) => {
        const b = e.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= innerHeight;
      }));
      check(jc.length === 3 && jc.every(Boolean), `転職のカード選び: 開いた時にカード3枚が画面の中（${jc.filter(Boolean).length}/${jc.length}）`, 'jobpick');
      await page.locator('[data-job-pick] [data-pick-card="0"]').click();
      await wait(500);
      check(((await save(page)).game.heroes[0].jobPick ?? []).length === 3, '転職のカード選び: カードを1回押しただけでは決まらない', 'jobpick');
      check((await page.locator('[data-job-pick] [data-card-pick-panel]').count()) > 0, '転職のカード選び: カードを押すと下に説明の窓が開く', 'jobpick');
      const ja = await hitAt('[data-job-pick] [data-card-pick-action]');
      check(!!ja?.inView && !!ja?.onTop, `転職のカード選び: 「このカードにする」が画面の中で押せる ${JSON.stringify(ja)}`, 'jobpick');
      await page.screenshot({ path: `${OUT}/${H}-jobpick-open.png` });
      await page.locator('[data-job-pick] [data-card-pick-action]').click();
      await wait(600);
      const after = (await save(page)).game.heroes[0];
      check(!after.jobPick?.length && after.deck.some((c) => c.cardId === 'lanceCharge'), '転職のカード選び: 「このカードにする」で決まり、山札に入る', 'jobpick');
      check(!(await page.locator('[data-job-pick]').count()), '転職のカード選び: 決めると閉じる', 'jobpick');
    } catch (e) {
      check(false, `転職のカード選び: 開けない（${e.message.split('\n')[0]}）`, 'jobpick');
    }
    await page.close();
  }
} catch (e) {
  console.log('ERROR', e);
  problems.push(String(e).split('\n')[0]);
}
await browser.close();
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ rows, problems, later }, null, 2));
console.log('\n----- シートごとのスクロール領域の高さ -----');
for (const r of rows) if (!r.missing) console.log(`${r.size} ${r.name}: ${r.scrollH ?? '-'}px（中身 ${r.contentH ?? '-'}px）`);
if (later.length) console.log(`\n後で直す所（別の作業者・${later.length}件）:\n${later.join('\n')}`);
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功（後で直す所を除く）');
process.exit(problems.length ? 1 : 0);
