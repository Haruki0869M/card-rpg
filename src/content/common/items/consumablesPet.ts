// お供の消耗品（K2）
import type { ItemDef } from '../../../types';

export const consumablesPet: ItemDef[] = [
  { id: 'petSnack', name: 'お供のおやつ', slot: 'consumable', rarity: 'common', icon: 'potion', description: 'お供が大喜びするおやつ。使うと懐き度が上がる。お供との出会いの場面で差し出すと、必ず仲間になってくれる。', use: [{ kind: 'feedPet', amount: 10 }] },
];
