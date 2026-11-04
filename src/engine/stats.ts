import { BALANCE } from '../data/balance';
import { getClass } from '../data/classes';
import type { Affinity, AllyState, Stats } from '../types';

/** 能力値 → 戦闘の適性補正（物理=力 / 魔法=知力 / スキル=器用）。spec §6.1 */
export function statToAffinity(value: number): number {
  return Math.trunc((value - BALANCE.statPivot) / BALANCE.statDivisor);
}

export function affinityFromStats(stats: Stats): Affinity {
  return {
    physical: statToAffinity(stats.str),
    magic: statToAffinity(stats.int),
    skill: statToAffinity(stats.dex),
  };
}

/** キャラの現在の能力値（戦闘中は装備・成長を反映した値を持つ。無ければ職業の初期値） */
export function statsOf(ally: Pick<AllyState, 'classId'> & { stats?: Stats }): Stats {
  return ally.stats ?? getClass(ally.classId).stats;
}

export function affinityOf(ally: Pick<AllyState, 'classId'> & { stats?: Stats }): Affinity {
  return affinityFromStats(statsOf(ally));
}
