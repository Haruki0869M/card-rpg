// シナリオ2の世界マップのイベント（where: 'map'）。名所はイベントとして書く。残りは手順4で足す
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'songStone',
    where: 'map',
    // 名所だけ（オーナーの決定 9・シナリオ3の作り直しの点検 C9）: 依頼の春の歌の石碑が、ふつうのイベントのくじで何個も出ないように
    placed: true,
    title: '春の歌の石碑',
    icon: 'stele',
    text: '雪に埋もれかけた石碑に、古い歌が刻まれている。「雪は溶け、花は咲く。灯を絶やさぬ者のもとに」',
    options: [
      { label: '歌を読む', success: [{ kind: 'nothing' }], successText: '歌を心に刻んだ。漁村の長老に伝えよう。' },
      {
        label: '石碑の根元を調べる',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '石碑の根元に、古い金貨が埋まっていた！（歌も読んだ）',
        failText: '何も見つからなかった。（歌は読んだ）',
      },
    ],
  },
  {
    id: 'bonfireTravelers',
    where: 'map',
    // 帯ごとの出し分け（2026-11-21）: 西「凍った湖の近道」は「回復の場所が無い」道なので出さない
    lanes: ['center', 'east'],
    title: '旅人の焚き火',
    icon: 'sparkles',
    text: '誰かが残した焚き火が、まだ小さく燃えている。吹雪の中で、ここだけが温かい。',
    options: [
      { label: '火にあたって休む（全員のHP+20）', success: [{ kind: 'heal', amount: 20, all: true }], successText: '体が芯から温まった。' },
      { label: '薪を足して、火を絶やさないようにする', success: [{ kind: 'gainFocus', amount: 2, all: true }], successText: '火を見つめていると、心が落ち着いた。（全員のフォーカス+2）' },
    ],
  },
  // 温泉（シナリオ2の作り直し §2-1・§8-2）: 地図の herbEvent で、東「巨人の尾根」に置く回復のマス（placed なので、ふつうのイベントのくじには入らない）。
  // 役割: 「HPの回復」と「次の朝まで寒さを受けない」を1か所で（野営 = 番を使ってそのターンだけ／焚き火の旅人 = 回復かフォーカス）。
  // 回復の量は、新しい数字を作らず、薬草の群生地で摘める回復薬（HP+20）と同じ【提案】
  {
    id: 'hotSpring',
    where: 'map',
    placed: true,
    title: '尾根の温泉',
    icon: 'droplet',
    text: '岩の間から湯気が立ちのぼっている。雪の中に、温かい湯が湧いていた。',
    options: [
      {
        label: '湯につかる（全員のHP+20・次の朝まで寒さを受けない）',
        success: [{ kind: 'heal', amount: 20, all: true }, { kind: 'warmth', all: true }],
        successText: '体の芯まで温まった。次の朝まで、寒さはこたえないだろう。',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '湯気を背に、先へ進んだ。' },
    ],
  },
  // ---- シナリオ2だけの地図のイベント4種類（2026-11-21。案 docs/tasks/scenario2-events-scenario3-scourge-proposal.md §1・オーナーの決定「10個とも A」）。数字は全部【提案】 ----
  // 氷上の釣り小屋（西だけ）: 役割 = 速さを払って寒さを止めるか、お金を払ってもっと速く抜けるか。HPは回復しない（西の「回復の場所が無い」を守る）
  {
    id: 'iceFishingHut',
    where: 'map',
    lanes: ['west'],
    regions: ['blizzardRange', 'frozenLake', 'birchSnowForest'],
    title: '氷上の釣り小屋',
    icon: 'droplet',
    text: '凍った湖の上に、釣り人の小屋が建っている。中では小さな火が燃え、外には帆のついたそりが置いてある。',
    options: [
      {
        label: '小屋の火で暖まる（全員、今の時間帯の間は寒さを受けない。このターンはもう動けない）',
        success: [{ kind: 'warmth', all: true, span: 'time', by: '釣り小屋の火' }, { kind: 'move', amount: 0, stop: true }],
        successText: '小さな火にあたって、凍えた手足を温めた。今の時間帯の間、寒さはこたえないだろう。（このターンはもう動けない）',
      },
      {
        label: '帆そりを借りる（移動力+3）',
        cost: 30,
        success: [{ kind: 'loseGold', amount: 30 }, { kind: 'move', amount: 3, label: '帆そり' }],
        successText: '帆が風をつかんで、そりが氷の上を走り出した！（移動力+3。サイコロを振る前なら、次のサイコロに+3）',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '小屋を横目に、先へ進んだ。' },
    ],
  },
  // 薪の番小屋（中央だけ）: 役割 = 暖を持ち出す場所（中央で薪をもらい、西の近道や東の尾根で使う）
  {
    id: 'firewoodHut',
    where: 'map',
    lanes: ['center'],
    title: '薪の番小屋',
    icon: 'cart',
    text: '街道のわきの番小屋に、薪が高く積んである。番人が斧を止めて、こちらを見た。',
    options: [
      {
        label: '薪を分けてもらう（「薪の束」1つ。1人1つまで）',
        cost: 20,
        success: [{ kind: 'loseGold', amount: 20 }, { kind: 'giveItem', itemId: 'firewoodBundle' }],
        successText: '番人から「薪の束」を受け取った。使えば、1人が次の朝まで寒さを受けない。',
      },
      {
        label: '薪割りを手伝う（成功で「薪の束」1つ）',
        check: { stat: 'str', slots: 3, need: 2 },
        success: [{ kind: 'giveItem', itemId: 'firewoodBundle' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '見事な手つきだ、と番人が笑って「薪の束」をくれた。',
        failText: '斧がすべって、手を痛めた…（5ダメージ）',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '番人に会釈して、先へ進んだ。' },
    ],
  },
  // 巨人の炉あと（東だけ）: 役割 = HPを払って、手番のキャラの武器を火にする（次の3戦闘の間だけ。点検 B-3）
  {
    id: 'giantForge',
    where: 'map',
    lanes: ['east'],
    regions: ['blizzardRange', 'frozenLake', 'birchSnowForest'],
    title: '巨人の炉あと',
    icon: 'sword',
    text: '岩をくり抜いた巨人の炉が、雪の中に残っている。底のほうで、消えない残り火が赤く光っていた。',
    options: [
      {
        label: '武器を残り火にくべる（最大HPの15%を失う。次の3戦闘の間、武器に火が宿る）',
        requiresWeapon: true,
        success: [{ kind: 'hpLossPct', pct: 15 }, { kind: 'weaponElement', elements: ['fire'], battles: 3 }],
        successText: '炉の熱で手が焼けた。だが、武器は赤く輝いている。（次の3戦闘の間、属性の無い物理攻撃が火になる）',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '残り火を背に、先へ進んだ。' },
    ],
  },
  // 消えかけの灯籠（西と東）: 役割 = フォーカスと冬の深さを、判定なしで、どちら向きにも取り替える
  {
    id: 'fadingLantern',
    where: 'map',
    lanes: ['west', 'east'],
    title: '消えかけの灯籠',
    icon: 'sparkles',
    text: '道しるべの灯籠が、雪の中で消えかけている。この灯が消えるたび、冬が一歩深くなるという。',
    options: [
      {
        label: '灯をともし直す（冬の深さ-2%）',
        costFocus: 2,
        success: [{ kind: 'corruption', amount: -2 }],
        successText: '灯籠に、温かい光が戻った。冬が、少しだけ遠のいた気がする。（冬の深さ-2%）',
      },
      {
        label: '残った油をもらう（全員のフォーカス+2・冬の深さ+1%）',
        success: [{ kind: 'gainFocus', amount: 2, all: true }, { kind: 'corruption', amount: 1 }],
        successText: '油を分け合って、手元の灯りを明るくした。灯籠の火は、静かに消えた。（全員のフォーカス+2・冬の深さ+1%）',
      },
      { label: 'そのままにする', success: [{ kind: 'nothing' }], successText: '灯籠には触れずに進んだ。' },
    ],
  },
];
