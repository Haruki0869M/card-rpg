// ===== 調整用の数値はすべてここにまとめる =====

export const BALANCE = {
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
  /** 状態異常の倍率 */
  vulnerableMultiplier: 1.5,
  weakMultiplier: 0.75,
  /** 火傷1回あたりのダメージ（毒は残り数がそのままダメージ） */
  burnDamage: 4,
  /** 戦闘に参加した味方の人数ごとの敵HP倍率（index = 人数。端数切り捨て） */
  enemyHpByPartySize: [0, 0.6, 1.0, 1.35, 1.7] as readonly number[],
  /** 敵のレベルが baseLevel より1上がるごとの増加率 */
  enemyHpPerLevel: 0.1,
  enemyAttackPerLevel: 0.08,
  /** 能力値 → 戦闘の適性補正: (能力値 - statPivot) / statDivisor（端数切り捨て） */
  statPivot: 60,
  statDivisor: 2,
  /** パーティの最大人数 */
  maxPartySize: 4,
  /** 1回の戦闘の敵の最大数 */
  maxEnemies: 4,
  /** 冒険: レベル上限・次のレベルまでの経験値（20 + 15×(レベル-1)） */
  maxLevel: 20,
  expBase: 20,
  expPerLevel: 15,
  /** 敵のレベルが1上がるごとの経験値・ゴールドの増加率 */
  rewardPerLevel: 0.15,
  /** 成長ボーナスの量 */
  growthStat: 5,
  growthMaxHp: 8,
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
  /** 強敵のドロップがエピックになる確率（%。残りはレア） */
  eliteEpicDrop: 10,
  /** カード報酬の格の確率（%・コモン/レア/エピック）。部屋の種類ごと */
  cardRewardOdds: {
    battle: [72, 24, 4],
    elite: [55, 35, 10],
    boss: [35, 45, 20],
  } as Record<string, readonly number[]>,
  /** 戦闘後に隠し宝箱を見つける基本確率（%） */
  hiddenChestBase: 5,
  /** 難易度ごとの敵レベルの補正 */
  difficultyLevel: { easy: -1, normal: 0, hard: 1 } as Record<string, number>,
  /** 戦闘ログの最大件数 */
  logLimit: 300,
} as const;

/** 演出時間（秒）。高速モードでは全体を speedFactor で割る */
export const TIMING = {
  /** スロット演出全体 */
  slotReveal: 0.15,
  /** 結果ポップアップの表示時間 */
  resultPopup: 0.6,
  /** 敵1体の行動間隔 */
  enemyStep: 0.35,
  /** 長押し判定 */
  longPress: 0.4,
  /** 使えないカードの理由表示 */
  reasonFlash: 1.0,
  /** 高速モードの倍率 */
  fastModeFactor: 2,
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
  chestStep: 30,
  chestReach: [60, 50, 60],
  chestLegend: [120, 60, 120, 60, 300],
  perfect: [25, 30, 25],
  hurt: 20,
  victory: [40, 40, 80],
} as const;
