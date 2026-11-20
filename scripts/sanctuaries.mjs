// J3d第1段階: 神殿・祭壇の数（読めない古い保存は出ない事）、神殿・祭壇の入退場と転職画面をスマホ幅で確認する。
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

await mkdir('screenshots/sanctuaries', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const check = (ok, message) => { if (!ok) throw new Error(message); };
const save = async () => {
  await page.waitForTimeout(300); // storeの保存待ち
  return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
};
async function resume(data) {
  await page.evaluate(d => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), data);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
}
try {
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('新しい冒険', { exact: true }).click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ', { exact: true }).click();
  await depart(page, { exact: true });
  await page.waitForTimeout(300);
  const base = await save();
  // 新しい冒険の地図に、神殿2か所・祭壇5か所がある
  check(base.game.world.tiles.filter(t => ['temple', 'altar'].includes(t.f?.kind)).length === 7, '新しい地図の神殿・祭壇の数が違う');
  check(base.game.rngState !== undefined, '乱数状態がない');
  // 2026-11-11 オーナーの決定: v23 より前の保存は読まない（src/engine/game/migrations.ts）。
  // 前はここで「神殿の無い v8 の保存に施設を足す」を確かめていたが、その移し替えは無くなった。古すぎる保存は「つづきから」に出ないことを確かめる
  {
    const old = structuredClone(base); old.version = old.game.version = 8;
    await page.evaluate(d => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), old);
    await page.reload(); await page.waitForTimeout(500);
    check(await page.getByText('つづきから', { exact: true }).count() === 0, '読めない古い保存（v8）が「つづきから」に出る');
    console.log('OK: 読めない古い保存（v8）は「つづきから」に出ない');
  }
  for (const width of [360, 390, 480]) {
    await page.setViewportSize({ width, height: 780 });
    for (const id of ['pilgrimTemple', 'samuraiAltar']) {
      const d = structuredClone(base), g = d.game, w = g.world;
      g.mode = 'world'; g.party = undefined; g.town = undefined; w.story = undefined;
      w.turn = 'h1'; const tile = w.tiles.findIndex(t => t.f?.id === id);
      w.pos.h1 = tile; w.tiles[tile].seen = true;
      g.heroes[1].classId = 'swordmaster'; g.heroes[1].level = 7; g.heroes[1].feats = { perfects: 60 };
      await resume(d);
      const name = id === 'pilgrimTemple' ? '巡礼の神殿' : '剣の誓いの祭壇';
      await page.getByText(`${name}に入る`, { exact: true }).click();
      check((await save()).game.sanctuary?.heroId === 'h1', `${width}px P2の担当が引き継がれない`);
      await page.waitForTimeout(250);
      check((await layoutIssues(page)).length === 0, `${width}px ${name}の表示が崩れる`);
      await page.screenshot({ path: `screenshots/sanctuaries/${id}-${width}.png` });
      await page.getByRole('button', { name: '転職先を見る', exact: true }).click();
      await page.waitForTimeout(250);
      check((await layoutIssues(page)).length === 0, `${width}px 転職一覧の表示が崩れる`);
      const button = page.getByRole('button', { name: '剣聖に転職する', exact: true });
      check(id === 'pilgrimTemple' ? await button.count() === 1 : await button.count() === 0, `${name}の転職制限が違う`);
      if (id === 'pilgrimTemple') {
        await button.click();
        await page.getByRole('dialog').getByText('転職する', { exact: true }).click();
        await page.getByRole('button', { name: '天剣', exact: true }).click();
        await page.getByText('このカードにする', { exact: true }).click();
        check((await save()).game.heroes[1].classId === 'swordSaint', '神殿で転職できない');
      }
      // 一覧は再読込で閉じ、施設の退出操作を確認する。
      await page.reload(); await page.getByText('つづきから', { exact: true }).click();
      await page.getByRole('button', { name: '世界マップへ', exact: true }).click();
      const left = (await save()).game;
      check(left.mode === 'world' && !left.sanctuary && left.world.turn === 'h1', 'P2が施設から退出できない');
      console.log(`OK: ${width}px ${name}の入退場・転職制限・表示`);
    }
  }
  check(errors.length === 0, errors.join('\n'));
} finally {
  await browser.close();
}
