import type { ClassDef } from '../../../types';
import { phantomTamer } from './phantomTamer';

// 特殊ジョブ（区切りF・2026-11-12）: 竜脈術師。幻獣使いから。「違う種類の状態異常を並べて、竜脈を開く」（docs/tasks/lineup-stageF-plan.md）
export const dragonVein: ClassDef = {
  ...phantomTamer, id: 'dragonVein', order: 312, name: '竜脈術師', role: '状態異常を並べて竜脈を開く',
  tier: 'special', from: ['phantomTamer'], altar: 'dragonVein',
  baseMaxHp: 58,
  stats: { ...phantomTamer.stats, int: phantomTamer.stats.int + 8, per: phantomTamer.stats.per + 4 },
  weaponType: 'staff', subWeapons: ['tome'],
  battleAbility: {
    name: '竜脈',
    description: '敵に、まだ付いていない種類の状態異常を付けるとマナ+1（1ターン1回）。違う種類の状態異常が3つ付いた敵の大技の予告は BREAK する（敵1体につき1戦闘1回）。召喚が攻撃すると、最後に使った属性の状態異常が1つ乗る（1ターン1回）',
    effect: { when: 'inflict', if: [{ kind: 'statusFresh' }, { kind: 'oncePerTurn', key: 'veinMana' }], do: [{ kind: 'gainMana', amount: 1 }] },
    also: [
      { when: 'inflict', do: [{ kind: 'veinBreak', need: 3 }] },
      { when: 'summonHit', if: [{ kind: 'oncePerTurn', key: 'veinSummon' }], do: [{ kind: 'lastElementStatus', amount: 1 }] },
    ],
  },
  exploreAbility: { id: 'dragonVeinExplore', name: '地脈読み', description: '石碑・魔法陣の判定+20%', effect: { kind: 'checkBonus', check: 'arcane', bonus: 20 } },
  requires: { feat: 'kills:multiStatus', count: 4, text: '違う種類の状態異常が2つ以上付いた敵を4体倒す' },
  names: { male: ['リュウガ', 'セイラン', 'ヴァルド', 'ジン'], female: ['リュウカ', 'ミズチ', 'セレナ', 'アマネ'] },
  cardPool: ['dvDragonCall', 'dvLeyWedge', 'dvScaleGuard', 'axElementChain', 'axCollapse', 'axBlazeCatalyst', 'axVenomBurst'],
  signature: ['dvDragonCall', 'dvLeyWedge', 'dvScaleGuard'],
  jobCards: ['fxVeinRelease'],
};
