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
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 手負い狙いを1ターン目に予告する（2ターン目からは獲物のまわりを泳ぐ・大顎の一撃・手負い狙いの順）
  firstActionId: 'tear',
  actions: [
    { id: 'circle', name: '獲物のまわりを泳ぐ', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'chomp', name: '大顎の一撃', effects: [{ kind: 'damage', amount: 20 }] },
    // 「食いちぎる」（8ダメージ＋脆弱1）を手負い狙いに置き換えた（同じ8ダメージ・HPが半分以下なら×1.5）。ID は古い保存のために残す
    { id: 'tear', name: '血の匂いを追う', big: true, behavior: 'hunt', hint: 'HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5', effects: [{ kind: 'damage', amount: 8, lowHpMul: 1.5 }] },
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
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: ほかの敵がいる時は、1ターン目に必ず「殻でかばう」（1体だけの時は貝殻の槍）
  firstActionId: 'shell',
  actions: [
    // 「巻き貝の盾」をかばうに置き換えた。ID は古い保存のために残す。今ある「とげの殻」（殴られると反撃）と組になる。
    // 4つ目の地域なのでブロック10（BREAK されると行動ごと止まる）
    { id: 'shell', name: '殻でかばう', big: true, behavior: 'guard', fallbackIfAloneId: 'lance', hint: '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る', effects: [{ kind: 'guardAllies' }, { kind: 'block', amount: 10 }] },
    { id: 'lance', name: '貝殻の槍', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'bash', name: '殻ごと体当たり', effects: [{ kind: 'damage', amount: 7 }, { kind: 'block', amount: 6 }] },
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
    { id: 'bolt', name: '稲妻のくちばし', effects: [{ kind: 'damage', amount: 12, element: 'thunder' }] },
    { id: 'gust', name: '嵐の羽ばたき', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
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
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 手数読みを1ターン目に予告する（2ターン目からは八本の腕・吸盤で締める・手数読みの順）
  firstActionId: 'ink',
  actions: [
    // 「墨を吐く」（脆弱2）を手数読みに置き換えた。ID は古い保存のために残す。
    // 元の脆弱は弱めて残す（狙った1人に脆弱1。fix-plan §2 の 2-4）。4つ目の地域なのでブロック10（BREAK されると付かない）
    { id: 'ink', name: '八本の腕で待ち構える', big: true, behavior: 'punish', hint: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 4 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'block', amount: 10 }] },
    { id: 'grip', name: '八本の腕', effects: [{ kind: 'damage', amount: 3, hits: 3 }] },
    { id: 'squeeze', name: '吸盤で締める', effects: [{ kind: 'damage', amount: 9 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
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
    { id: 'grab', name: '闇の手', effects: [{ kind: 'damage', amount: 12, element: 'dark' }] },
    { id: 'curse', name: '深淵の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 5, element: 'dark' }] },
    { id: 'drag', name: '闇へ引きずり込む', effects: [{ kind: 'damage', amount: 7, element: 'dark' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
});

export const drownedKnight: EnemyDef = {
  id: 'drownedKnight',
  name: '溺れた騎士',
  icon: '🛡',
  maxHp: 100,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'oath', name: '沈んだ誓い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'block', amount: 10 }] },
    { id: 'blade', name: '錆びた大剣', big: true, effects: [{ kind: 'damage', amount: 18 }] },
    { id: 'sweep', name: '潮の薙ぎ払い', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
    { id: 'guard', name: '水底の構え', effects: [{ kind: 'block', amount: 14 }, { kind: 'damage', amount: 7 }] },
  ],
  abilities: [{ name: '錆びた鎧', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const seaWitch: EnemyDef = {
  id: 'seaWitch',
  name: '海の魔女',
  icon: '🧙',
  maxHp: 70,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['thunder', 'holy'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'brew', name: '毒の煮汁', effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }] },
    { id: 'hex', name: '海霧の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 7 }] },
    { id: 'wave', name: '黒い波', big: true, effects: [{ kind: 'damage', amount: 15 }] },
    { id: 'veil', name: '霧の帳', effects: [{ kind: 'block', amount: 12 }] },
  ],
  abilities: [{ name: '魔女の霧', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }] } }],
};

export const tideHighPriest: EnemyDef = {
  id: 'tideHighPriest',
  name: '潮の神官',
  icon: '♛',
  maxHp: 310,
  baseLevel: 9,
  size: 1.5,
  exp: 160,
  gold: 160,
  weak: ['thunder', 'dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'wave', name: '潮の波', big: true, effects: [{ kind: 'damage', amount: 10, to: 'foes' }] },
    { id: 'prayer', name: '満ち潮の祈り', effects: [{ kind: 'block', amount: 20 }] },
    { id: 'trident', name: '神官の三叉槍', big: true, effects: [{ kind: 'damage', amount: 23 }] },
  ],
  abilities: [{ name: '潮の加護', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '大潮を呼ぶ神官',
      pattern: 'sequence',
      actions: [
        { id: 'springTide', name: '大潮', big: true, effects: [{ kind: 'damage', amount: 15, to: 'foes' }] },
        { id: 'undertow', name: '引き潮の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'block', amount: 16 }] },
        { id: 'drown', name: '溺れる祈り', big: true, effects: [{ kind: 'damage', amount: 30 }] },
      ],
    },
  ],
};
