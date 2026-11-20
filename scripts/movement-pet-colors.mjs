// 移動→到着→遭遇/イベントの順序と、抽選済み毛色の保存再開を画面から確認する。
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle, waitForWorldMovement } from './lib.mjs';
const dir = 'screenshots/movement-pet-colors'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.setDefaultTimeout(10000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
const check = (ok, text) => { if (!ok) throw new Error(text); };
const read = async () => { await page.waitForTimeout(300); return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure'))); };
async function resume(d, fastMode) {
  await page.evaluate(({ d, fastMode }) => {
    localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode, vibration: false, firstGuide: false }));
  }, { d, fastMode });
  await page.reload(); await page.getByText('つづきから', { exact: true }).click(); await page.waitForTimeout(200);
}
async function shot(name) {
  const issues = await layoutIssues(page); check(!issues.length, `${name}: ${issues}`);
  await page.screenshot({ path: `${dir}/${name}.png` });
}
try {
  await startBattle(page, 2, ['forestWolf']); const base = await read();
  function fixture(kind) {
    const d = structuredClone(base), g = d.game, w = g.world;
    g.mode = 'world'; g.expeditions = []; delete g.battle; delete g.dungeon; delete g.party; delete g.event; delete g.encounter;
    w.story = undefined; w.move = 6; w.turn = 'h0'; w.acted = []; w.lastMove = undefined; w.moveProposal = undefined;
    const enemy = structuredClone(w.wanderers[0]); w.wanderers = [];
    w.tiles.forEach(t => { t.t = 'road'; t.f = undefined; t.seen = true; }); w.visitedRegions = Array.from({ length: 100 }, (_, i) => i);
    for (const h of g.heroes) { w.pos[h.id] = 0; h.lastRandomEvent = w.worldTurn; }
    g.heroes[0].pet = { petId: 'cockatiel', color: 'lutino', name: 'ぴーちゃん', love: 0, acts: 0 };
    if (kind === 'encounter') { enemy.tile = 3; w.wanderers = [enemy]; }
    if (kind === 'facility') w.tiles[3].f = { kind: 'temple', id: 'pilgrimTemple' };
    if (kind === 'event') {
      delete g.heroes[0].lastRandomEvent;
      // 最初の抽選が20%未満になる固定状態（ゲーム側は通常のRngを使う）。
      g.rngState = 7;
    }
    return d;
  }
  for (const width of [360, 390, 480]) {
    await page.setViewportSize({ width, height: 780 });
    for (const fast of [false, true]) for (const kind of ['normal', 'encounter', 'event', 'facility']) {
      await resume(fixture(kind), fast);
      const target = page.locator('[data-reach="3"]'); await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.evaluate(() => {
        window.moveTrace = []; window.moveViolation = [];
        window.moveObserver?.disconnect();
        const record = () => {
          const e = document.querySelector('[data-world-moving]'); if (!e) return;
          const i = Number(e.getAttribute('data-move-index')), phase = e.getAttribute('data-world-moving');
          const tile = Number(document.querySelector('[data-hero="h0"]').getAttribute('data-tile'));
          const last = window.moveTrace.at(-1);
          if (!last || last.i !== i || last.phase !== phase) window.moveTrace.push({ i, tile, phase });
          if (document.querySelector('[data-event-window], [data-hero-task]') || [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '戦う')) window.moveViolation.push('移動中に次の操作画面');
        };
        window.moveObserver = new MutationObserver(record); window.moveObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
      });
      await page.locator('button:has-text("移動する")').click();
      await page.locator('[data-world-moving]').waitFor();
      // タップしても移動を飛ばせない。
      await page.mouse.click(10, 25);
      await page.waitForFunction(() => window.moveTrace.some(r => r.phase === 'arrival'));
      if (!fast) await shot(`${kind}-arrival-${width}`);
      await waitForWorldMovement(page);
      const trace = await page.evaluate(() => ({ rows: window.moveTrace, violations: window.moveViolation }));
      check(JSON.stringify(trace.rows.filter(r => r.phase === 'steps').map(r => r.tile)) === '[0,1,2,3]', `${kind} ${width}: ${JSON.stringify(trace)}`);
      check(!trace.violations.length && trace.rows.at(-1).phase === 'arrival', '表示の順序が不正');
      const saved = await read();
      if (kind === 'encounter') {
        check(saved.game.mode === 'encounter' && !saved.game.battle, '遭遇を飛ばして戦闘になった');
        check(await page.getByText('戦う', { exact: true }).count() > 0, '遭遇のボタンがない');
      } else if (kind === 'event') {
        check(saved.game.mode === 'event' && await page.locator('[data-event-window]').count() > 0, '到着後にイベントが出ない');
      } else if (kind === 'facility') {
        await page.getByText('巡礼の神殿に入る', { exact: true }).click();
        check((await read()).game.mode === 'sanctuary', '施設に入れない');
      } else check(saved.game.mode === 'world', '通常の移動先が不正');
      if (!fast) await shot(`${kind}-after-${width}`);
      console.log(`OK: ${width}px ${fast ? '高速' : '通常'} ${kind}の3マス・到着・画面切替順序`);
    }
    const d = fixture('normal'), h = d.game.heroes[0]; h.petOffer = ['cockatiel', 'rabbit']; h.petOfferColors = { cockatiel: 'pearl', rabbit: 'brown' };
    await resume(d, false); await page.locator('[data-pet-revealed]').waitFor();
    check(await page.locator('[data-pet-coat="pearl"]').count() === 1 && await page.locator('[data-rare-coat]').count() === 1, '珍しい毛色が出ない');
    await shot(`rare-coat-${width}`);
    await page.locator('[data-pet-pick="rabbit"]').click(); await page.locator('[data-pet-revealed]').waitFor();
    check(await page.locator('[data-pet-coat="brown"]').count() === 1, '候補の色が固定されない');
    await page.locator('[data-pet-pick="cockatiel"]').click();
    await resume(await read(), false); await page.locator('[data-pet-revealed]').waitFor(); check(await page.locator('[data-pet-coat="pearl"]').count() === 1, '再開で色が変わった');
    await page.getByLabel('お供の名前').fill('ぴーちゃん'); await page.getByText('お供にする', { exact: true }).click();
    const after = await read(); check(after.game.heroes[0].pet.color === 'pearl' && after.game.heroes[0].pet.name === 'ぴーちゃん', '採用で色/名前が変わった');
    check(after.game.log.some(l => l.text.includes('✨珍しい毛色！')), '珍しい色のログがない');
    console.log(`OK: ${width}px 珍しい毛色・候補切替・保存再開・名前・採用ログ`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' }); await resume(fixture('encounter'), false);
  const box = await page.locator('[data-reach="3"]').boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator('button:has-text("移動する")').click(); await page.locator('[data-world-moving]').waitFor(); await waitForWorldMovement(page);
  check((await read()).game.mode === 'encounter', '動作軽減で遭遇を飛ばした');
  check(!errors.length, errors.join('\n')); console.log('OK: OS動作軽減でも順序維持・画面例外なし');
} catch (e) { await page.screenshot({ path: `${dir}/failure.png` }); throw e; }
finally { await browser.close(); }
