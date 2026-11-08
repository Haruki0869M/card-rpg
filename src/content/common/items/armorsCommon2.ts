// T3：序盤向けのコモン鎧。最大HPを控え、小さな得意分野で選び分ける。
import type { ItemDef } from '../../../types';

export const armorsCommon2: ItemDef[] = [
  { id: 'commonGuardVest', name: '補強した胴着', slot: 'armor', rarity: 'common', icon: 'armor', description: '最大HP+4。戦闘開始時にブロック1。', maxHp: 4, startBlock: 1, tags: ['block'] },
  { id: 'commonSwiftClothes', name: '軽足の旅装', slot: 'armor', rarity: 'common', icon: 'robe', description: '最大HP+3、素早さ+3。身軽な動きに向く。', maxHp: 3, stats: { agi: 3 }, tags: ['physical', 'multi'] },
  { id: 'commonAdeptRobe', name: '学び手の法衣', slot: 'armor', rarity: 'common', icon: 'robe', description: '最大HP+3、知力+3。魔法の練習に向く。', maxHp: 3, stats: { int: 3 }, tags: ['magic'] },
  { id: 'commonCampCloak', name: '野営の外套', slot: 'armor', rarity: 'common', icon: 'robe', description: '最大HP+3。野営での回復量+5%。', maxHp: 3, explore: { campHeal: 0.05 }, tags: ['heal', 'support'] },
  { id: 'commonCompanionVest', name: '相棒の胴着', slot: 'armor', rarity: 'common', icon: 'armor', description: '最大HP+3。お供がいる戦闘開始時にブロック1。', maxHp: 3, tags: ['pet', 'block'], ability: { name: '相棒の備え', effect: { when: 'battleStart', if: [{ kind: 'hasPet' }], do: [{ kind: 'block', amount: 1, to: 'self' }] } } },
];
