// 敵と遭遇の登録表。src/content の enemies フォルダ に敵のファイル、encounters フォルダ に組み合わせを置くだけで登場する
import type { EncounterSpec, EnemyDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const ENEMIES = contentRegistry<EnemyDef>('enemy', import.meta.glob('/src/content/**/enemies/*.ts', { eager: true }) as ContentModules);

export const getEnemy = (id: string) => ENEMIES.get(id);

/** 段階も含めたすべての行動から探す */
export function getEnemyAction(defId: string, actionId: string) {
  const def = getEnemy(defId);
  const a = def.actions.find((x) => x.id === actionId) ?? def.phases?.flatMap((p) => p.actions).find((x) => x.id === actionId);
  if (!a) throw new Error(`Unknown action: ${defId}.${actionId}`);
  return a;
}

/** 遭遇の組み合わせ（テスト戦闘など） */
export const ENCOUNTERS = contentRegistry<EncounterSpec>('encounter', import.meta.glob('/src/content/**/encounters/*.ts', { eager: true }) as ContentModules);
