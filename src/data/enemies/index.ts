// 敵と遭遇の登録表。src/content の enemies フォルダ に敵のファイル、encounters フォルダ に組み合わせを置くだけで登場する
import type { EncounterSpec, EnemyDef, EnemyPhaseDef, EnemyState } from '../../types';
import { boonAction } from '../boonActions';
import { contentRegistry, type ContentModules } from '../content';

export const ENEMIES = contentRegistry<EnemyDef>('enemy', import.meta.glob('/src/content/**/enemies/*.ts', { eager: true }) as ContentModules);

export const getEnemy = (id: string) => ENEMIES.get(id);

/**
 * その敵の段階の一覧（2026-11-14: 最後の中ボスの戦闘では midbossPhases。それ以外は phases）。
 * enemy に phaseSet が無い時（古い保存・ふつうの戦闘）は phases
 */
export function phasesOf(enemy: Pick<EnemyState, 'defId' | 'phaseSet'>): EnemyPhaseDef[] | undefined {
  const def = getEnemy(enemy.defId);
  return enemy.phaseSet === 'midboss' ? def.midbossPhases : def.phases;
}

/** 段階も含めたすべての行動から探す（中ボスだけの段階・災厄の加護の共通の行動も。2026-11-14） */
export function getEnemyAction(defId: string, actionId: string) {
  const def = getEnemy(defId);
  const a =
    def.actions.find((x) => x.id === actionId) ??
    def.phases?.flatMap((p) => p.actions).find((x) => x.id === actionId) ??
    def.midbossPhases?.flatMap((p) => p.actions).find((x) => x.id === actionId) ??
    boonAction(actionId);
  if (!a) throw new Error(`Unknown action: ${defId}.${actionId}`);
  return a;
}

/** 遭遇の組み合わせ（テスト戦闘など） */
export const ENCOUNTERS = contentRegistry<EncounterSpec>('encounter', import.meta.glob('/src/content/**/encounters/*.ts', { eager: true }) as ContentModules);
