// ===== 災厄の加護のうち、戦闘の中で毎ターン読む決まり（シナリオ2の作り直し 区切り3a）=====
// docs/tasks/scenario2-theme-scourge-proposal.md §3（鐘の響き A）・§4（闇の帳 A）。オーナーの返事 4・5 = A。
// 戦闘の印（BattleState.boon の bell・veil）だけを読む小さな部品。乱数は引かない（画面・bot・戦闘の処理が同じ答えを読む）
import { getEnemyAction } from '../../data/enemies';
import type { BattleState, EnemyActionDef, EnemyState } from '../../types';
import { targetOf } from './effects';

type BoonState = Pick<BattleState, 'boon' | 'turn'>;

/** 鐘の番か（鐘の響きが掛かっていて、今のターンが every の倍数） */
export const bellNow = (s: BoonState): boolean => !!s.boon?.bell && s.turn > 0 && s.turn % s.boon.bell.every === 0;

/** 次の鐘の番まで、あと何ターンか（0 = 今のターンが鐘の番。鐘の響きが無ければ undefined） */
export function bellLeft(s: BoonState): number | undefined {
  const b = s.boon?.bell;
  if (!b) return undefined;
  const r = s.turn % b.every;
  return r === 0 ? 0 : b.every - r;
}

/** 鐘が響く攻撃（敵1体を狙うダメージ。HPが半分以下の相手だけに当たる攻撃は除く） */
export const bellEffects = (action: EnemyActionDef) => action.effects.filter((e): e is Extract<EnemyActionDef['effects'][number], { kind: 'damage' }> => e.kind === 'damage' && targetOf(e) === 'target' && !e.lowOnly);

/** この敵の今の予告が、鐘の番の単体攻撃か（大物・鐘の番・敵1体を狙うダメージがある） */
export function bellStrikes(s: BoonState, enemy: EnemyState): boolean {
  if (!bellNow(s) || enemy.dead || !enemy.intent || enemy.uid !== s.boon!.uid) return false;
  return bellEffects(getEnemyAction(enemy.defId, enemy.intent.actionId)).length > 0;
}

/**
 * 闇の帳: この敵の今の予告は、画面で名前と数字を隠すか（帳の掛かったターン・大物・予告がある）。
 * 人のための決まり（画面だけ）。戦闘の処理・bot は中身を読めるまま
 */
export function veiledIntent(s: BoonState, enemy: EnemyState): boolean {
  return s.boon?.veil !== undefined && s.boon.veil === s.turn && enemy.uid === s.boon.uid && !enemy.dead && !!enemy.intent;
}
