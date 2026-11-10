// ===== 調整用の数値はすべてここにまとめる =====

export const BALANCE = {
  /** 転職施設は通り道から徒歩で最大2マス以内に置く。 */
  sanctuaryRoadDistance: 2,
  /** 特殊職の能力とHP支払い。 */
  specialJobs: {
    possessionHp: 6, possessionCost: 2, possessionTurns: 3, possessionDamage: 1.2, possessionChance: 10,
    turretDamage: 3, deviceTurns: 3, trapDamage: 3, trapWeak: 1,
    songChance: 10, supportBlock: 2, failureFocus: 1,
    gambleOutcomes: [{ weight: 25, multiplier: 0.75 }, { weight: 50, multiplier: 1 }, { weight: 25, multiplier: 1.5 }],
    chargeFactor: 2, chargeMax: 4, firstTurnMana: 1,
    minionDamage: 3, minionLimit: 3, missingHpPer: 1, missingHpMax: 1,
    bloodCost: 3, offeringCost: 5, abyssCost: 8,
  },
  /** 味方フェーズ開始時に回復するマナ */
  manaPerTurn: 3,
  /** フォーカス初期値 / 最大値 */
  focusStart: 4,
  focusMax: 6,
  /** 味方フェーズ開始時のドロー枚数 / 手札上限 */
  drawPerTurn: 5,
  handLimit: 10,
  /** 成功率の下限・上限（%） */
  chanceMin: 5,
  chanceMax: 95,
  /** 戦闘に参加した味方の人数ごとの敵HP倍率（index = 人数。端数切り捨て） */
  enemyHpByPartySize: [0, 0.6, 1.0, 1.35, 2.2] as readonly number[],
  /** 戦闘に参加した味方の人数ごとの敵の攻撃倍率（4人の時だけ少し強くする。2人・3人は変えない） */
  enemyAttackByPartySize: [1, 1, 1, 1.4, 1.8] as readonly number[],
  /** 敵のレベルが baseLevel より1上がるごとの増加率 */
  enemyHpPerLevel: 0.1,
  enemyAttackPerLevel: 0.08,
  /** 属性: 弱点のダメージ倍率・耐性のダメージ倍率（spec §14） */
  elementWeakMul: 1.5,
  elementResistMul: 0.5,
  /** 能力値 → 戦闘の適性補正: (能力値 - statPivot) / statDivisor（端数切り捨て） */
  statPivot: 60,
  statDivisor: 2,
  /** パーティの最大人数 */
  maxPartySize: 4,
  /** 1回の戦闘の敵の最大数 */
  maxEnemies: 4,
  /** 冒険: レベル上限・次のレベルまでの経験値（20 + 25×(レベル-1)。段の倍率は tierExpMul） */
  maxLevel: 20,
  expBase: 20,
  expPerLevel: 25,
  /**
   * 転職（spec §6.4）: 転職できるレベル（基本→中位 / 中位→最上位 / 中位→特殊）。
   * play-feedback-plan §5（オーナー承認）で 5/4/3 → 6/7/5。中位のLv7までの経験値は合わせて584
   */
  jobChange: { base: 6, mid: 7, special: 5 },
  /** 段が上がるごとの、次のレベルに必要な経験値の倍率（基本1・中位×1.2・最上位と特殊×1.44） */
  tierExpMul: 1.2,
  /** お供: 懐き度の段階（♡1〜5）に必要な点数・撫でた時の点数・戦闘に勝った時の点数・めったに出ない子の出やすさ（%）・名前の長さ */
  petLove: [0, 15, 40, 80, 130],
  petLovePat: 2,
  petLoveBattle: 3,
  petRareChance: 15,
  /** 通常色2種と珍しい色2種の出現率（%） */
  petColorWeights: [35, 35, 15, 15],
  petNameMax: 8,
  /** 伝承の書（K5）: マイペットをスタートの町で呼ぶお金。マイペットに登録できる「一緒にダンジョンをクリアした回数」 */
  myPetCost: 30,
  myPetDungeonClears: 3,
  /** 突発イベント: 何もないマスに移動し終えた時に起きる確率（%）。夜・侵食度50%以上では悪いイベントの重み×1.5 */
  randomEventChance: 20,
  randomEventBadMul: 1.5,
  /** 報酬のスマート抽選: 重なった印1つごとの重みの上乗せ・重みの上限・ショップの係数（設計 v2 §2） */
  smartDraw: { perTag: 0.5, maxWeight: 3, shopStrength: 0.5 },
  /** 報酬の候補の基本の重み（ジョブ専用カードは1）: 得意武器・使える武器・系統・共通のカード（K1） */
  cardPoolWeight: { mainWeapon: 1, subWeapon: 0.5, lineage: 0.7, common: 0.8 },
  /** 戦闘の報酬のカード（キャラごとに3枚）のうち、必ず「ジョブ専用・系統・装備している武器種」のカードから選ぶ枚数（先頭から。K7 オーナー決定）。当てはまるカードが無ければ今までどおり */
  cardRewardJobSlots: 1,
  /** 転職した直後の Lv1→2 は軽く（成長ボーナスをすぐ選べるように） */
  firstLevelExpMul: 0.6,
  /** 敵のレベルが1上がるごとの経験値・ゴールドの増加率 */
  rewardPerLevel: 0.15,
  /** 成長ボーナスの量 */
  growthStat: 5,
  growthMaxHp: 8,
  /** 成長ボーナスの候補: 能力値をいくつ出すか / 残り1枠の候補（src/engine/game/growth/kinds の種類） */
  growthStatPicks: 2,
  growthExtras: ['maxHp', 'focusMax', 'upgradeCard'] as readonly string[],
  /** 休憩部屋の回復（HPは最大HPの割合） */
  restHpRatio: 0.35,
  restFocus: 2,
  /** 宝箱: 運の判定の枠数、鍵開け（器用）の枠数と必要成功数 */
  chestLuckSlots: 3,
  lockSlots: 2,
  lockNeed: 1,
  /** 宝箱のゴールド（中身の格ごとの基準） */
  chestGold: { common: 10, rare: 30, epic: 80, legend: 200 } as Record<string, number>,
  /**
   * 宝箱の見た目ごとの中身の格の確率（%・コモン/レア/エピック/レジェンド）。spec §10.2
   * common=木箱 / rare=鉄箱 / epic=装飾箱 / legend=黄金箱
   */
  chestOdds: {
    common: [88, 10, 1.8, 0.2],
    rare: [55, 38, 6, 1],
    epic: [20, 50, 26, 4],
    legend: [0, 40, 45, 15],
  } as Record<string, readonly number[]>,
  /** 運のスロットの成功数（index）ごとの、格の重みの倍率（コモン/レア/エピック/レジェンド） */
  chestLuckBoost: [
    [1, 1, 1, 1],
    [1, 1.2, 1.5, 1.5],
    [1, 1.4, 2.5, 2.5],
    [1, 1.7, 4, 4],
  ] as readonly (readonly number[])[],
  /** レジェンドのときに先読み予告が出る確率（%） */
  chestOmenChance: 50,
  /** 中身の格ごとの「装備が出る」確率（%。残りは同じ格の消費アイテム。エピック以上は必ず装備） */
  chestEquipChance: { common: 60, rare: 65, epic: 100, legend: 100 } as Record<string, number>,
  /** 中身の格がレア以下の時に、おまけの消費アイテムが付く確率（%） */
  chestBonusConsumable: 25,
  /** カード報酬の格の確率（%・コモン/レア/エピック）。部屋の種類ごと */
  cardRewardOdds: {
    battle: [72, 24, 4],
    elite: [55, 35, 10],
    boss: [35, 45, 20],
  } as Record<string, readonly number[]>,
  /** 戦闘後に隠し宝箱を見つける基本確率（%） */
  hiddenChestBase: 5,
  // ---------- 世界マップ（spec §8） ----------
  /** 視界（マス）と夜の減少 */
  visionRange: 2,
  nightVisionPenalty: 1,
  /** 1つの時間帯（朝・昼・夕方・夜）が何ワールドターン続くか */
  turnsPerTimeOfDay: 2,
  /**
   * 移動のサイコロ（オーナーの案）: 移動力 = 1d6 ＋ 素早さのボーナス（判定の成功率がこの値以上で+1ずつ。+0〜+2）＋ 探索の能力・お供。
   * 前の「2 ＋ 素早さ%×4枠の成功数」と平均がほぼ同じか少し低くなる値（難しめのまま）
   */
  moveDiceSides: 6,
  moveDiceSpeed: [60, 80] as readonly number[],
  /** 探索の能力「移動力の判定のスロット+N」（突進・騎乗・健脚・竜の翼）は、サイコロでは+1 */
  moveDiceSlotBonus: 1,
  /** 野営できる移動力の下限（まだ動いていない目安） */
  moveBase: 2,
  /** 体力と最大HP: 体力が vitHpBase を超えた分 × vitHpRate だけ最大HPが増える（M3-C6） */
  vitHpBase: 60,
  vitHpRate: 0.5,
  /** 連携攻撃: このターンに別の味方が攻撃した敵へのダメージの倍率の上乗せ（M3-C5） */
  comboBonus: 0.2,
  /** ダンジョンの探索のサイコロ（1〜この数）。出た目 = この手番に選べる扉の数（扉1つで1。歩く距離は数えない） */
  exploreDiceSides: 3,
  /** 古い保存データの直し方だけで使う（前の「歩数 = 探索力 × これ」） */
  dungeonStepsPerExplore: 2,
  /** 第3段階C1: 扉の気配が分かる感知の成功率（%）。フクロウのお供・霊感の探索能力でも分かる */
  dungeonSensePer: 70,
  /** 周囲の警戒: 使う歩数・感知の判定の枠・完全成功で次の戦闘に付く「応援」の数 */
  /** 警戒は扉の数を使わない（扉を選ぶだけの形になったので。1つの通路で1回だけ） */
  dungeonWatchSteps: 0,
  dungeonWatchSlots: 2,
  dungeonWatchInspired: 1,
  /**
   * 侵食度: 1ワールドターンごと（世界マップに1人でもいる時）/ ダンジョンに入る時 / 町が陥落した時。
   * 0.25 刻みの小数にしてよい（画面では切り捨てて整数%で出す。corruptionShown）。難易度の corruptionPerTurn は倍率
   */
  corruptionPerTurn: 1,
  /** 侵食度: 1ワールドターンごと（生きているキャラが全員ダンジョンの中の時。ダンジョンが長いので小さめ） */
  corruptionPerDungeonTurn: 0.5,
  corruptionOnDungeonEnter: 2,
  corruptionOnTownFall: 5,
  /**
   * 侵食度: 交代運転（play-feedback-plan §4 A・オーナー承認）。
   * 同じワールドターンのうちに、前の人の手番ですでに動いたキャラを、別の人の手番でまた動かした時に上がる（1手番に1回まで）
   */
  corruptionPerRelayMove: 1,
  /** 侵食度: 鍵のダンジョンを制覇した時に下がる量（ダンジョンごとの corruptionOnClear が無い時。§4 B で 5→2） */
  corruptionOnKeyDungeonClear: 2,
  /** 野営の回復（HPは最大HPの割合）と、夜に野営した時の夜襲の確率（%） */
  campHpRatio: 0.2,
  campFocus: 1,
  nightAmbushChance: 35,
  /** 寒さ・暑さ（K4 段2・提案）: 1ワールドターンごとに減るHP（最大HPの割合。HPは1で止まる）/ そこで野営した時の回復の倍率 */
  climateDamageRatio: 0.05,
  climateCampHealMul: 0.5,
  /** 遭遇: 奇襲（感知）・逃走（素早さ）の枠数と必要成功数、戦闘に参加できる距離 */
  encounterSlots: 3,
  encounterNeed: 2,
  joinRange: 1,
  /** 夜の敵のレベルの加算 / 夜に敵が増える確率（%） / 敵が動く間隔（ワールドターン） */
  nightEnemyLevel: 1,
  nightSpawnChance: 40,
  wandererMoveEvery: 2,
  /** 徘徊する敵を置く時、地域に rareEncounters があれば、この確率（%）でレアの組に置き換える（K3） */
  rareWandererChance: 6,
  /** 町への襲撃: 陥落までのワールドターン / 守った時の報酬 */
  raidTurns: 8,
  raidRewardGold: 80,
  /**
   * 段階6 探索の仕組み（数値はすべて提案）。
   * 見晴らしの塔: 立ち寄ると半径 watchtowerRadius の霧が晴れ、さらに半径 watchtowerSpotRadius 以内の宝箱・神殿・祭壇・レアの敵のマスも見える。
   * 地図の高さが watchtowerTallMap 以上なら3か所、それより低ければ2か所。道から徒歩1〜3マス（2マスを優先）の寄り道の場所に置く。
   */
  watchtowerRadius: 4,
  watchtowerSpotRadius: 7,
  watchtowerTallMap: 24,
  /**
   * 時間で消える出現スポット: 最初は spawnFirstAt ワールドターン目、その後は spawnEveryMin〜Max ターンごとに1つ。
   * 残るターン数 / 出やすさ / キャラから何マス離れた所に出るか（一番近いキャラからの距離）。
   */
  spawnFirstAt: 5,
  /** 古い保存（v16）を読み込んだ時、最初の出現までのワールドターン */
  spawnMigrateDelay: 2,
  spawnEveryMin: 6,
  spawnEveryMax: 8,
  spawnLife: { star: 3, peddler: 4, thief: 3 },
  spawnWeight: { star: 4, peddler: 3, thief: 3 },
  spawnDistance: [3, 6] as readonly [number, number],
  /** 祠の永続の加護の上限（1人あたり） */
  maxBlessings: 3,
  /** ショップ: 品揃えが入れ替わる間隔（ワールドターン）、格ごとの値段、売値の割合 */
  shopRefreshTurns: 8,
  itemPrice: { common: 30, rare: 70, epic: 160, legend: 400 } as Record<string, number>,
  cardPrice: { common: 40, rare: 75, epic: 140, legend: 300 } as Record<string, number>,
  sellRatio: 0.5,
  /** カードの削除で残す最低の枚数 */
  minDeckSize: 5,
  /** 戦闘に負けて命の灯火で復活した時のHP（最大HPの割合） */
  reviveHpRatio: 0.5,
  /** 戦闘ログの最大件数 */
  logLimit: 300,
} as const;

/** 演出時間（秒）。高速モードでは全体を speedFactor で割る */
export const TIMING = {
  /** スロット演出全体 */
  slotReveal: 0.15,
  /** 世界マップの1マスと到着演出（秒） */
  worldMoveStep: 0.17,
  /** 到着の演出。フェーズ2-D で 0.3 → 0.25（到着〜イベントの窓までの待ちを約1秒から約0.6秒に） */
  worldArrival: 0.25,
  /** 突発イベントの「！」のカットイン（この後に窓を出す）と、窓が出る時間。フェーズ2-D で 0.35/0.15 → 0.25/0.12 */
  eventBang: 0.25,
  eventWindowIn: 0.12,
  /** 移動力・探索力の判定のスロットが回る時間（見た目だけ。フェーズ2-D） */
  rollSpin: 0.35,
  /** 表示だけの段取り。ゲームの結果・乱数は待たせない。 */
  actionLead: 0.16,
  effectStep: 0.08,
  abilityCutin: 0.7,
  petPulse: 0.6,
  popupRows: 3,
  cutinVisible: 2,
  presentationFramesMax: 48,
  /** 結果ポップアップの表示時間 */
  resultPopup: 0.6,
  /** 重なりの演出（Step C）の戦場の揺れ（秒。見た目だけ。高速の設定では短くなる） */
  synergyShake: 0.12,
  /** 敵1体の行動間隔（前の敵の数字の表示が終わってから、次の敵が動くまでの間） */
  enemyStep: 0.4,
  /** 「ターン N」「敵のターン」の帯の表示時間（数字の表示が全部終わってから出す） */
  phaseBanner: 1.0,
  /** 長押し判定 */
  longPress: 0.4,
  /** 使えないカードの理由表示 */
  reasonFlash: 1.0,
  /** 高速モードの倍率 */
  fastModeFactor: 2,
  /** 手番のカットイン（自分の番の大きな表示 / 簡易・高速・動作軽減の時 / ほかの人の番の小さなお知らせ）。秒 */
  turnCutin: 1.2,
  turnCutinShort: 0.6,
  /** 1人で全員を操作する時（担当が全員 P1）の、世界マップの手番の帯（ステップB。毎回待たされないように短く） */
  turnCutinSolo: 0.5,
  turnNotice: 1.0,
  /** ダンジョンの演出（第3段階B2）: 1歩・ここまで歩くの1歩・向きを変える・扉が開く・簡易の時の切り替え。秒 */
  dungeonStep: 0.25,
  dungeonWalkStep: 0.15,
  dungeonTurn: 0.25,
  dungeonDoor: 0.45,
  dungeonSimple: 0.1,
  /** 移動のサイコロ: 転がる時間・目が出てから消えるまで。秒（高速モードは半分） */
  diceRoll: 1.0,
  diceHold: 1.1,
} as const;

/** 宝箱・カード報酬の演出時間（秒）。高速モードでは fastModeFactor で割る。spec §10.3 */
export const REVEAL_TIMING = {
  /** リールが止まる間隔 / テンパイ時の最後のリールの溜め */
  reelStop: 0.28,
  reelTenpai: 0.9,
  /** 確率の帯が伸びる */
  oddsShift: 0.55,
  /** 先読み予告 */
  omen: 0.9,
  /** 揺れ（最初の光が漏れるまで） */
  shake: 0.45,
  /** 光の色が1段上がるごと */
  lightStep: 0.55,
  /** リーチ演出（エピック以上） */
  reach: 1.1,
  /** レジェンドのプレミア演出 */
  premium: 1.6,
  /** カード報酬: 1枚めくる間隔 / レア以上の溜め */
  cardFlip: 0.22,
  cardFlipRare: 0.45,
} as const;

/** 振動パターン（ms） */
export const VIBRATION = {
  /** 宝箱: 光が1段上がる / リーチ / レジェンド確定 */
  chestStep: 50,
  chestReach: [60, 50, 60],
  chestLegend: [120, 60, 120, 60, 300],
  perfect: [50, 30, 50],
  hurt: 50,
  /** 自分のキャラの手番が来た（手番のカットイン） */
  turn: 50,
  victory: [50, 40, 80],
} as const;
