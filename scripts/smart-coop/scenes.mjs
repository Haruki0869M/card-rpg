// 賢いマルチプレイ検証 bot: 「場面から」（計画 §6-3・直し10。区切り 4）
// 通しの節目の保存（run-full が書く checkpoints/*.json。ホストの状態の写しを読んだだけの物）から始めて、そこから先は全部画面のボタンで遊ぶ。
// 確認用の入口（window.__online の inject・resync。エミュレーターの時だけ読み込まれる src/dev/onlineDebug.ts にもうある物）を使うのは、
// 保存を用意する所だけ（手順 1〜3）。src/ は変えない。
//   1. 新しい部屋を、画面のボタンで作る（lobby.mjs。人数と席は保存と同じ）
//   2. ホストが保存を差し込む（inject）→ ほかの端末が取り直す（resync）
//   3. 書く入口を封じる（judge.sealNow）。ここから先は全部画面のボタン（press.mjs）
// 節目の保存では届かない場面は、保存に小さな書き換えを足す（計画 §6-3 の表）。書き換えた中身は報告に必ず書く。
// 書き換えだけで見た所は「完走」と呼ばない（直し10）。報告の「書き換えた保存で見た所」に書く。
//
// 環境変数: SCENE（scourge・peddler・special・top・altar）・SCENE_FROM（節目の保存のファイル）・URL・EMU_HOST・SEED（新しい部屋の種）・
//           SMART_LIMIT_MIN（既定 25 分）・SMART_OUTPUT
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLocalUrl, launchFleet } from './fleet.mjs';
import { Judge } from './judge.mjs';
import { Conductor } from './conductor.mjs';
import { setupRoom, LobbyStop } from './lobby.mjs';
import { writeReport, actionLine } from './report.mjs';
import { memoryMeter } from './mem.mjs';
import { meOf } from './brain/reward.mjs';
import { KB, loadContent } from './content/load.mjs';
import { coverageReport } from './coverage.mjs';
import { now, log, wait, until } from './util.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 場面ごとの「見た」の線（網羅の表の行）と名前 */
export const SCENE_DEFS = {
  scourge: { name: '災厄との戦い', goal: (ids) => ids.some((id) => /^scourge:.*:defeat$/.test(id)) || false, rows: /^scourge:/ },
  peddler: { name: '行商人（出現スポット）で買う', goal: (ids) => ids.includes('peddler-buy'), rows: /^(spawn:peddler|event:spawnPeddler|peddler-buy)$/ },
  special: { name: '特殊職への転職', goal: (ids) => ids.includes('job:special'), rows: /^job:special$|^sanctuary:/ },
  top: { name: '最上位への転職（直前から）', goal: (ids) => ids.includes('job:top'), rows: /^job:top$|^shrine:|^sanctuary:/ },
  altar: { name: '晶石の祭壇（ランダムダンジョン「古代の晶洞」）', goal: (ids) => ids.includes('altar:upgrade') || ids.includes('altar:transmute'), rows: /^altar:|^dungeon:random/ },
};

/** ゲームのデータと地図の道具を読む（保存の書き換えに使う。vite で src をそのまま読む。画面の頭には渡さない） */
async function loadEngineBits() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const { CLASSES } = await server.ssrLoadModule('/src/data/classes/index.ts');
    const { SANCTUARIES, SCOURGES } = await server.ssrLoadModule('/src/data/world/index.ts');
    const hex = await server.ssrLoadModule('/src/engine/game/world/hex.ts');
    const { isRandomDungeonTile } = await server.ssrLoadModule('/src/engine/game/world/randomDungeons.ts');
    const { heroMaxHp } = await server.ssrLoadModule('/src/engine/game/hero.ts');
    return { classes: CLASSES.all, sanctuaries: SANCTUARIES.all, scourges: SCOURGES.all, neighbors: hex.neighbors, reachable: hex.reachable, isRandomDungeonTile, heroMaxHp };
  } finally {
    await server.close();
  }
}

/** 目当てのマスの隣で、キャラが立てて（物・敵の無いマス）、そこから目当てに歩いて行けるマス */
function standNextTo(w, bits, target, avoid = new Set()) {
  const wand = new Set((w.wanderers ?? []).map((x) => x.tile));
  const cands = bits.neighbors(w, target).filter((n) => !w.tiles[n]?.f && !wand.has(n) && !avoid.has(n));
  for (const n of cands) {
    try {
      if (bits.reachable(w, n, 3).has(target)) return n;
    } catch {
      // 地形の読み違いなど。次の候補
    }
  }
  return null;
}

/** キャラを全員 tile に立たせる（同行のまま。手番は P1 のキャラ・移動の前） */
function placeParty(g, tile, changes) {
  const w = g.world;
  const alive = g.heroes.filter((h) => h.hp > 0 && !h.retired);
  for (const h of alive) w.pos[h.id] = tile;
  w.tiles[tile].seen = true;
  w.move = null;
  delete w.moveDice;
  delete w.moveProposal;
  delete w.invites;
  w.turn = alive[0].id;
  changes.push(`キャラ全員（${alive.map((h) => h.id).join('・')}）をマス ${tile} に立たせた・手番を ${alive[0].id} の移動の前にした`);
}

function seeAround(w, bits, tile) {
  for (const n of [tile, ...bits.neighbors(w, tile)]) if (w.tiles[n]) w.tiles[n].seen = true;
}

/**
 * 保存を、場面の直前の形に書き換える（計画 §6-3 の表）。返す物: { game, changes（日本語の行）} か、無理なら { error }
 */
export function editSave(game, scene, bits) {
  const g = structuredClone(game);
  const w = g.world;
  const changes = [];
  if (!w || g.mode !== 'world') return { error: `保存が世界マップの形ではない（mode=${g.mode}）` };
  const cls = (id) => bits.classes.find((c) => c.id === id);
  const fullHp = () => {
    for (const h of g.heroes) if (h.hp > 0 && !h.retired) h.hp = bits.heroMaxHp(h);
    changes.push('キャラ全員の HP を満タンにした');
  };
  if (scene === 'scourge') {
    const live = (w.wanderers ?? []).filter((x) => x.scourge);
    if (!live.length) return { error: '保存に生きている災厄がいない' };
    for (const s of live) {
      const at = standNextTo(w, bits, s.tile);
      if (at === null) continue;
      placeParty(g, at, changes);
      seeAround(w, bits, s.tile);
      fullHp();
      changes.push(`災厄「${bits.scourges.find((x) => x.id === s.scourge)?.name ?? s.scourge}」（マス ${s.tile}）の隣に立たせた`);
      return { game: g, changes, target: s.tile };
    }
    return { error: '災厄の隣に立てるマスが無い' };
  }
  if (scene === 'peddler') {
    const here = w.pos[g.heroes[0].id];
    const taken = new Set((w.spawns ?? []).map((s) => s.tile));
    const at = standNextTo(w, bits, here, taken);
    if (at === null) return { error: 'キャラの隣に行商人を置けるマスが無い' };
    // 置くのは「隣のマス」なので、standNextTo の向きを逆に使う（キャラのマスから at へ歩けるかは同じ地形の見立て）
    (w.spawns ??= []).push({ id: 'scene-peddler', kind: 'peddler', tile: at, until: (w.worldTurn ?? 0) + 3 });
    w.tiles[at].seen = true;
    placeParty(g, here, changes);
    changes.push(`出現スポット「行商人」をキャラの隣のマス ${at} に置いた（ワールドターン ${(w.worldTurn ?? 0) + 3} まで）`);
    for (const h of g.heroes) {
      if (h.hp > 0 && (h.gold ?? 0) < 300) {
        changes.push(`${h.id} のお金 ${h.gold ?? 0} → 300（買えるように）`);
        h.gold = 300;
      }
    }
    return { game: g, changes, target: at };
  }
  if (scene === 'special' || scene === 'top') {
    const tier = scene === 'special' ? 'special' : 'top';
    const lv = scene === 'special' ? 5 : 6;
    let done = 0;
    for (const h of g.heroes) {
      if (h.hp <= 0 || h.retired) continue;
      const cur = cls(h.classId);
      if (cur?.tier !== 'mid') {
        changes.push(`${h.id}（${cur?.name ?? h.classId}）は中位職でないので、書き換えなかった`);
        continue;
      }
      const opts = bits.classes.filter((c) => c.tier === tier && c.from?.includes(h.classId));
      const job = opts.find((c) => c.requires?.feat !== 'petBond') ?? opts[0];
      if (!job) {
        changes.push(`${h.id}（${cur.name}）から行ける${tier === 'special' ? '特殊職' : '最上位職'}が無い`);
        continue;
      }
      const before = h.level;
      h.level = lv;
      h.exp = 0;
      // 特殊職の時は、最上位の条件（Lv6）が満たされないので、最上位は選べない（bot が特殊職を選ぶ）
      h.feats = { ...(h.feats ?? {}) };
      if (job.requires) h.feats[job.requires.feat] = Math.max(h.feats[job.requires.feat] ?? 0, job.requires.count);
      h.hp = bits.heroMaxHp(h);
      changes.push(`${h.id}（${cur.name}）: Lv ${before} → ${lv}${job.requires ? `・条件「${job.requires.text}」の記録 ${job.requires.feat}=${job.requires.count}` : ''}（目当て「${job.name}」）・HP 満タン`);
      done++;
    }
    if (!done) return { error: `${tier === 'special' ? '特殊職' : '最上位職'}へ転職できる形に書き換えられるキャラがいない` };
    // 場所: 特殊職 = 神殿（どの特殊職も転職できる）。最上位 = 祠か神殿（町の聖堂でもよいが、町の頭は転職より先に町の用事を回す）
    const kinds = scene === 'special' ? ['temple'] : ['shrine', 'temple'];
    const here = w.pos[g.heroes[0].id];
    const sites = w.tiles.map((t, i) => ({ t, i })).filter(({ t }) => t.f && kinds.includes(t.f.kind) && !t.f.used);
    sites.sort((a, b) => Math.abs(a.i - here) - Math.abs(b.i - here));
    for (const s of sites) {
      const at = standNextTo(w, bits, s.i);
      if (at === null) continue;
      placeParty(g, at, changes);
      seeAround(w, bits, s.i);
      changes.push(`${s.t.f.kind === 'temple' ? '神殿' : '祠'}「${s.t.f.id}」（マス ${s.i}）の隣に立たせた`);
      return { game: g, changes, target: s.i };
    }
    return { error: '神殿・祠の隣に立てるマスが無い' };
  }
  if (scene === 'altar') {
    const tiles = w.tiles.map((t, i) => ({ t, i })).filter(({ t }) => bits.isRandomDungeonTile(t.f) && !t.f.used);
    for (const s of tiles) {
      const at = standNextTo(w, bits, s.i);
      if (at === null) continue;
      const before = s.t.f.theme ?? '（未定）';
      s.t.f.theme = 'crystalGrotto';
      placeParty(g, at, changes);
      seeAround(w, bits, s.i);
      fullHp();
      changes.push(`ランダムダンジョン「${s.t.f.id}」（マス ${s.i}）のテーマ ${before} → crystalGrotto（古代の晶洞。4行目に晶石の祭壇）にして、その隣に立たせた`);
      return { game: g, changes, target: s.i };
    }
    return { error: 'ランダムダンジョンの隣に立てるマスが無い' };
  }
  return { error: `知らない場面: ${scene}` };
}

/** 手順2: ホストが差し込み、ほかの端末が取り直す（確認用の入口を使うのは、ここだけ）。返す物: 全端末の状態の印がそろったか */
async function injectSave(fleet, judge, game) {
  const host = fleet.devices[0];
  const r = await host.page.evaluate(async (g) => {
    try {
      return await window.__online.inject(g);
    } catch (e) {
      return `差し込めない: ${e?.message ?? e}`;
    }
  }, game);
  if (r) throw new LobbyStop(`ホストが保存を差し込めない: ${r}`);
  for (const d of fleet.devices.slice(1)) await d.page.evaluate(() => window.__online.resync()).catch(() => {});
  return until(async () => {
    const fps = await judge.fingerprints();
    const hs = fps.map((f) => f.hash);
    return hs.every((h) => h && h === hs[0]);
  }, 20000, 300);
}

/**
 * 場面からの1本。run.mjs の部品（頭・見た事の記録・戦闘の行）を受け取る
 */
export async function runScene({ brainFor, observe, battleLines }) {
  const scene = process.env.SCENE;
  const def = SCENE_DEFS[scene];
  if (!def) throw new Error(`SCENE は ${Object.keys(SCENE_DEFS).join('・')} のどれかです（${scene}）`);
  const from = process.env.SCENE_FROM;
  if (!from) throw new Error('SCENE_FROM（節目の保存のファイル）がありません');
  const cp = JSON.parse(readFileSync(from, 'utf8'));
  const people = Number(cp.people ?? 2);
  const scenario = Number(cp.scenario ?? 1);
  const seed = Number(process.env.SEED ?? 1) >>> 0;
  const emu = process.env.EMU_HOST ?? '127.0.0.1';
  const base = process.env.URL ?? 'http://127.0.0.1:4192/card-rpg/';
  const url = `${base}${base.includes('?') ? '&' : '?'}emu=${emu}&seed=${seed}`;
  assertLocalUrl(url);
  const outDir = process.env.SMART_OUTPUT ?? `screenshots/smart-coop/scene-${scene}-${people}p`;
  const limitMin = Number(process.env.SMART_LIMIT_MIN ?? 25);
  await loadContent({ scenarioIndex: scenario - 1 });
  const bits = await loadEngineBits();
  const ed = editSave(cp.game, scene, bits);
  const startedAt = now();
  const extra = [`元の保存: ${from.replace(/^.*[\\/]/, '')}（${cp.name ?? '?'}・手数 ${cp.presses ?? '?'}・戦闘 ${cp.battles ?? '?'}・ジョブ ${(cp.jobs ?? []).join('・')}）`];
  const milestones = [];
  if (ed.error) {
    log(`場面を作れない: ${ed.error}`);
    extra.push(`場面を作れなかった: ${ed.error}`);
  } else extra.push(...ed.changes.map((c) => `書き換え: ${c}`));
  log(`始める（場面から: ${def.name}）: ${url}・${people}人・保存 ${from}・結果 ${outDir}`);
  const fleet = await launchFleet({ people });
  const meter = memoryMeter(fleet.browser);
  meter.start();
  const judge = new Judge({ outDir, devices: fleet.devices, limitMin, expectSeed: null });
  const s = { judge };
  const board = {};
  let reached = '始める前';
  let goal = false;
  try {
    if (ed.error) throw new LobbyStop(ed.error);
    // 手順1: 新しい部屋を画面のボタンで作る（書く入口はまだ封じない。差し込みに使うため）
    const r = await setupRoom(s, fleet, { url, people, seed, scenarioIndex: scenario - 1 });
    if (!r.started) throw new LobbyStop('部屋の用意で、物語が閉じきれない');
    milestones.push({ at: now(), text: '新しい部屋を画面のボタンで作って出発した', presses: judge.actions.length });
    // 手順2: 差し込む・取り直す
    const same = await injectSave(fleet, judge, ed.game);
    if (!same) await judge.fail('desync', { text: '保存を差し込んだ後、20 秒たっても全端末の状態の印がそろわない' });
    // 手順3: 書く入口を封じる。ここから先は全部画面のボタン
    await judge.sealNow();
    judge.lastSeq = -1;
    judge.lastProgress = Date.now();
    milestones.push({ at: now(), text: `保存を差し込んだ（全端末の状態の印 ${same ? 'そろった' : 'そろわない'}）・書く入口を封じた`, presses: judge.actions.length });
    log('差し込んだ。ここから先は画面のボタンだけ');
    const brain = brainFor(process.env.SMART_SHAKE ?? 'none');
    const c = new Conductor({ fleet, judge, brains: Object.fromEntries(fleet.devices.map((d) => [d.seat, brain])) });
    c.board = board;
    // 頭が覚えている自分のジョブ = 保存のキャラのジョブ（キャラ h<n> は P<n+1>）
    for (const h of ed.game.heroes) {
      const n = /^h(\d+)$/.exec(h.id)?.[1];
      if (n !== undefined) meOf(board, `P${Number(n) + 1}`).job = KB.classes[h.classId] ?? null;
    }
    // 網羅の表は、この場面の行だけを「行き先」にする（ほかの行は踏んだ事にして、寄り道をしない）
    observe([], board, judge);
    const seen = new Set();
    let stuckCount = 0;
    let liveN = 0;
    for (let t = 0; t < 40000; t++) {
      if (t === 0 && board.cov?.rows) {
        for (const row of board.cov.rows) if (!def.rows.test(row.id) && !row.stepped) row.stepped = { run: 0, at: now(), how: '場面から: この場面の行ではないので、行き先にしない' , skip: true };
      }
      const res = await c.tick();
      for (; liveN < judge.actions.length; liveN++) appendFileSync(`${outDir}/live.log`, `${actionLine(judge.actions[liveN], liveN)}\n`);
      const views = res.views ?? [];
      observe(views, board, judge);
      for (const v of views) {
        if (!v.mode || seen.has(v.mode)) continue;
        seen.add(v.mode);
        milestones.push({ at: now(), text: `${v.seat} が場面「${v.mode}」に着いた`, presses: judge.actions.length });
        reached = `${v.seat} が場面「${v.mode}」に着いた`;
        for (const d of fleet.devices) await d.page.screenshot({ path: `${outDir}/m-${v.mode}-${d.seat}.png` }).catch(() => {});
      }
      const stepped = (board.cov?.rows ?? []).filter((x) => x.stepped && !x.stepped.skip).map((x) => x.id);
      if (def.goal(stepped)) {
        goal = true;
        reached = `目当ての場面を画面のボタンで踏んだ（${stepped.filter((id) => def.rows.test(id)).join('・')}）`;
        milestones.push({ at: now(), text: reached, presses: judge.actions.length });
        // 終わりの形を見せるため、少し進めてから写真
        for (let k = 0; k < 6; k++) {
          const r2 = await c.tick();
          observe(r2.views ?? [], board, judge);
        }
        for (const d of fleet.devices) await d.page.screenshot({ path: `${outDir}/goal-${d.seat}.png` }).catch(() => {});
        break;
      }
      if (views.some((v) => v.mode === 'gameover' || v.mode === 'ending')) {
        reached = `目当ての前に「${views.find((v) => v.mode === 'gameover' || v.mode === 'ending').mode}」になった`;
        break;
      }
      if (res.stuck === 'stuck') stuckCount++;
      if (res.stop || res.stuck === 'deadlock' || stuckCount >= 2) {
        reached = `進めなくなって終えた（${res.stop ? '止める決まり' : res.stuck === 'deadlock' ? '互いに待つ' : '止まり2回'}）・最後の場面 ${views.map((v) => `${v.seat}=${v.mode}`).join(' ')}`;
        break;
      }
      if (!res.pressed) await wait(250);
    }
  } catch (e) {
    if (e instanceof LobbyStop) {
      log(`止まった: ${e.message}`);
      extra.push(`止まった: ${e.message}`);
      if (!judge.failures.length && !ed.error) await judge.fail('lobby', { text: e.message });
    } else {
      log('思わぬエラー', e);
      await judge.fail('lobby', { text: `台本のエラー: ${e?.stack ?? e}` });
    }
  } finally {
    for (const d of fleet.devices) await d.page.screenshot({ path: `${outDir}/final-${d.seat}.png` }).catch(() => {});
    await fleet.close();
  }
  const mem = await meter.stop();
  const cov = coverageReport(board);
  const rows = (board.cov?.rows ?? []).filter((x) => def.rows.test(x.id)).map((x) => `${x.id}: ${x.stepped && !x.stepped.skip ? `踏んだ（${x.stepped.how}）` : '踏めず'}`);
  extra.push(`この場面の網羅の行: ${rows.join('／') || 'なし'}`);
  writeReport(outDir, {
    scenario: `シナリオ${scenario}`,
    people,
    seed,
    stage: `4-Sb（場面から: ${def.name}。保存を差し込むまでだけ確認用の入口・その後は画面のボタンだけ）`,
    devices: fleet.devices,
    judge,
    startedAt,
    endedAt: now(),
    reached: { run: '—（場面から。通しではない）', checkpoint: '—', rewritten: `${def.name}: ${reached}` },
    milestones,
    extra,
    complete: false,
    reachedGoal: goal,
    mem,
    battle: battleLines(board, judge),
    // 網羅の表は、場面の行だけを行き先にするため、ほかの行を「踏んだ事にした」ので、表そのものは出さない（場面の行は extra に書いた）
    coverage: null,
  });
  void cov;
  writeFileSync(`${outDir}/scene.json`, JSON.stringify({ scene, from, goal, reached, changes: ed.changes ?? [], error: ed.error ?? null }, null, 1));
  log(`報告: ${outDir}/report.md（${goal ? '目当ての場面を踏んだ' : '踏めなかった'}）`);
  return judge.failures.length || !goal ? 1 : 0;
}
