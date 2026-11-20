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
/**
 * 【オーナーの決定 2026-11-16】「現時点では、全てのシナリオを無条件で遊べるようにして」。
 * true の間は、作成中（wip）でないシナリオは、クリアの記録が無くても全部遊べる（解放の条件 unlockRequires は残してある）。
 * 元の「前のシナリオをクリアすると解放」に戻す時は false にするだけ。
 */
export const OPEN_ALL_SCENARIOS = true;

export function isScenarioUnlocked(sc: Pick<ScenarioDef, 'unlocked' | 'unlockRequires' | 'wip'>, clearedIds?: readonly string[], openAll: boolean = OPEN_ALL_SCENARIOS): boolean {
  if (sc.wip) return false; // 作成中は、クリアの記録があっても遊べない
  if (openAll) return true;
  if (!clearedIds || !sc.unlockRequires) return sc.unlocked;
  return sc.unlockRequires.cleared.every((id) => clearedIds.includes(id));
}
