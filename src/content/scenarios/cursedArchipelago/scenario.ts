// シナリオ3「呪われた群島」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
// 遊びの違い: 海のマスは船でだけ渡れる。船は最初の町で借りる。海には幽霊船が徘徊する
import type { ScenarioDef } from '../../../types';
import { cursedArchipelagoMap } from './map';

export const cursedArchipelago: ScenarioDef = {
  id: 'cursedArchipelago',
  order: 3,
  name: '呪われた群島',
  art: 'card-cursedArchipelago',
  synopsis: '百年前の呪いで、海は深い霧に閉ざされた。船で島々を渡って三つの灯台に灯をともし、幽霊船団の亡霊提督を止めよ。',
  recommended: '2〜4人',
  playTime: '60〜90分',
  unlocked: true,
  unlockText: '「凍てつく王国」をクリアすると遊べる',
  unlockRequires: { cleared: ['frozenKingdom'] },
  // 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉）
  corruptionName: '霧の濃さ',
  start: { gold: 40, pouch: [{ itemId: 'potion', count: 2 }] },
  map: cursedArchipelagoMap,
  story: {
    opening: [
      '大小の島が浮かぶ海、アルカディア群島。百年前から、海は呪いの霧に包まれている。',
      '霧の中を、幽霊船団がさまよい、島々は孤立してしまった。',
      '港町の老船長は言った。「三つの灯台に灯をともせば、霧は晴れる。まずは、わしの船を貸そう」',
      '霧の濃さが100%に達すれば、群島は永遠に霧に沈む。船出の時だ。',
    ],
    ending: [
      '三つの灯が重なり、海を覆っていた霧が光に溶けていく。',
      '亡霊提督は百年前、婚礼の船を守れなかった王国の提督だった。',
      '彼は静かに敬礼をして、波間に消えた。',
      '朝日が昇る。群島に、百年ぶりの青空が広がった。',
      '― 呪われた群島 完 ―',
    ],
    keys: { lightStar: '星の灯', lightMoon: '月の灯', lightSun: '日の灯' },
  },
};
