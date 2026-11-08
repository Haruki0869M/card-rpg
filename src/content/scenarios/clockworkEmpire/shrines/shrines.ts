// シナリオ6の祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfGear',
    name: '歯車の祠',
    text: '小さな歯車が、ひとつだけ静かに回っている。',
    options: [heal, focus, { label: '歯車の加護（永続: 器用+5）', outcomes: [{ kind: 'stat', stat: 'dex', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfSteam',
    name: '蒸気の祠',
    text: '白い蒸気が、祈りの形に立ちのぼっている。',
    options: [heal, focus, { label: '蒸気の加護（永続: 体力+5）', outcomes: [{ kind: 'stat', stat: 'vit', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfSpark',
    name: '火花の祠',
    text: '小さな火花が、消えずに踊っている。',
    options: [heal, { label: '火花の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
  {
    id: 'shrineOfBlueprint',
    name: '設計図の祠',
    text: '古い設計図が、額に入れて祀られている。',
    options: [heal, focus, { label: '設計図の加護（永続: 知力+5）', outcomes: [{ kind: 'stat', stat: 'int', amount: 5 }], permanent: true }],
  },
];
