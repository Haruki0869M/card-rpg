// 呪われた群島：霧の海域・海賊の隠れ島（Lv5）。幽霊は聖に弱く、闇・毒に強い
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { jellyfish } from './harbor';

export const drownedSailor: EnemyDef = {
  id: 'drownedSailor',
  name: '溺れた水夫',
  icon: '👻',
  maxHp: 30,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'grab', name: '冷たい手', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'curse', name: '海の底の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }] },
    { id: 'drag', name: '引きずり込む', effects: [{ kind: 'damage', amount: 6 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
};

export const ghostDeckhand: EnemyDef = {
  id: 'ghostDeckhand',
  name: '幽霊水夫',
  icon: '👻',
  maxHp: 26,
  baseLevel: 5,
  size: 0.95,
  exp: 10,
  gold: 6,
  weak: ['holy', 'fire'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'hook', name: '錆びた鉤爪', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'fade', name: '霧に溶ける', effects: [{ kind: 'block', amount: 7 }] },
    { id: 'wail', name: '亡者の叫び', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
  ],
  abilities: [{ name: 'すり抜ける体', description: '戦闘開始時（呼ばれて現れた時も）、ブロック6', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '取り残された幽霊水夫',
      pattern: 'sequence',
      openingActionId: 'gdCrewCall',
      rule: '仲間を呼ぶ（2回まで。弱点で BREAK すると止まる。先に倒すか、全体攻撃で）',
      actions: [
        { id: 'gdCrewCall', name: '仲間の亡者を呼ぶ', big: true, scripted: true, behavior: 'call', brief: '幽霊水夫を1体呼ぶ', hint: '幽霊水夫を1体呼ぶ。聖か火の弱点で BREAK すると止まる。先に倒すか、全体攻撃で', effects: [{ kind: 'summonEnemy', enemy: 'ghostDeckhand', uses: 1, call: true, orElse: 'gdRustHook' }] },
        { id: 'gdRustHook', name: '錆びた鉤爪の連打', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
        { id: 'gdMourn', name: '亡者の嘆き', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
      ],
    },
  ],
};

export const pirateGunner: EnemyDef = {
  id: 'pirateGunner',
  name: '海賊の砲手',
  icon: '💣',
  maxHp: 28,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 7,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'barrage', name: '甲板の砲撃', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
    // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 「弾込め」を仲間を呼ぶ（海賊の下っ端）に置き換えた。ID は古い保存のために残す。
    // 呼べる時は優先・2ターン続けては呼ばない・1戦闘に2回まで。呼べない時は「至近の一発」。3つ目の地域なのでブロック8
    { id: 'reload', name: '呼び子を吹く', big: true, scripted: true, behavior: 'call', cutIn: { when: 'hurt', rest: 1, noRepeat: true }, brief: '弱ると呼び子を吹く', hint: 'HPが半分を切ると、呼び子で海賊の下っ端を呼ぶ（2回まで）。半分から一気に倒せば呼ばれない', effects: [{ kind: 'summonEnemy', enemy: 'pirateGrunt', uses: 2, call: true, orElse: 'point' }, { kind: 'block', amount: 8 }] },
    { id: 'point', name: '至近の一発', effects: [{ kind: 'damage', amount: 12 }] },
  ],
};

export const siren: EnemyDef = {
  id: 'siren',
  name: 'セイレーン',
  icon: '🧜',
  maxHp: 26,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 癒し封じを1ターン目に予告する（2ターン目からは惑わしの歌・濡れた爪・癒し封じの順）
  firstActionId: 'lament',
  actions: [
    { id: 'song', name: '惑わしの歌', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    { id: 'claw', name: '濡れた爪', effects: [{ kind: 'damage', amount: 9 }] },
    // 「呪いの調べ」（呪い2＋5ダメージ）を癒し封じに置き換えた。ID は古い保存のために残す。
    // 元の呪いは弱めて残す（狙った1人に呪い1。fix-plan §2 の 2-4）。3つ目の地域なのでブロック8（BREAK されると行動ごと止まる）
    { id: 'lament', name: '癒しを拒む歌', big: true, behavior: 'healSeal', brief: '歌の間、回復が半分', hint: '味方全員の回復が3ターン半分になる。セイレーンが倒れると、癒し封じは全部消える', effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 3, to: 'foes' }, { kind: 'bindSeal' }, { kind: 'block', amount: 8 }] },
  ],
};

/** クラゲの亜種。触手が雷属性 */
export const stormJellyfish: EnemyDef = makeVariant(jellyfish, {
  id: 'stormJellyfish',
  name: '雷クラゲ',
  aura: 'storm',
  maxHp: 26,
  baseLevel: 5,
  exp: 10,
  gold: 6,
  weak: ['fire'],
  resist: ['thunder', 'poison'],
  actions: [
    { id: 'sting', name: '雷の触手', effects: [{ kind: 'damage', amount: 9, element: 'thunder' }] },
    { id: 'drift', name: '帯電してただよう', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'lash', name: '放電', effects: [{ kind: 'damage', amount: 5, element: 'thunder', to: 'foes' }] },
  ],
});

export const pirateQuartermaster: EnemyDef = {
  id: 'pirateQuartermaster',
  name: '海賊の操舵手',
  icon: '🏴',
  maxHp: 55,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 22,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'order', name: '野郎ども、かかれ！', effects: [{ kind: 'block', amount: 6, to: 'allies' }] },
    { id: 'cutlass', name: '舵取りの剣', big: true, effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'pistol', name: '短銃の早撃ち', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
    { id: 'helm', name: '舵を切る', effects: [{ kind: 'block', amount: 10 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
  abilities: [{ name: '海賊の号令', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4, to: 'allies' }] } }],
};

/** 50%以下で、幽霊水夫を呼ぶ（敵の増援 summonEnemy。1戦闘2回まで・戦場は4体まで・呼んだ敵は報酬なし） */
export const pirateCaptainGuld: EnemyDef = {
  id: 'pirateCaptainGuld',
  name: '海賊船長ガルド',
  icon: '♛',
  maxHp: 240,
  baseLevel: 7,
  size: 1.5,
  exp: 110,
  gold: 130,
  weak: ['holy', 'thunder'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'broadside', name: '舷側の砲撃', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
    { id: 'cutlass', name: '略奪の剣', big: true, effects: [{ kind: 'damage', amount: 17 }] },
    { id: 'plunder', name: 'まだ奪い足りねえ', effects: [{ kind: 'block', amount: 14 }, { kind: 'damage', amount: 7 }] },
  ],
  abilities: [{ name: '死んでも船長', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '亡霊の船長ガルド',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 呼ぶ（今の行動を紫の札にそろえて、開幕の一手にした）。答え: 聖・雷で BREAK・水夫を先に
      openingActionId: 'crew',
      rule: '幽霊水夫を呼ぶ（2回まで。聖・雷で BREAK すると止まる。水夫を先に倒すか、全体攻撃で）',
      actions: [
        { id: 'crew', name: '起きろ、野郎ども', big: true, behavior: 'call', hint: '幽霊水夫を1体呼ぶ（2回まで。倒しても報酬なし）。聖・雷の弱点で BREAK すると止まる。水夫を先に倒すか、全体攻撃で', effects: [{ kind: 'summonEnemy', enemy: 'ghostDeckhand', uses: 2, orElse: 'loot' }, { kind: 'block', amount: 10 }] },
        { id: 'loot', name: '亡者の略奪', big: true, effects: [{ kind: 'damage', amount: 22 }] },
        { id: 'volley', name: '幽霊船の一斉砲撃', big: true, effects: [{ kind: 'damage', amount: 10, to: 'foes' }] },
      ],
    },
  ],
};
