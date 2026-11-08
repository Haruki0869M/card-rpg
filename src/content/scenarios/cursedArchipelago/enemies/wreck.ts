// 呪われた群島：沈没船の海・嘆きの王冠号（Lv9〜11）
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { shark, seaWitch } from './isles';

export const barnacleBeast: EnemyDef = {
  id: 'barnacleBeast',
  name: 'フジツボの怪物',
  icon: '🪨',
  maxHp: 65,
  baseLevel: 9,
  size: 1.1,
  exp: 16,
  gold: 11,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'crust', name: 'フジツボの殻', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'slam', name: '岩の体当たり', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'spores', name: '殻を飛ばす', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
};

/** 人喰い鮫の亜種。牙に毒 */
export const venomShark: EnemyDef = makeVariant(shark, {
  id: 'venomShark',
  name: '毒鮫',
  aura: 'venom',
  maxHp: 55,
  baseLevel: 9,
  exp: 16,
  gold: 11,
  weak: ['thunder'],
  resist: ['poison'],
  actions: [
    { id: 'circle', name: '毒の渦を泳ぐ', effects: [{ kind: 'block', amount: 8 }] },
    { id: 'chomp', name: '毒牙の大顎', effects: [{ kind: 'damage', amount: 16, element: 'poison' }] },
    { id: 'tear', name: '毒を流し込む', effects: [{ kind: 'damage', amount: 7 }, { kind: 'applyStatus', status: 'poison', amount: 3 }] },
  ],
});

export const krakenTentacle: EnemyDef = {
  id: 'krakenTentacle',
  name: 'クラーケンの触腕',
  icon: '🐙',
  maxHp: 110,
  baseLevel: 9,
  size: 1.25,
  exp: 35,
  gold: 30,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'sweep', name: '甲板を薙ぐ', effects: [{ kind: 'damage', amount: 10, to: 'foes' }] },
    { id: 'wrap', name: '巻きつく', effects: [{ kind: 'damage', amount: 12 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'sink', name: '海に沈む', effects: [{ kind: 'block', amount: 18 }] },
    { id: 'crush', name: '船ごと締め上げる', effects: [{ kind: 'damage', amount: 21 }] },
  ],
  abilities: [{ name: '深海の怪力', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
};

/** 海の魔女の亜種。属性が雷 */
export const stormSeaWitch: EnemyDef = makeVariant(seaWitch, {
  id: 'stormSeaWitch',
  name: '嵐の海の魔女',
  aura: 'storm',
  maxHp: 80,
  baseLevel: 9,
  exp: 35,
  gold: 30,
  weak: ['fire', 'holy'],
  resist: ['thunder', 'poison'],
  actions: [
    { id: 'storm', name: '嵐を呼ぶ', effects: [{ kind: 'damage', amount: 7, element: 'thunder', to: 'foes' }] },
    { id: 'hex', name: '雷雲の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 7, element: 'thunder' }] },
    { id: 'wave', name: '稲妻の波', effects: [{ kind: 'damage', amount: 16, element: 'thunder' }] },
    { id: 'veil', name: '雷雲の帳', effects: [{ kind: 'block', amount: 12 }] },
  ],
  abilities: [{ name: '嵐の気配', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] } }],
});

/** 最後のボス。婚礼の船を守れなかった提督（行動名に物語を込める） */
export const ghostAdmiral: EnemyDef = {
  id: 'ghostAdmiral',
  name: '亡霊提督',
  icon: '♛',
  maxHp: 460,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'salute', name: '祝いの礼砲', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
    { id: 'oath', name: '守れなかった誓い', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'block', amount: 14 }] },
    { id: 'saber', name: '提督の儀礼剣', effects: [{ kind: 'damage', amount: 25 }] },
  ],
  abilities: [{ name: '王冠号の甲板', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
  phases: [
    {
      belowHpPct: 60,
      name: '花嫁を探す提督',
      pattern: 'sequence',
      actions: [
        { id: 'veil', name: '花嫁のヴェール', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 7, to: 'foes' }] },
        { id: 'waltz', name: '霧の中の舞踏', effects: [{ kind: 'damage', amount: 10, hits: 2 }] },
        { id: 'ring', name: '沈んだ指輪', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 9 }] },
      ],
    },
    {
      belowHpPct: 30,
      name: '嘆きの亡霊提督',
      pattern: 'sequence',
      actions: [
        { id: 'grief', name: '婚礼の鐘は鳴らず', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'block', amount: 18 }] },
        { id: 'broadside', name: '最後の一斉射撃', effects: [{ kind: 'damage', amount: 18, to: 'foes' }] },
        { id: 'sink', name: '王冠号と共に', effects: [{ kind: 'damage', amount: 34 }] },
      ],
    },
  ],
};
