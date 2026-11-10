// ラインナップの見直し フェーズ1（計画書 1-D）:
// 条件が3つ重なってほとんど発動しなかった武器の能力を、条件を1つ減らして直した。
//   破城の斧・突破銃 … HPの条件を外した（コスト2以上の物理カードがブロックを無視）
//   背水の大斧       … コストの条件を外した（HPが半分以下の間、物理カードのダメージ1.25倍）
// あわせて、先読みの首飾りを「効果はそのまま」でレジェンドに上げた。
// ここでは「新しい条件で発動する事」と「条件を満たさない時は発動しない事」を確かめる。
import { describe, expect, it } from 'vitest';
import { applyCommand, createBattle, createGame, createRng, damageModifiers, describeAbility, toPartyMember } from '../index';
import { rollEquipment } from '../game/loot';
import { BALANCE } from '../../data/balance';
import { getCard } from '../../data/cards';
import { ITEMS, getItem } from '../../data/items';
import type { AbilityDef, CardDef } from '../../types';
import { giveHand, play, setup } from './helpers';

const ENEMY_HP = 999;

/** 武器の能力（必ず有る物として取り出す） */
const abilityOf = (itemId: string): AbilityDef => {
  const ab = getItem(itemId).ability;
  if (!ab) throw new Error(`${itemId} に能力がありません`);
  return ab;
};
/** 能力の絞り込みの条件の種類 */
const condKinds = (itemId: string) => {
  const e = abilityOf(itemId).effect;
  return ('if' in e ? e.if ?? [] : []).map((c) => c.kind);
};
/** その武器に付いているカード（1枚目） */
const ownCard = (itemId: string): CardDef => getCard(getItem(itemId).cards![0].cardId);
/** コストだけ変えたカード（条件の境目を確かめる用） */
const withCost = (cardId: string, cost: number): CardDef => ({ ...getCard(cardId), cost });

/**
 * 守護者（職業の能力「かばう」は与えるダメージに関わらない）に、武器の能力だけを付けた戦闘。
 * itemId が null なら能力なし（比べる用）。敵は倒れないようにHPを大きくする
 */
function battleWith(itemId: string | null) {
  const s = createBattle(setup(5, ['guardian', 'mage']));
  const a = s.allies[0];
  if (itemId) a.abilities = [structuredClone(abilityOf(itemId))];
  s.enemies.forEach((e) => (e.hp = e.maxHp = ENEMY_HP));
  return { s, a, e: s.enemies[0] };
}

/** カードを完全成功（全枠にフォーカス）で1枚使い、敵のHPの減り・残りのブロック・発動した能力を返す */
function hit(itemId: string | null, cardId: string, opts: { block?: number; hp?: (maxHp: number) => number } = {}) {
  const { s, a, e } = battleWith(itemId);
  if (opts.hp) a.hp = opts.hp(a.maxHp);
  e.block = opts.block ?? 0;
  const [c] = giveHand(s, 'a0', [cardId]);
  const { state, events } = applyCommand(s, play('a0', c.uid, 'e0', getCard(cardId).slots));
  return {
    lost: ENEMY_HP - state.enemies[0].hp,
    block: state.enemies[0].block,
    fired: (name: string) => events.some((ev) => ev.type === 'ability' && ev.name === name),
  };
}

const half = (maxHp: number) => Math.floor(maxHp / 2);
const justOverHalf = (maxHp: number) => Math.floor(maxHp / 2) + 1;

describe.each([
  ['breachingAxe', '破城の斧'],
  ['breachingGun', '突破銃'],
])('%s（%s）: コスト2以上の物理カードがブロックを無視（HPの条件は無し）', (itemId) => {
  const name = abilityOf(itemId).name;

  it('条件は「物理カード」と「コスト2以上」の2つだけ', () => {
    expect(condKinds(itemId)).toEqual(['cardCategory', 'cardCost']);
    const e = abilityOf(itemId).effect;
    expect('modifier' in e && e.modifier).toBe('ignoreBlock');
  });

  it('説明の文が新しい条件と合っている（HPの条件が残っていない）', () => {
    const item = getItem(itemId);
    expect(item.description).toBe('コスト2以上の物理カードがブロックを無視。');
    const text = describeAbility(abilityOf(itemId));
    expect(text).toContain('物理カード');
    expect(text).toContain('コスト2以上');
    expect(text).toContain('ブロックを無視');
    expect(text).not.toContain('HP');
  });

  it('武器に付いているカードは、その武器の能力の条件を満たす', () => {
    for (const c of getItem(itemId).cards ?? []) {
      const card = getCard(c.cardId);
      expect(card.category, card.id).toBe('physical');
      expect(card.cost, card.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('HPが満タンでも、コスト2以上の物理カードはブロックを無視する', () => {
    const { s, a, e } = battleWith(itemId);
    expect(a.hp).toBe(a.maxHp);
    expect(damageModifiers(s, a, ownCard(itemId), e).ignoreBlock).toBe(true);
    expect(damageModifiers(s, a, withCost('strike', 2), e).ignoreBlock).toBe(true);
    expect(damageModifiers(s, a, withCost('strike', 3), e).ignoreBlock).toBe(true);
    // HPが減っていても同じ（HPは条件に関係しない）
    a.hp = 1;
    expect(damageModifiers(s, a, ownCard(itemId), e).ignoreBlock).toBe(true);
  });

  it('戦闘: 敵のブロックは残ったまま、ダメージがそのままHPに入る', () => {
    const cardId = ownCard(itemId).id;
    const BLOCK = 5;
    const plain = hit(null, cardId); // 能力なし・ブロックなしの素のダメージ
    expect(plain.lost).toBeGreaterThan(0);
    // 能力なし: ブロックで減る
    const blocked = hit(null, cardId, { block: BLOCK });
    expect(blocked.lost).toBe(Math.max(0, plain.lost - BLOCK));
    expect(blocked.block).toBe(Math.max(0, BLOCK - plain.lost));
    expect(blocked.fired(name)).toBe(false);
    // 能力あり（HPは満タン）: ブロックを無視
    const pierced = hit(itemId, cardId, { block: BLOCK });
    expect(pierced.lost).toBe(plain.lost);
    expect(pierced.block).toBe(BLOCK);
    expect(pierced.fired(name)).toBe(true);
  });

  it('コスト1の物理カードでは発動しない（HPが低くても同じ）', () => {
    const { s, a, e } = battleWith(itemId);
    expect(getCard('strike').cost).toBe(1);
    expect(damageModifiers(s, a, getCard('strike'), e).ignoreBlock).toBe(false);
    a.hp = 1;
    expect(damageModifiers(s, a, getCard('strike'), e).ignoreBlock).toBe(false);
    // 戦闘: ブロックに止められる
    const r = hit(itemId, 'strike', { block: 20 });
    expect(r.lost).toBe(0);
    expect(r.block).toBeLessThan(20);
    expect(r.fired(name)).toBe(false);
  });

  it('コスト2以上でも、物理でないカードでは発動しない', () => {
    const { s, a, e } = battleWith(itemId);
    expect(getCard('magicArrow').category).toBe('magic');
    expect(damageModifiers(s, a, withCost('magicArrow', 2), e).ignoreBlock).toBe(false);
    expect(damageModifiers(s, a, withCost('magicArrow', 3), e).ignoreBlock).toBe(false);
    expect(damageModifiers(s, a, withCost('guard', 2), e).ignoreBlock).toBe(false);
  });

  it('装備すると、戦闘にこの能力を持ち込む', () => {
    const game = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const h = game.heroes[0];
    h.equipment.weapon = { uid: 'x1', itemId };
    const ab = (toPartyMember(h).abilities ?? []).find((x) => x.name === name);
    expect(ab?.source).toMatchObject({ kind: 'equipment', id: itemId });
  });
});

describe('laststandAxe（背水の大斧）: HPが半分以下の間、物理カードのダメージ1.25倍（コストの条件は無し）', () => {
  const itemId = 'laststandAxe';
  const name = abilityOf(itemId).name;

  it('条件は「物理カード」と「HPが半分以下」の2つだけ', () => {
    expect(condKinds(itemId)).toEqual(['cardCategory', 'selfHpAtMost']);
    const e = abilityOf(itemId).effect;
    expect('modifier' in e && e.modifier === 'damageDealt' && e.multiplier).toBe(1.25);
  });

  it('説明の文が新しい条件と合っている（コストの条件が残っていない）', () => {
    const item = getItem(itemId);
    expect(item.description).toContain('HPが半分以下');
    expect(item.description).toContain('物理カード');
    expect(item.description).toContain('1.25倍');
    expect(item.description).not.toContain('コスト');
    const text = describeAbility(abilityOf(itemId));
    expect(text).toContain('物理カード');
    expect(text).toContain('HPが半分以下');
    expect(text).toContain('1.25');
    expect(text).not.toContain('コスト');
  });

  it('武器に付いているカードは物理カード', () => {
    for (const c of getItem(itemId).cards ?? []) expect(getCard(c.cardId).category, c.cardId).toBe('physical');
  });

  it('HPが半分以下なら、コスト1の物理カードでも1.25倍になる', () => {
    const { s, a, e } = battleWith(itemId);
    a.hp = half(a.maxHp);
    expect(getCard('strike').cost).toBe(1);
    expect(damageModifiers(s, a, getCard('strike'), e).multiplier).toBeCloseTo(1.25, 5);
    expect(damageModifiers(s, a, withCost('strike', 0), e).multiplier).toBeCloseTo(1.25, 5);
    expect(damageModifiers(s, a, ownCard(itemId), e).multiplier).toBeCloseTo(1.25, 5);
    a.hp = 1;
    expect(damageModifiers(s, a, getCard('strike'), e).multiplier).toBeCloseTo(1.25, 5);
  });

  it('HPが半分より多い時は発動しない', () => {
    const { s, a, e } = battleWith(itemId);
    expect(damageModifiers(s, a, getCard('strike'), e).multiplier).toBe(1); // 満タン
    expect(damageModifiers(s, a, ownCard(itemId), e).multiplier).toBe(1);
    a.hp = justOverHalf(a.maxHp);
    expect(damageModifiers(s, a, getCard('strike'), e).multiplier).toBe(1);
    expect(damageModifiers(s, a, ownCard(itemId), e).multiplier).toBe(1);
  });

  it('HPが半分以下でも、物理でないカードでは発動しない', () => {
    const { s, a, e } = battleWith(itemId);
    a.hp = half(a.maxHp);
    expect(damageModifiers(s, a, getCard('magicArrow'), e).multiplier).toBe(1);
    expect(damageModifiers(s, a, withCost('magicArrow', 3), e).multiplier).toBe(1);
  });

  it('ブロック無視は付かない（ダメージの倍率だけ）', () => {
    const { s, a, e } = battleWith(itemId);
    a.hp = half(a.maxHp);
    expect(damageModifiers(s, a, ownCard(itemId), e).ignoreBlock).toBe(false);
  });

  it('戦闘: HPが半分以下の時だけ、コスト1のストライクのダメージが1.25倍になる', () => {
    const plain = hit(null, 'strike'); // 能力なしの素のダメージ
    expect(plain.lost).toBeGreaterThan(0);
    const full = hit(itemId, 'strike');
    expect(full.lost).toBe(plain.lost);
    expect(full.fired(name)).toBe(false);
    const over = hit(itemId, 'strike', { hp: justOverHalf });
    expect(over.lost).toBe(plain.lost);
    expect(over.fired(name)).toBe(false);
    const low = hit(itemId, 'strike', { hp: half });
    expect(low.lost).toBe(Math.floor(plain.lost * 1.25 + 1e-9));
    expect(low.lost).toBeGreaterThan(plain.lost);
    expect(low.fired(name)).toBe(true);
    // 能力が無ければ、HPが低くても変わらない
    expect(hit(null, 'strike', { hp: half }).lost).toBe(plain.lost);
  });

  it('戦闘: HPが半分以下でも、魔法カードのダメージは変わらない', () => {
    const plain = hit(null, 'magicArrow', { hp: half });
    const low = hit(itemId, 'magicArrow', { hp: half });
    expect(plain.lost).toBeGreaterThan(0);
    expect(low.lost).toBe(plain.lost);
    expect(low.fired(name)).toBe(false);
  });

  it('装備すると、戦闘にこの能力を持ち込む', () => {
    const game = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const h = game.heroes[0];
    h.equipment.weapon = { uid: 'x1', itemId };
    const ab = (toPartyMember(h).abilities ?? []).find((x) => x.name === name);
    expect(ab?.source).toMatchObject({ kind: 'equipment', id: itemId });
  });
});

describe('foresightAmulet（先読みの首飾り）: 効果はそのままでレジェンド', () => {
  const item = getItem('foresightAmulet');

  it('レア度はレジェンド。効果（毎ターン1枚多く引く）は変わらない', () => {
    expect(item.rarity).toBe('legend');
    expect(item.slot).toBe('accessory');
    expect(item.extraDraw).toBe(1);
    expect(item.description).toBe('毎ターン、カードを1枚多く引く。');
    expect(item.ability).toBeDefined();
  });

  it('値段はレジェンドの値段になる', () => {
    expect(BALANCE.itemPrice[item.rarity]).toBe(BALANCE.itemPrice.legend);
    expect(BALANCE.itemPrice[item.rarity]).toBeGreaterThan(BALANCE.itemPrice.epic);
  });

  it('レジェンドの装飾品の抽選に出て、エピックの抽選には出ない', () => {
    const game = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const rng = createRng(9);
    const seen = (rarity: 'epic' | 'legend') => new Set(Array.from({ length: 800 }, () => rollEquipment(rarity, game.heroes, rng, { scenario: 'corruptionKing', slot: 'accessory' }).id));
    expect(seen('legend').has('foresightAmulet')).toBe(true);
    expect(seen('epic').has('foresightAmulet')).toBe(false);
    // 抽選の候補そのものも確かめる
    const pool = (rarity: string) => ITEMS.all.filter((i) => i.slot === 'accessory' && i.rarity === rarity).map((i) => i.id);
    expect(pool('legend')).toContain('foresightAmulet');
    expect(pool('epic')).not.toContain('foresightAmulet');
  });
});
