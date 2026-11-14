// 薬草の群生地（段階6a・overhaul-plan-v2 §2-2）。広い地図の西の帯に、地図のデータ（RegionDef.herbs）で置くマップのイベント。
// placed なので、ふつうのマップのイベント・突発イベントのくじには入らない。乱数は冒険の Rng（数と種類）。数値は提案
import type { EventDef } from '../../../types';

export const herbEvents: EventDef[] = [
  {
    id: 'herbField',
    where: 'map',
    placed: true,
    title: '薬草の群生地',
    icon: 'tree',
    text: '木陰に、薬草がびっしりと生えている。摘んでいけば、旅の薬になりそうだ。',
    options: [
      {
        label: '薬草を摘む',
        // 1〜2個。1個ずつ、回復薬が4つに3つ・上回復薬が4つに1つ
        success: [{ kind: 'herbs', itemIds: ['potion', 'potion', 'potion', 'hiPotion'], count: [1, 2] }],
        successText: '薬草を摘んで、薬にした。',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '薬草はそのままにして、先へ進んだ。' },
    ],
  },
];
