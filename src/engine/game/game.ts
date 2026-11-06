// ===== 冒険のエンジン（Reactに依存しない純粋関数） =====
// applyGameCommand(game, command) => { state, battleEvents }
// 戦闘中の操作は BATTLE コマンドで戦闘エンジン（applyCommand）に渡す。

import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { getClass } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getItem, POUCH_LIMIT } from '../../data/items';
import type {
  BattleEvent,
  EventOutcome,
  GameCommand,
  GameResult,
  GameState,
  GrowthOption,
  Hero,
  ItemInstance,
  Loot,
  NewGameSetup,
  Rarity,
  RewardState,
  Room,
  SlotResult,
  StatId,
} from '../../types';
import { applyCommand, createBattle, STATE_VERSION } from '../battle/battle';
import { finalChanceOf } from './checks';
import { createRng, type Rng } from '../rng';
import { buildDungeon, findRoom, RARITIES, rarityIndex, reachableRooms } from './dungeon';
import {
  canEquip,
  clampHero,
  expToNext,
  heroFocusMax,
  heroMaxHp,
  heroStats,
  STAT_IDS,
  toPartyMember,
} from './hero';
import { cardRewardOdds, chestOdds, newItem, rollCardOffers, rollChestContents, rollConsumable, rollEquipment, rollGrade } from './loot';

export const GAME_VERSION = STATE_VERSION;

// ---------- 生成 ----------

export function createGame(setup: NewGameSetup): GameState {
  if (setup.party.length < 1 || setup.party.length > BALANCE.maxPartySize) throw new Error('party size must be 1..4');
  const game: GameState = {
    version: GAME_VERSION,
    seed: setup.seed,
    rngState: setup.seed >>> 0,
    scenarioId: setup.scenarioId,
    difficulty: setup.difficulty,
    heroes: [],
    gold: 0,
    stash: [],
    pouch: [],
    mode: 'hub',
    clearedDungeons: [],
    randomDungeonSeed: (setup.seed * 7919 + 13) >>> 0,
    stats: { battlesWon: 0, dungeonsCleared: 0, chestsOpened: 0, totalDamage: 0, perfects: 0 },
    log: [],
    nextUid: 1,
    nextLogId: 1,
  };
  game.heroes = setup.party.map((m, i) => {
    const cls = getClass(m.classId);
    const hero: Hero = {
      id: `h${i}`,
      classId: m.classId,
      gender: m.gender,
      name: m.name,
      playerId: m.playerId,
      level: 1,
      exp: 0,
      hp: 0,
      focus: BALANCE.focusStart,
      bonusStats: {},
      bonusMaxHp: 0,
      bonusFocusMax: 0,
      deck: cls.deck.flatMap((d) => Array.from({ length: d.count }, () => ({ uid: `c${game.nextUid++}`, cardId: d.cardId }))),
      equipment: {},
      nextBattleStatuses: {},
    };
    for (const [slot, itemId] of Object.entries(cls.startingEquipment)) {
      if (itemId) hero.equipment[slot as keyof Hero['equipment']] = newItem(game, getItem(itemId));
    }
    hero.hp = heroMaxHp(hero);
    return hero;
  });
  // 最初の持ち物（シナリオの開始条件）
  const start = getScenario(setup.scenarioId).start;
  game.gold = start.gold ?? 0;
  for (const p of start.pouch ?? []) for (let i = 0; i < p.count; i++) game.pouch.push(newItem(game, getItem(p.itemId)));
  for (const p of start.stash ?? []) for (let i = 0; i < p.count; i++) game.stash.push(newItem(game, getItem(p.itemId)));
  addLog(game, '冒険が始まった！');
  return game;
}

// ---------- 小さな道具 ----------

function addLog(game: GameState, text: string) {
  game.log.push({ id: game.nextLogId++, text });
  if (game.log.length > 120) game.log.splice(0, game.log.length - 120);
}

export const findHero = (game: GameState, id: string) => game.heroes.find((h) => h.id === id);
export const livingHeroes = (game: GameState) => game.heroes.filter((h) => h.hp > 0);
const ownedBy = (hero: Hero | undefined, playerId: string) => !!hero && hero.playerId === playerId;
const isPartyPlayer = (game: GameState, playerId: string) => game.heroes.some((h) => h.playerId === playerId);

function rollWithFocus(slots: number, focusUsed: number, chance: number, rng: Rng): SlotResult[] {
  const out: SlotResult[] = [];
  for (let i = 0; i < slots; i++) out.push(i < focusUsed ? 'focus' : rng.next() < chance / 100 ? 'hit' : 'miss');
  return out;
}

const successes = (r: SlotResult[]) => r.filter((x) => x !== 'miss').length;

/** 持ち物に入れる（消費アイテムは袋。袋が満杯ならゴールドに換える） */
function addItem(game: GameState, item: ItemInstance, gainedInDungeon: boolean): string {
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

function addLoot(game: GameState, loot: Loot[]) {
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

// ---------- コマンド処理 ----------

export function applyGameCommand(input: GameState, cmd: GameCommand): GameResult {
  // 戦闘中のカード操作は戦闘の状態しか変わらない。冒険全体を複製せず、戦闘エンジンの結果だけを差し替える（軽い）
  if (cmd.type === 'BATTLE' && cmd.command.type !== 'USE_ITEM') {
    if (input.mode !== 'battle' || !input.battle) return { state: input, battleEvents: [], error: '戦闘中ではありません' };
    const r = applyCommand(input.battle, cmd.command);
    if (r.error) return { state: input, battleEvents: [], error: r.error };
    return { state: { ...input, battle: r.state }, battleEvents: r.events };
  }
  const game: GameState = structuredClone(input);
  const rng = createRng(input.rngState);
  let battleEvents: BattleEvent[] = [];
  let error: string | undefined;
  try {
    switch (cmd.type) {
      case 'ENTER_DUNGEON':
        error = enterDungeon(game, cmd.playerId, cmd.dungeonId, rng);
        break;
      case 'ENTER_ROOM':
        error = enterRoom(game, cmd.playerId, cmd.roomId, rng);
        break;
      case 'BATTLE': {
        if (game.mode !== 'battle' || !game.battle) {
          error = '戦闘中ではありません';
          break;
        }
        if (cmd.command.type === 'USE_ITEM') {
          error = '道具は USE_POUCH_ITEM で使ってください';
          break;
        }
        const r = applyCommand(game.battle, cmd.command);
        if (r.error) error = r.error;
        else {
          game.battle = r.state;
          battleEvents = r.events;
        }
        break;
      }
      case 'USE_POUCH_ITEM': {
        const r = usePouchItem(game, cmd);
        error = r.error;
        battleEvents = r.events;
        break;
      }
      case 'FINISH_BATTLE':
        error = finishBattle(game, cmd.playerId, rng);
        break;
      case 'CHOOSE_GROWTH':
        error = chooseGrowth(game, cmd.playerId, cmd.optionIndex, cmd.cardUid);
        break;
      case 'PICK_CARD':
        error = pickCard(game, cmd.playerId, cmd.offerIndex);
        break;
      case 'FINISH_REWARD':
        error = finishReward(game, cmd.playerId);
        break;
      case 'OPEN_CHEST':
        error = openChest(game, cmd.playerId, cmd.heroId, cmd.focusUsed, rng);
        break;
      case 'LEAVE_CHEST':
        error = leaveChest(game, cmd.playerId);
        break;
      case 'CHOOSE_EVENT':
        error = chooseEvent(game, cmd.playerId, cmd.optionIndex, cmd.heroId, cmd.focusUsed, rng);
        break;
      case 'FINISH_EVENT':
        error = finishEvent(game, cmd.playerId);
        break;
      case 'REST':
        error = rest(game, cmd.playerId, cmd.kind);
        break;
      case 'RETREAT':
        error = retreat(game, cmd.playerId);
        break;
      case 'RETURN_TO_HUB':
        error = returnToHub(game, cmd.playerId);
        break;
      case 'EQUIP':
        error = equip(game, cmd.playerId, cmd.heroId, cmd.itemUid);
        break;
      case 'UNEQUIP':
        error = unequip(game, cmd.playerId, cmd.heroId, cmd.slot);
        break;
      default:
        error = '不明なコマンドです';
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (error) return { state: input, battleEvents: [], error };
  game.rngState = rng.state;
  return { state: game, battleEvents };
}

// ---------- 拠点・ダンジョン ----------

/** 拠点で選べるダンジョン */
export function availableDungeons(game: GameState): string[] {
  return DUNGEONS.forScenario(game.scenarioId).map((d) => d.id);
}

function enterDungeon(game: GameState, playerId: string, dungeonId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'hub') return '拠点からしか出発できません';
  if (!availableDungeons(game).includes(dungeonId)) return 'そのダンジョンには行けません';
  const levelBonus = BALANCE.difficultyLevel[game.difficulty] ?? 0;
  const eventIds = EVENTS.forScenario(game.scenarioId).map((e) => e.id);
  // ランダムダンジョンは拠点ごとの種で作る（同じ種なら同じ構造）
  const random = !!DUNGEONS.get(dungeonId).random;
  const dRng = random ? createRng(game.randomDungeonSeed) : rng;
  game.dungeon = buildDungeon(dungeonId, dRng, levelBonus + (random ? game.clearedDungeons.length : 0), eventIds);
  game.mode = 'dungeon';
  addLog(game, `${game.dungeon.name}に入った`);
  return undefined;
}

function enterRoom(game: GameState, playerId: string, roomId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const run = game.dungeon;
  if (game.mode !== 'dungeon' || !run) return 'ダンジョンにいません';
  const room = findRoom(run, roomId);
  if (!room || !reachableRooms(run).some((r) => r.id === roomId)) return 'その部屋には進めません';
  run.currentRoomId = room.id;
  switch (room.type) {
    case 'battle':
    case 'elite':
    case 'boss':
      startBattle(game, room, rng);
      break;
    case 'chest':
      game.chest = { roomId: room.id, spec: room.chest ?? { rarity: 'common', locked: false }, unlocked: !room.chest?.locked };
      game.mode = 'chest';
      break;
    case 'event':
      game.event = { roomId: room.id, eventId: room.eventId ?? EVENTS.all[0].id };
      game.mode = 'event';
      break;
    case 'rest':
      game.mode = 'rest';
      break;
  }
  return undefined;
}

function startBattle(game: GameState, room: Room, rng: Rng) {
  const party = livingHeroes(game).map(toPartyMember);
  const enemies = room.enemies ?? [];
  game.battle = createBattle({
    seed: rng.int(1_000_000_000),
    party,
    encounter: { id: room.id, name: room.type === 'boss' ? 'ボス' : room.type === 'elite' ? '強敵' : '戦闘', enemies },
  });
  for (const h of game.heroes) h.nextBattleStatuses = {};
  game.mode = 'battle';
}

/** 戦闘の結果をキャラに戻す（戦闘不能のキャラは勝てばHP1で復帰） */
function syncHeroesFromBattle(game: GameState, revive: boolean) {
  const b = game.battle!;
  for (const a of b.allies) {
    const h = findHero(game, a.id);
    if (!h) continue;
    h.hp = a.dead ? (revive ? 1 : 0) : a.hp;
    h.focus = a.focus;
  }
}

function finishBattle(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const b = game.battle;
  const run = game.dungeon;
  if (game.mode !== 'battle' || !b || !run) return '戦闘中ではありません';
  const room = findRoom(run, run.currentRoomId ?? '')!;
  if (b.phase === 'defeat') {
    syncHeroesFromBattle(game, false);
    game.mode = 'gameover';
    addLog(game, 'パーティは全滅した…');
    return undefined;
  }
  if (b.phase === 'escaped') {
    syncHeroesFromBattle(game, true);
    room.cleared = true;
    game.battle = undefined;
    game.mode = 'dungeon';
    return undefined;
  }
  if (b.phase !== 'victory') return '戦闘はまだ終わっていません';

  // 戦闘不能だったキャラは経験値なし
  const survivors = b.allies.filter((a) => !a.dead).map((a) => a.id);
  syncHeroesFromBattle(game, true);
  game.stats.battlesWon += 1;
  game.stats.totalDamage += b.stats.totalDamage;
  game.stats.perfects += b.stats.perfects;

  let exp = 0;
  let gold = 0;
  for (const e of b.enemies) {
    const def = getEnemy(e.defId);
    const k = 1 + BALANCE.rewardPerLevel * (e.level - def.baseLevel);
    exp += Math.max(1, Math.round(def.exp * k));
    gold += Math.max(0, Math.round(def.gold * k * (0.85 + rng.next() * 0.3)));
  }
  game.gold += gold;

  const cardOdds = cardRewardOdds(room.type);
  const reward: RewardState = { gold, exp: [], levelUps: [], cardOffers: rollCardOffers(game, survivors, rng, cardOdds), cardOdds, cardPicked: false, loot: [] };
  for (const id of survivors) {
    const h = findHero(game, id)!;
    const fromLevel = h.level;
    const fromExp = h.exp;
    h.exp += exp;
    while (h.level < BALANCE.maxLevel && h.exp >= expToNext(h.level)) {
      h.exp -= expToNext(h.level);
      h.level += 1;
      h.hp = Math.min(heroMaxHp(h), h.hp + getClass(h.classId).hpPerLevel);
      reward.levelUps.push({ heroId: h.id, level: h.level, options: growthOptions(h, rng) });
      addLog(game, `${h.name}はレベル${h.level}に上がった！`);
    }
    if (h.level >= BALANCE.maxLevel) h.exp = 0;
    reward.exp.push({ heroId: h.id, gained: exp, fromLevel, toLevel: h.level, fromExp, toExp: h.exp });
  }

  // 強敵は装備を落とす。ボスの大宝箱は報酬の後に開ける
  if (room.type === 'elite') {
    const item = newItem(game, rollEquipment(rng.next() * 100 < BALANCE.eliteEpicDrop ? 'epic' : 'rare', game.heroes, rng));
    reward.loot.push({ kind: 'item', item });
    addItem(game, item, true);
  } else if (room.type === 'battle' && rng.next() < 0.25) {
    const item = newItem(game, rollConsumable('common', rng));
    reward.loot.push({ kind: 'item', item });
    addItem(game, item, true);
  }
  if (room.type !== 'boss' && rng.next() * 100 < hiddenChestChance(game)) {
    reward.hiddenChest = { rarity: RARITIES[rng.next() < 0.3 ? 1 : 0], locked: rng.next() < 0.5 };
  }
  room.cleared = true;
  game.reward = reward;
  game.battle = undefined;
  game.mode = 'reward';
  return undefined;
}

// ---------- 成長と報酬 ----------

/** 成長ボーナスの候補3つ（職業の伸びやすい能力値を優先） */
export function growthOptions(hero: Hero, rng: Rng): GrowthOption[] {
  const weights = getClass(hero.classId).growthWeights;
  const bag: StatId[] = STAT_IDS.flatMap((s) => Array.from({ length: 1 + (weights[s] ?? 0) }, () => s));
  const stats: StatId[] = [];
  for (let i = 0; i < 20 && stats.length < 2; i++) {
    const s = bag[rng.int(bag.length)];
    if (!stats.includes(s)) stats.push(s);
  }
  const opts: GrowthOption[] = stats.map((s) => ({ kind: 'stat', stat: s, amount: BALANCE.growthStat }));
  const extra: GrowthOption[] = [{ kind: 'maxHp', amount: BALANCE.growthMaxHp }, { kind: 'focusMax', amount: 1 }];
  if (hero.deck.some((c) => !c.upgraded)) extra.push({ kind: 'upgradeCard', amount: 1 });
  opts.push(extra[rng.int(extra.length)]);
  return opts;
}

function chooseGrowth(game: GameState, playerId: string, optionIndex: number, cardUid?: string): string | undefined {
  const r = game.reward;
  if (game.mode !== 'reward' || !r || !r.levelUps.length) return '選べる成長はありません';
  const lu = r.levelUps[0];
  const h = findHero(game, lu.heroId)!;
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const opt = lu.options[optionIndex];
  if (!opt) return '選択肢がありません';
  switch (opt.kind) {
    case 'stat':
      h.bonusStats[opt.stat!] = (h.bonusStats[opt.stat!] ?? 0) + opt.amount;
      break;
    case 'maxHp':
      h.bonusMaxHp += opt.amount;
      h.hp += opt.amount;
      break;
    case 'focusMax':
      h.bonusFocusMax += opt.amount;
      h.focus += opt.amount;
      break;
    case 'upgradeCard': {
      const c = h.deck.find((x) => x.uid === cardUid);
      if (!c || c.upgraded) return '強化するカードを選んでください';
      c.upgraded = true;
      addLog(game, `${h.name}の「${CARDS.get(c.cardId).name}」が強化された`);
      break;
    }
  }
  clampHero(h);
  r.levelUps.shift();
  return undefined;
}

function pickCard(game: GameState, playerId: string, offerIndex: number | null): string | undefined {
  const r = game.reward;
  if (game.mode !== 'reward' || !r || r.cardPicked) return 'カードは選べません';
  if (offerIndex !== null) {
    const o = r.cardOffers[offerIndex];
    if (!o) return '選択肢がありません';
    const h = findHero(game, o.heroId)!;
    if (!ownedBy(h, playerId)) return '担当していないキャラのカードです';
    h.deck.push({ uid: `c${game.nextUid++}`, cardId: o.cardId });
    addLog(game, `${h.name}の山札に「${CARDS.get(o.cardId).name}」が加わった`);
  } else if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  r.cardPicked = true;
  return undefined;
}

function finishReward(game: GameState, playerId: string): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const r = game.reward;
  const run = game.dungeon;
  if (game.mode !== 'reward' || !r || !run) return '報酬画面ではありません';
  if (r.levelUps.length) return '成長ボーナスを選んでください';
  const room = findRoom(run, run.currentRoomId ?? '')!;
  game.reward = undefined;
  if (room.type === 'boss') {
    const def = DUNGEON_BOSS_CHEST(run.dungeonId);
    game.chest = { roomId: room.id, spec: { rarity: def, locked: false, big: true }, unlocked: true };
    game.mode = 'chest';
  } else if (r.hiddenChest) {
    game.chest = { roomId: room.id, spec: r.hiddenChest, unlocked: !r.hiddenChest.locked };
    addLog(game, '隠し宝箱を見つけた！');
    game.mode = 'chest';
  } else game.mode = 'dungeon';
  return undefined;
}

const DUNGEON_BOSS_CHEST = (id: string): Rarity => DUNGEONS.get(id).bossChest;

// ---------- 宝箱 ----------

export const LOCK_TRAP_DAMAGE = 5;
const GRADE_NAME: Record<Rarity, string> = { common: 'コモン', rare: 'レア', epic: 'エピック', legend: 'レジェンド' };

function openChest(game: GameState, playerId: string, heroId: string, focusUsed: number, rng: Rng): string | undefined {
  const c = game.chest;
  if (game.mode !== 'chest' || !c) return '宝箱がありません';
  if (c.contents) return 'もう開けました';
  const h = findHero(game, heroId);
  if (!h || h.hp <= 0) return 'そのキャラは動けません';
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const slots = c.unlocked ? BALANCE.chestLuckSlots : BALANCE.lockSlots;
  if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(slots, h.focus)) return 'フォーカスの数が不正です';
  h.focus -= focusUsed;
  if (!c.unlocked) {
    const results = rollWithFocus(slots, focusUsed, statChance(h, 'dex', 'lock'), rng);
    const ok = successes(results) >= BALANCE.lockNeed;
    if (ok) {
      c.unlocked = true;
      c.lastRoll = { kind: 'lock', heroId, results, success: true };
    } else {
      for (const x of livingHeroes(game)) x.hp = Math.max(1, x.hp - LOCK_TRAP_DAMAGE);
      c.lastRoll = { kind: 'lock', heroId, results, success: false, trap: `罠が作動した！ 全員に${LOCK_TRAP_DAMAGE}ダメージ` };
    }
    return undefined;
  }
  // 運のスロット → 成功数で確率が上の格へずれる → 格を1回だけ抽選（spec §10.3）
  const results = rollWithFocus(slots, focusUsed, statChance(h, 'luk', 'luck'), rng);
  const n = successes(results);
  const oddsBefore = chestOdds(c.spec.rarity, 0);
  const odds = chestOdds(c.spec.rarity, n);
  const grade = rollGrade(odds, rng);
  const omen = grade === 'legend' && rng.next() * 100 < BALANCE.chestOmenChance;
  c.grade = grade;
  c.lastRoll = { kind: 'luck', heroId, results, success: n === slots, oddsBefore, odds, grade, gradeChance: odds[rarityIndex(grade)], omen };
  c.contents = rollChestContents(game, grade, !!c.spec.big, rng);
  addLoot(game, c.contents);
  game.stats.chestsOpened += 1;
  addLog(game, `宝箱の中身は${GRADE_NAME[grade]}だった（確率${odds[rarityIndex(grade)].toFixed(1)}%）`);
  return undefined;
}

function leaveChest(game: GameState, playerId: string): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const c = game.chest;
  const run = game.dungeon;
  if (game.mode !== 'chest' || !c || !run) return '宝箱がありません';
  const room = findRoom(run, c.roomId)!;
  room.cleared = true;
  game.chest = undefined;
  if (room.type === 'boss' && c.spec.big) {
    game.mode = 'cleared';
    game.stats.dungeonsCleared += 1;
    if (!game.clearedDungeons.includes(run.dungeonId)) game.clearedDungeons.push(run.dungeonId);
    addLog(game, `${run.name}を制覇した！`);
  } else game.mode = 'dungeon';
  return undefined;
}

// ---------- イベント・休憩 ----------

/** その選択肢を今選べるか（必要な能力・ゴールド） */
export function eventOptionState(game: GameState, eventId: string, index: number): { visible: boolean; reason?: string } {
  const opt = EVENTS.get(eventId).options[index];
  if (!opt) return { visible: false };
  if (opt.requiresTag && !partyHasTag(game, opt.requiresTag)) return { visible: false };
  if (opt.cost && game.gold < opt.cost) return { visible: true, reason: `ゴールドが足りません（${opt.cost}G）` };
  return { visible: true };
}

function applyOutcomes(game: GameState, outs: EventOutcome[], actor: Hero | undefined, rng: Rng): Loot[] {
  const loot: Loot[] = [];
  const targets = (all?: boolean) => (all ? livingHeroes(game) : actor ? [actor] : livingHeroes(game).slice(0, 1));
  for (const o of outs) {
    switch (o.kind) {
      case 'heal':
        for (const h of targets(o.all)) h.hp = Math.min(heroMaxHp(h), h.hp + o.amount);
        break;
      case 'damage':
        for (const h of targets(o.all)) h.hp = Math.max(1, h.hp - o.amount);
        break;
      case 'focus':
        for (const h of targets(o.all)) h.focus = Math.min(heroFocusMax(h), h.focus + o.amount);
        break;
      case 'gold':
        loot.push({ kind: 'gold', amount: o.amount });
        break;
      case 'loseGold':
        game.gold = Math.max(0, game.gold - o.amount);
        break;
      case 'item': {
        const def = o.slot === 'consumable' ? rollConsumable(o.rarity, rng) : rollEquipment(o.rarity, game.heroes, rng);
        loot.push({ kind: 'item', item: newItem(game, def) });
        break;
      }
      case 'exp':
        for (const h of livingHeroes(game)) {
          h.exp += o.amount;
          while (h.level < BALANCE.maxLevel && h.exp >= expToNext(h.level)) {
            h.exp -= expToNext(h.level);
            h.level += 1;
            h.hp = Math.min(heroMaxHp(h), h.hp + getClass(h.classId).hpPerLevel);
          }
        }
        break;
      case 'status':
        for (const h of targets(false)) h.nextBattleStatuses[o.status] = (h.nextBattleStatuses[o.status] ?? 0) + o.amount;
        break;
      case 'card': {
        const h = actor ?? livingHeroes(game)[0];
        if (h) {
          const pool = getClass(h.classId).cardPool;
          loot.push({ kind: 'card', cardId: pool[rng.int(pool.length)], heroId: h.id });
        }
        break;
      }
      case 'nothing':
        break;
    }
  }
  addLoot(game, loot);
  return loot;
}

function chooseEvent(
  game: GameState,
  playerId: string,
  optionIndex: number,
  heroId: string | undefined,
  focusUsed: number,
  rng: Rng,
): string | undefined {
  const ev = game.event;
  if (game.mode !== 'event' || !ev) return 'イベント中ではありません';
  if (ev.result) return 'もう選びました';
  const def = EVENTS.get(ev.eventId);
  const opt = def.options[optionIndex];
  const st = eventOptionState(game, ev.eventId, optionIndex);
  if (!opt || !st.visible) return '選択肢がありません';
  if (st.reason) return st.reason;
  let actor: Hero | undefined;
  let results: SlotResult[] | undefined;
  let ok = true;
  if (opt.check) {
    actor = heroId ? findHero(game, heroId) : undefined;
    if (!actor || actor.hp <= 0) return '判定するキャラを選んでください';
    if (!ownedBy(actor, playerId)) return '担当していないキャラです';
    if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(opt.check.slots, actor.focus)) return 'フォーカスの数が不正です';
    actor.focus -= focusUsed;
    results = rollWithFocus(opt.check.slots, focusUsed, statChance(actor, opt.check.stat, opt.check.tag), rng);
    ok = successes(results) >= opt.check.need;
  } else if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const outs = ok ? opt.success : (opt.fail ?? []);
  const loot = applyOutcomes(game, outs, actor, rng);
  ev.result = { optionIndex, heroId: actor?.id, results, success: ok, text: ok ? opt.successText : (opt.failText ?? ''), loot };
  return undefined;
}

function finishEvent(game: GameState, playerId: string): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const ev = game.event;
  if (game.mode !== 'event' || !ev || !ev.result || !game.dungeon) return 'まだ選んでいません';
  findRoom(game.dungeon, ev.roomId)!.cleared = true;
  game.event = undefined;
  game.mode = 'dungeon';
  return undefined;
}

function rest(game: GameState, playerId: string, kind: 'hp' | 'focus'): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'rest' || !game.dungeon) return '休憩できる場所ではありません';
  for (const h of game.heroes) {
    if (h.hp <= 0) continue;
    if (kind === 'hp') h.hp = Math.min(heroMaxHp(h), h.hp + Math.ceil(heroMaxHp(h) * BALANCE.restHpRatio));
    else h.focus = Math.min(heroFocusMax(h), h.focus + BALANCE.restFocus);
  }
  findRoom(game.dungeon, game.dungeon.currentRoomId ?? '')!.cleared = true;
  game.mode = 'dungeon';
  addLog(game, kind === 'hp' ? '休憩してHPを回復した' : '瞑想してフォーカスを回復した');
  return undefined;
}

// ---------- 撤退・帰還 ----------

/** 撤退すると失うもの（このダンジョンで最後に手に入れた装備） */
export function retreatLoss(game: GameState): ItemInstance | undefined {
  const g = game.dungeon?.gained ?? [];
  for (let i = g.length - 1; i >= 0; i--) if (game.stash.some((s) => s.uid === g[i].uid) || isEquipped(game, g[i].uid)) return g[i];
  return undefined;
}

const isEquipped = (game: GameState, uid: string) => game.heroes.some((h) => Object.values(h.equipment).some((e) => e?.uid === uid));

function retreat(game: GameState, playerId: string): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'dungeon' || !game.dungeon) return 'ダンジョンの通路でのみ撤退できます';
  const lost = retreatLoss(game);
  if (lost) {
    game.stash = game.stash.filter((s) => s.uid !== lost.uid);
    for (const h of game.heroes) for (const [slot, e] of Object.entries(h.equipment)) if (e?.uid === lost.uid) delete h.equipment[slot as keyof Hero['equipment']];
    for (const h of game.heroes) clampHero(h);
    addLog(game, `撤退の途中で「${getItem(lost.itemId).name}」を落としてしまった…`);
  }
  addLog(game, `${game.dungeon.name}から撤退した`);
  toHub(game);
  return undefined;
}

function returnToHub(game: GameState, playerId: string): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'cleared') return 'まだ帰還できません';
  toHub(game);
  return undefined;
}

/** 拠点に戻る（仮の拠点: HP・フォーカス全回復。ランダムダンジョンが入れ替わる） */
function toHub(game: GameState) {
  game.dungeon = undefined;
  game.battle = undefined;
  game.chest = undefined;
  game.event = undefined;
  game.reward = undefined;
  game.mode = 'hub';
  game.randomDungeonSeed = (Math.imul(game.randomDungeonSeed, 1103515245) + 12345) >>> 0;
  for (const h of game.heroes) {
    h.hp = heroMaxHp(h);
    h.focus = heroFocusMax(h);
    h.nextBattleStatuses = {};
  }
}

// ---------- 装備・道具 ----------

function equip(game: GameState, playerId: string, heroId: string, itemUid: string): string | undefined {
  if (game.mode === 'battle') return '戦闘中は装備を変えられません';
  const h = findHero(game, heroId);
  if (!h) return 'キャラクターが見つかりません';
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const idx = game.stash.findIndex((s) => s.uid === itemUid);
  if (idx < 0) return '持ち物にありません';
  const def = getItem(game.stash[idx].itemId);
  const why = canEquip(h, def);
  if (why) return why;
  const slot = def.slot as keyof Hero['equipment'];
  const prev = h.equipment[slot];
  h.equipment[slot] = game.stash[idx];
  game.stash.splice(idx, 1);
  if (prev) game.stash.push(prev);
  clampHero(h);
  return undefined;
}

function unequip(game: GameState, playerId: string, heroId: string, slot: keyof Hero['equipment']): string | undefined {
  if (game.mode === 'battle') return '戦闘中は装備を変えられません';
  const h = findHero(game, heroId);
  if (!h) return 'キャラクターが見つかりません';
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const cur = h.equipment[slot];
  if (!cur) return '何も装備していません';
  delete h.equipment[slot];
  game.stash.push(cur);
  clampHero(h);
  return undefined;
}

function usePouchItem(
  game: GameState,
  cmd: Extract<GameCommand, { type: 'USE_POUCH_ITEM' }>,
): { error?: string; events: BattleEvent[] } {
  const idx = game.pouch.findIndex((p) => p.uid === cmd.itemUid);
  if (idx < 0) return { error: '袋にありません', events: [] };
  const def = getItem(game.pouch[idx].itemId);
  if (!def.use) return { error: '使えない道具です', events: [] };
  if (game.mode === 'battle' && game.battle) {
    const room = game.dungeon ? findRoom(game.dungeon, game.dungeon.currentRoomId ?? '') : undefined;
    if (def.use.some((e) => e.kind === 'escape') && room?.type === 'boss') return { error: 'ボスからは逃げられない！', events: [] };
    const r = applyCommand(game.battle, {
      type: 'USE_ITEM',
      playerId: cmd.playerId,
      characterId: cmd.userId,
      targetId: cmd.targetId,
      itemName: def.name,
      effects: def.use,
    });
    if (r.error) return { error: r.error, events: [] };
    game.battle = r.state;
    game.pouch.splice(idx, 1);
    return { events: r.events };
  }
  // 戦闘の外（ダンジョン・拠点など）
  const user = findHero(game, cmd.userId);
  const target = findHero(game, cmd.targetId);
  if (!user || !ownedBy(user, cmd.playerId)) return { error: '担当していないキャラです', events: [] };
  if (!target || target.hp <= 0) return { error: '対象が戦闘不能です', events: [] };
  for (const e of def.use) {
    switch (e.kind) {
      case 'heal':
        if (target.hp >= heroMaxHp(target)) return { error: 'HPは満タンです', events: [] };
        target.hp = Math.min(heroMaxHp(target), target.hp + e.amount);
        break;
      case 'gainFocus':
        if (target.focus >= heroFocusMax(target)) return { error: 'フォーカスは最大です', events: [] };
        target.focus = Math.min(heroFocusMax(target), target.focus + e.amount);
        break;
      case 'cleanse':
        if (!Object.values(target.nextBattleStatuses).some((v) => v)) return { error: '治す状態異常がありません', events: [] };
        target.nextBattleStatuses = {};
        break;
      case 'escape':
        return { error: '戦闘中にしか使えません', events: [] };
      default:
        return { error: '戦闘中にしか使えません', events: [] };
    }
  }
  game.pouch.splice(idx, 1);
  addLog(game, `${user.name}が${def.name}を使った`);
  return { events: [] };
}

