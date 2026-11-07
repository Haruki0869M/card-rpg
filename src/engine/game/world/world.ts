// ===== 世界マップの進行（spec §8）: 手番・移動・遭遇・野営・侵食度・町への襲撃・命の灯火 =====
import { BALANCE } from '../../../data/balance';
import { getClass } from '../../../data/classes';
import { DUNGEONS } from '../../../data/dungeons';
import { EVENTS } from '../../../data/events';
import { getScenario } from '../../../data/scenarios';
import { getDifficulty } from '../../../data/rules';
import { QUESTS, TERRAINS, TOWNS } from '../../../data/world';
import type { EncounterState, Expedition, GameCommand, GameState, Hero, QuestState, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { addLog, campFocusOf, moveSlotsOf, ownedBy, restMultiplierOf, rollWithFocus, splitGold, statChance, successes } from '../common';
import { enterDungeonFromWorld, startBattleWith } from '../game';
import { heroFocusMax, heroMaxHp } from '../hero';
import { activeHeroes, expeditionOf, findHero, livingHeroes, mapHeroes, sceneHeroes } from '../heroes';
import { revealAround } from './fog';
import { hexDistance, pathTo, reachable } from './hex';
import { objectiveHandler, type QuestSignal } from './objectives';
import { timeOfDay } from './time';
import { ensureShop } from './town';
import { moveWanderers, spawnWanderer } from './wanderers';

type Cmd<T extends GameCommand['type']> = Extract<GameCommand, { type: T }>;

// ---------- 参照用 ----------

/** 同じマスにいる、生きているキャラ */
export const heroesAt = (game: GameState, tile: number) => mapHeroes(game).filter((h) => game.world?.pos[h.id] === tile);

/** 遭遇の戦闘に参加できるキャラ（そのマスから joinRange 以内） */
export const joinCandidates = (game: GameState, tile: number) =>
  mapHeroes(game).filter((h) => game.world && hexDistance(game.world, game.world.pos[h.id], tile) <= BALANCE.joinRange);

/** 夜に野営した時の夜襲の確率（%）。守護者の能力で下がる */
export function campAmbushChance(game: GameState, heroId: string): number {
  const w = game.world;
  if (!w || timeOfDay(w.worldTurn) !== 'night') return 0;
  let mul = 1;
  for (const h of heroesAt(game, w.pos[heroId] ?? -1)) {
    const e = getClass(h.classId).exploreAbility.effect;
    if (e.kind === 'nightAmbushReduction') mul = Math.min(mul, e.multiplier);
  }
  return Math.round(BALANCE.nightAmbushChance * mul);
}

/** 次の侵食度の段階 */
export function nextCorruptionStage(game: GameState) {
  const w = game.world;
  return getScenario(game.scenarioId).map?.corruptionStages.find((s) => !w || s.at > w.corruption);
}

/** 依頼の進み具合（目標の数に対して） */
export function questProgress(q: QuestState) {
  const def = QUESTS.get(q.id);
  return { now: q.progress, goal: objectiveHandler(def.objective).goal(def.objective as never) };
}

/** 世界マップの手番の操作か（手番のキャラ・担当プレイヤー・世界マップにいる） */
function turnCheck(game: GameState, playerId: string, heroId: string): { w: WorldState; h: Hero } | string {
  const w = game.world;
  if (!w || game.mode !== 'world') return '世界マップにいません';
  if (w.story) return '物語を読んでから進めてください';
  if (w.turn !== heroId) return 'そのキャラの手番ではありません';
  if (expeditionOf(game, heroId)) return 'そのキャラはダンジョンの中です';
  const h = findHero(game, heroId);
  if (!h || h.hp <= 0 || h.retired) return 'そのキャラは動けません';
  if (!ownedBy(h, playerId)) return '担当していないキャラです';
  return { w, h };
}

// ---------- 手番とワールドターン ----------

/** 今の手番のキャラの行動を終え、次のキャラへ。全員終わったらワールドターンを進める */
export function advanceTurn(game: GameState, rng: Rng) {
  const w = game.world!;
  if (w.turn && !w.acted.includes(w.turn)) w.acted.push(w.turn);
  w.move = null;
  w.moveRoll = undefined;
  w.invites = undefined;
  w.moveProposal = undefined;
  // 同行は、同じマスにいる間は続く（手番が変わっても。ダンジョンに入る時も一緒に入る。指摘1）
  if (w.follow) {
    for (const [id, leader] of Object.entries(w.follow)) {
      const a = findHero(game, id);
      const b = findHero(game, leader);
      if (!a || !b || a.retired || b.retired || a.hp <= 0 || b.hp <= 0 || w.pos[id] === undefined || w.pos[id] !== w.pos[leader]) delete w.follow[id];
    }
  }
  // ダンジョンの中のキャラも同じ順番に入る（ダンジョンのパーティは、その中の最初のキャラの番にまとめて動く。M3-D）
  const next = livingHeroes(game).find((h) => !w.acted.includes(h.id));
  if (next) {
    setTurn(game, next.id);
    return;
  }
  endWorldTurn(game, rng);
}

/** 手番をそのキャラにする（ダンジョンの中なら、そのパーティの探索力の判定から） */
function setTurn(game: GameState, heroId: string) {
  const w = game.world!;
  w.turn = heroId;
  w.prevTile = w.pos[heroId];
  const exp = expeditionOf(game, heroId);
  if (exp?.dungeon) {
    exp.dungeon.explore = null;
    exp.dungeon.exploreRoll = undefined;
  }
}

/** そのダンジョンのパーティの番か */
export const isExpeditionTurn = (game: GameState, exp: Expedition) => !!game.world && exp.heroes.includes(game.world.turn);

/** ダンジョンのパーティの手番を終える（全員行動済みにして次へ） */
export function endExpeditionTurn(game: GameState, heroes: string[], rng: Rng) {
  const w = game.world!;
  for (const id of heroes) if (!w.acted.includes(id)) w.acted.push(id);
  if (heroes.includes(w.turn)) advanceTurn(game, rng);
}

function endWorldTurn(game: GameState, rng: Rng) {
  const w = game.world!;
  const before = w.corruption;
  w.worldTurn += 1;
  w.acted = [];
  w.corruption = Math.min(100, w.corruption + (getDifficulty(game.difficulty).corruptionPerTurn ?? BALANCE.corruptionPerTurn));
  onCorruptionChange(game, rng, before);
  // 夜は魔物が増える
  const def = getScenario(game.scenarioId).map!;
  if (timeOfDay(w.worldTurn) === 'night' && rng.next() * 100 < BALANCE.nightSpawnChance) spawnWanderer(game, w, rng, rng.int(def.regions.length));
  moveWanderers(w, rng);
  // 町への襲撃の期限
  for (const raid of [...w.raids]) {
    if (w.worldTurn <= raid.deadline) continue;
    w.raids = w.raids.filter((r) => r !== raid);
    w.wanderers = w.wanderers.filter((x) => x.raidTown !== raid.townId);
    w.fallenTowns.push(raid.townId);
    const b2 = w.corruption;
    w.corruption = Math.min(100, w.corruption + BALANCE.corruptionOnTownFall);
    addLog(game, `${TOWNS.get(raid.townId).name}が魔物に陥落した…（侵食度+${BALANCE.corruptionOnTownFall}%）`);
    onCorruptionChange(game, rng, b2);
  }
  revealAround(game, w);
  const first = livingHeroes(game)[0];
  if (first) setTurn(game, first.id);
  else w.turn = '';
  if (w.corruption >= 100) {
    game.mode = 'gameover';
    addLog(game, '侵食度が100%に達した。世界は侵食に呑まれた…');
  }
}

/** 侵食度が段階をまたいだ時の変化（敵が増える・町への襲撃） */
export function onCorruptionChange(game: GameState, rng: Rng, before: number) {
  const w = game.world!;
  const def = getScenario(game.scenarioId).map!;
  for (const st of def.corruptionStages) {
    if (before >= st.at || w.corruption < st.at) continue;
    addLog(game, `侵食度${st.at}%: ${st.text}`);
    for (let k = 0; k < (st.spawn ?? 0); k++) spawnWanderer(game, w, rng, rng.int(def.regions.length));
    if (st.raid) startRaid(game, rng);
  }
  if (w.corruption >= 100 && game.mode === 'world') {
    game.mode = 'gameover';
    addLog(game, '侵食度が100%に達した。世界は侵食に呑まれた…');
  }
}

/** 町への襲撃（spec §8.8）: 王都以外の町に魔物を置き、期限までに倒さないと陥落する */
function startRaid(game: GameState, rng: Rng) {
  const w = game.world!;
  const towns: { id: string; tile: number }[] = [];
  w.tiles.forEach((t, i) => {
    if (t.f?.kind !== 'town') return;
    const def = TOWNS.get(t.f.id);
    if (def.capital || w.fallenTowns.includes(def.id) || w.raids.some((r) => r.townId === def.id)) return;
    if (w.wanderers.some((x) => x.tile === i)) return;
    towns.push({ id: def.id, tile: i });
  });
  if (!towns.length) return;
  const t = towns[rng.int(towns.length)];
  const wd = spawnWanderer(game, w, rng, w.tiles[t.tile].r, t.tile);
  if (!wd) return;
  wd.raidTown = t.id;
  for (const e of wd.enemies) e.level = (e.level ?? 1) + 1;
  w.raids.push({ townId: t.id, deadline: w.worldTurn + BALANCE.raidTurns });
  addLog(game, `${TOWNS.get(t.id).name}が魔物に狙われている！（陥落まで${BALANCE.raidTurns}ターン）`);
}

// ---------- 依頼 ----------

export function questSignal(game: GameState, s: QuestSignal) {
  for (const q of game.world?.quests ?? []) {
    if (q.done) continue;
    const def = QUESTS.get(q.id);
    const h = objectiveHandler(def.objective);
    const add = h.progress?.(def.objective as never, s) ?? 0;
    if (!add) continue;
    q.progress += add;
    if (q.progress >= h.goal(def.objective as never)) {
      q.done = true;
      addLog(game, `依頼「${def.title}」の目標を達成した！ 町で報告しよう`);
    }
  }
}

// ---------- コマンド ----------

/** 移動力の判定（素早さ。移動力 = moveBase + 成功数） */
export function rollMove(game: GameState, cmd: Cmd<'WORLD_ROLL_MOVE'>, rng: Rng): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  if (w.move !== null) return 'もう移動力を決めました';
  const slots = moveSlotsOf(h);
  if (!Number.isInteger(cmd.focusUsed) || cmd.focusUsed < 0 || cmd.focusUsed > Math.min(slots, h.focus)) return 'フォーカスの数が不正です';
  h.focus -= cmd.focusUsed;
  const results = rollWithFocus(slots, cmd.focusUsed, statChance(h, 'agi', 'move'), rng);
  w.moveRoll = results;
  w.move = BALANCE.moveBase + successes(results);
  w.prevTile = w.pos[h.id];
  return undefined;
}

/** 移動（経路はエンジンが決める。敵のいるマスに入ったら遭遇） */
export function moveHero(game: GameState, cmd: Cmd<'WORLD_MOVE'>): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  if (w.move === null) return '先に移動力を判定してください';
  const from = w.pos[h.id];
  const map = reachable(w, from, w.move);
  if (cmd.to === from || !map.has(cmd.to)) return 'そこへは移動できません';
  // 同行: 自分（同じ担当）のキャラか、誘いを承知したキャラだけ
  const companions = cmd.companions
    .map((id) => findHero(game, id))
    .filter((c): c is Hero => !!c && c.id !== h.id && c.hp > 0 && !c.retired && w.pos[c.id] === from && !w.acted.includes(c.id))
    .filter((c) => c.playerId === h.playerId || w.follow?.[c.id] === h.id);
  if (companions.length !== cmd.companions.filter((id) => id !== h.id).length) return '同行できないキャラがいます（他の人のキャラは、誘って承知してもらいます）';
  // 他の人のキャラが一緒なら、移動先を提案して、その人たちの同意を待つ（全員一致で動く）
  const owners = [...new Set(companions.map((c) => c.playerId).filter((p) => p !== h.playerId))];
  if (owners.length) {
    w.moveProposal = { heroId: h.id, to: cmd.to, companions: companions.map((c) => c.id), owners, agreed: [] };
    return undefined;
  }
  // 一人で動いたら、この人について来ていた同行はそのまま、この人が誰かについて行っていたらやめる
  if (w.follow?.[h.id]) delete w.follow[h.id];
  doMove(game, w, h, companions, cmd.to, map);
  return undefined;
}

/** 移動先の提案への返事（同行しているキャラの担当の人）。全員が同意したら動く。断ったらその人のキャラは同行をやめる */
export function agreeMove(game: GameState, cmd: Cmd<'WORLD_MOVE_AGREE'>): string | undefined {
  const w = game.world;
  const pr = w?.moveProposal;
  if (!w || !pr) return '移動の提案はありません';
  if (!pr.owners.includes(cmd.playerId)) return 'この提案に答える人ではありません';
  if (!cmd.accept) {
    for (const id of pr.companions) if (findHero(game, id)?.playerId === cmd.playerId && w.follow) delete w.follow[id];
    w.moveProposal = undefined;
    return undefined;
  }
  if (!pr.agreed.includes(cmd.playerId)) pr.agreed.push(cmd.playerId);
  if (!pr.owners.every((p) => pr.agreed.includes(p))) return undefined;
  w.moveProposal = undefined;
  const h = findHero(game, pr.heroId)!;
  if (w.move === null) return '先に移動力を判定してください';
  const map = reachable(w, w.pos[h.id], w.move);
  if (!map.has(pr.to)) return 'そこへは移動できません';
  const companions = pr.companions.map((id) => findHero(game, id)!).filter((c) => c && w.pos[c.id] === w.pos[h.id]);
  doMove(game, w, h, companions, pr.to, map);
  return undefined;
}

function doMove(game: GameState, w: WorldState, h: Hero, companions: Hero[], to: number, map: ReturnType<typeof reachable>) {
  const from = w.pos[h.id];
  const path = pathTo(map, to);
  const group = [h, ...companions];
  for (const c of companions) if (!w.acted.includes(c.id)) w.acted.push(c.id);
  // 画面の演出用: 通ったマス（敵に会ったら、そこまで）
  const trail = [from];
  w.lastMove = { seq: (w.lastMove?.seq ?? 0) + 1, heroes: group.map((g) => g.id), path: trail };
  let prev = from;
  for (const step of path) {
    trail.push(step);
    for (const g of group) w.pos[g.id] = step;
    revealAround(game, w);
    visitRegion(game, w, step);
    const wd = w.wanderers.find((x) => x.tile === step);
    if (wd) {
      w.prevTile = prev;
      w.move = 0;
      startEncounter(game, w, wd.id, step, h.id);
      return;
    }
    prev = step;
  }
  w.move = Math.max(0, (w.move ?? 0) - map.get(to)!.cost);
}

function visitRegion(game: GameState, w: WorldState, tile: number) {
  const r = w.tiles[tile].r;
  if (w.visitedRegions.includes(r)) return;
  w.visitedRegions.push(r);
  const reg = getScenario(game.scenarioId).map!.regions[r];
  if (reg.intro) w.story = { title: reg.name, lines: [reg.intro] };
}

export function waitTurn(game: GameState, cmd: Cmd<'WORLD_WAIT'>, rng: Rng): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  advanceTurn(game, rng);
  return undefined;
}

/** 倒れている仲間を助け起こす（M3-C5）: 同じマスで手番を使う。HPは命の灯火と同じだけ戻る */
export function reviveAlly(game: GameState, cmd: Cmd<'WORLD_REVIVE'>, rng: Rng): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  const tile = w.downed?.[cmd.targetId];
  const target = findHero(game, cmd.targetId);
  if (tile === undefined || !target) return 'その仲間は倒れていません';
  if (tile !== w.pos[h.id]) return '同じマスにいる仲間しか助け起こせません';
  delete w.downed![cmd.targetId];
  target.retired = false;
  target.hp = Math.max(1, Math.ceil(heroMaxHp(target) * BALANCE.reviveHpRatio));
  target.nextBattleStatuses = {};
  w.pos[target.id] = tile;
  addLog(game, `${h.name}が${target.name}を助け起こした！`);
  advanceTurn(game, rng);
  return undefined;
}

/** 野営（spec §8.6）: 少し回復して手番を終える。夜は夜襲の確率がある */
export function camp(game: GameState, cmd: Cmd<'WORLD_CAMP'>, rng: Rng): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  const tile = w.pos[h.id];
  if (w.tiles[tile].f?.kind === 'town') return '町の中では野営できません（宿屋を使えます）';
  if (w.move !== null && w.move < (BALANCE.moveBase as number)) return '移動した後は野営できません';
  const chance = campAmbushChance(game, h.id);
  h.hp = Math.min(heroMaxHp(h), h.hp + Math.ceil(heroMaxHp(h) * BALANCE.campHpRatio * restMultiplierOf(h)));
  h.focus = Math.min(heroFocusMax(h), h.focus + BALANCE.campFocus + campFocusOf(h));
  addLog(game, `${h.name}は野営して体を休めた`);
  if (chance > 0 && rng.next() * 100 < chance) {
    const wd = spawnWanderer(game, w, rng, w.tiles[tile].r, tile);
    if (wd) {
      addLog(game, '夜襲だ！ 魔物に囲まれた！');
      w.prevTile = tile;
      startEncounter(game, w, wd.id, tile, h.id, true);
      return undefined;
    }
  }
  advanceTurn(game, rng);
  return undefined;
}

// ---------- 遭遇（spec §8.5） ----------

function startEncounter(game: GameState, _w: WorldState, wandererId: string, tile: number, heroId: string, ambushed = false) {
  const candidates = joinCandidates(game, tile).map((x) => x.id);
  game.encounter = { wandererId, tile, heroId, candidates, ...(ambushed ? { ambushed: true } : {}) };
  game.mode = 'encounter';
}

function encounterParticipants(game: GameState, e: EncounterState, ids: string[]): string[] | string {
  const list = [...new Set([e.heroId, ...ids.filter((id) => id !== e.heroId)])];
  const mover = findHero(game, e.heroId);
  for (const id of list) {
    const h = findHero(game, id);
    if (!h || h.hp <= 0 || h.retired || !e.candidates.includes(id)) return '参加できないキャラがいます';
    // 他の人のキャラは、その人が「加わる」と答えた時だけ（同じマスにいるキャラは必ず参加）
    if (h.playerId !== mover?.playerId && !e.joins?.[id] && game.world?.pos[id] !== e.tile) return `${h.name}は戦闘に加わっていません`;
  }
  // 移動してきたキャラと同じマスのキャラ（同行していたキャラ）は必ず参加する
  for (const h of heroesAt(game, e.tile)) if (!list.includes(h.id)) list.push(h.id);
  return list;
}

/** 遭遇した（手番の）キャラの担当か */
const encounterOwner = (game: GameState, e: EncounterState, playerId: string) => ownedBy(findHero(game, e.heroId), playerId);

/** 近くにいる、手番でない人のキャラ: 戦闘に加わる / 加わらない */
export function encounterJoin(game: GameState, cmd: Cmd<'ENCOUNTER_JOIN'>): string | undefined {
  const e = game.encounter;
  if (game.mode !== 'encounter' || !e || e.result) return '今は答えられません';
  const h = findHero(game, cmd.heroId);
  if (!h || !ownedBy(h, cmd.playerId)) return '担当していないキャラです';
  if (!e.candidates.includes(h.id) || h.id === e.heroId) return 'このキャラは加われません';
  (e.joins ??= {})[h.id] = cmd.join;
  return undefined;
}

export function encounterChoose(game: GameState, cmd: Cmd<'ENCOUNTER_CHOOSE'>, rng: Rng): string | undefined {
  const e = game.encounter;
  if (game.mode !== 'encounter' || !e) return '遭遇していません';
  if (e.result) return 'もう選びました';
  if (!encounterOwner(game, e, cmd.playerId)) return '遭遇したキャラの担当の人が決めます';
  if (e.ambushed && cmd.choice !== 'fight') return '夜襲を受けた！ 戦うしかない';
  const roller = findHero(game, cmd.heroId);
  if (!roller || !ownedBy(roller, cmd.playerId)) return '担当していないキャラです';
  const parts = encounterParticipants(game, e, cmd.participants);
  if (typeof parts === 'string') return parts;
  if (cmd.choice === 'fight') return beginEncounterBattle(game, e, parts, false, rng);
  if (!parts.includes(roller.id) || roller.hp <= 0) return '判定するキャラを選んでください';
  const slots = BALANCE.encounterSlots;
  if (!Number.isInteger(cmd.focusUsed) || cmd.focusUsed < 0 || cmd.focusUsed > Math.min(slots, roller.focus)) return 'フォーカスの数が不正です';
  roller.focus -= cmd.focusUsed;
  const stat = cmd.choice === 'ambush' ? 'per' : 'agi';
  const results = rollWithFocus(slots, cmd.focusUsed, statChance(roller, stat, cmd.choice), rng);
  e.result = { choice: cmd.choice, heroId: roller.id, results, success: successes(results) >= BALANCE.encounterNeed };
  return undefined;
}

/** 判定の結果を見た後: 奇襲（成功なら敵は1ターン目に動けない）→ 戦闘 / 逃走成功 → 前のマスへ / 失敗 → 戦闘 */
export function encounterContinue(game: GameState, cmd: Cmd<'ENCOUNTER_CONTINUE'>, rng: Rng): string | undefined {
  const e = game.encounter;
  if (game.mode !== 'encounter' || !e || !e.result) return '判定をしていません';
  if (!encounterOwner(game, e, cmd.playerId)) return '遭遇したキャラの担当の人が決めます';
  const parts = encounterParticipants(game, e, cmd.participants);
  if (typeof parts === 'string') return parts;
  const w = game.world!;
  if (e.result.choice === 'flee' && e.result.success) {
    const back = w.prevTile ?? w.pos[e.heroId];
    for (const h of heroesAt(game, e.tile)) w.pos[h.id] = back;
    addLog(game, '魔物から逃げ切った！');
    game.encounter = undefined;
    game.mode = 'world';
    if (w.turn === e.heroId) w.move = 0;
    return undefined;
  }
  return beginEncounterBattle(game, e, parts, e.result.choice === 'ambush' && e.result.success, rng);
}

function beginEncounterBattle(game: GameState, e: EncounterState, participants: string[], surprise: boolean, rng: Rng): string | undefined {
  const w = game.world!;
  const wd = w.wanderers.find((x) => x.id === e.wandererId);
  if (!wd) return '敵がいません';
  game.party = participants;
  game.battleInfo = { roomType: wd.raidTown ? 'elite' : 'battle', wandererId: wd.id, tile: e.tile };
  game.encounter = undefined;
  startBattleWith(game, wd.enemies, game.battleInfo.roomType, rng, { surprise, background: undefined });
  if (surprise) addLog(game, '奇襲成功！ 敵は最初のターンに動けない');
  return undefined;
}

/** 遭遇の戦闘に勝った時（敵を消す・襲撃を防ぐ・依頼） */
export function onWandererDefeated(game: GameState, rng: Rng) {
  const w = game.world;
  const info = game.battleInfo;
  if (!w || !info?.wandererId) return;
  const wd = w.wanderers.find((x) => x.id === info.wandererId);
  w.wanderers = w.wanderers.filter((x) => x.id !== info.wandererId);
  if (!wd) return;
  questSignal(game, { kind: 'defeatWanderer', region: w.tiles[wd.tile].r });
  if (wd.raidTown) {
    w.raids = w.raids.filter((r) => r.townId !== wd.raidTown);
    w.savedTowns.push(wd.raidTown);
    // 戦った全員で山分け
    splitGold(sceneHeroes(game), BALANCE.raidRewardGold);
    addLog(game, `${TOWNS.get(wd.raidTown).name}を魔物から守った！（${BALANCE.raidRewardGold}Gを山分け）`);
  }
  void rng;
}

/** 場面（遭遇の戦闘・宝箱・イベント・祠・ダンジョン）が終わって世界マップに戻る */
export function backToWorld(game: GameState, rng: Rng, endTurn: boolean) {
  const w = game.world!;
  game.party = undefined;
  game.battleInfo = undefined;
  game.encounter = undefined;
  game.mode = 'world';
  // ダンジョンの場面から出た: 世界マップの手番には触らない（出てきたキャラは次のワールドターンから動く）
  if (game.activeScene) {
    game.dungeon = undefined;
    return;
  }
  if (!livingHeroes(game).length) {
    game.mode = 'gameover';
    return;
  }
  // 手番のキャラが倒れて退場した時など
  const cur = findHero(game, w.turn);
  if (endTurn || !cur || cur.hp <= 0 || cur.retired) advanceTurn(game, rng);
}

// ---------- 命の灯火（spec §11.4） ----------

/** 戦闘に負けた参加者: 命の灯火があれば最寄りの町でHP半分で復活、無ければ退場 */
export function handleDefeat(game: GameState, participants: string[], rng: Rng) {
  const w = game.world;
  const heroes = participants.map((id) => findHero(game, id)!).filter(Boolean);
  if (game.lives > 0) {
    game.lives -= 1;
    const town = w ? nearestTown(w, w.pos[heroes[0]?.id] ?? 0) : undefined;
    for (const h of heroes) {
      h.hp = Math.max(1, Math.ceil(heroMaxHp(h) * BALANCE.reviveHpRatio));
      h.nextBattleStatuses = {};
      if (w && town !== undefined) w.pos[h.id] = town;
    }
    addLog(game, `命の灯火が1つ消えた…（残り${game.lives}）${w ? ' 最寄りの町で目を覚ました' : ''}`);
  } else {
    // 命の灯火が無い: その場に倒れる。仲間が同じマスに来れば助け起こせる（M3-C5。世界マップが無い時は退場）
    for (const h of heroes) {
      h.retired = true;
      h.hp = 0;
      if (w && w.pos[h.id] !== undefined) (w.downed ??= {})[h.id] = w.pos[h.id];
      if (w) delete w.pos[h.id];
    }
    addLog(game, `${heroes.map((h) => h.name).join('・')}は力尽きて倒れた…${w ? '（仲間が同じマスに行けば助け起こせる）' : ''}`);
  }
  if (!activeHeroes(game).length) {
    game.mode = 'gameover';
    addLog(game, 'パーティは全滅した…');
    return;
  }
  game.dungeon = undefined;
  game.battle = undefined;
  if (w) backToWorld(game, rng, true);
}

function nearestTown(w: WorldState, from: number): number | undefined {
  let best: number | undefined;
  w.tiles.forEach((t, i) => {
    if (t.f?.kind !== 'town' || w.fallenTowns.includes(t.f.id)) return;
    if (best === undefined || hexDistance(w, from, i) < hexDistance(w, from, best)) best = i;
  });
  return best;
}

// ---------- 今いるマスに入る（町・祠・イベント・宝箱・名所・ダンジョン） ----------

export function interact(game: GameState, cmd: Cmd<'WORLD_INTERACT'>, rng: Rng): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  const tile = w.pos[h.id];
  const f = w.tiles[tile].f;
  if (!f) return 'ここには何もありません';
  if (f.used && f.kind !== 'town' && f.kind !== 'dungeon') return 'もう調べました';
  const here = heroesAt(game, tile).map((x) => x.id);
  switch (f.kind) {
    case 'town':
      if (w.fallenTowns.includes(f.id)) return 'この町は陥落している…';
      game.town = { townId: f.id, heroId: h.id };
      game.mode = 'town';
      ensureShop(game, rng);
      return undefined;
    case 'shrine':
      game.party = here;
      game.shrine = { shrineId: f.id, tile, heroId: h.id };
      game.mode = 'shrine';
      return undefined;
    case 'event':
    case 'landmark':
      game.party = here;
      game.event = { tile, eventId: f.id };
      game.mode = 'event';
      if (f.kind === 'landmark') questSignal(game, { kind: 'visitLandmark', landmarkId: f.id });
      return undefined;
    case 'chest':
      game.party = here;
      game.chest = { tile, spec: { rarity: f.chest?.rarity ?? 'common', locked: !!f.chest?.locked }, unlocked: !f.chest?.locked };
      game.mode = 'chest';
      return undefined;
    case 'dungeon': {
      const def = DUNGEONS.get(f.id);
      const missing = (def.requiresKeys ?? []).filter((k) => !w.keys.includes(k));
      if (missing.length) {
        const names = getScenario(game.scenarioId).story?.keys ?? {};
        return `扉が開かない…（必要: ${missing.map((k) => names[k] ?? k).join('・')}）`;
      }
      // 一緒に入るのは、自分のキャラか、誘いを承知した他の人のキャラ
      const party = (cmd.party?.length ? cmd.party : here).filter((id) => here.includes(id) && (findHero(game, id)?.playerId === h.playerId || w.follow?.[id] === h.id));
      if (!party.includes(h.id)) party.unshift(h.id);
      // 同行しているキャラ（他の人のキャラも）は、必ず一緒に入る（指摘1）
      for (const id of here) if (w.follow?.[id] === h.id && !party.includes(id)) party.push(id);
      const before = w.corruption;
      w.corruption = Math.min(100, w.corruption + BALANCE.corruptionOnDungeonEnter);
      onCorruptionChange(game, rng, before);
      if (game.mode === 'gameover') return undefined;
      for (const id of party) if (!w.acted.includes(id) && id !== h.id) w.acted.push(id);
      enterDungeonFromWorld(game, f.id, party, rng);
      detachExpedition(game, rng);
      return undefined;
    }
  }
  return 'ここには入れません';
}

/**
 * 入ったダンジョンを「世界マップと別の場面」にする。
 * 入ったキャラは世界マップの手番から外れ、世界マップは残りのキャラで続く（spec M3-C）
 */
function detachExpedition(game: GameState, rng: Rng) {
  const n = game.nextExpeditionId ?? 1;
  game.nextExpeditionId = n + 1;
  const exp: Expedition = {
    id: `x${n}`,
    heroes: [...(game.party ?? [])],
    mode: game.mode,
    dungeon: game.dungeon,
    battle: game.battle,
    reward: game.reward,
    chest: game.chest,
    event: game.event,
    battleInfo: game.battleInfo,
    battleBackground: game.battleBackground,
  };
  (game.expeditions ??= []).push(exp);
  game.dungeon = game.battle = game.reward = game.chest = game.event = game.battleInfo = game.battleBackground = undefined;
  game.party = undefined;
  game.mode = 'world';
  advanceTurn(game, rng);
}

/** ダンジョンから出てきたキャラが世界マップに戻る */
export function rejoinWorld(game: GameState, heroes: string[]) {
  const w = game.world;
  if (!w) return;
  // 出てきたキャラは、次のワールドターンから世界マップで動く
  for (const id of heroes) if (!w.acted.includes(id)) w.acted.push(id);
}

// ---------- 同行の誘い（他の人のキャラ） ----------

/** 手番のキャラが、同じマスの他の人のキャラを誘う */
export function worldInvite(game: GameState, cmd: Cmd<'WORLD_INVITE'>): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  const target = findHero(game, cmd.targetId);
  if (!target || target.hp <= 0 || target.retired || w.pos[target.id] !== w.pos[h.id] || w.acted.includes(target.id)) return '誘えるキャラではありません';
  if (target.playerId === h.playerId) return '自分のキャラは誘わなくても連れて行けます';
  (w.invites ??= {})[target.id] = h.id;
  return undefined;
}

/** 誘われたキャラの担当が答える（承知すると、この手番の移動に同行できる） */
export function worldInviteAnswer(game: GameState, cmd: Cmd<'WORLD_INVITE_ANSWER'>): string | undefined {
  const w = game.world;
  if (!w || game.mode !== 'world') return '世界マップにいません';
  const target = findHero(game, cmd.heroId);
  if (!target || !ownedBy(target, cmd.playerId)) return '担当していないキャラです';
  const by = w.invites?.[target.id];
  if (!by) return '誘われていません';
  delete w.invites![target.id];
  if (cmd.accept) (w.follow ??= {})[target.id] = by;
  else if (w.follow) delete w.follow[target.id];
  return undefined;
}

export function storyContinue(game: GameState): string | undefined {
  const w = game.world;
  if (!w?.story) return '物語はありません';
  w.story = undefined;
  return undefined;
}

/** 世界マップのイベントで出るイベント（名所・普通のイベント） */
export const isMapEvent = (id: string) => EVENTS.tryGet(id)?.where === 'map';

/** 今の場面の背景（ダンジョンならダンジョン、世界マップならそのマスの地形） */
export function sceneBackground(game: GameState): string {
  if (game.dungeon) return game.dungeon.background;
  if (game.battleBackground && game.mode === 'battle') return game.battleBackground;
  const w = game.world;
  if (!w) return 'plains';
  const tile = game.chest?.tile ?? game.event?.tile ?? game.shrine?.tile ?? game.encounter?.tile ?? w.pos[w.turn];
  return tile !== undefined ? TERRAINS.get(w.tiles[tile].t).background : 'plains';
}
