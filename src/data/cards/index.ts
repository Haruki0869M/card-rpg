import type { CardDef, CardEffect, CardInstance } from '../../types';
import { createRegistry } from '../registry';
import { BASIC_CARDS } from './basic';
import { CLASS_CARDS } from './classCards';
import { WEAPON_CARDS } from './weaponCards';

/** カードの登録表。カードを増やすときはファイルを追加してここに並べる */
export const CARDS = createRegistry<CardDef>('card', [...Object.values(BASIC_CARDS), ...CLASS_CARDS, ...WEAPON_CARDS]);

/** 強化のルール: 成功率+10%（上限95%）、ダメージ・ブロック・回復を25%増し（最低+1） */
function upgradeEffect(e: CardEffect): CardEffect {
  switch (e.kind) {
    case 'damage':
    case 'block':
    case 'blockAllies':
    case 'healAllies':
      return { ...e, amount: e.amount + Math.max(1, Math.ceil(e.amount * 0.25)) };
    default:
      return e;
  }
}

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

/** カードの実体から定義を引く（強化の有無を反映） */
export const cardOf = (c: Pick<CardInstance, 'cardId' | 'upgraded'>) => getCard(c.cardId, c.upgraded);
