// J3d前半5職: 神殿での転職・初期武器と、戦闘中の能力表示をスマホ3幅で確認する。
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle, URL } from './lib.mjs';
await mkdir('screenshots/special-jobs', { recursive: true });
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
async function cast() {
  const card = page.locator('[data-card-index][data-usable]').first();
  const box = await card.boundingBox(); await page.mouse.click(box.x + 14, box.y + 70);
  await page.waitForTimeout(100);
  if (await page.getByText('敵をタップ').count()) {
    const enemy = page.locator('[data-enemy]:not([data-dead])').first(), eb = await enemy.boundingBox();
    await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
  }
  const go = page.locator('button:has-text("発動")');
  await go.click(); await page.waitForTimeout(500);
}
const config = [
  ['samurai', '侍', 'swordmaster', 'kills:weapon:katana', 10, 'plainKatana', '抜刀一閃', 'samuraiDrawCut'],
  ['magicKnight', '魔剣士', 'swordmaster', 'kills:element', 10, 'copperSword', '炎刃の術', 'bladeFire'],
  ['timeMage', '時魔道士', 'archmage', 'mana', 50, 'apprenticeTome', '時の矢', 'timeStop'],
  ['necromancer', '死霊術師', 'hexer', 'kills:cursed', 5, 'rustyScythe', '冥府の矢', 'graveBolt'],
  ['darkKnight', '暗黒騎士', 'paladin', 'kills:lowHp', 5, 'copperSword', '血刃', 'bloodBlade'],
];
try {
  await startBattle(page, 1, ['forestWolf']);
  const battleBase = await read();
  for (const width of [360, 390, 480]) {
    await page.setViewportSize({ width, height: 780 });
    for (const [id, name, from, feat, count, weapon, signature, cardId] of config) {
      const d = structuredClone(battleBase), g = d.game, h = g.heroes[0], w = g.world;
      g.expeditions = []; g.mode = 'world'; g.party = undefined; g.battle = undefined; g.dungeon = undefined; g.sanctuary = undefined;
      h.classId = from; h.level = 3; h.feats = { [feat]: count }; delete h.equipment.weapon;
      w.story = undefined; w.turn = h.id; w.pos[h.id] = w.tiles.findIndex(t => t.f?.id === 'pilgrimTemple');
      await resume(d);
      await page.getByText('巡礼の神殿に入る', { exact: true }).click();
      await page.getByRole('button', { name: '転職先を見る', exact: true }).click();
      await page.getByRole('button', { name: `${name}に転職する`, exact: true }).click();
      await page.getByRole('dialog').getByText('転職する', { exact: true }).click();
      await page.getByRole('button', { name: signature, exact: true }).click();
      await page.waitForTimeout(250);
      const pickIssues = await layoutIssues(page); check(!pickIssues.length, `${width}px ${name}の転職画面: ${pickIssues}`);
      await page.screenshot({ path: `screenshots/special-jobs/${id}-pick-${width}.png` });
      await page.getByText('このカードにする', { exact: true }).click();
      const changed = await read();
      check(changed.game.heroes[0].classId === id && changed.game.heroes[0].equipment.weapon.itemId === weapon, `${name}の転職・初期武器が不正`);

      // 能力の画面を再現する。判定・支払い・攻撃は画面の操作から実行する。
      const demo = structuredClone(battleBase), exp = demo.game.expeditions[0], b = exp.battle, a = b.allies[0];
      demo.game.heroes[0].classId = a.classId = id; a.abilities = [];
      b.phase = 'ally'; b.enemies[0].hp = b.enemies[0].maxHp = 9999; b.enemies[0].block = 0;
      a.hp = 50; a.maxHp = 100; a.mana = 20; a.focus = 6;
      a.hand = [{ uid: 'demoCard', cardId }]; a.exhaustedCards = [];
      if (id === 'samurai') a.attackCharge = { multiplier: 4, category: 'physical' };
      if (id === 'necromancer') {
        b.enemies.push({ ...structuredClone(b.enemies[0]), uid: 'survivingEnemy' });
        b.enemies[0].hp = 1;
      }
      await resume(demo);
      if (id === 'samurai') check(await page.locator('[data-attack-charge]').count() === 1, '居合の倍率が見えない');
      if (id === 'darkKnight') {
        const low = structuredClone(demo); low.game.expeditions[0].battle.allies[0].hp = 3;
        await resume(low); check(await page.locator('[data-card-index][data-usable]').count() === 0, 'HP不足でも使える表示になる');
        await resume(demo);
      }
      await cast();
      const after = await read(), result = after.game.expeditions[0].battle;
      if (id === 'samurai') check(!result.allies[0].attackCharge, '居合を消費しない');
      if (id === 'magicKnight') check(await page.locator('[data-imbued-element]').count() === 1, '魔法剣の属性が見えない');
      if (id === 'timeMage') check(result.enemies[0].skipNextAction && await page.getByText('休み', { exact: true }).count() > 0, '時間停止の表示がない');
      if (id === 'necromancer') check(result.allies[0].summons?.length === 1, '屍兵が増えない');
      if (id === 'darkKnight') check(result.allies[0].hp === 47, 'HPを先に支払っていない');
      const battleIssues = await layoutIssues(page); check(!battleIssues.length, `${width}px ${name}の戦闘画面: ${battleIssues}`);
      await page.screenshot({ path: `screenshots/special-jobs/${id}-battle-${width}.png` });
      console.log(`OK: ${width}px ${name}の転職・初期武器・能力表示`);
    }
  }
  // 4人分の能力表示が同時に出てもはみ出さないことを確認する。
  await page.setViewportSize({ width: 360, height: 780 });
  await startBattle(page, 4, ['forestWolf']);
  const four = await read(), b = four.game.expeditions[0].battle;
  const roles = ['samurai', 'magicKnight', 'timeMage', 'necromancer'];
  b.allies.forEach((a, i) => { a.classId = roles[i]; a.abilities = []; four.game.heroes[i].classId = roles[i]; });
  b.allies[0].attackCharge = { multiplier: 4, category: 'physical' };
  b.allies[1].imbuedElement = 'fire';
  b.allies[3].summons = [1, 2, 3].map(i => ({ id: `skeletonSoldier:${i}`, group: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: 3, turns: 99 }));
  b.enemies[0].skipNextAction = true;
  await resume(four);
  const fourIssues = await layoutIssues(page); check(!fourIssues.length, `4人の能力表示: ${fourIssues}`);
  await page.screenshot({ path: 'screenshots/special-jobs/four-party-360.png' });
  console.log('OK: 360px 4人の居合・魔法剣・時間停止・屍兵の同時表示');
  check(!errors.length, errors.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'screenshots/special-jobs/failure.png' });
  throw error;
} finally { await browser.close(); }
