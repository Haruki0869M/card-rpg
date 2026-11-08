// 砂塵の王朝：王家の谷と石像の神殿のボス。石像・土人形は雷が弱点。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { mummy, vulture } from './dunes';

export const sandWorm: EnemyDef = {
  id: 'sandWorm',
  name: '砂虫',
  icon: '🪱',
  maxHp: 56,
  baseLevel: 7,
  size: 1.1,
  exp: 13,
  gold: 9,
  weak: ['ice'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'devour', name: '丸呑み', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'burrow', name: '砂に潜る', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'quake', name: '地中からの突き上げ', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
};

export const clayGolem: EnemyDef = {
  id: 'clayGolem',
  name: '土人形',
  icon: '🗿',
  maxHp: 44,
  baseLevel: 7,
  size: 1.05,
  exp: 13,
  gold: 9,
  weak: ['thunder', 'ice'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'harden', name: '粘土を固める', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'fist', name: '重い拳', effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'slam', name: '叩きつけ', effects: [{ kind: 'damage', amount: 7 }, { kind: 'block', amount: 6 }] },
  ],
};

export const mummyArcher: EnemyDef = {
  id: 'mummyArcher',
  name: 'ミイラの弓兵',
  icon: '🏹',
  maxHp: 34,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'arrow', name: '朽ちた矢', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'volley', name: '矢の雨', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
    { id: 'aim', name: '狙いを定める', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

export const cursedPriest: EnemyDef = {
  id: 'cursedPriest',
  name: '呪われた神官',
  icon: '☥',
  maxHp: 36,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'hex', name: '王家の呪詛', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 5, element: 'dark' }] },
    // 仲間の傷を癒やす。一人きりの時は自分の守りに変える
    { id: 'mend', name: '死者への祈り', effects: [{ kind: 'heal', amount: 10, to: 'lowestAlly' }], fallbackIfAloneId: 'shroud' },
    { id: 'staff', name: '生命の杖で打つ', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'shroud', name: '黒い帳', effects: [{ kind: 'block', amount: 9 }] },
  ],
};

export const sandSerpentLord: EnemyDef = {
  id: 'sandSerpentLord',
  name: '砂の大蛇',
  icon: '🛡',
  maxHp: 90,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['ice'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'fang', name: '大蛇の毒牙', effects: [{ kind: 'damage', amount: 9 }, { kind: 'applyStatus', status: 'poison', amount: 3 }] },
    { id: 'constrict', name: '締め付け', effects: [{ kind: 'damage', amount: 7, hits: 2 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'hood', name: '頭巾を広げる', effects: [{ kind: 'block', amount: 14 }] },
    { id: 'spray', name: '毒の霧', effects: [{ kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' }] },
  ],
  abilities: [{ name: '砂中からの奇襲', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'poison', amount: 2, to: 'randomFoe' }] } }],
};

export const stoneGuardianBeast: EnemyDef = {
  id: 'stoneGuardianBeast',
  name: '砂の守護獣',
  icon: '♛',
  maxHp: 270,
  baseLevel: 9,
  size: 1.6,
  exp: 160,
  gold: 160,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'paw', name: '石の前脚', effects: [{ kind: 'damage', amount: 22 }] },
    { id: 'guard', name: '神殿の守り', effects: [{ kind: 'block', amount: 20 }] },
    { id: 'tail', name: '砂岩の尾', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
  abilities: [{ name: '砂岩の体', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    { belowHpPct: 50, name: '咆哮する守護獣', pattern: 'sequence', actions: [
      { id: 'roar', name: '石の咆哮', effects: [{ kind: 'damage', amount: 12, to: 'foes' }] },
      { id: 'pounce', name: '砕ける跳びかかり', effects: [{ kind: 'damage', amount: 28 }] },
      { id: 'guard', name: 'ひび割れた守り', effects: [{ kind: 'block', amount: 24 }] },
    ] },
  ],
};

export const cursedMummy: EnemyDef = makeVariant(mummy, {
  id: 'cursedMummy', name: '呪詛のミイラ', aura: 'shadow', maxHp: 40, baseLevel: 7, exp: 13, gold: 9,
  weak: ['holy'], resist: ['poison', 'dark'],
  actions: [
    { id: 'grab', name: '呪詛の手', effects: [{ kind: 'damage', amount: 11, element: 'dark' }] },
    { id: 'curse', name: '王墓の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 5, element: 'dark' }] },
    { id: 'wrap', name: '黒い包帯', effects: [{ kind: 'block', amount: 9 }] },
  ],
});

export const stormVulture: EnemyDef = makeVariant(vulture, {
  id: 'stormVulture', name: '雷禿鷲', aura: 'storm', maxHp: 32, baseLevel: 7, exp: 13, gold: 9,
  weak: ['ice'], resist: ['thunder'],
  actions: [
    { id: 'talons', name: '雷の鉤爪', effects: [{ kind: 'damage', amount: 6, hits: 2, element: 'thunder' }] },
    { id: 'circle', name: '雷雲を旋回する', effects: [{ kind: 'block', amount: 7 }] },
    { id: 'peck', name: '稲妻の急降下', effects: [{ kind: 'damage', amount: 11, element: 'thunder' }] },
  ],
});
