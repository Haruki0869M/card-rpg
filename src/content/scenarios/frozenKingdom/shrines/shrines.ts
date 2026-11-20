// シナリオ2の祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfEmber',
    name: '残り火の祠',
    text: '雪の中で、小さな炎だけが絶えず揺れている。',
    options: [heal, focus, { label: '残り火の加護（永続: 体力+5）', outcomes: [{ kind: 'stat', stat: 'vit', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfFrostWolf',
    name: '白狼の祠',
    text: '氷でできた狼の像が、遠くを見つめている。',
    options: [heal, focus, { label: '白狼の加護（永続: 素早さ+5）', outcomes: [{ kind: 'stat', stat: 'agi', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfSpring',
    name: '春告げの祠',
    text: '凍った泉のほとりに、小さな花の彫刻が祀られている。',
    options: [heal, { label: '春の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
  {
    id: 'shrineOfClearSky',
    name: '澄んだ空の祠',
    text: '吹雪がここだけ避けて通る。空に、青い切れ間が見えた。',
    options: [heal, focus, { label: '澄んだ空の加護（永続: 感知+5）', outcomes: [{ kind: 'stat', stat: 'per', amount: 5 }], permanent: true }],
  },
];
