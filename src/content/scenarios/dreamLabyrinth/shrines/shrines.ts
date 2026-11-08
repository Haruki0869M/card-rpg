// シナリオ7の祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfPillow',
    name: '枕の祠',
    text: 'ふかふかの枕が、石の台にのせてある。',
    options: [heal, focus, { label: '安らぎの加護（永続: 体力+5）', outcomes: [{ kind: 'stat', stat: 'vit', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfLullaby',
    name: '子守歌の祠',
    text: 'どこからか、やさしい子守歌が聞こえてくる。',
    options: [heal, focus, { label: '歌の加護（永続: 運+5）', outcomes: [{ kind: 'stat', stat: 'luk', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfMemory',
    name: '思い出の祠',
    text: '誰かの古い写真が、小さな額に飾られている。',
    options: [heal, { label: '思い出の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
  {
    id: 'shrineOfAwakening',
    name: '目覚めの祠',
    text: '朝日の絵が、壁一面に描かれている。',
    options: [heal, focus, { label: '目覚めの加護（永続: 素早さ+5）', outcomes: [{ kind: 'stat', stat: 'agi', amount: 5 }], permanent: true }],
  },
];
