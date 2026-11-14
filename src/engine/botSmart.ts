// ===== 賢い bot（3段目。オーナーの決定 2026-11-13「工夫する bot をもっと賢くする」）=====
// 工夫する bot（botClever.ts）の上に、次の5つの工夫を足す。工夫は1つずつ外せる（どれが効いているかを測るため）。
//   shop  = 買い物と装備: 町・行商人・闇商人で、ジョブと山札に合う装備・消耗品を買う。要らない装備は売る。装備はジョブの得意な武器・主に使う能力値・特殊能力で選ぶ
//   cards = カードの選び方: カード報酬を山札との相性で選ぶ（取らない、も選ぶ）。町で弱いカードを削る。レベルアップの成長も山札に合わせる
//   items = 消耗品の使い時: 倒れそうな時・ボスや中ボス・大技の予告の時に使う。戦闘の外でも、傷が深ければ薬を使う
//   team  = 仲間どうしの連携: 倒し切れる敵・こちらを強く殴る敵に集中する。敵の番に受けるダメージ（画面の被弾予定）を見て守る。BREAK を弱点の仲間に任せる
//   time  = 時間（侵食度）の使い方: 侵食度と残りのダンジョンの数を見て、間に合わない時は寄り道・レベル上げ・町へ戻るのをやめる
//           （2026-11-14: 1つのダンジョンの見込みを、この冒険の実際の伸び方から出す。寄り道は「時間の余り」と見込みを比べて決める = smartDetour）
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
import { enemyWeak } from './battle/phases';
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
import { aliveScourges } from './game/world/scourgeCurse';
import { isRandomDungeonTile } from './game/world/randomDungeons';

//   weak  = ボスの弱点に合わせる（2026-11-13 docs/tasks/break-read-plan.md §4。測るため）: 属性の攻撃をほとんど持たないキャラ（物理）は、
//           「属性の付与」の装飾品が次の目的のダンジョンのボスの弱点に合う時だけ買って付ける（合わない属性は買わない・付けない）。
//           ボスの弱点は、もう戦った事がある時だけ分かる。分からない時は、今いる地域で戦った敵によく見る弱点
//   elite = 強敵の扉を選ぶか避けるか（2026-11-13 docs/tasks/elite-plan.md §3。測るため）: パーティ全員のHPが ELITE_DOOR_HP 以上で、
//           回復の道具が袋に残っていれば、強敵の扉を選ぶ。そうでなければ強敵を避ける（ほかの扉を、今までの決め方で選ぶ。強敵しか無い時は強敵）
export type SmartPart = 'shop' | 'cards' | 'items' | 'team' | 'time' | 'weak' | 'elite';
export const SMART_PARTS: SmartPart[] = ['shop', 'cards', 'items', 'team', 'time', 'weak', 'elite'];

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
  /** weak: 戦った事がある敵の弱点（敵の種類 → 弱点の属性。戦闘の画面で見えた物だけ） */
  seenWeak: Map<string, string[]>;
  /** weak: 地域ごとに、戦った敵の弱点の属性を数えた物（地域の番号 → 属性 → 回数。1戦闘で1体1回） */
  regionWeak: Map<number, Map<string, number>>;
  /** weak: もう数えた戦闘（戦闘の種） */
  noted: Set<number>;
}

export const newSmartMemo = (off: SmartPart[] = []): SmartMemo => ({ off: new Set(off), refused: new Set(), removed: new Set(), seenWeak: new Map(), regionWeak: new Map(), noted: new Set() });

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

// ---------- 1b. ボスの弱点に合わせる（weak） ----------

/**
 * 作戦の数字（bot の提案。ゲームの中身ではない）:
 * physicalShare = 山札のダメージの札のうち「属性の無い物理の札」がこの割合以上なら、物理のキャラとみなす /
 * bonus = 弱点に合う「属性の付与」の装飾品に足す点（ほかの装飾品より先に選ぶ大きさ）
 */
const WEAK_MATCH = { physicalShare: 0.5, bonus: 20 };

/** 「属性の付与」の装飾品なら、その属性（属性の無い物理攻撃が、その属性になる） */
const converterOf = (def: ItemDef | undefined): string | undefined => {
  const e = def?.ability?.effect;
  return e && 'modifier' in e && e.modifier === 'convertElement' ? e.into : undefined;
};

/** 属性の攻撃をほとんど持たないキャラ（物理）か（山札だけを見る。装備は入れない: 行ったり来たりしないように） */
export function isPhysicalHero(h: Hero): boolean {
  let dmg = 0;
  let plain = 0;
  for (const c of h.deck) {
    const d = cardOf(c);
    if (!hasDamage(d)) continue;
    dmg++;
    if (d.category === 'physical' && !d.tiers.some((t) => t.effects.some((e) => e.kind === 'damage' && e.element))) plain++;
  }
  return dmg > 0 && plain / dmg >= WEAK_MATCH.physicalShare;
}

/** 今いる地域の番号（パーティの先頭のキャラの居場所。分からなければ undefined） */
function regionNow(g: GameState): number | undefined {
  const w = g.world;
  const h = livingHeroes(g).find((x) => !g.party || g.party.includes(x.id));
  const at = h ? w?.pos[h.id] : undefined;
  return at === undefined ? undefined : w!.tiles[at]?.r;
}

/** 戦闘の画面で見えた敵の弱点を覚える（1つの戦闘で1回だけ数える）。ゲームは変えない */
export function smartNoteBattle(g: GameState, sm: SmartMemo, b: BattleState) {
  if (!smartUses(sm, 'weak') || sm.noted.has(b.seed)) return;
  sm.noted.add(b.seed);
  const r = regionNow(g);
  const counts = r === undefined ? undefined : sm.regionWeak.get(r) ?? sm.regionWeak.set(r, new Map()).get(r)!;
  for (const e of b.enemies) {
    const weak = enemyWeak(e);
    sm.seenWeak.set(e.defId, weak);
    if (counts) for (const el of weak) counts.set(el, (counts.get(el) ?? 0) + 1);
  }
}

/** 次の目的のダンジョン（普通の bot の goalDungeon と同じ順: 鍵のダンジョンを敵のレベルが低い順 → 最後のダンジョン） */
function nextGoal(g: GameState): string | undefined {
  const list = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && (d.rewardKey || d.finale));
  const order = [...list.filter((d) => !d.finale).sort((a, b) => a.baseLevel - b.baseLevel), ...list.filter((d) => d.finale)];
  return order.find((d) => !g.clearedDungeons.includes(d.id))?.id;
}

/**
 * 合わせたい弱点の属性: 次の目的のダンジョンのボスと、もう戦った事があれば、その弱点。
 * 無ければ、今いる地域で戦った敵によく見る弱点（一番多く見た属性。同じ数なら全部）。何も分からなければ空
 */
export function targetWeakOf(g: GameState, sm: SmartMemo): string[] {
  const goal = nextGoal(g);
  const bosses = goal ? DUNGEONS.get(goal).pools.boss : [];
  const known = [...new Set(bosses.flatMap((id) => sm.seenWeak.get(id) ?? []))];
  if (bosses.some((id) => sm.seenWeak.has(id))) return known;
  const r = regionNow(g);
  const counts = r === undefined ? undefined : sm.regionWeak.get(r);
  if (!counts?.size) return [];
  const top = Math.max(...counts.values());
  return [...counts.entries()].filter(([, n]) => n === top).map(([el]) => el).sort();
}

/**
 * 賢い bot の装備の点の上がり方（equipGain に「弱点に合わせる」を足した物。weak を外した時は equipGain と同じ）:
 * 物理のキャラは、弱点に合う「属性の付与」の装飾品に bonus を足し、合わない「属性の付与」は買わない・付けない（-Infinity）
 */
export function smartGain(g: GameState, sm: SmartMemo, h: Hero, def: ItemDef): number {
  const base = equipGain(h, def);
  if (!smartUses(sm, 'weak') || def.slot !== 'accessory' || !isPhysicalHero(h)) return base;
  const want = targetWeakOf(g, sm);
  const into = converterOf(def);
  if (into && !want.includes(into)) return -Infinity;
  const cur = h.equipment.accessory ? getItem(h.equipment.accessory.itemId) : undefined;
  const val = (el: string | undefined) => (el && want.includes(el) ? WEAK_MATCH.bonus : 0);
  return base + val(into) - val(converterOf(cur));
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
      // 2026-11-13: 点の上がり方は smartGain（weak を外した時は equipGain と同じ）
      const gain = (h: Hero) => smartGain(g, sm, h, def);
      if (gain(owner) > SHOP_MIN_GAIN) cmds.push({ type: 'EQUIP', playerId: owner.playerId, heroId: owner.id, itemUid: inst.uid });
      const to = scene.filter((h) => h !== owner && near(h.id, owner.id) && gain(h) > SHOP_MIN_GAIN).sort((a, b) => gain(b) - gain(a))[0];
      if (to && gain(to) > Math.max(SHOP_MIN_GAIN, gain(owner))) cmds.unshift({ type: 'GIVE', playerId: owner.playerId, fromHeroId: owner.id, toHeroId: to.id, itemUid: inst.uid });
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
    if (party.every((h) => !(smartGain(g, sm, h, def) > 0))) cmds.push({ type: 'TOWN_SELL', playerId: v.playerId, heroId: v.id, itemUid: inst.uid });
  }
  const stock = w.shops[t.townId];
  if (stock) {
    const budget = v.gold - TOWNS.get(t.townId).innCost * SHOP_RESERVE_INNS;
    const price = (p: number) => shopPriceFor(v, p, g);
    // 装備: 点の上がり方が一番大きい物
    const eq = stock.items
      .map((e, index) => ({ e, index, def: getItem(e.item.itemId) }))
      .filter(({ e, def }) => !e.sold && def.slot !== 'consumable' && price(e.price) <= budget && smartGain(g, sm, v, def) > SHOP_MIN_GAIN)
      .sort((a, b) => smartGain(g, sm, v, b.def) - smartGain(g, sm, v, a.def) || a.index - b.index);
    // 盗賊王の無料券（2026-11-14）: 点の上がり方が一番大きい装備に使う（値段は見ない。同じなら高い方）
    if ((w.freeShop ?? 0) > 0) {
      const free = stock.items
        .map((e, index) => ({ e, index, def: getItem(e.item.itemId) }))
        .filter(({ e, def }) => !e.sold && def.slot !== 'consumable' && smartGain(g, sm, v, def) > SHOP_MIN_GAIN)
        .sort((a, b) => smartGain(g, sm, v, b.def) - smartGain(g, sm, v, a.def) || b.e.price - a.e.price || a.index - b.index)[0];
      if (free) cmds.push({ type: 'TOWN_BUY', playerId: v.playerId, heroId: v.id, kind: 'item', index: free.index, free: true });
    }
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
      .filter(({ e, def }) => !e.sold && e.price <= h.gold - SHOP_PEDDLER_RESERVE && smartGain(g, sm, h, def) > SHOP_MIN_GAIN)
      .sort((a, b) => smartGain(g, sm, h, b.def) - smartGain(g, sm, h, a.def) || a.index - b.index);
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
  return !!g.world && timeSlack(g) <= 0;
}

/**
 * 1つのダンジョンに見込む侵食度（2026-11-14 寄り道の値打ち 柱6: 実際の伸び方から出す）。
 * 鍵のダンジョンを1つ以上制覇していれば「今の侵食度 ÷ 制覇した鍵のダンジョンの数」（寄り道の分も入った、この冒険の実際の伸び方）、
 * 無ければ TIME_PER_DUNGEON。どちらも TIME_PER_DUNGEON より小さくはしない（見込みを甘くしない）
 */
export function timePerDungeon(g: GameState): number {
  const w = g.world;
  if (!w) return TIME_PER_DUNGEON;
  const done = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && d.rewardKey && g.clearedDungeons.includes(d.id)).length;
  return done ? Math.max(TIME_PER_DUNGEON, corruptionShown(w.corruption) / done) : TIME_PER_DUNGEON;
}

/** 時間の余り（侵食度の%）: 100 −（今の侵食度 ＋ 残りのダンジョン × 見込み ＋ 余裕）。0 以下なら「時間が足りない」 */
export function timeSlack(g: GameState): number {
  const w = g.world;
  if (!w) return Infinity;
  const left = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && (d.rewardKey || d.finale) && !g.clearedDungeons.includes(d.id)).length;
  return 100 - (corruptionShown(w.corruption) + left * timePerDungeon(g) + TIME_MARGIN);
}

// ---------- 6. 寄り道の判断（2026-11-14 docs/tasks/detour-value-plan.md 柱6。測るため） ----------

/**
 * 黄金箱の秘宝の3択: 場面の仲間のだれかが付けた時の点の上がり方（smartGain）が一番大きい候補（同じなら前の物）。
 * shop の工夫を外した時は、いつも1つ目
 */
export function smartRelicIndex(g: GameState, sm: SmartMemo | undefined, heroes: Hero[]): number {
  const relics = g.chest?.relics ?? [];
  if (!sm || !smartUses(sm, 'shop')) return 0;
  let best = 0;
  let bestScore = -Infinity;
  relics.forEach((r, i) => {
    const def = getItem(r.itemId);
    const s = Math.max(...heroes.map((h) => smartGain(g, sm, h, def)));
    if (s > bestScore) (best = i), (bestScore = s);
  });
  return best;
}

/** 寄り道1回に見込む侵食度（%）。災厄 = 歩き＋戦闘 / ランダムダンジョン = 歩き＋5行（bot の作戦の提案） */
const DETOUR_COST = { scourge: 4, random: 8 };
/** 挑み直しの上限（災厄は全部の合計・ランダムダンジョンは入った回数） */
const DETOUR_TRIES = { scourge: 4, random: 3 };
/** 寄り道してよいHPの割合（全員がこれより上）・見晴らしの塔へ寄ってよい距離・寄り道の行き先の遠さの上限（マス） */
const DETOUR_HP_LINE = 0.6;
const DETOUR_TOWER = 8;
const DETOUR_FAR = 14;

/**
 * 賢い bot の寄り道（工夫する bot の「1か所だけ・1体だけ」の決め打ちの代わり）。見るのは画面に出ている物だけ:
 * 侵食度・残りのダンジョン（時間の余り）・霧の晴れた災厄とランダムダンジョンの場所・HP。乱数は使わない。
 * - 時間の余りが寄り道の見込みより大きい時だけ行く（time の工夫を外した時は、余りを見ない）
 * - 災厄: 生きていて場所の見えている災厄の、近い方から（生きている災厄は、どれも次のボスに加護を掛ける。倒すと消える）。見えていなければ近くの塔へ
 * - ランダムダンジョン: 見えている、まだ踏破していない所の近い方から（worth が「行く値打ちがある」と言う時だけ）
 */
export function smartDetour(
  g: GameState,
  at: number,
  cm: { randomTries: number; scourgeTries: number },
  sm: SmartMemo,
  worth: { random: (g: GameState) => boolean } = { random: () => true },
): { tile: number; why: 'town' | 'grind' | 'dungeon'; kind: 'scourge' | 'tower' | 'random' } | undefined {
  const w = g.world;
  if (!w || w.keys.length < 1) return undefined;
  if (livingHeroes(g).some((h) => h.hp <= heroMaxHp(h) * DETOUR_HP_LINE)) return undefined;
  const slack = smartUses(sm, 'time') ? timeSlack(g) : Infinity;
  const near = (tiles: number[]) => tiles.filter((i) => hexDistance(w, at, i) <= DETOUR_FAR).sort((a, b) => hexDistance(w, at, a) - hexDistance(w, at, b) || a - b)[0];
  const alive = aliveScourges(w);
  if (alive.length && slack >= DETOUR_COST.scourge && cm.scourgeTries < DETOUR_TRIES.scourge) {
    const t = near(alive.filter(({ wd }) => w.tiles[wd.tile].seen).map(({ wd }) => wd.tile));
    if (t !== undefined) return { tile: t, why: 'grind', kind: 'scourge' };
    const towers = w.tiles.flatMap((x, i) => (x.f?.kind === 'tower' && !x.f.used && x.seen && hexDistance(w, at, i) <= DETOUR_TOWER ? [i] : []));
    const tw = near(towers);
    if (tw !== undefined) return { tile: tw, why: 'dungeon', kind: 'tower' };
  }
  if (slack >= DETOUR_COST.random && cm.randomTries < DETOUR_TRIES.random && worth.random(g)) {
    const t = near(w.tiles.flatMap((x, i) => (isRandomDungeonTile(x.f) && !x.f!.used && x.seen ? [i] : [])));
    if (t !== undefined) return { tile: t, why: 'dungeon', kind: 'random' };
  }
  return undefined;
}

/** 世界マップで町へ戻るHPの割合（時間が足りない時は低くする） */
export const hurtLine = (g: GameState, sm: SmartMemo | undefined) => (smartUses(sm, 'time') && timeLate(g) ? TIME_HURT_LATE : 0.5);

// ---------- 7. 強敵の扉（2026-11-13 docs/tasks/elite-plan.md §3。測るため） ----------

/** 強敵の扉を選ぶ: パーティ（場面にいる生きている仲間）全員のHPが、最大HPのこの割合以上の時だけ（bot の作戦の提案） */
const ELITE_DOOR_HP = 0.7;

/**
 * 賢い bot の扉の選び方（強敵を選ぶか避けるか）。強敵の扉が無い時・elite の工夫を外した時は undefined（今までの決め方のまま）。
 * 見るのは扉の予兆（強敵の色）・仲間のHP・袋の道具だけ。乱数は使わない。
 * - 全員のHPが ELITE_DOOR_HP 以上で、だれかの袋に回復の道具（単体・全体どちらも）があれば、強敵の扉（左から1つ目）
 * - そうでなければ、強敵でない扉の中から pickOthers（今までの決め方: 傷ついていれば休憩・ほかは宝・無ければ左端）。強敵の扉しか無ければ強敵
 */
export function smartEliteDoor<R extends { type: string }>(g: GameState, sm: SmartMemo | undefined, rooms: R[], isElite: (r: R) => boolean, pickOthers: (rs: R[]) => R | undefined): R | undefined {
  if (!smartUses(sm, 'elite')) return undefined;
  const elites = rooms.filter(isElite);
  if (!elites.length) return undefined;
  const party = livingHeroes(g).filter((h) => !g.party || g.party.includes(h.id));
  const healthy = party.length > 0 && party.every((h) => h.hp >= heroMaxHp(h) * ELITE_DOOR_HP);
  const heal = party.some((h) => h.pouch.some((p) => !!getItem(p.itemId).use?.some((e) => e.kind === 'heal')));
  if (healthy && heal) return elites[0];
  const others = rooms.filter((r) => !isElite(r));
  return others.length ? pickOthers(others) : elites[0];
}
