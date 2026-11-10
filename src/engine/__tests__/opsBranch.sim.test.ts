// ===== 運用テストの道具（docs/tasks/ops-test-plan.md §6）=====
// OPSSIM=branch|wait|defeat|pet|reward|detour を付けた時だけ動く（普段のテストでは動かさない）。ゲーム本体は変えない。
// 結果は screenshots/ops/<モード>.json と .md に書き出す。Math.random は使わない（種はここで決めて記録する）。
//
// 共通の環境変数:
//   OPS_N      分岐1つあたりの振り直しの回数（branch。既定 10）
//   OPS_SEEDS  回す種の数（wait/defeat/pet/reward/detour。既定 3）
//   OPS_STEPS  1本の冒険の手数の上限（既定 8000。wait は 3000）
//   OPS_SCENES 分岐比較の場面（branch。既定 normal,boss,low）
//   OPS_POINTS 分岐比較で試す味方の決定の数（既定 3）
//   OPS_SCENE_SEEDS 分岐比較で、場面の種類ごとに作る場面の数（既定 1）
//   OPS_WIPES  全滅をいくつ集めたら止めるか（defeat。既定 6）
//   OPS_SCENARIOS お供の調査のシナリオ（pet。既定 全部）
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { cardOf } from '../../data/cards';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { SCENARIOS } from '../../data/scenarios';
import { PETS } from '../../data/pets';
import type { AllyState, BattleEvent, BattleState, Command, GameCommand, GameState, PlayerId } from '../../types';
import {
  applyCommand,
  applyGameCommand,
  cardTargets,
  commandPlayer,
  createGame,
  dotDamage,
  findHero,
  heroPlace,
  intentHitsOn,
  isAllyCard,
  isBossRoom,
  isDone,
  notVoted,
  reachable,
  secondaryCard,
  unitIdOf,
  unusableReason,
  viewOf,
  waitingPlayers,
} from '../index';
import { botNextCommand } from '../bot';

const MODE = process.env.OPSSIM;
const OUT = 'screenshots/ops';
const num = (k: string, d: number) => Number(process.env[k] ?? d);

// ---------- 共通 ----------

/** 記録用: 今のコミット（取れなければ unknown） */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** 種と番号から別の種を作る（決まった計算。乱数の箱は使わない） */
function mix(a: number, b: number): number {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x6b43a9b5, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  return h >>> 0 || 1;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function newGame(seed: number, opts: { scenarioId?: string; difficulty?: string; online?: boolean; players?: PlayerId[]; classes?: string[] } = {}): GameState {
  const classes = opts.classes ?? ['warrior', 'mage'];
  const players = opts.players ?? classes.map(() => 'P1' as PlayerId);
  return createGame({
    seed,
    scenarioId: opts.scenarioId ?? 'corruptionKing',
    difficulty: opts.difficulty ?? 'normal',
    online: opts.online,
    party: classes.map((c, i) => ({ classId: c, gender: i % 2 ? 'female' : 'male', name: `${c}${i}`, playerId: players[i] })),
  });
}

interface Step {
  i: number;
  cmd: GameCommand;
  before: GameState;
  after: GameState;
  events: BattleEvent[];
  error?: string;
}

/**
 * bot で1手ずつ進める（bot が決めた命令を、ここで applyGameCommand に渡す → BattleEvent を受け取れる）。
 * onStep が true を返したら止める。override で bot の命令を差し替えられる（寄り道の bot など）。
 */
function drive(
  g: GameState,
  maxSteps: number,
  onStep: (s: Step) => boolean | void,
  override?: (g: GameState, cmd: GameCommand) => GameCommand,
): { game: GameState; steps: number; errors: string[]; cmds: GameCommand[]; stuck: boolean } {
  const memo = { interacted: new Set<string>() };
  const errors: string[] = [];
  const cmds: GameCommand[] = [];
  let stuck = 0;
  let i = 0;
  for (; i < maxSteps; i++) {
    if (g.mode === 'ending' || g.mode === 'gameover') break;
    let cmd = botNextCommand(g, memo);
    if (!cmd) {
      stuck++;
      if (stuck > 50) return { game: g, steps: i, errors: [...errors, `stuck in ${g.mode}`], cmds, stuck: true };
      continue;
    }
    if (override) cmd = override(g, cmd);
    const r = applyGameCommand(g, cmd);
    cmds.push(cmd);
    if (r.error) {
      errors.push(`${g.mode}/${cmd.type}: ${r.error}`);
      stuck++;
      if (stuck > 50) return { game: g, steps: i, errors: [...errors, `stuck in ${g.mode}`], cmds, stuck: true };
    } else stuck = 0;
    const stop = onStep({ i, cmd, before: g, after: r.state, events: r.battleEvents, error: r.error });
    g = r.state;
    if (stop) return { game: g, steps: i + 1, errors, cmds, stuck: false };
  }
  return { game: g, steps: i, errors, cmds, stuck: false };
}

/** 命令が動かす戦闘（世界マップの戦闘、またはダンジョンの場面の戦闘） */
function battleView(g: GameState, cmd?: GameCommand): { key: string; b: BattleState; view: GameState } | undefined {
  if (cmd?.type === 'SCENE') {
    const v = viewOf(g, cmd.scene);
    return v.mode === 'battle' && v.battle ? { key: `${cmd.scene}:${v.battle.seed}`, b: v.battle, view: v } : undefined;
  }
  if (g.mode === 'battle' && g.battle) return { key: `top:${g.battle.seed}`, b: g.battle, view: g };
  return undefined;
}

// ---------- 戦闘だけの bot（bot.ts の battleStep と同じ作戦。戦闘の状態だけで動く）----------

function botBattleCommand(b: BattleState): Command {
  if (b.phase === 'ally') {
    for (const a of b.allies) {
      if (isDone(b, a)) continue;
      const c = a.hand.find((x) => !unusableReason(b, a, cardOf(x)));
      if (!c) continue;
      const card = cardOf(c);
      return { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: c.uid, targetId: defaultTarget(b, a, c.uid), allyTargetId: defaultAllyTarget(b, a, c.uid), focusUsed: card.slots >= 3 ? Math.min(card.slots, a.focus) : 0 };
    }
    return { type: 'END_TURN', playerId: waitingPlayers(b)[0] ?? b.allies[0].playerId };
  }
  return { type: 'ENEMY_STEP' };
}

function defaultTarget(b: BattleState, a: AllyState, uid: string): string | undefined {
  const card = cardOf(a.hand.find((x) => x.uid === uid)!);
  if (card.target === 'enemy') return b.enemies.find((e) => !e.dead)?.uid;
  if (isAllyCard(card)) return cardTargets(b, a, card).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp).map(unitIdOf)[0];
  return undefined;
}
function defaultAllyTarget(b: BattleState, a: AllyState, uid: string): string | undefined {
  const card = cardOf(a.hand.find((x) => x.uid === uid)!);
  if (!card.secondaryTarget) return undefined;
  return cardTargets(b, a, secondaryCard(card)).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp).map(unitIdOf)[0];
}

const ended = (b: BattleState) => b.phase === 'victory' || b.phase === 'defeat' || b.phase === 'escaped';

/** 戦闘の終わりまで bot で進める */
function rollout(b: BattleState, maxSteps = 1500): { b: BattleState; steps: number; stuck: boolean } {
  let steps = 0;
  while (!ended(b) && steps < maxSteps) {
    let r = applyCommand(b, botBattleCommand(b));
    if (r.error && b.phase === 'ally') r = applyCommand(b, { type: 'END_TURN', playerId: waitingPlayers(b)[0] ?? b.allies[0].playerId });
    if (r.error) return { b, steps, stuck: true };
    b = r.state;
    steps++;
  }
  return { b, steps, stuck: !ended(b) };
}

/** 結果の値: 勝ち=1 ＋ 味方の残りHPの割合×0.5 − 敵の残りHPの割合×0.5（-0.5〜1.5） */
function valueOf(b: BattleState): { v: number; win: boolean; allyHp: number; enemyHp: number; turns: number } {
  const ratio = (us: { hp: number; maxHp: number; dead?: boolean }[]) => us.reduce((n, u) => n + Math.max(0, u.dead ? 0 : u.hp), 0) / Math.max(1, us.reduce((n, u) => n + u.maxHp, 0));
  const win = b.phase === 'victory';
  const allyHp = ratio(b.allies);
  const enemyHp = ratio(b.enemies);
  return { v: (win ? 1 : 0) + 0.5 * allyHp - 0.5 * enemyHp, win, allyHp, enemyHp, turns: b.turn };
}

// ===================================================================
// T2 分岐比較（branch）
// ===================================================================

interface Action {
  label: string;
  allyId: string;
  cardId: string;
  targetId?: string;
  focus: number;
  combo: boolean;
  multiEnemy: boolean;
  cmd: Command;
}

function enumerateActions(b: BattleState): Action[] {
  const out: Action[] = [];
  const seen = new Set<string>();
  for (const a of b.allies) {
    if (a.dead || isDone(b, a)) continue;
    for (const c of a.hand) {
      const card = cardOf(c);
      if (unusableReason(b, a, card)) continue;
      const targets: (string | undefined)[] = card.target === 'enemy' ? b.enemies.filter((e) => !e.dead).map((e) => e.uid) : isAllyCard(card) ? cardTargets(b, a, card).map(unitIdOf) : [undefined];
      const focuses = [...new Set([0, Math.min(card.slots, a.focus)])];
      for (const t of targets)
        for (const f of focuses) {
          const key = `${a.id}:${c.cardId}:${c.upgraded ? 1 : 0}:${t}:${f}`;
          if (seen.has(key)) continue; // 同じカードが2枚あっても1回だけ試す
          seen.add(key);
          const enemy = b.enemies.find((e) => e.uid === t);
          const cmd: Command = { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: c.uid, targetId: t, allyTargetId: defaultAllyTarget(b, a, c.uid), focusUsed: f };
          if (applyCommand(b, cmd).error) continue; // ゲームが拒む手は外す
          out.push({
            label: `${a.id}:${card.name}${c.upgraded ? '+' : ''}→${t ?? '-'}${f ? `:F${f}` : ''}`,
            allyId: a.id,
            cardId: c.cardId,
            targetId: t,
            focus: f,
            combo: !!enemy?.hitBy?.some((id) => id !== a.id),
            multiEnemy: b.enemies.filter((e) => !e.dead).length > 1,
            cmd,
          });
        }
    }
  }
  const end: Command = { type: 'END_TURN', playerId: waitingPlayers(b)[0] ?? b.allies[0].playerId };
  if (!applyCommand(b, end).error) out.push({ label: 'ターン終了（何もしない）', allyId: '-', cardId: 'END_TURN', focus: 0, combo: false, multiEnemy: false, cmd: end });
  return out;
}

interface PointResult {
  scene: string;
  point: number;
  turn: number;
  actions: { label: string; cardId: string; focus: number; combo: boolean; multiEnemy: boolean; mean: number; sd: number; win: number }[];
  gap: number;
  pooledSd: number;
  effective: boolean;
  /** 一番良い手との差が、運のばらつきの標準誤差の範囲に入る手の数（ほぼ同じくらい良い手の数） */
  nearBest: number;
  bestCard: string;
  bestLabel: string;
  bot: { label: string; mean: number };
  focusPairs: { label: string; d: number; sdRatio: number }[];
  combo: { comboMean: number; otherMean: number; n: number } | null;
}

function branchPoint(scene: string, point: number, b: BattleState, N: number, baseSeed: number): PointResult {
  const actions = enumerateActions(b);
  const res = actions.map((a) => {
    const vals: number[] = [];
    let wins = 0;
    for (let n = 0; n < N; n++) {
      const s: BattleState = { ...b, rngState: mix(baseSeed, n) }; // 種を変える（全部の手で同じ種の並び = 比べやすい）
      const r = applyCommand(s, a.cmd);
      if (r.error) continue;
      const out = valueOf(rollout(r.state).b);
      vals.push(out.v);
      if (out.win) wins++;
    }
    return { a, vals, wins };
  });
  const stats = res.map((r) => ({ label: r.a.label, cardId: r.a.cardId, focus: r.a.focus, combo: r.a.combo, multiEnemy: r.a.multiEnemy, mean: mean(r.vals), sd: sd(r.vals), win: pct(r.wins, r.vals.length) }));
  const pooledSd = Math.sqrt(mean(stats.map((s) => s.sd ** 2)));
  const best = stats.reduce((x, y) => (y.mean > x.mean ? y : x), stats[0]);
  const worst = stats.reduce((x, y) => (y.mean < x.mean ? y : x), stats[0]);
  const se = pooledSd * Math.sqrt(2 / N);
  // bot が選ぶ手
  const botCmd = botBattleCommand(b);
  const botLabel = res.find((r) => JSON.stringify(r.a.cmd) === JSON.stringify(botCmd))?.a.label ?? '(一覧に無い)';
  // フォーカス0と最大の組
  const focusPairs: PointResult['focusPairs'] = [];
  for (const r of res) {
    if (r.a.focus === 0) continue;
    const zero = res.find((x) => x.a.allyId === r.a.allyId && x.a.cardId === r.a.cardId && x.a.targetId === r.a.targetId && x.a.focus === 0);
    if (!zero) continue;
    const sz = sd(zero.vals);
    focusPairs.push({ label: r.a.label, d: r2(mean(r.vals) - mean(zero.vals)), sdRatio: sz > 0.005 ? r2(sd(r.vals) / sz) : 0 });
  }
  // 連携（同じターンに仲間が殴った敵）を狙う手と、ほかの敵を狙う手
  const multi = stats.filter((s) => s.multiEnemy);
  const cm = multi.filter((s) => s.combo);
  const om = multi.filter((s) => !s.combo);
  return {
    scene,
    point,
    turn: b.turn,
    actions: stats.map((s) => ({ ...s, mean: r2(s.mean), sd: r2(s.sd) })),
    gap: r2(best.mean - worst.mean),
    pooledSd: r2(pooledSd),
    effective: best.mean - worst.mean > pooledSd,
    nearBest: stats.filter((s) => s.mean >= best.mean - se).length,
    bestCard: best.cardId,
    bestLabel: best.label,
    bot: { label: botLabel, mean: r2(stats.find((s) => s.label === botLabel)?.mean ?? NaN) },
    focusPairs,
    combo: cm.length && om.length ? { comboMean: r2(mean(cm.map((s) => s.mean))), otherMean: r2(mean(om.map((s) => s.mean))), n: cm.length } : null,
  };
}

/** 次の決定の場面まで bot で進める（味方フェーズで、まだカードを出せる味方がいる所） */
function nextDecision(b: BattleState, first: boolean): BattleState | undefined {
  const isDecision = (x: BattleState) => x.phase === 'ally' && x.allies.some((a) => !isDone(x, a));
  if (first && isDecision(b)) return b;
  let steps = 0;
  do {
    if (ended(b) || steps++ > 400) return undefined;
    const r = applyCommand(b, botBattleCommand(b));
    if (r.error) return undefined;
    b = r.state;
  } while (!isDecision(b));
  return b;
}

/** 場面を作る: 固定の種で冒険を始め、bot で進めて、条件に合う戦闘の最初の味方フェーズで止める */
function buildScene(kind: string, seed0: number): { battle: BattleState; seed: number; steps: number; cmds: GameCommand[]; info: string } | undefined {
  for (let seed = seed0; seed < seed0 + 20; seed++) {
    let found: { battle: BattleState; info: string } | undefined;
    const r = drive(newGame(seed), 20000, (s) => {
      const bv = battleView(s.after, s.cmd) ?? battleView(s.after);
      if (!bv || bv.b.turn !== 1 || bv.b.phase !== 'ally' || bv.b.allies.some((a) => a.played)) return false;
      const room = bv.view.battleInfo?.roomType;
      const boss = !!room && isBossRoom({ type: room });
      const wander = !!bv.view.battleInfo?.wandererId;
      if (kind === 'boss' ? boss : !boss && !wander && bv.view.dungeon) {
        found = { battle: structuredClone(bv.b), info: `${room ?? '-'} / ${bv.b.enemies.map((e) => getEnemy(e.defId).name).join('・')}` };
        return true;
      }
      return false;
    });
    if (found) return { ...found, seed, steps: r.steps, cmds: r.cmds };
  }
  return undefined;
}

function runBranch() {
  const N = num('OPS_N', 10);
  const POINTS = num('OPS_POINTS', 3);
  const scenes = (process.env.OPS_SCENES ?? 'normal,boss,low').split(',');
  const results: PointResult[] = [];
  const meta: Record<string, unknown> = {};
  const timing: Record<string, number> = {};
  const K = num('OPS_SCENE_SEEDS', 1);
  for (const kind of scenes) for (let k = 0; k < K; k++) {
    const sc = K > 1 ? `${kind}#${k + 1}` : kind;
    const t0 = Date.now();
    const built = buildScene(kind === 'low' ? 'normal' : kind, (kind === 'boss' ? 7100 : 7000) + k * 50);
    if (!built) {
      meta[sc] = { error: '場面が作れなかった（20本の種で見つからない）' };
      continue;
    }
    // 不利な場面: 普通の戦闘の味方のHPを45%にする（テストの中だけ）
    const scene = kind === 'low' ? (() => { const b = structuredClone(built.battle); for (const a of b.allies) a.hp = Math.max(1, Math.floor(a.maxHp * 0.45)); return b; })() : built.battle;
    writeFileSync(`${OUT}/branch-scene-${sc.replace('#', '-')}.json`, JSON.stringify({ build: buildId(), scene: sc, seed: built.seed, steps: built.steps, info: built.info, battle: scene, commands: built.cmds }));
    meta[sc] = { seed: built.seed, info: built.info, stepsToScene: built.steps };
    let b: BattleState | undefined = scene;
    for (let p = 0; p < POINTS && b; p++) {
      b = nextDecision(b, p === 0);
      if (!b) break;
      results.push(branchPoint(sc, p + 1, b, N, mix(built.seed, 1000 + p)));
      // 次の決定へは bot の手で進む
      const r = applyCommand(b, botBattleCommand(b));
      b = r.error ? undefined : r.state;
    }
    timing[sc] = (Date.now() - t0) / 1000;
  }
  // カード選択の偏り（一番良い手になったカードの割合の2乗の合計）
  const bc = new Map<string, number>();
  for (const r of results) bc.set(r.bestCard, (bc.get(r.bestCard) ?? 0) + 1);
  const hhi = [...bc.values()].reduce((n, c) => n + (c / results.length) ** 2, 0);
  const fp = results.flatMap((r) => r.focusPairs);
  const combos = results.filter((r) => r.combo);
  const summary = {
    points: results.length,
    effectiveRate: pct(results.filter((r) => r.effective).length, results.length),
    bestCardHHI: r2(hhi),
    bestCards: Object.fromEntries(bc),
    meanGap: r2(mean(results.map((r) => r.gap))),
    meanPooledSd: r2(mean(results.map((r) => r.pooledSd))),
    focus: fp.length ? { pairs: fp.length, meanDiff: r2(mean(fp.map((x) => x.d))), meanSdRatio: r2(mean(fp.filter((x) => x.sdRatio).map((x) => x.sdRatio))) } : null,
    combo: combos.length ? { points: combos.length, meanDiff: r2(mean(combos.map((r) => r.combo!.comboMean - r.combo!.otherMean))), bestIsCombo: combos.filter((r) => r.actions.find((a) => a.label === r.bestLabel)?.combo).length } : null,
  };
  const json = { build: buildId(), mode: 'branch', N, POINTS, scenes: meta, timing, summary, results };
  writeFileSync(`${OUT}/branch.json`, JSON.stringify(json, null, 1));
  const md = [
    `# T2 分岐比較（branch）`,
    ``,
    `- ビルド: ${json.build} / 振り直し N=${N} / 決定の数 ${POINTS} / 場面 ${scenes.join('・')}`,
    `- 値 = 勝ち1 ＋ 味方の残りHP割合×0.5 − 敵の残りHP割合×0.5。「有効」= 一番良い手と一番悪い手の差 > 同じ手での運のばらつき（標準偏差）`,
    `- 時間: ${Object.entries(timing).map(([k, v]) => `${k} ${v.toFixed(0)}秒`).join('・')}`,
    ``,
    `| 場面 | 種 | 敵 |`,
    `|---|---|---|`,
    ...Object.entries(meta).map(([k, v]) => { const m = v as { seed?: number; info?: string; error?: string }; return `| ${k} | ${m.seed ?? '-'} | ${m.info ?? m.error} |`; }),
    ``,
    `## まとめ`,
    `- 有効選択率: **${summary.effectiveRate}%**（${summary.points}場面）`,
    `- 一番良い手になったカードの偏り（2乗の合計。1に近いほど1枚ばかり）: **${summary.bestCardHHI}** ${JSON.stringify(summary.bestCards)}`,
    `- 手の差の平均 ${summary.meanGap} ／ 運のばらつきの平均 ${summary.meanPooledSd}`,
    summary.focus ? `- フォーカス最大 − フォーカス0 の差の平均 ${summary.focus.meanDiff}、ばらつきの比（最大/0）${summary.focus.meanSdRatio}（${summary.focus.pairs}組）` : `- フォーカスの比較: 組が無い`,
    summary.combo ? `- 連携を狙う手 − ほかの敵を狙う手 の平均 ${summary.combo.meanDiff}（${summary.combo.points}場面。一番良い手が連携だった場面 ${summary.combo.bestIsCombo}）` : `- 連携の比較: 敵が2体以上で、仲間が先に殴った場面が無い`,
    ``,
    `## 場面ごと`,
    `| 場面 | 決定 | ターン | 手の数 | 差 | 運 | 有効 | ほぼ最善の手の数 | 一番良い手 | bot の手（値） |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
    ...results.map((r) => `| ${r.scene} | ${r.point} | ${r.turn} | ${r.actions.length} | ${r.gap} | ${r.pooledSd} | ${r.effective ? '○' : '×'} | ${r.nearBest} | ${r.bestLabel} | ${r.bot.label}（${r.bot.mean}） |`),
    ``,
    `※ bot の作戦（手札は左から・狙いは先頭の敵）で戦闘の終わりまで進めた結果。人が上手に遊ぶ時の差とは違う。`,
  ];
  writeFileSync(`${OUT}/branch.md`, md.join('\n') + '\n');
  return json;
}

// ===================================================================
// T3 待ち時間（wait）
// ===================================================================

/** その人が今できることがあるか（近似: bot が次に動かす人／戦闘で同時に動ける人／投票待ち／報酬を選ぶ人） */
function canAct(g: GameState, p: PlayerId, cmd: GameCommand): boolean {
  if (commandPlayer(cmd) === p) return true;
  const view = cmd.type === 'SCENE' ? viewOf(g, cmd.scene) : g;
  if (view.mode === 'battle' && view.battle) {
    const b = view.battle;
    if (b.phase !== 'ally') return false;
    if (b.allies.some((a) => a.playerId === p && !isDone(b, a))) return true;
    return waitingPlayers(b).includes(p);
  }
  if (view.vote && notVoted(view).includes(p)) return true;
  if (view.mode === 'reward' && view.reward) {
    const r = view.reward;
    const mine = (id: string) => findHero(view, id)?.playerId === p;
    if (r.levelUps.some((l) => mine(l.heroId))) return true;
    if (!r.cardPicked && r.cardOffers.some((o) => mine(o.heroId) && !r.cardDone?.includes(o.heroId))) return true;
  }
  return false;
}

function runWait() {
  const SEEDS = num('OPS_SEEDS', 3);
  const STEPS = num('OPS_STEPS', 3000);
  const configs = [
    { name: '1人で全員（2キャラ）', online: false, players: ['P1', 'P1'] as PlayerId[] },
    { name: 'オンライン2人（P1/P2）', online: true, players: ['P1', 'P2'] as PlayerId[] },
  ];
  const out: Record<string, unknown>[] = [];
  const t0 = Date.now();
  for (const cfg of configs) {
    for (let s = 1; s <= SEEDS; s++) {
      const seed = 8000 + s;
      const players = [...new Set(cfg.players)];
      const idle: Record<string, number> = {};
      const idleByMode: Record<string, Record<string, number>> = {};
      const longest: Record<string, number> = {};
      const streak: Record<string, number> = {};
      let total = 0;
      const byMode: Record<string, number> = {};
      const r = drive(newGame(seed, { online: cfg.online, players: cfg.players }), STEPS, (st) => {
        total++;
        const m = (st.cmd.type === 'SCENE' ? viewOf(st.before, st.cmd.scene).mode : st.before.mode) as string;
        byMode[m] = (byMode[m] ?? 0) + 1;
        for (const p of players) {
          const ok = canAct(st.before, p, st.cmd);
          if (!ok) {
            idle[p] = (idle[p] ?? 0) + 1;
            (idleByMode[p] ??= {})[m] = (idleByMode[p][m] ?? 0) + 1;
            streak[p] = (streak[p] ?? 0) + 1;
            longest[p] = Math.max(longest[p] ?? 0, streak[p]);
          } else streak[p] = 0;
        }
      });
      out.push({
        config: cfg.name,
        seed,
        steps: total,
        errors: r.errors.slice(0, 5),
        mode: r.game.mode,
        byMode,
        players: Object.fromEntries(players.map((p) => [p, { idlePct: pct(idle[p] ?? 0, total), longestIdle: longest[p] ?? 0, idleByMode: idleByMode[p] ?? {} }])),
      });
    }
  }
  const sec = (Date.now() - t0) / 1000;
  writeFileSync(`${OUT}/wait.json`, JSON.stringify({ build: buildId(), mode: 'wait', SEEDS, STEPS, seconds: sec, runs: out }, null, 1));
  const md = [
    `# T3 待ち時間（wait・画面なしの部分）`,
    ``,
    `- ビルド: ${buildId()} / 種 ${SEEDS}本（8001〜）/ 1本 ${STEPS}手まで / ${sec.toFixed(0)}秒`,
    `- 「何もできない手」= その命令の時に、その人が出せる命令が無い（近似: bot が次に動かす人・戦闘で手札を出せる人・投票待ち・報酬を選ぶ人は「できる」とする）`,
    `- 敵の手番（ENEMY_STEP）は全員「何もできない」。画面の演出の秒数は数えない（enemy-turn-timing.mjs で別に測る）`,
    ``,
    `| 形 | 種 | 手数 | 人 | 何もできない手の割合 | 一番長い連続の待ち（手） | 待ちが多い場面 |`,
    `|---|---|---|---|---|---|---|`,
    ...out.flatMap((o) => Object.entries(o.players as Record<string, { idlePct: number; longestIdle: number; idleByMode: Record<string, number> }>).map(([p, v]) =>
      `| ${o.config} | ${o.seed} | ${o.steps} | ${p} | **${v.idlePct}%** | ${v.longestIdle} | ${Object.entries(v.idleByMode).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k}${n}`).join('・')} |`)),
  ];
  writeFileSync(`${OUT}/wait.md`, md.join('\n') + '\n');
}

// ===================================================================
// T4 負けた理由（defeat）
// ===================================================================

interface Rec {
  turn: number;
  phase: string;
  cmdType: string;
  actor?: string;
  events: BattleEvent[];
  pred: Record<string, { actionName: string; hitsOn: Record<string, number> }>;
  dot: Record<string, number>;
}

type DmgClass = '予告どおり' | '予告の行動（別の相手）' | '見えていた状態異常' | '自分の代償' | '予告と違う行動' | '予告なし（反撃・能力）' | '出所が分からない' | '味方から';
const CLASS3: Record<DmgClass, '予告されていた' | '見えていた状態' | '予告なし'> = {
  予告どおり: '予告されていた',
  '予告の行動（別の相手）': '予告されていた',
  見えていた状態異常: '見えていた状態',
  自分の代償: '見えていた状態',
  予告と違う行動: '予告なし',
  '予告なし（反撃・能力）': '予告なし',
  出所が分からない: '予告なし',
  味方から: '予告なし',
};

function predictions(b: BattleState): Rec['pred'] {
  const out: Rec['pred'] = {};
  for (const e of b.enemies) {
    if (e.dead || !e.intent) continue;
    const hitsOn: Record<string, number> = {};
    for (const a of b.allies) hitsOn[a.id] = intentHitsOn(e, a).reduce((n, h) => n + h, 0);
    out[e.uid] = { actionName: getEnemyAction(e.defId, e.intent.actionId).name, hitsOn };
  }
  return out;
}

function classify(rec: Rec, allyIds: Set<string>, enemyNames: Record<string, string>) {
  const items: { cls: DmgClass; amount: number; to: string; from?: string; action?: string; turn: number }[] = [];
  let cur: { uid: string; action: string } | undefined;
  for (const ev of rec.events) {
    if (ev.type === 'enemyAct') cur = { uid: ev.enemyUid, action: ev.actionName };
    if (ev.type !== 'damage' || !allyIds.has(ev.unitId) || ev.amount <= 0) continue;
    let cls: DmgClass;
    if (!ev.sourceId) cls = rec.cmdType === 'PLAY_CARD' && rec.actor === ev.unitId ? '自分の代償' : (rec.dot[ev.unitId] ?? 0) > 0 ? '見えていた状態異常' : '出所が分からない';
    else if (allyIds.has(ev.sourceId)) cls = '味方から';
    else if (rec.cmdType === 'ENEMY_STEP' && cur?.uid === ev.sourceId) {
      const p = rec.pred[ev.sourceId];
      cls = p && p.actionName === cur.action ? ((p.hitsOn[ev.unitId] ?? 0) > 0 ? '予告どおり' : '予告の行動（別の相手）') : '予告と違う行動';
    } else cls = '予告なし（反撃・能力）';
    items.push({ cls, amount: ev.amount, to: ev.unitId, from: ev.sourceId ? enemyNames[ev.sourceId] ?? ev.sourceId : undefined, action: ev.sourceId && cur?.uid === ev.sourceId ? cur.action : undefined, turn: rec.turn });
  }
  return items;
}

function runDefeat() {
  const WIPES = num('OPS_WIPES', 6);
  const SEEDS = num('OPS_SEEDS', 10);
  const STEPS = num('OPS_STEPS', 30000);
  const t0 = Date.now();
  const wipes: Record<string, unknown>[] = [];
  const total: Record<string, number> = {};
  const total3: Record<string, number> = {};
  for (let s = 1; s <= SEEDS && wipes.length < WIPES; s++) {
    const seed = 9000 + s;
    const recs = new Map<string, Rec[]>();
    const pred = new Map<string, Rec['pred']>();
    drive(newGame(seed), STEPS, (st) => {
      if (st.error) return false;
      const bv = battleView(st.before, st.cmd);
      if (!bv || !(st.cmd.type === 'BATTLE' || (st.cmd.type === 'SCENE' && st.cmd.command.type === 'BATTLE'))) return false;
      const b = bv.b;
      if (b.phase === 'ally') pred.set(bv.key, predictions(b)); // 味方フェーズの間に画面に出ている予告
      const inner = (st.cmd.type === 'SCENE' ? st.cmd.command : st.cmd) as Extract<GameCommand, { type: 'BATTLE' }>;
      const c = inner.command;
      const list = recs.get(bv.key) ?? [];
      list.push({
        turn: b.turn,
        phase: b.phase,
        cmdType: c.type,
        actor: 'characterId' in c ? c.characterId : undefined,
        events: st.events,
        pred: pred.get(bv.key) ?? {},
        dot: Object.fromEntries(b.allies.map((a) => [a.id, dotDamage(a)])),
      });
      recs.set(bv.key, list);
      const after = battleView(st.after, st.cmd)?.b ?? (st.cmd.type === 'SCENE' ? undefined : st.after.battle);
      const lost = st.events.some((e) => e.type === 'phase' && e.phase === 'defeat') || after?.phase === 'defeat';
      if (lost) {
        const last = b.turn;
        const allyIds = new Set(b.allies.map((a) => a.id));
        const names = Object.fromEntries(b.enemies.map((e) => [e.uid, getEnemy(e.defId).name]));
        const items = list.filter((r) => r.turn >= last - 1).flatMap((r) => classify(r, allyIds, names));
        const sum: Record<string, number> = {};
        for (const it of items) {
          sum[it.cls] = (sum[it.cls] ?? 0) + it.amount;
          total[it.cls] = (total[it.cls] ?? 0) + it.amount;
          total3[CLASS3[it.cls]] = (total3[CLASS3[it.cls]] ?? 0) + it.amount;
        }
        wipes.push({ seed, step: st.i, battle: bv.key, turn: last, enemies: Object.values(names), worldTurn: st.before.world?.worldTurn, sum, items });
        recs.delete(bv.key);
        if (wipes.length >= WIPES) return true;
      }
      return false;
    });
  }
  const sec = (Date.now() - t0) / 1000;
  const all = Object.values(total3).reduce((a, b) => a + b, 0);
  writeFileSync(`${OUT}/defeat.json`, JSON.stringify({ build: buildId(), mode: 'defeat', SEEDS, WIPES, seconds: sec, total, total3, wipes }, null, 1));
  const unannounced = wipes.flatMap((w) => ((w as { items: ReturnType<typeof classify> }).items).filter((it) => CLASS3[it.cls] === '予告なし').map((it) => `${it.cls}: ${it.from ?? '?'}「${it.action ?? '-'}」${it.amount}（種${(w as { seed: number }).seed}・${it.turn}ターン目）`));
  const md = [
    `# T4 負けた理由（defeat）`,
    ``,
    `- ビルド: ${buildId()} / ふつう・2人（剣士・魔法使い）/ 種 9001〜 / 集めた全滅 ${wipes.length} / ${sec.toFixed(0)}秒`,
    `- 全滅した戦闘の最後の2ターンに味方が受けたダメージ（HPが減った量）を分けた。予告 = 味方フェーズに出ていた敵の行動（intent）と、その行動の当たる相手`,
    ``,
    `| 分類 | ダメージ | 割合 |`,
    `|---|---|---|`,
    ...Object.entries(total3).map(([k, v]) => `| ${k} | ${v} | **${pct(v, all)}%** |`),
    ``,
    `細かい分類: ${Object.entries(total).map(([k, v]) => `${k} ${v}`).join('・')}`,
    ``,
    `## 予告に無かったダメージ`,
    ...(unannounced.length ? unannounced.slice(0, 60).map((x) => `- ${x}`) : ['- なし']),
    ``,
    `## 全滅ごと`,
    ...wipes.map((w) => { const x = w as { seed: number; turn: number; enemies: string[]; sum: Record<string, number> }; return `- 種${x.seed}・${x.turn}ターン目・${x.enemies.join('・')}: ${Object.entries(x.sum).map(([k, v]) => `${k}${v}`).join('・')}`; }),
  ];
  writeFileSync(`${OUT}/defeat.md`, md.join('\n') + '\n');
}

// ===================================================================
// T5 お供（pet・画面なしの部分）
// ===================================================================

function runPet() {
  const SEEDS = num('OPS_SEEDS', 3);
  const STEPS = num('OPS_STEPS', 8000);
  const scenarios = process.env.OPS_SCENARIOS ? process.env.OPS_SCENARIOS.split(',') : SCENARIOS.all.filter((s) => !s.wip).map((s) => s.id);
  const t0 = Date.now();
  const offers: Record<string, unknown>[] = [];
  const withPet: Record<string, unknown>[] = [];
  for (const sc of scenarios) {
    for (let s = 1; s <= SEEDS; s++) {
      const seed = 6000 + s;
      // ① 最初のお供の候補が出るまで（bot はお供を迎えないので、候補が出た所で止める）
      let first: Record<string, unknown> | undefined;
      const r = drive(newGame(seed, { scenarioId: sc }), STEPS, (st) => {
        const h = st.after.heroes.find((x) => x.petOffer?.length);
        if (h) {
          first = { step: st.i, worldTurn: st.after.world?.worldTurn, day: r2((st.after.world?.worldTurn ?? 0) / 8), by: st.cmd.type === 'SCENE' ? `SCENE/${st.cmd.command.type}` : st.cmd.type, mode: st.before.mode, offer: h.petOffer };
          return true;
        }
        return false;
      });
      offers.push({ scenario: sc, seed, found: !!first, ...(first ?? { step: r.steps, end: r.game.mode }) });
      // ② お供を最初から全員に付けた冒険: 能力の発動と、撫でられる機会
      const g0 = newGame(seed, { scenarioId: sc });
      const pets = PETS.all;
      g0.heroes.forEach((h, i) => {
        const p = pets[(s + i) % pets.length];
        h.pet = { petId: p.id, color: p.colors[0].id, name: `p${i}`, love: 0, acts: 0 };
      });
      let battles = 0;
      let triggers = 0;
      const triggerNames: Record<string, number> = {};
      const patPlaces: Record<string, number> = {};
      let lastPlace = '';
      drive(g0, STEPS, (st) => {
        for (const ev of st.events) {
          if (ev.type === 'phase' && (ev.phase === 'victory' || ev.phase === 'defeat')) battles++;
          if (ev.type === 'ability' && ev.source?.kind === 'pet') {
            triggers++;
            triggerNames[ev.name] = (triggerNames[ev.name] ?? 0) + 1;
          }
        }
        // 撫でられる機会: 場所が変わった時に、撫でられる場所にいるお供の数（1回の滞在を1回と数える）
        const places = st.after.heroes.filter((h) => h.pet && !h.retired).map((h) => heroPlace(st.after, h));
        const key = `${st.after.mode}:${places.join(',')}`;
        if (key !== lastPlace) {
          for (const pl of places) if (pl !== 'busy') patPlaces[pl] = (patPlaces[pl] ?? 0) + 1;
          lastPlace = key;
        }
      });
      withPet.push({ scenario: sc, seed, battles, triggers, perBattle: r2(triggers / Math.max(1, battles)), triggerNames, patPlaces });
    }
  }
  const sec = (Date.now() - t0) / 1000;
  writeFileSync(`${OUT}/pet.json`, JSON.stringify({ build: buildId(), mode: 'pet', SEEDS, STEPS, seconds: sec, offers, withPet }, null, 1));
  const md = [
    `# T5 お供（pet・画面なしの部分）`,
    ``,
    `- ビルド: ${buildId()} / ふつう・2人 / 種 6001〜${6000 + SEEDS} / 1本 ${STEPS}手まで / ${sec.toFixed(0)}秒`,
    `- bot はお供を迎えない。①は「最初の候補が出た所」で止めた。②はお供を最初から2人に付けて、能力の発動と、撫でられる場所に入った回数を数えた`,
    ``,
    `## ① 最初のお供の候補が出るまで`,
    `| シナリオ | 種 | 出た | 手数 | 日 | きっかけ |`,
    `|---|---|---|---|---|---|`,
    ...offers.map((o) => { const x = o as { scenario: string; seed: number; found: boolean; step: number; day?: number; by?: string; end?: string }; return `| ${x.scenario} | ${x.seed} | ${x.found ? '○' : '×'} | ${x.step} | ${x.day ?? '-'} | ${x.by ?? x.end ?? '-'} |`; }),
    ``,
    `## ② お供の能力の発動・撫でられる機会`,
    `| シナリオ | 種 | 戦闘 | 発動 | 1戦あたり | 撫でられる場所に入った回数 |`,
    `|---|---|---|---|---|---|`,
    ...withPet.map((o) => { const x = o as { scenario: string; seed: number; battles: number; triggers: number; perBattle: number; patPlaces: Record<string, number> }; return `| ${x.scenario} | ${x.seed} | ${x.battles} | ${x.triggers} | ${x.perBattle} | ${Object.entries(x.patPlaces).map(([k, v]) => `${k}${v}`).join('・')} |`; }),
  ];
  writeFileSync(`${OUT}/pet.md`, md.join('\n') + '\n');
}

// ===================================================================
// T7 報酬がすぐ役に立つか（reward）
// ===================================================================

function runReward() {
  const SEEDS = num('OPS_SEEDS', 3);
  const STEPS = num('OPS_STEPS', 30000);
  const t0 = Date.now();
  const runs: Record<string, unknown>[] = [];
  const cardGaps: number[] = [];
  const equipGaps: number[] = [];
  let cardsNever = 0;
  let equipsNever = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const seed = 9500 + s;
    const cards = new Map<string, { cardId: string; at: number; used?: number }>();
    const items = new Map<string, { itemId: string; at: number; used?: number }>();
    drive(newGame(seed), STEPS, (st) => {
      if (st.error) return false;
      const won = st.after.stats.battlesWon;
      const inner = st.cmd.type === 'SCENE' ? st.cmd.command : st.cmd;
      if (inner.type === 'PICK_CARD' || inner.type === 'FINISH_REWARD' || inner.type === 'CHOOSE_EVENT' || inner.type === 'LEAVE_CHEST' || inner.type === 'OPEN_CHEST' || inner.type === 'FINISH_EVENT') {
        for (const h of st.after.heroes) {
          const old = st.before.heroes.find((x) => x.id === h.id)!;
          const had = new Set(old.deck.map((c) => c.uid));
          if (inner.type === 'PICK_CARD') for (const c of h.deck) if (!had.has(c.uid) && !c.fromWeapon && !cards.has(c.uid)) cards.set(c.uid, { cardId: c.cardId, at: won });
          const hadI = new Set([...old.stash, ...Object.values(old.equipment)].filter(Boolean).map((x) => x!.uid));
          for (const it of h.stash) if (!hadI.has(it.uid) && !items.has(it.uid)) items.set(it.uid, { itemId: it.itemId, at: won });
        }
      }
      if (inner.type === 'BATTLE' && inner.command.type === 'PLAY_CARD') {
        const e = cards.get(inner.command.cardInstanceId);
        if (e && e.used === undefined) e.used = won - e.at;
      }
      if (inner.type === 'EQUIP') {
        const e = items.get(inner.itemUid);
        if (e && e.used === undefined) e.used = won - e.at;
      }
      return false;
    });
    for (const c of cards.values()) c.used === undefined ? cardsNever++ : cardGaps.push(c.used);
    for (const c of items.values()) c.used === undefined ? equipsNever++ : equipGaps.push(c.used);
    runs.push({ seed, cards: [...cards.values()], items: [...items.values()] });
  }
  const sec = (Date.now() - t0) / 1000;
  writeFileSync(`${OUT}/reward.json`, JSON.stringify({ build: buildId(), mode: 'reward', SEEDS, seconds: sec, runs }, null, 1));
  const hist = (xs: number[]) => { const m: Record<string, number> = {}; for (const x of xs) { const k = x >= 5 ? '5以上' : String(x); m[k] = (m[k] ?? 0) + 1; } return Object.entries(m).map(([k, v]) => `${k}戦:${v}`).join('・'); };
  const md = [
    `# T7 報酬がすぐ役に立つか（reward）`,
    ``,
    `- ビルド: ${buildId()} / ふつう・2人 / 種 9501〜${9500 + SEEDS} / ${sec.toFixed(0)}秒`,
    `- 手に入れてから初めて使う（カードは戦闘で出す・装備は装備する）までに勝った戦闘の数。bot は報酬に先頭を選び、手札を左から使うので偏りがある`,
    ``,
    `- カード: 使った ${cardGaps.length}枚（平均 ${r2(mean(cardGaps))}戦）・最後まで使わなかった ${cardsNever}枚 / ${hist(cardGaps)}`,
    `- 装備: 装備した ${equipGaps.length}個（平均 ${r2(mean(equipGaps))}戦）・装備しなかった ${equipsNever}個 / ${hist(equipGaps)}`,
  ];
  writeFileSync(`${OUT}/reward.md`, md.join('\n') + '\n');
}

// ===================================================================
// T6 寄り道の代償（detour）。bot.ts は変えず、命令を差し替えて「町・出来事に寄る」bot を作る
// ===================================================================

function detourOverride() {
  const visited = new Set<number>();
  let pending: number | undefined;
  return (g: GameState, cmd: GameCommand): GameCommand => {
    const w = g.world;
    if (!w || g.mode !== 'world' || w.story || cmd.type === 'SCENE' || g.expeditions?.some((x) => x.heroes.includes(w.turn))) return cmd;
    const h = findHero(g, w.turn);
    if (!h) return cmd;
    const at = w.pos[h.id];
    // 寄り道のマスに着いたら、中に入る（1回だけ）
    if (pending !== undefined && at === pending && cmd.type !== 'WORLD_INTERACT') {
      pending = undefined;
      const party = Object.keys(w.pos).filter((id) => w.pos[id] === at && findHero(g, id) && !findHero(g, id)!.retired);
      const c: GameCommand = { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id, party };
      if (!applyGameCommand(g, c).error) return c;
    }
    if (cmd.type !== 'WORLD_MOVE' || w.move == null || w.move <= 0) return cmd;
    for (const [i] of reachable(w, at, w.move)) {
      const f = w.tiles[i]?.f;
      if (!f || (f.kind !== 'town' && f.kind !== 'event') || visited.has(i) || i === at) continue;
      if (f.kind === 'town' && w.fallenTowns.includes(f.id)) continue;
      const c: GameCommand = { ...cmd, to: i };
      if (applyGameCommand(g, c).error) continue;
      visited.add(i);
      pending = i;
      return c;
    }
    return cmd;
  };
}

function runDetour() {
  const SEEDS = num('OPS_SEEDS', 3);
  const STEPS = num('OPS_STEPS', 60000);
  const t0 = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (let s = 1; s <= SEEDS; s++) {
    const seed = 9700 + s;
    const res: Record<string, unknown> = { seed };
    for (const kind of ['straight', 'detour'] as const) {
      let bossCorruption: number | undefined;
      const r = drive(newGame(seed), STEPS, (st) => {
        const bv = battleView(st.after, st.cmd) ?? battleView(st.after);
        // 最後に当たったボスの、1ターン目の侵食度（最後のダンジョンのボスが残る）
        if (bv && bv.view.battleInfo?.roomType && isBossRoom({ type: bv.view.battleInfo.roomType }) && bv.b.turn === 1) bossCorruption = st.after.world?.corruption;
        return false;
      }, kind === 'detour' ? detourOverride() : undefined);
      const g = r.game;
      res[kind] = { mode: g.mode, cleared: g.mode === 'ending', corruption: g.world?.corruption, lastBossCorruption: bossCorruption, livesLeft: g.lives, battles: g.stats.battlesWon, steps: r.steps, errors: r.errors.length };
    }
    rows.push(res);
  }
  const sec = (Date.now() - t0) / 1000;
  writeFileSync(`${OUT}/detour.json`, JSON.stringify({ build: buildId(), mode: 'detour', SEEDS, seconds: sec, rows }, null, 1));
  type R = { cleared: boolean; corruption?: number; lastBossCorruption?: number; livesLeft: number; battles: number; mode: string };
  const better = rows.filter((x) => { const a = x.straight as R, b = x.detour as R; return (b.cleared && !a.cleared) || (b.cleared === a.cleared && b.livesLeft > a.livesLeft); }).length;
  const md = [
    `# T6 寄り道の代償（detour）`,
    ``,
    `- ビルド: ${buildId()} / ふつう・2人 / 種 9701〜${9700 + SEEDS} / ${sec.toFixed(0)}秒`,
    `- straight = 今の bot。detour = 動ける範囲に、まだ寄っていない町・出来事のマスがあれば、そこへ寄って入る（bot.ts は変えず、テストの中で命令を差し替え）`,
    `- 寄り道で得をした種（クリアが増えた、または残りの灯火が多い）: **${better} / ${rows.length}**（0なら「寄り道はいつも損」の候補）`,
    ``,
    `| 種 | 形 | 結果 | 最後の侵食度 | 最後のボスの時の侵食度 | 残りの灯火 | 勝った戦闘 |`,
    `|---|---|---|---|---|---|---|`,
    ...rows.flatMap((x) => (['straight', 'detour'] as const).map((k) => { const v = x[k] as R; return `| ${x.seed} | ${k} | ${v.cleared ? 'クリア' : v.mode} | ${v.corruption ?? '-'} | ${v.lastBossCorruption ?? '-'} | ${v.livesLeft} | ${v.battles} |`; })),
  ];
  writeFileSync(`${OUT}/detour.md`, md.join('\n') + '\n');
}

describe.skipIf(!MODE)(`運用テストの道具（OPSSIM=${MODE}）`, () => {
  it('集計', () => {
    mkdirSync(OUT, { recursive: true });
    const t0 = Date.now();
    for (const m of (MODE ?? '').split(',')) {
      if (m === 'branch') runBranch();
      else if (m === 'wait') runWait();
      else if (m === 'defeat') runDefeat();
      else if (m === 'pet') runPet();
      else if (m === 'reward') runReward();
      else if (m === 'detour') runDetour();
      else throw new Error(`知らないモード: ${m}`);
    }
    console.log(`[ops] ${MODE}: ${((Date.now() - t0) / 1000).toFixed(1)}秒`);
    expect(true).toBe(true);
  }, 86_400_000);
});
