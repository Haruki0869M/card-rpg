// シナリオの登録表。src/content/scenarios/<シナリオID>/scenario.ts を置くだけで選べるようになる
import type { ScenarioDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';
import { TERMS } from '../terms';

export const SCENARIOS = contentRegistry<ScenarioDef>('scenario', import.meta.glob('/src/content/scenarios/*/scenario.ts', { eager: true }) as ContentModules);
export const getScenario = (id: string) => SCENARIOS.get(id);

/** 画面とログに出す「侵食度」の名前（シナリオごとに変えられる。例: 凍てつく王国は「冬の深さ」） */
export const corruptionName = (scenarioId?: string): string => (scenarioId ? SCENARIOS.all.find((s) => s.id === scenarioId)?.corruptionName : undefined) ?? TERMS.corruption;

/**
 * シナリオが遊べるか。
 * clearedIds = クリア済みシナリオのID（クリア記録。まだ記録の仕組みが無い間は渡さない）。
 * 記録が無い間、または解放条件（unlockRequires）が無いシナリオは、従来の unlocked で決まる。
 */
export function isScenarioUnlocked(sc: Pick<ScenarioDef, 'unlocked' | 'unlockRequires'>, clearedIds?: readonly string[]): boolean {
  if (!clearedIds || !sc.unlockRequires) return sc.unlocked;
  return sc.unlockRequires.cleared.every((id) => clearedIds.includes(id));
}
