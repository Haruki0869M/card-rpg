// レアの敵（K3 C）: 徘徊する敵の約6%で入れ替わって出る（地域の rareEncounters）。名前に★が付く。
// 同じ地域の通常の敵より HP・攻撃が約1.5倍、経験値・ゴールドは約3倍。特殊能力を1つ持つ。絵は docs/art/prompts-enemies-rare.md
import type { EnemyDef } from '../../../types';

/** 侵食の魔王・翠の森（元: 森の狼） */
export const goldenWolf: EnemyDef = {
  id: 'goldenWolf',
  name: '黄金の森の狼',
  icon: '🐺',
  rare: true,
  maxHp: 34,
  baseLevel: 3,
  size: 1,
  exp: 21,
  gold: 14,
  weak: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '黄金の牙', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'howl', name: '森を震わす遠吠え', effects: [{ kind: 'block', amount: 8 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'pounce', name: '金色の跳躍', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
  ],
  abilities: [{ name: '群れの長の気迫', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
};

/** 侵食の魔王・嘆きの沼（元: 沼の亡者） */
export const crystalGhoul: EnemyDef = {
  id: 'crystalGhoul',
  name: '水晶の沼の亡者',
  icon: '💎',
  rare: true,
  maxHp: 45,
  baseLevel: 5,
  size: 1.05,
  exp: 30,
  gold: 20,
  weak: ['holy', 'thunder'],
  resist: ['poison', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'claw', name: '水晶の爪', effects: [{ kind: 'damage', amount: 12, element: 'poison' }] },
    { id: 'shard', name: '飛び散る結晶', effects: [{ kind: 'damage', amount: 5, to: 'foes' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'grow', name: '結晶が伸びる', effects: [{ kind: 'block', amount: 10 }] },
  ],
  abilities: [{ name: '育つ水晶', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3 }] } }],
};

/** 凍てつく王国・白樺の雪林 */
export const whiteStag: EnemyDef = {
  id: 'whiteStag',
  name: '白銀の牡鹿',
  icon: '🦌',
  rare: true,
  maxHp: 36,
  baseLevel: 3,
  size: 1.1,
  exp: 21,
  gold: 14,
  weak: ['fire'],
  resist: ['ice'],
  pattern: 'sequence',
  actions: [
    { id: 'antler', name: '銀の角', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'charge', name: '雪原の突進', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
    { id: 'mist', name: '白い息', effects: [{ kind: 'block', amount: 8 }] },
  ],
  abilities: [{ name: '森の主の癒やし', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'self' }] } }],
};

/** 凍てつく王国・氷の城の荒野 */
export const frostBellKnight: EnemyDef = {
  id: 'frostBellKnight',
  name: '霜鈴の亡霊騎士',
  icon: '🔔',
  rare: true,
  maxHp: 68,
  baseLevel: 9,
  size: 1.2,
  exp: 72,
  gold: 54,
  weak: ['fire', 'holy'],
  resist: ['ice', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'slash', name: '霜の剣', effects: [{ kind: 'damage', amount: 18, element: 'ice' }] },
    { id: 'bell', name: '霜の鈴の音', effects: [{ kind: 'applyStatus', status: 'freeze', amount: 1 }, { kind: 'damage', amount: 6 }] },
    { id: 'guard', name: '亡霊の盾', effects: [{ kind: 'block', amount: 16 }] },
    { id: 'toll', name: '弔いの鐘', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
  abilities: [{ name: '鈴の守り', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
};

/** 呪われた群島・港の島 */
export const pearlCrab: EnemyDef = {
  id: 'pearlCrab',
  name: '真珠の大蟹',
  icon: '🦀',
  rare: true,
  maxHp: 33,
  baseLevel: 1,
  size: 1,
  exp: 12,
  gold: 18,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'pinch', name: '真珠のはさみ', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
    { id: 'shell', name: '真珠の殻にこもる', effects: [{ kind: 'block', amount: 9 }] },
    { id: 'crush', name: '大ばさみ', effects: [{ kind: 'damage', amount: 11 }] },
  ],
  abilities: [{ name: '真珠の殻', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
};

/** 呪われた群島・霧の海域 */
export const lanternGhostCaptain: EnemyDef = {
  id: 'lanternGhostCaptain',
  name: '灯火の幽霊船乗り',
  icon: '🏮',
  rare: true,
  maxHp: 42,
  baseLevel: 5,
  size: 1.1,
  exp: 30,
  gold: 24,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'cutlass', name: '霧の刃', effects: [{ kind: 'damage', amount: 15 }] },
    { id: 'lantern', name: '迷わせる灯火', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 7, element: 'dark' }] },
    { id: 'fade', name: '霧に紛れる', effects: [{ kind: 'block', amount: 10 }] },
  ],
  abilities: [{ name: '導きの灯', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'randomFoe' }] } }],
};

/** 砂塵の王朝・砂丘の海 */
export const goldenScarab: EnemyDef = {
  id: 'goldenScarab',
  name: '黄金の聖甲虫',
  icon: '🪲',
  rare: true,
  maxHp: 42,
  baseLevel: 5,
  size: 1,
  exp: 30,
  gold: 30,
  weak: ['thunder'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'ram', name: '黄金の体当たり', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'sun', name: '太陽の輝き', effects: [{ kind: 'damage', amount: 6, element: 'holy', to: 'foes' }] },
    { id: 'shell', name: '聖なる甲羅', effects: [{ kind: 'block', amount: 12 }] },
  ],
  abilities: [{ name: '太陽を運ぶ甲羅', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3 }] } }],
};

/** 星降る天空城・星見の丘 */
export const starlitSwan: EnemyDef = {
  id: 'starlitSwan',
  name: '星屑をまとう白鳥',
  icon: '🦢',
  rare: true,
  maxHp: 40,
  baseLevel: 5,
  size: 1,
  exp: 30,
  gold: 20,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'wings', name: '星屑の羽ばたき', effects: [{ kind: 'damage', amount: 7, hits: 2 }] },
    { id: 'dust', name: '降りそそぐ星屑', effects: [{ kind: 'damage', amount: 6, element: 'holy', to: 'foes' }] },
    { id: 'veil', name: '羽で包む', effects: [{ kind: 'block', amount: 10 }] },
  ],
  abilities: [{ name: '星の癒やし', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'self' }] } }],
};

/** 機械仕掛けの帝国・煙突の街 */
export const brassClockCat: EnemyDef = {
  id: 'brassClockCat',
  name: '真鍮の時計猫',
  icon: '🐈',
  rare: true,
  maxHp: 33,
  baseLevel: 2,
  size: 0.9,
  exp: 15,
  gold: 12,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'claw', name: '真鍮の爪', effects: [{ kind: 'damage', amount: 8 }] },
    { id: 'tick', name: '時を止める秒針', effects: [{ kind: 'applyStatus', status: 'delay', amount: 1 }, { kind: 'damage', amount: 4 }] },
    { id: 'scratch', name: 'ひっかき連打', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'wind', name: 'ぜんまいを巻く', effects: [{ kind: 'block', amount: 7 }] },
  ],
  abilities: [{ name: '気まぐれな爪', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 2, perTurn: 1 }] } }],
};

/** 機械仕掛けの帝国・蒸気の谷 */
export const crimsonSteamHound: EnemyDef = {
  id: 'crimsonSteamHound',
  name: '紅蓮の蒸気猟犬',
  icon: '🐕',
  rare: true,
  maxHp: 42,
  baseLevel: 5,
  size: 1,
  exp: 30,
  gold: 20,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '灼けた牙', effects: [{ kind: 'damage', amount: 6, hits: 2, element: 'fire' }] },
    { id: 'breath', name: '紅蓮の蒸気', effects: [{ kind: 'applyStatus', status: 'burn', amount: 2 }, { kind: 'damage', amount: 6 }] },
    { id: 'vent', name: '排気で身を守る', effects: [{ kind: 'block', amount: 9 }] },
  ],
  abilities: [{ name: '先駆けの熱気', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'burn', amount: 1, to: 'randomFoe' }] } }],
};
