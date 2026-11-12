// ===== 災厄の中ボスの悪さ（段階7b）: 地図の上で生きている災厄の悪さを足し合わせる =====
// データ（SCOURGES）と型だけを使う小さな部品（店の値段・野営・侵食度・夜の敵のレベルの所から読む）。乱数は引かない
import { SCOURGES } from '../../../data/world';
import type { GameState, ScourgeDef, Wanderer, WorldState } from '../../../types';

/** 生きている災厄（地図の上にいる物） */
export const aliveScourges = (w: Pick<WorldState, 'wanderers'> | undefined): { wd: Wanderer; def: ScourgeDef }[] =>
  (w?.wanderers ?? []).flatMap((wd) => {
    const def = wd.scourge ? SCOURGES.tryGet(wd.scourge) : undefined;
    return def ? [{ wd, def }] : [];
  });

/** 生きている災厄の悪さを足し合わせた物（店の値段 +%・世界マップの番の侵食度 +%・野営のHPの回復の倍率・夜の敵のレベル +N） */
export interface ScourgeCurse { shopPrice: number; corruptionPerTurn: number; campHeal: number; nightLevel: number }
export function scourgeCurse(game: Pick<GameState, 'world'> | undefined): ScourgeCurse {
  const out: ScourgeCurse = { shopPrice: 0, corruptionPerTurn: 0, campHeal: 1, nightLevel: 0 };
  for (const { def } of aliveScourges(game?.world)) {
    out.shopPrice += def.curse.shopPrice ?? 0;
    out.corruptionPerTurn += def.curse.corruptionPerTurn ?? 0;
    out.campHeal *= def.curse.campHeal ?? 1;
    out.nightLevel += def.curse.nightLevel ?? 0;
  }
  return out;
}

/** その悪さを与えている災厄（画面の「〇〇のせいで」に使う） */
export const scourgesWith = (game: Pick<GameState, 'world'> | undefined, kind: keyof ScourgeDef['curse']): ScourgeDef[] =>
  aliveScourges(game?.world).filter(({ def }) => def.curse[kind] !== undefined).map(({ def }) => def);

/** 町の店の値段に、災厄の悪さを掛ける（売る値段には掛けない。四捨五入） */
export function scourgePrice(game: Pick<GameState, 'world'> | undefined, price: number): number {
  const up = scourgeCurse(game).shopPrice;
  return up ? Math.round((price * (100 + up)) / 100) : price;
}
