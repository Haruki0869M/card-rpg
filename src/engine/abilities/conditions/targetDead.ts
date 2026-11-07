// 他の味方が先に復活させた時は、回数制限を消費しない。
import type { ConditionHandler } from './types';
declare module '../../../types' { interface ConditionParams { targetDead: { unused?: never } } }
export const condition: ConditionHandler<'targetDead'> = {
  kind: 'targetDead',
  test: c => !!c.target?.dead,
  describe: () => '対象が戦闘不能なら',
};
