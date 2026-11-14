// 異端カード その2（K1）: 代償付きでルールを壊す。報酬・ショップには出ず、イベントでだけ手に入る。
// 代償は重くてよい（オーナーの方針）。全部エピックで、特殊能力を持つ。
import type { CardDef, CardTarget, Effect, Rarity, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const me = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'self' });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const healAll = (amount: number): Effect => ({ kind: 'heal', amount, to: 'allies' });
const drain = (pct: number): Effect => ({ kind: 'healPctOfDealt', pct });
const pay = (amount: number): Effect => ({ kind: 'payHp', amount });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });

type Opt = { rarity?: Rarity; trait?: AbilityDef; tags?: string[]; exhaust?: boolean };
/** 異端のカードを1枚作る（heresy: true・エピックが付く） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], trait: AbilityDef, o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), heresy: true, rarity: 'epic', trait, ...o };
}

const t = (name: string, effect: AbilityDef['effect']): AbilityDef => ({ name, effect });
const payPct = (pct: number): Effect => ({ kind: 'payHp', pct });
/** 捨て身の覚醒: この戦闘の間、攻撃カードのダメージ×1.3・毎ターン開始時に1枚引く（区切りD） */
const AWAKEN: Effect = { kind: 'grantAbility', abilities: [
  { name: '捨て身の覚醒', effect: { modifier: 'damageDealt', multiplier: 1.3, if: [{ kind: 'cardHasDamage' }] } },
  { name: '捨て身の覚醒', effect: { when: 'turnStart', do: [{ kind: 'draw', amount: 1 }] } },
] };
/** 血染めの盾: この戦闘の間、攻撃をブロックで受け止めたら、攻撃者に8ダメージ（1ターン3回まで。区切りD） */
const THORNS: Effect = { kind: 'grantAbility', abilities: [
  { name: '血の棘', effect: { when: 'blocked', do: [{ kind: 'retaliate', amount: 8, perTurn: 3 }] } },
] };

export const HERESY_CARDS_2: CardDef[] = [
  c('heresyDevilDeal', '悪魔の取引', 'skill', 0, 90, 'self', [[pay(10), draw(3)], [pay(10), draw(3), mana(2)]], t('取引成立', { when: 'perfect', do: [focus(1)] })),
  c('heresyLifeAdvance', '命の前借り', 'skill', 0, 90, 'self', [[pay(6), mana(3)], [pay(6), mana(3), focus(1)]], t('利子', { when: 'turnStart', do: [mana(1)] }), { exhaust: true }),
  c('heresyCursedBlade', '呪われた刃', 'physical', 1, 70, 'enemy', [[d(8), me('curse', 1)], [d(14), me('curse', 1)], [d(20), me('curse', 2)]], t('呪詛の斬撃', { modifier: 'damageDealt', multiplier: 1.25 }), { tags: ['heavy'] }),
  c('heresyBerserkBlood', '狂戦士の血', 'physical', 2, 60, 'enemy', [[d(9), pay(4)], [d(16), pay(4)], [d(24), pay(4)]], t('血の昂り', { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'selfHpAtMost', pct: 50 }] }), { tags: ['heavy'] }),
  c('heresySoulEater', '魂の捕食', 'physical', 2, 60, 'enemy', [[d(6), drain(60), me('vulnerable', 2)], [d(11), drain(80), me('vulnerable', 2)], [d(16), drain(100), me('vulnerable', 2)]], t('魂の糧', { when: 'kill', do: [heal(5)] })),
  c('heresyDoomSpell', '破滅の呪文', 'magic', 3, 50, 'allEnemies', [[d(8), pay(5)], [d(14), pay(5)], [d(20), pay(5)], [d(28), pay(5)]], t('世界を貫く', { modifier: 'ignoreBlock' }), { tags: ['heavy'] }),
  c('heresyForbiddenRite', '禁断の儀式', 'skill', 1, 80, 'self', [[pay(8), ba(6)], [pay(8), ba(10)], [pay(8), ba(14)]], t('生贄の加護', { when: 'perfect', do: [healAll(3)] })),
  c('heresyTimeTheft', '時の盗み', 'skill', 0, 90, 'self', [[pay(6), draw(2), focus(1)], [pay(6), draw(2), focus(2)]], t('盗んだ時間', { when: 'perfect', do: [mana(1)] }), { exhaust: true }),
  c('heresyVortex', '呪詛の渦', 'magic', 2, 60, 'allEnemies', [[el('dark', 4), me('curse', 1)], [el('dark', 8), me('curse', 1)], [el('dark', 12), me('curse', 1)]], t('渦の底', { when: 'kill', do: [mana(1)] })),
  // 区切りD: 魂の売却と同じ中身だったので作り直し（Gemini の判定）。今のHPの半分を払って、この戦闘の間ずっと攻撃が強くなる
  c('heresyAwakening', '捨て身の覚醒', 'skill', 0, 90, 'self', [[payPct(50), AWAKEN], [payPct(50), AWAKEN, draw(1)]], t('捨て身', { modifier: 'exhaust' }), { exhaust: true }),
  // 区切りD: 暗黒の盾と同じ向きだったので作り直し（Gemini の判定）。ブロックが残っている間、殴ってきた敵に血の棘を返す
  c('heresyBloodShield', '血染めの盾', 'skill', 1, 85, 'self', [[pay(6), b(14), THORNS], [pay(6), b(20), THORNS]], t('血の棘', { when: 'blocked', do: [{ kind: 'retaliate', amount: 8, perTurn: 3 }] })),
  c('heresyEroding', '蝕む力', 'physical', 1, 70, 'enemy', [[d(6), me('weak', 1)], [d(11), me('weak', 1)], [d(16), me('weak', 2)]], t('蝕みの牙', { modifier: 'ignoreBlock' })),
  c('heresyDespair', '絶望の宣告', 'skill', 2, 70, 'allEnemies', [[all('vulnerable', 2), all('weak', 2), me('vulnerable', 2)], [all('vulnerable', 3), all('weak', 3), me('vulnerable', 2)], [all('vulnerable', 3), all('weak', 3), d(6), me('vulnerable', 3)]], t('終わりの予感', { when: 'perfect', do: [mana(2)] })),
  c('heresyGamble', '運命の賭け', 'skill', 1, 80, 'self', [[pay(7), draw(2)], [pay(7), draw(3)], [pay(7), draw(3), mana(2)]], t('賽は投げられた', { when: 'perfect', do: [focus(1)] })),
];
