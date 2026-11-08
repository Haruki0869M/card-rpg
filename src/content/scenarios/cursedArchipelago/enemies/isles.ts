// 呪われた群島：呪われた島々・沈んだ神殿（Lv7〜9）
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { drownedSailor } from './mist';

export const shark: EnemyDef = {
  id: 'shark',
  name: '人喰い鮫',
  icon: '🦈',
  maxHp: 40,
  baseLevel: 7,
  size: 1.05,
  exp: 13,
  gold: 8,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'circle', name: '獲物のまわりを泳ぐ', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'chomp', name: '大顎の一撃', effects: [{ kind: 'damage', amount: 17 }] },
    { id: 'tear', name: '食いちぎる', effects: [{ kind: 'damage', amount: 7 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
  ],
};

/** 攻撃してきた相手に反撃する（retaliate。1ターン2回まで） */
export const conchKnight: EnemyDef = {
  id: 'conchKnight',
  name: '貝の騎士',
  icon: '🐚',
  maxHp: 44,
  baseLevel: 7,
  size: 1.05,
  exp: 13,
  gold: 9,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'shell', name: '巻き貝の盾', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'lance', name: '貝殻の槍', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'bash', name: '殻ごと体当たり', effects: [{ kind: 'damage', amount: 6 }, { kind: 'block', amount: 6 }] },
  ],
  abilities: [{ name: 'とげの殻', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 4, perTurn: 2 }] } }],
};

export const stormPetrel: EnemyDef = {
  id: 'stormPetrel',
  name: '嵐の海鳥',
  icon: '🐦',
  maxHp: 32,
  baseLevel: 7,
  size: 0.9,
  exp: 13,
  gold: 8,
  weak: ['fire'],
  resist: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'bolt', name: '稲妻のくちばし', effects: [{ kind: 'damage', amount: 10, element: 'thunder' }] },
    { id: 'gust', name: '嵐の羽ばたき', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'soar', name: '雲に昇る', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

export const octopusLarva: EnemyDef = {
  id: 'octopusLarva',
  name: '小ダコ',
  icon: '🐙',
  maxHp: 34,
  baseLevel: 7,
  size: 0.9,
  exp: 13,
  gold: 8,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'ink', name: '墨を吐く', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2 }] },
    { id: 'grip', name: '八本の腕', effects: [{ kind: 'damage', amount: 3, hits: 3 }] },
    { id: 'squeeze', name: '吸盤で締める', effects: [{ kind: 'damage', amount: 8 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
};

/** 溺れた水夫の亜種。攻撃が闇属性 */
export const cursedDrownedSailor: EnemyDef = makeVariant(drownedSailor, {
  id: 'cursedDrownedSailor',
  name: '呪われた溺れた水夫',
  aura: 'shadow',
  maxHp: 38,
  baseLevel: 7,
  exp: 13,
  gold: 8,
  actions: [
    { id: 'grab', name: '闇の手', effects: [{ kind: 'damage', amount: 10, element: 'dark' }] },
    { id: 'curse', name: '深淵の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 4, element: 'dark' }] },
    { id: 'drag', name: '闇へ引きずり込む', effects: [{ kind: 'damage', amount: 6, element: 'dark' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
});

export const drownedKnight: EnemyDef = {
  id: 'drownedKnight',
  name: '溺れた騎士',
  icon: '🛡',
  maxHp: 85,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'oath', name: '沈んだ誓い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'block', amount: 10 }] },
    { id: 'blade', name: '錆びた大剣', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'sweep', name: '潮の薙ぎ払い', effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
    { id: 'guard', name: '水底の構え', effects: [{ kind: 'block', amount: 14 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '錆びた鎧', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const seaWitch: EnemyDef = {
  id: 'seaWitch',
  name: '海の魔女',
  icon: '🧙',
  maxHp: 60,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['thunder', 'holy'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'brew', name: '毒の煮汁', effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }] },
    { id: 'hex', name: '海霧の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 6 }] },
    { id: 'wave', name: '黒い波', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'veil', name: '霧の帳', effects: [{ kind: 'block', amount: 12 }] },
  ],
  abilities: [{ name: '魔女の霧', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }] } }],
};

export const tideHighPriest: EnemyDef = {
  id: 'tideHighPriest',
  name: '潮の神官',
  icon: '♛',
  maxHp: 270,
  baseLevel: 9,
  size: 1.5,
  exp: 160,
  gold: 160,
  weak: ['thunder', 'dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'wave', name: '潮の波', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
    { id: 'prayer', name: '満ち潮の祈り', effects: [{ kind: 'block', amount: 20 }] },
    { id: 'trident', name: '神官の三叉槍', effects: [{ kind: 'damage', amount: 20 }] },
  ],
  abilities: [{ name: '潮の加護', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '大潮を呼ぶ神官',
      pattern: 'sequence',
      actions: [
        { id: 'springTide', name: '大潮', effects: [{ kind: 'damage', amount: 13, to: 'foes' }] },
        { id: 'undertow', name: '引き潮の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'block', amount: 16 }] },
        { id: 'drown', name: '溺れる祈り', effects: [{ kind: 'damage', amount: 26 }] },
      ],
    },
  ],
};
