// 弱点の案内（計画書 第2版 §5-1）の文を作る関数の確認
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { createBattle } from '../../engine';
import { predictCardTotals } from '../../engine/battle/battle';
import type { BattleState, CardDef, PlayerId } from '../../types';
import { elementGuide } from './elementGuide';

const P: PlayerId = 'P1';
// 確認用のカード（2枠。完全成功 = 2成功）
const card = (id: string, element: string | undefined, category: CardDef['category'] = 'magic'): CardDef => ({
  id, name: id, category, cost: 0, slots: 2, baseChance: 80, target: 'enemy',
  tiers: [{ minSuccesses: 0, effects: [] }, { minSuccesses: 1, effects: [{ kind: 'damage', amount: 5, ...(element ? { element } : {}) }] }, { minSuccesses: 2, effects: [{ kind: 'damage', amount: 8, ...(element ? { element } : {}) }] }],
});
for (const [id, el] of [['egFire', 'fire'], ['egIce', 'ice'], ['egDark', 'dark'], ['egThunder', 'thunder'], ['egHoly', 'holy']] as const) CARDS.register(card(id, el));
CARDS.register(card('egPlain', undefined, 'physical'));
// 確認用の敵（火・氷・聖が弱点、闇が耐性）
ENEMIES.register({ id: 'egFoe', icon: 'T', name: '確認用の敵', weak: ['fire', 'ice', 'holy'], resist: ['dark'], maxHp: 1000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });

function battle(n = 1): BattleState {
  const s = createBattle({
    seed: 3,
    party: [{ classId: 'warrior', gender: 'male' as const, name: '仲間', playerId: P }],
    encounter: { id: 'eg', name: '確認', enemies: Array.from({ length: n }, () => ({ defId: 'egFoe' })) },
  });
  for (const e of s.enemies) { e.hp = e.maxHp = 1000; e.block = 0; }
  const a = s.allies[0];
  a.mana = 30; a.focus = 9; a.hand = [];
  delete a.weaponElement; delete a.imbuedElement;
  return s;
}
const guideOf = (s: BattleState, cardId: string, perfect?: string[], i = 0) => elementGuide(s, s.allies[0], CARDS.get(cardId), s.enemies[i], perfect);

describe('弱点の案内（§5-1）', () => {
  it('弱点: 札は「弱点×1.5」、下の1行は「弱点×1.5！（完全成功で火傷確定）」', () => {
    expect(guideOf(battle(), 'egFire', ['burn'])).toEqual({ kind: 'weak', element: 'fire', chip: '弱点×1.5', line: '弱点×1.5！（完全成功で火傷確定）' });
  });
  it('凍結のように敵の行動を止める状態異常は、状態異常のデータの一言を付ける', () => {
    expect(guideOf(battle(), 'egIce', ['freeze'])?.line).toBe('弱点×1.5！（完全成功で凍結＝敵の行動阻止！）');
  });
  it('耐性: 札は灰色の「▼耐性」、下の1行は出さない', () => {
    expect(guideOf(battle(), 'egDark', ['curse'])).toEqual({ kind: 'resist', element: 'dark', chip: '▼耐性' });
  });
  it('弱点でも耐性でもない属性・属性の無い攻撃は、何も出さない', () => {
    expect(guideOf(battle(), 'egThunder', ['paralysis'])).toBeUndefined();
    expect(guideOf(battle(), 'egPlain')).toBeUndefined();
  });
  it('状態異常が付かない相手（完全成功の予測で付かない）・状態異常の無い属性には「確定」を出さない', () => {
    expect(guideOf(battle(), 'egFire', [])?.line).toBe('弱点×1.5！');
    expect(guideOf(battle(), 'egFire')?.line).toBe('弱点×1.5！');
    expect(guideOf(battle(), 'egHoly', [])?.line).toBe('弱点×1.5！');
  });
  it('完全成功の予測とつなげる: ふつうは火傷が付く。ブロックで全部防がれる・倒してしまう時は付かない', () => {
    const at = (s: BattleState) => {
      const inst = { uid: 'eg1', cardId: 'egFire' };
      s.allies[0].hand = [inst];
      return predictCardTotals(s, s.allies[0].id, inst.uid, s.enemies[0].uid, 0, 2).find((t) => t.id === s.enemies[0].uid)?.statuses;
    };
    const s = battle();
    expect(guideOf(s, 'egFire', at(s))?.line).toBe('弱点×1.5！（完全成功で火傷確定）');
    const blocked = battle();
    blocked.enemies[0].block = 999;
    expect(guideOf(blocked, 'egFire', at(blocked))?.line).toBe('弱点×1.5！');
    const low = battle();
    low.enemies[0].hp = 1;
    expect(guideOf(low, 'egFire', at(low))?.line).toBe('弱点×1.5！');
  });
  it('実際に当たる属性で出す: 武器に宿った属性・宿した属性の物理攻撃は、その属性の弱点になる', () => {
    const s = battle();
    s.allies[0].weaponElement = 'fire';
    expect(guideOf(s, 'egPlain', ['burn'])?.line).toBe('弱点×1.5！（完全成功で火傷確定）');
    const t = battle();
    t.allies[0].imbuedElement = 'dark';
    expect(guideOf(t, 'egPlain')?.kind).toBe('resist');
  });
  it('弱点を突いた扱い（弱点看破の印）: 属性が無くても「弱点×1.5」。耐性の属性なら耐性のまま', () => {
    const s = battle();
    s.enemies[0].exposed = true;
    expect(guideOf(s, 'egPlain')).toEqual({ kind: 'weak', element: undefined, chip: '弱点×1.5', line: '弱点×1.5！' });
    expect(guideOf(s, 'egDark')?.kind).toBe('resist');
  });
  it('ほかの敵にかばわれている敵には、案内を出さない（攻撃はかばう敵が受ける）', () => {
    const s = battle(2);
    s.enemies[0].guarding = true;
    expect(guideOf(s, 'egFire', ['burn'], 1)).toBeUndefined();
    expect(guideOf(s, 'egFire', ['burn'], 0)?.kind).toBe('weak');
  });
});
