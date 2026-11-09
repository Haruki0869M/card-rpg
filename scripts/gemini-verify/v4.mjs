// 観点4: 7本をクリアした後の「もう1周」の動機（伝承の書・うちの子図鑑・マイペット・未使用ジョブ・レアの敵・隠しボス）
// 書き換え: 伝承の書の記録（card-rpg/profile）を「7本を1回ずつクリア・うちの子2匹（片方はマイペット）・ジョブ8つ・敵を少し」にした
import { start } from './rec.mjs';
const r = await start('v4-replay');
const { page, beat, shot, text, note, tap, tryTap } = r;
await page.goto((await import('./rec.mjs')).URL);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false }));
  const S = ['corruptionKing', 'frozenKingdom', 'sandDynasty', 'cursedArchipelago', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth'];
  const clears = Object.fromEntries(S.map((s) => [s, 1]));
  const pet = (uid, petId, color, name, love, sc) => ({ uid, petId, color, name, love, scenarioId: sc, runs: { [`run-${uid}`]: { acts: 23, dc: 4, end: 'ending' } } });
  localStorage.setItem('card-rpg/profile', JSON.stringify({
    version: 1,
    jobs: { seen: ['warrior', 'mage', 'priest', 'guardian', 'hunter', 'thief', 'monk', 'summoner'], got: ['warrior', 'mage', 'priest', 'guardian', 'hunter', 'thief', 'monk', 'summoner'] },
    cards: { seen: ['strike', 'guard'], got: ['strike', 'guard'] },
    items: { seen: ['steadyHandRing'], got: ['steadyHandRing'] },
    enemies: { seen: ['forestWolf', 'toxicShroom'], kills: { forestWolf: 12, toxicShroom: 5 } },
    pets: { seen: ['cockatiel:normal', 'budgie:green'], got: ['cockatiel:normal', 'budgie:green'] },
    clears, gameovers: { corruptionKing: 2 }, adventures: 9,
    runs: S.map((s, i) => ({ key: `k${i}`, scenarioId: s, result: 'ending' })),
    battles: [],
    uchinoko: [pet('u1', 'cockatiel', 'normal', 'ぽぽ', 120, 'corruptionKing'), pet('u2', 'budgie', 'green', 'ぴーちゃん', 60, 'frozenKingdom')],
    myPets: ['u1'],
  }));
});
await page.reload(); await beat(900);
await shot('01-title');
await tap(page.getByText('伝承の書'), 1000);
await shot('02-lore');
note(`伝承の書の最初: ${(await text()).slice(0, 500)}`);
for (const tab of ['お供', 'ジョブ', 'カード', '装備', '敵', '記録']) {
  await tap(page.getByRole('tab', { name: tab }).or(page.getByRole('button', { name: tab, exact: true })).first(), 900);
  await shot(`03-tab-${tab}`);
  note(`タブ ${tab}: ${(await text()).slice(0, 600)}`);
  await page.mouse.wheel(0, 900); await beat(700);
  await shot(`03-tab-${tab}-down`);
}
await tap(page.getByLabel('閉じる').or(page.getByText('閉じる', { exact: true })).first(), 700);
// 新しい冒険: シナリオの一覧・難易度・マイペット
await tap(page.getByText('新しい冒険'), 1000);
await shot('04-setup');
note(`準備: ${(await text()).slice(0, 700)}`);
await page.mouse.wheel(0, 900); await beat(700);
await shot('05-setup-down');
await r.finish();
