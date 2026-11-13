// ボスの段階（2026-11-14・docs/tasks/boss-phase-plan.md）2回目: 主のボス28体のデータを確かめる。
// - 全部の段階に、開幕の一手（その段階の行動）と、新しい決まりの説明（rule）がある = 数を上げるだけの段階が無い
// - 溜め・数え読みの行き先は同じ段階の行動。scripted の行動は、開幕の一手・溜め・数え読みのどれかから出る
// - 同じシナリオの鍵のボス3体は、ちがう種類の決まり（コピペにしない）
// - 28体それぞれで、境目を越えて何ターンか戦っても落ちない・開幕の一手は段階ごとに1回・保存（JSON）をはさんでも同じ
// - 古い保存（段階の途中・phaseOpened が無い・順番の位置がはみ出す・予告が前からある行動）でも落ちない
import { describe, expect, it } from 'vitest';
import { getEnemy } from '../../data/enemies';
import type { BattleState, EnemyActionDef, EnemyDef, EnemyPhaseDef } from '../../types';
import { createBattle } from '../index';
import { behaviorFromEffects } from '../../data/enemyBehaviors';
import { makeImmortal, nextTurn, party } from './helpers';

/** シナリオ → [鍵1, 鍵2, 鍵3, 最後] */
const BOSSES: Record<string, string[]> = {
  corruptionKing: ['treantKing', 'mordea', 'ignavarl', 'valgrim'],
  frozenKingdom: ['crystalLord', 'frozenBishop', 'frostGiant', 'whiteQueen'],
  sandDynasty: ['sandScorpionKing', 'shadowVizier', 'stoneGuardianBeast', 'sandPharaoh'],
  cursedArchipelago: ['seaSerpentQueen', 'pirateCaptainGuld', 'tideHighPriest', 'ghostAdmiral'],
  starCastle: ['windKeeper', 'starLibrarian', 'moonMaiden', 'starSeerQueen'],
  clockworkEmpire: ['foremanGolem', 'runawayBoiler', 'clockworkSage', 'greatMachine'],
  dreamLabyrinth: ['echoWhiteQueen', 'echoSandPharaoh', 'echoGhostAdmiral', 'dreamEater'],
};
const ALL = Object.values(BOSSES).flat();

/** 段階の決まりの種類（開幕の一手と段階のデータから見る） */
function ruleKind(def: EnemyDef, ph: EnemyPhaseDef): string {
  const op = ph.actions.find((a) => a.id === ph.openingActionId)!;
  if (ph.weak || ph.actions.some((a) => a.weakWhile)) return 'weakSwap';
  if (ph.addWeak) return 'weakAdd';
  if (op.countdown) return 'countdown';
  if (op.chargeTo) return op.behavior ? `charge+${op.behavior}` : 'charge';
  if (op.effects.some((e) => e.kind === 'healToPct')) return 'rewind';
  if (op.behavior) return op.behavior;
  if (op.effects.some((e) => e.kind === 'applyStatus' && e.status === 'regen')) return 'regen';
  if (op.effects.some((e) => e.kind === 'drainFocus')) return 'focus';
  return `?${def.id}`;
}

describe('28体のデータ', () => {
  it('7本×4体 = 28体。全部の段階に、開幕の一手と新しい決まりの説明がある', () => {
    expect(ALL).toHaveLength(28);
    for (const id of ALL) {
      const def = getEnemy(id);
      expect(def.phases?.length, id).toBeGreaterThan(0);
      for (const ph of def.phases!) {
        expect(ph.openingActionId, `${id} ${ph.name}`).toBeTruthy();
        expect(ph.actions.some((a) => a.id === ph.openingActionId), `${id} ${ph.name}`).toBe(true);
        expect(ph.rule?.length, `${id} ${ph.name}`).toBeGreaterThan(8);
        expect(ruleKind(def, ph).startsWith('?'), `${id} ${ph.name} ${ruleKind(def, ph)}`).toBe(false);
        // 決め方で選ぶ行動が1つ以上ある
        expect(ph.actions.filter((a) => !a.scripted).length, `${id} ${ph.name}`).toBeGreaterThan(0);
      }
    }
  });

  it('溜め・数え読みの行き先は同じ段階の行動。scripted の行動は、開幕の一手・溜め・数え読みのどれかから出る', () => {
    for (const id of ALL) {
      const def = getEnemy(id);
      for (const ph of def.phases!) {
        const ids = new Set(ph.actions.map((a) => a.id));
        const reached = new Set<string>([ph.openingActionId!]);
        for (const a of ph.actions) {
          if (a.chargeTo) { expect(ids.has(a.chargeTo), `${id}.${a.id} → ${a.chargeTo}`).toBe(true); reached.add(a.chargeTo); }
          if (a.countdown) { expect(ids.has(a.countdown.actionId), `${id}.${a.id} → ${a.countdown.actionId}`).toBe(true); reached.add(a.countdown.actionId); }
        }
        for (const a of ph.actions.filter((x) => x.scripted)) expect(reached.has(a.id), `${id}.${a.id} はどこからも出ない`).toBe(true);
      }
    }
  });

  it('新しく足した行動のIDは、その敵の中で重ならない（前からある重なりは、そのまま）', () => {
    for (const id of ALL) {
      const def = getEnemy(id);
      const all: EnemyActionDef[] = [...def.actions, ...def.phases!.flatMap((p) => p.actions)];
      for (const ph of def.phases!) {
        const fresh = [ph.openingActionId!, ...ph.actions.flatMap((a) => [a.chargeTo, a.countdown?.actionId]).filter((x): x is string => !!x)];
        for (const x of fresh) expect(all.filter((a) => a.id === x).length, `${id}.${x}`).toBe(1);
      }
    }
  });

  it('紫の札（特殊な行動）の印は、効果の種類と合う。仲間を呼ぶ行動は、呼べない時の代わり（ダメージのある行動）を持つ', () => {
    for (const id of ALL) {
      const def = getEnemy(id);
      for (const a of def.phases!.flatMap((p) => p.actions)) {
        expect(a.behavior, `${id}.${a.id}`).toBe(behaviorFromEffects(a));
        const call = a.effects.find((e) => e.kind === 'summonEnemy');
        if (call && call.kind === 'summonEnemy') {
          expect(call.orElse, `${id}.${a.id}`).toBeTruthy();
          const alt = [...def.actions, ...def.phases!.flatMap((p) => p.actions)].find((x) => x.id === call.orElse)!;
          expect(alt.effects.some((e) => e.kind === 'damage'), `${id}.${a.id} → ${call.orElse}`).toBe(true);
          // 呼ばれる取り巻きは、自分では仲間を呼ばない
          const minion = getEnemy(call.enemy);
          expect([...minion.actions, ...(minion.phases ?? []).flatMap((p) => p.actions)].some((x) => x.effects.some((e) => e.kind === 'summonEnemy')), call.enemy).toBe(false);
        }
      }
    }
  });

  it('同じシナリオの鍵のボス3体は、ちがう種類の決まり（コピペにしない）', () => {
    const kinds: Record<string, string[]> = {};
    for (const [sc, ids] of Object.entries(BOSSES)) {
      kinds[sc] = ids.slice(0, 3).map((id) => ruleKind(getEnemy(id), getEnemy(id).phases![0]));
      expect(new Set(kinds[sc]).size, `${sc}: ${kinds[sc].join(',')}`).toBe(3);
    }
  });

  it('弱点が入れ替わる・変わるボスは、数体だけ（オーナーの返事 3-A: 増えるが中心）', () => {
    const swap = ALL.filter((id) => getEnemy(id).phases!.some((p) => ruleKind(getEnemy(id), p) === 'weakSwap'));
    expect(swap.length).toBeLessThanOrEqual(4);
  });
});

function fight(id: string, seed: number): BattleState {
  const s = createBattle({ seed, party: party('warrior', 'priest'), encounter: { id: 'b', name: 'b', boss: true, enemies: [{ defId: id, level: getEnemy(id).baseLevel }] } });
  makeImmortal(s);
  return s;
}
/** ボスのHPを境目にして、敵の番の終わりの毒で越えさせる（その番の自分の回復より多い毒） */
function cut(s: BattleState, pct: number) {
  const e = s.enemies[0];
  e.hp = Math.max(2, Math.floor((e.maxHp * pct) / 100));
  e.statuses.poison = 16;
}

describe('28体の戦闘（落ちない・開幕の一手は段階ごとに1回・保存をはさんでも同じ）', () => {
  it.each(ALL)('%s', (id) => {
    const def = getEnemy(id);
    const run = (copy: boolean) => {
      let s = fight(id, 7);
      const openings: string[] = [];
      for (const ph of def.phases!) {
        cut(s, ph.belowHpPct);
        for (let t = 0; t < 4; t++) {
          if (copy && t === 1) s = JSON.parse(JSON.stringify(s));
          s = nextTurn(s);
          const b = s.enemies[0];
          if (b.intent?.opening) openings.push(`${b.intent.opening}:${b.intent.actionId}`);
        }
      }
      return { s, openings };
    };
    const a = run(false);
    const b = run(true);
    expect(a.s.enemies[0].phase).toBe(def.phases!.length);
    // 開幕の一手は段階ごとに1回（呼べない時は代わりの行動になるので、IDではなく回数で見る）
    expect(a.openings.map((x) => x.split(':')[0])).toEqual(def.phases!.map((_, i) => String(i + 1)));
    expect(a.openings[0].split(':')[1]).toBe(def.phases![0].openingActionId);
    // キーの並び（JSON で消えた undefined のキー）だけの違いは見ない
    expect(JSON.parse(JSON.stringify(b.s.enemies))).toEqual(JSON.parse(JSON.stringify(a.s.enemies)));
    expect(b.s.log.map((l) => l.text)).toEqual(a.s.log.map((l) => l.text));
  });

  it.each(ALL)('%s: 古い保存（段階の途中・phaseOpened 無し・順番の位置がはみ出す）でも落ちない', (id) => {
    const def = getEnemy(id);
    def.phases!.forEach((ph, i) => {
      let s = fight(id, 3);
      const e = s.enemies[0];
      e.phase = i + 1;
      e.hp = Math.floor((e.maxHp * ph.belowHpPct) / 100) - 1;
      e.seqIndex = 17;
      e.history = ['x'];
      // 前からある行動（今回足していない行動）を予告している途中
      const old = ph.actions.find((a) => !a.scripted && a.id !== ph.openingActionId)!;
      e.intent = { actionId: old.id, ...(old.effects.some((x) => 'to' in x && x.to === 'foes') ? {} : { targetId: s.allies[0].id }) };
      delete e.phaseOpened;
      s = JSON.parse(JSON.stringify(s));
      for (let t = 0; t < 5; t++) s = nextTurn(s);
      expect(s.enemies[0].phaseOpened, `${id} ${i + 1}`).toBe(i + 1);
    });
  });
});
