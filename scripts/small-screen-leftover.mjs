// 公開前の点検 B1（2026-11-15）: 「＋N」の状態の一覧・長押しの説明を開いたまま戦闘が終わっても、
// 結果の画面・ダンジョン・次の戦闘の始めに残らない事を確かめる（small-screen.mjs の SMALL_SCREEN_PARTS=battle から呼ぶ）。
// 1台では、一覧の暗い背景が戦場を覆うので、開いたまま戦闘を終える操作は画面からはできない（2人で遊ぶ時に相手が終えるのと同じ形）。
// そこで確認用の入口（URL に ?debug → window.__online.send）から、画面と同じ道（ストア）で道具袋の煙玉を使い、戦闘を終える。
// 結果の画面のボタンも、一覧が上に乗ったままでも押せるよう、要素の click() で押す。
import { startBattle } from './lib.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 味方の1人目に印を4つ付けて読み込み直す（低い画面で「＋N」が出る） */
async function markAlly(page) {
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const b = d.game.expeditions?.[0]?.battle ?? d.game.battle;
    b.allies[0].statuses = { poison: 2, weak: 1, burn: 1, curse: 2 };
    // 次の行の部屋を、全部同じ戦闘の部屋にする（逃げた後、次の扉で次の戦闘に入る）
    const dg = d.game.expeditions?.[0]?.dungeon ?? d.game.dungeon;
    const r0 = dg.rooms.find((r) => r.id === 'r0c0');
    for (const id of r0.next) {
      const r = dg.rooms.find((x) => x.id === id);
      r.type = r0.type;
      r.enemies = r0.enemies;
      delete r.chest;
      delete r.eventId;
    }
    // 逃げるための煙玉を2つ（1回目の戦闘と、次の戦闘で使う）
    const h = d.game.heroes.find((x) => x.id === b.allies[0].id);
    h.pouch = [...h.pouch.filter((i) => i.itemId !== 'smokeBomb'), { uid: 'chk-smoke-1', itemId: 'smokeBomb' }, { uid: 'chk-smoke-2', itemId: 'smokeBomb' }];
    b.phase = 'ally';
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.getByText('ターン終了').first().waitFor();
  await wait(800);
}

const listShown = (page) => page.locator('[data-status-list]').count();
const detailShown = (page) => page.locator('[data-detail-popup]').count();
const mode = (page) => page.evaluate(() => window.__online?.mode());

/** 味方の「＋N」を押して一覧を開く。開けたら true */
async function openAllyList(page) {
  const more = page.locator('[data-ally] [data-status-more]').first();
  if (!(await more.count())) return false;
  await more.click();
  await wait(300);
  return (await listShown(page)) === 1;
}

/** 開いている窓の上から、戦闘を煙玉で終える（画面と同じ道。1人目の味方が使う） */
async function escapeBattle(page) {
  return page.evaluate(() => {
    const g = window.__online.full();
    const b = g.expeditions?.find((x) => x.battle)?.battle ?? g.battle;
    const a = b.allies.find((x) => !x.dead);
    const h = g.heroes.find((x) => x.id === a.id);
    const item = h.pouch.find((i) => i.itemId === 'smokeBomb');
    if (!item) return '煙玉がありません';
    const cmd = { type: 'USE_POUCH_ITEM', playerId: a.playerId, itemUid: item.uid, userId: a.id, targetId: a.id };
    // ダンジョンの中の場面は、場面の包み（SCENE）に入れて送る（画面の操作と同じ形）
    const scene = window.__online.ui().scene;
    return window.__online.send(scene && scene !== 'world' ? { type: 'SCENE', scene, command: cmd } : cmd);
  });
}

/** 名前のボタンを、上に何が乗っていても押す（要素の click） */
const pressText = (page, re) =>
  page.evaluate((src) => {
    const re = new RegExp(src);
    const b = [...document.querySelectorAll('button')].find((x) => re.test(x.textContent ?? ''));
    b?.click();
    return !!b;
  }, re.source);

export async function leftoverChecks({ browser, BASE, OUT, check, sizes = [[390, 540]] }) {
  const url = BASE + (BASE.includes('?') ? '&' : '?') + 'debug';
  for (const [W, H] of sizes) {
    const tag = `${W}x${H} 窓の残り（B1）`;
    console.log(`\n===== ${tag} =====`);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => check(false, `${tag} pageerror: ${e.message}`, 'battle'));
    await startBattle(page, 2, ['frostWolf'], true, url);
    await page.getByText('ターン終了').first().waitFor();
    await page.waitForFunction(() => !!window.__online, null, { timeout: 5000 });
    await markAlly(page);
    // ① 一覧を開いたまま戦闘が終わる → 結果の画面に一覧が出ていない
    check(await openAllyList(page), `${tag}: 味方の「＋N」で一覧が開く`, 'battle');
    const err = await escapeBattle(page);
    check(!err, `${tag}: 確認用の入口で戦闘を終えられる（${err ?? 'OK'}）`, 'battle');
    await page.getByText('逃走成功').first().waitFor({ timeout: 5000 }).catch(() => {});
    await wait(500);
    await page.screenshot({ path: `${OUT}/leftover-${W}x${H}-result.png` });
    check((await page.getByText('逃走成功').count()) > 0, `${tag}: 結果の画面が出ている`, 'battle');
    check((await listShown(page)) === 0, `${tag}: 結果の画面に状態の一覧が残っていない`, 'battle');
    // ② 結果の画面 → ダンジョン（一覧・説明が出ていない）
    await pressText(page, /ダンジョンへ戻る/);
    await page.waitForFunction(() => window.__online?.mode() === 'dungeon', null, { timeout: 5000 }).catch(() => {});
    await wait(500);
    check((await mode(page)) === 'dungeon', `${tag}: ダンジョンに戻った（${await mode(page)}）`, 'battle');
    check((await listShown(page)) === 0 && (await detailShown(page)) === 0, `${tag}: ダンジョンに一覧・説明が残っていない`, 'battle');
    await page.screenshot({ path: `${OUT}/leftover-${W}x${H}-dungeon.png` });
    // ③ 次の戦闘（次の行の戦闘の部屋。味方の ID は同じ）の始めに一覧が出ていない
    const door = page.getByRole('button', { name: /左の扉|真ん中の扉|右の扉/ }).first();
    if (await door.count()) {
      await door.click();
      await wait(300);
      const open = page.getByRole('button', { name: /扉を開ける/ }).first();
      if (await open.count()) await open.click();
      await page.getByText('ターン終了').first().waitFor({ timeout: 8000 }).catch(() => {});
      await wait(700);
    }
    const m3 = await mode(page);
    check(m3 === 'battle', `${tag}: 次の戦闘に入った（${m3}）`, 'battle');
    await page.screenshot({ path: `${OUT}/leftover-${W}x${H}-next.png` });
    check((await listShown(page)) === 0, `${tag}: 次の戦闘の始めに状態の一覧が出ていない`, 'battle');
    // ④ 長押しの説明（味方）を開いたまま戦闘が終わる → 結果の画面 → ダンジョンで残らない
    if (m3 === 'battle') {
      const ally = page.locator('[data-ally]').first();
      const ab = await ally.boundingBox();
      await page.mouse.move(ab.x + ab.width / 2, ab.y + 12);
      await page.mouse.down();
      await wait(700);
      await page.mouse.up();
      await wait(300);
      check((await detailShown(page)) === 1, `${tag}: 味方の長押しで説明が開く`, 'battle');
      await escapeBattle(page);
      await wait(800);
      check((await detailShown(page)) === 0, `${tag}: 結果の画面に長押しの説明が残っていない`, 'battle');
      await page.screenshot({ path: `${OUT}/leftover-${W}x${H}-detail-result.png` });
    }
    await page.close();
  }
}
