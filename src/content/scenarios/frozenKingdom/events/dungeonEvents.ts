// シナリオ2のダンジョンのイベント部屋。
// ボスの手前の部屋は「物語の部屋」（ボスの正体や、春を奪われた理由が少しずつ分かる。ボス前後の台詞の代わり）
import type { EventDef } from '../../../../types';

export const dungeonEvents: EventDef[] = [
  // ----- 道中のイベント -----
  {
    id: 'frostBridge',
    title: '凍った吊り橋',
    icon: 'trap',
    text: '深い裂け目に、氷で固まった吊り橋が架かっている。きしむたびに、氷のかけらが落ちていく。',
    options: [
      {
        label: '慎重に渡る',
        check: { stat: 'agi', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '無事に渡りきった。向こう岸に、凍った旅人の荷物が残っていた。（40ゴールド）',
        failText: '足が滑り、全員が氷の上に叩きつけられた！（全員 6ダメージ）',
      },
      { label: '遠回りする', success: [{ kind: 'nothing' }], successText: '遠回りして先へ進んだ。' },
    ],
  },
  {
    id: 'buriedChest',
    title: '雪に埋もれた木箱',
    icon: 'tree',
    text: '雪の吹きだまりから、木箱の角がのぞいている。固く凍りついていて、びくともしない。',
    options: [
      {
        label: '氷を砕いて開ける',
        check: { stat: 'str', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '氷が砕け、木箱の中から装備が現れた！',
        failText: '氷の破片で手を切ってしまった…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '木箱には触れずに進んだ。' },
    ],
  },
  {
    id: 'frozenMural',
    title: '氷に閉じこめられた壁画',
    icon: 'stele',
    text: '氷の壁の向こうに、色あせた壁画が見える。笑う人々と、咲き誇る花。百年前の、この国の春だろうか。',
    options: [
      {
        label: '壁画の意味を読み解く',
        check: { stat: 'int', slots: 3, need: 2, tag: 'arcane' },
        success: [{ kind: 'exp', amount: 25 }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '失われた春の歌が、心に流れ込んでくる。（全員 経験値+25）',
        failText: '冷たい氷に魅入られて、体の力が抜けてしまった…。次の戦闘で弱体2。',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '壁画に背を向けて進んだ。' },
    ],
  },
  {
    id: 'frozenCamp',
    title: '無人の野営跡',
    icon: 'sparkles',
    text: '誰かが野営した跡がある。火は消えているが、薪がまだ少し残っている。',
    options: [
      { label: '火をおこして休む（全員のHP+20）', success: [{ kind: 'heal', amount: 20, all: true }], successText: '小さな火にあたって、体が温まった。' },
      { label: '残された荷物を調べる', check: { stat: 'per', slots: 2, need: 1 }, success: [{ kind: 'item', rarity: 'common', slot: 'consumable' }], fail: [{ kind: 'nothing' }], successText: '荷物の底から、回復の品が見つかった。', failText: '荷物はほとんど凍って割れていた。' },
    ],
  },
  {
    id: 'iceSilhouette',
    title: '氷の中の人影',
    icon: 'mask',
    text: '厚い氷の中に、人影が閉じこめられている。目を閉じたまま、何かを抱きしめていた。',
    options: [
      {
        label: '氷を溶かして助ける',
        check: { stat: 'luk', slots: 2, need: 1 },
        success: [{ kind: 'heal', amount: 25, all: true }, { kind: 'gainFocus', amount: 1, all: true }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '人影は礼を言って、光になって消えた。体が温かくなる。（全員 HP+25・フォーカス+1）',
        failText: '冷気があふれ出した！次の戦闘で弱体2。',
      },
      { label: '祈りを捧げて立ち去る', success: [{ kind: 'nothing' }], successText: '静かに祈りを捧げ、その場を後にした。' },
    ],
  },
  {
    id: 'furTrader',
    title: '毛皮商人',
    icon: 'merchant',
    text: '「こんな寒い所でも、商売は商売さ。あったかい物はいかが？」毛皮にくるまった商人が笑う。',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「毎度あり！」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「いい目をしてるね！」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「また、春に会おう」' },
    ],
  },
  // ----- ボスの手前の物語の部屋 -----
  {
    id: 'crystalGate',
    title: '氷晶の広間',
    icon: 'stele',
    text: '洞窟の奥に、巨大な氷晶が並ぶ広間がある。中心で、氷晶の主が眠っている。「…春など、いらぬ。この冷たさだけが、私を守ってくれる」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '氷晶の主が目を開いた。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '凍える空気を吸いこみ、心を落ち着けた。' },
    ],
  },
  {
    id: 'bishopAltar',
    title: '凍れる祭壇',
    icon: 'stele',
    text: '氷に沈んだ聖堂の祭壇で、司教が祈り続けている。「姫様は、民を守るために氷の力を求められた。…その祈りを、私は止められなかった」',
    options: [
      { label: '司教に近づく', success: [{ kind: 'nothing' }], successText: '司教の祈りが、悲しい声に変わった。戦いが始まる！' },
      { label: '祭壇に祈りを捧げる（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: 'かすかな光が、体を温めた。' },
    ],
  },
  {
    id: 'giantGate',
    title: '巨人の坑道',
    icon: 'mountain',
    text: '坑道をふさぐ巨体が、ゆっくりと振り返る。「ここは…通さぬ。女王様は…ただ、寒がっておられるだけだ」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '巨人が咆哮した。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '巨人の足音の中で、心を落ち着けた。' },
    ],
  },
  {
    id: 'queenThrone',
    title: '氷の玉座',
    icon: 'stele',
    text: '玉座の間に、白い影が座っている。「…また、温もりを求める者が来たのですね。百年経っても、民は春を忘れられない。なら、私が凍らせてあげましょう」',
    options: [
      { label: '女王に語りかける', success: [{ kind: 'nothing' }], successText: '女王の瞳に、一瞬だけ涙が光った。「…お願い、私を止めて」戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
];
