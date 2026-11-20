// 呪われた群島：珊瑚の浅瀬・難破船の洞窟（Lv2〜5）
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { seaCrab } from './harbor';

export const seaSerpentFry: EnemyDef = {
  id: 'seaSerpentFry',
  name: '海蛇の子',
  icon: '🐍',
  maxHp: 20,
  baseLevel: 2,
  size: 0.85,
  exp: 5,
  gold: 3,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '毒の噛みつき', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'coil', name: 'とぐろを巻く', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'lunge', name: '飛びかかる', effects: [{ kind: 'damage', amount: 7 }] },
  ],
};

export const merfolkSpearman: EnemyDef = {
  id: 'merfolkSpearman',
  name: '半魚人の槍兵',
  icon: '🔱',
  maxHp: 26,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'thrust', name: '槍の突き', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'guard', name: '槍の構え', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'pierce', name: '鱗を裂く突き', effects: [{ kind: 'damage', amount: 6 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
  ],
};

/** 大蟹の亜種。はさみが火属性 */
export const emberSeaCrab: EnemyDef = makeVariant(seaCrab, {
  id: 'emberSeaCrab',
  name: '熾火の大蟹',
  aura: 'ember',
  maxHp: 26,
  baseLevel: 3,
  exp: 7,
  gold: 4,
  weak: [],
  resist: ['fire'],
  actions: [
    { id: 'pinch', name: '熾火のはさみ', effects: [{ kind: 'damage', amount: 5, hits: 2, element: 'fire' }] },
    { id: 'shell', name: '焼けた甲羅', effects: [{ kind: 'block', amount: 7 }] },
    { id: 'crush', name: '灼熱の挟みつぶし', effects: [{ kind: 'damage', amount: 8, element: 'fire' }] },
  ],
});

export const coralGolem: EnemyDef = {
  id: 'coralGolem',
  name: '珊瑚のゴーレム',
  icon: '🪸',
  maxHp: 85,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'wall', name: '珊瑚の壁', effects: [{ kind: 'block', amount: 16 }] },
    { id: 'slam', name: '珊瑚の拳', big: true, effects: [{ kind: 'damage', amount: 14 }] },
    { id: 'shards', name: '砕けた珊瑚', big: true, effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: '育つ珊瑚', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const seaSerpentQueen: EnemyDef = {
  id: 'seaSerpentQueen',
  name: '海蛇の女王',
  icon: '♛',
  maxHp: 170,
  baseLevel: 5,
  size: 1.45,
  exp: 80,
  gold: 80,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'fang', name: '女王の毒牙', effects: [{ kind: 'damage', amount: 9 }, { kind: 'applyStatus', status: 'poison', amount: 3 }] },
    { id: 'coil', name: '締め付け', big: true, effects: [{ kind: 'damage', amount: 14 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'scales', name: '鱗の守り', effects: [{ kind: 'block', amount: 14 }] },
  ],
  abilities: [{ name: '女王の鱗', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '怒れる海蛇の女王',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 巻き戻し（脱皮。1回だけ）。答え: 雷で BREAK・呪い
      openingActionId: 'molt',
      rule: '1回だけ脱皮して、HPを最大の半分まで戻す（雷で BREAK すると止まる。呪いで戻る量が減る）',
      actions: [
        { id: 'molt', name: '脱皮して傷を捨てる', big: true, scripted: true, hint: 'HPを最大の50%まで戻す（1回だけ）。雷の弱点で BREAK すると止まる。呪い・癒し封じで戻る量が減る', effects: [{ kind: 'healToPct', pct: 50 }, { kind: 'block', amount: 8 }] },
        { id: 'miasma', name: '毒の潮', big: true, effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }, { kind: 'damage', amount: 5, to: 'foes' }] },
        { id: 'crush', name: '大締め付け', big: true, effects: [{ kind: 'damage', amount: 20 }] },
        { id: 'shed', name: '脱皮', effects: [{ kind: 'block', amount: 18 }] },
      ],
    },
  ],
};
