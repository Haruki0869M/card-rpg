// ===== テスト用の自動プレイ（シナリオをエンディングまで）=====
// 画面と同じコマンドだけを使う。上手さより「どの場面でも詰まらずに進めること」を優先した単純な作戦。
import { cardOf } from '../data/cards';
import { DUNGEONS } from '../data/dungeons';
import { EVENTS } from '../data/events';
import { getItem } from '../data/items';
import { TOWNS } from '../data/world';
import type { GameCommand, GameState, PlayerId } from '../types';
import {
  applyGameCommand,
  canEquip,
  eventOptionState,
  findHero,
  heroMaxHp,
  hexDistance,
  isDone,
  livingHeroes,
  rarityIndex,
  reachable,
  reachableRooms,
  unusableReason,
  viewOf,
  waitingPlayers,
  commandPlayer,
  needsVote,
  notVoted,
} from './index';

export interface BotLog {
  steps: number;
  errors: string[];
  modes: Record<string, number>;
}

/** 次の操作を決めるだけの時（オンライン協力のテスト）は、ここに入れて動かさない */
let capture: GameCommand[] | null = null;

function send(g: GameState, cmd: GameCommand, log: BotLog): GameState {
  // みんなで決める操作は、まだ選んでいない人の1票として入れる（全員入ると決まる）
  if (needsVote(g, cmd)) cmd = { type: 'VOTE', playerId: notVoted(g)[0] ?? commandPlayer(cmd)!, command: cmd };
  if (capture) {
    capture.push(cmd);
    return { ...g };
  }
  const r = applyGameCommand(g, cmd);
  if (r.error) log.errors.push(`${g.mode}/${cmd.type}: ${r.error}`);
  return r.state;
}

/** 操作するプレイヤー（キャラの指定が無ければ、世界マップの場面は手番の人、ダンジョンは先頭のキャラの人） */
const pid = (g: GameState, heroId?: string): PlayerId => {
  const owner = (id?: string) => (id ? findHero(g, id)?.playerId : undefined);
  return owner(heroId) ?? (!g.activeScene && g.world?.turn ? owner(g.world.turn) : undefined) ?? owner(g.party?.[0]) ?? g.heroes[0].playerId;
};

/** 目的のダンジョン（鍵の順。最後は魔王城） */
function goalDungeon(g: GameState): string {
  const order = ['emeraldTemple', 'silentCatacomb', 'lavaCavern', 'demonCastle'];
  return order.find((d) => !g.clearedDungeons.includes(d)) ?? 'demonCastle';
}

function tileOf(g: GameState, kind: string, id: string): number | undefined {
  const i = g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);
  return i < 0 ? undefined : i;
}

/** 世界マップでの行き先（HPが減ったら町、レベルが足りなければ近くの敵、それ以外は次のダンジョン） */
function worldTarget(g: GameState, at: number): { tile: number; why: 'town' | 'grind' | 'dungeon' } {
  const w = g.world!;
  const heroes = livingHeroes(g);
  const goal = goalDungeon(g);
  const need = DUNGEONS.get(goal).baseLevel + (goal === 'demonCastle' ? 1 : 0);
  const avgLv = heroes.reduce((n, h) => n + h.level, 0) / heroes.length;
  const hurt = heroes.some((h) => h.hp < heroMaxHp(h) * 0.5);
  if (hurt) {
    let best: number | undefined;
    w.tiles.forEach((t, i) => {
      if (t.f?.kind !== 'town' || w.fallenTowns.includes(t.f.id) || !t.seen) return;
      if (heroes.every((h) => h.gold < TOWNS.get(t.f!.id).innCost)) return;
      if (best === undefined || hexDistance(w, at, i) < hexDistance(w, at, best)) best = i;
    });
    if (best !== undefined) return { tile: best, why: 'town' };
  }
  if (avgLv < need) {
    const near = w.wanderers.filter((x) => w.tiles[x.tile].seen).sort((a, b) => hexDistance(w, at, a.tile) - hexDistance(w, at, b.tile))[0];
    if (near && hexDistance(w, at, near.tile) <= 6) return { tile: near.tile, why: 'grind' };
  }
  return { tile: tileOf(g, 'dungeon', goal)!, why: 'dungeon' };
}

function worldStep(g: GameState, log: BotLog, memo: { interacted: Set<string> }): GameState {
  const w = g.world!;
  if (w.story) return send(g, { type: 'STORY_CONTINUE', playerId: pid(g) }, log);
  const h = findHero(g, w.turn)!;
  const p = pid(g, h.id);
  const at = w.pos[h.id];
  const target = worldTarget(g, at);
  const key = `${w.worldTurn}:${h.id}:${at}`;
  // 目的地に着いたら入る（1手番に1回だけ）
  if (at === target.tile && !memo.interacted.has(key)) {
    memo.interacted.add(key);
    if (target.why !== 'grind') {
      const ng = send(g, { type: 'WORLD_INTERACT', playerId: p, heroId: h.id, party: livingHeroes(g).filter((x) => w.pos[x.id] === at).map((x) => x.id) }, log);
      if (ng !== g) return ng;
    }
  }
  if (w.move === null) return send(g, { type: 'WORLD_ROLL_MOVE', playerId: p, heroId: h.id, focusUsed: 0 }, log);
  // 同じマスの他の人のキャラは、誘って承知してもらってから一緒に動く（自動プレイは全員の代わりに答える）
  if (w.move === null) {
    for (const c of livingHeroes(g)) {
      if (c.id === h.id || c.playerId === h.playerId || w.pos[c.id] !== at || w.acted.includes(c.id) || w.follow?.[c.id] === h.id) continue;
      if (g.expeditions?.some((x) => x.heroes.includes(c.id))) continue;
      if (w.invites?.[c.id] === h.id) return send(g, { type: 'WORLD_INVITE_ANSWER', playerId: c.playerId, heroId: c.id, accept: true }, log);
      return send(g, { type: 'WORLD_INVITE', playerId: p, heroId: h.id, targetId: c.id }, log);
    }
  }
  if (w.move > 0) {
    const reach = reachable(w, at, w.move);
    let best = at;
    for (const [i] of reach) if (hexDistance(w, i, target.tile) < hexDistance(w, best, target.tile)) best = i;
    if (best !== at) {
      const companions = livingHeroes(g)
        .filter((x) => x.id !== h.id && w.pos[x.id] === at && !w.acted.includes(x.id) && !g.expeditions?.some((e) => e.heroes.includes(x.id)))
        .filter((x) => x.playerId === h.playerId || w.follow?.[x.id] === h.id)
        .map((x) => x.id);
      return send(g, { type: 'WORLD_MOVE', playerId: p, heroId: h.id, to: best, companions }, log);
    }
  }
  return send(g, { type: 'WORLD_WAIT', playerId: p, heroId: h.id }, log);
}

function battleStep(g: GameState, log: BotLog): GameState {
  const b = g.battle!;
  if (b.phase === 'ally') {
    for (const a of b.allies) {
      if (isDone(b, a)) continue;
      const c = a.hand.find((x) => !unusableReason(b, a, cardOf(x)));
      if (!c) continue;
      const card = cardOf(c);
      const target = b.enemies.find((e) => !e.dead)?.uid;
      const focus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
      return send(g, { type: 'BATTLE', command: { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: c.uid, targetId: card.target === 'enemy' ? target : undefined, focusUsed: focus } }, log);
    }
    // オンライン協力なら、まだ準備完了していないプレイヤーが押す
    const who = waitingPlayers(b)[0] ?? b.allies[0].playerId;
    return send(g, { type: 'BATTLE', command: { type: 'END_TURN', playerId: who } }, log);
  }
  if (b.phase === 'enemy') return send(g, { type: 'BATTLE', command: { type: 'ENEMY_STEP' } }, log);
  return send(g, { type: 'FINISH_BATTLE', playerId: pid(g) }, log);
}

/** 持ち物の装備のうち、格が上のものを装備する（使えない人が持っていたら、同じ場所の使える仲間に渡す） */
function equipBest(g: GameState, log: BotLog): GameState {
  const near = (a: string, b: string) => !g.world || g.world.pos[a] === g.world.pos[b];
  const heroes = livingHeroes(g).filter((h) => !g.party || g.party.includes(h.id));
  const scene = g.mode === 'world' ? heroes.filter((h) => !g.expeditions?.some((x) => x.heroes.includes(h.id))) : heroes;
  for (const owner of scene) {
    for (const inst of owner.stash) {
      const it = getItem(inst.itemId);
      const better = (h: (typeof scene)[number]) => {
        if (canEquip(h, it)) return false;
        const cur = h.equipment[it.slot as 'weapon' | 'armor' | 'accessory'];
        return !cur || rarityIndex(getItem(cur.itemId).rarity) < rarityIndex(it.rarity);
      };
      if (better(owner)) return send(g, { type: 'EQUIP', playerId: owner.playerId, heroId: owner.id, itemUid: inst.uid }, log);
      const to = scene.find((h) => h !== owner && near(h.id, owner.id) && better(h));
      if (to) return send(g, { type: 'GIVE', playerId: owner.playerId, fromHeroId: owner.id, toHeroId: to.id, itemUid: inst.uid }, log);
    }
  }
  return g;
}

export function botStep(g: GameState, log: BotLog, memo: { interacted: Set<string>; town?: string }, inScene = false): GameState {
  // ダンジョンの場面があれば、先にそちらを進める（その場面を載せた冒険で次の操作を決めて、SCENE で送る）
  // 手番がダンジョンの中のキャラなら、そのダンジョンの場面を進める（世界マップがなければ、最初の場面）
  const exp = inScene ? undefined : g.world ? g.expeditions?.find((x) => x.heroes.includes(g.world!.turn)) : g.expeditions?.[0];
  if (exp && g.mode !== 'gameover' && g.mode !== 'ending') {
    const outer = capture;
    capture = [];
    let inner: GameCommand | undefined;
    try {
      botStep(viewOf(g, exp.id), log, memo, true);
      inner = capture[0];
    } finally {
      capture = outer;
    }
    if (inner) return send(g, { type: 'SCENE', scene: exp.id, command: inner }, log);
  }
  log.modes[g.mode] = (log.modes[g.mode] ?? 0) + 1;
  switch (g.mode) {
    case 'world': {
      const eq = equipBest(g, log);
      if (eq !== g) return eq;
      const w = g.world!;
      // 一緒に動く移動先の提案: 同行している人の分は同意する
      if (w.moveProposal) {
        const p = w.moveProposal.owners.find((o) => !w.moveProposal!.agreed.includes(o))!;
        return send(g, { type: 'WORLD_MOVE_AGREE', playerId: p, accept: true }, log);
      }
      // 同じマスに倒れている仲間がいれば助け起こす
      const down = Object.entries(w.downed ?? {}).find(([, t]) => t === w.pos[w.turn]);
      if (down && !w.story) return send(g, { type: 'WORLD_REVIVE', playerId: pid(g, w.turn), heroId: w.turn, targetId: down[0] }, log);
      return worldStep(g, log, memo);
    }
    case 'encounter': {
      const e = g.encounter!;
      // 近くにいる他の人のキャラは「加わる」と答えてから（自動プレイは全員の代わりに答える）
      const mover = findHero(g, e.heroId)!;
      const ask = e.candidates.map((id) => findHero(g, id)!).find((c) => c.playerId !== mover.playerId && g.world!.pos[c.id] !== e.tile && e.joins?.[c.id] === undefined);
      if (ask && !e.result) return send(g, { type: 'ENCOUNTER_JOIN', playerId: ask.playerId, heroId: ask.id, join: true }, log);
      if (e.result) return send(g, { type: 'ENCOUNTER_CONTINUE', playerId: pid(g, e.heroId), participants: e.candidates }, log);
      return send(g, { type: 'ENCOUNTER_CHOOSE', playerId: pid(g, e.heroId), choice: 'fight', heroId: e.heroId, focusUsed: 0, participants: e.candidates }, log);
    }
    case 'battle':
      return battleStep(g, log);
    case 'reward': {
      const r = g.reward!;
      if (r.levelUps.length) {
        const lu = r.levelUps[0];
        const h = findHero(g, lu.heroId)!;
        const i = lu.options.findIndex((o) => o.kind !== 'upgradeCard');
        return send(g, { type: 'CHOOSE_GROWTH', playerId: h.playerId, optionIndex: i >= 0 ? i : 0, cardUid: h.deck.find((c) => !c.upgraded)?.uid }, log);
      }
      if (r.claim && !r.claim.rolls) {
        // 戦利品の取り合い: 最初のキャラは「欲しい」、ほかは「余れば」
        const id = r.claim.heroes.find((x) => !r.claim!.choices[x])!;
        return send(g, { type: 'CLAIM_LOOT', playerId: pid(g, id), heroId: id, choice: id === r.claim.heroes[0] ? 'need' : 'greed' }, log);
      }
      if (!r.cardPicked) {
        // まだ選んでいないキャラの最初のカード（M3-C4: キャラごとに1枚）
        const i = r.cardOffers.findIndex((o) => !r.cardDone?.includes(o.heroId));
        return send(g, { type: 'PICK_CARD', playerId: pid(g, r.cardOffers[i]?.heroId), offerIndex: i >= 0 ? i : null }, log);
      }
      return send(g, { type: 'FINISH_REWARD', playerId: pid(g) }, log);
    }
    case 'dungeon': {
      // 手番の最初に探索力を決める（世界マップのあるシナリオ）
      if (g.world && g.dungeon!.explore == null) {
        const h = livingHeroes(g).find((x) => !g.party || g.party.includes(x.id))!;
        return send(g, { type: 'EXPLORE_ROLL', playerId: h.playerId, heroId: h.id, focusUsed: 0 }, log);
      }
      const rooms = reachableRooms(g.dungeon!);
      const hurt = livingHeroes(g).some((h) => h.hp < heroMaxHp(h) * 0.5);
      const pick = rooms.find((r) => (hurt ? r.type === 'rest' : r.type === 'chest')) ?? rooms[0];
      return send(g, { type: 'ENTER_ROOM', playerId: pid(g), roomId: pick.id }, log);
    }
    case 'chest': {
      const c = g.chest!;
      if (c.contents) return send(g, { type: 'LEAVE_CHEST', playerId: pid(g) }, log);
      // 世界マップの宝箱は、手番のキャラの担当の人のキャラで開ける
      const turnOwner = g.world && c.tile !== undefined && !g.activeScene ? findHero(g, g.world.turn)?.playerId : undefined;
      const inParty = livingHeroes(g).filter((x) => !g.party || g.party.includes(x.id));
      const h = inParty.find((x) => !turnOwner || x.playerId === turnOwner) ?? inParty[0];
      const ng = send(g, { type: 'OPEN_CHEST', playerId: h.playerId, heroId: h.id, focusUsed: 0 }, log);
      if (ng.chest && !ng.chest.unlocked && ng.chest.lastRoll?.success === false) return send(ng, { type: 'LEAVE_CHEST', playerId: pid(g) }, log);
      return ng;
    }
    case 'event': {
      const ev = g.event!;
      if (ev.result) return send(g, { type: 'FINISH_EVENT', playerId: pid(g) }, log);
      const def = EVENTS.get(ev.eventId);
      const party = livingHeroes(g).filter((x) => !g.party || g.party.includes(x.id));
      // 選べる選択肢と、選ぶキャラ（お金がいる時は払えるキャラ）
      for (let i = 0; i < def.options.length; i++) {
        const h = party.find((x) => {
          const st = eventOptionState(g, ev.eventId, i, x);
          return st.visible && !st.reason;
        });
        if (h) return send(g, { type: 'CHOOSE_EVENT', playerId: h.playerId, optionIndex: i, heroId: h.id, focusUsed: 0 }, log);
      }
      return g;
    }
    case 'rest':
      return send(g, { type: 'REST', playerId: pid(g), kind: 'hp' }, log);
    case 'cleared':
      return send(g, { type: 'RETURN_TO_HUB', playerId: pid(g) }, log);
    case 'town': {
      const t = g.town!;
      const key = `${g.world!.worldTurn}:${t.townId}`;
      if (memo.town !== key) {
        memo.town = key;
        const v = g.heroes.find((h) => h.id === t.heroId)!;
        if (v.hp < heroMaxHp(v) && v.gold >= TOWNS.get(t.townId).innCost) return send(g, { type: 'TOWN_INN', playerId: v.playerId }, log);
      }
      return send(g, { type: 'LEAVE_TOWN', playerId: pid(g, t.heroId) }, log);
    }
    case 'shrine': {
      const s = g.shrine!;
      if (s.result) return send(g, { type: 'LEAVE_SHRINE', playerId: pid(g) }, log);
      return send(g, { type: 'SHRINE_CHOOSE', playerId: pid(g, s.heroId), optionIndex: 0, heroId: s.heroId }, log);
    }
    case 'hub':
      return send(g, { type: 'ENTER_DUNGEON', playerId: pid(g), dungeonId: goalDungeon(g) }, log);
    default:
      return g;
  }
}

/** 次に送る操作を決める（状態は変えない）。何もすることがなければ null */
export function botNextCommand(g: GameState, memo: { interacted: Set<string>; town?: string }): GameCommand | null {
  capture = [];
  try {
    botStep(g, { steps: 0, errors: [], modes: {} }, memo);
    return capture[0] ?? null;
  } finally {
    capture = null;
  }
}

/** エンディングかゲームオーバーまで自動で遊ぶ */
export function playToEnd(g: GameState, maxSteps = 60000): { game: GameState; log: BotLog } {
  const log: BotLog = { steps: 0, errors: [], modes: {} };
  const memo = { interacted: new Set<string>() };
  let stuck = 0;
  for (; log.steps < maxSteps; log.steps++) {
    if (g.mode === 'ending' || g.mode === 'gameover') break;
    const next = botStep(g, log, memo);
    stuck = next === g ? stuck + 1 : 0;
    if (stuck > 50) {
      log.errors.push(`stuck in ${g.mode}`);
      break;
    }
    g = next;
  }
  return { game: g, log };
}
