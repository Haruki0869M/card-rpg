import type { EncounterSpec, EnemyDef } from '../../types';
import { createRegistry } from '../registry';
import { chaosShaman } from './chaosShaman';
import { goblinBrute } from './goblinBrute';
import { goblinScout } from './goblinScout';
import { forestWolf, toxicShroom, treantKing, treeWarden } from './forest';

/** 敵の登録表。敵を増やすときはファイルを追加してここに並べるだけでよい */
export const ENEMIES = createRegistry<EnemyDef>('enemy', [
  goblinBrute,
  chaosShaman,
  goblinScout,
  forestWolf,
  toxicShroom,
  treeWarden,
  treantKing,
]);

export const getEnemy = (id: string) => ENEMIES.get(id);

/** 段階も含めたすべての行動から探す */
export function getEnemyAction(defId: string, actionId: string) {
  const def = getEnemy(defId);
  const a = def.actions.find((x) => x.id === actionId) ?? def.phases?.flatMap((p) => p.actions).find((x) => x.id === actionId);
  if (!a) throw new Error(`Unknown action: ${defId}.${actionId}`);
  return a;
}

/** 遭遇の組み合わせ（M3で地域ごとのデータに移す。M1はテスト戦闘用） */
export const ENCOUNTERS = createRegistry<EncounterSpec>('encounter', [
  { id: 'goblinBand', name: 'ゴブリンの一団（3体）', enemies: [{ defId: 'goblinBrute' }, { defId: 'chaosShaman' }, { defId: 'goblinScout' }] },
  { id: 'bruteAlone', name: '重装兵（1体）', enemies: [{ defId: 'goblinBrute' }] },
  { id: 'scoutPair', name: '斥候の二人組（2体）', enemies: [{ defId: 'goblinScout' }, { defId: 'goblinScout' }] },
  {
    id: 'warband',
    name: 'ゴブリンの軍勢（4体）',
    enemies: [{ defId: 'goblinBrute' }, { defId: 'chaosShaman' }, { defId: 'goblinScout' }, { defId: 'goblinScout' }],
  },
]);
