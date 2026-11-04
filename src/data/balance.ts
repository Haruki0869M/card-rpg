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
  /** 宝箱のゴールド（レア度ごとの基準） */
  chestGold: { common: 15, rare: 35, epic: 70, legend: 120 } as Record<string, number>,
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

/** 振動パターン（ms） */
export const VIBRATION = {
  perfect: [25, 30, 25],
  hurt: 20,
  victory: [40, 40, 80],
} as const;
