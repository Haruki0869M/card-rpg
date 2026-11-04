// ===== ゲーム全体で使う型定義 =====
// データ（職業・カード・敵）は src/data に、ロジックは src/engine に置く。
// 特定の職業ID・敵IDに依存した分岐はエンジンにも画面にも書かない（spec §2.4）。

export type CardCategory = 'physical' | 'magic' | 'skill';
export type StatusId = 'vulnerable' | 'weak';
export type Gender = 'male' | 'female';
export type PlayerId = 'P1' | 'P2' | 'P3' | 'P4';

/** 7つの能力値（spec §6.1） */
export type StatId = 'str' | 'vit' | 'int' | 'per' | 'dex' | 'agi' | 'luk';
export type Stats = Record<StatId, number>;
/** カテゴリごとの成功率補正（%） */
export type Affinity = Record<CardCategory, number>;

// ---------- カード ----------

export type CardTarget = 'enemy' | 'self';

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
}

// ---------- 特殊能力（データで定義する共通の部品） ----------

/** 能力の発動条件・効果。新しい種類が必要になったら、ここに1つ追加する */
export type BattleAbility =
  /** 常時: 条件を満たす間、自分の与えるダメージを倍率で補正 */
  | {
      kind: 'damageMultiplier';
      category?: CardCategory;
      multiplier: number;
      whenSelfHpAtMostPct?: number;
    }
  /** カードの完全成功時: ランダムな生存敵に追加ダメージ */
  | { kind: 'onPerfectBonusDamage'; category?: CardCategory; amount: number; chance?: number }
  /** カードの完全成功時: ダメージを与えるカードなら対象に状態異常 */
  | { kind: 'onPerfectApplyStatus'; category?: CardCategory; status: StatusId; amount: number; chance?: number }
  /** 他の味方がHP0になるダメージを受ける時、確率で代わりに受ける */
  | { kind: 'coverLethal'; chance: number };

/** 探索の特殊能力（M2以降で使用。M1ではデータと説明のみ） */
export type ExploreAbility =
  | { kind: 'checkBonus'; check: string; bonus: number }
  | { kind: 'visionBonus'; amount: number }
  | { kind: 'nightAmbushReduction'; multiplier: number }
  | { kind: 'extraEventOption'; tag: string };

export interface AbilityDef<T> {
  id: string;
  name: string;
  description: string;
  effect: T;
}

// ---------- 職業 ----------

export interface ClassDef {
  id: string;
  name: string;
  role: string;
  /** 小さく表示する時の記号（絵が無い場合の代替にも使う） */
  icon: string;
  /** 職業の色（枠などに使う） */
  color: string;
  baseMaxHp: number;
  stats: Stats;
  deck: { cardId: string; count: number }[];
  battleAbility: AbilityDef<BattleAbility>;
  exploreAbility: AbilityDef<ExploreAbility>;
  /** 名前の候補（性別ごと） */
  names: Record<Gender, string[]>;
  /** 最初から選べるか（M4の伝承の書で解放） */
  unlocked: boolean;
}

/** パーティの1枠の指定（キャラクター作成の結果） */
export interface PartyMemberSpec {
  classId: string;
  gender: Gender;
  name: string;
  playerId: PlayerId;
  level?: number;
}

// ---------- 敵 ----------

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
  /** baseLevel の時のHP */
  maxHp: number;
  /** このデータの数値が想定しているレベル */
  baseLevel: number;
  pattern: 'sequence' | 'random';
  actions: EnemyActionDef[];
  firstActionId?: string;
  maxConsecutive?: number;
  /** 戦場での大きさ（1 = 標準、ボスは大きく） */
  size?: number;
}

export interface EncounterSpec {
  id: string;
  name: string;
  enemies: { defId: string; level?: number }[];
}

// ---------- 戦闘の状態 ----------

export type Statuses = Record<StatusId, number>;

export interface CardInstance {
  uid: string;
  cardId: string;
}

export interface AllyState {
  /** 戦闘内で一意のID（a0, a1, ...）。同じ職業が複数いても区別できる */
  id: string;
  classId: string;
  gender: Gender;
  name: string;
  playerId: PlayerId;
  level: number;
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
  targetId?: string;
}

export interface EnemyState {
  uid: string;
  defId: string;
  /** 同じ敵が複数いる時の区別（A, B, ...） */
  nameSuffix?: string;
  level: number;
  /** レベルによる攻撃力の倍率 */
  attackMul: number;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
  tauntedBy?: string;
  intent?: Intent;
  seqIndex: number;
  history: string[];
  dead: boolean;
}

export type Phase = 'ally' | 'enemy' | 'victory' | 'defeat';

export interface BattleStats {
  totalDamage: number;
  maxDamage: number;
  perfects: number;
  focusUsed: number;
  abilityTriggers: number;
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
  turn: number;
  phase: Phase;
  allies: AllyState[];
  enemies: EnemyState[];
  enemyCursor: number;
  stats: BattleStats;
  log: LogEntry[];
  nextLogId: number;
  nextUid: number;
  encounterId: string;
}

export interface BattleSetup {
  seed: number;
  party: PartyMemberSpec[];
  encounter: EncounterSpec;
}

// ===== コマンド（シリアライズ可能・オンライン協力で同期する単位） =====
export type Command =
  | {
      type: 'PLAY_CARD';
      playerId: PlayerId;
      characterId: string;
      cardInstanceId: string;
      targetId?: string;
      focusUsed: number;
    }
  | { type: 'END_TURN'; playerId: PlayerId }
  /** 敵フェーズを1ステップ進める（ホストが発行するシステムコマンド） */
  | { type: 'ENEMY_STEP' };

export type SlotResult = 'focus' | 'hit' | 'miss';

/** UI演出用のイベント */
export type BattleEvent =
  | {
      type: 'roll';
      characterId: string;
      cardId: string;
      targetId?: string;
      chance: number;
      results: SlotResult[];
      successes: number;
      perfect: boolean;
      summary: string;
    }
  | { type: 'damage'; unitId: string; amount: number; blocked: number; sourceId?: string }
  | { type: 'block'; unitId: string; amount: number }
  | { type: 'status'; unitId: string; status: StatusId; amount: number }
  | { type: 'ability'; unitId: string; name: string }
  | { type: 'retarget'; enemyUid: string }
  | { type: 'enemyAct'; enemyUid: string; actionName: string; targetIds: string[] }
  | { type: 'death'; unitId: string }
  | { type: 'phase'; phase: Phase };

export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
  error?: string;
}
