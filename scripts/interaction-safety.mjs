// 対象の変更・星読み保存再開・共同施設・新規開始を実際の画面で確認する。
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle, URL } from './lib.mjs';
const dir = 'screenshots/interaction-safety'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.setDefaultTimeout(10000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
const check = (ok, text) => { if (!ok) throw new Error(text); };
const read = async () => { await page.waitForTimeout(250); return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure'))); };
const battleOf = d => d.game.expeditions?.find(x => x.battle)?.battle ?? d.game.battle;
async function resume(d) {
  await page.reload();
  await page.evaluate(d => { localStorage.setItem('card-rpg/adventure', JSON.stringify(d)); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true })); }, d);
  await page.reload(); await page.getByText('つづきから', { exact: true }).click(); await page.waitForTimeout(150);
}
async function shot(name) {
  const issues = await layoutIssues(page); check(!issues.length, `${name}: ${issues.join(', ')}`);
  await page.screenshot({ path: `${dir}/${name}.png` });
}
try {
  await startBattle(page, 4, ['forestWolf','forestWolf']); const base = await read();
  for (const width of [360,390,480]) {
    await page.setViewportSize({ width, height: 780 });
    const d = structuredClone(base), b = battleOf(d);
    d.activeId = b.allies[0].id;
    b.allies.forEach((a,i) => { a.hp = 10+i; a.maxHp = 100; a.name = `仲間${i+1}`; a.mana = 20; a.playerId = `P${i+1}`; });
    b.allies[0].classId = 'astrologer'; b.allies[0].slotPreviewUsed = 0;
    b.allies[0].hand = [{ uid: 'uxheal', cardId: 'mend' }];
    b.allies[0].pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 3 };
    b.allies[1].summons = [{ id: 's1', name: '砲台', icon: '▣', damage: 3, turns: 3, targetId: b.enemies[1].uid }, { id: 's2', name: '罠', icon: '◇', damage: 0, turns: 3, targetId: b.enemies[1].uid, trigger: 'enemyBeforeAction', effects: [{kind:'damage',amount:3}] }];
    b.allies[1].statuses.possession = 3; b.enemies[0].intent.targetId = b.allies[1].id;
    await resume(d);
    const cb = await page.locator('[data-card-index]').first().boundingBox(); await page.mouse.click(cb.x+14, cb.y+70);
    await page.locator(`[data-ally="${b.allies[2].id}"]`).click();
    check((await page.locator('[data-target-guide]').innerText()).includes('仲間3'), '味方の対象を変更できない');
    check(await page.locator(`[data-ally="${b.allies[2].id}"][data-selected-target]`).count(), '対象の強調がない');
    await shot(`${width}-ally-target`);
    await page.locator('[data-preview-start]').click();
    check((await page.locator('[data-slot-preview]').innerText()).includes('対象：仲間3'), '星読みの味方対象が違う');
    await shot(`${width}-preview`);
    const reserved = await read(); await resume(reserved);
    check((await page.locator('[data-slot-preview]').innerText()).includes('対象：仲間3'), '保存再開で対象がずれた');
    await page.getByRole('button', { name: '振り直す（残り1回）' }).click();
    await page.getByRole('button', { name: 'この結果で使う' }).click();
    const after = battleOf(await read()); check(after.allies[2].hp > 12 && after.allies[1].hp === 11, '選んだ仲間だけに回復していない');
    await page.locator('[data-summons]').first().click();
    check((await page.getByText('仲間2の特殊効果', { exact: true }).count()) > 0, '砲台・罠の詳細がない');
    await shot(`${width}-token-detail`); await page.getByText('詳細を閉じる', { exact: true }).click();
    await page.locator('[data-status="possession"]').click();
    check(await page.getByText('神降ろし 3', { exact: true }).count(), '状態の詳細が出ない');
    await shot(`${width}-status-detail`); await page.evaluate(() => history.back());
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].some(b => b.textContent === '詳細を閉じる'));
    check(await page.locator('[data-ally]').count() === 4, '戻る操作が詳細ではなく冒険を閉じた');
    await page.getByRole('button', { name: 'ぴーちゃんの詳細' }).click();
    check(await page.getByText('ぴーちゃん（オカメインコ）', { exact: true }).count(), 'お供の詳細がない');
    await shot(`${width}-pet-detail`); await page.getByText('詳細を閉じる', { exact: true }).click();
    const enemy = structuredClone(d), eb = battleOf(enemy);
    eb.allies[0].hand = [{ uid: 'uxstop', cardId: 'timeStop' }];
    await resume(enemy);
    const ec = await page.locator('[data-card-index]').first().boundingBox(); await page.mouse.click(ec.x+14, ec.y+70);
    await page.locator('[data-enemy]').nth(1).click({ position: { x: 10, y: 20 } });
    await shot(`${width}-enemy-target`);
    await page.getByRole('button', { name: /発動/ }).click();
    const stopped = battleOf(await read()); check(stopped.enemies[1].skipNextAction && !stopped.enemies[0].skipNextAction, '敵単体の対象が先頭へ飛んだ');
    const mixed = structuredClone(d), mb = battleOf(mixed);
    mb.allies[0].hand = [{ uid: 'uxmixed', cardId: 'sanctify' }];
    await resume(mixed);
    const mc = await page.locator('[data-card-index]').first().boundingBox(); await page.mouse.click(mc.x+14, mc.y+70);
    await page.locator('[data-enemy]').nth(1).click({ position: { x: 10, y: 20 } });
    await page.locator(`[data-ally="${mb.allies[2].id}"]`).click();
    check((await page.locator('[data-secondary-target-guide]').innerText()).includes('仲間3'), '複合カードの回復先を選べない');
    await page.getByLabel('フォーカスを増やす').click(); await page.getByLabel('フォーカスを増やす').click();
    await page.locator('[data-preview-start]').click();
    const mixedSaved = await read(); await resume(mixedSaved);
    check((await page.locator('[data-slot-preview]').innerText()).includes('回復・支援先：仲間3'), '複合カードの保存再開で回復先がずれた');
    await shot(`${width}-mixed-preview`); await page.getByRole('button', { name: 'この結果で使う' }).click();
    const mixedAfter = battleOf(await read()); check(mixedAfter.allies[2].hp > 12 && mixedAfter.allies[1].hp === 11 && mixedAfter.enemies[1].hp < mb.enemies[1].hp && mixedAfter.enemies[0].hp === mb.enemies[0].hp, '複合カードの攻撃先・回復先が違う');
    const town = structuredClone(base), g = town.game;
    g.mode = 'town'; g.expeditions = []; g.battle = undefined; g.party = g.heroes.map(h => h.id);
    g.town = { townId: 'royalCapital', heroId: g.heroes[0].id, members: [...g.party] };
    g.heroes.forEach((h,i) => { h.playerId = `P${i+1}`; h.name = `仲間${i+1}`; h.gold = 200; h.hp = 1; g.world.pos[h.id] = g.world.pos[g.heroes[0].id]; });
    await resume(town); await page.locator('[data-facility-members] button').nth(1).click();
    await page.getByText('宿屋', { exact: true }).click(); await shot(`${width}-town-p2`);
    await page.getByRole('button', { name: /泊まる/ }).click();
    const inn = await read(); check(inn.game.heroes[1].hp > 1 && inn.game.heroes[0].hp === 1 && inn.game.heroes[0].gold === 200, 'P2の宿泊が別のキャラに作用した');
    await page.getByText('世界マップへ', { exact: true }).click(); check((await read()).game.mode === 'world', '共同施設を退出できない');
    console.log(`${width}px: 味方対象・星読み保存再開・砲台/罠/お供詳細・P2施設利用 OK`);
  }
  // フェーズ1: 全員満タンの時の回復カード。最初の相手は敵の予告のダメージが一番大きい味方、予測は「回復の力（今は満タン）」、使う人と対象の印
  {
    await page.setViewportSize({ width: 390, height: 780 });
    const d = structuredClone(base), b = battleOf(d);
    d.activeId = b.allies[0].id;
    b.allies.forEach((a, i) => { a.hp = 100; a.maxHp = 100; a.name = `仲間${i + 1}`; a.mana = 20; a.playerId = 'P1'; });
    b.allies[0].hand = [{ uid: 'uxheal', cardId: 'mend' }];
    for (const e of b.enemies) if (e.intent) e.intent.targetId = b.allies[2].id;
    await resume(d);
    const cb = await page.locator('[data-card-index]').first().boundingBox(); await page.mouse.click(cb.x + 14, cb.y + 70);
    check((await page.locator('[data-target-guide]').innerText()).includes('仲間3'), '全員満タンの時、狙われている味方が最初の相手にならない');
    const pred = await page.locator('[data-card-predictions]').innerText();
    check(/HP回復 \+\d+／\+\d+／\+\d+（今は満タン）/.test(pred) && !pred.includes('効果は上の表示を確認'), `満タンの回復の予測が違う: ${pred}`);
    check(await page.locator(`[data-ally-sprite="${b.allies[2].id}"] [data-ally-role="target"]`).count() === 1, '立ち絵に「対象」の印が無い');
    check(await page.locator(`[data-ally-sprite="${b.allies[0].id}"] [data-ally-role="user"]`).count() === 1, '立ち絵に「使う人」の印が無い');
    await shot('390-heal-full');
    console.log('満タンの回復・最初の相手・使う人と対象の印 OK');
  }
  // 中断データを保った取消と、承認後の新規作成を両方確認する。
  await page.reload(); const before = await read();
  page.once('dialog', dialog => dialog.dismiss()); await page.getByText('新しい冒険', { exact: true }).click();
  check(JSON.stringify(await read()) === JSON.stringify(before), '新規開始の取消で保存が変わった');
  page.once('dialog', dialog => dialog.accept()); await page.getByText('新しい冒険', { exact: true }).click();
  check(await page.getByText('キャラクター作成へ', { exact: true }).count(), '新しい冒険の作成画面に進まない');
  check(await read() === null, '承認後も古い冒険が残る'); await shot('new-adventure');
  check(!errors.length, `画面エラー: ${errors}`); console.log('新規開始の確認・取消・初期化 OK');
} catch (e) { await page.screenshot({ path: `${dir}/failure.png` }); throw e; } finally { await browser.close(); }
