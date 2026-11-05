// ダンジョン。シナリオダンジョンは部屋の並びが固定、ランダムダンジョンは自動生成
import type { DungeonDef } from '../../types';
import { createRegistry } from '../registry';

const FOREST_POOLS: DungeonDef['pools'] = {
  battle: [
    ['forestWolf', 'forestWolf'],
    ['toxicShroom', 'forestWolf'],
    ['goblinScout', 'toxicShroom', 'goblinScout'],
    ['chaosShaman', 'forestWolf'],
    ['toxicShroom', 'toxicShroom', 'forestWolf'],
  ],
  elite: [['treeWarden'], ['goblinBrute', 'chaosShaman']],
  boss: ['treantKing'],
};

export const DUNGEONS = createRegistry<DungeonDef>('dungeon', [
  {
    id: 'emeraldTemple',
    name: '翠の神殿',
    description: '森の奥に眠る古い神殿。封印の鍵（翠）を守る樹魔が棲むという。',
    background: 'temple',
    baseLevel: 3,
    pools: FOREST_POOLS,
    bossChest: 'epic',
    // 行ごとの部屋。next は次の行の何番目の部屋につながるか
    layout: [
      [{ type: 'battle', next: [0, 1] }],
      [
        { type: 'battle', next: [0, 1] },
        { type: 'event', eventId: 'fallenTree', next: [1, 2] },
      ],
      [
        { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
        { type: 'battle', next: [0, 1] },
        { type: 'rest', next: [1] },
      ],
      [
        { type: 'event', eventId: 'ancientStele', next: [0] },
        { type: 'elite', next: [0, 1] },
      ],
      [
        { type: 'battle', next: [0] },
        { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
      ],
      [{ type: 'rest', next: [0] }],
      [{ type: 'boss', next: [] }],
    ],
  },
  {
    id: 'randomForest',
    name: '迷いの森の洞窟',
    description: '訪れるたびに姿を変える洞窟。危険だが、奥には豪華な財宝が眠る。',
    background: 'temple',
    baseLevel: 4,
    pools: { ...FOREST_POOLS, boss: ['treeWarden', 'toxicShroom'] },
    bossChest: 'legend',
    rows: 6,
  },
]);

/** シナリオダンジョン（拠点に固定で表示される） */
export const SCENARIO_DUNGEONS = ['emeraldTemple'];
/** ランダムダンジョンの元（拠点に戻るたびに中身が変わる） */
export const RANDOM_DUNGEON = 'randomForest';
