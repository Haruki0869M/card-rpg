// 砂塵の王朝：砂丘（砂の海）と影の書庫のボス。ミイラは火と聖が弱点。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { sandScorpion } from './ruins';

export const vulture: EnemyDef = {
  id: 'vulture',
  name: '禿鷲',
  icon: '🦅',
  maxHp: 26,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 手負い狙いを1ターン目に予告する（2ターン目からは二度の鉤爪・空を旋回する・手負い狙いの順）
  firstActionId: 'peck',
  actions: [
    { id: 'talons', name: '二度の鉤爪', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
    { id: 'circle', name: '空を旋回する', effects: [{ kind: 'block', amount: 6 }] },
    // 「弱った所をつつく」を、名前のとおりの手負い狙いにした（同じ9ダメージ・HPが半分以下なら×1.5）。名前と ID はそのまま
    { id: 'peck', name: '弱った所をつつく', big: true, behavior: 'hunt', cutIn: { when: 'foeLow', rest: 1, noRepeat: true }, brief: '弱った者がいると降りる', hint: 'HPの割合がいちばん低い味方を狙う（半分以下なら×1.5）。味方のだれかがHP半分を切ると、順番を飛ばして降りてくる', effects: [{ kind: 'damage', amount: 9, lowHpMul: 1.5 }] },
  ],
};

export const mummy: EnemyDef = {
  id: 'mummy',
  name: 'ミイラ',
  icon: '🧟',
  maxHp: 32,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['fire', 'holy'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'grab', name: '包帯の手', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'curse', name: '墓の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 4 }] },
    { id: 'wrap', name: '包帯を巻き直す', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

export const sandSprite: EnemyDef = {
  id: 'sandSprite',
  name: '砂の精',
  icon: '✨',
  maxHp: 24,
  baseLevel: 5,
  size: 0.8,
  exp: 10,
  gold: 6,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 癒し封じを1ターン目に予告する（2ターン目からは目つぶしの砂・砂粒の渦・癒し封じの順）
  firstActionId: 'veil',
  actions: [
    { id: 'grit', name: '目つぶしの砂', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 4 }] },
    { id: 'whirl', name: '砂粒の渦', effects: [{ kind: 'damage', amount: 8 }] },
    // 「砂の帳」を癒し封じに置き換えた。ID は古い保存のために残す。3つ目の地域なのでブロック8（BREAK されると行動ごと止まる）
    { id: 'veil', name: '渇きの砂', big: true, behavior: 'healSeal', brief: '守りの無い者の回復を封じる', hint: 'ブロックの無い味方だけ、回復が2ターン半分になる。ブロックを張っておけば防げる', effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes', onlyIf: { noBlock: true } }, { kind: 'block', amount: 8 }] },
  ],
};

export const dustDevil: EnemyDef = {
  id: 'dustDevil',
  name: '砂旋風',
  icon: '🌪',
  maxHp: 28,
  baseLevel: 5,
  size: 0.95,
  exp: 10,
  gold: 6,
  weak: ['ice'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'gust', name: '砂塵の突風', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
    { id: 'spin', name: '回転を強める', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'blast', name: '巻き上げる', effects: [{ kind: 'damage', amount: 9 }] },
  ],
};

export const royalGuardMummy: EnemyDef = {
  id: 'royalGuardMummy',
  name: '王家の衛兵ミイラ',
  icon: '🛡',
  maxHp: 55,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ['fire'],
  resist: ['poison', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'shield', name: '王家の大盾', effects: [{ kind: 'block', amount: 14 }] },
    { id: 'khopesh', name: '鎌剣の一閃', big: true, effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'bash', name: '盾で打つ', effects: [{ kind: 'damage', amount: 6 }, { kind: 'block', amount: 6 }] },
    { id: 'oath', name: '王への誓い', effects: [{ kind: 'block', amount: 8, to: 'allies' }] },
  ],
  abilities: [{ name: '墓所の守り', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const scribeShade: EnemyDef = {
  id: 'scribeShade',
  name: '書記官の影',
  icon: '🛡',
  maxHp: 50,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 手数読みを1ターン目に予告する（2ターン目からは罪を書き記す・墨の刃・呪いの文字・手数読みの順）
  firstActionId: 'scroll',
  actions: [
    { id: 'record', name: '罪を書き記す', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 5 }] },
    { id: 'ink', name: '墨の刃', big: true, effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'curse', name: '呪いの文字', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }] },
    // 「巻物の帳」を手数読みに置き換えた。ID は古い保存のために残す。3つ目の地域なのでブロック8（BREAK されると付かない）
    { id: 'scroll', name: '行いを書き記す', big: true, behavior: 'punish', brief: '守りの札2枚で呪い', hint: '攻撃でない札（守り・補助）を2枚以上使った味方に、枚数ぶんの呪い（回復が半分）。攻撃の札で押せば何もしない', effects: [{ kind: 'punishPlays', amount: 0, min: 2, count: 'skill', status: { status: 'curse', amount: 1, per: true } }, { kind: 'block', amount: 8 }] },
  ],
  abilities: [{ name: '影の文字', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'randomFoe' }] } }],
};

export const shadowVizier: EnemyDef = {
  id: 'shadowVizier',
  name: '影の宰相',
  icon: '♛',
  maxHp: 210,
  baseLevel: 7,
  size: 1.5,
  exp: 110,
  gold: 110,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'decree', name: '偽りの勅令', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }] },
    { id: 'staff', name: '蛇杖の一撃', big: true, effects: [{ kind: 'damage', amount: 18, element: 'dark' }] },
    { id: 'expose', name: '弱みを暴く', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2 }, { kind: 'damage', amount: 8 }] },
    { id: 'ward', name: '書庫の結界', effects: [{ kind: 'block', amount: 16 }] },
  ],
  abilities: [{ name: '宰相の影', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    // ボスの段階（2026-11-14）: 呼ぶ（かばう人形）。答え: 聖で BREAK・全体攻撃・人形を先に
    { belowHpPct: 50, name: '影を分ける宰相', pattern: 'sequence', openingActionId: 'callDecoy', rule: '身代わりの土人形を呼び、かばわせる（聖で BREAK すると止まる。全体攻撃か、人形を先に）', actions: [
      { id: 'callDecoy', name: '身代わりを呼ぶ', big: true, behavior: 'call', hint: '土人形を1体呼ぶ（2回まで。人形は最初の番に宰相をかばう。倒しても報酬なし）。聖の弱点で BREAK すると止まる。全体攻撃で両方を削るか、人形を先に倒す。崩した人は影の呪い1を受ける', breakBacklash: [{ kind: 'applyStatus', status: 'curse', amount: 1, to: 'attacker' }], effects: [{ kind: 'summonEnemy', enemy: 'clayGolem', uses: 2, orElse: 'judgment' }, { kind: 'block', amount: 10 }] },
      { id: 'split', name: '影の分身', effects: [{ kind: 'block', amount: 26 }] },
      { id: 'shadows', name: '分身たちの刃', big: true, effects: [{ kind: 'damage', amount: 10, element: 'dark', to: 'foes' }] },
      { id: 'judgment', name: '宰相の裁き', big: true, effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 22, element: 'dark' }] },
    ] },
  ],
};

export const emberSandScorpion: EnemyDef = makeVariant(sandScorpion, {
  id: 'emberSandScorpion', name: '熾火の砂蠍', aura: 'ember', maxHp: 30, baseLevel: 5, exp: 10, gold: 6,
  weak: ['ice'], resist: ['fire'],
  actions: [
    { id: 'tail', name: '熾火の尾', effects: [{ kind: 'damage', amount: 9, element: 'fire' }] },
    { id: 'pincer', name: '焼けたはさみ', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'shell', name: '熱い砂に潜る', effects: [{ kind: 'block', amount: 7 }] },
  ],
});

export const cursedScribeShade: EnemyDef = makeVariant(scribeShade, {
  id: 'cursedScribeShade', name: '呪詛の書記官の影', aura: 'shadow',
  // 敵の特殊な行動・第2弾: 元の書記官の影の「1ターン目の手数読み」が伝わらないように、1ターン目の行動は無し（今までどおり、順番の1番目から）
  firstActionId: undefined,
  actions: [
    { id: 'record', name: '呪詛を書き記す', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 5, element: 'dark' }] },
    { id: 'ink', name: '闇の墨の刃', big: true, effects: [{ kind: 'damage', amount: 11, element: 'dark' }] },
    { id: 'curse', name: '呪いの文字', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }] },
    { id: 'scroll', name: '巻物の帳', effects: [{ kind: 'block', amount: 9 }] },
  ],
});
