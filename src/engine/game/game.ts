import { detachFollower } from './world/group';
// ===== 冒険のエンジン（Reactに依存しない純粋関数） =====
// applyGameCommand(game, command) => { state, battleEvents }
// 戦闘中の操作は BATTLE コマンドで戦闘エンジン（applyCommand）に渡す。

import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { getClass } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { corruptionName, getScenario } from '../../data/scenarios';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getItem, POUCH_LIMIT } from '../../data/items';
import type {
  DungeonRun,
  EventBattle,
  BattleEvent,
  EventOutcome,
  GameCommand,
  GameResult,
  GameState,
  Hero,
  ItemInstance,
  Loot,
  NewGameSetup,
  Rarity,
  RewardState,
  Room,
  SlotResult,
  EncounterSpec,
  Facing,
} from '../../types';
import { applyCommand, createBattle, STATE_VERSION } from '../battle/battle';
import { createRng, type Rng } from '../rng';
import { applyOutcome, checkOutcome, hasOutcomeKind, makeOutcomeCtx } from './outcomes';
import { expeditionOf, livingHeroes, findHero, sceneHeroes } from './heroes';
import { recordCheck } from './checks';
import { addItem, addLog, addLoot, restMultiplierOf, hiddenChestChance, isPartyPlayer, leastLoaded, ownedBy, partyHasTag, rollWithFocus, splitGold, statChance, successes } from './common';
import { getDifficulty } from '../../data/rules';
import { isBossRoom, roomBehavior, roomTypeOf } from './rooms';
import { growthHandler, growthOptions } from './growth';
import { RARITY_NAME } from '../../data/terms';
import { createWorld } from './world/generate';
import { corruptionLevelBonus, wandererLevel } from './world/wanderers';
import {
  backToWorld,
  camp,
  endExpeditionTurn,
  isExpeditionTurn,
  rejoinWorld,
  encounterChoose,
  encounterContinue,
  handleDefeat,
  interact,
  moveHero,
  onWandererDefeated,
  questSignal,
  rollMove,
  rerollMove,
  storyContinue,
  waitTurn,
  reviveAlly,
  agreeMove,
  heroesAt,
} from './world/world';
import { questGatedNext } from './world/questGate';
import { leaveSanctuary, leaveShrine, leaveTown, questAccept, questReport, shrineChoose, bringMyPet, townBuy, townInn, townRemoveCard, townSell } from './world/town';
import { getRoomType } from '../../data/rules';
import { TERRAINS } from '../../data/world';
import { buildDungeon, findRoom, RARITIES, rarityIndex, reachableRooms } from './dungeon';
import { newDice, rerollDice } from './dice';
import { canMove, cellKey, DIRS, doorFront, doorNorthOf, dungeonGrid, findPath, moveIntoRoom, posOf, revealSeen, turnTo } from './dungeonMap';
import { watchSpot } from './dungeonOmen';
import {
  canEquip,
  clampHero,
  expToNext,
  heroFocusMax,
  heroMaxHp,
  heroStats,
  toPartyMember,
} from './hero';
import { needsVote, tally, VOTED_COMMANDS, voteCtx, voters } from './votes';
import { encounterJoin, worldInvite, worldInviteAnswer } from './world/world';
import { EXPEDITION_MODES, findExpedition, mount, restoreSceneFields, saveSceneFields, unmount } from './scenes';
import { addFeat, announceJobs, changeJob, pickJobCard } from './jobs';
import { addPetActs, addPetLove, adoptPet, patPet } from './pets';
import { doCardTask, peddlerBuy } from './tasks';
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
    mode: 'hub',
    clearedDungeons: [],
    randomDungeonSeed: (setup.seed * 7919 + 13) >>> 0,
    stats: { battlesWon: 0, dungeonsCleared: 0, chestsOpened: 0, totalDamage: 0, perfects: 0 },
    log: [],
    nextUid: 1,
    nextLogId: 1,
    lives: getDifficulty(setup.difficulty).lives,
  };
  if (setup.online) game.online = true;
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
      gold: 0,
      stash: [],
      pouch: [],
    };
    for (const [slot, itemId] of Object.entries(cls.startingEquipment)) {
      if (itemId) hero.equipment[slot as keyof Hero['equipment']] = newItem(game, getItem(itemId));
    }
    hero.hp = heroMaxHp(hero);
    return hero;
  });
  // 最初の持ち物（シナリオの開始条件）
  const start = getScenario(setup.scenarioId).start;
  // お金は1人ずつ同じだけ。道具・装備は順番に1つずつ配る
  for (const h of game.heroes) h.gold = start.gold ?? 0;
  let k = 0;
  for (const p of start.pouch ?? []) for (let i = 0; i < p.count; i++) game.heroes[k++ % game.heroes.length].pouch.push(newItem(game, getItem(p.itemId)));
  for (const p of start.stash ?? []) for (let i = 0; i < p.count; i++) game.heroes[k++ % game.heroes.length].stash.push(newItem(game, getItem(p.itemId)));
  addLog(game, '冒険が始まった！');
  // 世界マップのあるシナリオは、世界マップから始まる（地図はシードで作る）
  const sc = getScenario(setup.scenarioId);
  if (sc.map) {
    game.world = createWorld(game, createRng((setup.seed ^ 0x5eed5eed) >>> 0));
    if (sc.story?.opening.length) game.world.story = { title: sc.name, lines: sc.story.opening };
    game.mode = 'world';
  }
  return game;
}

// ---------- 小さな道具（common.ts） ----------

export { findHero, livingHeroes } from './heroes';
export { checkBonus, hiddenChestChance, partyGold, partyHasTag, statChance, totalGold } from './common';

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
    const r = cmd.type === 'SCENE' ? runInScene(game, cmd, rng) : runCommand(game, cmd, rng);
    error = r.error;
    battleEvents = r.battleEvents;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  delete game.activeScene;
  if (error) return { state: input, battleEvents: [], error };
  game.rngState = rng.state;
  return { state: game, battleEvents };
}

/**
 * ダンジョンの場面の中の操作: その場面を冒険に載せて、今までと同じ処理で動かす。
 * 世界マップの場面（町・遭遇など）は、その間よけておいて元に戻す
 */
function runInScene(game: GameState, cmd: Extract<GameCommand, { type: 'SCENE' }>, rng: Rng): { error?: string; battleEvents: BattleEvent[] } {
  const exp = findExpedition(game, cmd.scene);
  if (!exp) return { error: 'その場面はもう終わりました', battleEvents: [] };
  if (cmd.command.type === 'SCENE') return { error: '場面の指定が不正です', battleEvents: [] };
  if (isOver(game)) return { error: '冒険は終わりました', battleEvents: [] };
  // ダンジョンのパーティも世界マップの手番の順番で動く（持ち物の整理だけは、いつでもできる。M3-D）
  const anytime = ['EQUIP', 'UNEQUIP', 'GIVE', 'USE_POUCH_ITEM'].includes(cmd.command.type) && exp.mode !== 'battle';
  if (game.world && !anytime && !isExpeditionTurn(game, exp)) return { error: 'ほかのキャラの番です（順番が来たら探索できます）', battleEvents: [] };
  const saved = saveSceneFields(game);
  mount(game, exp);
  game.activeScene = exp.id;
  const r = runCommand(game, cmd.command, rng);
  delete game.activeScene;
  if (r.error) return r;
  const over = isOver(game);
  const ended = over || !game.dungeon || !EXPEDITION_MODES.has(game.mode);
  if (!ended) unmount(game, exp);
  else game.expeditions = (game.expeditions ?? []).filter((x) => x !== exp);
  const endMode = game.mode;
  restoreSceneFields(game, saved);
  if (over) {
    game.mode = endMode;
    return r;
  }
  if (ended) {
    // ダンジョンから出た（撤退・制覇・全滅）: 次のワールドターンから世界マップで動く。この手番は終わり
    rejoinWorld(game, exp.heroes);
    if (game.world && exp.heroes.includes(game.world.turn)) endExpeditionTurn(game, exp.heroes, rng);
    return r;
  }
  // 扉を選べる数を使い切って、部屋の出来事も終わった（通路に戻った）: 次のキャラの番へ。
  // ただし、この通路でまだ「警戒」ができる時は待つ（警戒してから「手番を終える」。警戒すると自動で次へ）
  if (game.world && exp.mode === 'dungeon' && exp.dungeon?.explore === 0 && (exp.dungeon.ended || !canWatchHere(exp.dungeon))) {
    exp.dungeon.explore = null;
    exp.dungeon.exploreDice = undefined;
    exp.dungeon.ended = undefined;
    endExpeditionTurn(game, exp.heroes, rng);
  }
  return r;
}

/** 探索力の判定を2人以上のプレイヤーで決めるか（ダンジョンのパーティに別のプレイヤーのキャラがいる） */
export const exploreShared = (game: GameState) => !!game.world && voters(game).length > 1;

/** 今の手番の目印（探索力の判定をするキャラを決めた手番か確かめる） */
const exploreTurnKey = (game: GameState) => (game.world ? `${game.world.worldTurn}:${game.world.turn}` : '');

/** みんなで決めた、この手番の探索力の判定をするキャラ（決めていなければ undefined） */
export function exploreRollerOf(game: GameState): string | undefined {
  const r = game.dungeon?.exploreRoller;
  return r && r.turn === exploreTurnKey(game) ? r.heroId : undefined;
}

/** 探索力の判定をするキャラをみんなで決めた（EXPLORE_ROLLER の投票が全員一致した時に動く。乱数は使わない） */
function exploreRoller(game: GameState, heroId: string): string | undefined {
  const run = game.dungeon;
  if (!game.world || !game.activeScene || game.mode !== 'dungeon' || !run) return 'ダンジョンの通路でのみ決められます';
  if (run.explore != null) return 'もう探索力を決めました';
  if (!exploreShared(game)) return '1人の時は、そのまま判定できます';
  const h = findHero(game, heroId);
  if (!h || h.hp <= 0 || h.retired || !(game.party ?? []).includes(h.id)) return 'このキャラは判定できません';
  run.exploreRoller = { heroId, turn: exploreTurnKey(game) };
  addLog(game, `探索力の判定は${h.name}がすることになった`);
  return undefined;
}

/** 探索のサイコロ（ダンジョンのパーティの手番の最初。1〜3。出た目 = この手番に選べる扉の数） */
function exploreRoll(game: GameState, cmd: Extract<GameCommand, { type: 'EXPLORE_ROLL' }>, rng: Rng): string | undefined {
  const run = game.dungeon;
  if (!game.world || !game.activeScene || game.mode !== 'dungeon' || !run) return 'ダンジョンの通路でのみ判定できます';
  if (run.explore != null) return 'もう探索力を決めました';
  const h = findHero(game, cmd.heroId);
  if (!h || h.hp <= 0 || !(game.party ?? []).includes(h.id)) return 'このキャラは判定できません';
  if (!ownedBy(h, cmd.playerId)) return '担当していないキャラです';
  // 2人以上: みんなで決めたキャラの担当の人が判定する（オーナーの案）
  if (exploreShared(game)) {
    const chosen = exploreRollerOf(game);
    if (!chosen) return 'だれが判定するか、先にみんなで決めます';
    if (chosen !== h.id) return `判定するのは${findHero(game, chosen)?.name ?? '決めたキャラ'}です`;
  }
  const d = { ...newDice(game, BALANCE.exploreDiceSides, [], rng), heroId: h.id };
  run.exploreDice = d;
  run.explore = d.total;
  addLog(game, `${h.name}の探索のサイコロ: ${d.face}（この手番に選べる扉 ${d.total}つ）`);
  return undefined;
}

/** フォーカス1で探索のサイコロを振り直す（振ったキャラ。まだ扉を選ぶ前に1回だけ。2回目の目で決まる） */
function exploreReroll(game: GameState, cmd: Extract<GameCommand, { type: 'EXPLORE_REROLL' }>, rng: Rng): string | undefined {
  const run = game.dungeon;
  if (!game.world || !game.activeScene || game.mode !== 'dungeon' || !run) return 'ダンジョンの通路でのみ振り直せます';
  const d = run.exploreDice;
  if (run.explore == null || !d) return '先に探索のサイコロを振ってください';
  if (d.rerolled) return '振り直しは1回だけです';
  if (d.heroId && d.heroId !== cmd.heroId) return '振り直すのはサイコロを振ったキャラです';
  if (run.explore !== d.total) return '扉を選んだ後は振り直せません';
  const h = findHero(game, cmd.heroId);
  if (!h || h.hp <= 0) return 'このキャラは振り直せません';
  if (!ownedBy(h, cmd.playerId)) return '担当していないキャラです';
  if (h.focus < 1) return 'フォーカスがありません';
  h.focus -= 1;
  const n = rerollDice(game, d, rng);
  run.exploreDice = n;
  run.explore = n.total;
  addLog(game, `${h.name}がフォーカスで振り直した: ${n.face}（この手番に選べる扉 ${n.total}つ）`);
  return undefined;
}

/** この通路で、まだ「警戒」ができるか */
export const canWatchHere = (run: DungeonRun) => run.watchedAt !== (run.currentRoomId ?? 'entrance');

/** ダンジョンのパーティの手番を終える（探索力が残っていても） */
function exploreEnd(game: GameState): string | undefined {
  const run = game.dungeon;
  if (!game.world || !game.activeScene || game.mode !== 'dungeon' || !run) return 'ダンジョンの通路でのみ終えられます';
  run.explore = 0;
  run.ended = true;
  return undefined;
}

/** ダンジョンの通路を歩くキャラ（手番のキャラ。倒れていたら、パーティの最初の生きているキャラ） */
export function dungeonNavigator(game: GameState): Hero | undefined {
  const ids = game.party ?? game.heroes.map((h) => h.id);
  const party = ids.map((id) => findHero(game, id)).filter((h): h is Hero => !!h && h.hp > 0 && !h.retired);
  const turn = game.world ? party.find((h) => h.id === game.world!.turn) : undefined;
  return turn ?? party[0];
}

/** 通路を歩く・向きを変える（第3段階。歩くのは手番のキャラの担当の人だけ。乱数は使わない） */
function dungeonNav(game: GameState, cmd: Extract<GameCommand, { type: 'DUNGEON_STEP' | 'DUNGEON_TURN' | 'DUNGEON_WALK' }>): string | undefined {
  const run = game.dungeon;
  if (game.mode !== 'dungeon' || !run) return 'ダンジョンの通路でのみ歩けます';
  const nav = dungeonNavigator(game);
  if (!nav || nav.id !== cmd.heroId) return '歩くのは手番のキャラです';
  if (!ownedBy(nav, cmd.playerId)) return '担当していないキャラです';
  const p = posOf(run);
  const limited = !!game.world && !!game.activeScene;
  if (cmd.type === 'DUNGEON_TURN') {
    run.pos = { ...p, facing: turnTo(p.facing, cmd.dir) };
    revealSeen(run);
    return undefined;
  }
  let path: Facing[];
  let face: Facing | undefined;
  if (cmd.type === 'DUNGEON_STEP') {
    const d = turnTo(p.facing, cmd.dir);
    if (!canMove(run, p, d)) return doorNorthOf(run, p) && d === 0 ? '扉です（「扉を開ける」で入ります）' : 'そちらには進めません';
    path = [d];
  } else {
    if (!(run.seen ?? []).includes(cellKey(cmd.x, cmd.y))) return 'まだ見ていない場所です';
    const found = findPath(run, { x: cmd.x, y: cmd.y });
    if (!found) return 'そこへは歩いて行けません';
    path = found;
    face = cmd.face;
  }
  // 歩くのは数えない（扉を選んだ回数だけ数える。オーナーの案）。サイコロの前は歩けない
  if (limited && run.explore == null) return '先に探索のサイコロを振ってください';
  for (const d of path) {
    const cur = posOf(run);
    run.pos = { x: cur.x + DIRS[d][0], y: cur.y + DIRS[d][1], facing: d };
    revealSeen(run);
  }
  if (face !== undefined) {
    run.pos = { ...posOf(run), facing: face };
    revealSeen(run);
  }
  return undefined;
}

/** 周囲の警戒（第3段階C1）: 歩数を使い、感知で判定。成功1で今の通路の開けられる扉の場所と気配、完全成功で次の戦闘に「応援」 */
function dungeonWatch(game: GameState, cmd: Extract<GameCommand, { type: 'DUNGEON_WATCH' }>, rng: Rng): string | undefined {
  const run = game.dungeon;
  if (game.mode !== 'dungeon' || !run) return 'ダンジョンの通路でのみ使えます';
  const nav = dungeonNavigator(game);
  if (!nav || !ownedBy(nav, cmd.playerId)) return '手番のキャラの担当の人が使えます';
  const h = findHero(game, cmd.heroId);
  if (!h || h.hp <= 0 || !(game.party ?? game.heroes.map((x) => x.id)).includes(h.id)) return 'このキャラは判定できません';
  if (!ownedBy(h, cmd.playerId)) return '担当していないキャラです';
  if (run.watchedAt === watchSpot(game)) return 'この通路ではもう警戒しました';
  const slots = BALANCE.dungeonWatchSlots;
  if (!Number.isInteger(cmd.focusUsed) || cmd.focusUsed < 0 || cmd.focusUsed > Math.min(slots, h.focus)) return 'フォーカスの数が不正です';
  // 扉の数は使わない（残りが0でもできる）。サイコロの前はできない
  if (game.world && game.activeScene && run.explore == null) return '先に探索のサイコロを振ってください';
  h.focus -= cmd.focusUsed;
  const results = rollWithFocus(slots, cmd.focusUsed, statChance(h, 'per'), rng);
  run.watchRoll = results;
  run.watchedAt = watchSpot(game);
  const n = successes(results);
  if (n >= 1) {
    // 今の通路の開けられる扉: 場所（扉と扉の前のマス）が地図に出て、気配も分かる
    const seen = new Set(run.seen ?? []);
    const sensed = new Set(run.sensed ?? []);
    for (const r of reachableRooms(run)) {
      const c = dungeonGrid(run).roomCell.get(r.id);
      if (!c) continue;
      seen.add(cellKey(c.x, c.y));
      seen.add(cellKey(c.x, c.y - 1));
      sensed.add(r.id);
    }
    run.seen = [...seen];
    run.sensed = [...sensed];
  }
  if (n >= slots) for (const p of sceneHeroes(game)) p.nextBattleStatuses.inspired = (p.nextBattleStatuses.inspired ?? 0) + BALANCE.dungeonWatchInspired;
  addLog(game, n >= slots ? `${h.name}が周囲を警戒した: 扉の気配が分かり、身構えた（次の戦闘で応援）` : n >= 1 ? `${h.name}が周囲を警戒した: 扉の気配が分かった` : `${h.name}が周囲を警戒した: 何も分からなかった`);
  return undefined;
}

/** みんなで決める操作に1票入れる。全員そろったら、決まった操作をそのまま動かす */
function castVote(game: GameState, cmd: Extract<GameCommand, { type: 'VOTE' }>, rng: Rng): { error?: string; battleEvents: BattleEvent[] } {
  const none = { battleEvents: [] as BattleEvent[] };
  if (!voters(game).includes(cmd.playerId)) return { error: 'この場面のプレイヤーではありません', ...none };
  const ctx = voteCtx(game);
  if (!game.vote || game.vote.ctx !== ctx) game.vote = { ctx, picks: {} };
  if (cmd.command === null) {
    delete game.vote.picks[cmd.playerId];
    return none;
  }
  if (!VOTED_COMMANDS.has(cmd.command.type)) return { error: 'みんなで決める操作ではありません', ...none };
  // 判定するキャラを選ぶ選択肢は、そのキャラの担当として動かす（だれのキャラを選んでもよい）
  const heroId = (cmd.command as { heroId?: string }).heroId;
  const actor = heroId ? findHero(game, heroId)?.playerId : undefined;
  const inner = { ...cmd.command, playerId: actor ?? cmd.playerId } as GameCommand;
  // 通る操作か、先に確かめる（状態は変えない）
  const probe = runCommand(structuredClone(game), inner, createRng(game.rngState), true);
  if (probe.error) return { error: probe.error, ...none };
  game.vote.picks[cmd.playerId] = inner;
  const win = tally(game, game.vote);
  if (!win) return none;
  game.vote = undefined;
  return runCommand(game, win, rng, true);
}

const isOver = (game: GameState) => game.mode === 'gameover' || game.mode === 'ending';

function runCommand(game: GameState, cmd: GameCommand, rng: Rng, voteOk = false): { error?: string; battleEvents: BattleEvent[] } {
  let battleEvents: BattleEvent[] = [];
  let error: string | undefined;
  // みんなで決める操作は、VOTE で全員が選んでから（M3-C）
  if (!voteOk && needsVote(game, cmd)) return { error: 'みんなで決めます（全員が選ぶと決まります）', battleEvents };
  {
    switch (cmd.type) {
      case 'VOTE':
        return castVote(game, cmd, rng);
      case 'ENCOUNTER_JOIN':
        error = encounterJoin(game, cmd);
        break;
      case 'WORLD_UNFOLLOW': {
        const h = findHero(game, cmd.heroId);
        if (game.mode !== 'world' || game.world?.turn !== cmd.heroId || !ownedBy(h, cmd.playerId)) error = '自分の手番に解除してください';
        else detachFollower(game, cmd.heroId);
        break;
      }
      case 'WORLD_INVITE':
        error = worldInvite(game, cmd);
        break;
      case 'WORLD_INVITE_ANSWER':
        error = worldInviteAnswer(game, cmd);
        break;
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
        error = pickCard(game, cmd.playerId, cmd.offerIndex, cmd.heroId);
        break;
      case 'FINISH_REWARD':
        error = finishReward(game, cmd.playerId, rng);
        break;
      case 'CHANGE_JOB': {
        const h = findHero(game, cmd.heroId);
        if (!h || !ownedBy(h, cmd.playerId)) error = '担当していないキャラです';
        else if (h.jobPick?.length) error = '先に転職のカードを選んでください';
        else error = changeJob(game, h, cmd.jobId);
        break;
      }
      case 'ADOPT_PET':
      case 'PET_PAT':
      case 'CARD_TASK':
      case 'PEDDLER_BUY': {
        const h = findHero(game, cmd.heroId);
        if (!h || !ownedBy(h, cmd.playerId)) error = '担当していないキャラです';
        else if (cmd.type === 'ADOPT_PET') error = adoptPet(game, h, cmd.petId, cmd.color, cmd.name);
        else if (cmd.type === 'PET_PAT') error = patPet(game, h);
        else if (cmd.type === 'CARD_TASK') error = doCardTask(game, h, cmd.cardUid, rng);
        else error = peddlerBuy(game, h, cmd.kind, cmd.index);
        break;
      }
      case 'PICK_JOB_CARD': {
        const h = findHero(game, cmd.heroId);
        error = !h || !ownedBy(h, cmd.playerId) ? '担当していないキャラです' : pickJobCard(game, h, cmd.cardId);
        break;
      }
      case 'CLAIM_LOOT':
        error = claimLoot(game, cmd.playerId, cmd.heroId, cmd.choice, rng, cmd.index);
        break;
      case 'CHEST_OPENER':
        error = chestOpener(game, cmd.heroId);
        break;
      case 'OPEN_CHEST':
        error = openChest(game, cmd.playerId, cmd.heroId, cmd.focusUsed, rng, cmd.recipientId);
        break;
      case 'LEAVE_CHEST':
        error = leaveChest(game, cmd.playerId, rng);
        break;
      case 'CHOOSE_EVENT':
        error = chooseEvent(game, cmd.playerId, cmd.optionIndex, cmd.heroId, cmd.focusUsed, rng);
        break;
      case 'FINISH_EVENT':
        error = finishEvent(game, cmd.playerId, rng);
        break;
      case 'REST':
        error = rest(game, cmd.playerId, cmd.kind);
        break;
      case 'RETREAT':
        error = retreat(game, cmd.playerId, rng);
        break;
      case 'RETURN_TO_HUB':
        error = returnToHub(game, cmd.playerId, rng);
        break;
      case 'EQUIP':
        error = equip(game, cmd.playerId, cmd.heroId, cmd.itemUid);
        break;
      case 'UNEQUIP':
        error = unequip(game, cmd.playerId, cmd.heroId, cmd.slot);
        break;
      case 'GIVE':
        error = give(game, cmd);
        break;
      case 'EXPLORE_ROLL':
        error = exploreRoll(game, cmd, rng);
        break;
      case 'EXPLORE_REROLL':
        error = exploreReroll(game, cmd, rng);
        break;
      case 'EXPLORE_ROLLER':
        error = exploreRoller(game, cmd.heroId);
        break;
      case 'EXPLORE_END':
        error = exploreEnd(game);
        break;
      case 'DUNGEON_STEP':
      case 'DUNGEON_TURN':
      case 'DUNGEON_WALK':
        error = dungeonNav(game, cmd);
        break;
      case 'DUNGEON_WATCH':
        error = dungeonWatch(game, cmd, rng);
        break;
      case 'WORLD_ROLL_MOVE':
        error = rollMove(game, cmd, rng);
        break;
      case 'WORLD_REROLL_MOVE':
        error = rerollMove(game, cmd, rng);
        break;
      case 'WORLD_MOVE_AGREE':
        error = agreeMove(game, cmd, rng);
        break;
      case 'WORLD_MOVE':
        error = moveHero(game, cmd, rng);
        break;
      case 'WORLD_WAIT':
        error = waitTurn(game, cmd, rng);
        break;
      case 'WORLD_REVIVE':
        error = reviveAlly(game, cmd, rng);
        break;
      case 'WORLD_CAMP':
        error = camp(game, cmd, rng);
        break;
      case 'WORLD_INTERACT':
        error = interact(game, cmd, rng);
        break;
      case 'ENCOUNTER_CHOOSE':
        error = encounterChoose(game, cmd, rng);
        break;
      case 'ENCOUNTER_CONTINUE':
        error = encounterContinue(game, cmd, rng);
        break;
      case 'STORY_CONTINUE':
        error = storyContinue(game);
        break;
      case 'TOWN_BUY':
        error = townBuy(game, cmd, rng);
        break;
      case 'TOWN_INN':
        error = townInn(game, cmd);
        break;
      case 'BRING_MY_PET':
        error = bringMyPet(game, cmd);
        break;
      case 'TOWN_REMOVE_CARD':
        error = townRemoveCard(game, cmd);
        break;
      case 'TOWN_SELL':
        error = townSell(game, cmd);
        break;
      case 'QUEST_ACCEPT':
        error = questAccept(game, cmd);
        break;
      case 'QUEST_REPORT':
        error = questReport(game, cmd, rng);
        break;
      case 'LEAVE_TOWN':
        error = leaveTown(game, cmd, rng);
        break;
      case 'SHRINE_CHOOSE':
        error = shrineChoose(game, cmd, rng);
        break;
      case 'LEAVE_SANCTUARY':
        error = leaveSanctuary(game, cmd, rng);
        break;
      case 'LEAVE_SHRINE':
        error = leaveShrine(game, cmd, rng);
        break;
      default:
        error = '不明なコマンドです';
    }
  }
  return { error, battleEvents };
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
  const levelBonus = getDifficulty(game.difficulty).enemyLevel;
  const eventIds = EVENTS.forScenario(game.scenarioId)
    .filter((e) => e.where !== 'map' && e.where !== 'spawn')
    .map((e) => e.id);
  // ランダムダンジョンは拠点ごとの種で作る（同じ種なら同じ構造）
  const random = !!DUNGEONS.get(dungeonId).random;
  const dRng = random ? createRng(game.randomDungeonSeed) : rng;
  game.dungeon = buildDungeon(dungeonId, dRng, levelBonus + (random ? game.clearedDungeons.length : 0), eventIds);
  game.mode = 'dungeon';
  addLog(game, `${game.dungeon.name}に入った`);
  return undefined;
}

/** 世界マップのダンジョンの入口から入る（そのマスにいて参加するキャラだけ。spec §9.1） */
export function enterDungeonFromWorld(game: GameState, dungeonId: string, party: string[], rng: Rng) {
  const levelBonus = getDifficulty(game.difficulty).enemyLevel + (game.world ? corruptionLevelBonus(game, game.world) : 0);
  const eventIds = EVENTS.forScenario(game.scenarioId)
    .filter((e) => e.where !== 'map' && e.where !== 'spawn')
    .map((e) => e.id);
  const random = !!DUNGEONS.get(dungeonId).random;
  const dRng = random ? createRng(game.randomDungeonSeed) : rng;
  if (random) game.randomDungeonSeed = (Math.imul(game.randomDungeonSeed, 1103515245) + 12345) >>> 0;
  game.dungeon = buildDungeon(dungeonId, dRng, levelBonus + (random ? game.clearedDungeons.length : 0), eventIds);
  game.party = party;
  game.mode = 'dungeon';
  addLog(game, `${game.dungeon.name}に入った`);
}

function enterRoom(game: GameState, playerId: string, roomId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const run = game.dungeon;
  if (game.mode !== 'dungeon' || !run) return 'ダンジョンにいません';
  const room = findRoom(run, roomId);
  if (!room || !reachableRooms(run).some((r) => r.id === roomId)) return 'その部屋には進めません';
  // 扉を選ぶだけ（オーナーの案）: 扉の前まで自動で歩き、扉の方を向いて開ける。どれだけ歩いても、扉1つで1
  const front = doorFront(run, room.id);
  const path = front ? findPath(run, front) : undefined;
  if (!front || !path) return 'その扉までは歩いて行けません';
  if (game.world && game.activeScene) {
    if (run.explore == null) return '先に探索のサイコロを振ってください';
    if (run.explore <= 0) return 'この手番に選べる扉は、もうありません';
    run.explore -= 1;
  }
  for (const d of path) {
    const cur = posOf(run);
    run.pos = { x: cur.x + DIRS[d][0], y: cur.y + DIRS[d][1], facing: d };
    revealSeen(run);
  }
  run.pos = { ...posOf(run), facing: 0 };
  revealSeen(run);
  run.currentRoomId = room.id;
  moveIntoRoom(run, room.id);
  roomBehavior(roomTypeOf(room).behavior).enter(game, room, rng);
  return undefined;
}

/** 戦闘の部屋の戦闘を始める（部屋の動き battle から呼ばれる） */
export function startRoomBattle(game: GameState, room: Room, rng: Rng) {
  game.battleInfo = { roomType: room.type };
  startBattleWith(game, room.enemies ?? [], room.type, rng, { background: game.dungeon?.background });
}

/** 参加人数ごとの敵の攻撃倍率（4人は、シナリオごとの合わせ値があればそれを使う） */
function partyAttackMul(game: GameState, n: number): number {
  if (n === 4) return getScenario(game.scenarioId).fourPlayerAttack ?? BALANCE.enemyAttackByPartySize[4] ?? 1;
  return BALANCE.enemyAttackByPartySize[n] ?? 1;
}

/** 戦闘を始める（今の場面の参加者で）。surprise = 奇襲成功（敵は1ターン目に動けない） */
export function startBattleWith(game: GameState, enemies: EncounterSpec['enemies'], roomType: string, rng: Rng, opts: { surprise?: boolean; background?: string } = {}) {
  const party = sceneHeroes(game).map(toPartyMember);
  const diff = getDifficulty(game.difficulty);
  game.battle = createBattle({
    seed: rng.int(1_000_000_000),
    party,
    encounter: { id: game.battleInfo?.wandererId ?? game.dungeon?.currentRoomId ?? 'battle', name: getRoomType(roomType).name, enemies },
    enemyHpMul: diff.enemyHp,
    enemyAttackMul: (diff.enemyAttack ?? 1) * partyAttackMul(game, party.length),
    surprise: opts.surprise,
    readyCheck: game.online,
  });
  game.battleBackground = opts.background ?? worldBackground(game);
  for (const h of sceneHeroes(game)) h.nextBattleStatuses = {};
  game.mode = 'battle';
}

/** イベントから始まる戦闘（敵の指定が無ければ、今いる地域の敵の組） */
function startEventBattle(game: GameState, spec: EventBattle, tile: number, rng: Rng) {
  const w = game.world!;
  const region = w.tiles[tile].r;
  const level = wandererLevel(game, w, region);
  const reg = getScenario(game.scenarioId).map!.regions[region];
  const enemies = spec.enemies?.length
    ? spec.enemies.map((e) => ({ defId: e.defId, level: e.level ?? level }))
    : reg.encounters[rng.int(reg.encounters.length)].map((defId) => ({ defId, level }));
  game.party ??= heroesAt(game, tile).map((h) => h.id);
  game.battleInfo = { roomType: 'battle', tile, goldMul: spec.goldMul, onWin: spec.onWin, random: true };
  w.prevTile ??= tile;
  startBattleWith(game, enemies, 'battle', rng, { surprise: spec.surprise });
  if (spec.surprise) addLog(game, '先制！ 敵は最初のターンに動けない');
}

/** 世界マップで戦った時の背景（そのマスの地形） */
function worldBackground(game: GameState): string | undefined {
  const w = game.world;
  const tile = game.battleInfo?.tile;
  return w && tile !== undefined ? TERRAINS.get(w.tiles[tile].t).background : undefined;
}

/** 戦闘の結果をキャラに戻す（戦闘不能のキャラは勝てばHP1で復帰） */
function syncHeroesFromBattle(game: GameState, revive: boolean) {
  const b = game.battle!;
  for (const a of b.allies) {
    const h = findHero(game, a.id);
    if (!h) continue;
    // 戦闘の記録（転職の条件）
    for (const [k, n] of Object.entries(a.feats ?? {})) addFeat(h, k, n);
    // お供の活躍の回数
    addPetActs(h, a.counters?.petActs ?? 0);
    h.hp = a.dead ? (revive ? 1 : 0) : a.hp;
    h.focus = a.focus;
  }
}

function finishBattle(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const b = game.battle;
  const run = game.dungeon;
  if (game.mode !== 'battle' || !b || (!run && !game.world)) return '戦闘中ではありません';
  // ダンジョンの部屋の戦闘 / 世界マップの遭遇の戦闘（部屋が無い）
  const room = run ? findRoom(run, run.currentRoomId ?? '') : undefined;
  if (b.phase === 'defeat') {
    syncHeroesFromBattle(game, false);
    const participants = b.allies.map((a) => a.id);
    game.battle = undefined;
    // 命の灯火（spec §11.4）。世界マップが無い時は今までどおりゲームオーバー
    if (game.world) handleDefeat(game, participants, rng);
    else {
      game.mode = 'gameover';
      addLog(game, 'パーティは全滅した…');
    }
    return undefined;
  }
  if (b.phase === 'escaped') {
    syncHeroesFromBattle(game, true);
    game.battle = undefined;
    if (room) {
      room.cleared = true;
      game.mode = 'dungeon';
    } else {
      // 世界マップ: 前のマスへ下がる
      const w = game.world!;
      for (const a of b.allies) if (!a.dead && w.prevTile !== undefined) w.pos[a.id] = w.prevTile;
      backToWorld(game, rng, true);
    }
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
  const rt = getRoomType(room?.type ?? game.battleInfo?.roomType ?? 'battle');
  if (!room) onWandererDefeated(game, rng);
  const rewardMul = getDifficulty(game.difficulty).reward ?? 1;
  for (const e of b.enemies) {
    // 逃げた敵（黄金のコソ泥など）は倒していないので報酬なし
    // 戦闘中に呼ばれた増援も報酬なし（呼び続けさせて稼ぐことができないように）
    if (e.fled || e.summoned) continue;
    const def = getEnemy(e.defId);
    const k = (1 + BALANCE.rewardPerLevel * (e.level - def.baseLevel)) * rewardMul;
    exp += Math.max(1, Math.round(def.exp * k));
    gold += Math.max(0, Math.round(def.gold * k * (0.85 + rng.next() * 0.3)));
  }
  // 待ち伏せを迎え撃った時などのお金の倍率・戦闘中に手に入れたお金
  gold = Math.round(gold * (game.battleInfo?.goldMul ?? 1)) + (b.bonusGold ?? 0);
  // お金は生き残った参加者で山分け
  const survivorHeroes = survivors.map((id) => findHero(game, id)!).filter(Boolean);
  splitGold(survivorHeroes, gold);
  // お供: 一緒に勝つと懐く
  for (const h of survivorHeroes) addPetLove(game, h, BALANCE.petLoveBattle);
  // 勝った時に起きること（護衛を倒してお供を保護するなど）
  const onWin = game.battleInfo?.onWin;
  if (onWin?.length) applyOutcomes(game, onWin, survivorHeroes[0], rng);

  const cardOdds = cardRewardOdds(rt.battle?.cardOdds ?? 'battle');
  const reward: RewardState = { gold, exp: [], levelUps: [], cardOffers: survivors.flatMap((id) => rollCardOffers(game, [id], rng, cardOdds)), cardOdds, cardDone: [], cardPicked: false, loot: [] };
  for (const id of survivors) {
    const h = findHero(game, id)!;
    const fromLevel = h.level;
    const fromExp = h.exp;
    h.exp += exp;
    while (h.level < BALANCE.maxLevel && h.exp >= expToNext(h.level, h.classId)) {
      h.exp -= expToNext(h.level, h.classId);
      h.level += 1;
      h.hp = Math.min(heroMaxHp(h), h.hp + getClass(h.classId).hpPerLevel);
      reward.levelUps.push({ heroId: h.id, level: h.level, options: growthOptions(h, rng) });
      addLog(game, `${h.name}はレベル${h.level}に上がった！`);
      announceJobs(game, h);
    }
    if (h.level >= BALANCE.maxLevel) h.exp = 0;
    reward.exp.push({ heroId: h.id, gained: exp, fromLevel, toLevel: h.level, fromExp, toExp: h.exp });
  }

  // ドロップ（部屋の種類の設定どおり）。ボスの大宝箱は報酬の後に開ける
  const drop = rt.battle;
  if (drop?.equipmentDrop) {
    const item = newItem(game, rollEquipment(rng.next() * 100 < drop.equipmentDrop.epicChance ? 'epic' : 'rare', game.heroes, rng, { scenario: game.scenarioId }));
    const to = leastLoaded(survivorHeroes);
    // 2人以上のプレイヤーが生き残ったら、みんなで取り合う（欲しい / 余れば / いらない → 運の判定）
    if (new Set(survivorHeroes.map((h) => h.playerId)).size > 1) reward.claim = { item, heroes: survivorHeroes.map((h) => h.id), choices: {} };
    else if (to) {
      reward.loot.push({ kind: 'item', item, to: to.id });
      addItem(game, to, item, true);
    }
  } else if (drop?.consumableDrop && rng.next() * 100 < drop.consumableDrop.chance) {
    const item = newItem(game, rollConsumable('common', rng));
    const to = leastLoaded(survivorHeroes);
    if (to) {
      reward.loot.push({ kind: 'item', item, to: to.id });
      addItem(game, to, item, true);
    }
  }
  if (!drop?.boss && rng.next() * 100 < hiddenChestChance(game)) {
    reward.hiddenChest = { rarity: RARITIES[rng.next() < 0.3 ? 1 : 0], locked: rng.next() < 0.5 };
  }
  if (room) room.cleared = true;
  game.reward = reward;
  game.battle = undefined;
  game.mode = 'reward';
  return undefined;
}

// ---------- 成長と報酬 ----------

export { growthOptions } from './growth';

function chooseGrowth(game: GameState, playerId: string, optionIndex: number, cardUid?: string): string | undefined {
  const r = game.reward;
  if (game.mode !== 'reward' || !r || !r.levelUps.length) return '選べる成長はありません';
  const lu = r.levelUps[0];
  const h = findHero(game, lu.heroId)!;
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const opt = lu.options[optionIndex];
  if (!opt) return '選択肢がありません';
  const err = growthHandler(opt.kind).apply(game, h, opt, cardUid);
  if (err) return err;
  clampHero(h);
  r.levelUps.shift();
  // 転職したら、同じキャラの残りのレベルアップから転職の候補を外す
  return undefined;
}

/** 戦利品の取り合い: キャラごとに「欲しい / 余れば / いらない」。全員そろったら運の判定で決める */
function claimLoot(game: GameState, playerId: string, heroId: string, choice: 'need' | 'greed' | 'pass', rng: Rng, index?: number): string | undefined {
  // 宝箱の取り合い（ステップ2）は宝箱の画面で、戦闘の装備は報酬の画面で
  const inChest = game.mode === 'chest';
  const c = inChest ? game.chest?.claims?.[index ?? 0] : game.reward?.claim;
  if ((game.mode !== 'reward' && !inChest) || !c || c.rolls) return '取り合う戦利品はありません';
  if (!c.heroes.includes(heroId)) return 'このキャラは選べません';
  const h = findHero(game, heroId)!;
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  c.choices[heroId] = choice;
  if (!c.heroes.every((id) => c.choices[id])) return undefined;
  const want = c.heroes.filter((id) => c.choices[id] === 'need');
  const cands = want.length ? want : c.heroes.filter((id) => c.choices[id] === 'greed');
  c.rolls = cands.map((id) => ({ heroId: id, roll: 1 + rng.int(100) + Math.floor(heroStats(findHero(game, id)!).luk / 2) }));
  const best = [...c.rolls].sort((a, b) => b.roll - a.roll)[0];
  // 全員いらない時は、持ち物の少ない人へ
  const to = best ? findHero(game, best.heroId)! : leastLoaded(c.heroes.map((id) => findHero(game, id)!));
  if (to) {
    c.winner = to.id;
    addItem(game, to, c.item, true);
    if (inChest) {
      const l = game.chest!.contents?.find((x) => x.kind === 'item' && x.item.uid === c.item.uid);
      if (l && l.kind === 'item') l.to = to.id;
    } else game.reward!.loot.push({ kind: 'item', item: c.item, to: to.id });
    addLog(game, `${to.name}が戦利品を手に入れた${best ? `（運の判定 ${best.roll}）` : ''}`);
  }
  return undefined;
}

/** カード報酬があるキャラ（一覧の順） */
export const cardOfferHeroes = (r: RewardState): string[] => [...new Set(r.cardOffers.map((o) => o.heroId))];

/** カード報酬: 生き残ったキャラごとに、担当の人が1枚選ぶ（みんな同時に選べる。M3-C4） */
function pickCard(game: GameState, playerId: string, offerIndex: number | null, heroId?: string): string | undefined {
  const r = game.reward;
  if (game.mode !== 'reward' || !r || r.cardPicked) return 'カードは選べません';
  const done = (r.cardDone ??= []);
  if (offerIndex !== null) {
    const o = r.cardOffers[offerIndex];
    if (!o) return '選択肢がありません';
    if (done.includes(o.heroId)) return 'このキャラはもうカードを選びました';
    const h = findHero(game, o.heroId)!;
    if (!ownedBy(h, playerId)) return '担当していないキャラのカードです';
    h.deck.push({ uid: `c${game.nextUid++}`, cardId: o.cardId });
    addLog(game, `${h.name}の山札に「${CARDS.get(o.cardId).name}」が加わった`);
    done.push(o.heroId);
  } else {
    const pending = cardOfferHeroes(r).filter((id) => !done.includes(id) && (!heroId || id === heroId));
    const mine = pending.filter((id) => ownedBy(findHero(game, id)!, playerId));
    if (!mine.length) return heroId && pending.length ? '担当していないキャラのカードです' : 'カードは選べません';
    done.push(...mine);
  }
  r.cardPicked = cardOfferHeroes(r).every((id) => done.includes(id));
  return undefined;
}

function finishReward(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const r = game.reward;
  const run = game.dungeon;
  if (game.mode !== 'reward' || !r || (!run && !game.world)) return '報酬画面ではありません';
  if (r.levelUps.length) return '成長ボーナスを選んでください';
  if (!r.cardPicked && r.cardOffers.length) return 'カードを選んでいない人がいます';
  if (r.claim && !r.claim.rolls) return '戦利品の取り合いが終わっていません';
  game.reward = undefined;
  // 世界マップの遭遇の戦闘: 隠し宝箱があれば開け、無ければ世界マップへ（遭遇したキャラの手番は終わる）
  if (!run) {
    const tile = game.battleInfo?.tile;
    if (r.hiddenChest && tile !== undefined) {
      game.chest = { tile, spec: r.hiddenChest, unlocked: !r.hiddenChest.locked, hidden: true };
      addLog(game, '隠し宝箱を見つけた！');
      game.mode = 'chest';
    } else backToWorld(game, rng, true);
    return undefined;
  }
  const room = findRoom(run, run.currentRoomId ?? '')!;
  if (isBossRoom(room)) {
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
const GRADE_NAME = RARITY_NAME;

/**
 * 世界マップのマスの場面（宝箱・イベント）は、手番のキャラの担当の人だけが操作する（M3-C）。
 * ダンジョンの中の場面は undefined（みんなで決める）
 */
function worldTurnError(game: GameState, playerId: string, onTile: boolean): string | undefined {
  if (!onTile || game.activeScene || !game.world) return undefined;
  const turnHero = findHero(game, game.world.turn);
  if (ownedBy(turnHero, playerId)) return undefined;
  // だれの番かが分かる文に（2026-11-10 の実機で「だれが押すのか分からない」と言われたため）
  return turnHero ? `${turnHero.playerId} ${turnHero.name}の手番です（担当の人が操作します）` : '手番のキャラの担当の人が操作します';
}

/** 宝箱を2人以上のプレイヤーで開けるか（開け役をみんなで決め、中身を取り合う。ステップ2） */
export const chestShared = (game: GameState) => voters(game).length > 1;

/** 宝箱の開け役をみんなで決めた（CHEST_OPENER の投票が全員一致した時に動く） */
function chestOpener(game: GameState, heroId: string): string | undefined {
  const c = game.chest;
  if (game.mode !== 'chest' || !c) return '宝箱がありません';
  if (c.contents) return 'もう開けました';
  if (!chestShared(game)) return '1人の時は、そのまま開けられます';
  const h = sceneHeroes(game).find((x) => x.id === heroId && !x.retired);
  if (!h) return 'そのキャラは開けられません';
  if (c.opener === heroId) return undefined;
  c.opener = heroId;
  addLog(game, `宝箱は${h.name}が開けることになった`);
  return undefined;
}

function openChest(game: GameState, playerId: string, heroId: string, focusUsed: number, rng: Rng, recipientId?: string): string | undefined {
  const c = game.chest;
  if (game.mode !== 'chest' || !c) return '宝箱がありません';
  const shared = chestShared(game);
  // 2人以上: みんなで決めた開け役の担当の人が開ける。1人: 今までどおり（世界マップは手番の人）
  const te = shared ? undefined : worldTurnError(game, playerId, c.tile !== undefined);
  if (te) return te;
  if (c.contents) return 'もう開けました';
  if (shared && !c.opener) return 'だれが開けるか、先にみんなで決めます';
  if (shared && c.opener !== heroId) return `開けるのは${findHero(game, c.opener!)?.name ?? '決めたキャラ'}です`;
  const h = findHero(game, heroId);
  if (!h || h.hp <= 0 || !sceneHeroes(game).some(x => x.id === h.id)) return 'そのキャラは動けません';
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const slots = c.unlocked ? BALANCE.chestLuckSlots : BALANCE.lockSlots;
  if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(slots, h.focus)) return 'フォーカスの数が不正です';
  h.focus -= focusUsed;
  if (!c.unlocked) {
    const results = rollWithFocus(slots, focusUsed, statChance(h, 'dex', 'lock'), rng);
    const ok = successes(results) >= BALANCE.lockNeed;
    recordCheck(h, 'dex', results, BALANCE.lockNeed, 'mechanism');
    if (ok) {
      c.unlocked = true;
      c.lastRoll = { kind: 'lock', heroId, results, success: true };
    } else {
      for (const x of livingHeroes(game)) x.hp = Math.max(1, x.hp - LOCK_TRAP_DAMAGE);
      c.lastRoll = { kind: 'lock', heroId, results, success: false, trap: `罠が作動した！ 全員に${LOCK_TRAP_DAMAGE}ダメージ` };
    }
    return undefined;
  }
  const recipient = recipientId && !shared ? sceneHeroes(game).find(x => x.id === recipientId && x.hp > 0 && !x.retired) : h;
  if (!recipient) return '報酬を受け取る仲間がいません';
  // 運のスロット → 成功数で確率が上の格へずれる → 格を1回だけ抽選（spec §10.3）
  const results = rollWithFocus(slots, focusUsed, statChance(h, 'luk', 'luck'), rng);
  const n = successes(results);
  recordCheck(h, 'luk', results, 1);
  const oddsBefore = chestOdds(c.spec.rarity, 0);
  const odds = chestOdds(c.spec.rarity, n);
  const grade = rollGrade(odds, rng);
  const omen = grade === 'legend' && rng.next() * 100 < BALANCE.chestOmenChance;
  c.grade = grade;
  c.lastRoll = { kind: 'luck', heroId, results, success: n === slots, oddsBefore, odds, grade, gradeChance: odds[rarityIndex(grade)], omen };
  c.contents = rollChestContents(game, grade, !!c.spec.big, rng);
  // 品物は指定した受取人へ。判定と実績は開けたキャラのまま。お金は、ふつうの宝箱も大宝箱も、場面のキャラで山分け（2026-11-10 オーナーの決定）。
  if (recipientId && !shared) for (const loot of c.contents) if (loot.kind === 'card') loot.heroId = recipient.id;
  if (shared) {
    // 2人以上: 品物（装備・消耗品）は1つずつ「欲しい／余れば／いらない」で取り合う。カードは今までどおり
    const ids = sceneHeroes(game).filter((x) => !x.retired).map((x) => x.id);
    c.claims = c.contents.flatMap((l) => (l.kind === 'item' ? [{ item: l.item, heroes: ids, choices: {} }] : []));
    addLoot(game, c.contents.filter((l) => l.kind === 'card'), [recipient]);
  } else addLoot(game, c.contents.filter((l) => l.kind !== 'gold'), [recipient]);
  addLoot(game, c.contents.filter((l) => l.kind === 'gold'), sceneHeroes(game));
  game.stats.chestsOpened += 1;
  addLog(game, `宝箱の中身は${GRADE_NAME[grade]}だった（確率${odds[rarityIndex(grade)].toFixed(1)}%）`);
  return undefined;
}

function leaveChest(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const c = game.chest;
  const run = game.dungeon;
  if (game.mode !== 'chest' || !c) return '宝箱がありません';
  if (c.claims?.some((x) => !x.rolls)) return '宝箱の中身の取り合いが終わっていません';
  const te = worldTurnError(game, playerId, c.tile !== undefined);
  if (te) return te;
  // 世界マップの宝箱（マスの宝箱は使い終わり。隠し宝箱はそのまま）
  if (c.tile !== undefined && !run) {
    const f = game.world?.tiles[c.tile].f;
    if (f && !c.hidden && c.contents) f.used = true;
    game.chest = undefined;
    backToWorld(game, rng, !!c.hidden);
    return undefined;
  }
  if (!run || !c.roomId) return '宝箱がありません';
  const room = findRoom(run, c.roomId)!;
  room.cleared = true;
  game.chest = undefined;
  if (isBossRoom(room) && c.spec.big) {
    game.mode = 'cleared';
    game.stats.dungeonsCleared += 1;
    // 一緒にダンジョンをクリアしたお供（伝承の書のマイペットの登録の条件。K5）
    for (const h of sceneHeroes(game)) if (h.pet) h.pet.dungeonClears = (h.pet.dungeonClears ?? 0) + 1;
    if (!game.clearedDungeons.includes(run.dungeonId)) game.clearedDungeons.push(run.dungeonId);
    addLog(game, `${run.name}を制覇した！`);
    if (game.world) onDungeonCleared(game, run.dungeonId, rng);
  } else game.mode = 'dungeon';
  return undefined;
}

/** 制覇の物語の最後に足す一行: 鍵があと何個か / そろったら最終ダンジョンへ（シナリオのデータから作る。順番は決めつけない） */
export function nextGoalLines(game: GameState): string[] {
  const w = game.world!;
  const total = Object.keys(getScenario(game.scenarioId).story?.keys ?? {}).length;
  if (!total) return [];
  const left = total - w.keys.length;
  if (left > 0) {
    // 鍵はそろったのに、町の依頼が足りなくて開かない扉がある時は、それも伝える
    const gated = questGatedNext(game);
    return gated ? [`鍵はあと${left}つ。`, `「${gated.name}」は、町の依頼を果たしてから。`] : [`鍵はあと${left}つ。`];
  }
  const finale = DUNGEONS.forScenario(game.scenarioId).find((d) => d.finale);
  return finale ? [`鍵がそろった。${finale.name}へ向かおう。`] : [];
}

/** 世界マップのダンジョンを制覇した時（封印の鍵・侵食度・依頼・最終ダンジョンならエンディング） */
function onDungeonCleared(game: GameState, dungeonId: string, rng: Rng) {
  const w = game.world!;
  const def = DUNGEONS.get(dungeonId);
  if (def.rewardKey && !w.keys.includes(def.rewardKey)) {
    w.keys.push(def.rewardKey);
    addLog(game, `${getScenario(game.scenarioId).story?.keys?.[def.rewardKey] ?? def.rewardKey}を手に入れた！`);
  }
  const drop = def.corruptionOnClear ?? (def.rewardKey ? BALANCE.corruptionOnKeyDungeonClear : 0);
  if (drop > 0) {
    w.corruption = Math.max(0, w.corruption - drop);
    addLog(game, `${corruptionName(game.scenarioId)}が${drop}%下がった`);
  }
  questSignal(game, { kind: 'clearDungeon', dungeonId });
  if (def.clearStory?.length && !def.finale) w.story = { title: def.name, lines: [...def.clearStory, ...nextGoalLines(game)] };
  if (def.finale) {
    const story = getScenario(game.scenarioId).story;
    w.story = { title: 'エンディング', lines: story?.ending ?? ['魔王は封じられた。'] };
    game.mode = 'ending';
  }
  void rng;
}

// ---------- イベント・休憩 ----------

/** その選択肢を今選べるか（必要な能力・ゴールド）。payer = 払うキャラ（省略すると、場面のだれかが払えればよい） */
export function eventOptionState(game: GameState, eventId: string, index: number, payer?: Hero): { visible: boolean; reason?: string } {
  const opt = EVENTS.get(eventId).options[index];
  if (!opt) return { visible: false };
  if (opt.requiresTag && !partyHasTag(game, opt.requiresTag)) return { visible: false };
  if (opt.requiresPet && !sceneHeroes(game).some((h) => h.hp > 0 && h.pet)) return { visible: false };
  if (opt.cost && !(payer ? [payer] : sceneHeroes(game)).some((h) => h.gold >= opt.cost!)) return { visible: true, reason: `ゴールドが足りません（${opt.cost}G）` };
  if (opt.costFocus && !(payer ? [payer] : sceneHeroes(game)).some((h) => h.focus >= opt.costFocus!)) return { visible: true, reason: `フォーカスが足りません（${opt.costFocus}）` };
  if (opt.costItem && !(payer ? [payer] : sceneHeroes(game)).some((h) => h.pouch.some((i) => i.itemId === opt.costItem))) return { visible: true, reason: `${getItem(opt.costItem).name}を持っていません` };
  return { visible: true };
}

/** 冒険の効果を順に使い、手に入れたものを選んだキャラ（いなければ場面の先頭のキャラ）の持ち物に入れる（効果の中身は outcomes/kinds/） */
function applyOutcomes(game: GameState, outs: EventOutcome[], actor: Hero | undefined, rng: Rng): Loot[] {
  const ctx = makeOutcomeCtx(game, rng, actor);
  for (const o of outs) applyOutcome(ctx, o);
  addLoot(game, ctx.loot, actor ? [actor] : sceneHeroes(game).slice(0, 1));
  return ctx.loot;
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
  const te = worldTurnError(game, playerId, ev.tile !== undefined);
  if (te) return te;
  const def = EVENTS.get(ev.eventId);
  const opt = def.options[optionIndex];
  // お金がいる選択肢: 選んだキャラ（判定が無ければ、押した人のキャラで払える人）が払う
  const chosen = heroId ? findHero(game, heroId) : !game.activeScene && ev.tile !== undefined && game.world ? findHero(game, game.world.turn) : undefined;
  const payer = opt?.cost ? (chosen ?? sceneHeroes(game).find((h) => ownedBy(h, playerId) && h.gold >= opt.cost!)) : undefined;
  if (opt?.cost && (!payer || !ownedBy(payer, playerId))) return `ゴールドが足りません（${opt.cost}G）`;
  // フォーカス・道具も、選んだ本人がいれば本人で判定する（「選べる」と出たのに払えず断られるのを防ぐ）
  const st = eventOptionState(game, ev.eventId, optionIndex, payer ?? chosen);
  if (!opt || !st.visible) return '選択肢がありません';
  if (st.reason) return st.reason;
  let actor: Hero | undefined = payer ?? chosen;
  let results: SlotResult[] | undefined;
  let ok = true;
  if (opt.check) {
    actor = heroId ? findHero(game, heroId) : undefined;
    if (!actor || actor.hp <= 0) return '判定するキャラを選んでください';
    if (!ownedBy(actor, playerId)) return '担当していないキャラです';
    if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(opt.check.slots, actor.focus)) return 'フォーカスの数が不正です';
    actor.focus -= focusUsed;
    results = rollWithFocus(opt.check.slots, focusUsed, statChance(actor, opt.check.stat, opt.check.tag, true), rng);
    ok = successes(results) >= opt.check.need;
  } else if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  // フォーカス・道具を払う選択肢（押した人のキャラで払える人）
  if (opt.costFocus || opt.costItem) {
    const mine = sceneHeroes(game).filter((h) => ownedBy(h, playerId));
    const by = (chosen && mine.includes(chosen) ? [chosen] : mine).find(
      (h) => (!opt.costFocus || h.focus >= opt.costFocus) && (!opt.costItem || h.pouch.some((i) => i.itemId === opt.costItem)),
    );
    if (!by) return opt.costFocus ? `フォーカスが足りません（${opt.costFocus}）` : `${getItem(opt.costItem!).name}を持っていません`;
    if (opt.costFocus) by.focus -= opt.costFocus;
    if (opt.costItem) by.pouch.splice(by.pouch.findIndex((i) => i.itemId === opt.costItem), 1);
    actor ??= by;
  }
  if (opt.check && actor && results) recordCheck(actor, opt.check.stat, results, opt.check.need, opt.check.purpose);
  const outs = ok ? opt.success : (opt.fail ?? []);
  const loot = applyOutcomes(game, outs, actor, rng);
  ev.result = { optionIndex, heroId: actor?.id, results, success: ok, text: ok ? opt.successText : (opt.failText ?? ''), loot };
  return undefined;
}

function finishEvent(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  const ev = game.event;
  if (game.mode !== 'event' || !ev || !ev.result) return 'まだ選んでいません';
  const te = worldTurnError(game, playerId, ev.tile !== undefined);
  if (te) return te;
  game.event = undefined;
  if (ev.tile !== undefined && !game.dungeon) {
    const f = game.world?.tiles[ev.tile].f;
    if (f) f.used = true;
    // イベントから始まる戦闘（待ち伏せ・黄金のコソ泥など）
    if (ev.battle) {
      startEventBattle(game, ev.battle, ev.tile, rng);
      return undefined;
    }
    backToWorld(game, rng, false);
    return undefined;
  }
  if (!game.dungeon || !ev.roomId) return 'まだ選んでいません';
  findRoom(game.dungeon, ev.roomId)!.cleared = true;
  game.mode = 'dungeon';
  return undefined;
}

function rest(game: GameState, playerId: string, kind: 'hp' | 'focus'): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'rest' || !game.dungeon) return '休憩できる場所ではありません';
  for (const h of sceneHeroes(game)) {
    if (kind === 'hp') h.hp = Math.min(heroMaxHp(h), h.hp + Math.ceil(heroMaxHp(h) * BALANCE.restHpRatio * restMultiplierOf(h)));
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
  for (let i = g.length - 1; i >= 0; i--) if (game.heroes.some((h) => h.stash.some((s) => s.uid === g[i].uid)) || isEquipped(game, g[i].uid)) return g[i];
  return undefined;
}

const isEquipped = (game: GameState, uid: string) => game.heroes.some((h) => Object.values(h.equipment).some((e) => e?.uid === uid));

function retreat(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'dungeon' || !game.dungeon) return 'ダンジョンの通路でのみ撤退できます';
  const lost = retreatLoss(game);
  if (lost) {
    for (const h of game.heroes) h.stash = h.stash.filter((s) => s.uid !== lost.uid);
    for (const h of game.heroes) for (const [slot, e] of Object.entries(h.equipment)) if (e?.uid === lost.uid) delete h.equipment[slot as keyof Hero['equipment']];
    for (const h of game.heroes) clampHero(h);
    addLog(game, `撤退の途中で「${getItem(lost.itemId).name}」を落としてしまった…`);
  }
  addLog(game, `${game.dungeon.name}から撤退した`);
  leaveDungeon(game, rng);
  return undefined;
}

function returnToHub(game: GameState, playerId: string, rng: Rng): string | undefined {
  if (!isPartyPlayer(game, playerId)) return 'このパーティのプレイヤーではありません';
  if (game.mode !== 'cleared') return 'まだ帰還できません';
  leaveDungeon(game, rng);
  return undefined;
}

/** ダンジョンを出る（世界マップがあれば入口のマスへ戻り、入ったキャラの手番は終わる。無ければ仮の拠点へ） */
function leaveDungeon(game: GameState, rng: Rng) {
  if (!game.world) {
    toHub(game);
    return;
  }
  game.dungeon = undefined;
  game.battle = undefined;
  game.chest = undefined;
  game.event = undefined;
  game.reward = undefined;
  backToWorld(game, rng, true);
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

/** そのキャラが、今の操作の場面にいるか（別の場面＝ダンジョンの中のキャラは、その場面からしか触れない） */
function otherSceneError(game: GameState, heroId: string): string | undefined {
  const exp = expeditionOf(game, heroId);
  if ((exp?.id ?? undefined) !== game.activeScene) return exp ? 'そのキャラはダンジョンの中です' : 'そのキャラは世界マップにいます';
  return undefined;
}

function equip(game: GameState, playerId: string, heroId: string, itemUid: string): string | undefined {
  if (game.mode === 'battle') return '戦闘中は装備を変えられません';
  const h = findHero(game, heroId);
  if (!h) return 'キャラクターが見つかりません';
  const other = otherSceneError(game, heroId);
  if (other) return other;
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const idx = h.stash.findIndex((s) => s.uid === itemUid);
  if (idx < 0) return 'そのキャラの持ち物にありません';
  const def = getItem(h.stash[idx].itemId);
  const why = canEquip(h, def);
  if (why) return why;
  const slot = def.slot as keyof Hero['equipment'];
  const prev = h.equipment[slot];
  h.equipment[slot] = h.stash[idx];
  h.stash.splice(idx, 1);
  if (prev) h.stash.push(prev);
  clampHero(h);
  return undefined;
}

function unequip(game: GameState, playerId: string, heroId: string, slot: keyof Hero['equipment']): string | undefined {
  if (game.mode === 'battle') return '戦闘中は装備を変えられません';
  const h = findHero(game, heroId);
  if (!h) return 'キャラクターが見つかりません';
  const other = otherSceneError(game, heroId);
  if (other) return other;
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  const cur = h.equipment[slot];
  if (!cur) return '何も装備していません';
  delete h.equipment[slot];
  h.stash.push(cur);
  clampHero(h);
  return undefined;
}

function usePouchItem(
  game: GameState,
  cmd: Extract<GameCommand, { type: 'USE_POUCH_ITEM' }>,
): { error?: string; events: BattleEvent[] } {
  // 使うキャラ自身の袋から
  const owner = findHero(game, cmd.userId);
  const idx = owner ? owner.pouch.findIndex((p) => p.uid === cmd.itemUid) : -1;
  if (!owner || idx < 0) return { error: 'そのキャラの袋にありません', events: [] };
  const def = getItem(owner.pouch[idx].itemId);
  if (!def.use) return { error: '使えない道具です', events: [] };
  if (game.mode === 'battle' && game.battle) {
    const room = game.dungeon ? findRoom(game.dungeon, game.dungeon.currentRoomId ?? '') : undefined;
    if (def.use.some((e) => e.kind === 'escape') && isBossRoom(room)) return { error: 'ボスからは逃げられない！', events: [] };
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
    owner.pouch.splice(idx, 1);
    return { events: r.events };
  }
  // 戦闘の外（ダンジョン・拠点など）
  const user = findHero(game, cmd.userId);
  const target = findHero(game, cmd.targetId);
  if (!user || !ownedBy(user, cmd.playerId)) return { error: '担当していないキャラです', events: [] };
  const other = otherSceneError(game, user.id) ?? otherSceneError(game, cmd.targetId);
  if (other) return { error: other, events: [] };
  if (!target || target.hp <= 0) return { error: '対象が戦闘不能です', events: [] };
  // 戦闘の効果と同じ名前の冒険の効果を使う（無ければ戦闘中にしか使えない）
  if (!def.use.every((e) => hasOutcomeKind(e.kind))) return { error: '戦闘中にしか使えません', events: [] };
  const octx = makeOutcomeCtx(game, createRng(game.rngState), target);
  const outs = def.use as unknown as EventOutcome[];
  for (const o of outs) {
    const why = checkOutcome(octx, o);
    if (why) return { error: why, events: [] };
  }
  for (const o of outs) applyOutcome(octx, o);
  owner.pouch.splice(idx, 1);
  addLog(game, `${user.name}が${def.name}を使った`);
  return { events: [] };
}

/** 仲間にお金か持ち物を渡す（同じ場面・世界マップなら同じマスにいる時。戦闘中は不可） */
function give(game: GameState, cmd: Extract<GameCommand, { type: 'GIVE' }>): string | undefined {
  if (game.mode === 'battle') return '戦闘中は渡せません';
  const from = findHero(game, cmd.fromHeroId);
  const to = findHero(game, cmd.toHeroId);
  if (!from || !to || from === to || from.retired || to.retired) return '渡す相手がいません';
  if (!ownedBy(from, cmd.playerId)) return '担当していないキャラです';
  const other = otherSceneError(game, from.id) ?? otherSceneError(game, to.id);
  if (other) return other;
  const w = game.world;
  if (w && !game.activeScene && w.pos[from.id] !== w.pos[to.id]) return '同じ場所にいる仲間にしか渡せません';
  if (cmd.gold !== undefined) {
    if (!Number.isInteger(cmd.gold) || cmd.gold <= 0 || cmd.gold > from.gold) return 'ゴールドの数が不正です';
    from.gold -= cmd.gold;
    to.gold += cmd.gold;
    addLog(game, `${from.name}が${to.name}に${cmd.gold}Gを渡した`);
    return undefined;
  }
  for (const bag of ['stash', 'pouch'] as const) {
    const i = from[bag].findIndex((x) => x.uid === cmd.itemUid);
    if (i < 0) continue;
    if (bag === 'pouch' && to.pouch.length >= POUCH_LIMIT) return `${to.name}の袋がいっぱいです`;
    const [it] = from[bag].splice(i, 1);
    to[bag].push(it);
    addLog(game, `${from.name}が${to.name}に「${getItem(it.itemId).name}」を渡した`);
    return undefined;
  }
  return '持ち物にありません';
}
