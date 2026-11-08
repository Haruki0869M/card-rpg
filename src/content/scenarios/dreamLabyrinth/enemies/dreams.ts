// 夢幻の大迷宮の新しい敵10体（通常6・エリート3・ボス1）。絵は新しく描く（docs/art/prompts-enemies-dreamLabyrinth-mj.md）
// 夢らしく: 眠気（脆弱・遅延）・呪い・フォーカスを奪う。聖と闇が主役。凍結は使わない
import type { EnemyDef } from '../../../../types';

// ----- 通常6体 -----
export const nightmareMote: EnemyDef = {
  id: 'nightmareMote',
  name: '悪夢の綿毛',
  icon: '☁️',
  maxHp: 16,
  baseLevel: 1,
  size: 0.8,
  exp: 4,
  gold: 2,
  weak: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'drift', name: 'ふわふわ体当たり', effects: [{ kind: 'damage', amount: 4 }] },
    { id: 'sleepyDust', name: '眠気の粉', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1 }, { kind: 'block', amount: 3 }] },
    { id: 'puff', name: '綿毛のぽんぽん', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
  ],
};

export const sleepwalker: EnemyDef = {
  id: 'sleepwalker',
  name: '夢遊病者',
  icon: '🚶',
  maxHp: 26,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'stumble', name: 'ふらふらの体当たり', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'sleepTalk', name: '寝言', effects: [{ kind: 'block', amount: 6 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'grasp', name: '寝ぼけた掴みかかり', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
  ],
};

export const pillowGolem: EnemyDef = {
  id: 'pillowGolem',
  name: '枕のゴーレム',
  icon: '🛏️',
  maxHp: 48,
  baseLevel: 5,
  size: 1.1,
  exp: 12,
  gold: 7,
  weak: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'smother', name: '圧しかかり', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'fluff', name: '羽毛の盾', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'drowse', name: '眠気のあくび', effects: [{ kind: 'applyStatus', status: 'delay', amount: 1 }, { kind: 'damage', amount: 4 }] },
  ],
};

export const lullabyBird: EnemyDef = {
  id: 'lullabyBird',
  name: '子守歌の鳥',
  icon: '🐦',
  maxHp: 26,
  baseLevel: 5,
  size: 0.9,
  exp: 9,
  gold: 5,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'song', name: '子守歌', effects: [{ kind: 'heal', amount: 6, to: 'allies' }, { kind: 'block', amount: 4 }] },
    { id: 'peck', name: 'くちばしの一突き', effects: [{ kind: 'damage', amount: 8 }] },
    { id: 'chorus', name: '眠りの合唱', effects: [{ kind: 'damage', amount: 4, to: 'foes' }] },
  ],
};

export const shadowChild: EnemyDef = {
  id: 'shadowChild',
  name: '影の子',
  icon: '👤',
  maxHp: 38,
  baseLevel: 7,
  size: 0.9,
  exp: 14,
  gold: 8,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'whisper', name: 'ささやき', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }] },
    { id: 'hand', name: '影の手', effects: [{ kind: 'damage', amount: 10, element: 'dark' }] },
    { id: 'hideSeek', name: 'かくれんぼ', effects: [{ kind: 'block', amount: 10 }, { kind: 'damage', amount: 4 }] },
  ],
};

export const lostMemory: EnemyDef = {
  id: 'lostMemory',
  name: '迷子の記憶',
  icon: '👻',
  maxHp: 44,
  baseLevel: 8,
  size: 1,
  exp: 16,
  gold: 9,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'reach', name: '手を伸ばす', effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'fade', name: '薄れていく', effects: [{ kind: 'block', amount: 8 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'cry', name: '呼ぶ声', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: 'すり抜ける手', effect: { modifier: 'ignoreBlock' } }],
};

// ----- エリート3体 -----
export const mirrorKnight: EnemyDef = {
  id: 'mirrorKnight',
  name: '鏡の騎士',
  icon: '🪞',
  maxHp: 85,
  baseLevel: 7,
  size: 1.2,
  exp: 28,
  gold: 18,
  pattern: 'sequence',
  actions: [
    { id: 'slash', name: '鏡の一閃', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'guard', name: '鏡の守り', effects: [{ kind: 'block', amount: 14 }] },
    { id: 'reflect', name: '映し返す闇', effects: [{ kind: 'damage', amount: 9, element: 'dark' }, { kind: 'block', amount: 6 }] },
  ],
  abilities: [{ name: '映し返し', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 4, perTurn: 2 }] } }],
};

export const dreamWeaver: EnemyDef = {
  id: 'dreamWeaver',
  name: '夢織り',
  icon: '🧵',
  maxHp: 75,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 20,
  weak: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'weave', name: '眠気の糸', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'block', amount: 6 }] },
    { id: 'thread', name: '呪いの糸', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 8 }] },
    { id: 'net', name: '夢の網', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
};

export const memoryEater: EnemyDef = {
  id: 'memoryEater',
  name: '記憶喰い',
  icon: '👁️',
  maxHp: 110,
  baseLevel: 10,
  size: 1.3,
  exp: 40,
  gold: 26,
  pattern: 'sequence',
  actions: [
    { id: 'devour', name: '記憶を食べる', effects: [{ kind: 'drainFocus', amount: 2 }, { kind: 'damage', amount: 10 }] },
    { id: 'bite', name: '大きな口', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'forget', name: '忘れさせる', effects: [{ kind: 'drainFocus', amount: 1, to: 'foes' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
};

// ----- ボス1体（3段階。さびしさから記憶を食べた夢喰い。最後は記憶を返す） -----
export const dreamEater: EnemyDef = {
  id: 'dreamEater',
  name: '夢喰い',
  icon: '🌑',
  maxHp: 450,
  baseLevel: 12,
  size: 1.6,
  exp: 400,
  gold: 400,
  resist: ['dark'],
  weak: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'hug', name: '記憶を抱く', effects: [{ kind: 'block', amount: 20 }, { kind: 'damage', amount: 8 }] },
    { id: 'swallow', name: '夢を呑む', effects: [{ kind: 'damage', amount: 22, element: 'dark' }] },
    { id: 'lonely', name: 'さびしさ', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: '抱えた記憶', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
  phases: [
    {
      belowHpPct: 60,
      name: '食べる夢喰い',
      pattern: 'sequence',
      actions: [
        { id: 'devourAll', name: '全部食べる', effects: [{ kind: 'damage', amount: 14, to: 'foes' }] },
        { id: 'forgetAll', name: '忘れさせる', effects: [{ kind: 'drainFocus', amount: 2, to: 'foes' }, { kind: 'damage', amount: 8, to: 'foes' }] },
        { id: 'maw', name: '大きな口', effects: [{ kind: 'damage', amount: 26, element: 'dark' }] },
        { id: 'shadowWall', name: '影の壁', effects: [{ kind: 'block', amount: 26 }] },
      ],
    },
    {
      belowHpPct: 30,
      name: '思い出す夢喰い',
      pattern: 'sequence',
      actions: [
        { id: 'remember', name: '思い出す', effects: [{ kind: 'damage', amount: 18, element: 'holy', to: 'foes' }] },
        { id: 'tears', name: '涙', effects: [{ kind: 'damage', amount: 32, element: 'dark' }] },
        { id: 'giveBack', name: '記憶を返す', effects: [{ kind: 'block', amount: 24 }, { kind: 'damage', amount: 10, to: 'foes' }] },
        { id: 'oblivion', name: '忘却', effects: [{ kind: 'drainFocus', amount: 3, to: 'foes' }, { kind: 'damage', amount: 12, to: 'foes' }] },
      ],
    },
  ],
};
