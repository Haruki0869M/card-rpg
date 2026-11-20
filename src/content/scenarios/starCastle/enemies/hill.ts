// 星降る天空城：星見の丘（星見の天文台）。月の獣は聖に弱く、星のかけらは聖と闇の両方に強い
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';

export const shootingStarBird: EnemyDef = {
  id: 'shootingStarBird',
  name: '流れ星の鳥',
  icon: '☄',
  maxHp: 30,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'streak', name: '流星の突進', effects: [{ kind: 'damage', amount: 12, element: 'holy' }] },
    { id: 'flutter', name: '光の羽ばたき', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'glide', name: '夜空を滑る', effects: [{ kind: 'block', amount: 6 }] },
  ],
  abilities: [{ name: '流れ星の速さ', effect: { when: 'battleStart', do: [{ kind: 'damage', amount: 4, to: 'randomFoe' }] } }],
};

export const moonRabbit: EnemyDef = {
  id: 'moonRabbit',
  name: '月のウサギ',
  icon: '🐇',
  maxHp: 32,
  baseLevel: 5,
  size: 0.85,
  exp: 10,
  gold: 6,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'mallet', name: '月の杵', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'hop', name: '跳ねる杵つき', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
    // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 「月影の呪い」（呪い2＋ブロック4）を浄化に置き換えた。ID は古い保存のために残す。
    // 元の呪いは弱めて残す（狙った1人に呪い1。fix-plan §2 の 2-4）。自分に悪い状態異常がある時は割り込む（割り込んだら次の2ターンは割り込まない）。
    // 順番の最後にも残す（2番目から最後へ移した）。3つ目の地域なので1種類につき6回復
    { id: 'hex', name: '月の薬を搗く', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, brief: '仲間ごと清める', hint: '敵みんなの状態異常を消し、1種類につき回復4。狙った1人に呪い1。うさぎを先に倒す', effects: [{ kind: 'purify', amount: 4, to: 'allies' }, { kind: 'applyStatus', status: 'curse', amount: 1 }] },
  ],
};

export const starFragment: EnemyDef = {
  id: 'starFragment',
  name: '星のかけら',
  icon: '⭐',
  maxHp: 25,
  baseLevel: 5,
  size: 0.75,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  resist: ['holy', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'shower', name: '星くずの雨', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
    { id: 'shine', name: 'またたき', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'shard', name: '尖った光', effects: [{ kind: 'damage', amount: 10 }] },
  ],
};

export const starDustScribe: EnemyDef = {
  id: 'starDustScribe',
  name: '星屑の書記',
  icon: '📜',
  maxHp: 63,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 22,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'quill', name: '星屑の筆', big: true, effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'mark', name: '綴じられた運命', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    { id: 'page', name: '呪いの頁', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 6 }] },
    { id: 'binding', name: '頁の盾', effects: [{ kind: 'block', amount: 11 }] },
  ],
  abilities: [{ name: '書き換えの頁', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'randomFoe' }] } }],
};

export const starLibrarian: EnemyDef = {
  id: 'starLibrarian',
  name: '星の司書',
  icon: '♛',
  maxHp: 210,
  baseLevel: 7,
  size: 1.4,
  exp: 110,
  gold: 110,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'index', name: '星の索引', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'block', amount: 8 }] },
    { id: 'tome', name: '星図の一撃', big: true, effects: [{ kind: 'damage', amount: 19, element: 'holy' }] },
    { id: 'curse', name: '禁書の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 7 }] },
  ],
  abilities: [{ name: '閉じた書架', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '星の雨を呼ぶ司書',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 弱点が入れ替わる（予告ごと: 火・雷・闇・氷。予告に出る）。答え: 合う属性の札をその時に
      openingActionId: 'turnPage',
      rule: 'ページをめくるたび、弱点が入れ替わる（今の弱点は予告に出る。合う属性の札をその時に）',
      actions: [
        { id: 'turnPage', name: 'ページをめくる', scripted: true, weakWhile: ['ice'], hint: 'この予告の間の弱点は氷だけ。ページをめくるたび（予告ごと）に弱点が変わる', effects: [{ kind: 'block', amount: 12 }, { kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }] },
        { id: 'rain', name: '星の雨', big: true, weakWhile: ['fire'], effects: [{ kind: 'damage', amount: 12, element: 'holy', to: 'foes' }] },
        { id: 'shelf', name: '書架の壁', weakWhile: ['thunder'], effects: [{ kind: 'block', amount: 16 }, { kind: 'damage', amount: 7 }] },
        { id: 'meteor', name: '落ちる一番星', big: true, weakWhile: ['dark'], effects: [{ kind: 'damage', amount: 26 }] },
        { id: 'fate', name: '書かれた結末', big: true, weakWhile: ['ice'], effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
      ],
    },
  ],
};

export const shadowStarDustScribe: EnemyDef = makeVariant(starDustScribe, {
  id: 'shadowStarDustScribe',
  name: '影の星屑の書記',
  aura: 'shadow',
  actions: [
    { id: 'quill', name: '影の筆', big: true, effects: [{ kind: 'damage', amount: 11, element: 'dark' }] },
    { id: 'mark', name: '影に綴じる', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    { id: 'page', name: '闇の頁', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 6, element: 'dark' }] },
    { id: 'binding', name: '影の盾', effects: [{ kind: 'block', amount: 11 }] },
  ],
});

export const angelStatue: EnemyDef = {
  id: 'angelStatue',
  name: '天使の像',
  icon: '🗿',
  maxHp: 34,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'sword', name: '大理石の剣', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'pray', name: '石の祈り', effects: [{ kind: 'block', amount: 8 }] },
    { id: 'gaze', name: '見下ろす瞳', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
  ],
  abilities: [{ name: '裁きの反撃', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 3, perTurn: 2 }] } }],
};
