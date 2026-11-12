import type { ClassDef } from '../../../types';
import { lancer } from './lancer';

// 特殊ジョブ（区切りF・2026-11-12）: 重装衛士。槍騎士から。「ブロックをためて殴る」（docs/tasks/lineup-stageF-plan.md）
export const bulwark: ClassDef = {
  ...lancer, id: 'bulwark', order: 311, name: '重装衛士', role: 'ブロックをためて殴る',
  tier: 'special', from: ['lancer'], altar: 'bulwark',
  baseMaxHp: 90,
  stats: { ...lancer.stats, vit: lancer.stats.vit + 10 },
  weaponType: 'spear', subWeapons: ['hammer'],
  battleAbility: {
    name: '不落',
    description: 'ターン終了時、ブロックの半分が残る（最大20）。物理カードの最初の1回のダメージに、今のブロックの50%を足す（最大+10）',
    effect: { modifier: 'keepBlock', max: 20, pct: 50 },
    also: [{ modifier: 'damageDealt', multiplier: 1, once: true, addFromBlock: { pct: 50, max: 10 }, if: [{ kind: 'cardCategory', category: 'physical' }] }],
  },
  exploreAbility: { id: 'bulwarkExplore', name: '重装の歩み', description: '障害物を壊す判定+15%', effect: { kind: 'checkBonus', check: 'obstacle', bonus: 15 } },
  requires: { feat: 'blockTurns25', count: 3, text: '1ターンのうちにブロックを25以上にする（3回）' },
  names: { male: ['ガルド', 'ボルグ', 'ハンス', 'ロック'], female: ['ブリュン', 'イルゼ', 'マルタ', 'ゲルダ'] },
  cardPool: ['bwBigShield', 'bwShieldCharge', 'bwIronOath', 'axShieldSlam', 'axFortress', 'axIronMarch', 'axReturnStroke'],
  signature: ['bwBigShield', 'bwShieldCharge', 'bwIronOath'],
  jobCards: ['fxFortressBreaker'],
};
