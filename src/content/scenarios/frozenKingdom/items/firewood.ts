// 薪の束（シナリオ2の地図のイベント「薪の番小屋」だけで手に入る消耗品。2026-11-21・オーナーの決定「10個とも A」）。
// 役割: 持ち運べる暖。番を使わずに、好きな時に、使った相手1人の寒さを次の朝まで止める（テント = その場で野営・温泉 = 場所が決まっている、と違う）。
// 弱めの形（点検 B-2）: 1人1つまで・効くのは1人だけ。宝箱・店・ドロップのくじには出ない（source: 'event'）
import type { ItemDef } from '../../../../types';

export const firewood: ItemDef[] = [
  {
    id: 'firewoodBundle',
    name: '薪の束',
    slot: 'consumable',
    rarity: 'common',
    icon: 'potion',
    source: 'event',
    noShop: true,
    pouchMax: 1,
    description: 'よく乾いた薪の束。火をおこせば、朝まで体が冷えない。1人1つしか持てない。',
    use: [{ kind: 'fieldOnly', what: 'firewood' }],
  },
];
