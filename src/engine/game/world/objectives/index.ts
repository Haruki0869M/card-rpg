// ===== 依頼の目標の登録表 =====
import type { QuestObjective } from '../../../../types';
import type { ObjectiveHandler } from './types';

export type { ObjectiveHandler, QuestSignal } from './types';

const HANDLERS = new Map<string, ObjectiveHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./*.ts', { eager: true }) as Record<string, { objective?: ObjectiveHandler }>)) {
  if (!mod.objective) continue; // index.ts・types.ts
  if (HANDLERS.has(mod.objective.kind)) throw new Error(`Duplicate objective: ${mod.objective.kind} (${path})`);
  HANDLERS.set(mod.objective.kind, mod.objective as ObjectiveHandler);
}

export const hasObjectiveKind = (kind: string) => HANDLERS.has(kind);
export function objectiveHandler(o: QuestObjective): ObjectiveHandler {
  const h = HANDLERS.get(o.kind);
  if (!h) throw new Error(`Unknown objective kind: ${o.kind}`);
  return h;
}
