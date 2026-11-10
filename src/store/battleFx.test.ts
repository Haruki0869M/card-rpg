// 戦闘の手ごたえの演出（段階B）: 技名の帯・命中の見た目・盾・揺れを出す所が正しく決まるか（見た目だけ。状態・乱数に触れない）
import { describe, expect, it } from 'vitest';
import { CARDS, getCard } from '../data/cards';
import type { BattleEvent } from '../types';
import { cardImpact } from './hitStyle';
import { battleFrames } from './presentation';

const ally = new Set(['a0', 'a1']);
const roll = (cardId: string, perfect = false): BattleEvent => ({ type: 'roll', characterId: 'a0', cardId, targetId: 'e0', chance: 80, results: ['hit'], successes: 1, perfect, summary: '確認' });

describe('段階B: 命中の見た目', () => {
  it('武器種・種類・属性で決まる（斬る・打つ・撃つ・魔法）', () => {
    expect(cardImpact(getCard('strike')).style).toBe('slash');
    const fire = cardImpact(getCard('fireball'));
    expect(fire.style).toBe('magic');
    expect(fire.color).toBeTruthy();
    const byWeapon = (wt: string) => CARDS.all.find((c) => c.weaponType === wt && c.category === 'physical' && (c.target === 'enemy' || c.target === 'allEnemies'));
    for (const [wt, style] of [['hammer', 'impact'], ['fist', 'impact'], ['gun', 'shot'], ['bow', 'shot'], ['katana', 'slash'], ['spear', 'slash']] as const) {
      const c = byWeapon(wt);
      if (c && !c.tiers.some((t) => t.effects.some((e) => (e as { element?: string }).element))) expect(cardImpact(c).style, `${wt} ${c.id}`).toBe(style);
    }
  });

  it('味方のカードは技名の帯と命中、完全成功は戦場を揺らす。入力は変えない', () => {
    const events: BattleEvent[] = [roll('strike', true), { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 7, blocked: 0 }];
    const before = structuredClone(events);
    const f = battleFrames(events, ally);
    expect(f[0].callout).toEqual({ side: 'ally', actorId: 'a0', cardId: 'strike' });
    expect(f[1].impacts).toEqual([{ unitId: 'e0', style: 'slash' }]);
    expect(f[1].shake).toBe(true);
    expect(events).toEqual(before);
  });

  it('完全成功でない小さな攻撃は揺らさない。25以上の大ダメージは揺らして大きく出す', () => {
    const small = battleFrames([roll('strike'), { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 7, blocked: 0 }], ally);
    expect(small.some((x) => x.shake)).toBe(false);
    const big = battleFrames([roll('strike'), { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 30, blocked: 0 }], ally);
    expect(big[1].shake).toBe(true);
    expect(big[1].impacts?.[0].big).toBe(true);
  });

  it('敵の技は「敵の帯」、味方がブロックで防ぐと盾を出す（全部防いだら命中の爪あとは出さない）', () => {
    const f = battleFrames([{ type: 'enemyAct', enemyUid: 'e0', actionName: '噛みつき', targetIds: ['a0'] }, { type: 'damage', sourceId: 'e0', unitId: 'a0', amount: 0, blocked: 6 }], ally);
    expect(f[0].callout).toEqual({ side: 'enemy', actorId: 'e0', actionName: '噛みつき' });
    expect(f[1].guards).toEqual(['a0']);
    expect(f[1].impacts).toBeUndefined();
    const hurt = battleFrames([{ type: 'enemyAct', enemyUid: 'e0', actionName: '噛みつき', targetIds: ['a0'] }, { type: 'damage', sourceId: 'e0', unitId: 'a0', amount: 4, blocked: 2 }], ally);
    expect(hurt[1].guards).toEqual(['a0']);
    expect(hurt[1].impacts).toEqual([{ unitId: 'a0', style: 'enemy' }]);
  });

  it('ブロック・回復は青い障壁・緑の光の柱。コマの数と間は今までと同じ', () => {
    const f = battleFrames([roll('guard'), { type: 'block', unitId: 'a0', amount: 5 }, { type: 'heal', unitId: 'a1', amount: 3 }], ally);
    expect(f.map((x) => x.delay)).toEqual([0, expect.any(Number), expect.any(Number)]);
    expect(f[1].impacts).toEqual([{ unitId: 'a0', style: 'barrier' }]);
    expect(f[2].impacts).toEqual([{ unitId: 'a1', style: 'heal' }]);
  });
});
