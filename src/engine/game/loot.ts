// ===== 宝箱・ドロップ・報酬カード =====
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { ITEMS } from '../../data/items';
import type { GameState, Hero, ItemDef, Loot, Rarity } from '../../types';
import { successDistribution } from '../battle/probability';
import type { Rng } from '../rng';
import { RARITIES, rarityIndex } from './dungeon';
import { pickCard } from './cardTags';
import { jobWeapons } from './hero';
import { heroCardPool } from './jobs';

const pick = <T,>(list: readonly T[], rng: Rng) => list[rng.int(list.length)];

/** 重み（%）の表から1つ選ぶ（index を返す）。合計が100でなくてもよい */
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0) continue;
    x -= weights[i];
    if (x < 0) return i;
  }
  // 浮動小数の誤差で最後まで来た時は、重みのある最後の項目
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
  return 0;
}

/**
 * 宝箱の中身の格の確率（%・コモン/レア/エピック/レジェンド。合計100）。spec §10.2〜10.3
 * look: 宝箱の見た目 / successes: 運のスロットの成功数（成功が多いほど上の格へずれる）
 */
export function chestOdds(look: Rarity, successes = 0): number[] {
  const base = BALANCE.chestOdds[look] ?? BALANCE.chestOdds.common;
  const boost = BALANCE.chestLuckBoost[Math.max(0, Math.min(BALANCE.chestLuckBoost.length - 1, successes))];
  const w = base.map((v, i) => v * boost[i]);
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((v) => (v * 100) / total);
}

/** 確率の表から格を抽選する */
export const rollGrade = (odds: readonly number[], rng: Rng): Rarity => RARITIES[pickWeighted(odds, rng)];

/**
 * レア度に合う装備（パーティの誰かが使える武器を優先）。
 * scenario: そのシナリオ専用の装備（ItemDef.scenario）も候補に入れる。他のシナリオ専用の装備は出さない / slot: 装備の種類をしぼる
 */
export function rollEquipment(rarity: Rarity, heroes: Hero[], rng: Rng, opts: { scenario?: string; slot?: ItemDef['slot'] } = {}): ItemDef {
  const types = new Set(heroes.flatMap((h) => jobWeapons(h.classId)));
  const base = ITEMS.all.filter((i) => i.slot !== 'consumable' && (!opts.slot || i.slot === opts.slot) && (!i.scenario || i.scenario === opts.scenario));
  const pool = base.filter((i) => i.rarity === rarity && (i.slot !== 'weapon' || types.has(i.weaponType!)));
  const fallback = base.filter((i) => rarityIndex(i.rarity) <= rarityIndex(rarity) && (i.slot !== 'weapon' || types.has(i.weaponType!)));
  return pick(pool.length ? pool : fallback.length ? fallback : base, rng);
}

/** その格の消費アイテム（無ければそれより下で一番高い格） */
export function rollConsumable(rarity: Rarity, rng: Rng): ItemDef {
  const all = ITEMS.all.filter((i) => i.slot === 'consumable' && rarityIndex(i.rarity) <= rarityIndex(rarity));
  const top = Math.max(...all.map((i) => rarityIndex(i.rarity)));
  return pick(
    all.filter((i) => rarityIndex(i.rarity) === top),
    rng,
  );
}

export function newItem(game: GameState, def: ItemDef) {
  return { uid: `i${game.nextUid++}`, itemId: def.id };
}

/**
 * 宝箱の中身（spec §10.4）: 格に合う装備か消費アイテム（エピック以上は必ず装備）+ ゴールド + ときどき消費アイテム。
 * 大宝箱は必ず装備・ゴールド2倍・消費アイテム付き。
 */
export function rollChestContents(game: GameState, grade: Rarity, big: boolean, rng: Rng): Loot[] {
  const out: Loot[] = [];
  const equip = big || rng.next() * 100 < (BALANCE.chestEquipChance[grade] ?? 100);
  const main = equip ? rollEquipment(grade, game.heroes, rng, { scenario: game.scenarioId }) : rollConsumable(grade, rng);
  out.push({ kind: 'item', item: newItem(game, main) });
  const g = BALANCE.chestGold[grade] ?? 10;
  out.push({ kind: 'gold', amount: Math.round(g * (0.8 + rng.next() * 0.4)) * (big ? 2 : 1) });
  if (big || (rarityIndex(grade) <= 1 && rng.next() * 100 < BALANCE.chestBonusConsumable))
    out.push({ kind: 'item', item: newItem(game, rollConsumable(big ? 'rare' : 'common', rng)) });
  return out;
}

/** カード報酬の格の確率（%・コモン/レア/エピック） */
export function cardRewardOdds(roomType: string): number[] {
  return [...(BALANCE.cardRewardOdds[roomType] ?? BALANCE.cardRewardOdds.battle)];
}

/** 報酬カード3枚（生きているキャラの職業の候補から。重複なし）。1枚ずつ格を抽選する（spec §13） */
export function rollCardOffers(game: GameState, heroIds: string[], rng: Rng, odds: readonly number[] = cardRewardOdds('battle')): { cardId: string; heroId: string }[] {
  const offers: { cardId: string; heroId: string }[] = [];
  const heroes = game.heroes.filter((h) => heroIds.includes(h.id));
  if (!heroes.length) return offers;
  for (let tries = 0; offers.length < 3 && tries < 30; tries++) {
    const h = heroes[(offers.length + tries) % heroes.length];
    const pool = heroCardPool(h);
    if (!pool.length) continue;
    // 抽選した格のカード。その格が無ければ1つ下の格へ
    let grade = pickWeighted(odds, rng);
    let cands: string[] = [];
    for (; grade >= 0 && !cands.length; grade--) cands = pool.filter((id) => rarityIndex(CARDS.get(id).rarity ?? 'common') === grade);
    // 3枚のうち最後の1枚は完全ランダム、ほかは今の山札・装備と相性の良いカードが出やすい（スマート抽選）
    const cardId = pickCard(cands.length ? cands : pool, h, rng, offers.length < 2);
    if (!offers.some((o) => o.cardId === cardId && o.heroId === h.id)) offers.push({ cardId, heroId: h.id });
  }
  return offers;
}

/**
 * このキャラ・フォーカスで開けた時の、中身の格の確率（%）。
 * 運のスロットの成功数の確率 × 成功数ごとの確率表 を足し合わせたもの（開ける前に見せる本当の確率）
 */
export function expectedChestOdds(look: Rarity, slots: number, focus: number, chance: number): number[] {
  const dist = successDistribution(slots, focus, chance);
  const out = [0, 0, 0, 0];
  dist.forEach((p, s) => chestOdds(look, s).forEach((v, i) => (out[i] += p * v)));
  return out;
}
