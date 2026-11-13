// ===== 道案内（回1・play-feedback-1113-plan §2 ①②）=====
// 「次の目的」の行・扉が開かない時の文・通り過ぎた時の知らせ・分かれ道の立て札・災厄の場所の文を作る。
// 全部、純粋な関数（乱数を引かない・ゲームの状態を変えない）。表示と、乱数を使わない計算だけに使う。
import { DUNGEONS } from '../../../data/dungeons';
import { getScenario } from '../../../data/scenarios';
import { TERRAINS } from '../../../data/world';
import type { GameState, WorldState } from '../../../types';
import { colOf, hexDistance, linePath, neighbors, pathTo, reachable, rowOf } from './hex';
import { isWideMap, laneOfCol, nextGoalDungeon } from './lanes';
import { questsShort } from './questGate';
import { isRandomDungeonTile } from './randomDungeons';
import { dungeonTheme } from '../dungeon';

type StoryPage = NonNullable<WorldState['story']>;

/** 8つの方角（東から反時計回り） */
const DIRS = ['東', '北東', '北', '北西', '西', '南西', '南', '南東'] as const;

/** from から to を見た方角（8つ）。同じマスなら '' */
export function direction8(w: Pick<WorldState, 'width'>, from: number, to: number): string {
  if (from === to) return '';
  // 奇数の行は半マス右にずれている。行の間隔は √3/2
  const x = (i: number) => colOf(w, i) + 0.5 * (rowOf(w, i) & 1);
  const y = (i: number) => rowOf(w, i) * 0.866;
  const dx = x(to) - x(from);
  const dy = y(to) - y(from);
  // 地図の上が北。画面の y は下向きなので、上下を逆にして角度を測る
  const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  return DIRS[((Math.round(deg / 45) % 8) + 8) % 8];
}

/** 帯の言い方（広い地図だけ。中央の帯は付けない） */
const LANE_SUFFIX: Record<string, string> = { west: 'の西', east: 'の東' };

/** マスの地域の言い方: 広い地図は「嘆きの沼の東」（中央の帯は「嘆きの沼」）、前の広さの地図は地域の名前だけ */
export function placeName(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height' | 'tiles'>, tile: number): string {
  const def = getScenario(game.scenarioId).map;
  const t = w.tiles[tile];
  if (!def || !t) return '';
  const region = def.regions[t.r]?.name ?? '';
  if (!isWideMap(game, w)) return region;
  const lane = laneOfCol(def, colOf(w, tile))?.id;
  return region + (lane ? (LANE_SUFFIX[lane] ?? '') : '');
}

/** 「南東・嘆きの沼の東」（同じマスなら地域だけ） */
export function whereText(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height' | 'tiles'>, from: number | undefined, tile: number): string {
  const dir = from === undefined ? '' : direction8(w, from, tile);
  const place = placeName(game, w, tile);
  return [dir, place].filter(Boolean).join('・');
}

/** ダンジョンのマス（無ければ -1） */
export function dungeonTile(w: Pick<WorldState, 'tiles'>, dungeonId: string): number {
  return w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === dungeonId);
}

export interface GuideGoal {
  dungeonId: string;
  name: string;
  tile: number;
  /** 扉を開けるのに、あといくつ町の依頼を果たすか（0 = 依頼の関門は無い） */
  questsShort: number;
}

/** 次の目的（鍵の順 → 鍵がそろえば最後のダンジョン）。地図に無ければ undefined */
export function guideGoal(game: GameState): GuideGoal | undefined {
  const w = game.world;
  if (!w) return undefined;
  const id = nextGoalDungeon(game);
  if (!id) return undefined;
  const tile = dungeonTile(w, id);
  if (tile < 0) return undefined;
  const def = DUNGEONS.get(id);
  return { dungeonId: id, name: def.name, tile, questsShort: questsShort(game, def) };
}

/** 「次の目的」の行の文（from = 方角を測るマス） */
export function goalLineText(game: GameState, goal: GuideGoal, from: number | undefined): string {
  if (goal.questsShort > 0) return `次の目的: 町の依頼をあと${goal.questsShort}つ果たす（「${goal.name}」の扉が開く）`;
  const where = from === goal.tile ? 'ここ' : whereText(game, game.world!, from, goal.tile);
  return `次の目的: ${goal.name}（${where}）`;
}

/**
 * 「次の目的」の短い形（回1の追加。高さ700px未満の画面で、操作のパネルの行に出す）: 「次: 沈黙の地下墓所（東）」。
 * 方角だけ（地域は付けない）。同じマスなら「ここ」
 */
export function goalShortText(game: GameState, goal: GuideGoal, from: number | undefined): string {
  if (goal.questsShort > 0) return `次: 町の依頼をあと${goal.questsShort}つ`;
  const dir = from === undefined ? '' : from === goal.tile ? 'ここ' : direction8(game.world!, from, goal.tile);
  return dir ? `次: ${goal.name}（${dir}）` : `次: ${goal.name}`;
}

/**
 * 施設へ向かう道（回1の追加。移動力が足りない施設を押した時）。読むだけで、ゲームの状態は変えない・乱数も引かない。
 * 移動できるマスの計算（reachable）を、移動力の上限なしで使う（霧の中には入らない・敵のいるマスの先へは進めない、の決まりも同じ）。
 * total = その施設までに要る移動力（地形のコストの合計）、stop = その道のうち、この番の移動力 move で行ける一番先のマス
 * （1マスも進めなければ undefined）。道が無ければ undefined
 */
export function routeToward(w: WorldState, from: number, target: number, move: number): { total: number; stop?: number } | undefined {
  const all = reachable(w, from, Infinity);
  const end = all.get(target);
  if (!end || target === from) return undefined;
  let stop: number | undefined;
  for (const p of pathTo(all, target)) if (all.get(p)!.cost <= move) stop = p;
  return { total: end.cost, stop };
}

/**
 * 町のうわさ（回1の追加）: その町からいちばん近い、まだ踏破していないランダムダンジョン1つ。
 * 「うわさ: 嘆きの沼の東に、古代の晶洞があるらしい」。無ければ undefined。乱数は使わない（同じ近さなら、マスの番号の小さい方）
 */
export function rumorText(game: Pick<GameState, 'scenarioId'>, w: WorldState, fromTile: number): string | undefined {
  let best = -1;
  let bd = Infinity;
  w.tiles.forEach((t, i) => {
    if (!isRandomDungeonTile(t.f) || t.f.used) return;
    const d = hexDistance(w, fromTile, i);
    if (d < bd) (bd = d), (best = i);
  });
  if (best < 0) return undefined;
  const f = w.tiles[best].f!;
  const name = dungeonTheme(f.theme)?.name ?? DUNGEONS.get(f.id).name;
  const place = placeName(game, w, best);
  return place ? `うわさ: ${place}に、${name}があるらしい` : `うわさ: どこかに、${name}があるらしい`;
}

/**
 * 通り過ぎた時の知らせ: まだ鍵を取っていない鍵のダンジョン（次の目的）がある地域を出て、新しい地域に初めて入った時。
 * newRegion = 入った地域、from = 入ったマス。知らせることが無ければ undefined
 */
export function passByNotice(game: GameState, w: WorldState, newRegion: number, from: number): StoryPage | undefined {
  const goal = guideGoal(game);
  if (!goal || goal.questsShort > 0) return undefined;
  const def = DUNGEONS.get(goal.dungeonId);
  if (def.finale || !def.rewardKey) return undefined;
  const goalRegion = w.tiles[goal.tile].r;
  // 目的地の地域に、もう入ったことがあって、そこを出て別の地域に入った時だけ
  if (goalRegion === newRegion || !w.visitedRegions.includes(goalRegion)) return undefined;
  const keyName = getScenario(game.scenarioId).story?.keys?.[def.rewardKey] ?? def.rewardKey;
  return {
    title: 'まだ行っていない場所',
    lines: [`まだ「${def.name}」に行っていない（${whereText(game, w, from, goal.tile)}）。`, `この先のダンジョンには、${keyName}が要る。`],
  };
}

/** 出ている物語の窓が変わった印（閉じた・中身が入れ替わった）。古い窓への「つづける」を見分ける（点検 2026-11-13 F6） */
export function bumpStoryVer(w: WorldState) {
  w.storyVer = (w.storyVer ?? 0) + 1;
}

/** 物語の窓に出す。もう出ている時は、その窓を閉じた後に別の窓で出す（後ろに足さない） */
export function queueStory(w: WorldState, page: StoryPage) {
  if (w.story) (w.storyQueue ??= []).push(page);
  else w.story = page;
}

// ---------- 分かれ道の立て札 ----------

export interface Signpost {
  /** 立て札を立てるマス（街道の側の、脇道が分かれるマス） */
  tile: number;
  dungeonId: string;
  name: string;
  /** 立て札から見たダンジョンの方角と、脇道を歩くマスの数 */
  dir: string;
  steps: number;
}

/**
 * 分かれ道の立て札（広い地図だけ）: 街道（地図のデータの点を、地図を作る時と同じ線で結んだマス）から、鍵のダンジョンへ脇道が分かれるマス。
 * 地図の道のデータだけから決める（乱数を使わない。保存に何も足さないので、古い保存の地図にもそのまま出る）
 */
export function signposts(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height' | 'tiles'>): Signpost[] {
  const def = getScenario(game.scenarioId).map;
  if (!def?.highway?.length || !isWideMap(game, w)) return [];
  const road = def.roadTerrain;
  const isRoad = (i: number) => w.tiles[i].t === road;
  // 街道のマス（海の上には道を引かないので、道のマスだけ）
  const highway = new Set<number>();
  const pts = def.highway.map(([c, r]) => r * w.width + c);
  for (let k = 1; k < pts.length; k++) for (const p of linePath(w, pts[k - 1], pts[k])) if (isRoad(p) && !TERRAINS.get(w.tiles[p].t).sea) highway.add(p);
  const out: Signpost[] = [];
  for (const d of DUNGEONS.forScenario(game.scenarioId)) {
    if (d.random || d.finale || !d.rewardKey) continue;
    const at = dungeonTile(w, d.id);
    if (at < 0 || highway.has(at)) continue;
    // ダンジョンから道のマスだけを歩いて、一番近い街道のマスを探す（幅優先。並びは決まっているので、いつも同じマス）。
    // 同じ近さの街道のマスが2つ以上ある時は、宝箱・イベントなどの無いマスを選ぶ（立て札が絵と重ならないように）
    const dist = new Map<number, number>([[at, 0]]);
    let layer = [at];
    let fork: number | undefined;
    while (layer.length && fork === undefined) {
      const next: number[] = [];
      const found: number[] = [];
      for (const cur of layer) {
        for (const n of neighbors(w, cur)) {
          if (dist.has(n) || !isRoad(n)) continue;
          dist.set(n, dist.get(cur)! + 1);
          if (highway.has(n)) found.push(n);
          else next.push(n);
        }
      }
      if (found.length) fork = found.find((i) => !w.tiles[i].f) ?? found[0];
      layer = next;
    }
    if (fork === undefined || w.tiles[fork].f?.kind === 'town') continue;
    out.push({ tile: fork, dungeonId: d.id, name: d.name, dir: direction8(w, fork, at), steps: dist.get(fork)! });
  }
  return out;
}

/** 立て札の文: 「→ 東へ4マス: 静寂の地下墓地」 */
export const signpostText = (s: Signpost) => `→ ${s.dir}へ${s.steps}マス: ${s.name}`;

// ---------- 災厄の場所 ----------

/** 災厄の場所の文（正確なマスが見えていない時は、地域だけ） */
export function scourgePlaceText(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height' | 'tiles'>, tile: number, seen: boolean): string {
  return seen ? '場所: 地図の💀の所' : `場所: ${placeName(game, w, tile)}（くわしい場所は、塔に登ると分かる）`;
}
