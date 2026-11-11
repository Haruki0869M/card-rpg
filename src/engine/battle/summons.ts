// 召喚（砲台・罠・幻獣・群れの獣・屍兵など）の1回の攻撃。ターン終了時の攻撃と、カードで「今すぐ攻撃」させる時（区切りD）で共通
import { fireAbilities } from '../abilities';
import type { Rng } from '../rng';
import type { AllyState, BattleEvent, BattleState, EnemyState, SummonState } from '../../types';
import { dealDamage, makeCtx } from './effects';
import { abilityTriggered, addLog, enemyName } from './units';

/** ターン終了時に攻撃する召喚か（追撃・身代わり・きっかけ待ちの召喚は入らない） */
export const isStrikingSummon = (s: SummonState) => !s.echoPct && !s.trigger;

/**
 * 召喚 s が敵 t を1回攻撃する。与えたHPのダメージを返す。
 * label はログの書き方（省略: 「〇〇の砲台が△△を攻撃！」）
 */
export function summonStrikeOnce(state: BattleState, ally: AllyState, s: SummonState, t: EnemyState, rng: Rng, events: BattleEvent[], label?: string): number {
  const ctx = makeCtx(state, rng, events, ally, { target: t, via: 'summon' });
  const loss = dealDamage(ctx, t, s.damage, s.element);
  // きっかけ: 自分の砲台・召喚が敵にダメージを与えた（観測射撃）
  if (loss > 0 && !ally.dead) fireAbilities(state, rng, events, ally, 'summonHit', { target: t, depth: 1 });
  abilityTriggered(state, ally.id, s.name, events, { kind: 'summon', id: s.id, label: s.name });
  addLog(state, `${ally.name}の${s.name}が${enemyName(t)}を${label ?? '攻撃'}！ ${loss}ダメージ`);
  return loss;
}
