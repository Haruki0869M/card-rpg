// 賢いマルチプレイ検証 bot: 通し（区切り 2-Sb。SMART_MODE=full）
// 新しい冒険 → エンディングかゲームオーバー。ゲームオーバーなら、どこで・なぜを記録して、新しい冒険で網羅の表の残りを続ける（骨組み §5）。
// 「クリア」と書くのは、その回の通しの中で、画面のボタンだけでエンディングの画面（data-ending）に着いた時だけ（直し10）。
// 環境変数は run.mjs と同じ（PEOPLE・SEED・SCENARIO・URL・EMU_HOST・SMART_LIMIT_MIN・SMART_OUTPUT）＋ SMART_RESTARTS（やり直しの上限。既定 2）
import { appendFileSync, writeFileSync } from 'node:fs';
import { assertLocalUrl, launchFleet } from './fleet.mjs';
import { Judge } from './judge.mjs';
import { Conductor } from './conductor.mjs';
import { setupRoom, LobbyStop } from './lobby.mjs';
import { writeReport, actionLine } from './report.mjs';
import { memoryMeter } from './mem.mjs';
import { meOf } from './brain/reward.mjs';
import { loadContent } from './content/load.mjs';
import { jobByName } from './content/reward.mjs';
import { coverageReport, coverageNextRun } from './coverage.mjs';
import { now, log, wait, phase } from './util.mjs';
import { shakeInit, shakeObserve, shakeAfterTick, shakeBeforePress, pickSimultaneous, shakeReport, shakeCoverage } from './shake.mjs';

/** 新しい冒険（やり直し）の前に、前の冒険の板を空にする（網羅の表・戦闘の記録・遭遇の網羅の数は残す） */
function resetAdventureBoard(board) {
  for (const k of ['world', 'townVisit', 'facility', 'jobFlow', 'me', 'battle', 'rewardSeen', 'dungeon']) delete board[k];
  if (board.sh) board.sh.m = null;
}

/** 画面の写真を全端末ぶん残す（節目・確かめの証拠） */
async function shotAll(fleet, dir, name) {
  const files = [];
  for (const d of fleet.devices) {
    const f = `${dir}/${name}-${d.seat}.png`;
    try {
      await d.page.screenshot({ path: f });
      files.push(f);
    } catch {
      // 閉じた端末など
    }
  }
  return files;
}

/**
 * @param o { brainFor, observe, battleLines }（run.mjs の部品を渡す。同じ頭・同じ記録で回す）
 */
export async function runFull({ brainFor, observe, battleLines }) {
  const people = Number(process.env.PEOPLE ?? 2);
  const seed = Number(process.env.SEED ?? 1) >>> 0;
  const scenario = Number(process.env.SCENARIO ?? 1);
  const emu = process.env.EMU_HOST ?? '127.0.0.1';
  const base = process.env.URL ?? 'http://127.0.0.1:4192/card-rpg/';
  const maxRestarts = Number(process.env.SMART_RESTARTS ?? 2);
  const outDir = process.env.SMART_OUTPUT ?? `screenshots/smart-coop/s${scenario}-${people}p-${seed}-full`;
  const limitMin = Number(process.env.SMART_LIMIT_MIN ?? 240);
  const stopOn = process.env.SMART_STOP_ON ? new RegExp(process.env.SMART_STOP_ON) : null;
  // 区切り 4: 短い通し（SMART_UNTIL=first-dungeon … 最初の鍵のダンジョンを制覇して、全端末が世界マップに戻ったら終える）
  const untilGoal = process.env.SMART_UNTIL ?? null;
  // 区切り 4: 節目の保存（計画 §6-3）を書くか（既定 書く。SMART_CHECKPOINTS=0 で書かない）
  const wantCheckpoints = process.env.SMART_CHECKPOINTS !== '0';
  const urlOf = (sd) => `${base}${base.includes('?') ? '&' : '?'}emu=${emu}&seed=${sd}`;
  assertLocalUrl(urlOf(seed));
  await loadContent({ scenarioIndex: scenario - 1 });
  const startedAt = now();
  log(`始める（通し）: ${urlOf(seed)}・${people}人・種 ${seed}・やり直しの上限 ${maxRestarts}・上限 ${limitMin} 分・結果 ${outDir}`);
  const fleet = await launchFleet({ people });
  // 区切り 3-S: 見張り（1つの処理が 60 秒より長く返らない時に、何を待っているかを出す）
  const dog = setInterval(() => {
    if (Date.now() - phase.at > 60000) log(`見張り: 「${phase.name}」で ${Math.round((Date.now() - phase.at) / 1000)} 秒返らない`);
  }, 30000);
  const meter = memoryMeter(fleet.browser);
  meter.start();
  const judge = new Judge({ outDir, devices: fleet.devices, limitMin, expectSeed: seed });
  await judge.arm();
  const s = { judge };
  const board = {};
  // 区切り 3-S: 揺さぶり（SMART_SHAKE=none で入れない。既定は全部 = all）
  const shake = process.env.SMART_SHAKE ?? 'all';
  if (shake === 'all') shakeInit(board, seed, people);
  // 区切り 4: 侵食度の上がり方の記録（S10 の見直し。上がった時の直前の操作と、S10 が絡んでいたか）
  const corr = { last: null, rows: [], s10Rises: 0, rises: 0, s10Sum: 0, sum: 0 };
  // 区切り 4: 節目の保存の数（制覇した鍵のダンジョンの数・出た町の数）
  const cp = { kd: 0, town: 0, files: [], lastWorldAt: 0 };
  let untilDone = false;
  const milestones = [];
  const extra = [];
  const runs = [];
  const jobLog = [];
  const verify = { optionWait: null, hexSample: null };
  let reached = '始める前';
  let ending = false;
  let stopAll = false;
  let liveN = 0;
  const battlesNow = () => (board.stats?.battles ?? []).length;
  for (let runNo = 1; runNo <= 1 + maxRestarts && !stopAll; runNo++) {
    const seedN = seed + (runNo - 1) * 1000;
    const url = urlOf(seedN);
    assertLocalUrl(url);
    judge.expectSeed = seedN;
    judge.seeds.clear();
    judge.lastSeq = -1;
    judge.lastProgress = Date.now();
    if (runNo > 1) {
      coverageNextRun(board);
      resetAdventureBoard(board);
    }
    const rec = { runNo, seed: seedN, startAt: now(), startPresses: judge.actions.length, startBattles: battlesNow(), end: null, where: null, corruption: null, maxCorruption: 0 };
    runs.push(rec);
    let r;
    try {
      r = await setupRoom(s, fleet, { url, people, seed: seedN, scenarioIndex: scenario - 1 });
    } catch (e) {
      rec.end = 'lobby';
      rec.where = `部屋の用意で止まった: ${e?.message ?? e}`;
      if (!(e instanceof LobbyStop)) await judge.fail('lobby', { text: `台本のエラー: ${e?.stack ?? e}` });
      else if (!judge.failures.length) await judge.fail('lobby', { text: e.message });
      break;
    }
    extra.push(`${runNo}回目の冒険: ジョブ ${r.jobs?.join('・')}・種 ${seedN}`);
    milestones.push({ at: now(), text: `${runNo}回目の冒険: 出発して全端末が世界マップ`, presses: judge.actions.length });
    if (!r.started) {
      rec.end = 'stop';
      rec.where = '物語が閉じきれない';
      break;
    }
    const brain = brainFor(shake);
    const c = new Conductor({ fleet, judge, brains: Object.fromEntries(fleet.devices.map((d) => [d.seat, brain])) });
    c.board = board;
    if (shake === 'all') c.pickSim = (wants, views) => pickSimultaneous(wants, views, board);
    fleet.devices.forEach((d, k) => {
      meOf(board, d.seat).job = jobByName(r.jobs?.[k]);
    });
    // 画面での確かめ1 は押す前の形で写真を残す（conductor の onViews。押した後だと、もう結果の段になっている）
    c.onViews = async (views) => {
      if (board.sh) await shakeBeforePress({ judge, views, board });
      // 画面での確かめ1（c4d9d83）: 世界マップのマスのイベントで、手番でない人の選択肢が押せない（disabled・data-option-wait="1"）
      if (!verify.optionWait) {
        for (const v of views) {
          const lock = (v.facts.turnLock ?? [])[0]?.['data-turn-lock'];
          const opts = v.facts.dOptions ?? [];
          if (v.mode !== 'event' || !lock || lock === v.seat || !opts.length) continue;
          const all = opts.every((o) => o.disabled !== null && o['data-option-wait'] === '1');
          const files = await shotAll(fleet, outDir, 'verify1-option-wait');
          verify.optionWait = { seat: v.seat, ok: all, opts: opts.map((o) => `${o['data-event-option']}:disabled=${o.disabled !== null}・wait=${o['data-option-wait']}`), files, event: (v.facts.eventId ?? [])[0]?.['data-event-window'] };
          judge.note('check', `確かめ1（c4d9d83）: ${v.seat}（手番でない人）のマスのイベント「${verify.optionWait.event}」の選択肢 ${verify.optionWait.opts.join('・')} → ${all ? 'OK（全部押せない・待ちの印）' : 'NG'}`);
          break;
        }
      }
    };
    const seen = new Set();
    const loop = [];
    let stuckCount = 0;
    let lastBattles = battlesNow();
    for (let t = 0; t < 400000; t++) {
      let res;
      try {
        res = await c.tick();
      } catch (e) {
        log('思わぬエラー（1手）', e);
        await judge.fail('lobby', { text: `台本のエラー: ${e?.stack ?? e}`, key: `script|${String(e?.message ?? e).slice(0, 80)}` });
        rec.end = 'stop';
        rec.where = `台本のエラー: ${e?.message ?? e}`;
        stopAll = true;
        break;
      }
      for (; liveN < judge.actions.length; liveN++) appendFileSync(`${outDir}/live.log`, `${actionLine(judge.actions[liveN], liveN)}\n`);
      const views = res.views ?? [];
      observe(views, board, judge);
      if (board.sh) {
        phase.set('揺さぶりの確かめ');
        shakeObserve(views, board);
        phase.set('揺さぶりの後（読み込み直し・写し）');
        await shakeAfterTick({ fleet, judge, views, board });
      }
      phase.set('通しの見張り');
      // 戦闘の記録に、何回目の冒険かを付ける
      for (const b of (board.stats?.battles ?? []).slice(lastBattles)) b.run = runNo;
      lastBattles = battlesNow();
      // 場面に初めて着いた（この回で）: 記録と写真
      for (const v of views) {
        if (!v.mode || seen.has(v.mode)) continue;
        seen.add(v.mode);
        const text = `${runNo}回目: ${v.seat} が場面「${v.mode}」に着いた`;
        milestones.push({ at: now(), text, presses: judge.actions.length });
        log(text);
        reached = text;
        await shotAll(fleet, outDir, `m${runNo}-${v.mode}`);
      }
      // 侵食度（終わりの悪化の度合い。直し14）
      for (const v of views) {
        const cr = (v.facts.wCorruption ?? [])[0]?.['data-corruption'];
        if (cr !== undefined && cr !== null) {
          rec.corruption = Number(cr);
          rec.maxCorruption = Math.max(rec.maxCorruption, Number(cr));
        }
      }
      // 区切り 4: 侵食度の上がり方（P1 の画面の数。上がった時、直前 12 手に S10 があったか）
      {
        const p1v = views.find((v) => v.seat === 'P1');
        const cr = (p1v?.facts.wCorruption ?? [])[0]?.['data-corruption'];
        if (cr !== undefined && cr !== null) {
          const val = Number(cr);
          if (corr.last !== null && val !== corr.last) {
            const recent = judge.actions.slice(-12);
            const s10 = recent.some((a) => /揺さぶり S10/.test(a.what ?? ''));
            const d = val - corr.last;
            if (d > 0) {
              corr.rises++;
              corr.sum += d;
              if (s10) {
                corr.s10Rises++;
                corr.s10Sum += d;
              }
            }
            const row = `${String(judge.actions.length).padStart(5, '0')} ${corr.last}→${val}（${d > 0 ? '+' : ''}${d}）${s10 ? ' ★直前12手に S10' : ''} | 直前: ${recent.slice(-4).map((a) => `${a.seat}「${String(a.what ?? '').slice(0, 30)}」`).join(' → ')}`;
            corr.rows.push(row);
            appendFileSync(`${outDir}/corruption.log`, `${row}\n`);
          }
          corr.last = val;
        }
      }
      // 区切り 4: 節目の保存（計画 §6-3）。全端末が世界マップで、窓が無く、演出の途中でない時に書く
      if (wantCheckpoints && views.length && views.every((v) => v.screen === 'game' && v.mode === 'world' && !v.busy.length && !v.layers.length)) {
        const kdNow = (board.cov?.rows ?? []).filter((r) => r.group === 'keydungeon' && r.stepped).length;
        const townNow = board.sh?.n?.townExit ?? 0;
        let name = null;
        if (kdNow > cp.kd) name = `kd${kdNow}`;
        else if (townNow > cp.town) name = `town${townNow}`;
        else if (judge.actions.length - cp.lastWorldAt >= 400) name = `w${judge.actions.length}`;
        if (name) {
          cp.kd = kdNow;
          cp.town = townNow;
          cp.lastWorldAt = judge.actions.length;
          const file = `${outDir}/checkpoints/s${scenario}-${people}p-r${runNo}-${name}.json`;
          if (await judge.checkpoint(file, { scenario, runNo, name, presses: judge.actions.length, battles: battlesNow(), jobs: r.jobs })) cp.files.push(file);
        }
        // 短い通し: 最初の鍵のダンジョンを制覇して、全端末が世界マップに戻った
        if (untilGoal === 'first-dungeon' && kdNow >= 1) untilDone = true;
      }
      if (untilDone) {
        rec.end = 'until';
        rec.where = '短い通しの終わり（最初の鍵のダンジョンを制覇して、全端末が世界マップに戻った）';
        reached = `${runNo}回目: ${rec.where}`;
        milestones.push({ at: now(), text: reached, presses: judge.actions.length });
        log(reached);
        await shotAll(fleet, outDir, `until${runNo}`);
        stopAll = true;
        break;
      }
      // 転職の時期（直し14）
      for (const v of views) {
        const jt = v.facts.jPickTitle;
        if (jt && /に転職した！/.test(jt) && !jobLog.some((x) => x.run === runNo && x.seat === v.seat && x.title === jt)) {
          jobLog.push({ run: runNo, seat: v.seat, title: jt, min: ((Date.now() - new Date(rec.startAt)) / 60000).toFixed(1), battles: battlesNow() - rec.startBattles, presses: judge.actions.length - rec.startPresses });
          milestones.push({ at: now(), text: `${runNo}回目: ${v.seat}「${jt.replace(/！.*$/, '！')}」`, presses: judge.actions.length });
          await shotAll(fleet, outDir, `job${runNo}-${v.seat}-${jobLog.length}`);
        }
      }
      // 画面での確かめ3: マスの印（地形・道・潮）に値が入っている
      if (!verify.hexSample) {
        const v = views.find((x) => x.mode === 'world' && (x.facts.wHexes ?? []).length);
        if (v) {
          const hx = v.facts.wHexes;
          const by = {};
          for (const h of hx) by[h['data-terrain']] = (by[h['data-terrain']] ?? 0) + 1;
          verify.hexSample = { seat: v.seat, n: hx.length, roads: hx.filter((h) => h['data-road'] !== null).length, tides: hx.filter((h) => h['data-tide']).length, by, sample: hx.slice(0, 6).map((h) => `${h['data-hex']}=${h['data-terrain']}${h['data-road'] !== null ? '・道' : ''}${h['data-tide'] ? `・潮${h['data-tide']}` : ''}`) };
          judge.note('check', `確かめ3: ${v.seat} の見えているマス ${hx.length}（地形 ${Object.entries(by).map(([k, n]) => `${k} ${n}`).join('・')}・道 ${verify.hexSample.roads}・潮 ${verify.hexSample.tides}）例 ${verify.hexSample.sample.join(' ')}`);
        }
      }
      // 行ったり来たり（run と同じ検出）
      if (res.pressed) {
        loop.push({ k: `${res.seat}|${res.what}`, seq: judge.lastSeq });
        if (loop.length > 16) loop.shift();
        if (loop.length === 16 && new Set(loop.map((x) => x.k)).size <= 2 && loop[0].seq === loop[15].seq) {
          await judge.fail('no-effect', { seat: res.seat, text: `同じ2つの操作を行ったり来たりして進まない: ${[...new Set(loop.map((x) => x.k))].join(' ／ ')}`, key: `loop|${[...new Set(loop.map((x) => x.k))].join('|')}` });
          rec.end = 'stop';
          rec.where = `行ったり来たり: ${[...new Set(loop.map((x) => x.k))].join(' ／ ')}`;
          await shotAll(fleet, outDir, `stop${runNo}`);
          stopAll = true;
          break;
        }
      }
      // エンディング: 全端末がエンディングの画面に着いた
      if (views.length && views.every((v) => v.mode === 'ending')) {
        // 終わりの侵食度は、エンディングの記録の枠の字（最後のダンジョンの中で進んだ分も入る。世界マップで最後に見た数より新しい）
        const ep = views.map((v) => v.facts.endPanel).find(Boolean) ?? '';
        const cm = /最後の\S*?\s*(\d+)%/.exec(ep);
        if (cm) {
          rec.corruption = Number(cm[1]);
          rec.maxCorruption = Math.max(rec.maxCorruption, rec.corruption);
        }
        rec.endPanel = ep;
        rec.end = 'ending';
        rec.where = 'エンディングの画面（data-ending）に全端末が着いた';
        reached = `${runNo}回目の冒険でエンディングに着いた（画面のボタンだけ）`;
        milestones.push({ at: now(), text: reached, presses: judge.actions.length });
        await shotAll(fleet, outDir, `ending${runNo}`);
        ending = true;
        break;
      }
      // ゲームオーバー: どこで・なぜを記録して、新しい冒険へ
      const go = views.find((v) => v.mode === 'gameover');
      if (go) {
        const lastB = (board.stats?.battles ?? []).slice(-1)[0];
        rec.end = 'gameover';
        rec.where = `${(go.facts.gameover ?? [])[0]?.['data-gameover'] === 'corruption' ? '侵食度が100%（世界の終わり）' : '全滅（命の灯火なし）'}・最後の戦闘: ${lastB ? `${lastB.n}戦目 ${lastB.where}・${lastB.enemies.join('・')}・結果 ${lastB.result}` : 'なし'}`;
        reached = `${runNo}回目の冒険: ゲームオーバー（${rec.where}）`;
        milestones.push({ at: now(), text: reached, presses: judge.actions.length });
        log(reached);
        await shotAll(fleet, outDir, `gameover${runNo}`);
        break;
      }
      const fk = judge.failures.map((f) => f.kind);
      // 区切り 3-S（見逃しの証明）: SMART_STOP_ON（失敗の種類か字に当たる正規表現）に当たる失敗を見つけたら、そこで終える
      if (stopOn && judge.failures.some((f) => stopOn.test(`${f.kind} ${f.text}`))) {
        rec.end = 'stop';
        rec.where = `SMART_STOP_ON（${stopOn}）に当たる失敗を見つけたので終えた`;
        await shotAll(fleet, outDir, `stopon${runNo}`);
        stopAll = true;
        break;
      }
      if (res.stuck === 'stuck') stuckCount++;
      if (res.stop || res.stuck === 'deadlock' || fk.includes('deadlock') || stuckCount >= 2) {
        rec.end = 'stop';
        rec.where = res.stop ? '止める決まりに当たった（上限の時間・10種類・守り）' : res.stuck === 'deadlock' || fk.includes('deadlock') ? '互いに待つ（どの端末も押す物が無い）' : '止まり（40秒進まない）を2回';
        log(`ここで終える: ${rec.where}`);
        await shotAll(fleet, outDir, `stop${runNo}`);
        stopAll = true;
        break;
      }
      if (!res.pressed) await wait(250);
    }
    rec.endAt = now();
    rec.presses = judge.actions.length - rec.startPresses;
    rec.battles = battlesNow() - rec.startBattles;
    if (ending || rec.end !== 'gameover') break;
    // ゲームオーバーの後: 時間が残っていれば、新しい冒険で残りを続ける
    if (Date.now() - judge.t0 > judge.limitMs - 10 * 60000) {
      extra.push('ゲームオーバーの後、上限の時間まで10分を切ったので、新しい冒険は始めなかった');
      break;
    }
  }
  clearInterval(dog);
  await shotAll(fleet, outDir, 'final');
  await fleet.close();
  const mem = await meter.stop();
  const endedAt = now();
  const battle = battleLines(board, judge);
  if (board.sh) shakeCoverage(board, judge);
  const cov = coverageReport(board);
  const shk = board.sh ? shakeReport(board) : null;
  const endName = { until: '短い通しの終わり', ending: 'エンディング（クリア）', gameover: 'ゲームオーバー', stop: '途中で止まった', lobby: '部屋の用意で止まった' };
  const runLines = runs.map((x) => `${x.runNo}回目（種 ${x.seed}）: ${endName[x.end] ?? '途中'}・${x.where ?? ''}・${((new Date(x.endAt ?? endedAt) - new Date(x.startAt)) / 60000).toFixed(1)} 分・手数 ${x.presses ?? '?'}・戦闘 ${x.battles ?? '?'}・最後の侵食度 ${x.corruption ?? '?'}%（最大 ${x.maxCorruption}%）${x.endPanel ? `・エンディングの記録「${x.endPanel}」` : ''}`);
  const balance = [
    ...runs.map((x) => `${x.runNo}回目の冒険の戦闘の数: ${x.battles ?? '?'}（憲章の目安は1シナリオ 32〜40）・終わりの侵食度 ${x.corruption ?? '?'}%`),
    `転職の時期: ${jobLog.length ? jobLog.map((j) => `${j.run}回目 ${j.seat}「${j.title.replace(/！.*$/, '！')}」（冒険の始めから ${j.min} 分・${j.battles} 戦目の後・${j.presses} 手）`).join('／') : 'なし（転職しなかった）'}`,
  ];
  const verifyLines = [
    `確かめ1（c4d9d83・マスのイベントで手番でない人の選択肢）: ${verify.optionWait ? `${verify.optionWait.ok ? 'OK' : 'NG'}（${verify.optionWait.seat}・イベント ${verify.optionWait.event}・${verify.optionWait.opts.join('・')}・写真 ${verify.optionWait.files.join(' ')}）` : '通しの中で「手番でない人に見えるマスのイベント」が出なかった（未確認）'}`,
    `確かめ2（3eb45ad・答えていない「ターン終了」の確認が次の戦闘に残らない）: ${judge.notes.some((n) => /ターンの始めに、まだカードを使っていないのに「ターン終了」の確認の窓/.test(n.text)) ? 'NG（また起きた。注意の行を見る）' : `OK（通しの ${battlesNow()} 戦で1回も起きなかった）`}`,
    `確かめ3（マスの印）: ${verify.hexSample ? `値あり（${verify.hexSample.seat}・見えているマス ${verify.hexSample.n}・地形 ${Object.entries(verify.hexSample.by).map(([k, n]) => `${k} ${n}`).join('・')}・道 ${verify.hexSample.roads}・潮 ${verify.hexSample.tides}・例 ${verify.hexSample.sample.join(' ')}）` : '世界マップのマスが読めなかった'}`,
  ];
  extra.push(...verifyLines);
  // 区切り 4: 侵食度の上がり方（S10 の見直し）と節目の保存
  extra.push(`侵食度が上がった回数 ${corr.rises}（合計 +${corr.sum}）のうち、直前12手に揺さぶり S10 があった回数 ${corr.s10Rises}（合計 +${corr.s10Sum}）。1行ずつは corruption.log`);
  extra.push(`節目の保存（計画 §6-3。読むだけで取った状態の写し）: ${cp.files.length ? cp.files.map((x) => x.replace(/^.*[\/]/, '')).join('・') : 'なし'}`);
  writeReport(outDir, {
    scenario: `シナリオ${scenario}`,
    people,
    seed,
    stage: `3-S（通し: エンディングかゲームオーバーまで。揺さぶり ${shake}・やり直しの上限 ${maxRestarts}）`,
    devices: fleet.devices,
    judge,
    startedAt,
    endedAt,
    reached: { run: ending ? reached : `${reached}（エンディングには着いていない）` },
    milestones,
    extra,
    complete: false,
    reachedGoal: ending || untilDone,
    mem,
    battle,
    balance,
    runs: runLines,
    coverage: cov.lines,
    coverageRows: cov.rows,
    shake: shk?.lines ?? null,
    shakeOrder: shk?.order ?? null,
  });
  writeFileSync(`${outDir}/coverage.json`, JSON.stringify({ summary: cov.summary, rows: cov.rows, worldLog: board.world?.log ?? [] }, null, 1));
  log(`報告: ${outDir}/report.md（${judge.failures.length ? '失敗あり' : '失敗なし'}・${ending ? 'エンディングに着いた' : 'エンディングに着いていない'}）`);
  return judge.failures.length || !(ending || untilDone) ? 1 : 0;
}
