import { facilityHero, facilityMembers, finishFacility } from './facilities';
// ===== 町（spec §17）: ショップ・宿屋・カードの削除・売却・依頼の掲示板 =====
import { BALANCE } from '../../../data/balance';
import { CARDS } from '../../../data/cards';
import { getClass } from '../../../data/classes';
import { getItem, ITEMS } from '../../../data/items';
import { QUESTS, SHRINES, TOWNS } from '../../../data/world';
import { PETS } from '../../../data/pets';
import { getScenario } from '../../../data/scenarios';
import { startTileOf } from './start';
import type { GameCommand, GameState, ShopStock } from '../../../types';
import type { Rng } from '../../rng';
import { addItem, addLog, addLoot, earnGold, ownedBy, shopPriceFor } from '../common';
import { rarityIndex } from '../dungeon';
import { pickCard, withoutStarterCards } from '../cardTags';
import { clampHero, heroFocusMax, heroMaxHp, jobWeapons } from '../hero';
import { findHero } from '../heroes';
import { addFeat, heroCardPool } from '../jobs';
import { cardRewardOdds, newItem, pickWeighted } from '../loot';
import { applyOutcome, makeOutcomeCtx } from '../outcomes';
import { objectiveHandler } from './objectives';
import { backToWorld } from './world';

type Cmd<T extends GameCommand['type']> = Extract<GameCommand, { type: T }>;

const isEquipped = (game: GameState, uid: string) => game.heroes.some((h) => Object.values(h.equipment).some((e) => e?.uid === uid));

/** 売値 */
export const sellPrice = (itemId: string) => Math.floor((BALANCE.itemPrice[getItem(itemId).rarity] ?? 30) * BALANCE.sellRatio);

/** 品揃えを作る（町に入った時。一定のワールドターンごとに入れ替わる） */
export function ensureShop(game: GameState, rng: Rng): ShopStock {
  const w = game.world!;
  const town = TOWNS.get(game.town!.townId);
  const old = w.shops[town.id];
  if (old && w.worldTurn - old.refreshedAt < BALANCE.shopRefreshTurns) return old;
  const max = rarityIndex(town.shop.maxRarity);
  const lowWeights = [60, 30, 9, 1].map((v, i) => (i <= max ? v : 0));
  const items: ShopStock['items'] = [];
  const price = (id: string) => BALANCE.itemPrice[getItem(id).rarity] ?? 30;
  for (const id of town.shop.fixed ?? []) items.push({ kind: 'item', item: newItem(game, getItem(id)), price: price(id) });
  const types = new Set(game.heroes.filter((h) => !h.retired).flatMap((h) => jobWeapons(h.classId)));
  // ランダムダンジョンの専用の装備（段階7a）は町の店に出さない
  const equip = ITEMS.all.filter((i) => i.slot !== 'consumable' && !i.source && (!i.scenario || i.scenario === game.scenarioId) &&(i.slot !== 'weapon' || types.has(i.weaponType!)));
  const cons = ITEMS.all.filter((i) => i.slot === 'consumable' && !i.noShop && !(town.shop.fixed ?? []).includes(i.id));
  const pickByRarity = (pool: typeof ITEMS.all) => {
    for (let tries = 0; tries < 10; tries++) {
      const r = pickWeighted(lowWeights, rng);
      const c = pool.filter((i) => rarityIndex(i.rarity) === r);
      if (c.length) return c[rng.int(c.length)];
    }
    return pool[rng.int(pool.length)];
  };
  for (let k = 0; k < town.shop.equipment; k++) {
    const d = pickByRarity(equip);
    items.push({ kind: 'item', item: newItem(game, d), price: price(d.id) });
  }
  for (let k = 0; k < town.shop.consumables; k++) {
    const d = pickByRarity(cons);
    items.push({ kind: 'item', item: newItem(game, d), price: price(d.id) });
  }
  const cards: ShopStock['cards'] = [];
  const heroes = game.heroes.filter((h) => !h.retired);
  const odds = cardRewardOdds('elite');
  for (let k = 0; k < town.shop.cards && heroes.length; k++) {
    const h = heroes[k % heroes.length];
    // 基本のカード（最初の山札の21種）は並べない（フェーズ3）
    const pool = withoutStarterCards(heroCardPool(h, game.heroes.length === 1));
    let g = pickWeighted(odds, rng);
    let cand: string[] = [];
    for (; g >= 0 && !cand.length; g--) cand = pool.filter((id) => rarityIndex(CARDS.get(id).rarity ?? 'common') === g);
    const cardId = cand.length ? pickCard(cand, h, rng, true, BALANCE.smartDraw.shopStrength) : pool[0];
    cards.push({ cardId, heroId: h.id, price: BALANCE.cardPrice[CARDS.get(cardId).rarity ?? 'common'] ?? 40 });
  }
  const stock = { refreshedAt: w.worldTurn, items, cards };
  w.shops[town.id] = stock;
  return stock;
}

/** 町に入ったキャラ（お金・持ち物はこのキャラのもの。操作できるのはこのキャラの担当だけ） */
export const townVisitor = (game: GameState) => (game.town ? findHero(game, game.town.heroId) : undefined);

function inTown(game: GameState, playerId: string, heroId?: string): string | undefined {
  if (game.mode !== 'town' || !game.town || !game.world) return '町にいません';
  if (!facilityHero(game, playerId, heroId)) return '利用中の自分の担当キャラを選んでください';
  return undefined;
}

export function townBuy(game: GameState, cmd: Cmd<'TOWN_BUY'>, rng: Rng): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const stock = ensureShop(game, rng);
  const entry = cmd.kind === 'item' ? stock.items[cmd.index] : stock.cards[cmd.index];
  if (!entry || entry.sold) return 'その品物はありません';
  const v = facilityHero(game, cmd.playerId, cmd.heroId)!;
  // カードは、町に入ったキャラの職業のものだけ買える
  if (!('item' in entry) && getClass(findHero(game, entry.heroId)?.classId ?? '').id !== v.classId) return `${v.name}の職業のカードではありません`;
  const price = shopPriceFor(v, entry.price);
  if (v.gold < price) return 'ゴールドが足りません';
  v.gold -= price;
  entry.sold = true;
  if ('item' in entry) addLog(game, `${v.name}が${addItem(game, v, entry.item, false)}を買った（${price}G）`);
  else {
    const h = v;
    h.deck.push({ uid: `c${game.nextUid++}`, cardId: entry.cardId });
    addLog(game, `${h.name}の山札に「${CARDS.get(entry.cardId).name}」を加えた（${price}G）`);
  }
  return undefined;
}

/** スタート地点の町にいるか（伝承の書のマイペットを呼べる町。K5） */
export function inStartTown(game: GameState): boolean {
  const map = getScenario(game.scenarioId).map;
  const w = game.world;
  if (!map || !w || game.mode !== 'town' || !game.town) return false;
  const f = w.tiles[startTileOf(game, w)]?.f;
  return f?.kind === 'town' && f.id === game.town.townId;
}

/**
 * マイペットを呼ぶ（K5）: スタートの町で、1人1回、自分のお金で。中身（種類・色・名前・懐き度）はその端末の記録から届く。
 * 強さは変わらない（お供の効果は今までどおり、懐き度は見た目だけ）。乱数は使わない。
 */
export function bringMyPet(game: GameState, cmd: Cmd<'BRING_MY_PET'>): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  if (!inStartTown(game)) return 'マイペットはスタートの町で呼べます';
  const h = facilityHero(game, cmd.playerId, cmd.heroId)!;
  if (h.myPetCalled) return 'この冒険では、もうマイペットを呼びました';
  const p = cmd.pet;
  const def = p && typeof p.petId === 'string' ? PETS.tryGet(p.petId) : undefined;
  const col = def?.colors.find((c) => c.id === p.color);
  if (!def || !col || typeof p.uid !== 'string' || !p.uid) return 'そのお供は呼べません';
  if (game.heroes.some((x) => x.pet?.myPetUid === p.uid)) return 'その子はもう一緒にいます';
  if (h.gold < BALANCE.myPetCost) return 'ゴールドが足りません';
  const name = (typeof p.name === 'string' ? p.name : '').trim().slice(0, BALANCE.petNameMax) || def.names[0];
  const maxLove = BALANCE.petLove[BALANCE.petLove.length - 1];
  const love = Math.max(0, Math.min(maxLove, Math.floor(Number(p.love) || 0)));
  h.gold -= BALANCE.myPetCost;
  h.myPetCalled = true;
  if (h.pet) addLog(game, `${h.pet.name}は${h.name}に見送られて、旅立っていった`);
  h.pet = { petId: def.id, color: col.id, name, love, acts: 0, myPetUid: p.uid.slice(0, 80) };
  addLog(game, `${h.name}が名前を呼ぶと、マイペットの「${name}」（${def.name}）が駆け寄ってきた！（${BALANCE.myPetCost}G）`);
  return undefined;
}

/** 宿屋: 町に入ったキャラのHP・フォーカスが全回復（自分のお金で） */
export function townInn(game: GameState, cmd: Cmd<'TOWN_INN'>): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const cost = TOWNS.get(game.town!.townId).innCost;
  const h = facilityHero(game, cmd.playerId, cmd.heroId)!;
  if (h.gold < cost) return 'ゴールドが足りません';
  h.gold -= cost;
  h.hp = heroMaxHp(h);
  h.focus = heroFocusMax(h);
  h.nextBattleStatuses = {};
  addLog(game, `${h.name}は宿屋で休んだ（${cost}G）`);
  return undefined;
}

export function townRemoveCard(game: GameState, cmd: Cmd<'TOWN_REMOVE_CARD'>): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const h = findHero(game, cmd.heroId);
  if (!h || h !== facilityHero(game, cmd.playerId, cmd.heroId)) return '町に入ったキャラのカードだけ取り除けます';
  const cost = TOWNS.get(game.town!.townId).removeCost;
  if (h.gold < cost) return 'ゴールドが足りません';
  if (h.deck.length <= BALANCE.minDeckSize) return `山札は${BALANCE.minDeckSize}枚より少なくできません`;
  const i = h.deck.findIndex((c) => c.uid === cmd.cardUid);
  if (i < 0) return 'そのカードはありません';
  h.gold -= cost;
  const [c] = h.deck.splice(i, 1);
  addLog(game, `${h.name}の山札から「${CARDS.get(c.cardId).name}」を取り除いた（${cost}G）`);
  return undefined;
}

export function townSell(game: GameState, cmd: Cmd<'TOWN_SELL'>): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const v = facilityHero(game, cmd.playerId, cmd.heroId)!;
  const i = v.stash.findIndex((x) => x.uid === cmd.itemUid);
  if (i < 0 || isEquipped(game, cmd.itemUid)) return '売れる持ち物ではありません';
  const [it] = v.stash.splice(i, 1);
  const g = sellPrice(it.itemId);
  earnGold(v, g);
  addLog(game, `${v.name}が${getItem(it.itemId).name}を売った（${g}G）`);
  return undefined;
}

export function questAccept(game: GameState, cmd: Cmd<'QUEST_ACCEPT'>): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const town = TOWNS.get(game.town!.townId);
  if (!(town.quests ?? []).includes(cmd.questId)) return 'この町の依頼ではありません';
  const w = game.world!;
  if (w.quests.some((q) => q.id === cmd.questId)) return 'もう受けています';
  w.quests.push({ id: cmd.questId, town: town.id, progress: 0, done: false, reported: false });
  addLog(game, `依頼「${QUESTS.get(cmd.questId).title}」を受けた`);
  return undefined;
}

/** 依頼を報告できるか（目標の達成 + 届け物など） */
export function canReportQuest(game: GameState, questId: string): boolean {
  const q = game.world?.quests.find((x) => x.id === questId);
  if (!q || q.reported) return false;
  const def = QUESTS.get(questId);
  const h = objectiveHandler(def.objective);
  if (h.canReport) return h.canReport(game, def.objective as never);
  return q.done;
}

export function questReport(game: GameState, cmd: Cmd<'QUEST_REPORT'>, rng: Rng): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const w = game.world!;
  const q = w.quests.find((x) => x.id === cmd.questId);
  if (!q) return '受けていない依頼です';
  const def = QUESTS.get(q.id);
  if ((def.reportTown ?? q.town) !== game.town!.townId) return 'この町では報告できません';
  if (!canReportQuest(game, q.id)) return 'まだ達成していません';
  objectiveHandler(def.objective).onReport?.(game, def.objective as never);
  q.done = true;
  q.reported = true;
  const ctx = makeOutcomeCtx(game, rng, facilityHero(game, cmd.playerId, cmd.heroId));
  for (const o of def.reward) applyOutcome(ctx, o);
  addLoot(game, ctx.loot, [facilityHero(game, cmd.playerId, cmd.heroId)!]);
  for (const h of game.heroes) clampHero(h);
  addLog(game, `依頼「${def.title}」を報告した！（${def.rewardText}）`);
  return undefined;
}

export function leaveTown(game: GameState, cmd: Cmd<'LEAVE_TOWN'>, rng: Rng): string | undefined {
  const err = inTown(game, cmd.playerId, cmd.heroId);
  if (err) return err;
  const finished = finishFacility(game, cmd.playerId, cmd.heroId);
  if (typeof finished === 'string') return finished;
  if (!finished) return undefined;
  game.town = undefined;
  backToWorld(game, rng, false);
  return undefined;
}

// ---------- 祠（spec §8.4） ----------

export function shrineChoose(game: GameState, cmd: Cmd<'SHRINE_CHOOSE'>, rng: Rng): string | undefined {
  const s = game.shrine;
  if (game.mode !== 'shrine' || !s || !game.world) return '祠にいません';
  if (s.result) return 'もう祈りました';
  const def = SHRINES.get(s.shrineId);
  const opt = def.options[cmd.optionIndex];
  if (!opt) return '選択肢がありません';
  const h = findHero(game, cmd.heroId);
  if (!h || h.hp <= 0 || !ownedBy(h, cmd.playerId) || !facilityMembers(game).includes(h.id) || game.shrine?.finished?.includes(h.id)) return 'このキャラは祈れません';
  if (opt.permanent && (h.blessings ?? 0) >= BALANCE.maxBlessings) return `永続の加護は1人${BALANCE.maxBlessings}つまでです`;
  const ctx = makeOutcomeCtx(game, rng, h);
  for (const o of opt.outcomes) applyOutcome(ctx, o);
  addLoot(game, ctx.loot, [h]);
  if (opt.permanent) h.blessings = (h.blessings ?? 0) + 1;
  for (const x of game.heroes) clampHero(x);
  game.world.tiles[s.tile].f!.used = true;
  s.result = { optionIndex: cmd.optionIndex, text: `${h.name}は「${opt.label}」を受けた` };
  addFeat(h, 'prayers');
  addLog(game, s.result.text);
  return undefined;
}

export function leaveShrine(game: GameState, cmd: Cmd<'LEAVE_SHRINE'>, rng: Rng): string | undefined {
  if (game.mode !== 'shrine' || !game.shrine) return '祠にいません';
  const finished = finishFacility(game, cmd.playerId, cmd.heroId);
  if (typeof finished === 'string') return finished;
  if (!finished) return undefined;
  game.shrine = undefined;
  backToWorld(game, rng, false);
  return undefined;
}

export function leaveSanctuary(game: GameState, cmd: Cmd<'LEAVE_SANCTUARY'>, rng: Rng): string | undefined {
  if (game.mode !== 'sanctuary' || !game.sanctuary) return '神殿・祭壇にいません';
  const finished = finishFacility(game, cmd.playerId, cmd.heroId);
  if (typeof finished === 'string') return finished;
  if (!finished) return undefined;
  game.sanctuary = undefined;
  backToWorld(game, rng, false);
  return undefined;
}
