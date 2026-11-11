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
  // 遅延（砂時計のゴーレムなど）: 時の流れを遅らせ、次のターンに引くカードを減らす。凍結（マナ-1）・痺れ（成功率-）とは別
  { id: 'delay', name: '遅延', icon: 'hourglass', color: '#e8c890', bg: '#4a3418', harmful: true, drawPenalty: 1, decay: 0, maxStacks: 2, description: '味方は次のターンの初めに引くカードが数値分減る（最大2。引いた時に消える）' },
  { id: 'curse', name: '呪い', icon: 'skull', color: '#d08aff', bg: '#2a0a3a', harmful: true, healMultiplier: 0.5 },
  // 良い効果（万能薬では消えない）
  { id: 'regen', name: '再生', icon: 'heartPulse', color: '#6ad8ff', bg: '#0a2e4a', harmful: false, tickHeal: 'stacks' },
  // 応援: 次に使うカードの成功率+10%（1つにつき。カードを使うと消える。セキセイインコ）
  // 構え: 竜王の槍。敵の番を無傷でしのぐたび1（最大3）。1つにつき物理ダメージ+15%。HPが減ると全部消える
  { id: 'stance', name: '構え', icon: 'shield', color: '#ffd9a0', bg: '#4a2e0a', harmful: false, decay: 0, maxStacks: 3, loseOnHpLoss: true, description: '1つにつき、与える物理ダメージ+15%（最大3）。HPが減ると全部消える' },
  { id: 'inspired', name: '応援', icon: 'sparkles', color: '#9affc8', bg: '#0a3a24', harmful: false, decay: 0, maxStacks: 3, chanceBonus: 10, description: '次に使うカードの成功率+10%（1つにつき。カードを使うと消える）' },
  // 聖騎士の聖光: 次の聖属性の攻撃が1つにつき+15%（その攻撃で消える。減らない・最大5）
  { id: 'holyLight', name: '聖光', icon: 'sun', color: '#fff2a0', bg: '#4a3e0a', harmful: false, decay: 0, maxStacks: 5, boostElement: { element: 'holy', per: 0.15 } },
];
