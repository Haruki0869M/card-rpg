// ===== 冒険中のキャラ（装備・成長を反映した能力値など） =====
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import type { CardInstance, EquipSlot, Hero, ItemDef, PartyMemberSpec, StatId, Stats } from '../../types';

export const STAT_IDS: StatId[] = ['str', 'vit', 'int', 'per', 'dex', 'agi', 'luk'];
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory'];

export function equippedItems(hero: Hero): ItemDef[] {
  return EQUIP_SLOTS.map((s) => hero.equipment[s]).filter((x): x is NonNullable<typeof x> => !!x).map((i) => getItem(i.itemId));
}

/** 能力値 = 職業の初期値 + 成長ボーナス + 装備 */
export function heroStats(hero: Hero): Stats {
  const base = getClass(hero.classId).stats;
  const out = { ...base };
  for (const k of STAT_IDS) out[k] += hero.bonusStats[k] ?? 0;
  for (const it of equippedItems(hero)) for (const k of STAT_IDS) out[k] += it.stats?.[k] ?? 0;
  return out;
}

export function heroMaxHp(hero: Hero): number {
  const c = getClass(hero.classId);
  // 体力が高いほど最大HPも増える（基準を超えた分の半分。M3-C6）
  const vit = Math.floor(Math.max(0, heroStats(hero).vit - BALANCE.vitHpBase) * BALANCE.vitHpRate);
  return c.baseMaxHp + c.hpPerLevel * (hero.level - 1) + hero.bonusMaxHp + vit + equippedItems(hero).reduce((n, i) => n + (i.maxHp ?? 0), 0);
}

export function heroFocusMax(hero: Hero): number {
  return BALANCE.focusMax + hero.bonusFocusMax + equippedItems(hero).reduce((n, i) => n + (i.focusMax ?? 0), 0);
}

export const heroStartBlock = (hero: Hero) => equippedItems(hero).reduce((n, i) => n + (i.startBlock ?? 0), 0);
export const heroExtraDraw = (hero: Hero) => equippedItems(hero).reduce((n, i) => n + (i.extraDraw ?? 0), 0);

/** 装備の特殊能力（エピック以上。spec §12.7） */
export const heroAbilities = (hero: Hero) =>
  equippedItems(hero)
    .filter((i) => i.ability)
    .map((i) => ({ name: i.ability!.name, effect: i.ability!.effect }));

/** 武器の専用カード（戦闘時に山札へ加わる） */
export function weaponCards(hero: Hero): CardInstance[] {
  const w = hero.equipment.weapon;
  if (!w) return [];
  const def = getItem(w.itemId);
  return (def.cards ?? []).flatMap((c) =>
    Array.from({ length: c.count }, (_, i) => ({ uid: `${w.uid}-${c.cardId}-${i}`, cardId: c.cardId, fromWeapon: true })),
  );
}

/** 戦闘で使う山札（自分の山札 + 武器のカード） */
export function battleDeck(hero: Hero): CardInstance[] {
  return [...hero.deck, ...weaponCards(hero)];
}

/** 次のレベルまでに必要な経験値 */
export const expToNext = (level: number) => BALANCE.expBase + BALANCE.expPerLevel * (level - 1);

/** 戦闘に参加する時の設定 */
export function toPartyMember(hero: Hero): PartyMemberSpec {
  return {
    heroId: hero.id,
    classId: hero.classId,
    gender: hero.gender,
    name: hero.name,
    playerId: hero.playerId,
    level: hero.level,
    hp: hero.hp,
    maxHp: heroMaxHp(hero),
    focus: hero.focus,
    focusMax: heroFocusMax(hero),
    stats: heroStats(hero),
    deck: battleDeck(hero),
    startBlock: heroStartBlock(hero),
    extraDraw: heroExtraDraw(hero),
    abilities: heroAbilities(hero),
    statuses: hero.nextBattleStatuses,
  };
}

/** 装備できるか（武器は職業ごとの種類だけ） */
export function canEquip(hero: Hero, item: ItemDef): string | null {
  if (item.slot === 'consumable') return '装備品ではありません';
  if (item.slot === 'weapon' && item.weaponType !== getClass(hero.classId).weaponType) return `${getClass(hero.classId).name}は装備できません`;
  return null;
}

/** 最大値が変わった時に、HP・フォーカスを上限内に収める */
export function clampHero(hero: Hero) {
  hero.hp = Math.min(hero.hp, heroMaxHp(hero));
  hero.focus = Math.min(hero.focus, heroFocusMax(hero));
}

/** 装備中の武器のレア度（見た目用） */
export function weaponRarity(hero: Hero) {
  const w = hero.equipment.weapon;
  return w ? getItem(w.itemId).rarity : undefined;
}
