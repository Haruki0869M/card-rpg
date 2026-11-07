// 世界マップのイベント（where: 'map'）。名所（landmark）もイベントとして書く
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'oldRuins',
    where: 'map',
    title: '古い遺跡',
    icon: 'stele',
    text: '崩れた石柱の間に、苔むした祭壇がある。祭壇の上に、翠色の紋章が置かれていた。',
    options: [
      { label: '紋章を手に取る', success: [{ kind: 'nothing' }], successText: '古い紋章を手に入れた。森の村の長老に届けよう。' },
      {
        label: '祭壇を詳しく調べる',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '祭壇の下に隠された金貨を見つけた！（紋章も手に入れた）',
        failText: '何も見つからなかった。（紋章は手に入れた）',
      },
    ],
  },
  {
    id: 'woundedTraveler',
    where: 'map',
    title: '傷ついた旅人',
    icon: 'tree',
    text: '道端に、魔物に襲われた旅人がうずくまっている。',
    options: [
      {
        label: '手当てをする',
        check: { stat: 'int', slots: 2, need: 1 },
        success: [{ kind: 'gold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'gold', amount: 10 }],
        successText: '旅人は元気を取り戻し、お礼をくれた。',
        failText: '手当てはうまくいかなかったが、旅人は小銭をくれた。',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '心を鬼にして先へ進んだ。' },
    ],
  },
  {
    id: 'abandonedCamp',
    where: 'map',
    title: '打ち捨てられた野営地',
    icon: 'tree',
    text: '焚き火の跡がまだ温かい。荷物が散らばっている。',
    options: [
      {
        label: '荷物を探る',
        check: { stat: 'dex', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'status', status: 'poison', amount: 3 }],
        successText: '良い装備が残されていた！',
        failText: '毒針の罠だった…。次の戦闘で毒3。',
      },
      { label: '火のそばで休む', success: [{ kind: 'heal', amount: 15, all: true }], successText: '少し体を休めた。（HP+15）' },
    ],
  },
  {
    id: 'whisperingStone',
    where: 'map',
    title: 'ささやく石',
    icon: 'stele',
    text: '黒い石が、聞き取れないほどの声でささやいている。触れると何かが流れ込んできそうだ。',
    options: [
      {
        label: '石に触れる',
        check: { stat: 'luk', slots: 3, need: 2 },
        success: [{ kind: 'exp', amount: 30 }, { kind: 'corruption', amount: -3 }],
        fail: [{ kind: 'corruption', amount: 3 }, { kind: 'damage', amount: 8 }, { kind: 'status', status: 'curse', amount: 2 }],
        successText: '石の瘴気を浄化した！（経験値+30・侵食度-3%）',
        failText: '瘴気が噴き出した…（侵食度+3%・8ダメージ・次の戦闘で呪い2）',
      },
      { label: '離れる', success: [{ kind: 'nothing' }], successText: '触らぬ神にたたりなし。' },
    ],
  },
];
