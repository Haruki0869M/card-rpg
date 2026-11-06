// 属性（spec §14）。属性のダメージがHPに当たると、確率で状態異常を与える（完全成功なら必ず）。
// 敵の weak（弱点: ダメージ×1.5）・resist（耐性: ダメージ×0.5・状態異常が効かない）でも使う
import type { ElementDef } from '../../../types';

export const elements: ElementDef[] = [
  { id: 'fire', order: 1, name: '火', color: '#ff8a4a', icon: 'flame', status: 'burn', chance: 30, amount: 1 },
  { id: 'ice', order: 2, name: '氷', color: '#8ae0ff', icon: 'snowflake', status: 'freeze', chance: 25, amount: 1 },
  { id: 'thunder', order: 3, name: '雷', color: '#ffe04a', icon: 'zap', status: 'paralysis', chance: 30, amount: 1 },
  { id: 'poison', order: 4, name: '毒', color: '#9aff6a', icon: 'biohazard', status: 'poison', chance: 50, amount: 2 },
  { id: 'dark', order: 5, name: '闇', color: '#c88aff', icon: 'moon', status: 'curse', chance: 30, amount: 2 },
  { id: 'holy', order: 6, name: '聖', color: '#fff2a0', icon: 'sun' },
];
