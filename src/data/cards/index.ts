import { upgradeEffect } from '../../engine/battle/effects';
import type { CardDef, CardInstance } from '../../types';
import { contentRegistry, type ContentModules } from '../content';
import { applyMergedPlacement } from './merged';

/** カードの登録表。src/content の cards フォルダ にカードのファイルを置くだけで登場する */
export const CARDS = contentRegistry<CardDef>('card', import.meta.glob('/src/content/**/cards/*.ts', { eager: true }) as ContentModules);
// 憲章5: まとめた札の置き場所と名前を足す（merged.ts）
applyMergedPlacement((id) => CARDS.get(id));

/** 強化のルール: 成功率+10%（上限95%）。効果の値の上げ方は効果の部品ごと（ダメージ・ブロック・回復は25%増し・最低+1） */
const upgradedCache = new Map<string, CardDef>();

export function getCard(id: string, upgraded?: boolean): CardDef {
  const base = CARDS.get(id);
  if (!upgraded) return base;
  let u = upgradedCache.get(id);
  if (!u) {
    u = {
      ...base,
      name: `${base.name}＋`,
      baseChance: Math.min(95, base.baseChance + 10),
      tiers: base.tiers.map((t) => ({ ...t, effects: t.effects.map(upgradeEffect) })),
    };
    upgradedCache.set(id, u);
  }
  return u;
}

/**
 * 能力の帯（特殊能力）を持たないエピック。spec §13.1 の「エピック以上は必ず特殊能力を持つ」の例外。
 * オーナーの決定（2026-11-12）: 区切りDのこの5枚は、元の文（Gemini の依頼・計画）に能力が無いので、足さずにそのままにする
 */
export const EPIC_WITHOUT_TRAIT = ['axThornVow', 'axIronMarch', 'axCollapse', 'axReversalSeal', 'axLightHoard'];

/** カードを置く武器種の全部（weaponType ＋ weaponTypes） */
export function cardWeaponTypes(c: CardDef): string[] {
  return [...(c.weaponType ? [c.weaponType] : []), ...(c.weaponTypes ?? [])];
}

/** カードを置く系統の全部（lineage ＋ lineages） */
export function cardLineages(c: CardDef): string[] {
  return [...(c.lineage ? [c.lineage] : []), ...(c.lineages ?? [])];
}

/** カードの実体から定義を引く（強化の有無を反映） */
export const cardOf = (c: Pick<CardInstance, 'cardId' | 'upgraded'>) => getCard(c.cardId, c.upgraded);
