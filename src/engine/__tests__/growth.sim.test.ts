// ===== 3幕の成長の測定（2026-11-14・docs/tasks/homework-plan-1114.md 宿題6-1「まず測る」。ゲームは変えない） =====
// 憲章 §2-6・§4「全32〜40戦の中で、中位（序盤）→ 条件の達成（中盤）→ 最上位・特殊と決め技（終盤）の3幕になっているか」を、
// キャラ1人ずつ「何戦目・どのダンジョンの前後で転職したか」「決め技を手に入れた・引いた・使った戦闘」「各幕の戦闘の数」で数える。
// 時間がかかるので、普段のテストでは動かさない（twoBots.sim と同じ流儀。SIM=1 の時だけ）。
// 使い方（重いので heavy.mjs を通す）:
//   SIM=1 SIM_SEEDS=30 node C:/dev/card-rpg-tools/heavy.mjs npx vitest run src/engine/__tests__/growth.sim.test.ts
// 環境変数（どれも省略できる）: SIM_SEEDS（種の数。1001 から。既定30）・SIM_DIFF（既定 normal）・SIM_SCENARIO（既定 corruptionKing）・
//   SIM_PARTY（2人 / 4人 をカンマで。既定は両方）・SIM_BOT（smart / clever。既定 smart）・
//   SIM_OUT（表の書き出し先。既定 screenshots/growth.md）・SIM_JSON（キャラごとの記録の書き出し先。省略で書かない）
// パーティは twoBots.sim の標準（回復役 = 僧侶入り）と同じ: 2人 = 剣士＋僧侶 / 4人 = 剣士＋魔道士＋狩人＋僧侶。
// 数えるのはテストの側だけ（エンジンの結果は変えない）。
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

import { createGame } from '../index';
import { playToEnd } from '../bot';
import { finisherCards, featOf, jobOptions } from '../game/jobs';
import { DUNGEONS } from '../../data/dungeons';
import { getClass } from '../../data/classes';
import { getDifficulty } from '../../data/rules';

const SCENARIO = process.env.SIM_SCENARIO ?? 'corruptionKing';
const SEEDS = Number(process.env.SIM_SEEDS ?? 30);
const DIFF = process.env.SIM_DIFF ?? 'normal';
const BOT = (process.env.SIM_BOT ?? 'smart') as 'smart' | 'clever';
const OUT = process.env.SIM_OUT ?? 'screenshots/growth.md';
const PARTIES: Record<string, string[]> = {
  '2人': ['warrior', 'priest'],
  '4人': ['warrior', 'mage', 'hunter', 'priest'],
};
const KEYED = DUNGEONS.forScenario(SCENARIO).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
const FINALE = DUNGEONS.forScenario(SCENARIO).find((d) => d.finale)!;
/** 場所の並び（鍵1の前 → … → 最後の中 → クリアの後） */
const PLACES = ['鍵1の前', '鍵1の中', '鍵2の前', '鍵2の中', '鍵3の前', '鍵3の中', '最後の前', '最後の中'] as const;

/** 転職・決め技の出来事の時点 */
interface At {
  /** 冒険の何戦目の後か（それまでに始まった戦闘の数） */
  fight: number;
  /** そのキャラが出た戦闘の数 */
  own: number;
  level: number;
  place: string;
  worldTurn: number;
  job: string;
}
interface HeroRec {
  start: string;
  path: string[];
  mid?: At;
  top?: At & { tier: string };
  /** 中位の時に、最上位の「レベルと条件」がそろった時（場所は見ない） / 特殊職のどれかがそろった時 */
  ready?: At;
  readySp?: At;
  /** 決め技: 手に入れた（= 最上位・特殊への転職）・初めて手札に来た・初めて使った（どれも本人の何戦目か） */
  finGot?: number;
  finDrawn?: number;
  finPlayed?: number;
  /** 決め技を持って出た戦闘の数・そのうち手札に来た戦闘・使った戦闘 */
  finFights: number;
  finDrawnFights: number;
  finPlayedFights: number;
  /** 本人が出た戦闘の数（全部） */
  ownFights: number;
  /** 終わった時の段・レベル・中位で止まった時の条件と進み */
  endTier: string;
  endLevel: number;
  stuck?: string;
}
interface Run {
  clear: boolean;
  fights: number;
  where: string;
  heroes: HeroRec[];
  /** 鍵1〜3・最後のダンジョンを終えた（クリアした）時の、冒険の何戦目か */
  clearedAt: (number | undefined)[];
}

const tierOf = (classId: string) => getClass(classId).tier ?? 'base';

function runOne(classes: string[], seed: number): Run {
  const g0 = createGame({ seed, scenarioId: SCENARIO, difficulty: DIFF as never, party: classes.map((c, i) => ({ classId: c, gender: 'male', name: c + i, playerId: 'P1' as PlayerId })) });
  const FIN = finisherCards();
  const battlesOf = (g: GameState) => [g.battle, ...(g.expeditions ?? []).map((x) => x.battle)].filter((b): b is NonNullable<GameState['battle']> => !!b);
  const recs = new Map<string, HeroRec>(g0.heroes.map((h) => [h.id, { start: h.classId, path: [h.classId], finFights: 0, finDrawnFights: 0, finPlayedFights: 0, ownFights: 0, endTier: 'base', endLevel: 1 }]));
  let fights = 0;
  const clearedAt: (number | undefined)[] = [...KEYED, FINALE].map(() => undefined);
  const entered = new Set<string>();
  /** 戦闘の種 → その戦闘で、決め技を手札に見た／使ったキャラ */
  const drawnIn = new Map<number, Set<string>>();
  const playedIn = new Map<number, Set<string>>();
  /** その時のキャラの場所（鍵の前・中） */
  const placeOf = (g: GameState, heroId: string) => {
    const cleared = KEYED.filter((d) => g.clearedDungeons.includes(d.id)).length;
    const target = cleared < KEYED.length ? `鍵${cleared + 1}` : '最後';
    const ex = g.expeditions?.find((x) => x.heroes.includes(heroId));
    const dg = ex ? ex.dungeon : g.dungeon && (!g.party || g.party.includes(heroId)) ? g.dungeon : undefined;
    if (!dg) return `${target}の前`;
    if (DUNGEONS.get(dg.dungeonId).random) return `${target}の前（ランダムダンジョン）`;
    const i = KEYED.findIndex((d) => d.id === dg.dungeonId);
    return i >= 0 ? `鍵${i + 1}の中` : dg.dungeonId === FINALE.id ? '最後の中' : `${target}の前（${dg.dungeonId}）`;
  };
  H.hook = (pre, cmd, post) => {
    const b0 = battlesOf(pre);
    const had = new Set(b0.map((b) => b.seed));
    for (const b of battlesOf(post)) {
      if (had.has(b.seed)) continue;
      fights++;
      for (const a of b.allies) {
        const r = recs.get(a.id);
        if (!r) continue;
        r.ownFights++;
        if (r.finGot !== undefined) r.finFights++;
      }
    }
    // 決め技が手札にある（その戦闘で初めて見た時に数える）
    for (const b of battlesOf(post)) for (const a of b.allies) {
      const r = recs.get(a.id);
      if (!r || r.finGot === undefined || !a.hand.some((c) => FIN.has(c.cardId))) continue;
      const s = drawnIn.get(b.seed) ?? new Set<string>();
      if (s.has(a.id)) continue;
      s.add(a.id);
      drawnIn.set(b.seed, s);
      r.finDrawnFights++;
      r.finDrawn ??= r.ownFights;
    }
    const inner = cmd.type === 'SCENE' || cmd.type === 'VOTE' ? cmd.command : cmd;
    // 決め技を使った（PLAY_CARD の札が決め技）
    if (inner?.type === 'BATTLE' && inner.command.type === 'PLAY_CARD') {
      const pc = inner.command;
      for (const b of b0) {
        const a = b.allies.find((x) => x.id === pc.characterId);
        const card = a?.hand.find((c) => c.uid === pc.cardInstanceId);
        if (!a || !card || !FIN.has(card.cardId)) continue;
        const r = recs.get(a.id);
        if (!r) continue;
        const s = playedIn.get(b.seed) ?? new Set<string>();
        if (!s.has(a.id)) { s.add(a.id); playedIn.set(b.seed, s); r.finPlayedFights++; }
        r.finPlayed ??= r.ownFights;
      }
    }
    if (inner?.type === 'CHANGE_JOB') {
      const h = post.heroes.find((x) => x.id === inner.heroId)!;
      const r = recs.get(h.id)!;
      const before = pre.heroes.find((x) => x.id === inner.heroId)!;
      const at: At = { fight: fights, own: r.ownFights, level: before.level, place: placeOf(pre, h.id), worldTurn: pre.world?.worldTurn ?? 0, job: h.classId };
      r.path.push(h.classId);
      const t = tierOf(h.classId);
      if (t === 'mid') r.mid ??= at;
      else if (t === 'top' || t === 'special') {
        r.top ??= { ...at, tier: t };
        if ((getClass(h.classId).jobCards ?? []).length) r.finGot ??= r.ownFights;
      }
    }
    // 中位のキャラの、次の段の「レベルと条件」がそろった時（場所は見ない。転職の場所を待った長さを見る用）
    for (const h of post.heroes) {
      const r = recs.get(h.id);
      if (!r || (r.ready && r.readySp) || tierOf(h.classId) !== 'mid') continue;
      const q = jobOptions(h).filter((o) => o.qualified);
      const at = (): At => ({ fight: fights, own: r.ownFights, level: h.level, place: placeOf(post, h.id), worldTurn: post.world?.worldTurn ?? 0, job: h.classId });
      if (!r.ready && q.some((o) => o.job.tier === 'top')) r.ready = at();
      if (!r.readySp && q.some((o) => o.job.tier === 'special')) r.readySp = at();
    }
    // 鍵・最後のダンジョンを終えた時
    [...KEYED, FINALE].forEach((d, i) => { if (clearedAt[i] === undefined && post.clearedDungeons.includes(d.id)) clearedAt[i] = fights; });
    // 入ったダンジョン（終わった場所の「中」の判定）
    for (const d of [post.dungeon, ...(post.expeditions ?? []).map((x) => x.dungeon)]) if (d) entered.add(d.dungeonId);
  };
  const { game, log } = playToEnd(g0, 60000, BOT === 'smart' ? { smart: true } : { clever: true });
  H.hook = undefined;
  expect(log.errors).toEqual([]);
  for (const h of game.heroes) {
    const r = recs.get(h.id)!;
    r.endTier = tierOf(h.classId);
    r.endLevel = h.level;
    if (r.endTier === 'mid') {
      // 中位で止まった: 次の段の条件と進み（レベル・条件のどちらが足りないか）
      r.stuck = jobOptions(h).map((o) => `${o.job.name}${o.qualified ? '（条件はそろった）' : `（${o.job.requires ? `${o.job.requires.text} ${featOf(h, o.job.requires.feat)}/${o.job.requires.count}` : ''}${h.level < (o.needLevel ?? 0) ? ` Lv${h.level}/${o.needLevel}` : ''}）`}`).join('・');
    }
  }
  const clear = game.mode === 'ending';
  const nextAt = KEYED.findIndex((d) => !game.clearedDungeons.includes(d.id));
  const target = nextAt < 0 ? FINALE : KEYED[nextAt];
  const where = clear ? 'クリア' : `${nextAt < 0 ? '最後' : `鍵${nextAt + 1}`}の${entered.has(target.id) ? '中' : '前'}`;
  return { clear, fights, where, heroes: [...recs.values()], clearedAt };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f = (x: number, d = 1) => (Number.isNaN(x) ? '-' : x.toFixed(d));
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-');
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
/** 場所の数え（「鍵2の前（ランダムダンジョン）」などは、括弧の前の場所でまとめる） */
const placeCount = (xs: string[]) => PLACES.map((p) => xs.filter((x) => x.split('（')[0] === p).length).join('・');

describe.skipIf(!process.env.SIM)(`3幕の成長（${SCENARIO}・${DIFF}・${BOT}・${SEEDS}種）`, () => {
  it('転職の時期・決め技・各幕の戦闘の数を表にする', () => {
    const t0 = Date.now();
    const all: Record<string, Run[]> = {};
    const write = () => {
      const L: string[] = [];
      L.push('# 3幕の成長の測定（growth.sim）', '');
      L.push(`シナリオ ${SCENARIO}・難易度 ${getDifficulty(DIFF as never).name}・bot ${BOT}・種 ${SEEDS}個（1001〜）・${((Date.now() - t0) / 1000).toFixed(0)}秒。`, '');
      L.push('- 「何戦目」= 冒険全体で、それまでに始まった戦闘の数。「本人の何戦目」= そのキャラが出た戦闘の数。', '- 場所 = 次に目指す鍵のダンジョンの前か中（クリアした鍵の数で決める）。', '');
      L.push('## 1. まとめ（人数ごと）', '');
      L.push(`| 人数 | クリア | 戦闘の数（クリアした冒険 / 全部） | 中位になった | 中位になった何戦目（平均・中央） | 中位の時のレベル | 中位になった場所（${PLACES.join('・')}） | 最上位・特殊になった | その何戦目（平均・中央） | その場所 | 決め技を使った（持った人のうち） |`);
      L.push('|---|---|---|---|---|---|---|---|---|---|---|');
      for (const [p, rs] of Object.entries(all)) {
        const hs = rs.flatMap((r) => r.heroes);
        const mids = hs.filter((h) => h.mid);
        const tops = hs.filter((h) => h.top);
        const cl = rs.filter((r) => r.clear);
        L.push(`| ${p} | ${pct(cl.length, rs.length)}（${cl.length}/${rs.length}） | ${f(avg(cl.map((r) => r.fights)))} / ${f(avg(rs.map((r) => r.fights)))} | ${pct(mids.length, hs.length)}（${mids.length}/${hs.length}） | ${f(avg(mids.map((h) => h.mid!.fight)))}・${f(median(mids.map((h) => h.mid!.fight)))} | ${f(avg(mids.map((h) => h.mid!.level)))} | ${placeCount(mids.map((h) => h.mid!.place))} | ${pct(tops.length, hs.length)}（${tops.length}/${hs.length}） | ${f(avg(tops.map((h) => h.top!.fight)))}・${f(median(tops.map((h) => h.top!.fight)))} | ${placeCount(tops.map((h) => h.top!.place))} | ${pct(tops.filter((h) => h.finPlayed !== undefined).length, tops.filter((h) => h.finGot !== undefined).length)} |`);
      }
      L.push('', '## 2. 各幕の戦闘の数（本人が出た戦闘。クリアした冒険だけ）', '');
      L.push('- 1幕 = 中位になるまで / 2幕 = 中位から最上位・特殊になるまで / 3幕 = 最上位・特殊になってから。なれなかった人は、その幕が最後まで続く。', '');
      L.push('| 人数 | 始めの職 | 人数 | 1幕 | 2幕 | 3幕 | 全部 | 3幕まで行った |');
      L.push('|---|---|---|---|---|---|---|---|');
      for (const [p, rs] of Object.entries(all)) {
        const hs = rs.filter((r) => r.clear).flatMap((r) => r.heroes);
        for (const start of [...new Set(hs.map((h) => h.start))]) {
          const xs = hs.filter((h) => h.start === start);
          const a1 = xs.map((h) => (h.mid ? h.mid.own : h.ownFights));
          const a2 = xs.map((h) => (h.mid ? (h.top ? h.top.own : h.ownFights) - h.mid.own : 0));
          const a3 = xs.map((h) => (h.top ? h.ownFights - h.top.own : 0));
          L.push(`| ${p} | ${getClass(start).name} | ${xs.length} | ${f(avg(a1))} | ${f(avg(a2))} | ${f(avg(a3))} | ${f(avg(xs.map((h) => h.ownFights)))} | ${pct(xs.filter((h) => h.top).length, xs.length)} |`);
        }
      }
      L.push('', '## 3. 中位の職ごと（最上位・特殊に届いたか）', '');
      L.push('| 人数 | 中位の職 | なった人 | 最上位・特殊に届いた | 届いた何戦目（平均） | 届いた職 | 届かなかった人の次の段（条件の進み。多い順に3つ） |');
      L.push('|---|---|---|---|---|---|---|');
      for (const [p, rs] of Object.entries(all)) {
        const hs = rs.flatMap((r) => r.heroes).filter((h) => h.mid);
        for (const mid of [...new Set(hs.map((h) => h.mid!.job))]) {
          const xs = hs.filter((h) => h.mid!.job === mid);
          const ok = xs.filter((h) => h.top);
          const jobs = [...new Set(ok.map((h) => h.top!.job))].map((j) => `${getClass(j).name} ${ok.filter((h) => h.top!.job === j).length}`).join('・');
          const stuck = xs.filter((h) => !h.top && h.stuck).map((h) => h.stuck!);
          const freq = [...new Set(stuck)].map((s) => [s, stuck.filter((x) => x === s).length] as const).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => `${s}×${n}`).join(' / ');
          L.push(`| ${p} | ${getClass(mid).name} | ${xs.length} | ${pct(ok.length, xs.length)} | ${f(avg(ok.map((h) => h.top!.fight)))} | ${jobs || '-'} | ${freq || '-'} |`);
        }
      }
      L.push('', '## 3b. 最上位の「レベルと条件」がそろった時と、転職するまでの待ち（場所待ち）', '');
      L.push('- 最上位へは 町の聖堂・祠・神殿 でしか転職できない（特殊職は 神殿・その職の祭壇）。「特殊がそろった」は、特殊職のどれかのレベルと条件がそろった人。', '');
      L.push(`| 人数 | 中位の職 | 最上位がそろった人 | そろった何戦目（平均） | そろった場所（${PLACES.join('・')}） | そろってから転職までの戦闘（転職した人・平均） | そろったのに最後まで転職しなかった人 | 特殊がそろった人（そのうち特殊に転職） |`);
      L.push('|---|---|---|---|---|---|---|---|');
      for (const [p, rs] of Object.entries(all)) {
        const hs = rs.flatMap((r) => r.heroes).filter((h) => h.mid);
        for (const mid of [...new Set(hs.map((h) => h.mid!.job))]) {
          const xs = hs.filter((h) => h.mid!.job === mid && h.ready);
          L.push(`| ${p} | ${getClass(mid).name} | ${xs.length}/${hs.filter((h) => h.mid!.job === mid).length} | ${f(avg(xs.map((h) => h.ready!.fight)))} | ${placeCount(xs.map((h) => h.ready!.place))} | ${f(avg(xs.filter((h) => h.top).map((h) => h.top!.fight - h.ready!.fight)))} | ${xs.filter((h) => !h.top).length} | ${hs.filter((h) => h.mid!.job === mid && h.readySp).length}（${hs.filter((h) => h.mid!.job === mid && h.readySp && h.top?.tier === 'special').length}） |`);
        }
      }
      L.push('', '## 4. 決め技（最上位・特殊に転職した人）', '');
      L.push('| 人数 | 持った人 | 持って出た戦闘（1人あたり） | 手札に来た戦闘の割合 | 使った戦闘の割合 | 初めて引いた（持ってから何戦目・平均） | 初めて使った（同じ） | 一度も使わずに終わった人 |');
      L.push('|---|---|---|---|---|---|---|---|');
      for (const [p, rs] of Object.entries(all)) {
        const hs = rs.flatMap((r) => r.heroes).filter((h) => h.finGot !== undefined);
        const ff = hs.reduce((n, h) => n + h.finFights, 0);
        L.push(`| ${p} | ${hs.length} | ${f(avg(hs.map((h) => h.finFights)))} | ${pct(hs.reduce((n, h) => n + h.finDrawnFights, 0), ff)} | ${pct(hs.reduce((n, h) => n + h.finPlayedFights, 0), ff)} | ${f(avg(hs.filter((h) => h.finDrawn !== undefined).map((h) => h.finDrawn! - h.finGot!)))} | ${f(avg(hs.filter((h) => h.finPlayed !== undefined).map((h) => h.finPlayed! - h.finGot!)))} | ${hs.filter((h) => h.finPlayed === undefined).length} |`);
      }
      L.push('', '## 5. 鍵のダンジョンを終えた何戦目（クリアした冒険。平均）と、終わった場所', '');
      L.push('| 人数 | 鍵1 | 鍵2 | 鍵3 | 最後 | 終わった場所 |');
      L.push('|---|---|---|---|---|---|');
      for (const [p, rs] of Object.entries(all)) {
        const cl = rs.filter((r) => r.clear);
        const at = (i: number) => f(avg(cl.map((r) => r.clearedAt[i]).filter((x): x is number => x !== undefined)));
        L.push(`| ${p} | ${at(0)} | ${at(1)} | ${at(2)} | ${at(3)} | ${['クリア', ...PLACES].map((w) => `${w} ${rs.filter((r) => r.where === w).length}`).join('・')} |`);
      }
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, L.join('\n') + '\n');
      if (process.env.SIM_JSON) {
        mkdirSync(dirname(process.env.SIM_JSON), { recursive: true });
        writeFileSync(process.env.SIM_JSON, JSON.stringify(all, null, 1));
      }
    };
    for (const [p, classes] of Object.entries(PARTIES)) {
      if (process.env.SIM_PARTY && !process.env.SIM_PARTY.split(',').includes(p)) continue;
      const rs: Run[] = (all[p] = []);
      for (let s = 1; s <= SEEDS; s++) {
        rs.push(runOne(classes, 1000 + s));
        if (s % 5 === 0) write();
      }
      write();
    }
  }, 86_400_000);
});
