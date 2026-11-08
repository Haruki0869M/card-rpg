// ===== 敵のレベル補正（戦闘の生成と、戦闘中に呼ばれた敵の両方で使う） =====
import { BALANCE } from '../../data/balance';
import type { EnemyDef } from '../../types';

/** 敵のレベル補正（HP・攻撃の倍率）。baseLevel で 1.0。伸び方は敵ごとに変えられる（省略は共通値） */
export function enemyLevelFactors(def: Pick<EnemyDef, 'baseLevel' | 'hpPerLevel' | 'attackPerLevel'>, level: number) {
  const d = level - def.baseLevel;
  return {
    hp: Math.max(0.3, 1 + (def.hpPerLevel ?? BALANCE.enemyHpPerLevel) * d),
    attack: Math.max(0.3, 1 + (def.attackPerLevel ?? BALANCE.enemyAttackPerLevel) * d),
  };
}
