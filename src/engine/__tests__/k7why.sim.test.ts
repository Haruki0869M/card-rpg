// ===== K7 弱いジョブの「なぜ」を切り分ける実験（一時的。数値は変えない）=====
// K7WHY=base|hp|deck|smart で動かす。調べるジョブを先頭にした2人パーティ（＋剣士）・ふつう・40シード。
//  base  = そのまま（bot は手札を左から使う）
//  hp    = 先頭のキャラの最大HP +15（HP の低さが原因か）
//  deck  = 先頭のキャラの最初の山札を剣士と同じにする（カードの効き方が原因か）
//  smart = 先頭のキャラだけ、使えるカードと狙う敵を1つずつ試して一番効くものを使う（bot の使い方の癖が原因か）
// 結果は screenshots/k7-why-<条件>.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardOf } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { getItem } from '../../data/items';
import type { BattleState, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createGame, isDone, unusableReason, viewOf } from '../index';
import { botStep, type BotLog } from '../bot';
import { heroMaxHp, jobWeapons } from '../game/hero';
import { signatureCards } from '../game/jobs';
import { cardTargets, isAllyCard, secondaryCard } from '../battle/targets';
import { unitIdOf } from '../battle/units';

const MODE = process.env.K7WHY;
const SEEDS = Number(process.env.K7_SEEDS ?? 40);
const JOBS = (process.env.K7_JOBS ?? 'warrior,thief,guardian,mage,hexer,phantomThief,grandThief,gambler,hadesLord,necromancer').split(',');

function pathTo(id: string): string[] {
  const out = [id];
  for (let c = CLASSES.get(id); c.from?.length; c = CLASSES.get(c.from[0])) out.unshift(c.from[0]);
  return out;
}
/** 転職した直後の形（k7survey と同じ） */
function promote(g: GameState, target: string) {
  const h = g.heroes[0];
  for (const jobId of pathTo(target).slice(1)) {
    const job = CLASSES.get(jobId);
    h.jobs = [...(h.jobs ?? []), h.classId];
    h.carried = h.classId;
    h.classId = jobId;
    h.level = 1;
    h.exp = 0;
    const w = h.equipment.weapon;
    if (w && !jobWeapons(jobId).includes(getItem(w.itemId).weaponType ?? '')) delete h.equipment.weapon;
    const start = job.startingEquipment.weapon;
    if (!h.equipment.weapon && start) h.equipment.weapon = { uid: `i${g.nextUid++}`, itemId: start };
    for (const cardId of job.jobCards ?? []) h.deck.push({ uid: `c${g.nextUid++}`, cardId });
    const sig = signatureCards(job);
    if (sig[0]) h.deck.push({ uid: `c${g.nextUid++}`, cardId: sig[0] });
  }
  h.hp = heroMaxHp(h);
}

/** 敵に与えた効き目を数える（HPの減り・倒した・毒/呪いなどの悪い状態・味方のブロック/回復） */
function score(before: BattleState, after: BattleState, allyId: string): number {
  let s = 0;
  for (const e of before.enemies) {
    const a = after.enemies.find((x) => x.uid === e.uid);
    if (!a || e.dead) continue;
    s += Math.max(0, e.hp - a.hp);
    if (a.dead || a.hp <= 0) s += 12;
    const st = (x: typeof e) => Object.values(x.statuses ?? {}).reduce((n, v) => n + (typeof v === 'number' ? v : 0), 0);
    s += Math.max(0, st(a) - st(e)) * 2;
  }
  for (const al of before.allies) {
    const b = after.allies.find((x) => x.id === al.id);
    if (!b) continue;
    s += Math.max(0, (b.block ?? 0) - (al.block ?? 0)) * 0.5;
    s += Math.max(0, b.hp - al.hp) * 0.6;
  }
  void allyId;
  return s;
}

/** 先頭のキャラの賢い一手（使えるカード × 狙う敵 を全部試す。試すだけなので、本番の乱数はそのまま） */
function smartPlay(b: BattleState, allyId: string): Command | null {
  const a = b.allies.find((x) => x.id === allyId);
  if (!a || isDone(b, a)) return null;
  let best: { cmd: Command; s: number } | null = null;
  for (const c of a.hand) {
    const card = cardOf(c);
    if (unusableReason(b, a, card)) continue;
    const focus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
    const allyT = isAllyCard(card) ? cardTargets(b, a, card).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp).map(unitIdOf)[0] : undefined;
    const second = card.secondaryTarget ? cardTargets(b, a, secondaryCard(card)).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp).map(unitIdOf)[0] : undefined;
    const targets = card.target === 'enemy' ? b.enemies.filter((e) => !e.dead).map((e) => e.uid) : [allyT];
    for (const t of targets) {
      const cmd = { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: c.uid, targetId: t, allyTargetId: second, focusUsed: focus } as Command;
      const r = applyCommand(b, cmd);
      if (r.error) continue;
      const s = score(b, r.state, a.id) + card.cost * 0.1;
      if (!best || s > best.s) best = { cmd, s };
    }
  }
  return best?.cmd ?? null;
}

interface Run { cleared: boolean; why: string; xRetired: boolean; days: number; corruption: number }

function play(job: string, seed: number): Run {
  const base = pathTo(job)[0];
  const g0 = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: [base, 'warrior'].map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: (i ? 'P1' : 'P1') as PlayerId })) });
  if (job !== base) promote(g0, job);
  const x = g0.heroes[0];
  if (MODE === 'hp') {
    x.bonusMaxHp += 15;
    x.hp = heroMaxHp(x);
  }
  if (MODE === 'deck') {
    const w = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'w', playerId: 'P1' }] }).heroes[0];
    x.deck = w.deck.map((c) => ({ ...c, uid: `d${g0.nextUid++}` }));
  }
  const log: BotLog = { steps: 0, errors: [], modes: {} };
  const memo = { interacted: new Set<string>() };
  let g = g0;
  let stuck = 0;
  for (; log.steps < 60000; log.steps++) {
    if (g.mode === 'ending' || g.mode === 'gameover') break;
    let next: GameState | null = null;
    if (MODE === 'smart') {
      const exp = g.world ? g.expeditions?.find((e) => e.heroes.includes(g.world!.turn)) : g.expeditions?.[0];
      const v = exp ? viewOf(g, exp.id) : g;
      if (v.mode === 'battle' && v.battle?.phase === 'ally') {
        const cmd = smartPlay(v.battle, x.id);
        if (cmd) {
          const inner: GameCommand = { type: 'BATTLE', command: cmd };
          const r = applyGameCommand(g, exp ? { type: 'SCENE', scene: exp.id, command: inner } : inner);
          if (!r.error) next = r.state;
        }
      }
    }
    if (!next) next = botStep(g, log, memo);
    stuck = next === g ? stuck + 1 : 0;
    if (stuck > 50) break;
    g = next;
  }
  expect(log.errors).toEqual([]);
  const h = g.heroes[0];
  return {
    cleared: g.mode === 'ending',
    why: g.mode === 'ending' ? 'clear' : (g.world?.corruption ?? 0) >= 100 ? '侵食' : g.mode === 'gameover' ? '全滅' : `途中${g.mode}`,
    xRetired: !!h.retired,
    days: (g.world?.worldTurn ?? 1) / 8,
    corruption: g.world?.corruption ?? 0,
  };
}

describe.skipIf(!MODE)(`K7 なぜ弱いか（${MODE}）`, () => {
  it('集計', () => {
    mkdirSync('screenshots', { recursive: true });
    const lines = ['| ジョブ | クリア率 | 先頭の退場 | 日数 | 侵食度 |', '|---|---|---|---|---|'];
    for (const job of JOBS) {
      const rs: Run[] = [];
      for (let s = 1; s <= SEEDS; s++) rs.push(play(job, 5000 + s));
      const p = (f: (r: Run) => boolean) => Math.round((rs.filter(f).length / rs.length) * 100);
      const a = (f: (r: Run) => number) => (rs.reduce((n, r) => n + f(r), 0) / rs.length).toFixed(1);
      lines.push(`| ${CLASSES.get(job).name} | **${p((r) => r.cleared)}%** | ${p((r) => r.xRetired)}% | ${a((r) => r.days)} | ${a((r) => r.corruption)}% |`);
      writeFileSync(`screenshots/k7-why-${MODE}.md`, lines.join('\n') + '\n');
    }
  }, 86_400_000);
});
