// 装飾品（K2）。ルールを書き換える効果の見本。ここから先の量産は docs/archive/tasks/K2-equipment.md のとおりに足す
import type { ItemDef } from '../../../types';

export const accessories2: ItemDef[] = [
  { id: 'emberRing', name: '熾火の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', description: '素手や刃の攻撃に、静かな炎が灯る。', tags: ['fire'], stats: { str: 4 }, ability: { name: '炎の付与', effect: { modifier: 'convertElement', into: 'fire' } } },
  { id: 'lonerRing', name: '孤高の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', description: '敵が1体だけなら、力が研ぎ澄まされる。', tags: ['single'], stats: { dex: 4 }, ability: { name: '一騎打ち', effect: { modifier: 'damageDealt', multiplier: 1.3, if: [{ kind: 'foeCount', max: 1 }] } } },
  // 区切りA（2026-11-11）: お供の装飾品・属性で攻める装飾品（属性の環12個の代わり）
  { id: 'partnerBell', name: '相棒の鈴', slot: 'accessory', rarity: 'rare', icon: 'charm', description: 'お供が行動するたび、自分にブロック2。1ターンに2回まで。', tags: ['pet', 'block'], ability: { name: '相棒の鈴', effect: { when: 'petAct', if: [{ kind: 'perTurn', key: 'partnerBell', max: 2 }], do: [{ kind: 'block', amount: 2 }] } } },
  { id: 'elementPrism', name: '元素のプリズム', slot: 'accessory', rarity: 'epic', icon: 'amulet', description: '弱点を突いた時のダメージが、×1.5 から ×1.75 に上がる（ほかの力と合わせて ×2.0 まで）。', tags: ['fire', 'ice', 'thunder', 'poison', 'dark', 'holy'], ability: { name: '元素の光', description: '弱点属性のダメージ ×1.5 → ×1.75（弱点の倍率は合わせて ×2.0 まで）', effect: { modifier: 'weaknessDamage', multiplier: 1.75 / 1.5 } } },
  { id: 'farsightAmulet', name: '遠見の首飾り', slot: 'accessory', rarity: 'rare', icon: 'amulet', description: '世界マップで遠くまで見渡せる。', explore: { vision: 1 }, stats: { per: 4 } },
  { id: 'erosionRing', name: '侵食の指輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: '翠の森の奥で見つかる、呪われた指輪。HPが満タンの間だけ力を貸す。', scenario: 'corruptionKing', ability: { name: '満ちた力', effect: { modifier: 'damageDealt', multiplier: 1.2, if: [{ kind: 'selfHpAtLeast', pct: 100 }] } } },
];
