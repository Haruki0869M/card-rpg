// ===== 寒さ・暑さ（K4 段2・spec §16.3）: 地形・地域の climate があるマスに立ったままターンが終わるとHPが減る =====
import { BALANCE } from '../../../data/balance';
import { getScenario } from '../../../data/scenarios';
import { TERRAINS } from '../../../data/world';
import { timeOfDay } from './time';
import type { ClimateDef, GameState } from '../../../types';
import { addLog } from '../common';
import { heroMaxHp } from '../hero';
import { mapHeroes } from '../heroes';
import { laneDefOfTile } from './lanes';

/**
 * そのマスの寒さ・暑さ（地形が優先、無ければ地域）。町のマスは対象外。
 * 広い地図では、帯の倍率（LaneDef.climate。シナリオ2の作り直し §2-1）を割合に掛ける（0 以下なら無し）。帯の無い地図・古い保存は今までどおり
 */
export function climateAt(game: GameState, tile: number): ClimateDef | undefined {
  const w = game.world;
  const t = w?.tiles[tile];
  if (!w || !t || t.f?.kind === 'town') return undefined;
  const base = TERRAINS.get(t.t).climate ?? getScenario(game.scenarioId).map?.regions[t.r]?.climate;
  // 夜だけ別の設定がある時は、夜はそちらになる（昼は暑く夜は寒い砂漠など）
  const now = base?.night !== undefined && timeOfDay(w.worldTurn) === 'night' ? (base.night === 'none' ? undefined : base.night) : base;
  if (!now) return now;
  const mul = laneDefOfTile(game, w, tile)?.climate ?? 1;
  if (mul === 1) return now;
  if (mul <= 0) return undefined;
  return { kind: now.kind, ratio: (now.ratio ?? BALANCE.climateDamageRatio) * mul };
}

/** ワールドターンの終わり: 寒さ・暑さのマスにいるキャラのHPを減らす（HPは1で止まる。今ターン野営したキャラは受けない） */
export function applyClimate(game: GameState) {
  const w = game.world;
  if (!w) return;
  const sheltered = w.sheltered ?? [];
  w.sheltered = undefined;
  for (const h of mapHeroes(game)) {
    const tile = w.pos[h.id];
    if (tile === undefined || sheltered.includes(h.id)) continue;
    const c = climateAt(game, tile);
    if (!c) continue;
    const dmg = Math.max(1, Math.ceil(heroMaxHp(h) * (c.ratio ?? BALANCE.climateDamageRatio)));
    const lost = Math.min(dmg, Math.max(0, h.hp - 1));
    if (lost <= 0) continue;
    h.hp -= lost;
    addLog(game, `${h.name}は${c.kind === 'cold' ? '寒さ' : '暑さ'}で体力を奪われた（-${lost}）`);
  }
}
