// ===== スタート地点のマス =====
// 地図の大きさを変えた後（道を長くした時）も、古い保存データの地図はそのまま使う。
// そのため、シナリオの start の位置ではなく「スタートの町が置かれたマス」を探す（見つからない時だけ start の位置。地図の外なら最後のマス）
import { getScenario } from '../../../data/scenarios';
import type { GameState, WorldState } from '../../../types';
import { idxOf } from './hex';

export function startTileOf(game: Pick<GameState, 'scenarioId'>, w: Pick<WorldState, 'width' | 'height' | 'tiles'>): number {
  const map = getScenario(game.scenarioId).map!;
  const here = idxOf(w, map.start[0], map.start[1]);
  // 幅も見る（段階6a で幅が 8 → 15 に変わった。前の幅の地図は、スタートの町を探す）
  if (map.height === w.height && map.width === w.width) return here;
  const startFeature = map.features.find((f) => f.at[0] === map.start[0] && f.at[1] === map.start[1]);
  const i = startFeature ? w.tiles.findIndex((t) => t.f?.kind === startFeature.kind && t.f.id === startFeature.id) : -1;
  if (i >= 0) return i;
  return Math.min(here, w.tiles.length - 1);
}
