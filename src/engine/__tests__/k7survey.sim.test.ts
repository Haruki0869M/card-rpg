// ===== K7 強さの偏りの調査（一時的な集計。数値は変えない）=====
// K7SIM=jobs|pets で動かす（普段のテストでは動かさない）。結果は screenshots/k7-*.md / *.json に書き出す。
// bot の癖: 転職しない・お供を迎えない・報酬は先頭のカード・手札は先頭から使う・祠は先頭の選択肢。
// そのため、ジョブは最初からそのジョブで入れ（段ごとに比べる）、お供は最初から全員に付けて比べる。
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../data/classes';
import { getItem } from '../../data/items';
import { PETS } from '../../data/pets';
import type { GameState, PlayerId } from '../../types';
import { createGame } from '../index';
import { heroMaxHp, jobWeapons } from '../game/hero';
import { signatureCards } from '../game/jobs';
import { playToEnd } from '../bot';

const SEEDS = Number(process.env.K7_SEEDS ?? 40);
const DIFF = process.env.K7_DIFF ?? 'normal';
const MODE = process.env.K7SIM;
// 調べるジョブと組む仲間（K7_MATES。既定は剣士1人 = 2人パーティ。4人だとふつうでほぼ全部クリアして差が出ない）
const TRIO = (process.env.K7_MATES ?? 'warrior').split(',');
const BASE4 = (process.env.K7_PETPARTY ?? 'warrior,mage').split(',');

interface Run {
  cleared: boolean;
  why: string;
  corruption: number;
  livesUsed: number;
  avgLv: number;
  days: number;
  battles: number;
  /** 調べるキャラ（先頭）のレベル・退場 */
  xLv: number;
  xRetired: boolean;
  /** 先頭のキャラの山札で、最初の山札に無いカード / 装備 */
  xCards: string[];
  equips: { slot: string; itemId: string; classId: string }[];
  steps: number;
}

/** 基本職からそのジョブまでの道（例: 冥王 → [呪術師の元の基本職, 呪術師, 冥王]） */
function pathTo(id: string): string[] {
  const out = [id];
  for (let c = CLASSES.get(id); c.from?.length; c = CLASSES.get(c.from[0])) out.unshift(c.from[0]);
  return out;
}

/**
 * K7_REAL=1: 転職した直後に近い形にする（上の段のジョブは最初の山札が空のため）。
 * 先頭のキャラを基本職で作り、道の順に「Lv1に戻る・前のジョブの能力を持ち越す・使えない武器を外して最初の武器・転職のカード・専用カードの1枚目」を行う。
 */
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

function play(classes: string[], seed: number, setup?: (g: GameState) => void): Run {
  const real = process.env.K7_REAL && (CLASSES.get(classes[0]).tier ?? 'base') !== 'base';
  if (real) {
    const target = classes[0];
    classes = [pathTo(target)[0], ...classes.slice(1)];
    const prev = setup;
    setup = (g) => {
      promote(g, target);
      prev?.(g);
    };
  }
  const g0 = createGame({ seed, scenarioId: 'corruptionKing', difficulty: DIFF, party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });
  setup?.(g0);
  const startDeck = new Set(g0.heroes[0].deck.map((c) => c.cardId));
  const lives0 = g0.lives;
  const { game, log } = playToEnd(g0);
  expect(log.errors).toEqual([]);
  const x = game.heroes[0];
  return {
    cleared: game.mode === 'ending',
    why: game.mode === 'ending' ? 'clear' : (game.world?.corruption ?? 0) >= 100 ? '侵食' : game.mode === 'gameover' ? '全滅' : `途中${game.mode}`,
    corruption: game.world?.corruption ?? 0,
    livesUsed: lives0 - game.lives,
    avgLv: game.heroes.reduce((n, h) => n + h.level, 0) / game.heroes.length,
    days: (game.world?.worldTurn ?? 1) / 8,
    battles: game.stats.battlesWon,
    xLv: x.level,
    xRetired: !!x.retired,
    xCards: [...new Set(x.deck.filter((c) => !c.fromWeapon && !startDeck.has(c.cardId)).map((c) => c.cardId))],
    equips: game.heroes.flatMap((h) => Object.entries(h.equipment).filter(([, v]) => !!v).map(([slot, v]) => ({ slot, itemId: v!.itemId, classId: h.classId }))),
    steps: log.steps,
  };
}

const avg = (rs: Run[], f: (r: Run) => number) => rs.reduce((n, r) => n + f(r), 0) / rs.length;
const pct = (rs: Run[], f: (r: Run) => boolean) => Math.round((rs.filter(f).length / rs.length) * 100);
const why = (rs: Run[]) => {
  const m: Record<string, number> = {};
  for (const r of rs) if (!r.cleared) m[r.why] = (m[r.why] ?? 0) + 1;
  return Object.entries(m).map(([k, v]) => `${k}${v}`).join('・') || '-';
};
const row = (name: string, rs: Run[], extra = '') =>
  `| ${name} | **${pct(rs, (r) => r.cleared)}%** | ${avg(rs, (r) => r.corruption).toFixed(0)}% | ${avg(rs, (r) => r.livesUsed).toFixed(1)} | ${avg(rs, (r) => r.avgLv).toFixed(1)} | ${avg(rs, (r) => r.xLv).toFixed(1)} | ${pct(rs, (r) => r.xRetired)}% | ${avg(rs, (r) => r.days).toFixed(1)} | ${avg(rs, (r) => r.battles).toFixed(1)} | ${why(rs)} |${extra}`;
const HEAD = ['| 調べたもの | クリア率 | 最後の侵食度 | 使った命の灯火 | 平均Lv | 先頭のLv | 先頭の退場 | 日数 | 勝った戦闘 | 負け方 |', '|---|---|---|---|---|---|---|---|---|---|'];

describe.skipIf(!MODE)(`K7 強さの偏りの調査（${MODE}・${DIFF}・${SEEDS}シード）`, () => {
  it('集計', () => {
    mkdirSync('screenshots', { recursive: true });
    const all: Record<string, Run[]> = {};
    const t0 = Date.now();
    if (MODE === 'jobs') {
      const only = process.env.K7_TIER;
      for (const c of CLASSES.all) {
        const tier = c.tier ?? 'base';
        if (only && only !== tier) continue;
        const rs: Run[] = [];
        for (let s = 1; s <= SEEDS; s++) rs.push(play([c.id, ...TRIO], 5000 + s));
        all[`${tier}:${c.id}`] = rs;
      }
      const lines = [...HEAD];
      for (const [k, rs] of Object.entries(all).sort((a, b) => a[0].localeCompare(b[0]))) {
        const [tier, id] = k.split(':');
        lines.push(row(`${tier} ${CLASSES.get(id).name}`, rs));
      }
      writeFileSync(`screenshots/k7-jobs${process.env.K7_REAL ? '-real' : ''}${only ? '-' + only : ''}.md`, lines.join('\n') + `\n\n${((Date.now() - t0) / 1000).toFixed(0)}秒\n`);
    } else if (MODE === 'pets') {
      for (const p of [undefined, ...PETS.all]) {
        const rs: Run[] = [];
        for (let s = 1; s <= SEEDS; s++)
          rs.push(play(BASE4, 5000 + s, p ? (g) => g.heroes.forEach((h, i) => (h.pet = { petId: p.id, color: p.colors[0].id, name: `p${i}`, love: 0, acts: 0 })) : undefined));
        all[p?.id ?? 'none'] = rs;
      }
      const lines = [...HEAD];
      for (const [k, rs] of Object.entries(all)) lines.push(row(k === 'none' ? 'お供なし' : PETS.get(k).name, rs));
      writeFileSync('screenshots/k7-pets.md', lines.join('\n') + `\n\n${((Date.now() - t0) / 1000).toFixed(0)}秒\n`);
    }
    // カード・装備の偏り（全部の冒険から）: 拾われた回数と、それを持った冒険のクリア率
    const runs = Object.values(all).flat();
    const tally = (keyOf: (r: Run) => string[]) => {
      const m = new Map<string, { n: number; clear: number }>();
      for (const r of runs) for (const k of new Set(keyOf(r))) {
        const e = m.get(k) ?? { n: 0, clear: 0 };
        e.n++;
        if (r.cleared) e.clear++;
        m.set(k, e);
      }
      return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
    };
    const base = pct(runs, (r) => r.cleared);
    const cards = tally((r) => r.xCards);
    const items = tally((r) => r.equips.map((e) => `${e.slot}:${e.itemId}`));
    writeFileSync(
      `screenshots/k7-${MODE}-loot.json`,
      JSON.stringify({ runs: runs.length, clearPct: base, cards: cards.map(([k, v]) => [k, v.n, v.clear]), items: items.map(([k, v]) => [k, getItem(k.split(':')[1]).rarity, v.n, v.clear]) }),
    );
  }, 86_400_000);
});
