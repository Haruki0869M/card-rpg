// ===== ボスの段階（2026-11-14・docs/tasks/boss-phase-plan.md）: 段階のデータを読む所を1つにまとめる =====
// - 今の段階の定義・弱点・耐性（弱点と耐性は保存しない。段階の番号と今の予告から毎回求める = 保存と画面がずれない）
// - 開幕の一手（段階に入った次の予告で、必ず出す行動）がまだ出ていないか
// - HPバーの境目の線の位置
// 乱数は使わない。エンジン・画面・bot が同じ関数を読む
import { getEnemy, phasesOf } from '../../data/enemies';
import { boonAction } from '../../data/boonActions';
import type { EnemyActionDef, EnemyDef, EnemyPhaseDef, EnemyState } from '../../types';

/** 今の段階の定義（最初の段階なら undefined） */
export function phaseDefOf(enemy: Pick<EnemyState, 'defId' | 'phase' | 'phaseSet'>): EnemyPhaseDef | undefined {
  return enemy.phase > 0 ? phasesOf(enemy)?.[enemy.phase - 1] : undefined;
}

/** その敵の行動（今の段階・ほかの段階も探す）。無いIDなら undefined（古い保存でも落ちないように） */
function actionOf(def: EnemyDef, id: string): EnemyActionDef | undefined {
  return def.actions.find((a) => a.id === id) ?? def.phases?.flatMap((p) => p.actions).find((a) => a.id === id) ?? def.midbossPhases?.flatMap((p) => p.actions).find((a) => a.id === id) ?? boonAction(id);
}

/** 今の予告の行動（無ければ undefined） */
function intentAction(enemy: Pick<EnemyState, 'defId' | 'intent' | 'dead' | 'phaseSet'>): EnemyActionDef | undefined {
  return !enemy.dead && enemy.intent ? actionOf(getEnemy(enemy.defId), enemy.intent.actionId) : undefined;
}

/**
 * その敵の今の耐性: 段階の resist があれば、それに入れ替える（無ければ敵のデータの resist）
 */
export function enemyResist(enemy: Pick<EnemyState, 'defId' | 'phase' | 'phaseSet'>): string[] {
  return phaseDefOf(enemy)?.resist ?? getEnemy(enemy.defId).resist ?? [];
}

/**
 * その敵の今の弱点（一時的な弱点 tempWeak は入れない。今までどおり、読む所で足す）。
 * 1. 今の予告の行動に weakWhile があれば、その間はそれが弱点（満ち潮・引き潮のように、予告に出る）
 * 2. 無ければ、段階の weak（入れ替え）か敵のデータの weak に、段階の addWeak（増える）を足した物
 * 耐性と重なる属性は外す（耐性が先。今までの倍率の決まりと同じ）
 */
export function enemyWeak(enemy: Pick<EnemyState, 'defId' | 'phase' | 'intent' | 'dead' | 'phaseSet'>): string[] {
  const def = getEnemy(enemy.defId);
  const ph = phaseDefOf(enemy);
  const now = intentAction(enemy)?.weakWhile;
  const list = now ?? [...(ph?.weak ?? def.weak ?? []), ...(ph?.addWeak ?? [])];
  const resist = enemyResist(enemy);
  return [...new Set(list)].filter((w) => !resist.includes(w));
}

/** その属性が、今その敵の弱点か（一時的な弱点 tempWeak も含む） */
export function isWeakTo(enemy: Pick<EnemyState, 'defId' | 'phase' | 'intent' | 'dead' | 'tempWeak' | 'phaseSet'>, element: string | undefined): boolean {
  if (!element) return false;
  return enemyWeak(enemy).includes(element) || enemy.tempWeak === element;
}

/** その属性に、今その敵が耐性を持つか */
export const isResistTo = (enemy: Pick<EnemyState, 'defId' | 'phase' | 'phaseSet'>, element: string | undefined): boolean => !!element && enemyResist(enemy).includes(element);

/**
 * まだ出していない開幕の一手（段階のデータの openingActionId）。無ければ undefined。
 * 段階に入っていて（phase > 0）、その段階の開幕の一手をまだ予告していない時（phaseOpened が今の段階より小さい）。
 * 古い保存（phaseOpened が無い）は「まだ出していない」と同じ（計画書 §3）。一撃で2つの境目を越えた時は、深い方の段階の物だけ（phase が深い方になっている）
 */
export function pendingOpening(enemy: Pick<EnemyState, 'defId' | 'phase' | 'phaseOpened' | 'dead' | 'phaseSet'>): EnemyActionDef | undefined {
  if (enemy.dead || enemy.phase <= 0 || (enemy.phaseOpened ?? 0) >= enemy.phase) return undefined;
  const ph = phaseDefOf(enemy);
  return ph?.openingActionId ? ph.actions.find((a) => a.id === ph.openingActionId) : undefined;
}

/** HPバーの境目の線: まだ越えていない段階の境目（HPの割合 0〜1・段階の番号・名前・開幕の一手・新しい決まり）。段階の無い敵は空 */
export function phaseMarks(enemy: Pick<EnemyState, 'defId' | 'phase' | 'phaseSet'>): { at: number; phase: number; name: string; opening?: string; rule?: string; partner?: boolean }[] {
  const phases = phasesOf(enemy) ?? [];
  return phases
    .map((p, i) => ({ at: p.belowHpPct / 100, phase: i + 1, name: p.name, opening: p.openingActionId ? p.actions.find((a) => a.id === p.openingActionId)?.name : undefined, rule: p.rule, partner: p.onPartnerDown }))
    .filter((m) => m.phase > enemy.phase);
}
