// アイコン（絵文字は端末で見た目が変わるため、SVGアイコンに統一する）
import {
  ArrowBigDown,
  Copy,
  Droplet,
  HeartCrack,
  Megaphone,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sword,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import type { CardCategory, CardEffect, StatusId } from '../../types';

export const STATUS_STYLE: Record<StatusId | 'taunt', { Icon: LucideIcon; name: string; color: string; bg: string; text: string }> = {
  vulnerable: { Icon: HeartCrack, name: '脆弱', color: '#ff8aa0', bg: '#5a1424', text: '受けるダメージ×1.5（端数切り捨て）' },
  weak: { Icon: ArrowBigDown, name: '弱体', color: '#c8a0ff', bg: '#341a5a', text: '与えるダメージ×0.75（端数切り捨て）' },
  taunt: {
    Icon: Megaphone,
    name: '挑発',
    color: '#ffd06a',
    bg: '#5a3a0a',
    text: 'このユニットの単体攻撃の対象が、挑発した味方に固定される（次の敵フェーズ終了まで）',
  },
};

export const CATEGORY_STYLE: Record<CardCategory, { name: string; Icon: LucideIcon; frame: string; glow: string; inner: string }> = {
  physical: { name: '物理', Icon: Sword, frame: '#c24a3a', glow: '#ff7a5a', inner: 'linear-gradient(180deg,#4a1a1a 0%,#2a0e10 55%,#170809 100%)' },
  magic: { name: '魔法', Icon: Sparkles, frame: '#6a5cf0', glow: '#a99bff', inner: 'linear-gradient(180deg,#24205a 0%,#141038 55%,#0a0820 100%)' },
  skill: { name: 'スキル', Icon: Star, frame: '#3aa070', glow: '#7affc0', inner: 'linear-gradient(180deg,#13402e 0%,#0b2a1e 55%,#061710 100%)' },
};

const EFFECT_ICON: Record<CardEffect['kind'], { Icon: LucideIcon; color: string }> = {
  damage: { Icon: Swords, color: '#ff9a7a' },
  block: { Icon: Shield, color: '#7ac8ff' },
  applyStatus: { Icon: HeartCrack, color: '#ff8aa0' },
  gainMana: { Icon: Droplet, color: '#6ad0ff' },
  gainFocus: { Icon: Star, color: '#ffd54a' },
  draw: { Icon: Copy, color: '#d8d0ff' },
  tauntTarget: { Icon: Megaphone, color: '#ffd06a' },
  tauntAll: { Icon: Megaphone, color: '#ffd06a' },
};

/** カードの効果1つ分の短い表示（アイコン＋数値） */
export function EffectChip({ e, size = 12 }: { e: CardEffect; size?: number }) {
  const s = e.kind === 'applyStatus' ? STATUS_STYLE[e.status] : null;
  const { Icon, color } = s ? { Icon: s.Icon, color: s.color } : EFFECT_ICON[e.kind];
  let text = '';
  switch (e.kind) {
    case 'damage':
    case 'block':
      text = `${e.amount}`;
      break;
    case 'applyStatus':
      text = `${e.amount}`;
      break;
    case 'gainMana':
    case 'gainFocus':
    case 'draw':
      text = `+${e.amount}`;
      break;
    case 'tauntTarget':
      text = '';
      break;
    case 'tauntAll':
      text = '全';
      break;
  }
  return (
    <span className="inline-flex items-center gap-px whitespace-nowrap" style={{ color }}>
      <Icon size={size} strokeWidth={2.6} />
      <span className="tabular-nums">{text}</span>
    </span>
  );
}

export { Droplet, Shield, Skull, Star, Swords };
