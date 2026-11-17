// 賢いマルチプレイ検証 bot: 通しの流れ（用意 → 回す → 報告）。環境変数を読む。
// 区切り 1-S では「部屋を作って全員が世界マップに出るまで」（lobby）と、センサーの自己テスト（selftest）だけ。
// 頭（brain/*）・揺さぶり・網羅の表・場面からは、後の区切りで足す。
//
// 環境変数:
//   URL           ゲームの場所（手元の preview。例 http://127.0.0.1:4192/card-rpg/）
//   EMU_HOST      エミュレーターの場所（127.0.0.1 か localhost だけ。既定 127.0.0.1）
//   PEOPLE        2 か 4（既定 2）
//   SEED          種（既定 1）。ジョブの選び方と、ゲームの種（&seed=。1-G で働く）に使う
//   SCENARIO      シナリオの番号（1 = 1本目。既定 1。1本目以外の解放は区切り 1-J 以降）
//   SMART_MODE    lobby（既定）か selftest
//   SMART_OUTPUT  結果の置き場所（既定 screenshots/smart-coop/<シナリオ>-<人数>p-<種>）
import { assertLocalUrl, launchFleet } from './fleet.mjs';
import { Judge } from './judge.mjs';
import { Conductor } from './conductor.mjs';
import { setupRoom, LobbyStop } from './lobby.mjs';
import { writeReport } from './report.mjs';
import { now, log } from './util.mjs';

export async function run() {
  const mode = process.env.SMART_MODE ?? 'lobby';
  if (mode === 'selftest') {
    const { selftest } = await import('./selftest.mjs');
    return selftest();
  }
  if (mode !== 'lobby') throw new Error(`SMART_MODE は lobby か selftest です（${mode}）`);
  const people = Number(process.env.PEOPLE ?? 2);
  const seed = Number(process.env.SEED ?? 1) >>> 0;
  const scenario = Number(process.env.SCENARIO ?? 1);
  const emu = process.env.EMU_HOST ?? '127.0.0.1';
  const base = process.env.URL ?? 'http://127.0.0.1:4192/card-rpg/';
  const url = `${base}${base.includes('?') ? '&' : '?'}emu=${emu}&seed=${seed}`;
  // 守り(1): 手元の確認用サーバーにつなぐ URL でなければ、何もせずに止まる
  assertLocalUrl(url);
  const outDir = process.env.SMART_OUTPUT ?? `screenshots/smart-coop/s${scenario}-${people}p-${seed}`;
  const startedAt = now();
  log(`始める: ${url}・${people}人・種 ${seed}・結果 ${outDir}`);
  const fleet = await launchFleet({ people });
  const judge = new Judge({ outDir, devices: fleet.devices, limitMin: people === 2 ? 180 : 300 });
  await judge.arm();
  const s = { judge };
  let reached = '始める前';
  const extra = [];
  try {
    const r = await setupRoom(s, fleet, { url, people, seed, scenarioIndex: scenario - 1 });
    extra.push(`部屋 ${r.code}・ジョブ ${r.jobs?.join('・')}`);
    reached = r.started ? '冒険に出発して、全端末が世界マップ（物語を閉じた）' : '冒険に出発したが、物語が閉じきれない';
    log(reached);
    // 出発の後に、全端末で1回だけ点検（窓・はみ出し・状態の印）。頭はまだ無いので押さない（区切り 1-J から）
    const c = new Conductor({ fleet, judge });
    await c.observe();
    await judge.step();
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
  const code = writeReport(outDir, { scenario: `シナリオ${scenario}`, people, seed, stage: '1-S（部屋の用意まで）', devices: fleet.devices, judge, startedAt, endedAt: now(), reached: { run: reached }, extra, complete: false });
  log(`報告: ${outDir}/report.md（${judge.failures.length ? '失敗あり' : '失敗なし'}）`);
  return code;
}
