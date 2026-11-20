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
    // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 「からまる茨」を仲間を呼ぶ（風の精）に置き換えた。ID は古い保存のために残す。
    // 呼べる時は優先・2ターン続けては呼ばない・1戦闘に2回まで。呼べない時は「いたずらの棘」。4つ目の地域なのでブロック10
    { id: 'tangle', name: 'いたずら仲間を呼ぶ', big: true, scripted: true, behavior: 'call', cutIn: { when: 'afflicted', rest: 1, noRepeat: true }, brief: '状態異常で仲間を呼ぶ', hint: '自分に状態異常が付くと、泣いて風の精を呼ぶ（2回まで。BREAK の脆弱も数える）。状態異常を使わずに倒せば呼ばれない', effects: [{ kind: 'summonEnemy', enemy: 'windSprite', uses: 2, call: true, orElse: 'prick' }, { kind: 'block', amount: 10 }] },
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
      // ボスの段階（2026-11-14）: 再生＋浄化（今の満月の再生は残す）。答え: 一気に削る・闇で BREAK
      openingActionId: 'moonRite',
      rule: '状態異常を払って回復し、満月の再生も続く（闇で BREAK すると止まる。一気に削る）',
      actions: [
        { id: 'moonRite', name: '月の禊', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, hint: '状態異常を全部消して回復する（1種類につき6）。その前に起爆するか、闇の弱点で BREAK する。満月の再生も残るので、一気に削る。BREAK すると浄化は止まるが、満月の再生3は残る', breakResidue: [{ kind: 'applyStatus', status: 'regen', amount: 3, to: 'self' }], effects: [{ kind: 'purify', amount: 6 }, { kind: 'applyStatus', status: 'regen', amount: 3, to: 'self' }] },
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
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 手数読みを1ターン目に予告する（2ターン目からは止まる砂・石の拳・手数読みの順）
  firstActionId: 'turn',
  actions: [
    { id: 'sand', name: '止まる砂', effects: [{ kind: 'damage', amount: 6 }, { kind: 'applyStatus', status: 'delay', amount: 1 }] },
    { id: 'fist', name: '石の拳', effects: [{ kind: 'damage', amount: 12 }] },
    // 「砂時計を返す」を手数読みに置き換えた。ID は古い保存のために残す。4つ目の地域なのでブロック10（BREAK されると付かない）
    { id: 'turn', name: '砂時計で数える', big: true, behavior: 'punish', brief: '3枚目から重くなる', hint: 'カードを3枚以上使った味方に、3枚目から1枚ごとに3（3枚=3・4枚=6・5枚=9）と遅延1（次に引く札-1）。2枚までなら何もしない', effects: [{ kind: 'punishPlays', amount: 3, min: 3, ramp: true, status: { status: 'delay', amount: 1 } }, { kind: 'block', amount: 10 }] },
  ],
};
