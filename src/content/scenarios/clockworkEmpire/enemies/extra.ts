// 機械仕掛けの帝国：追加の敵（K3 D）。街・工場・炉の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { clockworkDog } from './valley';

export const smokeStackCrow: EnemyDef = {
  id: 'smokeStackCrow',
  name: '煙突の鴉',
  icon: '🐦',
  maxHp: 20,
  baseLevel: 2,
  size: 0.8,
  exp: 5,
  gold: 3,
  weak: ['ice'], // 煙突の熱で動く鴉。冷やすと弱る（組の相手 conveyorBot が雷に弱いので、雷以外の弱点にする）
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'peck', name: '煤けたくちばし', effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'ember', name: '火の粉を運ぶ', effects: [{ kind: 'damage', amount: 2 }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
    { id: 'smoke', name: '煙に隠れる', effects: [{ kind: 'block', amount: 4 }] },
  ],
};

export const pressGolem: EnemyDef = {
  id: 'pressGolem',
  name: 'プレス機の人形',
  icon: '⚙',
  maxHp: 38,
  baseLevel: 5,
  size: 1.15,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'raise', name: 'プレスを上げる', effects: [{ kind: 'block', amount: 8 }] },
    { id: 'press', name: '重いプレス', effects: [{ kind: 'damage', amount: 15 }] },
    // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 「蒸気を抜く」（ブロック5＋4ダメージ）を浄化にした（名前と ID はそのまま）。
    // 自分に悪い状態異常がある時は割り込む（割り込んだら次の2ターンは割り込まない）。順番の最後にも残す。3つ目の地域なので1種類につき6回復
    { id: 'vent', name: '蒸気を抜く', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, brief: '消した数だけ蒸気', hint: '状態異常を全部消し、消した1種類につき味方全員に5（回復はしない）。種類を増やしすぎない', effects: [{ kind: 'purify', amount: 0, blast: 5 }] },
  ],
};

export const ironClockworkDog: EnemyDef = makeVariant(clockworkDog, {
  id: 'ironClockworkDog',
  name: '鋼のゼンマイ犬',
  aura: 'iron',
  maxHp: 40,
  baseLevel: 7,
  exp: 13,
  gold: 9,
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 亜種のこの敵だけ「鋼の連続噛みつき」（5×2）を手負い狙いに置き換えた（10ダメージ・1回。
  // HPが半分以下なら×1.5）。ID は古い保存のために残す。1ターン目に予告する（もとから順番の1番目）。元のゼンマイの犬は変えていない
  firstActionId: 'bite',
  actions: [
    { id: 'bite', name: '喉笛に食らいつく', big: true, behavior: 'hunt', brief: '状態異常の者を狙う', hint: '悪い状態異常の付いた味方を狙い、状態異常があると×1.5（HPは見ない）。いなければHPの割合が低い味方。状態異常を払えば軽い', effects: [{ kind: 'damage', amount: 10, lowHpMul: 1.5, huntBy: 'afflicted', huntWhen: 'afflicted' }] },
    { id: 'bite2', name: '鋼の激しい噛みつき', effects: [{ kind: 'damage', amount: 4, hits: 3 }] },
    { id: 'rewind', name: '鋼板を締める', effects: [{ kind: 'block', amount: 8 }] },
  ],
  abilities: [{ name: '鋼の装甲', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
});
