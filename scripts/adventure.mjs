// 実際の画面をタップして、キャラ作成 → 世界マップ（物語・移動・遭遇）→ 最初のダンジョン（1本目は翠の神殿） → 宝箱 → レベルアップ → ボス撃破 → 大宝箱 → 地上 まで進める
// 2人以上は担当プレイヤーを分けて、手番の受け渡しの画面も確かめる
// npm run build && npx vite preview --port 4173 を起動した状態で: node scripts/adventure.mjs
// 別のシナリオを通す時: ADVENTURE_SCENARIO=frozenKingdom node scripts/adventure.mjs（記録を入れて解放してから選ぶ）
// 他のセッションと同じポートを使わないよう、自分専用のポートで preview を起こし URL=http://127.0.0.1:<番号>/card-rpg/ を付ける
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, layoutIssues, URL, waitForWorldMovement, waitForBattlePresentation } from './lib.mjs';

mkdirSync('screenshots', { recursive: true });
const output = process.env.ADVENTURE_OUTPUT ?? 'screenshots/adventure';
// 遊ぶシナリオ（ADVENTURE_SCENARIO。省略は1本目の corruptionKing）。1本目以外は、記録を入れて解放してから選ぶ
const FIRST_SCENARIO = 'corruptionKing';
const SCENARIO_NAMES = {
  corruptionKing: '侵食の魔王',
  frozenKingdom: '凍てつく王国',
  cursedArchipelago: '呪われた群島',
  sandDynasty: '砂塵の王朝',
  starCastle: '星降る天空城',
  clockworkEmpire: '機械仕掛けの帝国',
  dreamLabyrinth: '夢幻の大迷宮',
};
// 世界マップで最初に向かうダンジョン（シナリオごとの、いちばん入りやすい鍵のダンジョン）
const FIRST_DUNGEON = {
  corruptionKing: { id: 'emeraldTemple', name: '翠の神殿' },
  frozenKingdom: { id: 'crystalCave', name: '氷晶の洞' },
  cursedArchipelago: { id: 'wreckCave', name: '難破船の洞窟' },
  sandDynasty: { id: 'scorpionTomb', name: '蠍の墓所' },
  starCastle: { id: 'windmillTower', name: '風車の塔' },
  clockworkEmpire: { id: 'gearFactory', name: '歯車の工場' },
  dreamLabyrinth: { id: 'echoIceVault', name: '氷の記憶の洞' },
};
const SCENARIO = process.env.ADVENTURE_SCENARIO ?? FIRST_SCENARIO;
if (!SCENARIO_NAMES[SCENARIO]) throw new Error(`知らないシナリオ: ${SCENARIO}（${Object.keys(SCENARIO_NAMES).join(' / ')}）`);
mkdirSync(output, { recursive: true });
async function record(page, party, result) {
  const data = await page.evaluate(() => ({ text: document.body.innerText, saved: JSON.parse(localStorage.getItem('card-rpg/adventure')) }));
  await page.screenshot({ path: `${output}/${party}p-${result}.png` });
  writeFileSync(`${output}/${party}p-${result}.json`, JSON.stringify(data, null, 2));
  console.log(`${party}人 ${result}: ${data.text.replace(/\n/g, ' ').slice(-700)}`);
}
const browser = await chromium.launch();
const issues = new Set();
const seen = new Set();

async function check(page, tag) {
  for (const i of await layoutIssues(page)) issues.add(`${tag}: ${i}`);
}

/** 名前がちょうど text の押せるボタンを押す（押せなければ false） */
async function clickEnabled(page, text) {
  const b = page.getByRole('button', { name: text, exact: true }).first();
  if (!(await b.count()) || !(await b.isEnabled())) return false;
  try {
    await b.click({ timeout: 4000 });
  } catch {
    return false;
  }
  return true;
}

async function clickText(page, text, opts = {}) {
  const l = page.getByText(text, { exact: true, ...opts }).first();
  if (await l.count()) {
    try {
      await l.click({ timeout: 4000 });
    } catch {
      // 消えていく途中のボタンなど（次の回でやり直す）
      return false;
    }
    return true;
  }
  return false;
}

async function playBattle(page) {
  for (let guard = 0; guard < 60; guard++) {
    await waitForBattlePresentation(page);
    if (await page.locator('button:has-text("報酬を受け取る"), button:has-text("冒険の結果へ"), button:has-text("ダンジョンへ戻る")').count()) return;
    const endBtn = page.locator('button:has-text("ターン終了"):not([disabled])');
    if (!(await endBtn.count())) {
      await page.waitForTimeout(150);
      continue;
    }
    const allies = page.locator('[data-ally]:not([data-done]):not([data-dead])');
    if ((await allies.count()) === 0) {
      await endBtn.click();
      await page.waitForTimeout(200);
      continue;
    }
    await allies.first().click();
    const cards = page.locator('[data-card-index][data-usable]');
    if (!(await cards.count())) {
      await endBtn.click();
      continue;
    }
    const availableCards = await cards.count();
    const card = cards.first();
    const box = await card.boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(40);
    if (await page.getByText('敵をタップ').count()) {
      const e = page.locator('[data-enemy]:not([data-dead])').first();
      const eb = await e.boundingBox();
      await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
    }
    for (let i = 0; i < 3; i++) {
      const plus = page.getByLabel('フォーカスを増やす');
      if ((await plus.count()) && (await plus.isEnabled()) && availableCards <= 2) await plus.click();
    }
    if (!seen.has('focus')) {
      seen.add('focus');
      await check(page, 'focus');
    }
    const go = page.locator('button:has-text("発動")');
    if (await go.count()) await go.click();
    await page.waitForTimeout(40);
  }
}

async function run(party, difficulty) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  // 前後の版を同じ冒険で比較するため、開始時の種だけを固定できるようにする。
  if (process.env.ADVENTURE_SEED) await page.addInitScript(seed => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1 ? (array[0] = seed, array) : random(array);
  }, Number(process.env.ADVENTURE_SEED));
  page.on('pageerror', (e) => issues.add(`pageerror: ${e.message}`));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  // 1本目以外を遊ぶ時は、伝承の書の記録（card-rpg/profile）に「ほかのシナリオをクリア済み」と入れてから始める（解放されるため）
  if (SCENARIO !== FIRST_SCENARIO) {
    const clears = Object.fromEntries(Object.keys(SCENARIO_NAMES).filter((id) => id !== SCENARIO).map((id) => [id, 1]));
    await page.evaluate((c) => localStorage.setItem('card-rpg/profile', JSON.stringify({ version: 1, clears: c })), clears);
  }
  await page.reload();
  await page.getByText('新しい冒険').click();
  if (SCENARIO !== FIRST_SCENARIO) {
    // シナリオの一覧（横にスワイプ）から、名前のカードを選ぶ
    const card = page.locator('[data-scenarios] button', { hasText: SCENARIO_NAMES[SCENARIO] }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    if (await page.locator('[data-scenario-lock]').count()) {
      const locked = await card.locator('[data-scenario-lock]').count();
      if (locked) issues.add(`シナリオ ${SCENARIO} が解放されていない（記録を入れても鍵が付いたまま）`);
    }
    await page.waitForTimeout(150);
  }
  if (!(await page.getByText('高速モード').count())) {
    /* 設定はメニューから */
  }
  await clickText(page, difficulty);
  await clickText(page, `${party}人`);
  await check(page, 'setup');
  await page.getByText('キャラクター作成へ').click();
  // 2人目以降は別のプレイヤーが担当（ローカル協力の手番の受け渡しを確かめる）
  if (party > 1) {
    await page.getByText('2人目').click();
    await page.getByText('P2', { exact: true }).click();
    await page.getByText('1人目').click();
  }
  await check(page, 'create');
  await page.getByText('冒険に出発').click();
  // 冒頭の物語
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/adv-story.png` });
  await page.getByText('つづける').click();
  // 高速モード
  await page.getByLabel('メニュー').click();
  await page.getByRole('button', { name: '高速', exact: true }).click();
  await page.getByLabel('閉じる').click();

  let result = 'timeout';
  let previous = '';
  let unchanged = 0;
  for (let step = 0; step < 900; step++) {
    await page.waitForTimeout(60);
    if (await page.locator('[data-world-moving]').count()) {
      await waitForWorldMovement(page);
      unchanged = 0;
    }
    const { signature, text } = await page.evaluate(() => ({ signature: localStorage.getItem('card-rpg/adventure'), text: document.body.innerText }));
    unchanged = signature === previous ? unchanged + 1 : 0;
    previous = signature;
    if (step % 25 === 0) console.log(`${party}人 step=${step}: ${text.replace(/\n/g, ' ').slice(-180)}`);
    if (unchanged >= 25) {
      console.log(`${party}人: 同じ画面のまま25回操作しても進まないため記録して停止`);
      break;
    }
    if (await page.getByText('地上に戻る', { exact: true }).count()) {
      result = 'cleared';
      await page.screenshot({ path: `screenshots/adv-${party}p-cleared.png` });
      await check(page, 'cleared');
      await page.getByText('地上に戻る').click();
      await page.waitForTimeout(300);
      // 鍵のダンジョンを制覇すると、制覇後の物語（鍵を手に入れた・鍵の残り数）が出る
      if (await page.locator('[data-world-map]').count()) {
        const storyText = await page.locator('body').innerText();
        if (storyText.includes('手に入れた！')) {
          await page.screenshot({ path: `${output}/${party}p-clearstory.png` });
          console.log(`${party}人 制覇後の物語: ${storyText.replace(/\n/g, ' ').slice(0, 200)}`);
          await check(page, 'clearstory');
          await clickText(page, 'つづける');
          await page.waitForTimeout(200);
        } else issues.add('制覇後の物語が出ない');
      }
      // 地上に戻ったあと: 世界マップか、手番が来た別の組のダンジョン（M3-D）
      if (!(await page.locator('[data-world-map]').count()) && !(await page.getByText('探索力の判定').count())) { issues.add('世界マップに戻れない'); await page.screenshot({ path: `screenshots/adv-${party}p-noworld.png` }); console.log((await page.locator('body').innerText()).slice(0, 300)); }
      break;
    }
    if (await page.getByText('世界の終わり…', { exact: true }).count()) {
      result = 'gameover';
      break;
    }
    // 物語・手番の受け渡し
    if (await clickText(page, 'つづける')) continue;
    if (await page.getByLabel('手番を始める').count()) {
      if (!seen.has('handoff')) {
        seen.add('handoff');
        await page.screenshot({ path: `screenshots/adv-handoff.png` });
      }
      await page.getByLabel('手番を始める').click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    // 遭遇
    if (await page.getByText('奇襲を狙う').count() && (await page.getByText('戦う', { exact: true }).count())) {
      if (!seen.has('encounter')) {
        seen.add('encounter');
        await check(page, 'encounter');
        await page.screenshot({ path: `screenshots/adv-encounter.png` });
      }
      await page.getByText('戦う', { exact: true }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await clickText(page, '戦闘開始')) continue;
    if (await page.getByText('全員の利用終了後に地図へ戻ります', { exact: true }).count() && await clickText(page, '世界マップへ')) continue;
    if (await clickText(page, '町を出る')) continue;
    if (await clickText(page, '祈らずに去る')) continue;
    if (await page.locator('[data-sanctuary]').count() && await clickText(page, '世界マップへ')) continue;
    // 世界マップ: 翠の神殿へ向かう
    if (await page.locator('[data-world-map]').count() && !(await page.getByText('撤退', { exact: true }).count())) {
      if (!seen.has('world')) {
        seen.add('world');
        await check(page, 'world');
        await page.screenshot({ path: `screenshots/adv-world.png` });
      }
      if (await clickText(page, `${FIRST_DUNGEON[SCENARIO].name}に入る`)) continue;
      if (await page.getByText('移動力の判定').count()) {
        await page.getByText('移動力の判定').click({ timeout: 3000 }).catch(() => {});
        continue;
      }
      const reach = page.locator('[data-reach]');
      const n = await reach.count();
      if (n) {
        const goal = page.locator(`[data-feature="dungeon:${FIRST_DUNGEON[SCENARIO].id}"]`);
        const gb = (await goal.count()) ? await goal.boundingBox() : null;
        const target = gb ? { x: gb.x + gb.width / 2, y: gb.y + gb.height / 2 } : { x: 180, y: -100000 };
        let best = null;
        let bestD = Infinity;
        for (let i = 0; i < n; i++) {
          const b = await reach.nth(i).boundingBox();
          if (!b) continue;
          const d = (b.x + b.width / 2 - target.x) ** 2 + (b.y + b.height / 2 - target.y) ** 2;
          if (d < bestD) (bestD = d), (best = i);
        }
        const hb = await page.locator('[data-hero][data-active]').boundingBox();
        const hd = hb ? (hb.x + hb.width / 2 - target.x) ** 2 + (hb.y + hb.height / 2 - target.y) ** 2 : Infinity;
        if (best !== null && bestD < hd) {
          await reach.nth(best).scrollIntoViewIfNeeded();
          const b = await reach.nth(best).boundingBox();
          await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
          await page.waitForTimeout(80);
          if (await page.locator('button:has-text("移動する")').count()) {
            if (!seen.has('move')) {
              seen.add('move');
              await page.screenshot({ path: `screenshots/adv-move.png` });
            }
            await page.locator('button:has-text("移動する")').click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(250);
            continue;
          }
        }
      }
      await clickText(page, '手番を終える') || (await clickText(page, '待機'));
      continue;
    }
    if (await page.getByText('全滅…', { exact: true }).count()) {
      if (await page.locator('button:has-text("冒険の結果へ")').count()) {
        await page.locator('button:has-text("冒険の結果へ")').click();
        continue;
      }
      result = 'gameover';
      break;
    }
    // ダンジョンの通路（第3段階）: 歩いて扉を探し、扉を開けて進む
    if (await page.getByText('撤退', { exact: true }).count()) {
      if (!seen.has('dungeon')) {
        seen.add('dungeon');
        await check(page, 'dungeon');
      }
      // 手番の最初は探索力を決める。使い切ったら「手番を終える」（M3-D）
      if (await page.getByText('探索力の判定').count()) {
        await page.getByText('探索力の判定').click();
        continue;
      }
      // 第3段階: 通路を歩いて扉を開ける。目の前に開けられる扉があれば開け、地図に見えている扉があればその前まで歩く
      const enabled = async (loc) => (await loc.count()) > 0 && (await loc.first().isEnabled());
      const open = page.getByRole('button', { name: /^扉を開ける/ });
      if (await enabled(open)) {
        await open.first().click();
        continue;
      }
      // 段階B: 大きな地図はミニマップから開く
      if (!(await page.locator('[data-map-overlay]').count())) await page.getByLabel('地図を開く').click();
      const door = page.locator('[data-door="open"]');
      const closeMap = () => page.getByLabel('地図を閉じる').click().catch(() => {});
      if (await door.count()) {
        await door.first().click({ force: true });
        const walk = page.getByRole('button', { name: '歩く', exact: true });
        if (await enabled(walk)) {
          await walk.click();
          continue;
        }
        // 扉は見えているが、歩数が足りない（または今いる所が扉の前）: 扉を向くか、手番を終える
        await closeMap();
        if (await clickEnabled(page, '扉を向く')) continue;
        await clickText(page, '手番を終える');
        continue;
      }
      await closeMap();
      // まだ扉が見えていない: 前・右・左の順に歩いて探す。歩けなければ手番を終える
      if ((await clickEnabled(page, '扉を向く')) || (await clickEnabled(page, '前進')) || (await clickEnabled(page, '右へ')) || (await clickEnabled(page, '左へ'))) continue;
      await clickText(page, '手番を終える');
      continue;
    }
    if (await page.locator('button:has-text("ターン終了")').count()) {
      if (!seen.has('battle')) {
        seen.add('battle');
        await check(page, 'battle');
      }
      await playBattle(page);
      const fin = page.locator('button:has-text("報酬を受け取る"), button:has-text("冒険の結果へ"), button:has-text("ダンジョンへ戻る")');
      if (await fin.count()) await fin.first().click();
      continue;
    }
    if (await page.getByText('レベルアップ！').count()) {
      if (!seen.has('levelup')) {
        seen.add('levelup');
        await check(page, 'levelup');
        await page.screenshot({ path: `screenshots/adv-levelup.png` });
      }
      const opts = page.locator('button:has(.font-display)').filter({ hasNotText: 'カード強化' });
      await opts.first().click();
      continue;
    }
    if (await page.getByText(/の山札に1枚加える/).count()) {
      if (!seen.has('reward')) {
        seen.add('reward');
        await check(page, 'reward');
        await page.screenshot({ path: `screenshots/adv-reward.png` });
      }
      await page.getByText(/はカードを選ばない/).click();
      continue;
    }
    // 宝箱の演出中（最初の1回は演出を最後まで見る。以降は飛ばす）
    if (await page.getByText('タップで結果まで飛ばす').count()) {
      if (seen.has('chest-anim')) await clickText(page, 'タップで結果まで飛ばす');
      else {
        seen.add('chest-anim');
        await page.waitForTimeout(700);
        await page.screenshot({ path: `screenshots/adv-chest-anim.png` });
      }
      continue;
    }
    if (await page.getByText('運のスロット').count() && (await page.getByText('先へ進む').count()) && !seen.has('chest-result')) {
      seen.add('chest-result');
      await check(page, 'chest-result');
      await page.screenshot({ path: `screenshots/adv-chest-result.png` });
    }
    if (await clickText(page, '先へ進む')) continue;
    if (await clickText(page, '戦闘を始める')) continue;
    // イベントの後の作業（お供・カード・行商人）と転職のカード選び（J3a・J3b）
    if (await page.locator('[data-hero-task]').count()) {
      if (!seen.has('hero-task')) {
        seen.add('hero-task');
        await check(page, 'hero-task');
        await page.screenshot({ path: `screenshots/adv-hero-task.png` });
      }
      for (const t of ['お供にする', 'やめる', '行商人と別れる']) if (await clickText(page, t)) break;
      continue;
    }
    if (await page.locator('[data-job-pick]').count()) {
      await page.locator('[data-job-pick] button[aria-pressed]').first().click();
      await clickText(page, 'このカードにする');
      continue;
    }
    // 突発イベント: 選べる選択肢の先頭（お金・フォーカスの足りない選択肢は押せない）
    if (await page.locator('[data-event-window]').count() && !(await page.getByText('先へ進む').count()) && !(await page.getByText('戦闘を始める').count())) {
      const opts = page.locator('[data-event-window] button:not([disabled])');
      if (await opts.count()) {
        if (!seen.has('random-event')) {
          seen.add('random-event');
          await check(page, 'random-event');
          await page.screenshot({ path: `screenshots/adv-random-event.png` });
        }
        await opts.last().click();
        continue;
      }
    }
    if (await page.locator('button:has-text("ダンジョン制覇！")').count()) {
      await page.screenshot({ path: `screenshots/adv-bigchest.png` });
      await page.locator('button:has-text("ダンジョン制覇！")').click();
      continue;
    }
    if (await clickText(page, '隠し宝箱へ')) continue;
    // 宝箱
    if (await page.locator('button:has-text("開ける"), button:has-text("鍵を開ける")').count()) {
      if (!seen.has('chest')) {
        seen.add('chest');
        await check(page, 'chest');
        await page.screenshot({ path: `screenshots/adv-chest.png` });
      }
      await page.locator('button:has-text("開ける"), button:has-text("鍵を開ける")').last().click();
      await page.waitForTimeout(150);
      continue;
    }
    // イベント
    if (await page.getByText('挑戦する').count()) {
      await page.getByText('挑戦する').click();
      continue;
    }
    const evOpts = page.locator('.panel button.btn-dark, .panel button.bg-sky-950\\/60').filter({ hasNotText: '戻る' });
    if (await page.getByText('能力値で判定').count() || (await page.getByText('立ち去る').count())) {
      if (!seen.has('event')) {
        seen.add('event');
        await check(page, 'event');
        await page.screenshot({ path: `screenshots/adv-event.png` });
      }
      await evOpts.first().click();
      continue;
    }
    // 休憩
    if (await page.getByText('瞑想する').count()) {
      if (!seen.has('rest')) {
        seen.add('rest');
        await check(page, 'rest');
      }
      await page.getByText('休む', { exact: true }).click();
      continue;
    }
  }
  console.log(`${party}人・${difficulty}: ${result}`);
  await record(page, party, result);
  await ctx.close();
  return result;
}

const results = [];
for (const party of (process.env.ADVENTURE_PARTIES ?? '4,2').split(',').map(Number)) results.push(await run(party, 'やさしい'));
await browser.close();
if (issues.size) console.log('issues:', [...issues]);
// 一方の人数だけ通っても成功にしない。
process.exit(issues.size || results.some(result => result !== 'cleared') ? 1 : 0);
