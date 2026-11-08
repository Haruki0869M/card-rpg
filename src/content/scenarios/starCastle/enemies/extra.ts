// 星降る天空城：追加の敵（K3 D）。丘・庭園・前庭の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { moonWolf } from './garden';

export const cometFox: EnemyDef = {
  id: 'cometFox',
  name: '彗星の狐',
  icon: '🦊',
  maxHp: 30,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'tail', name: '彗星の尾', effects: [{ kind: 'damage', amount: 11, element: 'holy' }] },
    { id: 'dash', name: '星を蹴る', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'shine', name: '尾の光', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

export const harpGuardian: EnemyDef = {
  id: 'harpGuardian',
  name: '竪琴の守り人',
  icon: '🎼',
  maxHp: 46,
  baseLevel: 7,
  size: 1.1,
  exp: 13,
  gold: 9,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'song', name: '眠りの調べ', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    { id: 'strike', name: '竪琴の一撃', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'chord', name: '守りの和音', effects: [{ kind: 'block', amount: 8, to: 'allies' }] },
  ],
};

export const holyMoonWolf: EnemyDef = makeVariant(moonWolf, {
  id: 'holyMoonWolf',
  name: '聖なる月の狼',
  aura: 'holy',
  maxHp: 53,
  baseLevel: 9,
  exp: 16,
  gold: 12,
  weak: ['dark'],
  resist: ['holy'],
  actions: [
    { id: 'bite', name: '聖なる牙', effects: [{ kind: 'damage', amount: 14, element: 'holy' }] },
    { id: 'howl', name: '月光の遠吠え', effects: [{ kind: 'block', amount: 9 }, { kind: 'damage', amount: 5, element: 'holy' }] },
    { id: 'pounce', name: '光の飛びかかり', effects: [{ kind: 'damage', amount: 7, hits: 2, element: 'holy' }] },
  ],
});
