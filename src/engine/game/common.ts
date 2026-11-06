// ===== 冒険のエンジンの小さな道具（game.ts と world/ で共有する） =====
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import { getItem, POUCH_LIMIT } from '../../data/items';
import type { GameState, Hero, ItemInstance, Loot, SlotResult, StatId } from '../../types';
import type { Rng } from '../rng';
import { finalChanceOf } from './checks';
import { rarityIndex } from './dungeon';
import { findHero, livingHeroes } from './heroes';
import { heroStats } from './hero';

export function addLog(game: GameState, text: string) {
  game.log.push({ id: game.nextLogId++, text });
  if (game.log.length > 120) game.log.splice(0, game.log.length - 120);
}

export const ownedBy = (hero: Hero | undefined, playerId: string) => !!hero && hero.playerId === playerId;
export const isPartyPlayer = (game: GameState, playerId: string) => game.heroes.some((h) => h.playerId === playerId);

export function rollWithFocus(slots: number, focusUsed: number, chance: number, rng: Rng): SlotResult[] {
  const out: SlotResult[] = [];
  for (let i = 0; i < slots; i++) out.push(i < focusUsed ? 'focus' : rng.next() < chance / 100 ? 'hit' : 'miss');
  return out;
}

export const successes = (r: SlotResult[]) => r.filter((x) => x !== 'miss').length;

/** 持ち物に入れる（消費アイテムは袋。袋が満杯ならゴールドに換える） */
export function addItem(game: GameState, item: ItemInstance, gainedInDungeon: boolean): string {
  const def = getItem(item.itemId);
  if (def.slot === 'consumable') {
    if (game.pouch.length >= POUCH_LIMIT) {
      const g = rarityIndex(def.rarity) * 15 + 10;
      game.gold += g;
      return `${def.name}（袋が満杯のため${g}Gに換えた）`;
    }
    game.pouch.push(item);
  } else {
    game.stash.push(item);
    if (gainedInDungeon && game.dungeon) game.dungeon.gained.push(item);
  }
  if (game.stats.bestRarity === undefined || rarityIndex(def.rarity) > rarityIndex(game.stats.bestRarity)) game.stats.bestRarity = def.rarity;
  return def.name;
}

export function addLoot(game: GameState, loot: Loot[]) {
  for (const l of loot) {
    if (l.kind === 'gold') game.gold += l.amount;
    else if (l.kind === 'item') addItem(game, l.item, true);
    else if (l.kind === 'card') {
      const h = findHero(game, l.heroId);
      if (h) h.deck.push({ uid: `c${game.nextUid++}`, cardId: l.cardId });
    }
  }
}

/** 探索の特殊能力: 判定のボーナス */
export function checkBonus(hero: Hero, tag: string | undefined): number {
  if (!tag) return 0;
  const e = getClass(hero.classId).exploreAbility.effect;
  return e.kind === 'checkBonus' && e.check === tag ? e.bonus : 0;
}

/** 探索の特殊能力: 選択肢が増える（パーティの誰かが持っていればよい） */
export function partyHasTag(game: GameState, tag: string): boolean {
  return livingHeroes(game).some((h) => {
    const e = getClass(h.classId).exploreAbility.effect;
    return e.kind === 'extraEventOption' && e.tag === tag;
  });
}

/** 隠し宝箱を見つける確率（%） */
export function hiddenChestChance(game: GameState): number {
  let bonus = 0;
  for (const h of livingHeroes(game)) {
    const e = getClass(h.classId).exploreAbility.effect;
    if (e.kind === 'tracking') bonus = Math.max(bonus, e.hiddenFindBonus);
  }
  return BALANCE.hiddenChestBase + bonus;
}

/** 能力値による判定の成功率 */
export function statChance(hero: Hero, stat: StatId, tag?: string): number {
  return finalChanceOf(heroStats(hero)[stat] + checkBonus(hero, tag));
}
