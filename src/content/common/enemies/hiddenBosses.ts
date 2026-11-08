// 隠しボス（K3 C）: 各シナリオの「隠しボスの名所」（events/hiddenBoss.ts）の戦闘にだけ出る。
// 最終ボス並みの強さ。HPが半分を切ると変身する。倒すとエピック以上の装備が必ず出る（イベントの onWin）
import type { EnemyDef } from '../../../types';

/** 侵食の魔王・魔王城の荒野（戦うレベル11） */
export const hollowDemonLord: EnemyDef = {
  id: 'hollowDemonLord',
  name: '空ろな魔王の影',
  icon: '♛',
  maxHp: 400,
  baseLevel: 11,
  size: 1.5,
  exp: 260,
  gold: 220,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'whisper', name: '「まだ終わっていない」', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'block', amount: 10 }] },
    { id: 'blade', name: '先代の魔剣', effects: [{ kind: 'damage', amount: 24, element: 'dark' }] },
    { id: 'ruin', name: '廃墟の残響', effects: [{ kind: 'damage', amount: 10, to: 'foes' }] },
    { id: 'hollow', name: '空ろな鎧', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '消えない影', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
  phases: [
    { belowHpPct: 50, name: '目覚めた先代の魔王', pattern: 'sequence', actions: [
      { id: 'throne', name: '玉座への執念', effects: [{ kind: 'damage', amount: 14, element: 'dark', to: 'foes' }] },
      { id: 'erode', name: '侵食の手', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2 }, { kind: 'damage', amount: 12 }] },
      { id: 'end', name: '終わらない戦い', effects: [{ kind: 'damage', amount: 32, element: 'dark' }] },
      { id: 'shadow', name: '影の再生', effects: [{ kind: 'block', amount: 24 }, { kind: 'heal', amount: 20, to: 'self' }] },
    ] },
  ],
};

/** 呪われた群島・霧の海域（戦うレベル9） */
export const drownedBride: EnemyDef = {
  id: 'drownedBride',
  name: '沈んだ花嫁',
  icon: '♛',
  maxHp: 330,
  baseLevel: 9,
  size: 1.3,
  exp: 200,
  gold: 180,
  weak: ['holy', 'thunder'],
  resist: ['dark', 'ice'],
  pattern: 'sequence',
  actions: [
    { id: 'veil', name: '濡れたヴェール', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'block', amount: 10 }] },
    { id: 'tide', name: '冷たい潮の手', effects: [{ kind: 'damage', amount: 20, element: 'ice' }] },
    { id: 'song', name: '婚礼の歌', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
    { id: 'wait', name: '待ち続ける', effects: [{ kind: 'block', amount: 18 }, { kind: 'heal', amount: 12, to: 'self' }] },
  ],
  abilities: [{ name: '霧の花嫁衣装', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'curse', amount: 1, to: 'foes' }] } }],
  phases: [
    { belowHpPct: 50, name: '花婿を呪う花嫁', pattern: 'sequence', actions: [
      { id: 'storm', name: '嘆きの大波', effects: [{ kind: 'damage', amount: 12, element: 'ice', to: 'foes' }] },
      { id: 'ring', name: '沈んだ指輪', effects: [{ kind: 'drainFocus', amount: 2 }, { kind: 'damage', amount: 14, element: 'dark' }] },
      { id: 'vow', name: '果たされない誓い', effects: [{ kind: 'damage', amount: 28, element: 'dark' }] },
      { id: 'depth', name: '深い海へ誘う', effects: [{ kind: 'block', amount: 20 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    ] },
  ],
};

/** 星降る天空城・星見の丘（戦うレベル8） */
export const fallenStarSerpent: EnemyDef = {
  id: 'fallenStarSerpent',
  name: '落ちた星の竜',
  icon: '♛',
  maxHp: 300,
  baseLevel: 8,
  size: 1.5,
  exp: 180,
  gold: 160,
  weak: ['dark'],
  resist: ['holy', 'thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'glow', name: '星の光で目覚める', effects: [{ kind: 'block', amount: 14 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'fang', name: '星のかけらの牙', effects: [{ kind: 'damage', amount: 19 }] },
    { id: 'meteor', name: '流れ星の尾', effects: [{ kind: 'damage', amount: 8, element: 'holy', to: 'foes' }] },
    { id: 'coil', name: '星座のとぐろ', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 5 }] },
  ],
  abilities: [{ name: '星の鱗', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 4 }] } }],
  phases: [
    { belowHpPct: 50, name: '空へ帰ろうとする竜', pattern: 'sequence', actions: [
      { id: 'rain', name: '星の雨', effects: [{ kind: 'damage', amount: 11, element: 'holy', to: 'foes' }] },
      { id: 'burst', name: '砕ける星核', effects: [{ kind: 'damage', amount: 26, element: 'thunder' }] },
      { id: 'night', name: '夜空の帳', effects: [{ kind: 'block', amount: 22 }, { kind: 'heal', amount: 15, to: 'self' }] },
    ] },
  ],
};

/** 機械仕掛けの帝国・動力炉（戦うレベル10） */
export const ancientEngineHeart: EnemyDef = {
  id: 'ancientEngineHeart',
  name: '眠れる原初の機関',
  icon: '♛',
  maxHp: 360,
  baseLevel: 10,
  size: 1.5,
  exp: 230,
  gold: 200,
  weak: ['ice', 'thunder'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'turn', name: '静かな回転', effects: [{ kind: 'block', amount: 20 }] },
    { id: 'piston', name: '最初のピストン', effects: [{ kind: 'damage', amount: 22 }] },
    { id: 'steam', name: '原初の蒸気', effects: [{ kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
    { id: 'tick', name: '止まらない時計', effects: [{ kind: 'applyStatus', status: 'delay', amount: 1 }, { kind: 'damage', amount: 10 }] },
  ],
  abilities: [{ name: '止め方を知らない心臓', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 5 }] } }],
  phases: [
    { belowHpPct: 50, name: '暴走する原初の機関', pattern: 'sequence', actions: [
      { id: 'overload', name: '過熱する炉心', effects: [{ kind: 'damage', amount: 13, element: 'fire', to: 'foes' }] },
      { id: 'crush', name: '歯車の圧砕', effects: [{ kind: 'damage', amount: 30 }] },
      { id: 'reboot', name: '再起動', effects: [{ kind: 'block', amount: 24 }, { kind: 'heal', amount: 18, to: 'self' }] },
    ] },
  ],
};
