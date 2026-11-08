// シナリオ5の祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfWindmill',
    name: '風車の祠',
    text: '小さな風車が、風もないのにゆっくり回っている。',
    options: [heal, focus, { label: '風の加護（永続: 素早さ+5）', outcomes: [{ kind: 'stat', stat: 'agi', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfCrescent',
    name: '三日月の祠',
    text: '三日月の形の石が、青白く光っている。',
    options: [heal, focus, { label: '月の加護（永続: 知力+5）', outcomes: [{ kind: 'stat', stat: 'int', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfMeteor',
    name: '流れ星の祠',
    text: '落ちてきた星のかけらが、祀られている。',
    options: [heal, { label: '星の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
  {
    id: 'shrineOfCompass',
    name: '星図の祠',
    text: '古い星図が刻まれた石板が、立っている。',
    options: [heal, focus, { label: '星図の加護（永続: 感知+5）', outcomes: [{ kind: 'stat', stat: 'per', amount: 5 }], permanent: true }],
  },
];
