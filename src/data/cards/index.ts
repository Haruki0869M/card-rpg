import { upgradeEffect } from '../../engine/battle/effects';
import type { CardDef, CardInstance } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

/** カードの登録表。src/content の cards フォルダ にカードのファイルを置くだけで登場する */
export const CARDS = contentRegistry<CardDef>('card', import.meta.glob('/src/content/**/cards/*.ts', { eager: true }) as ContentModules);

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
