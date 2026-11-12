// ===== 冒険のエンジンの小さな道具（game.ts と world/ で共有する） =====
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import { getPet } from '../../data/pets';
import type { GameState, Hero, ItemInstance, Loot, SlotResult, StatId } from '../../types';
import type { Rng } from '../rng';
import { finalChanceOf } from './checks';
import { rarityIndex } from './dungeon';
import { findHero, livingHeroes, sceneHeroes } from './heroes';
import { equippedItems, heroStats, pouchLimitOf } from './hero';
import { petExplore } from './pets';
import { exploreEffects } from './exploreAbilities';

/** 報酬・売却で稼いだお金。初期所持金や仲間からの送金は含めない。 */
export function earnGold(hero: Hero, amount: number) {
  hero.gold += amount;
  if (amount > 0) {
    const f = (hero.feats ??= {});
    f.goldEarned = (f.goldEarned ?? 0) + amount;
  }
}

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
    const limit = pouchLimitOf(hero);
    if (hero.pouch.length >= limit || (def.pouchMax !== undefined && hero.pouch.filter((p) => p.itemId === def.id).length >= def.pouchMax)) {
      const g = rarityIndex(def.rarity) * 15 + 10;
      earnGold(hero, g);
      return `${def.name}（${hero.name}の袋が${hero.pouch.length >= limit ? '満杯' : `${def.name}でいっぱい`}のため${g}Gに換えた）`;
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
  heroes.forEach((h, i) => earnGold(h, each + (i < amount % heroes.length ? 1 : 0)));
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
  const effects = exploreEffects(hero);
  // お供（黒猫）: 宝箱の運の判定
  const pet = tag === 'luck' ? (petExplore(hero).luckBonus ?? 0) : 0;
  const ab = getClass(hero.classId).battleAbility.effect;
  const chest = tag === 'luck' && 'modifier' in ab && ab.modifier === 'chestChance' ? ab.bonus : 0;
  return effects.reduce((n, e) => n + (e.kind === 'checkBonus' && e.check === tag ? e.bonus : 0), 0) + pet + chest;
}

/** 探索の特殊能力: 選択肢が増える（パーティの誰かが持っていればよい） */
export function partyHasTag(game: GameState, tag: string): boolean {
  return sceneHeroes(game).some((h) => {
    if (h.hp <= 0) return false;
    const c = getClass(h.classId);
    const e = c.exploreAbility.effect;
    // 探索の能力・ジョブの印・お供の印（狩人の道やオカメインコは 'scout'）
    return (e.kind === 'extraEventOption' && e.tag === tag) || !!c.tags?.includes(tag) || (!!h.pet && !!getPet(h.pet.petId).tags?.includes(tag));
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

/** 装備の「お供を連れている時、イベントの判定+N%」（夢つかみ）の合計。お供がいなければ 0 */
export function petEventBonusOf(hero: Hero | undefined): number {
  if (!hero?.pet) return 0;
  return equippedItems(hero).reduce((n, it) => n + (it.explore?.petEvent ?? 0), 0);
}

/** ダンジョンの地図に最初から出る物（生きている仲間の装備。羅針盤 = 休憩部屋 / 星図 = 通路と扉の全部） */
export function partyMapReveal(game: GameState): { rest: boolean; layout: boolean } {
  const kinds = new Set(livingHeroes(game).flatMap((h) => equippedItems(h).map((it) => it.explore?.reveal)));
  return { rest: kinds.has('rest'), layout: kinds.has('layout') };
}

/** 能力値による判定の成功率 */
export function statChance(hero: Hero, stat: StatId, tag?: string, event?: boolean): number {
  // イベントの判定: お供（子狐）の上乗せ・装備（夢つかみ）の上乗せ
  return finalChanceOf(heroStats(hero)[stat] + checkBonus(hero, tag) + (event ? checkBonus(hero, 'event') + (petExplore(hero).eventBonus ?? 0) + petEventBonusOf(hero) : 0));
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
  const discount = hero ? Math.max(0, ...exploreEffects(hero).map(e => e.kind === 'shopDiscount' ? e.percent : 0)) : 0;
  return discount ? Math.max(1, Math.floor(price * (100 - discount) / 100)) : price;
}

/** 探索の特殊能力: 祠とイベントのマスが霧の中でも見えるキャラがいるか（召喚士など） */
export const partySenses = (game: GameState) => game.heroes.some((h) => !h.retired && getClass(h.classId).exploreAbility.effect.kind === 'sense');
