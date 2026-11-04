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

/** キャラの現在の能力値（M2で装備・成長ボーナスを加算する） */
export function statsOf(ally: Pick<AllyState, 'classId'>): Stats {
  return getClass(ally.classId).stats;
}

export function affinityOf(ally: Pick<AllyState, 'classId'>): Affinity {
  return affinityFromStats(statsOf(ally));
}
