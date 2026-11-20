// T3：序盤向けのコモン鎧。最大HPを控え、小さな得意分野で選び分ける。
import type { ItemDef } from '../../../types';

export const armorsCommon2: ItemDef[] = [
  { id: 'commonAdeptRobe', name: '学び手の法衣', slot: 'armor', rarity: 'common', icon: 'robe', description: '最大HP+3、知力+3。魔法の練習に向く。', maxHp: 3, stats: { int: 3 }, tags: ['magic'] },
];
