// ===== 世界マップの進行（spec §8）: 手番・移動・遭遇・野営・侵食度・町への襲撃・命の灯火 =====
import { BALANCE } from '../../../data/balance';
import { getClass } from '../../../data/classes';
import { DUNGEONS } from '../../../data/dungeons';
import { EVENTS } from '../../../data/events';
import { getScenario } from '../../../data/scenarios';
import { QUESTS, TOWNS } from '../../../data/world';
import type { EncounterState, GameCommand, GameState, Hero, QuestState, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { addLog, ownedBy, rollWithFocus, statChance, successes } from '../common';
import { enterDungeonFromWorld, startBattleWith } from '../game';
import { heroFocusMax, heroMaxHp } from '../hero';
import { activeHeroes, findHero, livingHeroes } from '../heroes';
import { revealAround } from './fog';
import { hexDistance, pathTo, reachable } from './hex';
import { objectiveHandler, type QuestSignal } from './objectives';
import { timeOfDay } from './time';
import { moveWanderers, spawnWanderer } from './wanderers';

type Cmd<T extends GameCommand['type']> = Extract<GameCommand, { type: T }>;

// ---------- 参照用 ----------

/** 同じマスにいる、生きているキャラ */
export const heroesAt = (game: GameState, tile: number) => livingHeroes(game).filter((h) => game.world?.pos[h.id] === tile);

/** 遭遇の戦闘に参加できるキャラ（そのマスから joinRange 以内） */
export const joinCandidates = (game: GameState, tile: number) =>
  livingHeroes(game).filter((h) => game.world && hexDistance(game.world, game.world.pos[h.id], tile) <= BALANCE.joinRange);

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
  const next = livingHeroes(game).find((h) => !w.acted.includes(h.id));
  if (next) {
    w.turn = next.id;
    w.prevTile = w.pos[next.id];
    return;
  }
  endWorldTurn(game, rng);
}

function endWorldTurn(game: GameState, rng: Rng) {
  const w = game.world!;
  const before = w.corruption;
  w.worldTurn += 1;
  w.acted = [];
  w.corruption = Math.min(100, w.corruption + BALANCE.corruptionPerTurn);
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
  w.turn = first?.id ?? '';
  w.prevTile = first ? w.pos[first.id] : undefined;
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
  const slots = BALANCE.moveSlots;
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
  const companions = cmd.companions
    .map((id) => findHero(game, id))
    .filter((c): c is Hero => !!c && c.id !== h.id && c.hp > 0 && !c.retired && w.pos[c.id] === from && !w.acted.includes(c.id));
  if (companions.length !== cmd.companions.filter((id) => id !== h.id).length) return '同行できないキャラがいます';
  const path = pathTo(map, cmd.to);
  const group = [h, ...companions];
  for (const c of companions) if (!w.acted.includes(c.id)) w.acted.push(c.id);
  let prev = from;
  for (const step of path) {
    for (const g of group) w.pos[g.id] = step;
    revealAround(game, w);
    visitRegion(game, w, step);
    const wd = w.wanderers.find((x) => x.tile === step);
    if (wd) {
      w.prevTile = prev;
      w.move = 0;
      startEncounter(game, w, wd.id, step, h.id);
      return undefined;
    }
    prev = step;
  }
  w.move = Math.max(0, w.move - map.get(cmd.to)!.cost);
  return undefined;
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

/** 野営（spec §8.6）: 少し回復して手番を終える。夜は夜襲の確率がある */
export function camp(game: GameState, cmd: Cmd<'WORLD_CAMP'>, rng: Rng): string | undefined {
  const t = turnCheck(game, cmd.playerId, cmd.heroId);
  if (typeof t === 'string') return t;
  const { w, h } = t;
  const tile = w.pos[h.id];
  if (w.tiles[tile].f?.kind === 'town') return '町の中では野営できません（宿屋を使えます）';
  if (w.move !== null && w.move < (BALANCE.moveBase as number)) return '移動した後は野営できません';
  const chance = campAmbushChance(game, h.id);
  h.hp = Math.min(heroMaxHp(h), h.hp + Math.ceil(heroMaxHp(h) * BALANCE.campHpRatio));
  h.focus = Math.min(heroFocusMax(h), h.focus + BALANCE.campFocus);
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
  for (const id of list) {
    const h = findHero(game, id);
    if (!h || h.hp <= 0 || h.retired || !e.candidates.includes(id)) return '参加できないキャラがいます';
  }
  // 移動してきたキャラと同じマスのキャラ（同行していたキャラ）は必ず参加する
  for (const h of heroesAt(game, e.tile)) if (!list.includes(h.id)) list.push(h.id);
  return list;
}

export function encounterChoose(game: GameState, cmd: Cmd<'ENCOUNTER_CHOOSE'>, rng: Rng): string | undefined {
  const e = game.encounter;
  if (game.mode !== 'encounter' || !e) return '遭遇していません';
  if (e.result) return 'もう選びました';
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
    game.gold += BALANCE.raidRewardGold;
    addLog(game, `${TOWNS.get(wd.raidTown).name}を魔物から守った！（${BALANCE.raidRewardGold}G）`);
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
    for (const h of heroes) {
      h.retired = true;
      h.hp = 0;
      if (w) delete w.pos[h.id];
    }
    addLog(game, `${heroes.map((h) => h.name).join('・')}は力尽き、冒険から退場した…`);
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
      const party = (cmd.party?.length ? cmd.party : here).filter((id) => here.includes(id));
      if (!party.includes(h.id)) party.unshift(h.id);
      const before = w.corruption;
      w.corruption = Math.min(100, w.corruption + BALANCE.corruptionOnDungeonEnter);
      onCorruptionChange(game, rng, before);
      if (game.mode === 'gameover') return undefined;
      for (const id of party) if (!w.acted.includes(id) && id !== h.id) w.acted.push(id);
      enterDungeonFromWorld(game, f.id, party, rng);
      return undefined;
    }
  }
  return 'ここには入れません';
}

export function storyContinue(game: GameState): string | undefined {
  const w = game.world;
  if (!w?.story) return '物語はありません';
  w.story = undefined;
  return undefined;
}

/** 世界マップのイベントで出るイベント（名所・普通のイベント） */
export const isMapEvent = (id: string) => EVENTS.tryGet(id)?.where === 'map';
