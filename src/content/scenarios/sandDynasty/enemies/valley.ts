// 砂塵の王朝：王家の谷と石像の神殿のボス。石像・土人形は雷が弱点。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { mummy, vulture } from './dunes';

export const sandWorm: EnemyDef = {
  id: 'sandWorm',
  name: '砂虫',
  icon: '🪱',
  maxHp: 56,
  baseLevel: 7,
  size: 1.1,
  exp: 13,
  gold: 9,
  weak: ['ice'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'devour', name: '丸呑み', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'burrow', name: '砂に潜る', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'quake', name: '地中からの突き上げ', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
};

export const clayGolem: EnemyDef = {
  id: 'clayGolem',
  name: '土人形',
  icon: '🗿',
  maxHp: 44,
  baseLevel: 7,
  size: 1.05,
  exp: 13,
  gold: 9,
  weak: ['thunder', 'ice'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: ほかの敵がいる時は、1ターン目に必ず「身代わりの土人形」（1体だけの時は重い拳）
  firstActionId: 'harden',
  actions: [
    // 「粘土を固める」をかばうに置き換えた。ID は古い保存のために残す。4つ目の地域なのでブロック10（BREAK されると行動ごと止まる）
    { id: 'harden', name: '身代わりの土人形', big: true, behavior: 'guard', fallbackIfAloneId: 'fist', hint: '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る', effects: [{ kind: 'guardAllies' }, { kind: 'block', amount: 10 }] },
    { id: 'fist', name: '重い拳', effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'slam', name: '叩きつけ', effects: [{ kind: 'damage', amount: 7 }, { kind: 'block', amount: 6 }] },
  ],
};

export const mummyArcher: EnemyDef = {
  id: 'mummyArcher',
  name: 'ミイラの弓兵',
  icon: '🏹',
  maxHp: 34,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'arrow', name: '朽ちた矢', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'volley', name: '矢の雨', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
    { id: 'aim', name: '狙いを定める', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

export const cursedPriest: EnemyDef = {
  id: 'cursedPriest',
  name: '呪われた神官',
  icon: '☥',
  maxHp: 36,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'hex', name: '王家の呪詛', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 5, element: 'dark' }] },
    // 仲間の傷を癒やす。一人きりの時は自分の守りに変える
    { id: 'mend', name: '死者への祈り', effects: [{ kind: 'heal', amount: 10, to: 'lowestAlly' }], fallbackIfAloneId: 'shroud' },
    { id: 'staff', name: '生命の杖で打つ', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'shroud', name: '黒い帳', effects: [{ kind: 'block', amount: 9 }] },
  ],
};

export const sphinxCub: EnemyDef = {
  id: 'sphinxCub',
  name: 'スフィンクスの子',
  icon: '🛡',
  maxHp: 80,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['dark'],
  resist: ['holy', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'riddle', name: '謎かけ', effects: [{ kind: 'drainFocus', amount: 2 }, { kind: 'damage', amount: 6 }] },
    { id: 'claws', name: '獅子の爪', big: true, effects: [{ kind: 'damage', amount: 8, hits: 2 }] },
    { id: 'wings', name: '翼でくるむ', effects: [{ kind: 'block', amount: 14 }] },
    { id: 'puzzle', name: '答えのない問い', effects: [{ kind: 'drainFocus', amount: 1, to: 'foes' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
  abilities: [{ name: '見透かす瞳', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const sandSerpentLord: EnemyDef = {
  id: 'sandSerpentLord',
  name: '砂の大蛇',
  icon: '🛡',
  maxHp: 90,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['ice'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'fang', name: '大蛇の毒牙', effects: [{ kind: 'damage', amount: 9 }, { kind: 'applyStatus', status: 'poison', amount: 3 }] },
    { id: 'constrict', name: '締め付け', big: true, effects: [{ kind: 'damage', amount: 7, hits: 2 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'hood', name: '頭巾を広げる', effects: [{ kind: 'block', amount: 14 }] },
    { id: 'spray', name: '毒の霧', effects: [{ kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' }] },
  ],
  abilities: [{ name: '砂中からの奇襲', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'poison', amount: 2, to: 'randomFoe' }] } }],
};

export const stoneGuardianBeast: EnemyDef = {
  id: 'stoneGuardianBeast',
  name: '砂の守護獣',
  icon: '♛',
  maxHp: 270,
  baseLevel: 9,
  size: 1.6,
  exp: 160,
  gold: 160,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'paw', name: '石の前脚', big: true, effects: [{ kind: 'damage', amount: 22 }] },
    { id: 'guard', name: '神殿の守り', effects: [{ kind: 'block', amount: 20 }] },
    { id: 'tail', name: '砂岩の尾', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
  abilities: [{ name: '砂岩の体', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    { belowHpPct: 50, name: '咆哮する守護獣', pattern: 'sequence', actions: [
      { id: 'roar', name: '石の咆哮', big: true, effects: [{ kind: 'damage', amount: 12, to: 'foes' }] },
      { id: 'pounce', name: '砕ける跳びかかり', big: true, effects: [{ kind: 'damage', amount: 28 }] },
      { id: 'guard', name: 'ひび割れた守り', effects: [{ kind: 'block', amount: 24 }] },
    ] },
  ],
};

export const cursedMummy: EnemyDef = makeVariant(mummy, {
  id: 'cursedMummy', name: '呪詛のミイラ', aura: 'shadow', maxHp: 40, baseLevel: 7, exp: 13, gold: 9,
  weak: ['holy'], resist: ['poison', 'dark'],
  actions: [
    { id: 'grab', name: '呪詛の手', effects: [{ kind: 'damage', amount: 11, element: 'dark' }] },
    { id: 'curse', name: '王墓の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 5, element: 'dark' }] },
    // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 亜種のこの敵だけ「黒い包帯」を浄化に置き換えた。ID は古い保存のために残す。元のミイラは変えていない。
    // 自分に悪い状態異常がある時は割り込む（割り込んだら次の2ターンは割り込まない）。順番の最後にも残す。4つ目の地域なので1種類につき8回復
    { id: 'wrap', name: '包帯を巻き直す', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, hint: '状態異常を全部消して回復する。その前に起爆するか、BREAK する', effects: [{ kind: 'purify', amount: 8 }] },
  ],
});

export const stormVulture: EnemyDef = makeVariant(vulture, {
  id: 'stormVulture', name: '雷禿鷲', aura: 'storm', maxHp: 32, baseLevel: 7, exp: 13, gold: 9,
  weak: ['ice'], resist: ['thunder'],
  // 敵の特殊な行動・第2弾: 元の禿鷲の「1ターン目の手負い狙い」が伝わらないように、1ターン目の行動は無し（今までどおり、順番の1番目から）
  firstActionId: undefined,
  actions: [
    { id: 'talons', name: '雷の鉤爪', effects: [{ kind: 'damage', amount: 6, hits: 2, element: 'thunder' }] },
    { id: 'circle', name: '雷雲を旋回する', effects: [{ kind: 'block', amount: 7 }] },
    { id: 'peck', name: '稲妻の急降下', effects: [{ kind: 'damage', amount: 11, element: 'thunder' }] },
  ],
});
