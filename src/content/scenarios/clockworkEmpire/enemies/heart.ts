// 機械仕掛けの帝国：大機械の心臓部。銅の騎士・炉のゴーレム・大機械。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';

export const copperKnight: EnemyDef = {
  id: 'copperKnight',
  name: '銅の騎士',
  icon: '🛡',
  maxHp: 56,
  baseLevel: 9,
  size: 1.1,
  exp: 24,
  gold: 18,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'lower', name: '槍を構える', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'charge', name: '槍の突撃', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'sweep', name: '槍の薙ぎ払い', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
};

export const furnaceGolem: EnemyDef = {
  id: 'furnaceGolem',
  name: '炉のゴーレム',
  icon: '🔥',
  maxHp: 100,
  baseLevel: 9,
  size: 1.2,
  exp: 35,
  gold: 30,
  weak: ['ice'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'blast', name: '炉の熱風', big: true, effects: [{ kind: 'damage', amount: 8, element: 'fire', to: 'foes' }] },
    { id: 'fist', name: '灼けた拳', big: true, effects: [{ kind: 'damage', amount: 17, element: 'fire' }] },
    { id: 'stoke', name: '火をくべる', effects: [{ kind: 'block', amount: 16 }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    { id: 'slag', name: '溶けた鉄', effects: [{ kind: 'damage', amount: 7, hits: 2 }] },
  ],
  abilities: [{ name: '赤く燃える炉心', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '暴走する炉のゴーレム',
      pattern: 'sequence',
      openingActionId: 'fuOverheat',
      rule: '数え読み3: 3回の予告の後に大技（数えている間に BREAK すると1つ戻る。守りを固めて受ける）',
      actions: [
        { id: 'fuOverheat', name: '炉心の暴走', big: true, scripted: true, countdown: { actionId: 'fuMeltdown', turns: 3 }, hint: '数え読みが始まる: 3回の予告の後に「炉心溶融」。数えている間に BREAK すると1つ戻る', effects: [{ kind: 'block', amount: 10 }] },
        { id: 'fuMeltdown', name: '炉心溶融', big: true, scripted: true, hint: '味方全員に大きな火のダメージ。ブロックで受けるか、氷の弱点で BREAK して威力を半分にする', effects: [{ kind: 'damage', amount: 14, element: 'fire', to: 'foes' }] },
        { id: 'fuRedFist', name: '赤熱の拳', effects: [{ kind: 'damage', amount: 17, element: 'fire' }] },
        { id: 'fuSpatter', name: '溶けた鉄の飛沫', effects: [{ kind: 'damage', amount: 7, hits: 2 }] },
      ],
    },
  ],
};

export const greatMachine: EnemyDef = {
  id: 'greatMachine',
  name: '大機械',
  icon: '♛',
  maxHp: 400,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'gears', name: '歯車の嵐', big: true, effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
    { id: 'parts', name: '部品にする', big: true, effects: [{ kind: 'damage', amount: 22 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'plate', name: '装甲板を閉じる', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '帝国の鋼鉄', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    // ボスの段階（2026-11-14）: 麻痺（今の「繋ぐ」）＋呼ぶ（機械の猟犬。順番でもう1回）。答え: 雷で BREAK・先に倒す
    { belowHpPct: 60, name: '人を繋ぐ大機械', pattern: 'sequence', openingActionId: 'callParts', rule: '機械の猟犬を呼ぶ（2回まで。雷で BREAK すると止まる。先に倒すか、全体攻撃で）', actions: [
      { id: 'callParts', name: '機械の猟犬を放つ', big: true, behavior: 'call', hint: 'ゼンマイの犬を1体呼ぶ（2回まで。倒しても報酬なし）。雷の弱点で BREAK すると止まる。先に倒すか、全体攻撃で', effects: [{ kind: 'summonEnemy', enemy: 'clockworkDog', uses: 2, orElse: 'press' }, { kind: 'block', amount: 10 }] },
      { id: 'link', name: '繋ぐ', big: true, effects: [{ kind: 'applyStatus', status: 'paralysis', amount: 1, to: 'foes' }, { kind: 'damage', amount: 8, element: 'thunder', to: 'foes' }] },
      { id: 'press', name: '帝国の圧延', big: true, effects: [{ kind: 'damage', amount: 26 }] },
      { id: 'reroute', name: '動力を回す', effects: [{ kind: 'block', amount: 24 }, { kind: 'heal', amount: 10, to: 'self' }] },
      { id: 'steam', name: '白い蒸気の奔流', big: true, effects: [{ kind: 'damage', amount: 7, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    ] },
    // ボスの段階（2026-11-14）: 盾砕き（順番にも入る）。答え: 守りに頼らない・雷で BREAK
    { belowHpPct: 30, name: '全力稼働の大機械', pattern: 'sequence', openingActionId: 'crushPlates', rule: '当たるとブロックを全部壊す一撃（守りに頼らず受ける。雷で BREAK すると威力が半分）', actions: [
      { id: 'crushPlates', name: '装甲ごと押し潰す', big: true, behavior: 'shatter', hint: '当たるとブロックを全部壊す。BREAK するか、ブロックに頼らずに受ける', effects: [{ kind: 'shieldBreak' }, { kind: 'damage', amount: 20 }] },
      { id: 'fullPower', name: '全力稼働', big: true, effects: [{ kind: 'damage', amount: 16, element: 'thunder', to: 'foes' }] },
      { id: 'crush', name: '鋼の歯車で砕く', big: true, effects: [{ kind: 'damage', amount: 32 }] },
      { id: 'overheat', name: '炉の暴走', big: true, effects: [{ kind: 'block', amount: 26 }, { kind: 'damage', amount: 8, element: 'fire', to: 'foes' }] },
    ] },
  ],
};

export const ironCopperKnight: EnemyDef = makeVariant(copperKnight, {
  id: 'ironCopperKnight',
  name: '鋼の銅騎士',
  aura: 'iron',
  abilities: [{ name: '鋼の重ね鎧', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 12 }] } }],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: 'ゼンマイを巻く鋼の銅騎士',
      pattern: 'sequence',
      openingActionId: 'ckWindUp',
      rule: '数え読み3: 3回の予告の後に大技（数えている間に BREAK すると1つ戻る。守りを固めて受ける）',
      actions: [
        { id: 'ckWindUp', name: 'ゼンマイを巻く', big: true, scripted: true, countdown: { actionId: 'ckFullCharge', turns: 3 }, hint: '数え読みが始まる: 3回の予告の後に「全力の槍突撃」。数えている間に BREAK すると1つ戻る', effects: [{ kind: 'block', amount: 12 }] },
        { id: 'ckFullCharge', name: '全力の槍突撃', big: true, scripted: true, hint: '大きな一撃。ブロックで受けるか、雷の弱点で BREAK して威力を半分にする', effects: [{ kind: 'damage', amount: 28 }] },
        { id: 'ckThrust', name: '鋼の槍突き', effects: [{ kind: 'damage', amount: 16 }] },
        { id: 'ckWideSweep', name: '鋼の薙ぎ払い', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
      ],
    },
  ],
});
