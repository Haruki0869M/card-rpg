// 異端カード（K1）: 代償付きでルールを壊す。報酬・ショップには出ず、イベント（仮面商人など）でだけ手に入る。
import type { CardDef, CardTarget, Effect, Rarity, AbilityDef, CardCategory } from '../../../types';

const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const me = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'self' });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const pay = (amount: number): Effect => ({ kind: 'payHp', amount });

type Opt = { rarity?: Rarity; trait?: AbilityDef; tags?: string[]; exhaust?: boolean };
/** 異端のカードを1枚作る（heresy: true が付く） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), heresy: true, ...o };
}

export const HERESY_CARDS: CardDef[] = [
  c('heresyBloodPact', '血の契約', 'skill', 0, 90, 'self', [[pay(8), mana(2), draw(1)], [pay(8), mana(2), draw(2)]], { rarity: 'epic', trait: { name: '血の代償', effect: { modifier: 'damageDealt', multiplier: 1.3, if: [{ kind: 'selfHpAtMost', pct: 50 }] } } }),
  c('heresyFrenzy', '禁断の連打', 'physical', 1, 60, 'enemy', [[dh(2, 4), me('vulnerable', 2)], [dh(3, 5), me('vulnerable', 2)], [dh(4, 6), me('vulnerable', 3)]], { rarity: 'epic', tags: ['combo'], trait: { name: '狂気', effect: { modifier: 'damageDealt', multiplier: 1.25 } } }),
  c('heresySoulSale', '魂の売却', 'skill', 0, 90, 'self', [[pay(12), focus(3)], [pay(12), focus(3), mana(2)]], { rarity: 'epic', exhaust: true, trait: { name: '魂の値段', effect: { when: 'turnStart', do: [mana(1)] } } }),
];
