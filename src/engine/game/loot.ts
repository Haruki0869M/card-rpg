// ===== 宝箱・ドロップ・報酬カード =====
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { getClass } from '../../data/classes';
import { ITEMS } from '../../data/items';
import type { GameState, Hero, ItemDef, Loot, Rarity } from '../../types';
import type { Rng } from '../rng';
import { rarityIndex } from './dungeon';

const pick = <T,>(list: readonly T[], rng: Rng) => list[rng.int(list.length)];

/** レア度に合う装備（パーティの誰かが使える武器を優先） */
export function rollEquipment(rarity: Rarity, heroes: Hero[], rng: Rng): ItemDef {
  const types = new Set(heroes.map((h) => getClass(h.classId).weaponType));
  const pool = ITEMS.all.filter((i) => i.slot !== 'consumable' && i.rarity === rarity && (i.slot !== 'weapon' || types.has(i.weaponType!)));
  const fallback = ITEMS.all.filter((i) => i.slot !== 'consumable' && rarityIndex(i.rarity) <= rarityIndex(rarity));
  return pick(pool.length ? pool : fallback, rng);
}

export function rollConsumable(rarity: Rarity, rng: Rng): ItemDef {
  const pool = ITEMS.all.filter((i) => i.slot === 'consumable' && rarityIndex(i.rarity) <= rarityIndex(rarity));
  return pick(pool, rng);
}

export function newItem(game: GameState, def: ItemDef) {
  return { uid: `i${game.nextUid++}`, itemId: def.id };
}

/** 宝箱の中身: 装備1つ（大宝箱は必ず）+ ゴールド + ときどき消費アイテム */
export function rollChestContents(game: GameState, rarity: Rarity, big: boolean, rng: Rng): Loot[] {
  const out: Loot[] = [];
  const alive = game.heroes;
  if (big || rng.next() < 0.75) out.push({ kind: 'item', item: newItem(game, rollEquipment(rarity, alive, rng)) });
  else out.push({ kind: 'item', item: newItem(game, rollConsumable(rarity, rng)) });
  const g = BALANCE.chestGold[rarity] ?? 15;
  out.push({ kind: 'gold', amount: Math.round(g * (0.8 + rng.next() * 0.4)) * (big ? 2 : 1) });
  if (big || rng.next() < 0.35) out.push({ kind: 'item', item: newItem(game, rollConsumable(rarity, rng)) });
  return out;
}

/** 報酬カード3枚（生きているキャラの職業の候補から。重複なし） */
export function rollCardOffers(game: GameState, heroIds: string[], rng: Rng): { cardId: string; heroId: string }[] {
  const offers: { cardId: string; heroId: string }[] = [];
  const heroes = game.heroes.filter((h) => heroIds.includes(h.id));
  if (!heroes.length) return offers;
  for (let tries = 0; offers.length < 3 && tries < 30; tries++) {
    const h = heroes[(offers.length + tries) % heroes.length];
    const pool = getClass(h.classId).cardPool.filter((id) => CARDS.has(id));
    // レアカードは出にくい
    const weighted = pool.filter((id) => CARDS.get(id).rarity !== 'rare' || rng.next() < 0.4);
    const cardId = pick(weighted.length ? weighted : pool, rng);
    if (!offers.some((o) => o.cardId === cardId && o.heroId === h.id)) offers.push({ cardId, heroId: h.id });
  }
  return offers;
}
