// 後半③〜⑥: 設定・開幕のお供・追撃/継承・支援・4人のトークンと短い表示を確認する。
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle, URL } from './lib.mjs';
const dir = 'screenshots/battle-feedback'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.setDefaultTimeout(10000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
const check = (ok, text) => { if (!ok) throw new Error(text); };
const read = async () => { await page.waitForTimeout(300); return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure'))); };
async function resume(d, fast = false, mode = 'standard') {
  // 進行中の敵フェーズの保存が確認用データを上書きしないよう、先にタイトルへ戻す。
  await page.reload();
  await page.evaluate(({ d, fast, mode }) => {
    localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: fast, vibration: false, cutinMode: mode }));
  }, { d, fast, mode });
  await page.reload(); await page.getByText('つづきから', { exact: true }).click(); await page.waitForTimeout(150);
}
async function shot(name) {
  const issues = await layoutIssues(page); check(!issues.length, `${name}: ${issues}`);
  // グローバルのお知らせも検査する（game-bgの外にある）。
  const bad = await page.locator('[data-ability-cutin]').evaluateAll(es => es.some(e => {
    const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.bottom > innerHeight;
  })); check(!bad, 'お供カットインが画面外');
  await page.screenshot({ path: `${dir}/${name}.png` });
}
async function observe() {
  await page.evaluate(() => {
    window.feedback = { notices: [], cutinTexts: [], pulses: [], motions: [], texts: [] };
    window.feedbackObserver?.disconnect();
    const record = () => {
      for (const e of document.querySelectorAll('[data-ability-cutin]')) if (!window.feedback.notices.includes(e.getAttribute('data-ability-cutin'))) window.feedback.notices.push(e.getAttribute('data-ability-cutin'));
      for (const e of document.querySelectorAll('[data-ability-cutin]')) if (!window.feedback.cutinTexts.includes(e.textContent)) window.feedback.cutinTexts.push(e.textContent);
      for (const e of document.querySelectorAll('[data-pet-pulse]')) if (!window.feedback.pulses.includes(e.getAttribute('data-pet-owner'))) window.feedback.pulses.push(e.getAttribute('data-pet-owner'));
      for (const e of document.querySelectorAll('[data-unit-motion]')) {
        const key = `${e.getAttribute('data-motion-unit')}:${e.getAttribute('data-unit-motion')}`;
        if (!window.feedback.motions.includes(key)) window.feedback.motions.push(key);
      }
      for (const e of document.querySelectorAll('[data-popup-tone]')) if (!window.feedback.texts.includes(e.textContent)) window.feedback.texts.push(e.textContent);
    };
    window.feedbackObserver = new MutationObserver(record); window.feedbackObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
  });
}
async function cast(id, focus = 0) {
  await page.locator(`[data-ally="${id}"]`).click();
  const box = await page.locator('[data-card-index][data-usable]').first().boundingBox();
  await page.mouse.click(box.x + 14, box.y + 70); await page.waitForTimeout(70);
  if (await page.getByText('敵をタップ').count()) {
    const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox(); await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
  }
  for (let i = 0; i < focus; i++) await page.getByLabel('フォーカスを増やす').click();
  await page.locator('button:has-text("発動")').click();
}
try {
  await startBattle(page, 4, ['forestWolf', 'forestWolf'], false); const base = await read();
  const species = ['cockatiel', 'turtle', 'redPanda', 'rabbit'], colors = ['normal', 'green', 'brown', 'white'];
  for (const width of (process.env.FEEDBACK_WIDTHS ?? '360,390,480').split(',').map(Number)) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto(URL); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false })); }); await page.reload();
    await page.getByText('設定', { exact: true }).click();
    check(await page.getByRole('button', { name: '高速', exact: true }).getAttribute('aria-pressed') === 'true', '旧高速設定が失われた');
    check(await page.getByRole('button', { name: '標準', exact: true }).getAttribute('aria-pressed') === 'true', '旧設定に標準が補完されない');
    await page.getByRole('button', { name: '通常', exact: true }).click(); await page.getByRole('button', { name: '簡易', exact: true }).click();
    await shot(`settings-title-${width}`);
    await page.reload(); await page.getByText('設定', { exact: true }).click();
    check(await page.getByRole('button', { name: '通常', exact: true }).getAttribute('aria-pressed') === 'true' && await page.getByRole('button', { name: '簡易', exact: true }).getAttribute('aria-pressed') === 'true', '設定が再開で戻る');

    const d = structuredClone(base), g = d.game, w = g.world;
    g.expeditions = []; g.mode = 'world'; delete g.battle; delete g.dungeon; delete g.party;
    w.story = undefined; w.turn = 'h0'; w.acted = [];
    const temple = w.tiles.findIndex(t => t.f?.id === 'emeraldTemple');
    g.heroes.forEach((h, i) => {
      h.classId = ['swordSaint', 'necromancer', 'bard', 'gambler'][i]; w.pos[h.id] = temple;
      h.pet = { petId: species[i], color: colors[i], name: ['ぴーちゃん', 'カメキチ', 'ふうた', 'ぴょん'][i], love: 0, acts: 0 };
    }); g.heroes[0].carried = 'swordmaster';
    await resume(d); await page.getByText('翠の神殿に入る', { exact: true }).click();
    if (await page.getByText('探索力の判定').count()) await page.getByText('探索力の判定').click();
    await page.getByLabel('戦闘', { exact: true }).first().click(); await observe();
    await page.getByText('この部屋へ進む', { exact: true }).click();
    await page.locator('[data-ability-cutin]').first().waitFor(); await shot(`opening-four-${width}`);
    await page.waitForTimeout(1600);
    const opening = await page.evaluate(() => window.feedback);
    check(opening.notices.length === 4 && opening.pulses.length === 4, `4人全員のお供が発動しない: ${JSON.stringify(opening)}`);
    const battle = await read(), b = battle.game.expeditions[0].battle;
    b.enemies.forEach(e => { e.hp = e.maxHp = 10000; e.block = 0; });
    b.allies.forEach((a, i) => { a.hp = a.maxHp = 1000; a.mana = 20; a.focus = 6; a.hand = [{ uid: `test${i}`, cardId: ['strike', 'graveBolt', 'bardCourage', 'gambleStrike'][i] }]; });
    b.allies[1].summons = [1, 2, 3].map(i => ({ id: `skeleton:${i}`, group: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: 3, turns: 99 }));
    b.allies[1].summons.push({ id: 'turret', name: '砲台', icon: '⚙', damage: 3, turns: 3, targetId: b.enemies[0].uid }, { id: 'mechanicalTrap', name: '罠', icon: '◇', damage: 0, turns: 3, targetId: b.enemies[0].uid, trigger: 'enemyBeforeAction', effects: [{ kind: 'damage', amount: 3 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] });
    await resume(battle); await page.waitForTimeout(900);
    check(await page.locator('[data-ability-cutin]').count() === 0, '保存再開で開幕通知を再生した');
    await page.getByLabel('メニュー', { exact: true }).click(); await shot(`settings-menu-${width}`); await page.getByLabel('閉じる', { exact: true }).click();
    await observe(); await cast('h0', 1);
    await page.locator('[data-popup-tone="ability"]').filter({ hasText: '継承' }).waitFor(); await shot(`attack-inherited-${width}`);
    const trace = await page.evaluate(() => window.feedback);
    check(trace.motions.indexOf('h0:attack') < trace.motions.indexOf('e0:hit'), '攻撃と被弾の順が逆');
    check(trace.texts.some(t => t.includes('二の太刀')) && trace.texts.some(t => t.includes('継承：見切り')), '現職・引き継ぎが表示されない');
    await page.waitForTimeout(900); await cast('h2'); await page.locator('[data-popup-tone="ability"]').filter({ hasText: '歌の余韻' }).waitFor(); await shot(`support-four-${width}`);
    check((await read()).game.expeditions[0].battle.allies.every(a => a.statuses.songInspired === 1), '歌が4人に付かない');

    const end = structuredClone(battle), a = end.game.expeditions[0].battle.allies[0];
    end.game.heroes[0].pet = a.pet = { petId: 'wolfPup', color: 'gray', name: 'ロウ', love: 0, acts: 0 };
    a.abilities = [{ name: 'ロウの噛みつき', pet: true, source: { kind: 'pet', id: 'wolfPup', label: 'ロウ', effectName: '噛みつき' }, effect: { when: 'turnEnd', do: [{ kind: 'damageByPlays', per: 2, category: 'physical' }] } }]; a.playedBy = { physical: 2 };
    end.game.expeditions[0].battle.allies.forEach(a => { a.mana = 0; a.hand = []; });
    await resume(end, true, 'simple'); await observe(); await page.locator('button:has-text("ターン終了")').click();
    await page.waitForFunction(() => window.feedback.cutinTexts.some(t => t.includes('噛みつき') && t.includes('ロウ'))); await shot(`simple-pet-followup-${width}`);
    console.log(`OK: ${width}px 設定保存・4人の開幕/お供/屍兵/砲台/罠・攻撃/継承/歌・簡易高速の追撃`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await read(), rb = reduced.game.expeditions[0].battle;
  rb.phase = 'ally'; rb.allies[0].mana = 20; rb.allies[0].focus = 6; rb.allies[0].hand = [{ uid: 'reduced', cardId: 'strike' }];
  await resume(reduced, false, 'standard'); await observe(); await cast('h0', 1);
  await page.waitForFunction(() => window.feedback.motions.includes('h0:attack'));
  check(await page.locator('[data-motion-unit="h0"]').evaluate(e => getComputedStyle(e).transform) === 'none', 'OS動作軽減でも踏み込みが動く');
  await shot('reduced-motion-attack');
  await page.getByLabel('メニュー', { exact: true }).click(); await shot('reduced-motion-menu');
  check(!errors.length, errors.join('\n')); console.log('OK: OS動作軽減・画面例外なし');
} catch (error) { await writeFile(`${dir}/failure.json`, JSON.stringify(await page.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('card-rpg/adventure')), trace: window.feedback, text: document.body.innerText })), null, 2)); await page.screenshot({ path: `${dir}/failure.png` }); throw error; }
finally { await browser.close(); }
