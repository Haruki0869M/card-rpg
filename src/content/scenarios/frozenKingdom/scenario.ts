// シナリオ2「凍てつく王国」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
// 遊びの違い: 雪原・氷原に立ったままターンが終わると、HPが減る（寒さ。野営すれば受けない）
import type { ScenarioDef } from '../../../types';
import { frozenKingdomMap } from './map';

export const frozenKingdom: ScenarioDef = {
  id: 'frozenKingdom',
  order: 2,
  name: '凍てつく王国',
  synopsis: '百年続く冬に閉ざされた王国エルフロスト。三つの氷晶の鍵を集めて氷の城を開き、春を奪った白の女王を止めよ。',
  recommended: '2〜4人',
  playTime: '60〜90分',
  unlocked: true,
  unlockText: '「侵食の魔王」をクリアすると遊べる',
  unlockRequires: { cleared: ['corruptionKing'] },
  // 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉）
  corruptionName: '冬の深さ',
  start: { gold: 40, pouch: [{ itemId: 'potion', count: 2 }] },
  map: frozenKingdomMap,
  story: {
    opening: [
      '雪の王国エルフロスト。百年前から、この国に春は来ない。',
      '氷の城に住まう白の女王が、国じゅうの温もりを奪い続けているという。',
      '灯火の村の老いた書記官は告げた。「氷晶の鍵を三つ集め、氷の城の扉を開いてください。そして、女王を止めてほしいのです」',
      '冬の深さが100%に達すれば、国は永遠の氷に沈む。凍える大地へ、旅立つ時だ。',
    ],
    ending: [
      '白の女王の体から氷が砕け、やわらかな光があふれた。',
      '女王は百年前、民を寒さから守ろうとして氷の力を使い、その力に呑まれた王国の姫だった。',
      '雪の下から、小さな花が芽を出す。百年ぶりの春が、エルフロストに訪れた。',
      '― 凍てつく王国 完 ―',
    ],
    keys: { crystalWhite: '氷晶の鍵（白）', crystalBlue: '氷晶の鍵（蒼）', crystalSilver: '氷晶の鍵（銀）' },
  },
};
