// 砂塵の王朝：追加の敵（K3 D）。入口・廃墟・谷・王宮前の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { mummyArcher } from './valley';

export const desertFennec: EnemyDef = {
  id: 'desertFennec',
  name: '砂漠狐',
  icon: '🦊',
  maxHp: 22,
  baseLevel: 3,
  size: 0.85,
  exp: 7,
  gold: 4,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '素早い噛みつき', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
    { id: 'dig', name: '砂に潜る', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'pounce', name: '砂からの飛びかかり', effects: [{ kind: 'damage', amount: 8 }] },
  ],
};

export const obeliskSentinel: EnemyDef = {
  id: 'obeliskSentinel',
  name: 'オベリスクの番人',
  icon: '🗿',
  maxHp: 50,
  baseLevel: 7,
  size: 1.15,
  exp: 13,
  gold: 9,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 盾砕きを1ターン目に予告する（2ターン目からは刻まれた呪文・石碑の守り・盾砕きの順）
  firstActionId: 'slam',
  actions: [
    { id: 'wall', name: '石碑の守り', effects: [{ kind: 'block', amount: 12 }] },
    // 「石柱の打撃」を盾砕きに置き換えた（ブロックを0にしてから、同じ12のダメージ）。ID は古い保存のために残す
    { id: 'slam', name: '石柱で叩き割る', big: true, behavior: 'shatter', brief: '全員の盾を割る', hint: '味方全員のブロックを壊し、全員に6。守りを当てにせず、先に倒すか BREAK する', effects: [{ kind: 'shieldBreak', to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
    { id: 'glyph', name: '刻まれた呪文', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
  ],
  abilities: [{ name: '硬い石肌', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
};

export const venomMummyArcher: EnemyDef = makeVariant(mummyArcher, {
  id: 'venomMummyArcher',
  name: '毒矢のミイラ兵',
  aura: 'venom',
  maxHp: 42,
  baseLevel: 9,
  exp: 16,
  gold: 12,
  actions: [
    { id: 'arrow', name: '毒矢', effects: [{ kind: 'damage', amount: 9 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'volley', name: '毒矢の雨', effects: [{ kind: 'damage', amount: 4, to: 'foes' }, { kind: 'applyStatus', status: 'poison', amount: 1, to: 'foes' }] },
    { id: 'aim', name: '狙いを定める', effects: [{ kind: 'block', amount: 8 }] },
  ],
  abilities: [{ name: '毒を塗った矢じり', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'poison', amount: 1, to: 'randomFoe' }] } }],
});
