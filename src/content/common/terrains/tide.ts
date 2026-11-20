// 潮の地形（シナリオ3「呪われた群島」の作り直し §3-1。docs/tasks/scenario3-rework-plan.md）。シナリオの地図が使った時だけ出る。
// 潮は世界の時間で決まる（朝・昼 = 満ち潮、夕方・夜 = 引き潮。engine/game/world/time.ts tideOf。乱数は使わない）。
// 3つとも moveCost は 0（地図の生成・敵・陸の歩ける所の計算では「通れない」= 何も置かれず、敵も入らない）。
// 潮のマスの移動の計算は hex.ts moveCostOf だけ（開いている間は移動力1。閉じていても、入る向きだけ閉じる = オーナーの決定 6-A）。
// 色・模様・開閉の見た目は絵のセッション（src/components/world/）の担当。ここの color は仮の色
import type { TerrainDef } from '../../../types';

export const tideTerrains: TerrainDef[] = [
  // 暗礁: 歩いても船でも通れない（海でない・移動力0）。海の仕切り・入り江の壁に使う
  { id: 'reef', order: 20, name: '暗礁', moveCost: 0, color: '#3f6f78', decor: 'cracks', background: 'sea' },
  // 潮の水道: 満ち潮（朝・昼）の間だけ、船で通れる
  { id: 'tideChannel', order: 21, name: '潮の水道', moveCost: 0, tide: 'high', tideShip: true, shipCost: 1, color: '#2f7fa8', decor: 'waves', background: 'sea' },
  // 干潟: 引き潮（夕方・夜）の間だけ、歩いて渡れる
  { id: 'tideFlat', order: 22, name: '干潟', moveCost: 0, tide: 'low', color: '#9c8f6e', decor: 'reeds', background: 'sea' },
];
