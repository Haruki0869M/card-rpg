// ===== 釣り合いの物差し2本（計画書 第2版 §5-3）: 直行 bot と 工夫する bot を、同じ種・同じ人数・同じ難易度で比べる =====
// 時間がかかるので、普段のテストでは動かさない。数値は変えない（測るだけ）。
// 使い方（重いので heavy.mjs を通す）:
//   SIM=1 SIM_SEEDS=40 SIM_DIFF=normal node C:/dev/card-rpg-tools/heavy.mjs npx vitest run src/engine/__tests__/twoBots.sim.test.ts
// 環境変数（どれも省略できる）: SIM_SEEDS（種の数。1001 から。既定40）・SIM_DIFF（既定 normal）・SIM_PARTY（2人 / 3人 / 4人。既定は全部）・
//   SIM_SCENARIO（既定 corruptionKing）・SIM_OUT（既定 screenshots/balance-two-bots.md）・
//   SIM_CLEVER_OFF（工夫する bot から外す工夫。battle,job,detour,hone をカンマで。どの工夫が効いているかを確かめる用）
// パーティは balance.sim と同じ（1人のプレイヤーが全員を動かす。剣士・魔法使い ＋ 狩人 ＋ 守護者）
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { BattleEvent, GameCommand, GameState, PlayerId } from '../../types';

type Hook = (pre: GameState, cmd: GameCommand, post: GameState, events: BattleEvent[]) => void;
const H: { hook?: Hook } = {};
vi.mock('../index', async (orig) => {
  const m = (await orig()) as typeof import('../index');
  return {
    ...m,
    applyGameCommand: (g: GameState, c: GameCommand) => {
      const r = m.applyGameCommand(g, c);
      if (!r.error) H.hook?.(g, c, r.state, r.battleEvents ?? []);
      return r;
    },
  };
});

import { createGame, aliveScourges, isRandomDungeonTile } from '../index';
import { playToEnd } from '../bot';
import type { CleverPart } from '../botClever';
import { DUNGEONS } from '../../data/dungeons';
import { getDifficulty } from '../../data/rules';

const SCENARIO = process.env.SIM_SCENARIO ?? 'corruptionKing';
const SEEDS = Number(process.env.SIM_SEEDS ?? 40);
const DIFF = process.env.SIM_DIFF ?? 'normal';
const OUT = process.env.SIM_OUT ?? 'screenshots/balance-two-bots.md';
const PARTIES: Record<string, string[]> = {
  '2人': ['warrior', 'mage'],
  '3人': ['warrior', 'mage', 'hunter'],
  '4人': ['warrior', 'mage', 'guardian', 'hunter'],
};
/** 計画書 §5-3 の目標（ふつう・提案）。工夫する bot のクリア率の目標は人数で変わる（3人は書いていないので 2人と4人の間で見る） */
const OFF = (process.env.SIM_CLEVER_OFF ?? '').split(',').filter(Boolean) as CleverPart[];
const TARGET: Record<string, string> = { '2人': '35〜50%', '3人': '（目標なし。2人と4人の間）', '4人': '30〜45%' };

const WHERE = ['鍵1の前', '鍵1の中', '鍵2の前', '鍵2の中', '鍵3の前', '鍵3の中', '最後の前', '最後の中'] as const;

interface Run {
  clear: boolean;
  corr100: boolean;
  where: string;
  /** 始まった戦闘の数・終わった戦闘のラウンド（ターン）の合計と数 */
  fights: number;
  rounds: number;
  finished: number;
  /** 工夫が使われた数: BREAK・ランダムダンジョンに入った・踏破した・災厄を倒した・転職・技を磨いた */
  breaks: number;
  randomIn: number;
  randomDone: number;
  scourgeKills: number;
  jobChanges: number;
  hones: number;
  errors: number;
}

function runOne(classes: string[], seed: number, bot: 'straight' | 'clever'): Run {
  const g0 = createGame({ seed, scenarioId: SCENARIO, difficulty: DIFF as never, party: classes.map((c, i) => ({ classId: c, gender: 'male', name: c + i, playerId: 'P1' as PlayerId })) });
  const battlesOf = (g: GameState) => [g.battle, ...(g.expeditions ?? []).map((x) => x.battle)].filter((b): b is NonNullable<GameState['battle']> => !!b);
  const dungeonsOf = (g: GameState) => [g.dungeon, ...(g.expeditions ?? []).map((x) => x.dungeon)].filter((d): d is NonNullable<GameState['dungeon']> => !!d);
  const r: Run = { clear: false, corr100: false, where: '', fights: 0, rounds: 0, finished: 0, breaks: 0, randomIn: 0, randomDone: 0, scourgeKills: 0, jobChanges: 0, hones: 0, errors: 0 };
  const entered = new Set<string>();
  H.hook = (pre, cmd, post, events) => {
    const b0 = battlesOf(pre);
    const b1 = battlesOf(post);
    if (b1.length > b0.length) r.fights += b1.length - b0.length;
    if (b1.length < b0.length) {
      r.finished += b0.length - b1.length;
      r.rounds += b0.reduce((n, b) => n + b.turn, 0) - b1.reduce((n, b) => n + b.turn, 0);
    }
    r.breaks += events.filter((e) => e.type === 'break').length;
    const d0 = dungeonsOf(pre).length;
    for (const d of dungeonsOf(post).slice(d0)) {
      entered.add(d.dungeonId);
      if (DUNGEONS.get(d.dungeonId).random) r.randomIn++;
    }
    const inner = cmd.type === 'SCENE' || cmd.type === 'VOTE' ? cmd.command : cmd;
    if (inner?.type === 'CHANGE_JOB') r.jobChanges++;
    if (inner?.type === 'REST' && inner.kind === 'upgrade') r.hones++;
  };
  const { game, log } = playToEnd(g0, 60000, bot === 'straight' ? { straight: true } : { clever: true, cleverOff: OFF });
  H.hook = undefined;
  r.errors = log.errors.length;
  r.clear = game.mode === 'ending';
  r.corr100 = !r.clear && (game.world?.corruption ?? 0) >= 100;
  const w = game.world;
  if (w) {
    r.randomDone = w.tiles.filter((t) => isRandomDungeonTile(t.f) && t.f!.used).length;
    r.scourgeKills = (w.scourgesMet?.length ?? 0) - aliveScourges(w).length;
  }
  // どこで終わったか（volume.sim と同じ数え方）: 次に目指していたダンジョン（鍵の順・最後）に、1回でも入っていれば「中」
  const keyed = DUNGEONS.forScenario(SCENARIO).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
  const finale = DUNGEONS.forScenario(SCENARIO).find((d) => d.finale)!;
  const nextAt = keyed.findIndex((d) => !game.clearedDungeons.includes(d.id));
  const target = nextAt < 0 ? finale : keyed[nextAt];
  r.where = r.clear ? 'クリア' : `${nextAt < 0 ? '最後' : `鍵${nextAt + 1}`}の${entered.has(target.id) ? '中' : '前'}`;
  return r;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f = (x: number, d = 0) => (Number.isNaN(x) ? '-' : x.toFixed(d));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : NaN);

describe.skipIf(!process.env.SIM)(`物差し2本（直行 bot と工夫する bot・${SCENARIO}・${DIFF}・${SEEDS}種）`, () => {
  it('2本の bot を同じ種で流して、表にする', () => {
    const t0 = Date.now();
    const all: Record<string, Record<'straight' | 'clever', Run[]>> = {};
    const write = () => {
      const L: string[] = [];
      const name = { straight: '直行 bot', clever: '工夫する bot' } as const;
      L.push(`# 物差し2本（計画書 第2版 §5-3）`, '');
      L.push(`シナリオ ${SCENARIO}・難易度 ${getDifficulty(DIFF as never).name}・種 ${SEEDS}個（1001〜）・${((Date.now() - t0) / 1000).toFixed(0)}秒。同じ種・同じ人数・同じ難易度で2本の bot を流した。${OFF.length ? `**工夫する bot から外した工夫: ${OFF.join('・')}**` : ''}`, '');
      L.push('## 1. 2本の比べ', '');
      L.push(`| 人数 | bot | クリア率 | 負けた場所（${WHERE.join('・')}） | 侵食度100%で終わった割合（負けのうち） | クリアした冒険の戦闘の数 | 1戦あたりのラウンド | 全部の冒険の戦闘の数 |`);
      L.push('|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of ['straight', 'clever'] as const) {
          const rs = by[k];
          if (!rs) continue;
          const lost = rs.filter((r) => !r.clear);
          const cl = rs.filter((r) => r.clear);
          const where = WHERE.map((w) => rs.filter((r) => r.where === w).length).join('・');
          const finished = rs.reduce((n, r) => n + r.finished, 0);
          L.push(`| ${p} | ${name[k]} | **${f(pct(cl.length, rs.length))}%**（${cl.length}/${rs.length}） | ${where} | ${f(pct(lost.filter((r) => r.corr100).length, lost.length))}%（${lost.filter((r) => r.corr100).length}/${lost.length}） | ${f(avg(cl.map((r) => r.fights)), 1)} | ${f(finished ? rs.reduce((n, r) => n + r.rounds, 0) / finished : NaN, 2)} | ${f(avg(rs.map((r) => r.fights)), 1)} |`);
        }
        if (by.straight && by.clever) {
          const d = pct(by.clever.filter((r) => r.clear).length, by.clever.length) - pct(by.straight.filter((r) => r.clear).length, by.straight.length);
          L.push(`| ${p} | **差（工夫 − 直行）** | **${d >= 0 ? '+' : ''}${f(d)}ポイント** | | | | | |`);
        }
      }
      L.push('', '## 2. 計画書の目標（ふつう・提案）との比べ', '');
      L.push('| 人数 | 直行 bot のクリア（目標 10%以下） | 工夫する bot のクリア（目標） | 差（目標 25ポイント以上） | 時間切れの割合（目標: 負けの4分の1以下 = 25%以下。工夫する bot） | 戦闘の数（目標 25〜32戦。工夫する bot のクリアした冒険） | 1戦あたりのラウンド（目標 4〜6。工夫する bot） |');
      L.push('|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        const s = by.straight ?? [];
        const c = by.clever ?? [];
        if (!s.length || !c.length) continue;
        const sc = pct(s.filter((r) => r.clear).length, s.length);
        const cc = pct(c.filter((r) => r.clear).length, c.length);
        const lost = c.filter((r) => !r.clear);
        const fin = c.reduce((n, r) => n + r.finished, 0);
        L.push(`| ${p} | ${f(sc)}% | ${f(cc)}%（${TARGET[p]}） | ${cc - sc >= 0 ? '+' : ''}${f(cc - sc)} | ${f(pct(lost.filter((r) => r.corr100).length, lost.length))}% | ${f(avg(c.filter((r) => r.clear).map((r) => r.fights)), 1)} | ${f(fin ? c.reduce((n, r) => n + r.rounds, 0) / fin : NaN, 2)} |`);
      }
      L.push('', '## 3. 工夫が使われた数（1冒険あたりの平均。工夫する bot が本当に工夫をしているかの確かめ）', '');
      L.push('| 人数 | bot | BREAK | ランダムダンジョンに入った | ランダムダンジョンを踏破 | 災厄を倒した | 転職 | 休憩で技を磨いた | bot の操作の失敗 |');
      L.push('|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of ['straight', 'clever'] as const) {
          const rs = by[k];
          if (!rs) continue;
          const a = (key: keyof Run) => f(avg(rs.map((r) => Number(r[key]))), 2);
          L.push(`| ${p} | ${name[k]} | ${a('breaks')} | ${a('randomIn')} | ${a('randomDone')} | ${a('scourgeKills')} | ${a('jobChanges')} | ${a('hones')} | ${rs.reduce((n, r) => n + r.errors, 0)} |`);
        }
      }
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, L.join('\n') + '\n');
    };
    for (const [p, classes] of Object.entries(PARTIES)) {
      if (process.env.SIM_PARTY && process.env.SIM_PARTY !== p) continue;
      all[p] = { straight: [], clever: [] };
      for (const bot of ['straight', 'clever'] as const) {
        for (let s = 1; s <= SEEDS; s++) all[p][bot].push(runOne(classes, 1000 + s, bot));
        // 途中でも結果が残るように、1組ごとに書き出す
        write();
      }
    }
    // bot の操作がゲームに断られていない事（断られると、測った数字が bot の不具合の数字になる）
    for (const by of Object.values(all)) for (const rs of Object.values(by)) expect(rs.reduce((n, r) => n + r.errors, 0)).toBe(0);
  }, 86_400_000);
});
