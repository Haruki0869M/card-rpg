// シナリオ4「砂塵の王朝」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
// 遊びの違い: 砂漠のマスは昼は暑さ、夜は寒さでHPが減る（野営すれば受けない）。オアシスで休める
import type { ScenarioDef } from '../../../types';
import { sandDynastyMap } from './map';

export const sandDynasty: ScenarioDef = {
  id: 'sandDynasty',
  order: 4,
  name: '砂塵の王朝',
  synopsis: '砂に埋もれた古い王朝の王が、永遠の命を求めて民の魂を砂に変えている。三つの聖印を集め、砂塵の王を眠らせよ。',
  recommended: '2〜4人',
  playTime: '60〜90分',
  unlocked: false,
  // 作成中: 敵・数値がそろうまで遊べない。仕上げる時に wip を消し、unlockText を「「呪われた群島」をクリアすると遊べる」にする
  wip: true,
  unlockText: '準備中（もうすぐ遊べます）',
  unlockRequires: { cleared: ['cursedArchipelago'] },
  // 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉）
  corruptionName: '砂の侵食',
  start: { gold: 40, pouch: [{ itemId: 'potion', count: 2 }] },
  map: sandDynastyMap,
  story: {
    opening: [
      '砂漠の国ハルカーン。千年前に栄えた王朝は、砂の下に眠っている。',
      '目覚めた砂塵の王は、民の魂を砂に変え、自分だけが永遠に生きようとしている。',
      'オアシスの長老は言った。「三つの聖印を集め、王宮の扉を開いてください。王を、眠らせてやってほしいのです」',
      '砂の侵食が100%に達すれば、国は砂に呑まれる。灼熱の旅が始まる。',
    ],
    ending: [
      '砂塵の王の体が、金色の砂になって崩れていく。',
      '王は千年前、疫病から民を守ろうとして、永遠の命を求めた名君だった。',
      '「…やっと、眠れる」砂の中から、澄んだ水が湧き出した。',
      '砂漠に、千年ぶりの雨が降る。',
      '― 砂塵の王朝 完 ―',
    ],
    keys: { sealScarab: '聖印（甲虫）', sealEye: '聖印（眼）', sealBeast: '聖印（獣）' },
  },
};
