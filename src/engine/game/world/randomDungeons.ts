// ===== 世界マップのランダムダンジョン（段階7a・overhaul-plan-v2 §4） =====
// テーマはマスに記録する（f.theme）。同じ地図の2か所は別のテーマ。制覇したら f.used（踏破済み）で閉じる（1か所1回）
import { DUNGEONS } from '../../../data/dungeons';
import { DUNGEON_THEMES } from '../../../data/rules';
import type { DungeonThemeDef, MapFeature, WorldState } from '../../../types';
import { shuffle, type Rng } from '../../rng';
import { dungeonTheme, themedDungeonName } from '../dungeon';

/** そのマスがランダムダンジョンの入口か */
export const isRandomDungeonTile = (f: MapFeature | undefined): f is MapFeature => f?.kind === 'dungeon' && !!DUNGEONS.tryGet(f.id)?.random;

/** そのシナリオで選べるテーマ（シナリオの欄が無い物と、そのシナリオの物。データの順） */
export const themesForScenario = (scenarioId: string | undefined): DungeonThemeDef[] => DUNGEON_THEMES.all.filter((t) => !t.scenario || t.scenario === scenarioId);

/** 地図のランダムダンジョンのマス（左上から） */
const randomDungeonTiles = (w: WorldState) => w.tiles.flatMap((t, i) => (isRandomDungeonTile(t.f) ? [i] : []));

/**
 * 新しい地図を作った時: ランダムダンジョンのマスにテーマを付ける（冒険の地図の Rng。地図を作り終えてから引くので、ほかの物の置き方は変わらない）。
 * テーマを混ぜて、マスの順に配る（2か所なら必ず別のテーマ。テーマより多い時は、もう一周する）
 */
export function assignDungeonThemes(w: WorldState, rng: Rng) {
  const tiles = randomDungeonTiles(w);
  // そのシナリオで選べるテーマ（シナリオだけのテーマはデータの最後なので、ほかのシナリオは前と同じ並び・同じ乱数の引き方。2026-11-14）
  const themes = themesForScenario(DUNGEONS.scenarioOf(w.tiles[tiles[0]]?.f?.id ?? ''));
  if (!tiles.length || !themes.length) return;
  const order = shuffle(themes.map((t) => t.id), rng);
  tiles.forEach((i, k) => (w.tiles[i].f!.theme = order[k % order.length]));
}

/**
 * そのマスのテーマ（無ければ決めて記録する）。古い保存の地図にはテーマが無いので、初めて入る時に決める。
 * 乱数は引かない: ほかのランダムダンジョンのマスで使っていないテーマの、データの順で最初の物（全部使っていれば、マスの番号で選ぶ）。
 * 保存して再開しても・オンラインでも同じになる
 */
export function ensureTileTheme(w: WorldState, tile: number): string | undefined {
  const f = w.tiles[tile]?.f;
  if (!isRandomDungeonTile(f)) return undefined;
  if (f.theme && dungeonTheme(f.theme)) return f.theme;
  // シナリオだけのテーマ（scenario）は選ばない: 古い保存のテーマ決めを、テーマを足す前と同じにする（2026-11-14）
  const all = DUNGEON_THEMES.all.filter((t) => !t.scenario);
  if (!all.length) return undefined;
  const used = new Set(randomDungeonTiles(w).filter((i) => i !== tile).map((i) => w.tiles[i].f!.theme));
  const theme = all.find((t) => !used.has(t.id)) ?? all[tile % all.length];
  f.theme = theme.id;
  return theme.id;
}

/** 画面用: そのマスのランダムダンジョンの名前・テーマ・踏破済みか（テーマが未定の古い保存はテーマ無し） */
export function randomDungeonView(w: WorldState, tile: number): { name: string; theme?: DungeonThemeDef; done: boolean } | undefined {
  const f = w.tiles[tile]?.f;
  if (!isRandomDungeonTile(f)) return undefined;
  const def = DUNGEONS.get(f.id);
  const theme = dungeonTheme(f.theme);
  return { name: themedDungeonName(def, theme?.id), theme, done: !!f.used };
}
