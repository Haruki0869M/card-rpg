// ===== 災厄だけが落とす装備（シナリオ2の作り直し 区切り3a・docs/tasks/scenario2-rework-plan.md §2-2・§8-2）=====
// シナリオの伝説品を、そのシナリオの災厄の専用の装備に移す（ItemDef.scourgeGear = 落とす災厄の ID）。
// 印のある品は、次の3つが全部そろう冒険でだけ、宝箱・店・ドロップ・行商人・闇商人に出ない（災厄が必ず落とす）:
//   1. その災厄が登録されている（SCOURGES にある。専用の装備がその品）
//   2. その冒険のシナリオに出る災厄の一覧（ScenarioMapDef.scourges。省略は全部）に入っている
//   3. 広い地図の冒険（古い 8×35 の地図の保存では、今までどおり宝箱・店から出る。災厄が出ないので、取れない品を作らない）
// 災厄がまだ登録されていない間（区切り3a の時点）は、印があっても今までどおり出る。乱数は引かない（候補から外すだけ）
import { ITEMS } from '../../../data/items';
import { getScenario } from '../../../data/scenarios';
import { SCOURGES } from '../../../data/world';
import type { GameState, ItemDef } from '../../../types';
import { isWideMap } from './lanes';

const NONE: ReadonlySet<string> = new Set();

/** その品は、この冒険では災厄だけが落とすか（上の3つがそろう） */
export function heldByScourge(game: Pick<GameState, 'scenarioId' | 'world'>, item: Pick<ItemDef, 'id' | 'scourgeGear' | 'scenario'>): boolean {
  const sid = item.scourgeGear;
  if (!sid || !game.world || !isWideMap(game, game.world)) return false;
  if (SCOURGES.tryGet(sid)?.gear !== item.id) return false;
  // ほかのシナリオの限定品は、もともとその冒険の宝箱・店に出ない（外す必要が無い）
  if (item.scenario && item.scenario !== game.scenarioId) return false;
  const list = getScenario(game.scenarioId).map?.scourges;
  return !list || list.includes(sid);
}

/** この冒険で、宝箱・店などから外す品の ID（無ければ空） */
export function scourgeHeldGear(game: Pick<GameState, 'scenarioId' | 'world'>): ReadonlySet<string> {
  const ids = ITEMS.all.filter((i) => i.scourgeGear && heldByScourge(game, i)).map((i) => i.id);
  return ids.length ? new Set(ids) : NONE;
}
