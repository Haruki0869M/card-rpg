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
  HeartOff,
  Megaphone,
  ShieldOff,
  ShieldHalf,
  Eye,
  Shield,
  Skull,
  Snowflake,
  CloudSnow,
  Bell,
  Sun,
  Moon,
  Zap,
  Sparkles,
  Hourglass,
  StarOff,
  Users,
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
  hourglass: Hourglass,
  heartOff: HeartOff,
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

/** かばう（魔王軍の騎士。状態異常ではないが、同じ並びに出す） */
const GUARD_STYLE: StatusStyle = {
  Icon: ShieldHalf,
  name: 'かばう',
  color: '#9ad0ff',
  bg: '#0a2a4a',
  text: '次の味方の番の間、ほかの敵を狙った単体攻撃のカードのダメージを、この敵が代わりに受ける。全体攻撃・お供と召喚の攻撃は、そのまま通る。この敵が倒れたら終わる',
};
/** 吹雪に隠れている（白狼王の段階。区切り3b。状態異常ではないが、同じ並びに出す） */
const HIDDEN_STYLE: StatusStyle = {
  Icon: CloudSnow,
  name: '吹雪に隠れている',
  color: '#d8f0ff',
  bg: '#1a2a3a',
  text: '次の敵の番まで、単体のカードのダメージは外れる（0）。全体攻撃・お供と召喚・毒などの継続ダメージ・反撃・道具は当たる。状態異常だけの効果は付く。BREAK はできる',
};
/** 喰った灯（灯を喰らう影の段階。区切り3b。数 = 喰った灯） */
const LAMP_STYLE: StatusStyle = {
  Icon: Flame,
  name: '喰った灯',
  color: '#e0b0ff',
  bg: '#2a1240',
  text: '味方がフォーカスを1つ使うたび+1（最大6）。1つにつき、この敵の攻撃が+2。この敵を BREAK すると0に戻る',
};
/** 状態異常ではない印（数を出さない） */
export const MARK_STATUSES = new Set(['taunt', 'guard', 'hidden']);
/** 状態異常ではない印（数を出す物も含む。長押しで「残りターン」を出さない） */
export const PSEUDO_STATUSES = new Set(['taunt', 'guard', 'hidden', 'lamp']);
const styleCache = new Map<string, StatusStyle>();
/** 状態異常の見た目（データから作る） */
export function statusStyle(id: string): StatusStyle {
  if (id === 'taunt') return TAUNT_STYLE;
  if (id === 'guard') return GUARD_STYLE;
  if (id === 'hidden') return HIDDEN_STYLE;
  if (id === 'lamp') return LAMP_STYLE;
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
  jump: { Icon: Swords, color: '#b4e7ff' },
  fullRestore: { Icon: HeartPulse, color: '#7dffa8' },
  stealIntent: { Icon: Sparkles, color: '#ffd06a' },
  payHp: { Icon: HeartCrack, color: '#ff8aa0' },
  drainFocus: { Icon: StarOff, color: '#ffd54a' },
  summonEnemy: { Icon: Users, color: '#c8b0ff' },
  shieldBreak: { Icon: ShieldOff, color: '#ff9a7a' },
  purify: { Icon: Sparkles, color: '#9affd0' },
  punishPlays: { Icon: Eye, color: '#ffb07a' },
  guardAllies: { Icon: ShieldHalf, color: '#9ad0ff' },
  hide: { Icon: CloudSnow, color: '#d8f0ff' },
  echoBlow: { Icon: Bell, color: '#fff2b0' },
  retaliate: { Icon: Swords, color: '#ffb07a' },
};
const FALLBACK_EFFECT_ICON = { Icon: Sparkles, color: '#e0d8c0' };

/** カードの効果1つ分の短い表示（アイコン＋数値。全体なら「全」） */
/** value = 今の相手に対する計算後の値（予測。あれば数字の代わりに出す） */
export function EffectChip({ e, size = 12, value }: { e: CardEffect; size?: number; value?: string }) {
  const s = e.kind === 'applyStatus' ? statusStyle(e.status) : null;
  const el = e.kind === 'damage' && e.element ? getElement(e.element) : undefined;
  const { Icon, color } = s
    ? { Icon: s.Icon, color: s.color }
    : el
      ? { Icon: ELEMENT_ICONS[el.icon] ?? Swords, color: el.color }
      : (EFFECT_ICON[e.kind] ?? FALLBACK_EFFECT_ICON);
  const to = targetOf(e);
  const all = to === 'allies' || to === 'otherAllies' || (to === 'foes' && e.kind !== 'taunt');
  const text = `${all ? '全' : ''}${value ?? effectShort(e)}`;
  const Shape = e.kind === 'block' && all ? ShieldPlus : Icon;
  return (
    <span className="inline-flex items-center gap-px whitespace-nowrap" style={{ color }}>
      <Shape size={size} strokeWidth={2.6} />
      <span className="tabular-nums">{text}</span>
    </span>
  );
}

export { Droplet, Shield, Skull, Star, Swords };
