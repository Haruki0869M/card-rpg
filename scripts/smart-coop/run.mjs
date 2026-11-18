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
//   SMART_MODE    first-reward（既定）・lobby（部屋の用意まで）・selftest
//   SMART_SHAKE   sheet-wait … 誘いの返事を待たせている間に P2 がパーティ・装備のシートを開いて閉じる（区切り 1-J の検出の確かめ）
//   SMART_INDUCE  cover … わざと失敗させる（台本が P2 の画面に「押せない板」を置く。証拠が全端末ぶん残るかの確かめ。ゲームの不具合ではない）
//   SMART_LIMIT_MIN  上限の分（既定: first-reward は 40 分）
//   SMART_OUTPUT  結果の置き場所（既定 screenshots/smart-coop/<シナリオ>-<人数>p-<種>）
import { assertLocalUrl, launchFleet } from './fleet.mjs';
import { Judge } from './judge.mjs';
import { Conductor } from './conductor.mjs';
import { setupRoom, LobbyStop } from './lobby.mjs';
import { writeReport } from './report.mjs';
import { memoryMeter } from './mem.mjs';
import { commonBrain } from './brain/common.mjs';
import { worldBrain } from './brain/world.mjs';
import { provisionalBrain } from './brain/provisional.mjs';
import { shakeBrain } from './brain/shake.mjs';
import { now, log, wait } from './util.mjs';

/** 1-J の頭（端末ごとに同じ物。押す物は View だけで決める） */
export function brainFor(shake) {
  return (v, board) => shakeBrain(v, board, shake) ?? commonBrain(v) ?? worldBrain(v, board) ?? provisionalBrain(v);
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
  if (mode !== 'lobby' && mode !== 'first-reward') throw new Error(`SMART_MODE は first-reward・lobby・selftest です（${mode}）`);
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
  const limitMin = Number(process.env.SMART_LIMIT_MIN ?? (mode === 'first-reward' ? 40 : people === 2 ? 180 : 300));
  const startedAt = now();
  log(`始める: ${url}・${people}人・種 ${seed}・${mode}${shake ? `・揺さぶり ${shake}` : ''}${induce ? `・わざと失敗 ${induce}` : ''}・結果 ${outDir}`);
  const fleet = await launchFleet({ people });
  const meter = memoryMeter(fleet.browser);
  meter.start();
  const judge = new Judge({ outDir, devices: fleet.devices, limitMin, expectSeed: seed });
  await judge.arm();
  const s = { judge };
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
      const seen = new Set(['world']);
      let rewardSeen = false;
      let stuckCount = 0;
      for (let t = 0; t < 3000; t++) {
        const res = await c.tick();
        for (const v of res.views ?? []) {
          if (!v.mode || seen.has(v.mode)) continue;
          seen.add(v.mode);
          const text = `${v.seat} が場面「${v.mode}」に着いた`;
          milestones.push({ at: now(), text, presses: judge.actions.length });
          log(text);
          reached = text;
        }
        if ((res.views ?? []).some((v) => v.mode === 'reward')) rewardSeen = true;
        // 着いた: 報酬を見た後に、全端末が報酬・戦闘の画面から出た（報酬を受け取り終えた）
        if (rewardSeen && (res.views ?? []).every((v) => v.screen === 'game' && v.mode && v.mode !== 'reward' && v.mode !== 'battle')) {
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
  const stage = mode === 'lobby' ? '1-J（部屋の用意まで）' : `1-J（最初の戦闘の報酬まで${shake ? `・揺さぶり ${shake}` : ''}${induce ? `・わざと失敗 ${induce}` : ''}）`;
  const code = writeReport(outDir, { scenario: `シナリオ${scenario}`, people, seed, stage, devices: fleet.devices, judge, startedAt, endedAt, reached: { run: reached }, milestones, extra, complete: false, reachedGoal: complete, mem });
  log(`報告: ${outDir}/report.md（${judge.failures.length ? '失敗あり' : '失敗なし'}・${complete ? '着いた' : '着いていない'}）`);
  return judge.failures.length || !complete ? (mode === 'lobby' && !judge.failures.length ? 0 : 1) : 0;
}
