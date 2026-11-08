// 星降る天空城だけの突発イベント（世界マップを移動し終えた時に起きる。K7 の terrain / needsPet / night を使う）
// 悪いイベントでも、判定で突破する / 道具やお金で解決する / やり過ごす のどれかを選べる。ID は頭に sky / star を付ける
import type { EventDef } from '../../../../types';

const BIRDS = ['cockatiel', 'javaSparrow', 'budgie', 'longTailedTit'];

export const starRandomEvents: EventDef[] = [
  {
    id: 'skyGust',
    where: 'random',
    tone: 'bad',
    weight: 9,
    terrain: ['cloud'],
    title: '雲を裂く突風',
    icon: 'mountain',
    text: '足元の雲が、ぐらりと揺れた。強い風が吹き抜けていく。',
    options: [
      {
        label: '身を低くして耐える',
        check: { stat: 'vit', slots: 3, need: 2 },
        success: [{ kind: 'exp', amount: 15 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '突風を耐え抜いた。少し強くなった気がする。（全員 経験値+15）',
        failText: '風に吹き飛ばされかけた…。（全員 6ダメージ）',
      },
      { label: '回復薬を飲んで耐える', costItem: 'potion', success: [{ kind: 'heal', amount: 15, all: true }], successText: '薬が体に染みわたった。（全員 HP+15）' },
      { label: '風が止むのを待つ', success: [{ kind: 'nothing' }], successText: '風が止むのを待って、先へ進んだ。' },
    ],
  },
  {
    id: 'starShower',
    where: 'random',
    tone: 'good',
    weight: 9,
    night: true,
    title: '流れ星',
    icon: 'sparkles',
    text: '夜空に、いくつもの流れ星が走った。ひとつが、すぐ近くに落ちたようだ。',
    options: [
      {
        label: '落ちた星を探しに行く',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'item', rarity: 'rare', slot: 'accessory' }],
        fail: [{ kind: 'nothing' }],
        successText: '星のかけらから、装飾品が見つかった！',
        failText: '星は、光になって消えてしまった。',
      },
      { label: '願いごとをする', check: { stat: 'luk', slots: 2, need: 1 }, success: [{ kind: 'heal', amount: 20, all: true }, { kind: 'gainFocus', amount: 1, all: true }], fail: [{ kind: 'nothing' }], successText: '願いが届いた気がする。（全員 HP+20・フォーカス+1）', failText: '星は、あっという間に消えた。' },
      { label: '見上げて眺める', success: [{ kind: 'nothing' }], successText: 'しばらく、星空に見とれていた。' },
    ],
  },
  {
    id: 'starLostAstronomer',
    where: 'random',
    tone: 'good',
    weight: 8,
    title: '迷子の天文官',
    icon: 'mask',
    text: '大きな望遠鏡を担いだ天文官が、道に迷っている。「あれ、天文台はどっちだったかな…」',
    options: [
      {
        label: '道を教えてあげる',
        check: { stat: 'per', slots: 2, need: 1 },
        success: [{ kind: 'gold', amount: 50 }, { kind: 'gainFocus', amount: 1, all: true }],
        fail: [{ kind: 'nothing' }],
        successText: '天文官は喜んで、礼をくれた。（50G・全員フォーカス+1）',
        failText: '道は教えられなかったが、感謝された。',
      },
      { label: '回復薬を分けてあげる', costItem: 'potion', success: [{ kind: 'gold', amount: 80 }, { kind: 'exp', amount: 20 }], successText: '天文官は星の話を聞かせてくれた。（80G・全員 経験値+20）' },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '天文官に手を振って、先へ進んだ。' },
    ],
  },
  {
    id: 'starBirdOnCloud',
    where: 'random',
    tone: 'pet',
    weight: 8,
    terrain: ['cloud', 'hills'],
    title: '雲の上の小鳥',
    icon: 'bird',
    text: '雲の端に、きれいな小鳥がとまっている。星のかけらを拾って遊んでいるようだ。',
    options: [
      {
        label: '指笛で優しい音色を奏でる',
        check: { stat: 'dex', slots: 3, need: 2 },
        success: [{ kind: 'pet', species: BIRDS }],
        fail: [{ kind: 'gainFocus', amount: 1 }],
        successText: '小鳥は嬉しそうに鳴いて、肩に舞い降りた！',
        failText: '小鳥は飛び去ってしまった。でも、きれいな音色に心が落ち着いた。（フォーカス+1）',
      },
      { label: 'エサを買って分けてあげる', cost: 50, success: [{ kind: 'loseGold', amount: 50 }, { kind: 'pet', species: BIRDS }], successText: '小鳥はお腹いっぱいになって、肩に乗ってきた！（50G）' },
      { label: 'そっと見送る', success: [{ kind: 'nothing' }], successText: '小鳥は空へ帰っていった。' },
      { label: 'お供のおやつを差し出す', costItem: 'petSnack', success: [{ kind: 'pet', species: BIRDS }], successText: '小鳥はおやつに目を輝かせ、迷わず肩に乗ってきた！' },
    ],
  },
  {
    id: 'skyPetStarGazer',
    where: 'random',
    tone: 'pet',
    weight: 8,
    needsPet: true,
    night: true,
    title: '星を見上げるお供',
    icon: 'paw',
    text: 'お供が足を止めて、じっと夜空を見上げている。流れ星が、瞳に映っていた。',
    options: [
      { label: '一緒に星を眺める', success: [{ kind: 'petLove', amount: 12 }], successText: 'お供は寄りかかって、うっとりしている。（懐き度+12）' },
      { label: '毛布をかけて抱っこしてあげる', success: [{ kind: 'petLove', amount: 8, all: true }], successText: 'お供は安心したように目を閉じた。（懐き度+8）' },
      { label: '急いで先へ進む', success: [{ kind: 'nothing' }], successText: 'お供は名残惜しそうについてきた。' },
    ],
  },
];
