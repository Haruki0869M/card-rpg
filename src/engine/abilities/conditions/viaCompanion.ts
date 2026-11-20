// お供・召喚（砲台・罠・群れの獣）が与えるダメージか（カードのダメージではない）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    viaCompanion: {};
  }
}

export const condition: ConditionHandler<'viaCompanion'> = {
  kind: 'viaCompanion',
  test: (c) => !!c.via,
  describe: () => 'お供・召喚の攻撃',
};
