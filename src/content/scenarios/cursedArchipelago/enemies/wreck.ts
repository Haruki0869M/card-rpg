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
    { id: 'slam', name: '岩の体当たり', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'spores', name: '殻を飛ばす', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
    // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 「フジツボの殻」を浄化に置き換えた。ID は古い保存のために残す。
    // 自分に悪い状態異常がある時は割り込む（割り込んだら次の2ターンは割り込まない）。順番の最後にも残す（1番目から最後へ移した）。
    // 5つ目の地域なので1種類につき8回復
    { id: 'crust', name: '古い殻を落とす', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, hint: '状態異常を全部消して回復する。その前に起爆するか、BREAK する', effects: [{ kind: 'purify', amount: 8 }] },
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
  // 敵の特殊な行動・第2弾: 元の人喰い鮫の「1ターン目の手負い狙い」が伝わらないように、1ターン目の行動は無し（今までどおり、順番の1番目から）
  firstActionId: undefined,
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
    { id: 'sweep', name: '甲板を薙ぐ', big: true, effects: [{ kind: 'damage', amount: 10, to: 'foes' }] },
    { id: 'wrap', name: '巻きつく', effects: [{ kind: 'damage', amount: 12 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'sink', name: '海に沈む', effects: [{ kind: 'block', amount: 18 }] },
    { id: 'crush', name: '船ごと締め上げる', big: true, effects: [{ kind: 'damage', amount: 21 }] },
  ],
  abilities: [{ name: '深海の怪力', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '怒れるクラーケンの触腕',
      pattern: 'sequence',
      openingActionId: 'ktDeepCall',
      rule: '仲間を呼ぶ（2回まで。弱点で BREAK すると止まる。先に倒すか、全体攻撃で）',
      actions: [
        { id: 'ktDeepCall', name: '深海から呼ぶ', big: true, behavior: 'call', brief: '幽霊水夫を1体呼ぶ', hint: '幽霊水夫を1体呼ぶ。雷の弱点で BREAK すると止まる。先に倒すか、全体攻撃で', effects: [{ kind: 'summonEnemy', enemy: 'ghostDeckhand', uses: 2, call: true, orElse: 'ktSqueeze' }] },
        { id: 'ktSqueeze', name: '締め上げる', effects: [{ kind: 'damage', amount: 18 }] },
        { id: 'ktLash', name: '触腕の薙ぎ', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
      ],
    },
  ],
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
    { id: 'storm', name: '嵐を呼ぶ', big: true, effects: [{ kind: 'damage', amount: 7, element: 'thunder', to: 'foes' }] },
    { id: 'hex', name: '雷雲の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 7, element: 'thunder' }] },
    { id: 'wave', name: '稲妻の波', big: true, effects: [{ kind: 'damage', amount: 16, element: 'thunder' }] },
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
    { id: 'salute', name: '祝いの礼砲', big: true, effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
    { id: 'oath', name: '守れなかった誓い', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'block', amount: 14 }] },
    { id: 'saber', name: '提督の儀礼剣', big: true, effects: [{ kind: 'damage', amount: 25 }] },
  ],
  abilities: [{ name: '王冠号の甲板', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
  phases: [
    {
      belowHpPct: 60,
      name: '花嫁を探す提督',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 手負い狙い（順番にも入る）。答え: 弱った味方を守る（挑発・ブロック）・聖で BREAK
      openingActionId: 'seekWeak',
      rule: 'HPの割合がいちばん低い味方を狙い、半分以下なら×1.5（弱った味方を守る・聖で BREAK）',
      actions: [
        { id: 'seekWeak', name: '沈みゆく者を探す', big: true, behavior: 'hunt', hint: 'HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5', effects: [{ kind: 'damage', amount: 16, lowHpMul: 1.5 }] },
        { id: 'veil', name: '花嫁のヴェール', big: true, effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 7, to: 'foes' }] },
        { id: 'waltz', name: '霧の中の舞踏', big: true, effects: [{ kind: 'damage', amount: 10, hits: 2 }] },
        { id: 'ring', name: '沈んだ指輪', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 9 }] },
      ],
    },
    {
      belowHpPct: 30,
      name: '嘆きの亡霊提督',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 溜め（王冠号と共に。順番でもくり返す）。答え: 溜めを聖で BREAK・守り
      openingActionId: 'crownCall',
      rule: '王冠号を呼び寄せ、次の予告で「王冠号と共に」（溜めを聖で BREAK すると、その一撃も消える）',
      actions: [
        { id: 'crownCall', name: '王冠号を呼び寄せる', big: true, chargeTo: 'sink', hint: '次の予告が「王冠号と共に」（単体34）になる。聖の弱点で BREAK すると溜めが止まり、その一撃も消える', effects: [{ kind: 'block', amount: 16 }] },
        { id: 'grief', name: '婚礼の鐘は鳴らず', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'block', amount: 18 }] },
        { id: 'broadside', name: '最後の一斉射撃', big: true, effects: [{ kind: 'damage', amount: 18, to: 'foes' }] },
        { id: 'sink', name: '王冠号と共に', big: true, effects: [{ kind: 'damage', amount: 34 }] },
      ],
    },
  ],
};
