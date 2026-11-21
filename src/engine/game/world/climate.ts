// ===== 寒さ・暑さ（K4 段2・spec §16.3）: 地形・地域の climate があるマスに立ったままターンが終わるとHPが減る =====
import { BALANCE } from '../../../data/balance';
import { getScenario } from '../../../data/scenarios';
import { TERRAINS } from '../../../data/world';
import { timeOfDay } from './time';
import type { ClimateDef, GameState, WorldState } from '../../../types';
import { addLog } from '../common';
import { heroMaxHp } from '../hero';
import { mapHeroes } from '../heroes';
import { laneDefOfTile } from './lanes';
import { scourgeCurse } from './scourgeCurse';

/**
 * そのマスの寒さ・暑さ（地形が優先、無ければ地域）。町のマスは対象外。
 * 広い地図では、帯の倍率（LaneDef.climate。シナリオ2の作り直し §2-1）を割合に掛ける（0 以下なら無し）。帯の無い地図・古い保存は今までどおり。
 * 災厄の悪さ「寒さ ×N」（白狼王。区切り3a）は、寒さの時だけ、帯の倍率と掛け算で足す（暑さには掛けない。生きている間だけ）
 */
export function climateAt(game: GameState, tile: number): ClimateDef | undefined {
  const w = game.world;
  const t = w?.tiles[tile];
  if (!w || !t || t.f?.kind === 'town') return undefined;
  const base = TERRAINS.get(t.t).climate ?? getScenario(game.scenarioId).map?.regions[t.r]?.climate;
  // 夜だけ別の設定がある時は、夜はそちらになる（昼は暑く夜は寒い砂漠など）
  const now = base?.night !== undefined && timeOfDay(w.worldTurn) === 'night' ? (base.night === 'none' ? undefined : base.night) : base;
  if (!now) return now;
  const lane = laneDefOfTile(game, w, tile)?.climate ?? 1;
  const cold = now.kind === 'cold' ? scourgeCurse(game).coldMul : 1;
  const mul = cold === 1 ? lane : lane * cold;
  if (mul === 1) return now;
  if (mul <= 0) return undefined;
  return { kind: now.kind, ratio: (now.ratio ?? BALANCE.climateDamageRatio) * mul };
}

/**
 * 温泉で温まっているキャラか（シナリオ2の作り直し §8-2）: 今のワールドターンが効き目の最後のターン以下なら、寒さを受けない（暑さは受ける）。
 * 画面の印にも使う（乱数は引かない）
 */
export function isWarm(w: Pick<WorldState, 'warm' | 'worldTurn'> | undefined, heroId: string): boolean {
  const until = w?.warm?.[heroId];
  return until !== undefined && w!.worldTurn <= until;
}

/** 温泉の効き目が残っている間の、画面に出す短い文（温まっていなければ undefined） */
export function warmthNote(game: GameState, heroId: string): string | undefined {
  const w = game.world;
  if (!w || !isWarm(w, heroId)) return undefined;
  const left = w.warm![heroId] - w.worldTurn + 1;
  // 温泉のほかに、釣り小屋の火（今の時間帯の間だけ）・薪の束でも温まる（2026-11-21）ので、出どころと「次の朝まで」は書かない
  return `♨ 温まっている（寒さを受けない・あと${left}ターン）`;
}

/** ワールドターンの終わり: 寒さ・暑さのマスにいるキャラのHPを減らす（HPは1で止まる。今ターン野営したキャラ・温泉で温まったキャラ（寒さだけ）は受けない） */
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
    if (c.kind === 'cold' && isWarm(w, h.id)) continue;
    const dmg = Math.max(1, Math.ceil(heroMaxHp(h) * (c.ratio ?? BALANCE.climateDamageRatio)));
    const lost = Math.min(dmg, Math.max(0, h.hp - 1));
    if (lost <= 0) continue;
    h.hp -= lost;
    addLog(game, `${h.name}は${c.kind === 'cold' ? '寒さ' : '暑さ'}で体力を奪われた（-${lost}）`);
  }
  // 温泉の効き目: このターンで終わる印を消す（全部消えたら欄ごと消す。乱数は引かない）
  if (w.warm) {
    for (const [id, until] of Object.entries(w.warm)) if (until <= w.worldTurn) delete w.warm[id];
    if (!Object.keys(w.warm).length) w.warm = undefined;
  }
}
