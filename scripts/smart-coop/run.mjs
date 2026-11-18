// 賢いマルチプレイ検証 bot: 通しの流れ（用意 → 回す → 報告）。環境変数を読む
// 区切り 1-J: 部屋の用意（lobby）→ 世界マップを歩いて最初の鍵のダンジョンへ → 最初の戦闘 → 報酬を受け取り終えるまで（first-reward）。
// 頭は「どの場面にも出る物」（brain/common）＋「世界マップを歩く」（brain/world）＋「仮の頭: まっすぐ進む＋先頭のカード」（brain/provisional）。
// 揺さぶり・網羅の表・場面からは、後の区切りで足す。
//
// 環境変数:
//   URL           ゲームの場所（手元の preview。例 http://127.0.0.1:4192/card-rpg/）
//   EMU_HOST      エミュレーターの場所（127.0.0.1 か localhost だけ。既定 127.0.0.1）
//   PEOPLE        2 か 4（既定 2）
//   SEED          種（既定 1）。ジョブの選び方と、ゲームの種（&seed=）に使う
//   SCENARIO      シナリオの番号（1 = 1本目。既定 1。1本目以外の解放は後の区切り）
//   SMART_MODE    first-reward（既定）・first-dungeon（最初の鍵のダンジョンを制覇して世界マップに戻るまで。区切り 2-Sa）・
//                 full（新しい冒険 → エンディングかゲームオーバーまで。ゲームオーバーなら新しい冒険で網羅の表の残りを続ける。区切り 2-Sb）・lobby（部屋の用意まで）・selftest
//   SMART_RESTARTS  full: ゲームオーバーの後に新しい冒険を始める回数の上限（既定 2）
//   SMART_SHAKE   sheet-wait … 誘いの返事を待たせている間に P2 がパーティ・装備のシートを開いて閉じる（区切り 1-J の検出の確かめ）
//   SMART_INDUCE  cover … わざと失敗させる（台本が P2 の画面に「押せない板」を置く。証拠が全端末ぶん残るかの確かめ。ゲームの不具合ではない）
//   SMART_LIMIT_MIN  上限の分（既定: first-reward は 40 分）
//   SMART_OUTPUT  結果の置き場所（既定 screenshots/smart-coop/<シナリオ>-<人数>p-<種>）
import { assertLocalUrl, launchFleet } from './fleet.mjs';
import { Judge } from './judge.mjs';
import { Conductor } from './conductor.mjs';
import { setupRoom, LobbyStop } from './lobby.mjs';
import { writeReport, actionLine } from './report.mjs';
import { appendFileSync } from 'node:fs';
import { memoryMeter } from './mem.mjs';
import { commonBrain } from './brain/common.mjs';
import { worldBrain, encounterBrain } from './brain/world.mjs';
import { townBrain, facilityBrain, jobBrain, questBrain } from './brain/town.mjs';
import { coverageObserve } from './coverage.mjs';
import { runFull } from './run-full.mjs';
import { provisionalBrain } from './brain/provisional.mjs';
import { shakeBrain } from './brain/shake.mjs';
import { shakeBrain as shakeBrain3, shakeIdle, HOLD, simKind } from './shake.mjs';
import { battleBrain, battleConfirmBrain, battleObserve } from './brain/battle.mjs';
import { rewardBrain, meOf } from './brain/reward.mjs';
import { dungeonBrain, dungeonObserve } from './brain/dungeon.mjs';
import { loadContent } from './content/load.mjs';
import { jobByName } from './content/reward.mjs';
import { now, log, wait } from './util.mjs';

/**
 * 頭（端末ごとに同じ物。押す物は View だけで決める）。
 * 区切り 2-Sa: 戦闘・報酬・宝箱・取り合い・ダンジョンの部屋は brain/battle・reward・dungeon。世界マップは brain/world（2-Sb）。
 * 残りの場面（遭遇・町 など）は、今までどおり仮の頭 brain/provisional に任せる。
 * 戦闘で bot が自分で開いた道具袋のシートは、common が「うっかり開いたシート」として閉じないよう、戦闘の頭を先に聞く。
 */
export function brainFor(shake) {
  // 区切り 3-S: shake = 'all' … 揺さぶり S1〜S13（shake.mjs）を頭の前と後に聞く。'sheet-wait' … 区切り 1-J の揺さぶり1つだけ（brain/shake.mjs）
  const all = shake === 'all';
  const inner = innerBrain(all ? null : shake);
  if (!all) return notVoterGuard(inner);
  return notVoterGuard((v, board) => {
    const s = shakeBrain3(v, board);
    if (s === HOLD) return null;
    if (s) return s;
    return inner(v, board) ?? shakeIdle(v, board);
  });
}

/**
 * 区切り 4（4人の通しの直し）: 票（扉・イベント・開け役・準備完了・取り合い・先へ進む）は、待つ枠（data-vote-status）に席の一覧が出ていて、
 * 自分の席が無い時は押さない（その場面のパーティに自分のキャラがいない = 票に入らない人。押しても効かない。人も枠を見て待つ）。
 * 4人の通しで、戦闘・宝箱に出ていない P2・P3 が「先へ進む」「任せる」を押し続けて「押しても変わらない」になり、票に入る人の番が来なかった
 */
function notVoterGuard(brain) {
  return (v, board) => {
    const d = brain(v, board);
    if (!d || !simKind(d)) return d;
    const voters = (v.facts.voteStatusSeats ?? []).map((t) => String(t).trim()).filter((t) => /^P\d$/.test(t));
    if (voters.length && !voters.includes(v.seat)) return null;
    // ダンジョンの「〜さんの〜の番です 順番が来たら、次の扉を選べます」の間は、扉を押さない（4人の通しで、世界マップの別の人の手番の間に
    // P1 が扉を押し続けて「押しても変わらない」になった。扉のボタンは押せる見た目だが、押しても票が入らない）
    if (simKind(d) === 'door' && v.waits.some((w) => w.id === 'dungeon-wait' && /順番が来たら/.test(w.text ?? ''))) return null;
    return d;
  };
}

function innerBrain(shake) {
  return (v, board) => {
    const pouch = v.mode === 'battle' && v.layers.some((l) => l.id === 'sheet' && l.value === 'pouch');
    return (
      shakeBrain(v, board, shake) ??
      (pouch ? battleBrain(v, board) : null) ??
      battleConfirmBrain(v, board) ??
      // 区切り 2-Sb: シートを開いて答える流れ（転職・装備）と、町・祠・神殿は common より先（common は「うっかり開いたシート」を閉じるため）
      jobBrain(v, board) ??
      questBrain(v, board) ??
      townBrain(v, board) ??
      facilityBrain(v, board) ??
      commonBrain(v) ??
      encounterBrain(v, board) ??
      dungeonBrain(v, board) ??
      battleBrain(v, board) ??
      rewardBrain(v, board) ??
      worldBrain(v, board) ??
      // 2-Sa の頭の場面で「待つ」（null）と答えた時に、仮の頭が代わりに押さないようにする（区切り 2-Sa の通しで、めくっている途中の報酬のカードを仮の頭が押した）
      (OWNED.has(v.mode) ? null : provisionalBrain(v))
    );
  };
}

/** 2-Sa の頭が受け持つ場面（仮の頭 brain/provisional には渡さない） */
const OWNED = new Set(['battle', 'reward', 'chest', 'dungeon', 'rest', 'event', 'cleared', 'world', 'encounter', 'town', 'shrine', 'sanctuary', 'ending', 'gameover']);

/** 毎ステップ、全端末の View から「見た事」を板に書く（入った部屋の種類・戦闘の記録）。板のメモは審判のメモへ移す */
function observe(views, board, judge) {
  dungeonObserve(views, board);
  battleObserve(views, board);
  coverageObserve(views, board);
  for (const n of (board.notes ?? []).splice(0)) judge.note(n.kind, n.text);
}

/** 戦闘の記録を報告の行にする（直し14） */
function battleLines(board, judge) {
  const st = board.stats ?? { battles: [] };
  const all = [...st.battles, ...(st.current ? [{ ...st.current, result: st.current.result ?? '（途中）' }] : [])];
  const lostOf = (b) => b.result && !['victory', 'escaped', '（途中）'].includes(b.result);
  const turns = all.filter((b) => b.turns).map((b) => b.turns);
  const acts = judge.actions.filter((a) => a.result === 'tap');
  const count = (re) => acts.filter((a) => re.test(a.what ?? '')).length;
  const lines = [
    `戦闘の数: ${all.length}（勝ち ${all.filter((b) => b.result === 'victory').length}・逃げた ${all.filter((b) => b.result === 'escaped').length}・負け ${all.filter(lostOf).length}）　憲章の目安は1シナリオ 32〜40（この通しは一部だけ）`,
    `1戦のターン数: ${turns.length ? `平均 ${(turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(1)}・最大 ${Math.max(...turns)}・最小 ${Math.min(...turns)}` : '—'}`,
    `予告を読んだ手（押した数）: BREAK を狙う ${count(/BREAK/)}・連携（仲間が殴った敵）${count(/連携/)}・回復 ${count(/回復|薬を使う/)}・フォーカスを足す ${count(/フォーカスを足す/)}・手数読みで止める ${count(/手数読み/)}`,
  ];
  for (const b of all) lines.push(`  - ${b.n}戦目: ${b.where}・${b.enemies.join('・')}・${b.turns}ターン・${b.result ?? '?'}`);
  const lost = all.filter(lostOf);
  lines.push(`全滅・負けた場所: ${lost.length ? lost.map((b) => `${b.n}戦目（${b.where}・${b.enemies.join('・')}・結果 ${b.result}）`).join('／') : 'なし'}`);
  const d = board.dungeon;
  if (d) lines.push(`入った部屋の種類（扉の予兆）: ${Object.entries(d.seen).map(([k, n]) => `${k || '予兆なし'} ${n}`).join('・') || 'なし'}　イベントで選んだ種類: ${Object.keys(d.events).join('・') || 'なし'}　休憩: ${Object.keys(d.restKinds).join('・') || 'なし'}　宝箱: ${d.chests}`);
  return lines;
}

/** わざと失敗させる板（台本が置く。ゲームの画面ではない）。P2 の画面全体を覆い、押す物の上に乗る */
function induceCover() {
  const d = document.createElement('div');
  d.setAttribute('data-smart-induced', 'cover');
  d.textContent = 'smart-coop: わざと置いた押せない板（SMART_INDUCE=cover）';
  Object.assign(d.style, { position: 'fixed', inset: '0', zIndex: '2147483647', background: 'rgba(255,0,0,.25)', color: '#fff', fontSize: '16px', pointerEvents: 'auto' });
  document.body.appendChild(d);
}

export async function run() {
  const mode = process.env.SMART_MODE ?? 'first-reward';
  if (mode === 'selftest') {
    const { selftest } = await import('./selftest.mjs');
    return selftest();
  }
  if (!['lobby', 'first-reward', 'first-dungeon', 'full', 'scenes'].includes(mode)) throw new Error(`SMART_MODE は first-reward・first-dungeon・full・scenes・lobby・selftest です（${mode}）`);
  if (mode === 'full') return runFull({ brainFor, observe, battleLines });
  // 区切り 4: 場面から（節目の保存を差し込んでから、画面のボタンで遊ぶ。scenes.mjs）
  if (mode === 'scenes') {
    const { runScene } = await import('./scenes.mjs');
    return runScene({ brainFor, observe, battleLines });
  }
  const people = Number(process.env.PEOPLE ?? 2);
  const seed = Number(process.env.SEED ?? 1) >>> 0;
  const scenario = Number(process.env.SCENARIO ?? 1);
  const shake = process.env.SMART_SHAKE ?? null;
  const induce = process.env.SMART_INDUCE ?? null;
  const emu = process.env.EMU_HOST ?? '127.0.0.1';
  const base = process.env.URL ?? 'http://127.0.0.1:4192/card-rpg/';
  const url = `${base}${base.includes('?') ? '&' : '?'}emu=${emu}&seed=${seed}`;
  // 守り(1): 手元の確認用サーバーにつなぐ URL でなければ、何もせずに止まる
  assertLocalUrl(url);
  const outDir = process.env.SMART_OUTPUT ?? `screenshots/smart-coop/s${scenario}-${people}p-${seed}`;
  const limitMin = Number(process.env.SMART_LIMIT_MIN ?? (mode === 'first-reward' ? 40 : mode === 'first-dungeon' ? 120 : people === 2 ? 180 : 300));
  // ゲームの説明書き（カード・ジョブ・装備・属性）を始める前に1回だけ読む（頭が使う。エンジンの状態ではない）
  if (mode !== 'lobby') await loadContent();
  const startedAt = now();
  log(`始める: ${url}・${people}人・種 ${seed}・${mode}${shake ? `・揺さぶり ${shake}` : ''}${induce ? `・わざと失敗 ${induce}` : ''}・結果 ${outDir}`);
  const fleet = await launchFleet({ people });
  const meter = memoryMeter(fleet.browser);
  meter.start();
  const judge = new Judge({ outDir, devices: fleet.devices, limitMin, expectSeed: seed });
  await judge.arm();
  const s = { judge };
  let board = {};
  let reached = '始める前';
  const milestones = [];
  const extra = [];
  let complete = false;
  try {
    const r = await setupRoom(s, fleet, { url, people, seed, scenarioIndex: scenario - 1 });
    extra.push(`ジョブ ${r.jobs?.join('・')}`);
    reached = r.started ? '冒険に出発して、全端末が世界マップ（物語を閉じた）' : '冒険に出発したが、物語が閉じきれない';
    milestones.push({ at: now(), text: reached, presses: judge.actions.length });
    log(reached);
    if (mode === 'lobby') {
      const c = new Conductor({ fleet, judge });
      await c.observe();
      await judge.step();
    } else if (r.started) {
      if (induce === 'cover') {
        await fleet.devices[1].page.evaluate(induceCover);
        judge.note('induced', 'わざと失敗させる板（SMART_INDUCE=cover）を P2 の画面に置いた（台本が置いた物。ゲームの不具合ではない）');
      }
      const brain = brainFor(shake);
      const c = new Conductor({ fleet, judge, brains: Object.fromEntries(fleet.devices.map((d) => [d.seat, brain])) });
      board = c.board;
      // 自分のジョブ（部屋の用意で bot が選んだ物。人が自分の選んだジョブを覚えているのと同じ）
      fleet.devices.forEach((d, k) => { meOf(board, d.seat).job = jobByName(r.jobs?.[k]); });
      const seen = new Set(['world']);
      let rewardSeen = false;
      let clearedSeen = false;
      let liveN = 0;
      const loop = [];
      let stuckCount = 0;
      for (let t = 0; t < (mode === 'first-dungeon' ? 20000 : 3000); t++) {
        const res = await c.tick();
        // 途中の様子（live.log = 操作の記録の1行を、押すたびに足す。流している間に外から見るため。比べる記録は actions.log）
        for (; liveN < judge.actions.length; liveN++) appendFileSync(`${outDir}/live.log`, `${actionLine(judge.actions[liveN], liveN)}\n`);
        for (const v of res.views ?? []) {
          if (!v.mode || seen.has(v.mode)) continue;
          seen.add(v.mode);
          const text = `${v.seat} が場面「${v.mode}」に着いた`;
          milestones.push({ at: now(), text, presses: judge.actions.length });
          log(text);
          reached = text;
        }
        observe(res.views ?? [], board, judge);
        // 行ったり来たり（2つ以下の同じ操作を 16 回くり返して、全体の番号が進まない）: 頭の決まりの食い違いの形。画面の指紋が変わるので「同じ物を8回」では拾えない
        if (res.pressed) {
          loop.push({ k: `${res.seat}|${res.what}`, seq: judge.lastSeq });
          if (loop.length > 16) loop.shift();
          if (loop.length === 16 && new Set(loop.map((x) => x.k)).size <= 2 && loop[0].seq === loop[15].seq) {
            await judge.fail('no-effect', { seat: res.seat, text: `同じ2つの操作を行ったり来たりして進まない: ${[...new Set(loop.map((x) => x.k))].join(' ／ ')}`, key: `loop|${[...new Set(loop.map((x) => x.k))].join('|')}` });
            log('ここで終える（行ったり来たり）');
            break;
          }
        }
        if ((res.views ?? []).some((v) => v.mode === 'reward')) rewardSeen = true;
        if ((res.views ?? []).some((v) => v.mode === 'cleared')) clearedSeen = true;
        if ((res.views ?? []).some((v) => v.mode === 'gameover')) {
          reached = `ゲームオーバー（全滅・命の灯火なし）: ${res.views.map((v) => `${v.seat}=${v.mode}`).join(' ')}`;
          milestones.push({ at: now(), text: reached, presses: judge.actions.length });
          log(reached);
          break;
        }
        // 着いた（first-dungeon）: 制覇の画面を見た後に、全端末が世界マップに戻った
        if (mode === 'first-dungeon' && clearedSeen && (res.views ?? []).every((v) => v.screen === 'game' && v.mode === 'world')) {
          reached = '最初の鍵のダンジョンを制覇して、全端末が世界マップに戻った';
          milestones.push({ at: now(), text: reached, presses: judge.actions.length });
          complete = true;
          log(reached);
          break;
        }
        // 着いた（first-reward）: 報酬を見た後に、全端末が報酬・戦闘の画面から出た（報酬を受け取り終えた）
        if (mode === 'first-reward' && rewardSeen && (res.views ?? []).every((v) => v.screen === 'game' && v.mode && v.mode !== 'reward' && v.mode !== 'battle')) {
          reached = `最初の戦闘の報酬を受け取り終えた（全端末: ${res.views.map((v) => `${v.seat}=${v.mode}`).join(' ')}）`;
          milestones.push({ at: now(), text: reached, presses: judge.actions.length });
          complete = true;
          log(reached);
          break;
        }
        const fk = judge.failures.map((f) => f.kind);
        // 止まり・互いに待つは、同じ画面なら2回目を記録しない（同じ不具合を数えない）ので、審判の答えで数える
        if (res.stuck === 'stuck') stuckCount++;
        // 画面の操作で進めない時は、そこで終える（オーナーの返事1。無理に押して進めない）
        if (res.stop || res.stuck === 'deadlock' || fk.includes('deadlock') || stuckCount >= 2 || (induce && judge.failures.length)) {
          log('ここで終える（進めない・止める決まりに当たった）');
          break;
        }
        if (!res.pressed) await wait(250);
      }
    }
  } catch (e) {
    if (e instanceof LobbyStop) {
      log(`部屋の用意で止まった: ${e.message}`);
      extra.push(`部屋の用意で止まった: ${e.message}`);
      if (!judge.failures.length) await judge.fail('lobby', { text: e.message });
    } else {
      log('思わぬエラー', e);
      await judge.fail('lobby', { text: `台本のエラー: ${e?.stack ?? e}` });
    }
  } finally {
    await fleet.close();
  }
  const mem = await meter.stop();
  const endedAt = now();
  const stage = mode === 'lobby' ? '1-J（部屋の用意まで）' : mode === 'first-dungeon' ? `2-Sa（最初の鍵のダンジョンの制覇まで${shake ? `・揺さぶり ${shake}` : ''}）` : `1-J（最初の戦闘の報酬まで${shake ? `・揺さぶり ${shake}` : ''}${induce ? `・わざと失敗 ${induce}` : ''}）`;
  const battle = mode === 'lobby' ? null : battleLines(board, judge);
  const code = writeReport(outDir, { scenario: `シナリオ${scenario}`, people, seed, stage, devices: fleet.devices, judge, startedAt, endedAt, reached: { run: reached }, milestones, extra, complete: false, reachedGoal: complete, mem, battle });
  log(`報告: ${outDir}/report.md（${judge.failures.length ? '失敗あり' : '失敗なし'}・${complete ? '着いた' : '着いていない'}）`);
  return judge.failures.length || !complete ? (mode === 'lobby' && !judge.failures.length ? 0 : 1) : 0;
}
