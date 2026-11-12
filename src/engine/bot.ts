import { followingGroup } from './game/world/group';
import { facilityMembers, facilityVisit } from './game/world/facilities';
import { isAllyCard, cardTargets, secondaryCard } from './battle/targets';
import { unitIdOf } from './battle/units';
// ===== テスト用の自動プレイ（シナリオをエンディングまで）=====
// 画面と同じコマンドだけを使う。上手さより「どの場面でも詰まらずに進めること」を優先した単純な作戦。
import { cardOf } from '../data/cards';
import { DUNGEONS } from '../data/dungeons';
import { EVENTS } from '../data/events';
import { getItem } from '../data/items';
import { QUESTS, TOWNS } from '../data/world';
import { canReportQuest } from './game/world/town';
import { questsShort } from './game/world/questGate';
import type { GameCommand, GameState, Hero, PlayerId, WorldState } from '../types';
import { moveCostOf, neighbors, pathTo } from './game/world/hex';
import { isWideMap } from './game/world/lanes';
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
  chestShared,
  dungeonJoin,
  omenOfType,
  sealStep,
  dungeonEnemyLevel,
} from './index';
import { cardTaskCommand, cleverBattleCommand, cleverDetour, effectiveLevel, jobCommand, newCleverMemo, noteEncounter, restKind, cleverUses, type CleverMemo, type CleverPart } from './botClever';
import { isRandomDungeonTile } from './game/world/randomDungeons';
import {
  hurtLine,
  newSmartMemo,
  smartBattleItemCommand,
  smartEquipCommand,
  smartFieldItemCommand,
  smartGrowthCommand,
  smartPeddlerCommand,
  smartPickCardCommand,
  smartRemoveCardCommand,
  smartShopDetour,
  smartTownCardCommand,
  smartTownShopCommand,
  smartUses,
  teamAdjust,
  timeLate,
  type SmartMemo,
  type SmartPart,
  type SmartPick,
} from './botSmart';

export interface BotLog {
  steps: number;
  errors: string[];
  modes: Record<string, number>;
  /** 入った部屋の数（ENTER_ROOM）。数えるだけで動きは変えない */
  rooms?: number;
  /** 賢い bot の操作がゲームに断られた数（失敗には数えない。断られた操作は同じ場面では二度と送らない） */
  refused?: number;
}

/** 次の操作を決めるだけの時（オンライン協力のテスト）は、ここに入れて動かさない */
let capture: GameCommand[] | null = null;
/** 賢い bot: capture に入れた操作が「断られてもよい操作」なら、その印（外側で SCENE に包んで送る時に使う） */
let captureSmart: SmartPick | undefined;

/**
 * 操作を送る。smart = 賢い bot の操作（断られたら、失敗に数えずに覚えておき、同じ場面では二度と送らない。BotLog.refused に数える）。
 * smart が無い時は、今までと全く同じ
 */
function send(g: GameState, cmd: GameCommand, log: BotLog, smart?: { pick: SmartPick; sm: SmartMemo }): GameState {
  // みんなで決める操作は、まだ選んでいない人の1票として入れる（全員入ると決まる）
  if (needsVote(g, cmd)) cmd = { type: 'VOTE', playerId: notVoted(g)[0] ?? commandPlayer(cmd)!, command: cmd };
  if (capture) {
    capture.push(cmd);
    if (smart && capture.length === 1) captureSmart = smart.pick;
    return { ...g };
  }
  if ((cmd.type === 'SCENE' ? cmd.command : cmd).type === 'ENTER_ROOM') log.rooms = (log.rooms ?? 0) + 1;
  const r = applyGameCommand(g, cmd);
  if (r.error && smart) {
    smart.sm.refused.add(smart.pick.key);
    log.refused = (log.refused ?? 0) + 1;
    return g;
  }
  if (r.error) log.errors.push(`${g.mode}/${cmd.type}: ${r.error}`);
  return r.state;
}

/** 賢い bot の操作を送る（無ければ undefined） */
const sendSmart = (g: GameState, log: BotLog, memo: BotMemo, pick: SmartPick | undefined): GameState | undefined =>
  pick && memo.smart ? send(g, pick.cmd, log, { pick, sm: memo.smart }) : undefined;

/** 操作するプレイヤー（キャラの指定が無ければ、世界マップの場面は手番の人、ダンジョンは先頭のキャラの人） */
const pid = (g: GameState, heroId?: string): PlayerId => {
  const facility = facilityVisit(g);
  if (!heroId && facility) heroId = facilityMembers(g).find(id => !facility.finished?.includes(id));
  const owner = (id?: string) => (id ? findHero(g, id)?.playerId : undefined);
  return owner(heroId) ?? (!g.activeScene && g.world?.turn ? owner(g.world.turn) : undefined) ?? owner(g.party?.[0]) ?? g.heroes[0].playerId;
};

/** bot の作戦の切り替え（memo に入れて渡す） */
export interface BotMemo {
  interacted: Set<string>;
  town?: string;
  /**
   * 人のようにまっすぐ進む（遊びの長さを測る用）。
   * レベル上げをせず、次に入れる鍵のダンジョン → 最終ダンジョンへ向かう。町は回復・船の依頼の時だけ寄る。
   */
  straight?: boolean;
  /**
   * 工夫する bot（計画書 第2版 §5-3。botClever.ts）。普通の bot に、寄り道（ランダムダンジョン・災厄）・転職・
   * 戦闘の工夫（弱点・BREAK・連携・予告への手）・休憩で技を磨く を足す。無い時は、今までの bot と同じ動き
   */
  clever?: CleverMemo;
  /**
   * 賢い bot（botSmart.ts）。工夫する bot（clever）の上に、買い物と装備・カードの選び方・消耗品・仲間の連携・時間の使い方 を足す。
   * 無い時は、工夫する bot と同じ動き
   */
  smart?: SmartMemo;
}

/** 目的のダンジョン（鍵の順。最後は魔王城） */
function goalDungeon(g: GameState, straight = false): string {
  // シナリオのダンジョンを、鍵のダンジョン（敵のレベルが低い順）→最終ダンジョンの順に回る
  const list = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && (d.rewardKey || d.finale));
  const order = [...list.filter((d) => !d.finale).sort((a, b) => a.baseLevel - b.baseLevel), ...list.filter((d) => d.finale)].map((d) => d.id);
  // まっすぐ進む時は、今の鍵で扉が開くダンジョンを先に選ぶ（開かない所へ向かって無駄足を踏まない）
  const keys = g.world?.keys ?? [];
  const open = (d: string) => (DUNGEONS.get(d).requiresKeys ?? []).every((k) => keys.includes(k));
  if (straight) {
    const next = order.find((d) => !g.clearedDungeons.includes(d) && open(d));
    if (next) return next;
  }
  return order.find((d) => !g.clearedDungeons.includes(d)) ?? order[order.length - 1];
}

function tileOf(g: GameState, kind: string, id: string): number | undefined {
  const i = g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);
  return i < 0 ? undefined : i;
}

/** 自動プレイで果たせる依頼か（徘徊する敵・名所・もう制覇したダンジョン。船の依頼は別に扱う） */
function botQuestOk(g: GameState, qid: string): boolean {
  const def = QUESTS.get(qid);
  if (def.reward.some((o) => o.kind === 'ship')) return false;
  const o = def.objective;
  return o.kind === 'defeatWanderers' || o.kind === 'visitLandmark' || (o.kind === 'clearDungeon' && g.clearedDungeons.includes(o.dungeonId));
}

/**
 * 「町の依頼」の関門のための行き先（関門が無い・満たした時は undefined）。
 * 目的のダンジョンが関門で開かない時（urgent）は遠くても行く。まだ先の時は、人と同じように「通り道の近くで」だけ
 * 依頼を受け・進め・報告する（関門のダンジョンに着いてから遠くの町へ戻ると、侵食度が上がりすぎるため）
 */
function questGateTarget(g: GameState, at: number, goal: string): { tile: number; why: 'town' | 'grind' | 'dungeon' } | undefined {
  const w = g.world!;
  const gated = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && !g.clearedDungeons.includes(d.id) && questsShort(g, d) > 0);
  if (!gated.length) return undefined;
  const goalDef = DUNGEONS.get(goal);
  const urgent = gated.includes(goalDef) && (goalDef.requiresKeys ?? []).every((k) => w.keys.includes(k));
  const reach = urgent ? Infinity : BOT_QUEST_DETOUR;
  const near = (tiles: number[]) => tiles.filter((i) => hexDistance(w, at, i) <= reach).sort((a, b) => hexDistance(w, at, a) - hexDistance(w, at, b))[0];
  // 報告できる依頼があれば、報告する町へ
  const reportTowns = w.quests.flatMap((q) => {
    const town = QUESTS.get(q.id).reportTown ?? q.town;
    // 陥落した町では報告できない
    if (q.reported || w.fallenTowns.includes(town) || !canReportQuest(g, q.id)) return [];
    const i = tileOf(g, 'town', town);
    return i === undefined ? [] : [i];
  });
  const report = near(reportTowns);
  if (report !== undefined) return { tile: report, why: 'town' };
  // 受けた依頼を進める（名所を訪ねる・徘徊する敵を倒す）
  for (const q of w.quests) {
    if (q.done || q.reported) continue;
    const o = QUESTS.get(q.id).objective;
    if (o.kind === 'visitLandmark') {
      const i = near([tileOf(g, 'landmark', o.landmarkId)].filter((x): x is number => x !== undefined));
      if (i !== undefined) return { tile: i, why: 'dungeon' };
    }
    if (o.kind === 'defeatWanderers') {
      const i = near(w.wanderers.filter((x) => !x.raidTown && !x.scourge && (urgent || w.tiles[x.tile].seen)).map((x) => x.tile));
      if (i !== undefined) return { tile: i, why: 'grind' };
    }
  }
  // まだ受けていない依頼のある町へ（もう1つ果たしていれば、新しくは受けに行かない）
  const towns = w.tiles.flatMap((t, i) =>
    t.f?.kind === 'town' && !w.fallenTowns.includes(t.f.id) && (TOWNS.get(t.f.id).quests ?? []).some((qid) => botQuestOk(g, qid) && !w.quests.some((q) => q.id === qid)) ? [i] : [],
  );
  const i = near(towns);
  return i === undefined ? undefined : { tile: i, why: 'town' };
}

/** 関門がまだ先の時に、依頼のために寄り道してよい距離（マス） */
const BOT_QUEST_DETOUR = 6;

/** 世界マップでの行き先（HPが減ったら町、レベルが足りなければ近くの敵、それ以外は次のダンジョン） */
function worldTarget(g: GameState, at: number, straight = false, cm?: CleverMemo, sm?: SmartMemo): { tile: number; why: 'town' | 'grind' | 'dungeon' } {
  const w = g.world!;
  const heroes = livingHeroes(g);
  const goal = goalDungeon(g, straight);
  // 目的のダンジョンの敵の基準レベル（ダンジョンの順番ごとの上乗せを入れた値）に届くまで、近くの敵で育てる
  const need = dungeonEnemyLevel(DUNGEONS.get(goal)) + (DUNGEONS.get(goal).finale ? 1 : 0);
  // 工夫する bot は、転職で Lv1 に戻った分を足した「育ち具合」で比べる（botClever.ts の effectiveLevel）
  const avgLv = heroes.reduce((n, h) => n + (cleverUses(cm, 'job') ? effectiveLevel(h) : h.level), 0) / heroes.length;
  // 船がもらえる依頼がまだなら、まずその町へ（海を渡るシナリオ）
  if (!w.ship) {
    const i = w.tiles.findIndex((t) => t.f?.kind === 'town' && (TOWNS.get(t.f.id).quests ?? []).some((qid) => QUESTS.get(qid).reward.some((o) => o.kind === 'ship') && !w.quests.some((q) => q.id === qid && q.reported)));
    if (i >= 0) return { tile: i, why: 'town' };
  }
  // 賢い bot（時間の使い方）: 時間が足りない時は、町へ戻るHPの線を下げ、寄り道とレベル上げをやめる。無い時は今までどおり（5割）
  const line = sm ? hurtLine(g, sm) : 0.5;
  const late = smartUses(sm, 'time') && timeLate(g);
  const hurt = heroes.some((h) => h.hp < heroMaxHp(h) * line);
  if (hurt) {
    let best: number | undefined;
    w.tiles.forEach((t, i) => {
      if (t.f?.kind !== 'town' || w.fallenTowns.includes(t.f.id) || !t.seen) return;
      // 傷ついた本人が払える町だけを候補にする。健康な仲間のお金では泊まれない。
      if (!heroes.some((h) => h.hp < heroMaxHp(h) * line && h.gold >= TOWNS.get(t.f!.id).innCost)) return;
      if (best === undefined || hexDistance(w, at, i) < hexDistance(w, at, best)) best = i;
    });
    if (best !== undefined) return { tile: best, why: 'town' };
  }
  // 賢い bot（買い物）: お金が貯まっていて、近くに町があれば、買い物に寄る（時間が足りない時は寄らない）
  if (smartUses(sm, 'shop') && !late) {
    const t = smartShopDetour(g, at, sm!);
    if (t !== undefined) return { tile: t, why: 'town' };
  }
  // 工夫する bot: 寄り道（災厄・見晴らしの塔・ランダムダンジョン）
  if (cm && cleverUses(cm, 'detour') && !late) {
    const d = cleverDetour(g, at, cm);
    if (d) return { tile: d.tile, why: d.why };
  }
  if (!straight && avgLv < need && !late) {
    // 災厄の中ボス（段階7b）には、自動プレイは挑まない（寄り道は「工夫する bot」の段階で）
    const near = w.wanderers.filter((x) => w.tiles[x.tile].seen && !x.scourge).sort((a, b) => hexDistance(w, at, a.tile) - hexDistance(w, at, b.tile))[0];
    if (near && hexDistance(w, at, near.tile) <= 6) return { tile: near.tile, why: 'grind' };
  }
  const gate = questGateTarget(g, at, goal);
  if (gate) return gate;
  return { tile: tileOf(g, 'dungeon', goal)!, why: 'dungeon' };
}

/** 各マスから to まで歩いてかかる移動力（霧・敵は見ない。地形の移動力だけ。通れないマスは入らない） */
function walkCostTo(w: WorldState, to: number): Map<number, number> {
  const dist = new Map<number, number>([[to, 0]]);
  const open = [to];
  while (open.length) {
    let k = 0;
    for (let j = 1; j < open.length; j++) if (dist.get(open[j])! < dist.get(open[k])!) k = j;
    const cur = open.splice(k, 1)[0];
    const step = dist.get(cur)! + Math.max(1, moveCostOf(w, cur));
    for (const n of neighbors(w, cur)) {
      if (moveCostOf(w, n) <= 0) continue;
      const old = dist.get(n);
      if (old === undefined || step < old) {
        dist.set(n, step);
        if (!open.includes(n)) open.push(n);
      }
    }
  }
  return dist;
}

function worldStep(g: GameState, log: BotLog, memo: BotMemo): GameState {
  const w = g.world!;
  if (w.story) return send(g, { type: 'STORY_CONTINUE', playerId: pid(g) }, log);
  const h = findHero(g, w.turn)!;
  const p = pid(g, h.id);
  const at = w.pos[h.id];
  const target = worldTarget(g, at, memo.straight, memo.clever, memo.smart);
  const key = `${w.worldTurn}:${h.id}:${at}`;
  // 目的地に着いたら入る（1手番に1回だけ）
  if (at === target.tile && !memo.interacted.has(key)) {
    memo.interacted.add(key);
    // 先に入った仲間の組が通路にいない（戦闘中など）時は合流できない: 入口で待つ
    if (target.why !== 'grind' && dungeonJoin(g, at)?.blocked) return send(g, { type: 'WORLD_WAIT', playerId: p, heroId: h.id }, log);
    if (target.why !== 'grind') {
      const ng = send(g, { type: 'WORLD_INTERACT', playerId: p, heroId: h.id, party: livingHeroes(g).filter((x) => w.pos[x.id] === at).map((x) => x.id) }, log);
      // 工夫する bot: ランダムダンジョンに入った回数を数える（挑み直しの上限のため）
      if (memo.clever && ng !== g && isRandomDungeonTile(w.tiles[at].f)) memo.clever.randomTries++;
      if (ng !== g) return ng;
    }
  }
  if (w.move === null) return send(g, { type: 'WORLD_ROLL_MOVE', playerId: p, heroId: h.id }, log);
  // 移動のサイコロの目が小さく、フォーカスに余裕があれば1回だけ振り直す（まだ動く前）
  const md = w.moveDice;
  if (md && !md.rerolled && md.face <= 2 && h.focus >= 2 && w.move === md.total && w.pos[h.id] === w.prevTile) return send(g, { type: 'WORLD_REROLL_MOVE', playerId: p, heroId: h.id }, log);
  // 同じマスの他の人のキャラは、誘って承知してもらってから一緒に動く（自動プレイは全員の代わりに答える）
  {
    for (const c of livingHeroes(g)) {
      if (c.id === h.id || c.playerId === h.playerId || w.pos[c.id] !== at || followingGroup(g, h.id).includes(c.id)) continue;
      if (g.expeditions?.some((x) => x.heroes.includes(c.id))) continue;
      if (w.invites?.[c.id] === h.id) return send(g, { type: 'WORLD_INVITE_ANSWER', playerId: c.playerId, heroId: c.id, accept: true }, log);
      return send(g, { type: 'WORLD_INVITE', playerId: p, heroId: h.id, targetId: c.id }, log);
    }
  }
  if (w.move > 0) {
    const reach = reachable(w, at, w.move);
    let best = at;
    // 広い地図（段階6a）: 仕切りの壁で行き止まりにならないように、歩いてかかる移動力で近い所を選ぶ。前の地図は今までどおり（まっすぐの距離）
    const far = isWideMap(g, w) ? walkCostTo(w, target.tile) : undefined;
    const dist = (i: number) => (far ? (far.get(i) ?? Infinity) : hexDistance(w, i, target.tile));
    // 災厄の中ボスの巣を通る道は選ばない（今の自動プレイは災厄に挑まない。段階7b）
    // 工夫する bot は、目指している災厄の巣だけは通ってよい（そこが行き先）
    const nests = new Set(w.wanderers.filter((x) => x.scourge && !(memo.clever && x.tile === target.tile)).map((x) => x.tile));
    const viaNest = (i: number) => nests.size > 0 && pathTo(reach, i).some((t) => nests.has(t));
    for (const [i] of reach) if (dist(i) < dist(best) && !viaNest(i)) best = i;
    if (best !== at) {
      const companions = livingHeroes(g)
        .filter((x) => x.id !== h.id && w.pos[x.id] === at && !g.expeditions?.some((e) => e.heroes.includes(x.id)))
        .filter((x) => x.playerId === h.playerId || followingGroup(g, h.id).includes(x.id))
        .map((x) => x.id);
      return send(g, { type: 'WORLD_MOVE', playerId: p, heroId: h.id, to: best, companions }, log);
    }
  }
  return send(g, { type: 'WORLD_WAIT', playerId: p, heroId: h.id }, log);
}

function battleStep(g: GameState, log: BotLog, memo: BotMemo): GameState {
  const b = g.battle!;
  // 賢い bot: 消耗品（倒れそう・ボス・大技の予告）
  if (b.phase === 'ally' && smartUses(memo.smart, 'items')) {
    const ng = sendSmart(g, log, memo, smartBattleItemCommand(g, memo.smart!, b));
    if (ng && ng !== g) return ng;
  }
  if (b.phase === 'ally' && cleverUses(memo.clever, 'battle')) {
    // 工夫する bot の戦闘（botClever.ts）。出す物が無ければ、下の普通の bot と同じく番を終える
    // 賢い bot の「仲間どうしの連携」は、点の直しを渡す（無い時は工夫する bot と同じ）
    const cmd = cleverBattleCommand(b, smartUses(memo.smart, 'team') ? teamAdjust(b) : undefined);
    if (cmd) return send(g, { type: 'BATTLE', command: cmd }, log);
  }
  if (b.phase === 'ally') {
    for (const a of b.allies) {
      if (cleverUses(memo.clever, 'battle')) break;
      if (isDone(b, a)) continue;
      const c = a.hand.find((x) => !unusableReason(b, a, cardOf(x), x.uid));
      if (!c) continue;
      const card = cardOf(c);
      const target = b.enemies.find((e) => !e.dead)?.uid;
      const focus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
      return send(g, { type: 'BATTLE', command: { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: c.uid, targetId: card.target === 'enemy' ? target : isAllyCard(card) ? cardTargets(g.battle!, a, card).sort((x,y) => x.hp/x.maxHp-y.hp/y.maxHp).map(unitIdOf)[0] : undefined, allyTargetId: card.secondaryTarget ? cardTargets(b, a, secondaryCard(card)).sort((x,y) => x.hp/x.maxHp-y.hp/y.maxHp).map(unitIdOf)[0] : undefined, focusUsed: focus } }, log);
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

/** 賢い bot: 戦闘の外で、その場のキャラの 行商人・闇商人の買い物（shop）と 道具（items）。送る物が無い・断られた時は undefined */
function smartOutside(g: GameState, log: BotLog, memo: BotMemo, heroes: Hero[]): GameState | undefined {
  const sm = memo.smart!;
  const picks = [() => (smartUses(sm, 'shop') ? smartPeddlerCommand(g, sm, heroes) : undefined), () => (smartUses(sm, 'items') ? smartFieldItemCommand(g, sm, heroes) : undefined)];
  for (const make of picks) {
    const ng = sendSmart(g, log, memo, make());
    if (ng && ng !== g) return ng;
  }
  return undefined;
}

export function botStep(g: GameState, log: BotLog, memo: BotMemo, inScene = false): GameState {
  // ダンジョンの場面があれば、先にそちらを進める（その場面を載せた冒険で次の操作を決めて、SCENE で送る）
  // 手番がダンジョンの中のキャラなら、そのダンジョンの場面を進める（世界マップがなければ、最初の場面）
  const exp = inScene ? undefined : g.world ? g.expeditions?.find((x) => x.heroes.includes(g.world!.turn)) : g.expeditions?.[0];
  if (exp && g.mode !== 'gameover' && g.mode !== 'ending') {
    const outer = capture;
    const outerSmart = captureSmart;
    capture = [];
    captureSmart = undefined;
    let inner: GameCommand | undefined;
    let innerSmart: SmartPick | undefined;
    try {
      botStep(viewOf(g, exp.id), log, memo, true);
      inner = capture[0];
      innerSmart = captureSmart;
    } finally {
      capture = outer;
      captureSmart = outerSmart;
    }
    // 賢い bot の操作なら、断られた時に覚える印を付けて送る
    if (inner) return send(g, { type: 'SCENE', scene: exp.id, command: inner }, log, innerSmart && memo.smart ? { pick: innerSmart, sm: memo.smart } : undefined);
  }
  log.modes[g.mode] = (log.modes[g.mode] ?? 0) + 1;
  switch (g.mode) {
    case 'world': {
      // 賢い bot（買い物と装備）: 装備は格ではなく、ジョブ・能力値・特殊能力の点で選ぶ
      if (smartUses(memo.smart, 'shop')) {
        const ng = sendSmart(g, log, memo, smartEquipCommand(g, memo.smart!));
        if (ng && ng !== g) return ng;
      } else {
        const eq = equipBest(g, log);
        if (eq !== g) return eq;
      }
      const w = g.world!;
      // 工夫する bot: 世界マップにいるキャラの、カードの作業（イベントの強化など）と転職
      if (memo.clever && !w.story && !w.moveProposal) {
        const onMap = livingHeroes(g).filter((x) => !g.expeditions?.some((e) => e.heroes.includes(x.id)));
        const cmd = cardTaskCommand(onMap) ?? (cleverUses(memo.clever, 'job') ? jobCommand(g, onMap) : undefined);
        if (cmd) return send(g, cmd, log);
      }
      // 賢い bot: 行商人の買い物・戦闘の外の道具（世界マップにいるキャラ）
      if (memo.smart && !w.story && !w.moveProposal) {
        const ng = smartOutside(g, log, memo, livingHeroes(g).filter((x) => !g.expeditions?.some((e) => e.heroes.includes(x.id))));
        if (ng) return ng;
      }
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
      if (memo.clever) noteEncounter(g, memo.clever);
      // 近くにいる他の人のキャラは「加わる」と答えてから（自動プレイは全員の代わりに答える）
      const mover = findHero(g, e.heroId)!;
      const ask = e.candidates.map((id) => findHero(g, id)!).find((c) => c.playerId !== mover.playerId && g.world!.pos[c.id] !== e.tile && e.joins?.[c.id] === undefined);
      if (ask && !e.result) return send(g, { type: 'ENCOUNTER_JOIN', playerId: ask.playerId, heroId: ask.id, join: true }, log);
      if (e.result) return send(g, { type: 'ENCOUNTER_CONTINUE', playerId: pid(g, e.heroId), participants: e.candidates }, log);
      return send(g, { type: 'ENCOUNTER_CHOOSE', playerId: pid(g, e.heroId), choice: 'fight', heroId: e.heroId, focusUsed: 0, participants: e.candidates }, log);
    }
    case 'battle':
      return battleStep(g, log, memo);
    case 'reward': {
      const r = g.reward!;
      // 賢い bot（カードの選び方）: 成長は山札に合わせ、カードは山札との相性で選ぶ（取らない、も選ぶ）
      if (smartUses(memo.smart, 'cards') && r.levelUps.length) {
        const ng = sendSmart(g, log, memo, smartGrowthCommand(g, memo.smart!));
        if (ng && ng !== g) return ng;
      }
      if (smartUses(memo.smart, 'cards') && !r.levelUps.length && !(r.claim && !r.claim.rolls) && !r.cardPicked) {
        const ng = sendSmart(g, log, memo, smartPickCardCommand(g, memo.smart!, (id) => pid(g, id)));
        if (ng && ng !== g) return ng;
      }
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
      const run = g.dungeon!;
      // 工夫する bot: 休憩で「技を磨く」を選んだ後などの、カードを1枚選ぶ作業
      if (memo.clever) {
        const cmd = cardTaskCommand(livingHeroes(g).filter((x) => !g.party || g.party.includes(x.id)));
        if (cmd) return send(g, cmd, log);
      }
      // 賢い bot: ダンジョンの中でも、拾った装備を付け、闇商人・行商人で買い、傷が深ければ薬を使う
      if (memo.smart) {
        const party = livingHeroes(g).filter((x) => !g.party || g.party.includes(x.id));
        if (smartUses(memo.smart, 'shop')) {
          const ng = sendSmart(g, log, memo, smartEquipCommand(g, memo.smart));
          if (ng && ng !== g) return ng;
        }
        const ng = smartOutside(g, log, memo, party);
        if (ng) return ng;
      }
      // 扉は左から右の順（画面の扉のボタンと同じ並び）
      const rooms = [...reachableRooms(run)].sort((a, b) => a.col - b.col);
      const hurt = livingHeroes(g).some((h) => h.hp < heroMaxHp(h) * 0.5);
      // 普通の bot は、扉の予兆の色だけを見て選ぶ（人と同じ情報。部屋の中身は読まない）: 傷ついていれば緑（休憩）、そうでなければ金（宝）、無ければ左端。
      // 直行 bot は予兆を見ない: いつも左端の扉（抜本的な見直し §3-1）
      const pick = memo.straight ? rooms[0] : (rooms.find((r) => omenOfType(r.type) === (hurt ? 'rest' : 'treasure')) ?? rooms[0]);
      if (!pick) return g;
      return send(g, { type: 'ENTER_ROOM', playerId: pid(g), roomId: pick.id }, log);
    }
    case 'chest': {
      const c = g.chest!;
      // 2人以上で開けた宝箱の取り合い（戦闘の装備と同じ: 最初のキャラは「欲しい」、ほかは「余れば」）
      const ci = c.claims?.findIndex((x) => !x.rolls) ?? -1;
      if (ci >= 0) {
        const cl = c.claims![ci];
        const id = cl.heroes.find((x) => !cl.choices[x])!;
        return send(g, { type: 'CLAIM_LOOT', playerId: pid(g, id), heroId: id, choice: id === cl.heroes[0] ? 'need' : 'greed', index: ci }, log);
      }
      if (c.contents) return send(g, { type: 'LEAVE_CHEST', playerId: pid(g) }, log);
      // 封魔の宝箱: 普通の bot は、だれかのHPが半分より少ない時は封印を解かずに立ち去る。直行 bot はいつも解く
      if (sealStep(c) === 'sealed' && !memo.straight && livingHeroes(g).some((x) => (!g.party || g.party.includes(x.id)) && x.hp < heroMaxHp(x) * 0.5)) return send(g, { type: 'LEAVE_CHEST', playerId: pid(g) }, log);
      // 世界マップの宝箱は、手番のキャラの担当の人のキャラで開ける
      const turnOwner = g.world && c.tile !== undefined && !g.activeScene ? findHero(g, g.world.turn)?.playerId : undefined;
      const inParty = livingHeroes(g).filter((x) => !g.party || g.party.includes(x.id));
      const first = inParty.find((x) => !turnOwner || x.playerId === turnOwner) ?? inParty[0];
      // 2人以上: 開け役をみんなで決めてから、そのキャラで開ける
      if (chestShared(g) && !c.opener) return send(g, { type: 'CHEST_OPENER', playerId: first.playerId, heroId: first.id }, log);
      const h = (c.opener ? findHero(g, c.opener) : undefined) ?? first;
      const ng = send(g, { type: 'OPEN_CHEST', playerId: h.playerId, heroId: h.id, focusUsed: 0 }, log);
      if (ng.chest && !ng.chest.unlocked && ng.chest.lastRoll?.success === false) return send(ng, { type: 'LEAVE_CHEST', playerId: pid(g) }, log);
      return ng;
    }
    case 'event': {
      const ev = g.event!;
      if (ev.result) return send(g, { type: 'FINISH_EVENT', playerId: pid(g) }, log);
      const def = EVENTS.get(ev.eventId);
      const party = livingHeroes(g).filter((x) => (!g.party || g.party.includes(x.id)) && (g.activeScene || ev.tile === undefined || !g.world || x.id === g.world.turn));
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
    case 'rest': {
      if (memo.clever) {
        // 工夫する bot: 休憩部屋でも中位へ転職できる。HPに余裕があれば「技を磨く」
        const scene = livingHeroes(g).filter((x) => !g.party || g.party.includes(x.id));
        const job = cleverUses(memo.clever, 'job') ? jobCommand(g, scene) : undefined;
        if (job) return send(g, job, log);
        return send(g, { type: 'REST', playerId: pid(g), kind: cleverUses(memo.clever, 'hone') ? restKind(scene) : 'hp' }, log);
      }
      return send(g, { type: 'REST', playerId: pid(g), kind: 'hp' }, log);
    }
    case 'cleared':
      return send(g, { type: 'RETURN_TO_HUB', playerId: pid(g) }, log);
    case 'town': {
      const t = g.town!;
      // 工夫する bot: 町（聖堂）で転職する（中位→最上位はここか祠・神殿）
      if (cleverUses(memo.clever, 'job')) {
        const job = jobCommand(g, livingHeroes(g).filter((x) => !g.expeditions?.some((e) => e.heroes.includes(x.id))));
        if (job) return send(g, job, log);
      }
      // 船がもらえる依頼（報酬に ship がある）は、受けてすぐ報告する（海を渡るシナリオの最初の町）
      for (const qid of TOWNS.get(t.townId).quests ?? []) {
        if (!QUESTS.get(qid).reward.some((o) => o.kind === 'ship')) continue;
        const q = g.world!.quests.find((x) => x.id === qid);
        if (!q) return send(g, { type: 'QUEST_ACCEPT', playerId: pid(g), questId: qid }, log);
        if (!q.reported && canReportQuest(g, qid)) return send(g, { type: 'QUEST_REPORT', playerId: pid(g), questId: qid }, log);
      }
      // 施設はキャラごとに利用する。同じ担当の2人目も、本人を指定して宿泊する。
      const v = facilityMembers(g)
        .filter(id => !t.finished?.includes(id))
        .map(id => findHero(g, id)!)
        .find(h => h.hp > 0 && h.hp < heroMaxHp(h) && h.gold >= TOWNS.get(t.townId).innCost);
      if (v) return send(g, { type: 'TOWN_INN', playerId: v.playerId, heroId: v.id }, log);
      // 賢い bot: 売る・買う（shop）・カードを削る（cards）。宿代の分のお金は残す
      if (memo.smart) {
        const sm = memo.smart;
        sm.lastShop = g.world!.worldTurn;
        // 1つずつ順に作る（前の物を送る時は、後の物を作らない）
        const picks = [
          () => (smartUses(sm, 'shop') ? smartEquipCommand(g, sm) : undefined),
          () => (smartUses(sm, 'shop') ? smartTownShopCommand(g, sm) : undefined),
          () => (smartUses(sm, 'cards') ? smartTownCardCommand(g, sm) : undefined),
          () => (smartUses(sm, 'cards') ? smartRemoveCardCommand(g, sm) : undefined),
        ];
        for (const make of picks) {
          const ng = sendSmart(g, log, memo, make());
          if (ng && ng !== g) return ng;
        }
      }
      // ほかの依頼（3つ目の鍵のダンジョンの関門）: 果たせそうなものを受け、果たしたものは報告する
      for (const qid of TOWNS.get(t.townId).quests ?? []) {
        const q = g.world!.quests.find((x) => x.id === qid);
        if (!q && botQuestOk(g, qid)) return send(g, { type: 'QUEST_ACCEPT', playerId: pid(g), questId: qid }, log);
      }
      for (const q of g.world!.quests) {
        if (q.reported || (QUESTS.get(q.id).reportTown ?? q.town) !== t.townId || !canReportQuest(g, q.id)) continue;
        return send(g, { type: 'QUEST_REPORT', playerId: pid(g), questId: q.id }, log);
      }
      return send(g, { type: 'LEAVE_TOWN', playerId: pid(g) }, log);
    }
    case 'sanctuary': {
      // 工夫する bot: 神殿・祭壇で転職する（特殊職・最上位）
      if (cleverUses(memo.clever, 'job')) {
        const job = jobCommand(g, livingHeroes(g).filter((x) => !g.expeditions?.some((e) => e.heroes.includes(x.id))));
        if (job) return send(g, job, log);
      }
      return send(g, { type: 'LEAVE_SANCTUARY', playerId: pid(g) }, log);
    }
    case 'shrine': {
      const s = g.shrine!;
      if (cleverUses(memo.clever, 'job')) {
        const job = jobCommand(g, livingHeroes(g).filter((x) => !g.expeditions?.some((e) => e.heroes.includes(x.id))));
        if (job) return send(g, job, log);
      }
      if (s.result) return send(g, { type: 'LEAVE_SHRINE', playerId: pid(g) }, log);
      return send(g, { type: 'SHRINE_CHOOSE', playerId: pid(g, s.heroId), optionIndex: 0, heroId: s.heroId }, log);
    }
    case 'hub':
      return send(g, { type: 'ENTER_DUNGEON', playerId: pid(g), dungeonId: goalDungeon(g, memo.straight) }, log);
    default:
      return g;
  }
}

/** 次に送る操作を決める（状態は変えない）。何もすることがなければ null */
export function botNextCommand(g: GameState, memo: BotMemo): GameCommand | null {
  capture = [];
  try {
    botStep(g, { steps: 0, errors: [], modes: {} }, memo);
    return capture[0] ?? null;
  } finally {
    capture = null;
  }
}

/**
 * エンディングかゲームオーバーまで自動で遊ぶ（opts.straight = 人のようにまっすぐ進む。opts.clever = 工夫する bot。
 * opts.smart = 賢い bot（工夫する bot ＋ 5つの工夫。smartOff で1つずつ外せる）。BotMemo を参照）
 */
export function playToEnd(g: GameState, maxSteps = 60000, opts: { straight?: boolean; clever?: boolean; cleverOff?: CleverPart[]; smart?: boolean; smartOff?: SmartPart[] } = {}): { game: GameState; log: BotLog } {
  const log: BotLog = { steps: 0, errors: [], modes: {} };
  const memo: BotMemo = { interacted: new Set<string>(), straight: opts.straight };
  if (opts.clever || opts.smart) memo.clever = newCleverMemo(opts.cleverOff);
  if (opts.smart) memo.smart = newSmartMemo(opts.smartOff);
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
