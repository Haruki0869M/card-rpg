// ===== 賢い bot（3段目。オーナーの決定 2026-11-13「工夫する bot をもっと賢くする」）=====
// 工夫する bot（botClever.ts）の上に、次の5つの工夫を足す。工夫は1つずつ外せる（どれが効いているかを測るため）。
//   shop  = 買い物と装備: 町・行商人・闇商人で、ジョブと山札に合う装備・消耗品を買う。要らない装備は売る。装備はジョブの得意な武器・主に使う能力値・特殊能力で選ぶ
//   cards = カードの選び方: カード報酬を山札との相性で選ぶ（取らない、も選ぶ）。町で弱いカードを削る。レベルアップの成長も山札に合わせる
//   items = 消耗品の使い時: 倒れそうな時・ボスや中ボス・大技の予告の時に使う。戦闘の外でも、傷が深ければ薬を使う
//   team  = 仲間どうしの連携: 倒し切れる敵・こちらを強く殴る敵に集中する。敵の番に受けるダメージ（画面の被弾予定）を見て守る。BREAK を弱点の仲間に任せる
//   time  = 時間（侵食度）の使い方: 侵食度と残りのダンジョンの数を見て、間に合わない時は寄り道・レベル上げ・町へ戻るのをやめる
//
// ずるをしない（工夫する bot と同じ決まり）:
//   - 見るのは画面に出ている情報だけ（自分たちの山札・装備・袋・お金、店の品物、敵の予告と被弾予定、侵食度、制覇したダンジョン）。
//   - これから引く乱数・霧の中・まだ入っていない部屋の中身・山札の並び順は見ない。
//   - 乱数は使わない（判断は全部、決まった順の比べ合い）。同じ種なら、いつも同じ結果。
//   - ゲームに断られた操作は覚えておき、同じ場面では二度と送らない（ほかの手に落ちる。止まらない）。
// 数字（「HP 3割で薬」など）は bot の作戦の提案で、ゲームの中身ではない。名前を付けてここに置く。
import { cardOf, getCard } from '../data/cards';
import { getClass } from '../data/classes';
import { DUNGEONS } from '../data/dungeons';
import { getItem } from '../data/items';
import { TOWNS } from '../data/world';
import { BALANCE } from '../data/balance';
import { elementGuide } from '../components/battle/elementGuide';
import type { AllyState, BattleState, CardDef, EnemyState, GameCommand, GameState, Hero, ItemDef, StatId } from '../types';
import type { BattleAdjust } from './botClever';
import { canBreak } from './battle/effects';
import { incomingDamage, intentHitsOn } from './battle/intents';
import { isDone, tierDamageAgainst, unusableReason } from './battle/battle';
import { baseStarterCardIds, cardTags } from './game/cardTags';
import { shopPriceFor } from './game/common';
import { rarityIndex } from './game/dungeon';
import { canEquip, heroMaxHp, pouchLimitOf, STAT_IDS } from './game/hero';
import { findHero, livingHeroes } from './game/heroes';
import { corruptionShown } from './game/world/corruptionShown';
import { hexDistance } from './game/world/hex';

export type SmartPart = 'shop' | 'cards' | 'items' | 'team' | 'time';
export const SMART_PARTS: SmartPart[] = ['shop', 'cards', 'items', 'team', 'time'];

/** 賢い bot の覚え（BotMemo に入れる） */
export interface SmartMemo {
  /** 外す工夫（測る道具用） */
  off: Set<SmartPart>;
  /** ゲームに断られた操作（場面の印 ＋ 操作の中身）。同じ場面では二度と送らない */
  refused: Set<string>;
  /** 町でカードを削った訪問（1回の訪問で1枚まで） */
  removed: Set<string>;
  /** 最後に町に入ったワールドターン（買い物の寄り道を続けてしない） */
  lastShop?: number;
}

export const newSmartMemo = (off: SmartPart[] = []): SmartMemo => ({ off: new Set(off), refused: new Set(), removed: new Set() });

/** その工夫を使うか */
export const smartUses = (sm: SmartMemo | undefined, part: SmartPart) => !!sm && !sm.off.has(part);

/** 送る操作と、断られた時に覚える印 */
export interface SmartPick {
  cmd: GameCommand;
  key: string;
}

/** 場面の印（ワールドターン・場面・戦闘とそのラウンド）。断られた操作は、この印が同じ間は送らない */
const momentOf = (g: GameState) => `${g.world?.worldTurn ?? 0}|${g.mode}|${g.battle ? `${g.battle.seed}:${g.battle.turn}` : ''}|`;

/** 候補の中で、まだ断られていない最初の操作 */
function firstOk(sm: SmartMemo, g: GameState, cmds: (GameCommand | undefined)[]): SmartPick | undefined {
  for (const cmd of cmds) {
    if (!cmd) continue;
    const key = momentOf(g) + JSON.stringify(cmd);
    if (!sm.refused.has(key)) return { cmd, key };
  }
  return undefined;
}

// ---------- bot の作戦の数字（提案。ゲームの数値ではない） ----------

/** 装備の点の重み */
const SHOP_W = { rarity: 3, mainStat: 1, guardStat: 0.3, otherStat: 0.15, maxHp: 0.4, startBlock: 0.6, focusMax: 5, extraDraw: 8, ability: 4, cards: 2, mainWeapon: 4, tag: 1 };
/** 装備を替える・買う時の、点の差の下限 */
const SHOP_MIN_GAIN = 1;
/** 町で使わずに残すお金（宿代の何回分） */
const SHOP_RESERVE_INNS = 2;
/** 行商人・闇商人で残すお金 */
const SHOP_PEDDLER_RESERVE = 30;
/** 袋に持っておきたい回復の道具の数 */
const SHOP_HEAL_STOCK = 2;
/** 買い物の寄り道: 町までの距離（マス）・1人あたりのお金の平均・前に町に入ってからのワールドターン */
const SHOP_DETOUR_DIST = 4;
const SHOP_DETOUR_GOLD = 150;
const SHOP_DETOUR_EVERY = 12;
/** 買う消耗品（使い方を知っている物だけ。前ほど先に買う） */
const SHOP_CONSUMABLES = ['hiPotion', 'potion', 'healingCenser', 'flashShard', 'ironBanner', 'stoneShieldPaste', 'heroElixir', 'inspiredFocusTea', 'frostGem', 'blazeJar', 'venomOil'];

/** カードの点の重み */
const CARD_W = { rarity: 3, starter: 2, mainStat: 2, offStat: 2, tag: 1, upgraded: 1 };
/** カード報酬・町のカード: 山札の平均の点より、これだけ上なら取る（山札を太らせない） */
const CARD_TAKE_MARGIN = 2;
/** 山札がこの枚数より少ない間は、点が平均に届かなくても一番良い札を取る */
const CARD_SMALL_DECK = 8;
/** 町でカードを削るのは、山札がこの枚数より多い時だけ */
const CARD_REMOVE_ABOVE = 9;

/** 戦闘: 回復の道具を使うHPの割合（これ以下）・被弾予定を引いた残りの割合（これ以下） */
const ITEM_LOW_HP = 0.3;
const ITEM_DANGER_HP = 0.15;
/** 全体回復の道具: この割合より下の味方が2人以上 */
const ITEM_GROUP_HP = 0.5;
/** 戦闘の外: この割合より下なら回復の道具を使う（足りない分が道具の回復量のこの割合以上の時だけ。無駄にしない） */
const ITEM_FIELD_HP = 0.5;
const ITEM_FIELD_WASTE = 0.7;
/** 浄化の聖結晶を使う侵食度 */
const ITEM_PURIFY_AT = 40;

/** 連携の点 */
const TEAM = { kill: 25, threatPerDmg: 0.5, threatCap: 30, threatPerHp: 15, leaveBreak: 30, blockDeadly: 60, blockHeavy: 15, blockIdle: -8, healDeadly: 40, heavyShare: 0.4 };

/** 時間: 残りの鍵のダンジョン・最後のダンジョン1つに見込む侵食度と、余裕 */
const TIME_PER_DUNGEON = 15;
const TIME_MARGIN = 10;
/** 時間が足りない時に、町へ戻るHPの割合（ふだんは5割） */
const TIME_HURT_LATE = 0.3;

// ---------- 能力値・点 ----------

const CATEGORY_STAT: Record<string, StatId> = { physical: 'str', magic: 'int', skill: 'dex' };
const hasDamage = (c: CardDef) => c.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'));
/** カードの成功率の基準の能力値（カードに書いてあればそれ。無ければ種類: 物理＝力・魔法＝知力・スキル＝器用） */
export const cardStatOf = (c: CardDef): StatId => c.stat ?? CATEGORY_STAT[c.category] ?? 'str';

/**
 * 主に使う能力値: 冒険の山札（武器のカードは入れない。装備を替えるたびに変わって、行ったり来たりしないように）で、
 * ダメージのあるカードを2・ほかを1と数えて一番多い能力値。同じならジョブの伸びやすい能力値
 */
export function mainStat(h: Hero): StatId {
  const n: Partial<Record<StatId, number>> = {};
  for (const c of h.deck) {
    const d = cardOf(c);
    const s = cardStatOf(d);
    n[s] = (n[s] ?? 0) + (hasDamage(d) ? 2 : 1);
  }
  const gw = getClass(h.classId).growthWeights ?? {};
  return [...STAT_IDS].sort((a, b) => (n[b] ?? 0) - (n[a] ?? 0) || (gw[b] ?? 0) - (gw[a] ?? 0))[0];
}

/** 山札の印（最初の山札の札も数える。装備は入れない: 行ったり来たりしないように） */
function deckTags(h: Hero): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of h.deck) for (const t of cardTags(cardOf(c))) if (t !== 'physical' && t !== 'magic' && t !== 'skill') m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/** 装備の点（装備できない時は -Infinity）。ジョブの得意な武器・主に使う能力値・特殊能力・山札の印との重なりを見る */
export function itemScore(h: Hero, def: ItemDef, main = mainStat(h), tags = deckTags(h)): number {
  if (canEquip(h, def)) return -Infinity;
  let s = rarityIndex(def.rarity) * SHOP_W.rarity;
  for (const [k, v] of Object.entries(def.stats ?? {})) s += (v ?? 0) * (k === main ? SHOP_W.mainStat : k === 'vit' || k === 'agi' ? SHOP_W.guardStat : SHOP_W.otherStat);
  s += (def.maxHp ?? 0) * SHOP_W.maxHp + (def.startBlock ?? 0) * SHOP_W.startBlock + (def.focusMax ?? 0) * SHOP_W.focusMax + (def.extraDraw ?? 0) * SHOP_W.extraDraw;
  if (def.ability) s += SHOP_W.ability;
  if (def.cards?.length) s += SHOP_W.cards;
  if (def.slot === 'weapon' && def.weaponType === getClass(h.classId).weaponType) s += SHOP_W.mainWeapon;
  s += (def.tags ?? []).filter((t) => (tags.get(t) ?? 0) > 0).length * SHOP_W.tag;
  return s;
}

/** 今の装備の点（何も付けていなければ 0） */
function equippedScore(h: Hero, slot: string, main: StatId, tags: Map<string, number>): number {
  const cur = h.equipment[slot as 'weapon' | 'armor' | 'accessory'];
  return cur ? itemScore(h, getItem(cur.itemId), main, tags) : 0;
}

/** その装備に替えると、点がどれだけ上がるか */
export function equipGain(h: Hero, def: ItemDef): number {
  if (def.slot === 'consumable') return -Infinity;
  const main = mainStat(h);
  const tags = deckTags(h);
  return itemScore(h, def, main, tags) - equippedScore(h, def.slot, main, tags);
}

/** カードの点: 格・主に使う能力値と合うか・山札の印との重なり・最初の山札の基本の札か */
export function cardValue(h: Hero, def: CardDef, main = mainStat(h), tags = deckTags(h), upgraded = false): number {
  let v = rarityIndex(def.rarity ?? 'common') * CARD_W.rarity;
  if (baseStarterCardIds().has(def.id)) v -= CARD_W.starter;
  if (hasDamage(def)) v += cardStatOf(def) === main ? CARD_W.mainStat : -CARD_W.offStat;
  v += cardTags(def).filter((t) => t !== def.category && (tags.get(t) ?? 0) > 0).length * CARD_W.tag;
  if (upgraded) v += CARD_W.upgraded;
  return v;
}

const deckValues = (h: Hero) => {
  const main = mainStat(h);
  const tags = deckTags(h);
  return h.deck.map((c) => ({ c, v: cardValue(h, getCard(c.cardId), main, tags, !!c.upgraded) }));
};

// ---------- 1. 買い物と装備 ----------

/** 持ち物の装備を、点が上がる時だけ付ける（使えない・上がらない人が持っていたら、同じ場所の上がる仲間に渡す）。普通の bot の equipBest の代わり */
export function smartEquipCommand(g: GameState, sm: SmartMemo): SmartPick | undefined {
  const near = (a: string, b: string) => !g.world || g.activeScene !== undefined || g.world.pos[a] === g.world.pos[b];
  const heroes = livingHeroes(g).filter((h) => !g.party || g.party.includes(h.id));
  const scene = g.mode === 'world' ? heroes.filter((h) => !g.expeditions?.some((x) => x.heroes.includes(h.id))) : heroes;
  const cmds: GameCommand[] = [];
  for (const owner of scene) {
    for (const inst of owner.stash) {
      const def = getItem(inst.itemId);
      if (def.slot === 'consumable') continue;
      if (equipGain(owner, def) > SHOP_MIN_GAIN) cmds.push({ type: 'EQUIP', playerId: owner.playerId, heroId: owner.id, itemUid: inst.uid });
      const to = scene.filter((h) => h !== owner && near(h.id, owner.id) && equipGain(h, def) > SHOP_MIN_GAIN).sort((a, b) => equipGain(b, def) - equipGain(a, def))[0];
      if (to && equipGain(to, def) > Math.max(SHOP_MIN_GAIN, equipGain(owner, def))) cmds.unshift({ type: 'GIVE', playerId: owner.playerId, fromHeroId: owner.id, toHeroId: to.id, itemUid: inst.uid });
    }
  }
  return firstOk(sm, g, cmds);
}

/** 町に入ったキャラのうち、まだ利用を終えていない最初のキャラ（普通の bot が町の操作を送る相手と同じ） */
function townMember(g: GameState): Hero | undefined {
  const t = g.town;
  if (!t) return undefined;
  const id = (t.members ?? [t.heroId]).find((x) => !t.finished?.includes(x));
  const h = id ? findHero(g, id) : undefined;
  return h && h.hp > 0 && !h.retired ? h : undefined;
}

const isHealItem = (def: ItemDef) => !!def.use?.some((e) => e.kind === 'heal') && !def.use.some((e) => 'to' in e && e.to === 'allies');

/** 町: 要らない装備を売る → 点が上がる装備を買う → 消耗品を買う（お金は宿代の分を残す） */
export function smartTownShopCommand(g: GameState, sm: SmartMemo): SmartPick | undefined {
  const t = g.town;
  const w = g.world;
  const v = townMember(g);
  if (!t || !w || !v) return undefined;
  const cmds: GameCommand[] = [];
  const party = g.heroes.filter((h) => !h.retired);
  // 売る: だれが付けても点が上がらない装備（持ち物にある物だけ。付けている物は売らない）
  for (const inst of v.stash) {
    const def = getItem(inst.itemId);
    if (def.slot === 'consumable') continue;
    if (party.every((h) => !(equipGain(h, def) > 0))) cmds.push({ type: 'TOWN_SELL', playerId: v.playerId, heroId: v.id, itemUid: inst.uid });
  }
  const stock = w.shops[t.townId];
  if (stock) {
    const budget = v.gold - TOWNS.get(t.townId).innCost * SHOP_RESERVE_INNS;
    const price = (p: number) => shopPriceFor(v, p, g);
    // 装備: 点の上がり方が一番大きい物
    const eq = stock.items
      .map((e, index) => ({ e, index, def: getItem(e.item.itemId) }))
      .filter(({ e, def }) => !e.sold && def.slot !== 'consumable' && price(e.price) <= budget && equipGain(v, def) > SHOP_MIN_GAIN)
      .sort((a, b) => equipGain(v, b.def) - equipGain(v, a.def) || a.index - b.index);
    for (const x of eq) cmds.push({ type: 'TOWN_BUY', playerId: v.playerId, heroId: v.id, kind: 'item', index: x.index });
    // 消耗品: 袋に空きがあれば。回復の道具は SHOP_HEAL_STOCK 個まで、ほかは袋に1つ空きを残す
    const room = pouchLimitOf(v) - v.pouch.length;
    const heals = v.pouch.filter((p) => isHealItem(getItem(p.itemId))).length;
    for (const id of SHOP_CONSUMABLES) {
      if (room <= 0) break;
      const def = getItem(id);
      const heal = isHealItem(def);
      if (heal ? heals >= SHOP_HEAL_STOCK : room <= 1) continue;
      if (def.pouchMax !== undefined && v.pouch.filter((p) => p.itemId === id).length >= def.pouchMax) continue;
      const index = stock.items.findIndex((e) => !e.sold && e.item.itemId === id && price(e.price) <= budget);
      if (index >= 0) cmds.push({ type: 'TOWN_BUY', playerId: v.playerId, heroId: v.id, kind: 'item', index });
    }
  }
  return firstOk(sm, g, cmds);
}

/** 行商人・闇商人: 点が上がる装備を買い、ほかに無ければ店を閉じる（カードは買わない） */
export function smartPeddlerCommand(g: GameState, sm: SmartMemo, heroes: Hero[]): SmartPick | undefined {
  for (const h of heroes) {
    const shop = h.peddler;
    if (!shop) continue;
    const cmds: GameCommand[] = [];
    const best = shop.items
      .map((e, index) => ({ e, index, def: getItem(e.item.itemId) }))
      .filter(({ e, def }) => !e.sold && e.price <= h.gold - SHOP_PEDDLER_RESERVE && equipGain(h, def) > SHOP_MIN_GAIN)
      .sort((a, b) => equipGain(h, b.def) - equipGain(h, a.def) || a.index - b.index);
    for (const x of best) cmds.push({ type: 'PEDDLER_BUY', playerId: h.playerId, heroId: h.id, kind: 'item', index: x.index });
    cmds.push({ type: 'PEDDLER_BUY', playerId: h.playerId, heroId: h.id });
    const p = firstOk(sm, g, cmds);
    if (p) return p;
  }
  return undefined;
}

// ---------- 2. カードの選び方 ----------

/** カード報酬: 山札の平均の点より良い札を取る。どれも良くなければ取らない（山札が小さい間は一番良い札を取る） */
export function smartPickCardCommand(g: GameState, sm: SmartMemo, pidOf: (heroId: string) => GameState['heroes'][number]['playerId']): SmartPick | undefined {
  const r = g.reward;
  if (!r || r.cardPicked) return undefined;
  const heroId = r.cardOffers.find((o) => !r.cardDone?.includes(o.heroId))?.heroId;
  const h = heroId ? findHero(g, heroId) : undefined;
  if (!h || !heroId) return undefined;
  const main = mainStat(h);
  const tags = deckTags(h);
  const offers = r.cardOffers.map((o, i) => ({ o, i })).filter(({ o }) => o.heroId === heroId).map(({ o, i }) => ({ i, v: cardValue(h, getCard(o.cardId), main, tags) }));
  const best = [...offers].sort((a, b) => b.v - a.v || a.i - b.i)[0];
  const vals = deckValues(h);
  const avg = vals.reduce((n, x) => n + x.v, 0) / Math.max(1, vals.length);
  const take = best && (best.v > avg + CARD_TAKE_MARGIN || h.deck.length < CARD_SMALL_DECK);
  const skip: GameCommand = { type: 'PICK_CARD', playerId: pidOf(heroId), offerIndex: null, heroId };
  return firstOk(sm, g, [take ? { type: 'PICK_CARD', playerId: pidOf(heroId), offerIndex: best.i } : undefined, skip]);
}

/** レベルアップの成長: 主に使う能力値 → カードの強化（一番良い札）→ 最大HP → フォーカスの最大値 → ほか */
export function smartGrowthCommand(g: GameState, sm: SmartMemo): SmartPick | undefined {
  const r = g.reward;
  const lu = r?.levelUps[0];
  const h = lu ? findHero(g, lu.heroId) : undefined;
  if (!lu || !h) return undefined;
  const main = mainStat(h);
  const bestCard = deckValues(h).filter((x) => !x.c.upgraded).sort((a, b) => b.v - a.v)[0]?.c.uid;
  const rank = (o: (typeof lu.options)[number]) =>
    o.kind === 'stat' && o.stat === main ? 0 : o.kind === 'upgradeCard' && bestCard ? 1 : o.kind === 'maxHp' ? 2 : o.kind === 'focusMax' ? 3 : o.kind === 'stat' ? 4 : 5;
  const order = lu.options.map((o, i) => ({ o, i })).sort((a, b) => rank(a.o) - rank(b.o) || a.i - b.i);
  return firstOk(sm, g, order.map(({ o, i }) => ({ type: 'CHOOSE_GROWTH', playerId: h.playerId, optionIndex: i, cardUid: o.kind === 'upgradeCard' ? bestCard : h.deck.find((c) => !c.upgraded)?.uid })));
}

/** 町の店のカード: 町に入ったキャラの職のカードで、山札の平均の点より良い物を買う（カード報酬と同じ線。お金は宿代の分を残す） */
export function smartTownCardCommand(g: GameState, sm: SmartMemo): SmartPick | undefined {
  const t = g.town;
  const w = g.world;
  const v = townMember(g);
  const stock = t && w ? w.shops[t.townId] : undefined;
  if (!t || !v || !stock) return undefined;
  const budget = v.gold - TOWNS.get(t.townId).innCost * SHOP_RESERVE_INNS;
  const main = mainStat(v);
  const tags = deckTags(v);
  const vals = deckValues(v);
  const avg = vals.reduce((n, x) => n + x.v, 0) / Math.max(1, vals.length);
  const cands = stock.cards
    .map((e, index) => ({ e, index, v: cardValue(v, getCard(e.cardId), main, tags) }))
    // 店のカードは、そのカードの持ち主として並べたキャラと同じ職のキャラだけが買える（townBuy と同じ決まり）
    .filter(({ e, v: val }) => !e.sold && findHero(g, e.heroId)?.classId === v.classId && shopPriceFor(v, e.price, g) <= budget && val > avg + CARD_TAKE_MARGIN)
    .sort((a, b) => b.v - a.v || a.index - b.index);
  return firstOk(sm, g, cands.map((x) => ({ type: 'TOWN_BUY', playerId: v.playerId, heroId: v.id, kind: 'card', index: x.index })));
}

/** 買い物の寄り道の行き先（無ければ undefined）: お金が貯まっていて、前に町に入ってから間が空いていて、近くに見えている町がある時 */
export function smartShopDetour(g: GameState, at: number, sm: SmartMemo): number | undefined {
  const w = g.world;
  if (!w) return undefined;
  if (sm.lastShop !== undefined && w.worldTurn - sm.lastShop < SHOP_DETOUR_EVERY) return undefined;
  const heroes = livingHeroes(g);
  if (!heroes.length || heroes.reduce((n, h) => n + h.gold, 0) / heroes.length < SHOP_DETOUR_GOLD) return undefined;
  const towns = w.tiles.flatMap((t, i) => (t.f?.kind === 'town' && t.seen && !w.fallenTowns.includes(t.f.id) && hexDistance(w, at, i) <= SHOP_DETOUR_DIST ? [i] : []));
  return towns.sort((a, b) => hexDistance(w, at, a) - hexDistance(w, at, b) || a - b)[0];
}

/** 町: 山札が大きければ、一番点の低い札を1枚削る（1回の訪問で1枚。お金は宿代の分を残す） */
export function smartRemoveCardCommand(g: GameState, sm: SmartMemo): SmartPick | undefined {
  const t = g.town;
  const v = townMember(g);
  if (!t || !v || !g.world) return undefined;
  const visit = `${g.world.worldTurn}:${t.townId}:${v.id}`;
  if (sm.removed.has(visit)) return undefined;
  const town = TOWNS.get(t.townId);
  if (v.deck.length <= Math.max(CARD_REMOVE_ABOVE, BALANCE.minDeckSize)) return undefined;
  if (v.gold - town.removeCost < town.innCost * SHOP_RESERVE_INNS) return undefined;
  const low = deckValues(v).sort((a, b) => a.v - b.v)[0];
  const vals = deckValues(v);
  const avg = vals.reduce((n, x) => n + x.v, 0) / Math.max(1, vals.length);
  if (!low || low.v >= avg) return undefined;
  const p = firstOk(sm, g, [{ type: 'TOWN_REMOVE_CARD', playerId: v.playerId, heroId: v.id, cardUid: low.c.uid }]);
  if (p) sm.removed.add(visit);
  return p;
}

// ---------- 3. 消耗品の使い時 ----------

interface PouchEntry {
  owner: Hero;
  uid: string;
  def: ItemDef;
}

const pouchOf = (heroes: Hero[]): PouchEntry[] => heroes.flatMap((h) => h.pouch.map((p) => ({ owner: h, uid: p.uid, def: getItem(p.itemId) })));
const healAmount = (def: ItemDef) => def.use?.reduce((n, e) => n + (e.kind === 'heal' && 'amount' in e ? Number(e.amount) : 0), 0) ?? 0;
const useKind = (def: ItemDef, kind: string) => !!def.use?.some((e) => e.kind === kind);
const fieldWhat = (def: ItemDef) => def.use?.find((e) => e.kind === 'fieldOnly') as { what?: string } | undefined;

/**
 * 戦闘の味方の番に使う道具（無ければ undefined）。道具は袋の持ち主が、自分の番の戦闘で使う。
 * - 倒れた味方: 不死鳥の羽根
 * - HPが3割以下か、被弾予定を受けると1.5割以下になる味方: 回復（2人以上が5割より下なら全体回復の香炉）。回復が無ければ守りの道具
 * - ボス・中ボス（災厄）・強敵の戦闘、または被弾予定で倒れる時: 大技の予告の敵に閃光の破砕玉
 * - ボス・中ボス（災厄）の戦闘: 力をくれる道具（霊薬・薄荷茶・油・塗薬・魔石）
 */
export function smartBattleItemCommand(g: GameState, sm: SmartMemo, b: BattleState): SmartPick | undefined {
  if (b.phase !== 'ally') return undefined;
  const allies = b.allies.filter((a) => !a.dead);
  const users = allies.map((a) => findHero(g, a.id)).filter((h): h is Hero => !!h && h.hp > 0);
  const bag = pouchOf(users);
  if (!bag.length) return undefined;
  const use = (e: PouchEntry, targetId: string): GameCommand => ({ type: 'USE_POUCH_ITEM', playerId: e.owner.playerId, itemUid: e.uid, userId: e.owner.id, targetId });
  const cmds: GameCommand[] = [];
  const big = !!b.boss || !!b.midboss;
  const inc = new Map(allies.map((a) => [a.id, incomingDamage(b, a)]));
  // 倒れた味方
  const fallen = b.allies.find((a) => a.dead && findHero(g, a.id));
  const phoenix = bag.find((e) => useKind(e.def, 'phoenix'));
  if (fallen && phoenix) cmds.push(use(phoenix, fallen.id));
  // 回復
  const danger = allies.filter((a) => a.hp <= a.maxHp * ITEM_LOW_HP || a.hp - (inc.get(a.id) ?? 0) <= a.maxHp * ITEM_DANGER_HP).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp);
  if (danger.length) {
    const group = allies.filter((a) => a.hp < a.maxHp * ITEM_GROUP_HP).length >= 2;
    const censer = bag.find((e) => useKind(e.def, 'heal') && !isHealItem(e.def));
    if (group && censer) cmds.push(use(censer, censer.owner.id));
    for (const a of danger) {
      const miss = a.maxHp - a.hp;
      // 足りない分に近い量の薬から（大きい薬を小さい傷に使わない）
      const heals = bag.filter((e) => isHealItem(e.def)).sort((x, y) => Math.abs(healAmount(x.def) - miss) - Math.abs(healAmount(y.def) - miss));
      for (const e of heals) cmds.push(use(e, a.id));
      if (!heals.length) {
        const guard = bag.find((e) => useKind(e.def, 'block'));
        if (guard) cmds.push(use(guard, a.id));
      }
    }
  }
  // 大技の予告
  const deadly = allies.some((a) => (inc.get(a.id) ?? 0) >= a.hp);
  const flash = bag.find((e) => useKind(e.def, 'flashBreak'));
  if (flash && (big || b.elite || deadly)) {
    const foe = b.enemies.filter((e) => canBreak(e)).sort((x, y) => intentDamageAll(b, y) - intentDamageAll(b, x))[0];
    if (foe) cmds.push(use(flash, foe.uid));
  }
  // ボス・中ボス: 力をくれる道具
  if (big) {
    for (const e of bag) {
      const k = e.def.use?.map((x) => x.kind) ?? [];
      if (k.includes('iceGem')) {
        const foe = b.enemies.filter((x) => !x.dead).sort((x, y) => y.hp - x.hp)[0];
        if (foe) cmds.push(use(e, foe.uid));
      } else if (k.includes('grantAbility') || k.includes('tempWeak') || (k.includes('gainMana') && k.includes('draw')) || (k.includes('gainFocus') && k.includes('draw'))) {
        const me = b.allies.find((a) => a.id === e.owner.id);
        if (me && !me.dead) cmds.push(use(e, me.id));
      }
    }
  }
  return firstOk(sm, g, cmds);
}

/** 敵の予告が、味方全員に与える予定のダメージの合計 */
const intentDamageAll = (b: BattleState, e: EnemyState) => b.allies.reduce((n, a) => n + intentHitsOn(e, a).reduce((m, x) => m + x, 0), 0);

/**
 * 戦闘の外（世界マップ・ダンジョン）で使う道具: 傷の深い仲間に回復の薬（無駄にしない量の時だけ）・砥石で一番良い札を強化・秘薬で主に使う能力値・
 * 侵食度が高ければ浄化の聖結晶
 */
export function smartFieldItemCommand(g: GameState, sm: SmartMemo, heroes: Hero[]): SmartPick | undefined {
  const bag = pouchOf(heroes.filter((h) => h.hp > 0));
  if (!bag.length) return undefined;
  const use = (e: PouchEntry, targetId: string, extra: Partial<Extract<GameCommand, { type: 'USE_POUCH_ITEM' }>> = {}): GameCommand => ({ type: 'USE_POUCH_ITEM', playerId: e.owner.playerId, itemUid: e.uid, userId: e.owner.id, targetId, ...extra });
  const near = (a: Hero, b: Hero) => !g.world || g.activeScene !== undefined || g.world.pos[a.id] === g.world.pos[b.id];
  const cmds: GameCommand[] = [];
  for (const h of heroes) {
    if (h.hp <= 0 || h.hp >= heroMaxHp(h) * ITEM_FIELD_HP) continue;
    const miss = heroMaxHp(h) - h.hp;
    for (const e of bag) if (isHealItem(e.def) && near(e.owner, h) && miss >= healAmount(e.def) * ITEM_FIELD_WASTE) cmds.push(use(e, h.id));
  }
  for (const e of bag) {
    const what = fieldWhat(e.def)?.what;
    if (what === 'whetstone') {
      const best = deckValues(e.owner).filter((x) => !x.c.upgraded).sort((a, b) => b.v - a.v)[0];
      if (best) cmds.push(use(e, e.owner.id, { cardUid: best.c.uid }));
    }
    if (what === 'elixir') cmds.push(use(e, e.owner.id, { stat: mainStat(e.owner) }));
    if (what === 'purify' && g.world && corruptionShown(g.world.corruption) >= ITEM_PURIFY_AT) cmds.push(use(e, e.owner.id));
  }
  return firstOk(sm, g, cmds);
}

// ---------- 4. 仲間どうしの連携 ----------

/**
 * 戦闘の点の直し（工夫する bot の cleverBattleCommand に渡す）。見るのは画面の情報だけ（予告・被弾予定・敵のHP・手札）。
 * - 倒し切れる敵: 大きく上げる。その敵がこちらを殴る予告なら、殴る量に応じてさらに上げる（倒せば、そのダメージが来ない）
 * - 倒し切れない敵: 「こちらへのダメージ ÷ 残りHP」が大きい敵に集中する
 * - BREAK: 大技の予告の敵を、ほかの仲間が弱点のカードで崩せる時は、自分のフォーカスを全部使って完全成功を狙わない（仲間に任せる）
 * - ブロックだけのカード: 被弾予定で倒れる時は大きく上げる。殴られない時は下げる
 * - 回復: 被弾予定で倒れる味方への回復を上げる
 */
export function teamAdjust(b: BattleState): BattleAdjust {
  const foes = b.enemies.filter((e) => !e.dead);
  const inc = new Map(b.allies.map((a) => [a.id, incomingDamage(b, a)]));
  const threat = new Map(foes.map((e) => [e.uid, intentDamageAll(b, e)]));
  // 大技の予告の敵を、弱点のカードで崩せる味方（敵の uid → 味方の id）
  const weakBreakers = new Map<string, Set<string>>();
  for (const a of b.allies) {
    if (isDone(b, a)) continue;
    for (const c of a.hand) {
      const card = cardOf(c);
      if (unusableReason(b, a, card, c.uid) || !hasDamage(card)) continue;
      for (const e of foes) if (canBreak(e) && elementGuide(b, a, card, e)?.kind === 'weak') (weakBreakers.get(e.uid) ?? weakBreakers.set(e.uid, new Set()).get(e.uid)!).add(a.id);
    }
  }
  return {
    attack(a: AllyState, card: CardDef, e: EnemyState, s) {
      let { score, focus } = s;
      const top = tierDamageAgainst(a, card, e).at(-1) ?? 0;
      const th = threat.get(e.uid) ?? 0;
      if (top >= e.hp + e.block) score += TEAM.kill + Math.min(TEAM.threatCap, th * TEAM.threatPerDmg);
      else score += Math.min(TEAM.threatCap, (th / Math.max(1, e.hp + e.block)) * TEAM.threatPerHp);
      const guide = elementGuide(b, a, card, e);
      const others = [...(weakBreakers.get(e.uid) ?? [])].filter((id) => id !== a.id);
      if (canBreak(e) && guide?.kind !== 'weak' && others.length) {
        score -= TEAM.leaveBreak;
        focus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
      }
      return { score, focus };
    },
    other(a: AllyState, _card: CardDef, kind, score, targetId) {
      if (kind === 'block') {
        const n = inc.get(a.id) ?? 0;
        if (n >= a.hp) return score + TEAM.blockDeadly;
        if (n >= a.hp * TEAM.heavyShare) return score + TEAM.blockHeavy;
        if (n <= 0) return score + TEAM.blockIdle;
        return score;
      }
      if (kind === 'heal' && targetId) {
        const t = b.allies.find((x) => x.id === targetId);
        if (t && !t.dead && t.hp - (inc.get(t.id) ?? 0) <= 0) return score + TEAM.healDeadly;
      }
      return score;
    },
  };
}

// ---------- 5. 時間（侵食度）の使い方 ----------

/**
 * 時間の見込み: 残りのダンジョン（まだ制覇していない鍵のダンジョンと最後のダンジョン）× TIME_PER_DUNGEON ＋ 余裕 TIME_MARGIN を、
 * 今の侵食度（画面の整数の値）に足して 100 に届くなら「時間が足りない」
 */
export function timeLate(g: GameState): boolean {
  const w = g.world;
  if (!w) return false;
  const left = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && (d.rewardKey || d.finale) && !g.clearedDungeons.includes(d.id)).length;
  return corruptionShown(w.corruption) + left * TIME_PER_DUNGEON + TIME_MARGIN >= 100;
}

/** 世界マップで町へ戻るHPの割合（時間が足りない時は低くする） */
export const hurtLine = (g: GameState, sm: SmartMemo | undefined) => (smartUses(sm, 'time') && timeLate(g) ? TIME_HURT_LATE : 0.5);
