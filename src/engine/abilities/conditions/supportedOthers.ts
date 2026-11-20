import type { ConditionHandler } from './types';
declare module '../../../types' { interface ConditionParams { supportedOthers: { unused?: never } } }
export const condition: ConditionHandler<'supportedOthers'> = {
  kind: 'supportedOthers', test: c => c.supportedOthers === true,
  describe: () => '自分以外の味方への支援が実際に成立した時',
};
