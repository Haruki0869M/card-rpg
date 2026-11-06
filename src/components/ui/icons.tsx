import { CATEGORY_LABEL } from '../../data/terms';
import { CATEGORY_COLOR } from '../../data/theme';
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
  Sun,
  Moon,
  Zap,
  Sparkles,
  Star,
  Sword,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { getElement } from '../../data/elements';
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
  zap: Zap,
};

/** 属性のアイコン（属性のデータの icon のキー → アイコン） */
export const ELEMENT_ICONS: Record<string, LucideIcon> = { flame: Flame, snowflake: Snowflake, zap: Zap, biohazard: Biohazard, moon: Moon, sun: Sun };

/** 属性の小さな印（アイコン＋名前） */
export function ElementTag({ id, size = 12 }: { id: string; size?: number }) {
  const el = getElement(id);
  const Icon = ELEMENT_ICONS[el.icon] ?? Sparkles;
  return (
    <span className="inline-flex items-center gap-px font-bold" style={{ color: el.color }}>
      <Icon size={size} strokeWidth={2.6} />
      {el.name}
    </span>
  );
}

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

const CATEGORY_ICON: Record<CardCategory, LucideIcon> = { physical: Sword, magic: Sparkles, skill: Star };
/** カードの種類の見た目（名前は terms.ts、色は theme.ts） */
export const CATEGORY_STYLE: Record<CardCategory, { name: string; Icon: LucideIcon; frame: string; glow: string; inner: string }> = Object.fromEntries(
  (Object.keys(CATEGORY_COLOR) as CardCategory[]).map((c) => [c, { name: CATEGORY_LABEL[c], Icon: CATEGORY_ICON[c], ...CATEGORY_COLOR[c] }]),
) as Record<CardCategory, { name: string; Icon: LucideIcon; frame: string; glow: string; inner: string }>;

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
  const el = e.kind === 'damage' && e.element ? getElement(e.element) : undefined;
  const { Icon, color } = s
    ? { Icon: s.Icon, color: s.color }
    : el
      ? { Icon: ELEMENT_ICONS[el.icon] ?? Swords, color: el.color }
      : (EFFECT_ICON[e.kind] ?? FALLBACK_EFFECT_ICON);
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
