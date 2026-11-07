// ===== 冒険のエンジンの小さな道具（game.ts と world/ で共有する） =====
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import { getItem, POUCH_LIMIT } from '../../data/items';
import type { GameState, Hero, ItemInstance, Loot, SlotResult, StatId } from '../../types';
import type { Rng } from '../rng';
import { finalChanceOf } from './checks';
import { rarityIndex } from './dungeon';
import { findHero, livingHeroes, sceneHeroes } from './heroes';
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

/** そのキャラの持ち物に入れる（消費アイテムは袋。袋が満杯ならゴールドに換える） */
export function addItem(game: GameState, hero: Hero, item: ItemInstance, gainedInDungeon: boolean): string {
  const def = getItem(item.itemId);
  if (def.slot === 'consumable') {
    if (hero.pouch.length >= POUCH_LIMIT) {
      const g = rarityIndex(def.rarity) * 15 + 10;
      hero.gold += g;
      return `${def.name}（${hero.name}の袋が満杯のため${g}Gに換えた）`;
    }
    hero.pouch.push(item);
  } else {
    hero.stash.push(item);
    if (gainedInDungeon && game.dungeon) game.dungeon.gained.push(item);
  }
  if (game.stats.bestRarity === undefined || rarityIndex(def.rarity) > rarityIndex(game.stats.bestRarity)) game.stats.bestRarity = def.rarity;
  return def.name;
}

/** お金を何人かで山分けする（割り切れない分は先頭の人から1Gずつ） */
export function splitGold(heroes: Hero[], amount: number) {
  if (!heroes.length || amount <= 0) return;
  const each = Math.floor(amount / heroes.length);
  heroes.forEach((h, i) => (h.gold += each + (i < amount % heroes.length ? 1 : 0)));
}

/** 持ち物の数が一番少ない人（品物を配る時に、偏らないように） */
export const leastLoaded = (heroes: Hero[]) => [...heroes].sort((a, b) => a.stash.length + a.pouch.length - (b.stash.length + b.pouch.length))[0];

/**
 * 手に入れたものを配る。お金は山分け、品物は持ち物の少ない人から、カードはそのキャラへ。
 * だれが受け取ったかを loot に書き込む（画面で見せる）
 */
export function addLoot(game: GameState, loot: Loot[], recipients: Hero[]) {
  const to = recipients.filter((h) => !h.retired);
  if (!to.length) return;
  for (const l of loot) {
    if (l.kind === 'gold') {
      splitGold(to, l.amount);
      l.to = to.map((h) => h.id);
    } else if (l.kind === 'item') {
      const h = to.length === 1 ? to[0] : leastLoaded(to);
      addItem(game, h, l.item, true);
      l.to = h.id;
    } else if (l.kind === 'card') {
      const h = findHero(game, l.heroId);
      if (h) h.deck.push({ uid: `c${game.nextUid++}`, cardId: l.cardId });
    }
  }
}

/** 今の場面のキャラのお金の合計（表示用） */
export const partyGold = (game: GameState) => sceneHeroes(game).reduce((n, h) => n + h.gold, 0);
/** 全員のお金の合計（表示用） */
export const totalGold = (game: GameState) => game.heroes.reduce((n, h) => n + (h.retired ? 0 : h.gold), 0);

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

/** 探索の特殊能力: 移動力の判定のスロット（武闘家など） */
export function moveSlotsOf(hero: Hero): number {
  const e = getClass(hero.classId).exploreAbility.effect;
  return BALANCE.moveSlots + (e.kind === 'moveSlots' ? e.slots : 0);
}

/** 探索の特殊能力: 野営・休憩の回復の倍率（僧侶など） */
export function restMultiplierOf(hero: Hero): number {
  const e = getClass(hero.classId).exploreAbility.effect;
  return e.kind === 'restBonus' ? e.multiplier : 1;
}

/** 探索の特殊能力: 野営で追加で回復するフォーカス（闘士など） */
export function campFocusOf(hero: Hero): number {
  const e = getClass(hero.classId).exploreAbility.effect;
  return e.kind === 'campFocus' ? e.amount : 0;
}

/** 探索の特殊能力: 町の買い物の値段（怪盗の変装など。値引きは切り捨て） */
export function shopPriceFor(hero: Hero | undefined, price: number): number {
  const e = hero ? getClass(hero.classId).exploreAbility.effect : undefined;
  return e?.kind === 'shopDiscount' ? Math.max(1, Math.floor((price * (100 - e.percent)) / 100)) : price;
}

/** 探索の特殊能力: 祠とイベントのマスが霧の中でも見えるキャラがいるか（召喚士など） */
export const partySenses = (game: GameState) => game.heroes.some((h) => !h.retired && getClass(h.classId).exploreAbility.effect.kind === 'sense');
