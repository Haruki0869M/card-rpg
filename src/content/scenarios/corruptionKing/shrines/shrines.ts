// 祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある（balance.ts の maxBlessings）
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfValor',
    name: '武勇の祠',
    text: '剣を掲げた戦士の像が祀られている。',
    options: [heal, focus, { label: '武勇の加護（永続: 力+5）', outcomes: [{ kind: 'stat', stat: 'str', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfWisdom',
    name: '叡智の祠',
    text: '古い書物を抱えた賢者の像が祀られている。',
    options: [heal, focus, { label: '叡智の加護（永続: 知力+5）', outcomes: [{ kind: 'stat', stat: 'int', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfWind',
    name: '疾風の祠',
    text: '翼を広げた鳥の像が、風を受けて鳴っている。',
    options: [heal, focus, { label: '疾風の加護（永続: 素早さ+5）', outcomes: [{ kind: 'stat', stat: 'agi', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfFortune',
    name: '幸運の祠',
    text: '金貨を咥えた猫の像が、にっこり笑っている。',
    options: [heal, focus, { label: '幸運の加護（永続: 運+8）', outcomes: [{ kind: 'stat', stat: 'luk', amount: 8 }], permanent: true }],
  },
  {
    id: 'shrineOfLife',
    name: '灯火の祠',
    text: '小さな炎が、絶えることなく燃え続けている。',
    options: [heal, { label: '灯火の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
];
