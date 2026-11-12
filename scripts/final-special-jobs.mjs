// J3d後半5職の転職・武器・能力と、星読みの保存再開・4人表示を確認する。
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle } from './lib.mjs';
import { loadJobData } from './gameData.mjs';
const dir = 'screenshots/final-special-jobs';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const check = (ok, msg) => { if (!ok) throw new Error(msg); };
const read = async () => { await page.waitForTimeout(300); return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure'))); };
async function resume(d) {
  await page.evaluate(d => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), d);
  await page.reload(); await page.getByText('つづきから', { exact: true }).click(); await page.waitForTimeout(300);
}
async function select() {
  const box = await page.locator('[data-card-index][data-usable]').first().boundingBox();
  await page.mouse.click(box.x + 14, box.y + 70); await page.waitForTimeout(100);
  if (await page.getByText('敵をタップ').count()) {
    const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
    await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
  }
}
async function shot(name) {
  const issues = await layoutIssues(page); check(!issues.length, `${name}: ${issues}`);
  await page.screenshot({ path: `${dir}/${name}.png` });
}
// 特殊ジョブへ転職できるレベルと条件の数は、ゲームのデータから読む（数が変わってもここは直さなくてよい）
const { jobLevel, jobRequires } = await loadJobData();
const config = [
  ['shrineMaiden', '巫女', 'bishop', 'prayers', 'woodScepter', '癒やしの祝詞', 'divinePossession'],
  ['astrologer', '占星術師', 'bishop', 'perfects:luk', 'apprenticeTome', '魔力の矢', 'cmArcaneArrow'],
  ['machinist', '機工士', 'archer', 'checks:mechanism', 'antiqueGun', '精密射撃', 'placeTrap'],
  ['bard', '吟遊詩人', 'phantomThief', 'support:others', 'travelerLute', '勇気の歌', 'bardCourage'],
  ['gambler', '賭博師', 'phantomThief', 'checks:luk', 'rustyDagger', '勝負の一撃', 'gambleStrike'],
];
try {
  await startBattle(page, 1, ['forestWolf']);
  const base = await read();
  for (const width of [360, 390, 480]) {
    await page.setViewportSize({ width, height: 780 });
    for (const [id, name, from, feat, weapon, signature, cardId] of config) {
      const req = jobRequires(id);
      check(req?.feat === feat, `${name}: 条件の種類がデータと違う（${req?.feat}）`);
      const count = req?.count ?? 1;
      const d = structuredClone(base), g = d.game, h = g.heroes[0], w = g.world;
      g.expeditions = []; g.mode = 'world'; g.party = undefined; g.battle = undefined; g.dungeon = undefined; g.sanctuary = undefined;
      h.classId = from; h.level = jobLevel(id); h.feats = { [feat]: count }; delete h.equipment.weapon;
      w.story = undefined; w.turn = h.id; w.pos[h.id] = w.tiles.findIndex(t => t.f?.id === 'pilgrimTemple');
      await resume(d);
      await page.getByText('巡礼の神殿に入る', { exact: true }).click();
      await page.getByRole('button', { name: '転職先を見る', exact: true }).click();
      await page.getByRole('button', { name: `${name}に転職する`, exact: true }).click();
      await page.getByRole('dialog').getByText('転職する', { exact: true }).click();
      check(await page.locator('[data-job-pick] button[aria-pressed]').count() === 3, `${name}の代表カードが3枚でない`);
      await page.getByRole('button', { name: signature, exact: true }).click();
      await shot(`${id}-pick-${width}`);
      await page.getByText('このカードにする', { exact: true }).click();
      const changed = (await read()).game.heroes[0];
      check(changed.classId === id && changed.equipment.weapon.itemId === weapon, `${name}の転職・初期武器が不正`);
      const demo = structuredClone(base), b = demo.game.expeditions[0].battle, a = b.allies[0];
      demo.game.heroes[0].classId = a.classId = id; a.abilities = [];
      b.phase = 'ally'; b.enemies[0].hp = b.enemies[0].maxHp = 9999; b.enemies[0].block = 0;
      a.hp = 50; a.maxHp = 100; a.mana = 20; a.focus = 6;
      a.hand = [{ uid: 'demoCard', cardId }]; a.exhaustedCards = [];
      if (id === 'machinist') a.summons = [{ id: 'turret', group: 'turret', name: '砲台', icon: '⚙', damage: 3, turns: 3, targetId: b.enemies[0].uid }];
      await resume(demo); await select();
      if (id === 'astrologer') {
        await page.locator('[data-preview-start]').click();
        const saved = await read(), p = saved.game.expeditions[0].battle.slotPreview;
        check(p && !p.rerolled, '星読みが保存されない'); await shot(`star-preview-${width}`);
        await resume(saved);
        check(JSON.stringify((await read()).game.expeditions[0].battle.slotPreview) === JSON.stringify(p), '再開で星読みが変化');
        await page.getByRole('button', { name: '振り直す（残り1回）', exact: true }).click();
        const rerolled = await read(), rb = rerolled.game.expeditions[0].battle;
        check(rb.slotPreview.rerolled && rb.rngState === saved.game.expeditions[0].battle.rngState, '振り直し時に再抽選');
        await shot(`star-rerolled-${width}`); await resume(rerolled);
        check((await read()).game.expeditions[0].battle.slotPreview.rerolled, '振り直し済み状態が戻る');
        await page.getByRole('button', { name: 'この結果で使う', exact: true }).click();
      } else await page.locator('button:has-text("発動")').click();
      await page.waitForTimeout(500);
      const result = (await read()).game.expeditions[0].battle;
      if (id === 'astrologer') check(!result.slotPreview && result.allies[0].slotPreviewUsed === 1 && result.allies[0].mana === 19, '星読みの確定・支払いが不正');
      if (id === 'shrineMaiden') check(result.allies[0].hp === 44 && result.allies[0].statuses.possession === 3, '神降ろしが不正');
      if (id === 'machinist') check(result.allies[0].summons.length === 2, '砲台と罠が揃わない');
      if (id === 'bard') check(result.allies[0].statuses.songInspired === 1, '歌が付与されない');
      await shot(`${id}-battle-${width}`);
      console.log(`OK: ${width}px ${name}の代表3枚・転職・初期武器・能力・保存再開`);
    }
  }
  await startBattle(page, 4, ['forestWolf']);
  const four = await read(), b = four.game.expeditions[0].battle;
  b.allies.forEach((a, i) => { a.classId = ['astrologer', 'machinist', 'bard', 'gambler'][i]; a.abilities = []; four.game.heroes[i].classId = a.classId; });
  b.allies[1].summons = [
    { id: 'turret', group: 'turret', name: '砲台', icon: '⚙', damage: 3, turns: 3, targetId: b.enemies[0].uid },
    { id: 'mechanicalTrap', group: 'mechanicalTrap', name: '罠', icon: '◇', damage: 0, turns: 3, targetId: b.enemies[0].uid, trigger: 'enemyBeforeAction', effects: [{ kind: 'damage', amount: 3 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ];
  b.allies[1].pet = { petId: 'cockatiel', color: 'normal', name: 'ピコ', love: 1 };
  for (const width of [360, 390, 480]) {
    await page.setViewportSize({ width, height: 780 }); await resume(four);
    check(await page.locator('[data-summons]').count() > 0 && await page.locator('[data-pet="cockatiel"]').count() > 0, '砲台・罠・お供が表示されない');
    await shot(`four-party-${width}`);
    console.log(`OK: ${width}px 4人の砲台・罠・お供の同時表示`);
  }
  check(!errors.length, errors.join('\n'));
} catch (error) { await page.screenshot({ path: `${dir}/failure.png` }); throw error; }
finally { await browser.close(); }
