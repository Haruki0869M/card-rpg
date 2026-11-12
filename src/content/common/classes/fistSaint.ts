import type { ClassDef } from '../../../types';
import { brawler } from './brawler';

// 特殊ジョブ（区切りF・2026-11-12）: 拳聖。闘士から。「受けて返す拳」— ブロックで防いだ分だけ反撃する（docs/tasks/lineup-stageF-plan.md）
export const fistSaint: ClassDef = {
  ...brawler, id: 'fistSaint', order: 310, name: '拳聖', role: '受けて返す拳',
  tier: 'special', from: ['brawler'], altar: 'fistSaint',
  baseMaxHp: 74,
  stats: { ...brawler.stats, vit: brawler.stats.vit + 8, per: brawler.stats.per + 6 },
  weaponType: 'fist', subWeapons: ['hammer'],
  battleAbility: { name: '後の先', description: '敵の攻撃をブロックで防ぐたび、防いだ量と同じ物理ダメージで反撃する（1回最大12・1ターン3回まで）', effect: { when: 'guarded', do: [{ kind: 'retaliateDealt', max: 12, perTurn: 3 }] } },
  exploreAbility: { id: 'fistSaintExplore', name: '受け流し', description: '罠やイベントで受けるダメージが半分', effect: { kind: 'eventDamageHalf' } },
  requires: { feat: 'blockedTotal', count: 60, text: 'ブロックで敵の攻撃を合わせて60防ぐ' },
  names: { male: ['ゲンジ', 'テツ', 'ロウ', 'シン'], female: ['カスミ', 'リン', 'ユエ', 'シズク'] },
  cardPool: ['fsSeeThrough', 'fsGuardForm', 'fsCounterStrike', 'axSteadfastFist', 'axParry', 'axSpikeArmor', 'axShieldSlam', 'axFortress'],
  signature: ['fsSeeThrough', 'fsGuardForm', 'fsCounterStrike'],
  jobCards: ['fxMirrorHeart'],
};
