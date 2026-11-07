// 状態異常。1件 = 1つの状態異常。ここに足すだけで、戦闘・表示・説明文・万能薬の対象に自動で入る
// icon は src/components/ui/icons.tsx の STATUS_ICONS のキー（無いキーは汎用のアイコン）
import type { StatusDef } from '../../../types';

export const statuses: StatusDef[] = [
  { id: 'vulnerable', name: '脆弱', icon: 'heartCrack', color: '#ff8aa0', bg: '#5a1424', harmful: true, takenMultiplier: 1.5 },
  { id: 'weak', name: '弱体', icon: 'arrowDown', color: '#c8a0ff', bg: '#341a5a', harmful: true, dealtMultiplier: 0.75 },
  { id: 'burn', name: '火傷', icon: 'flame', color: '#ffa04a', bg: '#5a2208', harmful: true, tickDamage: 4 },
  { id: 'poison', name: '毒', icon: 'biohazard', color: '#9aff6a', bg: '#1e4a10', harmful: true, tickDamage: 'stacks' },
  { id: 'paralysis', name: '痺れ', icon: 'zap', color: '#ffe04a', bg: '#4a3a08', harmful: true, chancePenalty: 15, actionFailChance: 30 },
  { id: 'freeze', name: '凍結', icon: 'snowflake', color: '#9ae8ff', bg: '#0a3a5a', harmful: true, skipAction: true, manaPenalty: 1, decay: 0, maxStacks: 1 },
  { id: 'curse', name: '呪い', icon: 'skull', color: '#d08aff', bg: '#2a0a3a', harmful: true, healMultiplier: 0.5 },
  // 良い効果（万能薬では消えない）
  { id: 'regen', name: '再生', icon: 'heartPulse', color: '#6ad8ff', bg: '#0a2e4a', harmful: false, tickHeal: 'stacks' },
  // 聖騎士の聖光: 次の聖属性の攻撃が1つにつき+15%（その攻撃で消える。減らない・最大5）
  { id: 'holyLight', name: '聖光', icon: 'sun', color: '#fff2a0', bg: '#4a3e0a', harmful: false, decay: 0, maxStacks: 5, boostElement: { element: 'holy', per: 0.15 } },
];
