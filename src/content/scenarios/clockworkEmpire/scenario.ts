// シナリオ6「機械仕掛けの帝国」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
// 遊びの違い: 蒸気の吹き出す地でHPが減る。罠と仕掛けの判定が多く、機工士や銃が活躍する
import type { ScenarioDef } from '../../../types';
import { clockworkEmpireMap } from './map';

export const clockworkEmpire: ScenarioDef = {
  id: 'clockworkEmpire',
  order: 6,
  name: '機械仕掛けの帝国',
  art: 'card-clockworkEmpire',
  synopsis: '暴走した大機械が、国じゅうの人を歯車の部品にしようとしている。三つの動力核を壊して、大機械を止めよ。',
  recommended: '2〜4人',
  playTime: '60〜90分',
  unlocked: false,
  // 作成中: 敵・数値がそろうまで遊べない。仕上げる時に wip を消し、unlockText を「「星降る天空城」をクリアすると遊べる」にする
  wip: true,
  unlockText: '準備中（もうすぐ遊べます）',
  unlockRequires: { cleared: ['starCastle'] },
  // 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉）
  corruptionName: '暴走率',
  start: { gold: 40, pouch: [{ itemId: 'potion', count: 2 }] },
  map: clockworkEmpireMap,
  story: {
    opening: [
      '歯車の帝国ギアロード。蒸気と鋼で栄えた、機械の国。',
      'ある日、国を動かす大機械が暴走し、人々を歯車の部品に変えはじめた。',
      '煙突の街の老技師は告げた。「三つの動力核を壊し、大機械の心臓へ進んでください。あれを、止めてほしいのです」',
      '暴走率が100%に達すれば、国は歯車に呑まれる。鉄の旅が始まる。',
    ],
    ending: [
      '大機械の歯車が、ゆっくりと止まっていく。',
      '大機械は、病で死にゆく民を救うために、人の命を「部品」で繋ごうとした、善意の機械だった。',
      '「…止まる。ありがとう。もう、誰も部品にしない」',
      '煙突から、白い煙の代わりに、やわらかな風が吹いた。',
      '― 機械仕掛けの帝国 完 ―',
    ],
    keys: { coreGear: '動力核（歯車）', coreSteam: '動力核（蒸気）', coreTime: '動力核（時間）' },
  },
};
