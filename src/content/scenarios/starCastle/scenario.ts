// シナリオ5「星降る天空城」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
// 遊びの違い: 夜に強い敵が出て、夜だけ起きる出来事（流れ星など）がある。星読み（占星術師）が役に立つ
import type { ScenarioDef } from '../../../types';
import { starCastleMap } from './map';

export const starCastle: ScenarioDef = {
  id: 'starCastle',
  order: 5,
  name: '星降る天空城',
  art: 'card-starCastle',
  synopsis: '夜空から落ちる星のかけらが、天空城の女王を狂わせている。三つの星環を集めて天空城へ入り、星の暴走を止めよ。',
  recommended: '2〜4人',
  playTime: '60〜90分',
  unlocked: true,
  unlockText: '「砂塵の王朝」をクリアすると遊べる',
  unlockRequires: { cleared: ['sandDynasty'] },
  fourPlayerAttack: 2.0,
  // 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉）
  corruptionName: '星の暴走',
  start: { gold: 40, pouch: [{ itemId: 'potion', count: 2 }] },
  map: starCastleMap,
  story: {
    opening: [
      '雲の上に浮かぶ王国、セレスティア。空には、天空城がそびえている。',
      'だが近ごろ、夜空から落ちる星のかけらが、城の女王を狂わせてしまった。',
      '雲の港の老天文官は告げた。「三つの星環を集め、天空城の門を開いてください。女王の星読みを、止めてほしいのです」',
      '星の暴走が100%に達すれば、空は星に呑まれる。夜空の旅が始まる。',
    ],
    ending: [
      '女王の体から、星のかけらが光になって抜けていく。',
      '女王は、民の未来を見通すために星を読み続け、星に呑まれた占い師だった。',
      '「…ありがとう。やっと、明日が見えた」',
      '夜空に、ひとつだけ、やさしい流れ星が走った。',
      '― 星降る天空城 完 ―',
    ],
    keys: { ringWind: '星環（風）', ringStar: '星環（星）', ringMoon: '星環（月）' },
  },
};
