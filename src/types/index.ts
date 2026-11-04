// ===== ゲーム全体で使う型定義 =====
// データ（カード・キャラ・敵）は src/data に、ロジックは src/engine に置く。

export type CardCategory = 'physical' | 'magic' | 'skill';
export type StatusId = 'vulnerable' | 'weak';
export type Side = 'ally' | 'enemy';

/** カードの対象 */
export type CardTarget = 'enemy' | 'self';

/** カードのTier効果 */
export type CardEffect =
  | { kind: 'damage'; amount: number }
  | { kind: 'block'; amount: number }
  | { kind: 'applyStatus'; status: StatusId; amount: number }
  | { kind: 'gainMana'; amount: number }
  | { kind: 'gainFocus'; amount: number }
  | { kind: 'draw'; amount: number }
  /** 対象の敵の単体攻撃を自分に向ける */
  | { kind: 'tauntTarget' }
  /** 敵全体の単体攻撃を自分に向ける */
  | { kind: 'tauntAll' };

export interface CardTier {
  /** この成功数以上で発動（高い方が優先） */
  minSuccesses: number;
  effects: CardEffect[];
}

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  cost: number;
  slots: number;
  /** 基礎成功率（%） */
  baseChance: number;
  target: CardTarget;
  /** minSuccesses 昇順 */
  tiers: CardTier[];
  flavor?: string;
}

export type Affinity = Record<CardCategory, number>;

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  icon: string;
  maxHp: number;
  affinity: Affinity;
  deck: { cardId: string; count: number }[];
  /** 4人モードでのみ登場 */
  fourOnly: boolean;
}

/** 敵の行動効果 */
export type EnemyEffect =
  | { kind: 'attack'; amount: number; hits: number; target: 'single' | 'all' }
  | { kind: 'block'; amount: number; target: 'self' | 'otherEnemies' }
  | { kind: 'debuff'; status: StatusId; amount: number; target: 'single' };

export interface EnemyActionDef {
  id: string;
  name: string;
  effects: EnemyEffect[];
  /** 自分以外の敵がいない時はこの行動に変える */
  fallbackIfAloneId?: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  maxHp: number;
  /** sequence: 決まった順番 / random: ランダム */
  pattern: 'sequence' | 'random';
  actions: EnemyActionDef[];
  /** 1ターン目に必ず使う行動 */
  firstActionId?: string;
  /** random時、同じ行動を連続で使える最大回数 */
  maxConsecutive?: number;
}

export type Statuses = Record<StatusId, number>;

export interface CardInstance {
  uid: string;
  cardId: string;
}

export interface AllyState {
  id: string; // CharacterDef.id
  hp: number;
  maxHp: number;
  block: number;
  mana: number;
  focus: number;
  statuses: Statuses;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  dead: boolean;
}

export interface Intent {
  actionId: string;
  /** 単体対象（単体攻撃・単体デバフ）の対象の味方ID */
  targetId?: string;
}

export interface EnemyState {
  uid: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
  /** 挑発した味方ID（次の敵フェーズ終了まで） */
  tauntedBy?: string;
  intent?: Intent;
  /** sequence 用の次の行動インデックス */
  seqIndex: number;
  /** 直近の行動ID履歴（新しい順ではなく古い→新しい） */
  history: string[];
  dead: boolean;
}

export type Phase = 'ally' | 'enemy' | 'victory' | 'defeat';

export interface BattleStats {
  totalDamage: number;
  maxDamage: number;
  perfects: number;
  focusUsed: number;
}

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
}

export interface BattleState {
  version: number;
  seed: number;
  rngState: number;
  partySize: 2 | 4;
  turn: number;
  phase: Phase;
  allies: AllyState[];
  enemies: EnemyState[];
  /** 敵フェーズ中、次に行動する敵のインデックス */
  enemyCursor: number;
  stats: BattleStats;
  log: LogEntry[];
  nextLogId: number;
  nextUid: number;
}

// ===== コマンド（シリアライズ可能・将来のマルチプレイで同期する単位） =====
export type Command =
  | {
      type: 'PLAY_CARD';
      characterId: string;
      cardInstanceId: string;
      targetId?: string;
      focusUsed: number;
    }
  | { type: 'END_TURN' }
  /** 敵フェーズを1ステップ進める（敵1体の行動、または敵フェーズ終了処理） */
  | { type: 'ENEMY_STEP' };

export type SlotResult = 'focus' | 'hit' | 'miss';

/** UI演出用のイベント */
export type BattleEvent =
  | {
      type: 'roll';
      characterId: string;
      cardId: string;
      chance: number;
      results: SlotResult[];
      successes: number;
      perfect: boolean;
      summary: string;
    }
  | { type: 'damage'; unitId: string; amount: number; blocked: number }
  | { type: 'block'; unitId: string; amount: number }
  | { type: 'status'; unitId: string; status: StatusId; amount: number }
  | { type: 'retarget'; enemyUid: string }
  | { type: 'enemyAct'; enemyUid: string; actionName: string }
  | { type: 'death'; unitId: string }
  | { type: 'phase'; phase: Phase };

export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
  error?: string;
}
