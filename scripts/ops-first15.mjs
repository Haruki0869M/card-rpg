// 運用テスト T1「最初の15分」: 初めての人が、最初の戦闘に勝つまでに「何をどれだけ読み・押すか」を数える。
// 何も保存されていない端末・390×844・やさしい・1人・「はじめての案内」は ON（設定を入れない＝初めての端末と同じ）。
// 保存データは書き換えない（本当に最初から歩く）。高速モードも入れない。
// 数える物: タップの数・かかった時間・画面に出た文の文字数・用語集の言葉が初めて出た場面・案内の段が進んだ順番。
// 合否: 途中で止まる（同じ画面のまま進めない）・押せる所が無い画面・ページのエラー → NG。「言葉が多い」は合否にしない（仮説の材料）。
// 使い方: URL=http://127.0.0.1:4234/card-rpg/ node scripts/ops-first15.mjs
//   OPS_OUTPUT=保存先（省略は screenshots/ops/first15）  OPS_SEED=冒険の種（省略は 20261111）  OPS_VIDEO=0 で録画しない
// 注意（見直しの段階2で変わりやすい所）: ダンジョンの中の操作は dungeonStep() の1か所にまとめてある。画面が変わったらここだけ直す。
import { mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { chromium, URL, depart, waitForBattlePresentation, waitForWorldMovement, confirmEndTurn } from './lib.mjs';

const OUT = process.env.OPS_OUTPUT ?? 'screenshots/ops/first15';
const SEED = Number(process.env.OPS_SEED ?? 20261111);
const VIDEO = process.env.OPS_VIDEO !== '0';
/** 読む速さのめやす（1分あたりの文字数）。日本語の黙読はおよそ400〜600文字と言われるので、まん中の500（提案の値） */
const READ_CPM = Number(process.env.OPS_READ_CPM ?? 500);
/** 1タップのめやす（秒）。考えて押すまで（提案の値） */
const TAP_SEC = Number(process.env.OPS_TAP_SEC ?? 1.5);
const DUNGEON = { id: 'emeraldTemple', name: '翠の神殿' };
mkdirSync(OUT, { recursive: true });
rmSync(`${OUT}/tmp-video`, { recursive: true, force: true });

// 用語集の言葉（src/components/help/helpTopics.ts の GLOSSARY から。「探索力・歩数」「スロット（枠）」は分けて探す）
const glossarySrc = readFileSync(new URL_('../src/components/help/helpTopics.ts'), 'utf8');
function URL_(rel) { return new globalThis.URL(rel, import.meta.url); }
const TERMS = [...glossarySrc.slice(glossarySrc.indexOf('export const GLOSSARY')).matchAll(/term: '([^']+)'/g)].map((m) => {
  const words = m[1].split(/[・（）]/).map((w) => w.replace(/^★/, '')).filter((w) => w.length >= 2);
  return { term: m[1], words: words.length ? words : [m[1]] };
});

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1,
  ...(VIDEO ? { recordVideo: { dir: `${OUT}/tmp-video`, size: { width: 390, height: 844 } } } : {}),
});
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
// 冒険の種だけ固定する（同じ流れで比べられるように。adventure.mjs と同じやり方）
await page.addInitScript((seed) => {
  const random = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (array) => (array instanceof Uint32Array && array.length === 1 ? ((array[0] = seed), array) : random(array));
}, SEED);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// ---------- 数える ----------
const PHASES = ['タイトル', '冒険の設定', 'キャラ作成', '冒頭の物語', '世界マップ', 'ダンジョン', '戦闘'];
const stat = Object.fromEntries(PHASES.map((p) => [p, { taps: 0, ms: 0, chars: 0, lines: 0 }]));
let phase = 'タイトル';
let phaseStart = Date.now();
const t0 = Date.now();
const seenLines = new Set();
const termFirst = new Map(); // 用語 → 初めて出た場面
const guide = []; // 案内の段の移り変わり
const tapLog = [];
const problems = [];
const shots = new Set();

function setPhase(p) {
  if (p === phase) return;
  stat[phase].ms += Date.now() - phaseStart;
  phase = p;
  phaseStart = Date.now();
}
/** 今の画面の文を読む（初めて出た行だけ数える）。用語・案内の段も見る */
async function look() {
  const { text, step, buttons } = await page.evaluate(() => ({
    text: document.body.innerText,
    step: document.querySelector('[data-first-guide]')?.getAttribute('data-first-guide') ?? null,
    buttons: [...document.querySelectorAll('button, [role="button"], [data-reach], [data-card-index]')].filter((b) => !b.disabled && b.getClientRects().length).length,
  }));
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    // 数字や記号だけの行（HPなど）は「読む文」に入れない
    if (!line || !/[ぁ-んァ-ヶ一-龠]/.test(line) || seenLines.has(line)) continue;
    seenLines.add(line);
    stat[phase].chars += line.length;
    stat[phase].lines += 1;
    for (const t of TERMS) if (!termFirst.has(t.term) && t.words.some((w) => line.includes(w))) termFirst.set(t.term, { phase, line: line.slice(0, 40) });
  }
  const last = guide.at(-1)?.step ?? null;
  if (step !== last) guide.push({ step, phase, sec: Math.round((Date.now() - t0) / 100) / 10 });
  return { text, buttons };
}
async function shot(name) {
  if (shots.has(name)) return;
  shots.add(name);
  await page.screenshot({ path: `${OUT}/${String(shots.size).padStart(2, '0')}-${name}.png` });
}
/** タップを1回数えて押す。押せなければ false */
async function tap(loc, what) {
  const l = loc.first();
  try {
    if (!(await l.count()) || !(await l.isVisible()) || !(await l.isEnabled())) return false;
    await l.click({ timeout: 4000 });
  } catch { return false; }
  stat[phase].taps += 1;
  tapLog.push({ n: tapLog.length + 1, phase, what, sec: Math.round((Date.now() - t0) / 100) / 10 });
  return true;
}
/** 座標で押す（カード・敵・地図のマス） */
async function tapAt(x, y, what) {
  await page.mouse.click(x, y);
  stat[phase].taps += 1;
  tapLog.push({ n: tapLog.length + 1, phase, what, sec: Math.round((Date.now() - t0) / 100) / 10 });
}
const text = (s) => page.getByText(s, { exact: true });

// ---------- ダンジョンの中（★段階2で変わりやすい所。ここだけ直せばよいようにまとめる） ----------
async function dungeonStep() {
  if (await page.locator('[data-explore-roller]').count()) return tap(page.locator('[data-explore-roller] button'), 'だれが判定するか');
  if (await page.locator('[data-explore-roll-button]').count()) return tap(page.locator('[data-explore-roll-button]'), '探索のサイコロ');
  if ((await page.locator('[data-door-choice]:not([disabled])').count()) && (await page.locator('[data-dungeon-controls="ready"]').count())) return tap(page.locator('[data-door-choice]:not([disabled])'), '扉を選ぶ');
  if (await page.locator('[data-dungeon-controls="busy"]').count()) { await page.waitForTimeout(150); return true; }
  return tap(text('手番を終える'), '手番を終える');
}

// ---------- 戦闘の1手（人と同じ順: カードを選ぶ → 敵を選ぶ → 発動。使えるカードが無くなったらターン終了） ----------
async function battleStep() {
  await waitForBattlePresentation(page);
  await look();
  const end = page.locator('button:has-text("ターン終了"):not([disabled])');
  if (!(await end.count())) { await page.waitForTimeout(200); return true; }
  const cards = page.locator('[data-card-index][data-usable]');
  if (!(await cards.count())) {
    await tap(end, 'ターン終了');
    if (await confirmEndTurn(page)) stat[phase].taps += 1;
    await page.waitForTimeout(400);
    return true;
  }
  await shot('battle-guide1');
  const box = await cards.first().boundingBox();
  await tapAt(box.x + 14, box.y + 70, 'カードを選ぶ');
  await page.waitForTimeout(350);
  await look();
  await shot('battle-guide2');
  if (await page.getByText('敵をタップ').count()) {
    const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
    await tapAt(eb.x + eb.width / 2, eb.y + 60, '敵を選ぶ');
    await page.waitForTimeout(200);
  }
  if (!(await tap(page.locator('button:has-text("発動")'), '発動'))) return false;
  await page.waitForTimeout(400);
  await look();
  await shot('battle-guide3');
  return true;
}

// ---------- 最初から歩く ----------
let result = '時間切れ';
try {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByText('新しい冒険').waitFor();
  await look();
  await shot('title');
  await tap(page.getByText('新しい冒険'), '新しい冒険');
  setPhase('冒険の設定');
  await page.waitForTimeout(300);
  await look();
  await shot('setup');
  await tap(text('やさしい'), 'やさしい');
  await tap(text('1人'), '1人');
  await tap(page.getByText('キャラクター作成へ'), 'キャラクター作成へ');
  setPhase('キャラ作成');
  await page.waitForTimeout(300);
  await look();
  await shot('create');
  // キャラ作成は何も変えずに出発（最初から選ばれている物のまま）
  const before = tapLog.length;
  await depart(page);
  stat[phase].taps += 1;
  tapLog.push({ n: before + 1, phase, what: '冒険に出発', sec: Math.round((Date.now() - t0) / 100) / 10 });
  setPhase('冒頭の物語');
  await page.waitForTimeout(500);

  let previous = '';
  let unchanged = 0;
  let battleSeen = false;
  for (let step = 0; step < 900; step++) {
    await page.waitForTimeout(120);
    if (await page.locator('[data-world-moving]').count()) { await waitForWorldMovement(page); unchanged = 0; }
    // 今どの場面か（物語の窓が出ている間は、前の場面のまま数える）
    if (!battleSeen && !(await text('つづける').count())) {
      if (await page.locator('button:has-text("ターン終了")').count()) { /* 下で「戦闘」にする */ }
      else if (await text('撤退').count()) setPhase('ダンジョン');
      else if (await page.locator('[data-world-map]').count()) setPhase('世界マップ');
    }
    const { text: body, buttons } = await look();
    const sig = (await page.evaluate(() => localStorage.getItem('card-rpg/adventure'))) + '|' + body.length;
    unchanged = sig === previous ? unchanged + 1 : 0;
    previous = sig;
    if (unchanged >= 25) { problems.push(`同じ画面のまま進めない（${phase}）: ${body.replace(/\n/g, ' ').slice(0, 120)}`); await shot('stuck'); result = '止まった'; break; }
    if (buttons === 0 && !(await page.locator('[data-battle-presenting], [data-world-moving]').count())) {
      await page.waitForTimeout(600);
      if ((await look()).buttons === 0 && !(await page.locator('[data-battle-presenting], [data-world-moving]').count())) { problems.push(`押せる所が無い画面（${phase}）`); await shot(`nobutton-${step}`); }
    }

    // 戦闘の結果
    const fin = page.locator('button:has-text("報酬を受け取る"), [data-result-button], button:has-text("ダンジョンへ戻る"), button:has-text("冒険の結果へ")');
    if (battleSeen && (await fin.count())) {
      await shot('battle-result');
      result = (await page.getByText(/^(全滅…|敗北…|力尽きた…)$/).count()) ? '最初の戦闘で負けた' : '最初の戦闘に勝った';
      break;
    }
    if (await page.locator('button:has-text("ターン終了")').count()) {
      if (!battleSeen) { battleSeen = true; setPhase('戦闘'); await page.waitForTimeout(600); await look(); }
      if (!(await battleStep())) await page.waitForTimeout(200);
      continue;
    }
    if (await page.getByText('世界の終わり…', { exact: true }).count()) { result = '戦闘の前に冒険が終わった'; break; }
    if (await tap(text('つづける'), 'つづける（物語）')) { await shot('story'); continue; }
    if (await tap(page.getByLabel('手番を始める'), '手番を始める')) continue;
    if ((await page.getByText('奇襲を狙う').count()) && (await text('戦う').count())) { await shot('encounter'); await tap(text('戦う'), '戦う（遭遇）'); continue; }
    if (await tap(text('戦闘開始'), '戦闘開始')) continue;
    if (await tap(text('戦闘を始める'), '戦闘を始める')) continue;
    if (await tap(text('町を出る'), '町を出る')) continue;
    if (await tap(text('祈らずに去る'), '祈らずに去る')) continue;
    if (await tap(text('先へ進む'), '先へ進む')) continue;
    if (await page.locator('[data-event-window]').count()) { await shot('event'); if (await tap(page.locator('[data-event-window] button:not([disabled])').last(), '突発イベントの選択')) continue; }
    if (await page.locator('[data-hero-task]').count()) { let ok = false; for (const t of ['お供にする', 'やめる', '行商人と別れる']) if (await tap(text(t), t)) { ok = true; break; } if (ok) continue; }

    // 世界マップ: 最初のダンジョン（翠の神殿）へ歩く
    if ((await page.locator('[data-world-map]').count()) && !(await text('撤退').count())) {
      setPhase('世界マップ');
      await shot('world');
      if (await tap(text(`${DUNGEON.name}に入る`), `${DUNGEON.name}に入る`)) continue;
      if (await tap(page.locator('[data-roll-move]'), '移動のサイコロ')) { await page.waitForTimeout(300); continue; }
      const reach = page.locator('[data-reach]');
      const n = await reach.count();
      if (n) {
        const nav = await page.evaluate((id) => {
          const w = JSON.parse(localStorage.getItem('card-rpg/adventure'))?.game?.world;
          return w ? { width: w.width, goal: w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id), hero: w.pos[w.turn] } : null;
        }, DUNGEON.id);
        const at = (i) => ({ x: (i % nav.width) + (Math.floor(i / nav.width) % 2 ? 0.5 : 0), y: Math.floor(i / nav.width) * 0.866 });
        const dist = (i) => (at(i).x - at(nav.goal).x) ** 2 + (at(i).y - at(nav.goal).y) ** 2;
        let best = -1; let bestD = dist(nav.hero);
        for (let i = 0; i < n; i++) { const d = dist(Number(await reach.nth(i).getAttribute('data-reach'))); if (d < bestD) { bestD = d; best = i; } }
        if (best >= 0) {
          await reach.nth(best).scrollIntoViewIfNeeded();
          const b = await reach.nth(best).boundingBox();
          await tapAt(b.x + b.width / 2, b.y + b.height / 2, '地図のマスを選ぶ');
          await page.waitForTimeout(150);
          await shot('world-move');
          if (await tap(page.locator('button:has-text("移動する")'), '移動する')) { await page.waitForTimeout(300); continue; }
        }
      }
      if (!(await tap(text('手番を終える'), '手番を終える'))) await tap(text('待機'), '待機');
      continue;
    }
    // ダンジョンの通路
    if (await text('撤退').count()) {
      setPhase('ダンジョン');
      await shot('dungeon');
      await dungeonStep();
      continue;
    }
  }
} catch (e) {
  problems.push(`途中で止まった: ${String(e.message).split('\n')[0]}`);
  result = '止まった';
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
}
stat[phase].ms += Date.now() - phaseStart;
if (errors.length) problems.push(`ページのエラー: ${errors.slice(0, 3).join(' / ')}`);
// 案内の段: ①→（②）→③ の順に進んだか（①⇔②の行き来は仕様。③の後に戻ったら問題）
const guideSteps = guide.map((g) => g.step).filter(Boolean);
const i3 = guideSteps.indexOf('3');
if (!guideSteps.length) problems.push('はじめての案内が1回も出なかった');
else {
  if (guideSteps[0] !== '1') problems.push(`案内が①から始まらない（${guideSteps[0]}）`);
  if (!guideSteps.includes('2')) problems.push('案内の②が出なかった');
  if (i3 < 0) problems.push('案内の③が出なかった');
  else if (guideSteps.slice(i3).some((s) => s !== '3')) problems.push('案内が③の後に戻った');
}
if (result !== '最初の戦闘に勝った') problems.push(`最初の戦闘の勝利まで行けなかった（${result}）`);

await ctx.close();
await browser.close();
if (VIDEO) {
  const v = readdirSync(`${OUT}/tmp-video`).find((f) => f.endsWith('.webm'));
  if (v) renameSync(`${OUT}/tmp-video/${v}`, `${OUT}/first15.webm`);
  rmSync(`${OUT}/tmp-video`, { recursive: true, force: true });
}

// ---------- まとめ ----------
const total = PHASES.reduce((a, p) => ({ taps: a.taps + stat[p].taps, ms: a.ms + stat[p].ms, chars: a.chars + stat[p].chars, lines: a.lines + stat[p].lines }), { taps: 0, ms: 0, chars: 0, lines: 0 });
const est = (s) => Math.round((s.chars / READ_CPM) * 60 + s.taps * TAP_SEC);
const mmss = (sec) => `${Math.floor(sec / 60)}分${String(Math.round(sec % 60)).padStart(2, '0')}秒`;
const terms = TERMS.map((t) => ({ term: t.term, ...(termFirst.get(t.term) ?? { phase: null }) }));
const beforeBattle = terms.filter((t) => t.phase && t.phase !== '戦闘');
const out = {
  url: URL, seed: SEED, result, ok: problems.length === 0, problems,
  total: { ...total, sec: Math.round(total.ms / 1000), estimateSec: est(total) },
  phases: Object.fromEntries(PHASES.map((p) => [p, { ...stat[p], sec: Math.round(stat[p].ms / 1000), estimateSec: est(stat[p]) }])),
  guide, terms, tapLog, assumptions: { READ_CPM, TAP_SEC },
};
writeFileSync(`${OUT}/result.json`, JSON.stringify(out, null, 2));
const md = [
  '# T1 最初の15分（数え上げ）',
  '',
  `- 結果: **${result}**（${problems.length ? 'NG' : 'OK'}）　種 ${SEED}　${URL}`,
  `- タップ **${total.taps}回** ／ 読む文 **${total.chars}文字**（${total.lines}行） ／ 自動で進めた時間 ${mmss(total.ms / 1000)}`,
  `- 人が遊ぶ時のめやす: **${mmss(est(total))}**（読む速さ 1分${READ_CPM}文字・1タップ${TAP_SEC}秒で計算した値。演出の待ち時間は入っていない）`,
  ...(problems.length ? ['', '## 問題（合否）', ...problems.map((p) => `- ${p}`)] : []),
  '',
  '## 場面ごと',
  '| 場面 | タップ | 読む文字 | 行 | 自動の時間 | 人のめやす |',
  '|---|---|---|---|---|---|',
  ...PHASES.map((p) => `| ${p} | ${stat[p].taps} | ${stat[p].chars} | ${stat[p].lines} | ${mmss(stat[p].ms / 1000)} | ${mmss(est(stat[p]))} |`),
  `| **合計** | ${total.taps} | ${total.chars} | ${total.lines} | ${mmss(total.ms / 1000)} | ${mmss(est(total))} |`,
  '',
  '## はじめての案内の段',
  guide.map((g) => `${g.step ? `段${g.step}` : '（消える）'}@${g.sec}秒`).join(' → ') || '出なかった',
  '',
  `## 用語集の言葉が初めて出た場面（${terms.filter((t) => t.phase).length}/${terms.length} 語。最初の戦闘の前に ${beforeBattle.length} 語）`,
  '| 言葉 | 初めて出た場面 | その時の文 |',
  '|---|---|---|',
  ...terms.map((t) => `| ${t.term} | ${t.phase ?? '（出ていない）'} | ${t.line ?? ''} |`),
  '',
  '※ 文字数は「初めて画面に出た行」だけを数えています（同じ行は1回）。数字や記号だけの行は入れていません。「言葉が多いかどうか」は合否ではなく、仮説の材料です。',
].join('\n');
writeFileSync(`${OUT}/result.md`, md);
console.log(md);
process.exit(problems.length ? 1 : 0);
