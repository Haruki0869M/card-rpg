// 装飾品（K2）。ルールを書き換える効果の見本。ここから先の量産は docs/archive/tasks/K2-equipment.md のとおりに足す
import type { ItemDef } from '../../../types';

export const accessories2: ItemDef[] = [
  { id: 'viperBangle', name: '毒蛇の腕輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: '敵の毒を鱗に変えて身を守る。', tags: ['poison'], ability: { name: '毒鱗', effect: { when: 'turnStart', do: [{ kind: 'blockFromStatus', status: 'poison', of: 'foes', mult: 1, max: 12 }] } } },
  { id: 'emberRing', name: '熾火の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', description: '素手や刃の攻撃に、静かな炎が灯る。', tags: ['fire'], stats: { str: 4 }, ability: { name: '炎の付与', effect: { modifier: 'convertElement', into: 'fire' } } },
  { id: 'flameWardCharm', name: '耐炎の護符', slot: 'accessory', rarity: 'rare', icon: 'amulet', description: '炎のダメージを半分に和らげる。', tags: ['fire'], maxHp: 6, ability: { name: '炎除け', effect: { modifier: 'elementGuard', element: 'fire', mode: 'half' } } },
  { id: 'lonerRing', name: '孤高の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', description: '敵が1体だけなら、力が研ぎ澄まされる。', tags: ['single'], stats: { dex: 4 }, ability: { name: '一騎打ち', effect: { modifier: 'damageDealt', multiplier: 1.3, if: [{ kind: 'foeCount', max: 1 }] } } },
  { id: 'farsightAmulet', name: '遠見の首飾り', slot: 'accessory', rarity: 'rare', icon: 'amulet', description: '世界マップで遠くまで見渡せる。', explore: { vision: 1 }, stats: { per: 4 } },
  { id: 'erosionRing', name: '侵食の指輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: '翠の森の奥で見つかる、呪われた指輪。HPが満タンの間だけ力を貸す。', scenario: 'corruptionKing', ability: { name: '満ちた力', effect: { modifier: 'damageDealt', multiplier: 1.2, if: [{ kind: 'selfHpAtLeast', pct: 100 }] } } },
];
