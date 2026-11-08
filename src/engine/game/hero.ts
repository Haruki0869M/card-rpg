// ===== 冒険中のキャラ（装備・成長を反映した能力値など） =====
import { BALANCE } from '../../data/balance';
import { petAbilities } from './pets';
import { getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import type { CardInstance, EquipSlot, Hero, ItemDef, JobTier, PartyMemberSpec, StatId, Stats } from '../../types';

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
export const heroAbilities = (hero: Hero) => [
  // 転職で持ち越した、前のジョブの戦闘の特殊能力（spec §6.4）
  ...(hero.carried && hero.carried !== hero.classId ? [{ ...getClass(hero.carried).battleAbility, source: { kind: 'inherited' as const, id: hero.carried, label: getClass(hero.carried).name } }] : []),
  ...equippedItems(hero)
    .filter((i) => i.ability)
    .map((i) => ({ ...i.ability!, source: { kind: 'equipment' as const, id: i.id, label: i.name } })),
  // お供の能力（獣使い系統は2倍）
  ...petAbilities(hero),
];

/** 武器に宿った属性（その武器を持っている間だけ） */
export const heroWeaponElement = (hero: Hero) => (hero.weaponElement && hero.equipment.weapon?.uid === hero.weaponElement.uid ? hero.weaponElement.element : undefined);

/** そのジョブが装備できる武器の種類（得意な武器＋使える武器） */
export const jobWeapons = (classId: string): string[] => {
  const c = getClass(classId);
  return [c.weaponType, ...(c.subWeapons ?? [])];
};

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
/** 次のレベルに必要な経験値。段が上がるほど多く、転職直後の Lv1→2 は軽い（spec §6.4） */
export function expToNext(level: number, classId?: string): number {
  const base = BALANCE.expBase + BALANCE.expPerLevel * (level - 1);
  const tier = classId ? jobTierIndex(getClass(classId).tier) : 0;
  const first = tier > 0 && level === 1 ? BALANCE.firstLevelExpMul : 1;
  return Math.round(base * BALANCE.tierExpMul ** tier * first);
}

/** 段の高さ（基本0・中位1・最上位と特殊2） */
export const jobTierIndex = (tier: JobTier | undefined) => (tier === 'mid' ? 1 : tier === 'top' || tier === 'special' ? 2 : 0);

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
    ...(hero.pet ? { pet: { petId: hero.pet.petId, color: hero.pet.color, name: hero.pet.name, love: hero.pet.love } } : {}),
    ...(heroWeaponElement(hero) ? { weaponElement: heroWeaponElement(hero) } : {}),
      ...(hero.equipment.weapon ? { equippedWeaponType: getItem(hero.equipment.weapon.itemId).weaponType } : {}),
  };
}

/** 装備できるか（武器は職業ごとの種類だけ） */
export function canEquip(hero: Hero, item: ItemDef): string | null {
  if (item.slot === 'consumable') return '装備品ではありません';
  if (item.slot === 'weapon' && !jobWeapons(hero.classId).includes(item.weaponType ?? '')) return `${getClass(hero.classId).name}は装備できません`;
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
