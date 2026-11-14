// 砂塵の王朝：王宮前の荒野と砂塵の王宮。最後の王は、民を救うために永遠の命を求めた。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { jackalWarrior } from './ruins';

export const stoneCat: EnemyDef = {
  id: 'stoneCat',
  name: '石の猫像',
  icon: '🐈',
  maxHp: 40,
  baseLevel: 9,
  size: 0.95,
  exp: 24,
  gold: 18,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'claw', name: '砂岩の爪', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
    { id: 'still', name: '像のふりをする', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'pounce', name: '飛びかかる', effects: [{ kind: 'damage', amount: 13 }] },
  ],
  // 叩いた相手に引っかき返す（1ターン2回まで）
  abilities: [{ name: '守り猫の爪', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 4, perTurn: 2 }] } }],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: 'ひとりの石の猫像',
      pattern: 'sequence',
      openingActionId: 'scGlint',
      rule: '手数読み: このターンにカードを何枚も使った味方に、枚数に応じたダメージ（使う枚数を絞る。弱点で BREAK すると威力が半分）',
      actions: [
        { id: 'scGlint', name: '猫の目が光る', big: true, scripted: true, behavior: 'punish', hint: 'このターンにカードを3枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 3 }] },
        { id: 'scScratch', name: '砂岩の引っかき', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
        { id: 'scLeap', name: '跳びかかる爪', effects: [{ kind: 'damage', amount: 13 }] },
      ],
    },
  ],
};

export const colossusStatue: EnemyDef = {
  id: 'colossusStatue',
  name: '石像の巨兵',
  icon: '🛡',
  maxHp: 100,
  baseLevel: 9,
  size: 1.2,
  exp: 35,
  gold: 30,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'wall', name: '石の大盾', effects: [{ kind: 'block', amount: 24 }] },
    { id: 'fist', name: '巨兵の拳', big: true, effects: [{ kind: 'damage', amount: 17 }] },
    { id: 'stomp', name: '地響き', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
    { id: 'shove', name: '盾で押し潰す', effects: [{ kind: 'block', amount: 12 }, { kind: 'damage', amount: 8 }] },
  ],
  abilities: [{ name: '砂岩の守り', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 12 }] } }],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '目覚めた石像の巨兵',
      pattern: 'sequence',
      openingActionId: 'csStoneEye',
      rule: '手数読み: このターンにカードを何枚も使った味方に、枚数に応じたダメージ（使う枚数を絞る。弱点で BREAK すると威力が半分）',
      actions: [
        { id: 'csStoneEye', name: '石の眼が見張る', big: true, behavior: 'punish', hint: 'このターンにカードを4枚以上使った味方に、枚数×3のダメージ', effects: [{ kind: 'punishPlays', amount: 3, min: 4 }] },
        { id: 'csCrush', name: '巨兵の踏みつけ', effects: [{ kind: 'damage', amount: 17 }] },
        { id: 'csQuake', name: '大地鳴らし', big: true, hint: '味方全員にダメージ。ブロックで受けるか、雷の弱点で BREAK する', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
      ],
    },
  ],
};

export const sandPharaoh: EnemyDef = {
  id: 'sandPharaoh',
  name: '砂塵の王',
  icon: '♛',
  maxHp: 400,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ['fire', 'holy'],
  resist: ['poison', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'decree', name: '王の勅命', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'block', amount: 10 }] },
    { id: 'crook', name: '牧者の王杖', big: true, effects: [{ kind: 'damage', amount: 22 }] },
    { id: 'eternity', name: '永遠の守り', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '千年の包帯', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    // ボスの段階（2026-11-14）: 手数読み（順番にも入る）。答え: 手数を絞る・火・聖で BREAK
    { belowHpPct: 60, name: '民のために永遠を求めた王', pattern: 'sequence', openingActionId: 'royalEye', rule: 'カードを4枚以上使った味方に反撃する（手数を絞る。火・聖で BREAK すると威力が半分）', actions: [
      { id: 'royalEye', name: '王の監視', big: true, behavior: 'punish', hint: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 4 }, { kind: 'block', amount: 12 }] },
      { id: 'famine', name: '飢えた民の記憶', big: true, effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
      { id: 'vow', name: '果たせなかった誓い', big: true, effects: [{ kind: 'damage', amount: 24, element: 'dark' }] },
      { id: 'tomb', name: '王墓の壁', effects: [{ kind: 'block', amount: 24 }] },
      { id: 'sand', name: 'こぼれ落ちる砂', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'damage', amount: 6 }] },
    ] },
    // ボスの段階（2026-11-14）: 数え読み（3回で大砂嵐。くり返す）。答え: BREAK で数を戻す・その前に倒す・守り
    { belowHpPct: 30, name: '砂嵐に呑まれた王', pattern: 'sequence', openingActionId: 'stormOmen', rule: '数え読み: 3回の予告の後に「王国を埋める大砂嵐」（数えている間に BREAK すると1つ戻る）', actions: [
      { id: 'stormOmen', name: '砂嵐の予兆', scripted: true, countdown: { actionId: 'greatStorm', turns: 3 }, hint: '3回の予告の後に「王国を埋める大砂嵐」（味方全員に24・脆弱1）。数えている間に BREAK すると、数が1つ戻る。数えが0になる前に倒すか、守りを固める', effects: [{ kind: 'block', amount: 14 }] },
      { id: 'greatStorm', name: '王国を埋める大砂嵐', big: true, scripted: true, effects: [{ kind: 'damage', amount: 24, to: 'foes' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
      { id: 'storm', name: '王国を呑む砂嵐', big: true, effects: [{ kind: 'damage', amount: 16, to: 'foes' }] },
      { id: 'last', name: '最後の王命', big: true, effects: [{ kind: 'damage', amount: 30, element: 'dark' }] },
      { id: 'dune', name: '民なき王国', big: true, effects: [{ kind: 'block', amount: 26 }, { kind: 'damage', amount: 8, to: 'foes' }] },
    ] },
  ],
};

export const venomJackalWarrior: EnemyDef = makeVariant(jackalWarrior, {
  id: 'venomJackalWarrior', name: '毒槍のジャッカル', aura: 'venom', maxHp: 44, baseLevel: 9, exp: 24, gold: 18,
  weak: ['thunder'], resist: ['fire', 'poison'],
  actions: [
    { id: 'thrust', name: '毒槍の連突き', effects: [{ kind: 'damage', amount: 4, hits: 3 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 亜種のこの敵だけ「槍の構え」を仲間を呼ぶ（ジャッカルの戦士）に置き換えた。ID は古い保存のために残す。
    // 呼べる時は優先・2ターン続けては呼ばない・1戦闘に2回まで。呼べない時は「毒槍の踏み込み」。5つ目の地域なのでブロック10。元のジャッカルの戦士は変えていない
    { id: 'guard', name: '遠吠えで群れを呼ぶ', big: true, behavior: 'call', cutIn: { when: 'canSummon', rest: 1, noRepeat: true }, hint: '仲間を1体呼ぶ。その前に倒すか、BREAK する', effects: [{ kind: 'summonEnemy', enemy: 'jackalWarrior', uses: 2, call: true, orElse: 'lunge' }, { kind: 'block', amount: 10 }] },
    { id: 'lunge', name: '毒槍の踏み込み', effects: [{ kind: 'damage', amount: 13, element: 'poison' }] },
  ],
});
