// ===== 潮（シナリオ3「呪われた群島」の作り直し §3-1・オーナーの決定 6-A） =====
// 潮は世界の時間で決まる（time.ts tideOf: 朝・昼 = 満ち潮、夕方・夜 = 引き潮）。乱数は使わないので、保存して再開しても、オンラインの2台でも同じ。
// 潮のマス（地形の tide）は、開いている潮の間だけ通れる。閉じていても「入る向きだけ閉じる」（hex.ts moveCostOf）。
// ここは画面の札・マスの説明の文と、閉じ込められるマスが無いかの確かめ（テスト・測定用）。ゲームの状態は変えない
import { getTerrain } from '../../../data/world';
import type { TerrainDef, WorldState } from '../../../types';
import { moveCostOf, neighbors, reachable } from './hex';
import { TIDE_NAME, tideNow, turnsUntilTideChange, type Tide } from './time';

/** 潮の印（札の頭）: 満ち潮 = 波・引き潮 = 貝 */
export const TIDE_ICON: Record<Tide, string> = { high: '🌊', low: '🐚' };

const other = (t: Tide): Tide => (t === 'high' ? 'low' : 'high');

/** その地図にある潮の地形（無ければ空。潮の無い地図では札もマスの文も出さない） */
export function tideTerrainsOf(w: Pick<WorldState, 'tiles'>): TerrainDef[] {
  const ids = new Set<string>();
  for (const t of w.tiles) ids.add(t.t);
  return [...ids].map((id) => getTerrain(id)).filter((t) => !!t.tide).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** そのマスは潮のマスか */
export const isTideTile = (w: Pick<WorldState, 'tiles'>, i: number): boolean => !!getTerrain(w.tiles[i].t).tide;

/** 潮の地形1つの性質の文: 「満ち潮の間だけ船で通れる」「引き潮の間だけ歩いて渡れる」 */
export const tideTerrainRule = (t: TerrainDef): string => `${TIDE_NAME[t.tide!]}の間だけ${t.tideShip ? '船で通れる' : '歩いて渡れる'}`;

export interface TideStatus {
  tide: Tide;
  /** 止まっている（WorldState.tideFrozen） */
  frozen: boolean;
  /** 変わるまでのワールドターン（止まっている時は undefined） */
  turns?: number;
  icon: string;
  /** 短い札（低い画面）: 「🌊満ち潮」と「あと3」/「止まる」の2行 */
  short: [string, string];
  /** 全文（ふつうの画面の注意の行・低い画面で札を押した時） */
  text: string;
}

/** 今の潮の札。潮の地形が無い地図では undefined（今までどおり何も出さない） */
export function tideStatus(w: WorldState): TideStatus | undefined {
  const terrains = tideTerrainsOf(w);
  if (!terrains.length) return undefined;
  const tide = tideNow(w);
  const frozen = !!w.tideFrozen;
  const turns = frozen ? undefined : turnsUntilTideChange(w.worldTurn);
  const icon = TIDE_ICON[tide];
  const parts = terrains.map((t) => (t.tide === tide ? `${t.name}を${t.tideShip ? '船で通れる' : '歩いて渡れる'}` : `${t.name}は閉じている`));
  const when = frozen ? '潮が止まっていて、変わらない' : `あと${turns}ターンで${TIDE_NAME[other(tide)]}`;
  return {
    tide,
    frozen,
    turns,
    icon,
    short: [`${icon}${TIDE_NAME[tide]}`, frozen ? '止まる' : `あと${turns}`],
    text: `${icon} ${TIDE_NAME[tide]}（${when}）: ${parts.join('・')}。閉じた所も、中からは出られる（世界の潮。戦闘の中の潮とは別）`,
  };
}

/** 潮のマスの説明（マスを押した時）: 「満ち潮の間だけ船で通れる。今は引き潮: あと3ターンで開く」 */
export function tideTileNote(w: WorldState, t: TerrainDef): string {
  const tide = tideNow(w);
  const open = t.tide === tide;
  const rule = tideTerrainRule(t);
  const ship = t.tideShip && !w.ship ? '（船が必要です）' : '';
  if (w.tideFrozen) return `${rule}${ship}。潮が止まっていて、今は${open ? '開いたまま' : '閉じたまま（中からは出られる）'}`;
  const turns = turnsUntilTideChange(w.worldTurn);
  return open ? `${rule}${ship}。今は開いている: あと${turns}ターンで閉じる` : `${rule}${ship}。今は${TIDE_NAME[tide]}: あと${turns}ターンで開く（中からは出られる）`;
}

/** 今の潮のまま止める（災厄「渦潮の大海魔」の悪さの口。次の区切りで使う）。止めている間は時間帯で変わらない */
export function freezeTide(w: WorldState) {
  w.tideFrozen = tideNow(w);
}
/** 止めた潮を戻す（時間帯で決まる潮に戻る） */
export function releaseTide(w: WorldState) {
  delete w.tideFrozen;
}

/** 今の潮では行けないが、潮が変われば行けるマスか（同行の移動の提案の返事で、潮が変わって行けなくなった時の文に使う） */
export function shutByTide(w: WorldState, from: number, to: number): boolean {
  if (!tideTerrainsOf(w).length) return false;
  return reachable({ ...w, tideFrozen: other(tideNow(w)) }, from, w.move ?? 0).has(to);
}

/**
 * 潮で閉じ込められるマス（テスト・測定用。ゲームでは使わない）。start から（どちらかの潮が開いている時に）行けるマスのうち、
 * 潮が満ち潮・引き潮のどちらかのまま止まると、start へ戻れないマス。霧・敵は見ない。船はその地図の w.ship のまま。
 * 空なら「どこにいても、潮がどちらで止まっても、start へ戻れる」（オーナーの決定 6-A: 閉じ込められない）
 */
export function tideTraps(w: WorldState, start: number): number[] {
  const views: WorldState[] = (['high', 'low'] as const).map((tideFrozen) => ({ ...w, tideFrozen }));
  // 行けるマス（一歩ずつ、どちらかの潮で入れれば入れる）
  const reach = new Set([start]);
  const q = [start];
  for (let k = 0; k < q.length; k++) {
    for (const n of neighbors(w, q[k])) {
      if (reach.has(n) || !views.some((v) => moveCostOf(v, n, q[k]) > 0)) continue;
      reach.add(n);
      q.push(n);
    }
  }
  const traps = new Set<number>();
  for (const v of views) {
    // 潮をこのまま止めた時に start へ戻れるマス（start から逆にたどる: p → cur へ入れるなら p から戻れる）
    const back = new Set([start]);
    const b = [start];
    for (let k = 0; k < b.length; k++) {
      for (const p of neighbors(w, b[k])) {
        if (back.has(p) || !reach.has(p) || moveCostOf(v, b[k], p) <= 0) continue;
        back.add(p);
        b.push(p);
      }
    }
    for (const i of reach) if (!back.has(i)) traps.add(i);
  }
  return [...traps].sort((a, b) => a - b);
}
