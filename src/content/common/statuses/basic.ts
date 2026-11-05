// 状態異常。1件 = 1つの状態異常。ここに足すだけで、戦闘・表示・説明文・万能薬の対象に自動で入る
// icon は src/components/ui/icons.tsx の STATUS_ICONS のキー（無いキーは汎用のアイコン）
import type { StatusDef } from '../../../types';

export const statuses: StatusDef[] = [
  { id: 'vulnerable', name: '脆弱', icon: 'heartCrack', color: '#ff8aa0', bg: '#5a1424', harmful: true, takenMultiplier: 1.5 },
  { id: 'weak', name: '弱体', icon: 'arrowDown', color: '#c8a0ff', bg: '#341a5a', harmful: true, dealtMultiplier: 0.75 },
  { id: 'burn', name: '火傷', icon: 'flame', color: '#ffa04a', bg: '#5a2208', harmful: true, tickDamage: 4 },
  { id: 'poison', name: '毒', icon: 'biohazard', color: '#9aff6a', bg: '#1e4a10', harmful: true, tickDamage: 'stacks' },
];
