// ===== 命中エフェクトの種類（段階B）。カードの武器種・種類・属性から決める純粋な関数（状態・乱数に触れない） =====
import { getElement } from '../data/elements';
import type { CardDef } from '../types';

/**
 * slash = 白〜金の斬撃の軌跡＋火花（剣・刀・短剣・鎌・槍。斧・鞭も斬る見た目＝提案）
 * impact = 衝撃波のリング（槌・拳・杖・錫杖）
 * shot = 弾道のライン（銃・弓）
 * magic = 属性色の魔法陣と光の粒（魔法・属性の攻撃）
 * enemy = 敵の攻撃（赤い爪あと）
 * barrier = 青い六角形の障壁（ブロック）
 * heal = 緑の光の柱（回復）、buff = 金の光の柱（支援）
 */
export type ImpactStyle = 'slash' | 'impact' | 'shot' | 'magic' | 'enemy' | 'barrier' | 'heal' | 'buff';

const SLASH = new Set(['sword', 'katana', 'dagger', 'scythe', 'spear', 'axe', 'whip']);
const IMPACT = new Set(['hammer', 'fist', 'staff', 'scepter']);
const SHOT = new Set(['gun', 'bow']);
/** 属性の無い魔法の色（淡い紫） */
export const NEUTRAL_MAGIC_COLOR = '#c9a8ff';

/** カードのダメージの属性（一番上の段から探す） */
export function cardElementOf(card: CardDef): string | undefined {
  for (let i = card.tiers.length - 1; i >= 0; i--) {
    for (const e of card.tiers[i].effects) if ((e.kind === 'damage' || e.kind === 'summon') && (e as { element?: string }).element) return (e as { element?: string }).element;
  }
  return undefined;
}

/** 攻撃のカードが当たった時の見た目 */
export function cardImpact(card: CardDef): { style: ImpactStyle; color?: string } {
  const el = cardElementOf(card);
  const magical = card.category === 'magic' || card.weaponType === 'tome' || card.weaponType === 'instrument';
  if (el && (magical || !card.weaponType)) return { style: 'magic', color: getElement(el).color };
  if (magical) return { style: 'magic', color: NEUTRAL_MAGIC_COLOR };
  const wt = card.weaponType;
  const color = el ? getElement(el).color : undefined;
  if (wt && IMPACT.has(wt)) return { style: 'impact', color };
  if (wt && SHOT.has(wt)) return { style: 'shot', color };
  if (wt && SLASH.has(wt)) return { style: 'slash', color };
  return { style: 'slash', color };
}

/** 大ダメージ（戦場全体を揺らす。効果音の「大」と同じ 25 以上＝提案） */
export const BIG_HIT = 25;
