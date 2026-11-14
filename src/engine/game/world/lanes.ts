// ===== 広い地図（段階6a・overhaul-plan-v2 §2）: 帯・街道ボーナス・次の目的地 =====
// 「広い地図」= シナリオの地図のデータに帯（lanes）があり、保存されている地図がそのデータと同じ大きさの時。
// 前の幅の地図（古い保存）では、帯も街道ボーナスも使わない（地図は作り直さないので、今までどおりに遊べる）。
import { DUNGEONS } from '../../../data/dungeons';
import { getScenario } from '../../../data/scenarios';
import { TERRAINS } from '../../../data/world';
import type { DiceRoll, GameState, LaneDef, ScenarioMapDef, WorldState } from '../../../types';
import { colOf } from './hex';
import { scourgeCurse, scourgesWith } from './scourgeCurse';

/** この冒険の地図が、帯のある広い地図か（古い保存の前の幅の地図なら false） */
export function isWideMap(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height'>): boolean {
  const def = getScenario(game.scenarioId).map;
  return !!def?.lanes?.length && def.width === w.width && def.height === w.height;
}

/** 列の帯（帯の無い地図・範囲の外は undefined） */
export function laneOfCol(def: Pick<ScenarioMapDef, 'lanes'>, col: number): LaneDef | undefined {
  return def.lanes?.find((l) => col >= l.cols[0] && col <= l.cols[1]);
}

/** マスの帯の id（広い地図でなければ undefined） */
export function laneOfTile(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height'>, i: number): string | undefined {
  if (!isWideMap(game, w)) return undefined;
  return laneOfCol(getScenario(game.scenarioId).map!, colOf(w, i))?.id;
}

/** マスの帯（広い地図でなければ undefined）。3つの道（2026-11-14）: 敵の出方・夜襲・説明に使う */
export function laneDefOfTile(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height'>, i: number): LaneDef | undefined {
  if (!isWideMap(game, w)) return undefined;
  return laneOfCol(getScenario(game.scenarioId).map!, colOf(w, i));
}

/**
 * 立っているマスの地形の、移動のサイコロのボーナス（街道 +1）。広い地図の時だけ。船の上（海）では付かない。
 * 災厄の悪さ「街道が雪に埋もれる」（凍て鐘の亡霊。区切り3a）が生きている間は、そのシナリオの街道（roadTerrain）のボーナスだけ無くなる（湖の氷などは残る）
 */
export function terrainDiceBonus(game: Pick<GameState, 'scenarioId'>, w: WorldState, tile: number | undefined): DiceRoll['bonus'] {
  if (tile === undefined || !isWideMap(game, w)) return [];
  const t = TERRAINS.get(w.tiles[tile].t);
  if (t.sea || !t.moveDiceBonus) return [];
  if (roadBuriedAt(game, w, tile)) return [];
  return [{ label: t.name, value: t.moveDiceBonus }];
}

/** そのマスが、雪に埋もれた街道か（広い地図・街道のマス・「街道が雪に埋もれる」悪さの災厄が生きている）。乱数は引かない */
export function roadBuriedAt(game: Pick<GameState, 'scenarioId'>, w: WorldState, tile: number | undefined): boolean {
  if (tile === undefined || !isWideMap(game, w)) return false;
  const road = getScenario(game.scenarioId).map?.roadTerrain;
  return !!road && w.tiles[tile]?.t === road && scourgeCurse({ world: w }).buryRoad;
}

/**
 * サイコロの画面に出す短い文（雪に埋もれた街道の上にいる時だけ。ほかは undefined）。
 * 例: 「❄ 街道が雪に埋もれている（凍て鐘の亡霊のせいで、街道ボーナス +1 が無い）」
 */
export function roadBuriedNote(game: Pick<GameState, 'scenarioId'>, w: WorldState, tile: number | undefined): string | undefined {
  if (!roadBuriedAt(game, w, tile)) return undefined;
  const t = TERRAINS.get(w.tiles[tile!].t);
  const who = scourgesWith({ world: w }, 'buryRoad').map((d) => d.name).join('・');
  return `❄ ${t.name}が雪に埋もれている（${who}のせいで、${t.name}ボーナス +${t.moveDiceBonus ?? 0} が無い）`;
}

/**
 * 次の目的地のダンジョン（見取り図で光らせる）: 鍵の要る扉が開く、まだ制覇していない鍵のダンジョン（敵のレベルが低い順）。
 * 鍵がそろえば最後のダンジョン。どれも無ければ undefined
 */
export function nextGoalDungeon(game: Pick<GameState, 'scenarioId' | 'clearedDungeons' | 'world'>): string | undefined {
  const keys = game.world?.keys ?? [];
  const list = DUNGEONS.forScenario(game.scenarioId).filter((d) => !d.random && (d.rewardKey || d.finale));
  const order = [...list.filter((d) => !d.finale).sort((a, b) => a.baseLevel - b.baseLevel), ...list.filter((d) => d.finale)];
  return order.find((d) => !game.clearedDungeons.includes(d.id) && (d.requiresKeys ?? []).every((k) => keys.includes(k)))?.id;
}
