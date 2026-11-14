// ===== 災厄の加護が大物に足す、共通の行動（2026-11-14 寄り道の値打ち 柱1）=====
// 敵のデータには書かない（どの大物にも同じ形で付く）。getEnemyAction・段階の読み方が、敵のデータに無いIDの時にここを探す。
// 数字は【提案】（悪夢の魔獣の「手負い狙い」と同じ 15・闇・HPが半分以下で ×1.5。大物の攻撃の倍率は、その大物のレベルの倍率が掛かる）
import type { EnemyActionDef } from '../types';

export const BOON_ACTIONS: EnemyActionDef[] = [
  {
    id: 'boonNightmareEye',
    name: '悪夢の目',
    big: true,
    behavior: 'hunt',
    scripted: true,
    brief: '💀加護: 手負いを狙う',
    hint: '悪夢の魔獣の加護。HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5。HPを整えてから入るか、ブロックで受ける',
    effects: [{ kind: 'damage', amount: 15, element: 'dark', lowHpMul: 1.5 }],
  },
];

export const boonAction = (id: string): EnemyActionDef | undefined => BOON_ACTIONS.find((a) => a.id === id);
