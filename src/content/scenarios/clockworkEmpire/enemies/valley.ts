// 機械仕掛けの帝国：蒸気の谷（蒸気の発電所）。蒸気の精と硬い機械。火傷を使う敵が多い。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { oilSlime } from './factory';

export const steamSprite: EnemyDef = {
  id: 'steamSprite',
  name: '蒸気の精',
  icon: '♨',
  maxHp: 26,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 癒し封じを1ターン目に予告する（2ターン目からは蒸気の噴射・熱い湯気・癒し封じの順）
  firstActionId: 'mist',
  actions: [
    { id: 'scald', name: '熱い湯気', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
    // 「白い霧」を癒し封じに置き換えた。ID は古い保存のために残す。3つ目の地域なのでブロック8（BREAK されると行動ごと止まる）
    { id: 'mist', name: 'まとわりつく熱気', big: true, behavior: 'healSeal', hint: '味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う', effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes' }, { kind: 'block', amount: 8 }] },
    { id: 'jet', name: '蒸気の噴射', effects: [{ kind: 'damage', amount: 10, element: 'fire' }] },
  ],
};

export const boilerCrab: EnemyDef = {
  id: 'boilerCrab',
  name: 'ボイラーの蟹',
  icon: '🦀',
  maxHp: 32,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['ice', 'thunder'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'shell', name: '鉄の甲羅', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'pinch', name: '熱いはさみ', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'double', name: '両のはさみ', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
  ],
  abilities: [{ name: '熱い甲羅', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4 }] } }],
};

export const wrenchGolem: EnemyDef = {
  id: 'wrenchGolem',
  name: 'スパナのゴーレム',
  icon: '🔧',
  maxHp: 34,
  baseLevel: 5,
  size: 1.1,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'swing', name: 'スパナの一撃', effects: [{ kind: 'damage', amount: 11 }] },
    // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 「ネジを締め直す」を仲間を呼ぶ（壊れた人形）に置き換えた。ID は古い保存のために残す。
    // 呼べる時は優先・2ターン続けては呼ばない・1戦闘に2回まで。呼べない時は「スパナの一撃」。3つ目の地域なのでブロック8
    { id: 'tighten', name: '人形を組み直す', big: true, behavior: 'call', cutIn: { when: 'canSummon', rest: 1, noRepeat: true }, hint: '仲間を1体呼ぶ。その前に倒すか、BREAK する', effects: [{ kind: 'summonEnemy', enemy: 'brokenAutomaton', uses: 2, call: true, orElse: 'swing' }, { kind: 'block', amount: 8 }] },
    { id: 'bash', name: '振り下ろし', effects: [{ kind: 'damage', amount: 7 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
};

// ネジが切れると休む: 連続の噛みつき2回のあと、ネジを巻く（休む）
export const clockworkDog: EnemyDef = {
  id: 'clockworkDog',
  name: 'ゼンマイの犬',
  icon: '🐕',
  maxHp: 28,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['thunder', 'fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '連続噛みつき', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'bite2', name: '激しい噛みつき', effects: [{ kind: 'damage', amount: 4, hits: 3 }] },
    { id: 'rewind', name: 'ネジ切れで休む', effects: [{ kind: 'block', amount: 4 }] },
  ],
};

export const steamTurretLord: EnemyDef = {
  id: 'steamTurretLord',
  name: '蒸気砲台長',
  icon: '🗼',
  maxHp: 60,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ['ice', 'thunder'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 手数読みを1ターン目に予告する（もとから順番の1番目）
  firstActionId: 'aim',
  actions: [
    // 「照準を合わせる」を手数読みに置き換えた。ID は古い保存のために残す。3つ目の地域なのでブロック8（BREAK されると付かない）
    { id: 'aim', name: '動きに照準を合わせる', big: true, behavior: 'punish', hint: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 4 }, { kind: 'block', amount: 8 }] },
    { id: 'barrage', name: '蒸気の一斉砲撃', big: true, effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
    { id: 'cannon', name: '大砲の直撃', big: true, effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'scald', name: '熱い蒸気幕', effects: [{ kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }, { kind: 'block', amount: 5 }] },
  ],
  abilities: [{ name: '砲台の装甲', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
};

export const runawayBoiler: EnemyDef = {
  id: 'runawayBoiler',
  name: '暴走ボイラー',
  icon: '♨',
  maxHp: 210,
  baseLevel: 7,
  size: 1.5,
  exp: 110,
  gold: 110,
  weak: ['ice'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'steam', name: '噴き出す蒸気', big: true, effects: [{ kind: 'damage', amount: 6, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    { id: 'valve', name: '安全弁が飛ぶ', big: true, effects: [{ kind: 'damage', amount: 15, element: 'fire' }] },
    { id: 'pressure', name: '圧力をためる', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '鋼の釜', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    // ボスの段階（2026-11-14）: 数え読み（3回で大爆発。くり返す）。答え: 氷で BREAK して数を戻す・その前に倒す
    { belowHpPct: 50, name: '爆発寸前のボイラー', pattern: 'sequence', openingActionId: 'pressureUp', rule: '数え読み: 3回の予告の後に「大爆発」（数えている間に BREAK すると、圧が抜けて1つ戻る）', actions: [
      { id: 'pressureUp', name: '圧力計が振り切れる', scripted: true, countdown: { actionId: 'blast', turns: 3 }, hint: '3回の予告の後に「大爆発」（味方全員に火20・火傷2）。数えている間に BREAK すると、圧が抜けて数が1つ戻る。数えが0になる前に倒すか、守りを固める', effects: [{ kind: 'block', amount: 14 }] },
      { id: 'blast', name: '大爆発', big: true, scripted: true, effects: [{ kind: 'damage', amount: 20, element: 'fire', to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }] },
      { id: 'burst', name: '爆発寸前の熱波', big: true, effects: [{ kind: 'damage', amount: 11, element: 'fire', to: 'foes' }] },
      { id: 'rivets', name: '飛び散る鋲', big: true, effects: [{ kind: 'damage', amount: 5, hits: 3 }] },
      { id: 'hiss', name: '悲鳴のような汽笛', effects: [{ kind: 'block', amount: 20 }, { kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }] },
    ] },
  ],
};

export const emberOilSlime: EnemyDef = makeVariant(oilSlime, {
  id: 'emberOilSlime',
  name: '熾火の油スライム',
  aura: 'ember',
  maxHp: 30,
  baseLevel: 5,
  exp: 10,
  gold: 6,
  weak: ['ice'],
  resist: ['fire', 'poison'],
  actions: [
    { id: 'splash', name: '燃える油はね', effects: [{ kind: 'damage', amount: 5, element: 'fire' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'slam', name: '熾火の体当たり', effects: [{ kind: 'damage', amount: 9, element: 'fire' }] },
    { id: 'pool', name: '燃える油だまり', effects: [{ kind: 'block', amount: 7 }] },
  ],
});
