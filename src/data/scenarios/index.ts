// シナリオの登録表。src/content/scenarios/<シナリオID>/scenario.ts を置くだけで選べるようになる
import type { ScenarioDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const SCENARIOS = contentRegistry<ScenarioDef>('scenario', import.meta.glob('/src/content/scenarios/*/scenario.ts', { eager: true }) as ContentModules);
export const getScenario = (id: string) => SCENARIOS.get(id);
