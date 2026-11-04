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
  /** 4人モードの敵HP倍率（端数切り捨て） */
  fourPlayerEnemyHpMultiplier: 1.7,
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
