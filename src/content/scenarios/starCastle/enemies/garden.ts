// 星降る天空城：月光の庭園。月の獣は夜に強い（開幕にブロック）
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { moonRabbit } from './hill';

export const moonWolf: EnemyDef = {
  id: 'moonWolf',
  name: '月の狼',
  icon: '🐺',
  maxHp: 44,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '月夜の牙', effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'howl', name: '月への遠吠え', effects: [{ kind: 'block', amount: 7 }, { kind: 'damage', amount: 5 }] },
    { id: 'pounce', name: '銀の飛びかかり', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
  ],
  abilities: [{ name: '夜の毛皮', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const thornFairy: EnemyDef = {
  id: 'thornFairy',
  name: '茨の妖精',
  icon: '🧚',
  maxHp: 34,
  baseLevel: 7,
  size: 0.8,
  exp: 13,
  gold: 9,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'needle', name: '茨の針', effects: [{ kind: 'damage', amount: 7 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'tangle', name: 'からまる茨', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'block', amount: 5 }] },
    { id: 'prick', name: 'いたずらの棘', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
  ],
};

export const clockworkKnight: EnemyDef = {
  id: 'clockworkKnight',
  name: '時計仕掛けの騎士',
  icon: '🛡',
  maxHp: 98,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'guard', name: '真鍮の大盾', effects: [{ kind: 'block', amount: 18 }] },
    { id: 'slash', name: '秒針の斬撃', big: true, effects: [{ kind: 'damage', amount: 18 }] },
    { id: 'bash', name: '盾の打撃', effects: [{ kind: 'block', amount: 10 }, { kind: 'damage', amount: 10 }] },
    { id: 'chime', name: '十二時の鐘', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
  abilities: [{ name: '巻き上げた装甲', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
};

export const moonGardener: EnemyDef = {
  id: 'moonGardener',
  name: '月の庭師',
  icon: '✂',
  maxHp: 86,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['fire', 'holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'thorns', name: '茨の垣根', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
    { id: 'shears', name: '大ばさみ', big: true, effects: [{ kind: 'damage', amount: 18 }] },
    { id: 'prune', name: '枝払い', big: true, effects: [{ kind: 'damage', amount: 5, to: 'foes' }, { kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' }] },
    { id: 'hedge', name: '生け垣の守り', effects: [{ kind: 'block', amount: 14 }] },
  ],
  abilities: [{ name: '月夜の庭', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6, to: 'allies' }] } }],
};

export const moonMaiden: EnemyDef = {
  id: 'moonMaiden',
  name: '月の乙女',
  icon: '♛',
  maxHp: 270,
  baseLevel: 9,
  size: 1.5,
  exp: 160,
  gold: 160,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'moonlight', name: '月光', big: true, effects: [{ kind: 'damage', amount: 22, element: 'holy' }] },
    { id: 'rose', name: '茨の抱擁', big: true, effects: [{ kind: 'damage', amount: 7, to: 'foes' }, { kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' }] },
    { id: 'veil', name: '月の帳', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 7 }] },
  ],
  abilities: [{ name: '眠りの花びら', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '満月の力に目覚めた乙女',
      pattern: 'sequence',
      actions: [
        { id: 'fullMoon', name: '満月の力', effects: [{ kind: 'block', amount: 12, to: 'allies' }, { kind: 'applyStatus', status: 'regen', amount: 4, to: 'self' }] },
        { id: 'lunar', name: '満月の光', big: true, effects: [{ kind: 'damage', amount: 14, element: 'holy', to: 'foes' }] },
        { id: 'briar', name: '茨の檻', big: true, effects: [{ kind: 'damage', amount: 29 }] },
        { id: 'petals', name: '散る花びら', big: true, effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'damage', amount: 7, to: 'foes' }] },
      ],
    },
  ],
};

export const shadowMoonRabbit: EnemyDef = makeVariant(moonRabbit, {
  id: 'shadowMoonRabbit',
  name: '影のウサギ',
  aura: 'shadow',
  maxHp: 41,
  baseLevel: 7,
  exp: 13,
  gold: 9,
  actions: [
    { id: 'mallet', name: '影の杵', effects: [{ kind: 'damage', amount: 12, element: 'dark' }] },
    { id: 'hex', name: '新月の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'block', amount: 5 }] },
    { id: 'hop', name: '影跳び', effects: [{ kind: 'damage', amount: 6, hits: 2, element: 'dark' }] },
  ],
});

export const hourglassGolem: EnemyDef = {
  id: 'hourglassGolem',
  name: '砂時計のゴーレム',
  icon: '⏳',
  maxHp: 62,
  baseLevel: 7,
  size: 1.1,
  exp: 13,
  gold: 9,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'sand', name: '止まる砂', effects: [{ kind: 'damage', amount: 6 }, { kind: 'applyStatus', status: 'delay', amount: 1 }] },
    { id: 'fist', name: '石の拳', effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'turn', name: '砂時計を返す', effects: [{ kind: 'block', amount: 12 }] },
  ],
};
