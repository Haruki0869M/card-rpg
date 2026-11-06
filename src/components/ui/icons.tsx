// アイコン（絵文字は端末で見た目が変わるため、SVGアイコンに統一する）
import {
  ArrowBigDown,
  Biohazard,
  Flame,
  HeartPulse,
  ShieldPlus,
  Copy,
  Droplet,
  HeartCrack,
  Megaphone,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Star,
  Sword,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { getStatus } from '../../data/statuses';
import { describeStatus, effectShort, targetOf } from '../../engine';
import type { CardCategory, CardEffect } from '../../types';

/** 状態異常のアイコン（状態異常のデータの icon のキー → アイコン）。新しいアイコンが要る時はここに1行足す */
export const STATUS_ICONS: Record<string, LucideIcon> = {
  heartCrack: HeartCrack,
  arrowDown: ArrowBigDown,
  flame: Flame,
  biohazard: Biohazard,
  skull: Skull,
  snowflake: Snowflake,
  droplet: Droplet,
  heartPulse: HeartPulse,
  shield: Shield,
  sparkles: Sparkles,
};

export interface StatusStyle {
  Icon: LucideIcon;
  name: string;
  color: string;
  bg: string;
  text: string;
}

/** 挑発（状態異常ではないが、同じ見た目で表示する） */
const TAUNT_STYLE: StatusStyle = {
  Icon: Megaphone,
  name: '挑発',
  color: '#ffd06a',
  bg: '#5a3a0a',
  text: 'このユニットの単体攻撃の対象が、挑発した味方に固定される（次の敵フェーズ終了まで）',
};

const styleCache = new Map<string, StatusStyle>();
/** 状態異常の見た目（データから作る） */
export function statusStyle(id: string): StatusStyle {
  if (id === 'taunt') return TAUNT_STYLE;
  let st = styleCache.get(id);
  if (!st) {
    const d = getStatus(id);
    st = { Icon: STATUS_ICONS[d.icon] ?? Sparkles, name: d.name, color: d.color, bg: d.bg, text: describeStatus(d) };
    styleCache.set(id, st);
  }
  return st;
}

export const CATEGORY_STYLE: Record<CardCategory, { name: string; Icon: LucideIcon; frame: string; glow: string; inner: string }> = {
  physical: { name: '物理', Icon: Sword, frame: '#c24a3a', glow: '#ff7a5a', inner: 'linear-gradient(180deg,#4a1a1a 0%,#2a0e10 55%,#170809 100%)' },
  magic: { name: '魔法', Icon: Sparkles, frame: '#6a5cf0', glow: '#a99bff', inner: 'linear-gradient(180deg,#24205a 0%,#141038 55%,#0a0820 100%)' },
  skill: { name: 'スキル', Icon: Star, frame: '#3aa070', glow: '#7affc0', inner: 'linear-gradient(180deg,#13402e 0%,#0b2a1e 55%,#061710 100%)' },
};

/** 効果の種類ごとのアイコン（無い種類は汎用のアイコン）。新しい効果を足したらここに1行足すと見た目が付く */
const EFFECT_ICON: Record<string, { Icon: LucideIcon; color: string }> = {
  damage: { Icon: Swords, color: '#ff9a7a' },
  block: { Icon: Shield, color: '#7ac8ff' },
  applyStatus: { Icon: HeartCrack, color: '#ff8aa0' },
  gainMana: { Icon: Droplet, color: '#6ad0ff' },
  gainFocus: { Icon: Star, color: '#ffd54a' },
  draw: { Icon: Copy, color: '#d8d0ff' },
  taunt: { Icon: Megaphone, color: '#ffd06a' },
  heal: { Icon: HeartPulse, color: '#7dffa8' },
  healPctOfDealt: { Icon: HeartPulse, color: '#7dffa8' },
  cleanse: { Icon: Sparkles, color: '#9affd0' },
};
const FALLBACK_EFFECT_ICON = { Icon: Sparkles, color: '#e0d8c0' };

/** カードの効果1つ分の短い表示（アイコン＋数値。全体なら「全」） */
export function EffectChip({ e, size = 12 }: { e: CardEffect; size?: number }) {
  const s = e.kind === 'applyStatus' ? statusStyle(e.status) : null;
  const { Icon, color } = s ? { Icon: s.Icon, color: s.color } : (EFFECT_ICON[e.kind] ?? FALLBACK_EFFECT_ICON);
  const to = targetOf(e);
  const all = to === 'allies' || to === 'otherAllies' || (to === 'foes' && e.kind !== 'taunt');
  const text = `${all ? '全' : ''}${effectShort(e)}`;
  const Shape = e.kind === 'block' && all ? ShieldPlus : Icon;
  return (
    <span className="inline-flex items-center gap-px whitespace-nowrap" style={{ color }}>
      <Shape size={size} strokeWidth={2.6} />
      <span className="tabular-nums">{text}</span>
    </span>
  );
}

export { Droplet, Shield, Skull, Star, Swords };
