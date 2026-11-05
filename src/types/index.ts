// ===== ゲーム全体で使う型定義 =====
// データ（職業・カード・敵）は src/data に、ロジックは src/engine に置く。
// 特定の職業ID・敵IDに依存した分岐はエンジンにも画面にも書かない（spec §2.4）。

export type CardCategory = 'physical' | 'magic' | 'skill';
/** 状態異常のID（src/content の statuses に登録したもの） */
export type StatusId = string;
export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
export type Gender = 'male' | 'female';
export type PlayerId = 'P1' | 'P2' | 'P3' | 'P4';

/** 7つの能力値（spec §6.1） */
export type StatId = 'str' | 'vit' | 'int' | 'per' | 'dex' | 'agi' | 'luk';
export type Stats = Record<StatId, number>;
/** カテゴリごとの成功率補正（%） */
export type Affinity = Record<CardCategory, number>;

// ---------- カード ----------

export type CardTarget = 'enemy' | 'self' | 'allEnemies';

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
  | { kind: 'tauntAll' }
  /** 味方全員にブロック */
  | { kind: 'blockAllies'; amount: number }
  /** 味方全員のHP回復 */
  | { kind: 'healAllies'; amount: number };

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
  /** 報酬・宝箱での出やすさの格（未指定はコモン扱い） */
  rarity?: Rarity;
  /** カードの特殊能力（エピック以上は必ず持つ。spec §13.1） */
  trait?: CardTraitDef;
}

/** カードの特殊能力の種類。新しい種類が必要になったら、ここに1つ追加する */
export type CardTrait =
  /** 貫通: ダメージがブロックを無視する */
  | { kind: 'pierce' }
  /** 吸収: HPに与えたダメージの pct% だけ自分のHPを回復 */
  | { kind: 'drain'; pct: number }
  /** 魔力還元: 完全成功でマナ+amount */
  | { kind: 'perfectMana'; amount: number }
  /** 止め: 対象のHPが belowPct% 以下ならダメージ×multiplier */
  | { kind: 'execute'; belowPct: number; multiplier: number };

export interface CardTraitDef {
  name: string;
  description: string;
  effect: CardTrait;
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
  | { kind: 'coverLethal'; chance: number }
  /** カードの完全成功時: フォーカス回復 */
  | { kind: 'onPerfectGainFocus'; category?: CardCategory; amount: number }
  /** カードの完全成功時: カードを引く */
  | { kind: 'onPerfectDraw'; category?: CardCategory; amount: number }
  /** 味方フェーズの開始時: ブロック（allies なら味方全員） */
  | { kind: 'turnStartBlock'; amount: number; allies?: boolean }
  /** 味方フェーズの開始時: HP回復 */
  | { kind: 'turnStartHeal'; amount: number }
  /** 味方フェーズの開始時: 確率（%）でフォーカス回復 */
  | { kind: 'turnStartFocus'; amount: number; chance: number };

/** 探索の特殊能力（M2以降で使用。M1ではデータと説明のみ） */
export type ExploreAbility =
  | { kind: 'checkBonus'; check: string; bonus: number }
  /** 視界+N（M3）、隠し宝箱を見つける確率+X% */
  | { kind: 'tracking'; vision: number; hiddenFindBonus: number }
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
  /** 一覧での並び順（小さいほど先） */
  order?: number;
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
  /** レベルが1上がるごとの最大HP */
  hpPerLevel: number;
  /** 装備できる武器の種類 */
  weaponType: WeaponType;
  /** 初期装備（アイテムID） */
  startingEquipment: Partial<Record<EquipSlot, string>>;
  /** 報酬で出るカードの候補（カードID） */
  cardPool: string[];
  /** 成長ボーナスで伸びやすい能力値（重み） */
  growthWeights: Partial<Record<StatId, number>>;
}

export type WeaponType = 'sword' | 'staff' | 'hammer' | 'bow';
export type EquipSlot = 'weapon' | 'armor' | 'accessory';

/** パーティの1枠の指定（キャラクター作成の結果） */
export interface PartyMemberSpec {
  classId: string;
  gender: Gender;
  name: string;
  playerId: PlayerId;
  level?: number;
  /** 冒険中のキャラから戦闘を作る時の引き継ぎ値（無ければ職業の初期値） */
  heroId?: string;
  hp?: number;
  maxHp?: number;
  focus?: number;
  focusMax?: number;
  stats?: Stats;
  deck?: CardInstance[];
  /** 戦闘開始時のブロック（装備） */
  startBlock?: number;
  /** 毎ターンのドロー枚数の追加（装備） */
  extraDraw?: number;
  /** 戦闘開始時の状態異常 */
  statuses?: Partial<Statuses>;
  /** 職業以外から得た戦闘の特殊能力（装備） */
  abilities?: GrantedAbility[];
}

/** 装備などから得た戦闘の特殊能力（戦闘の状態に持たせる。シリアライズ可能） */
export interface GrantedAbility {
  name: string;
  effect: BattleAbility;
}

// ---------- 敵 ----------

export type EnemyEffect =
  | { kind: 'attack'; amount: number; hits: number; target: 'single' | 'all' }
  | { kind: 'block'; amount: number; target: 'self' | 'otherEnemies' }
  | { kind: 'debuff'; status: StatusId; amount: number; target: 'single' | 'all' };

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
  /** 倒した時の経験値・ゴールド（baseLevel の時） */
  exp: number;
  gold: number;
  /** ボスの段階（HPが belowHpPct% 以下になると行動が変わる） */
  phases?: EnemyPhaseDef[];
}

export interface EnemyPhaseDef {
  belowHpPct: number;
  name: string;
  actions: EnemyActionDef[];
  pattern: 'sequence' | 'random';
  maxConsecutive?: number;
}

export interface EncounterSpec {
  id: string;
  name: string;
  enemies: { defId: string; level?: number }[];
}

// ---------- 戦闘の状態 ----------

/** 状態異常の数値（ID → 数。登録されていないIDや0は「無し」） */
export type Statuses = Record<StatusId, number>;

/** 状態異常の定義（spec §14・M3-0） */
export interface StatusDef {
  id: string;
  order?: number;
  name: string;
  /** アイコンの種類（画面側の STATUS_ICONS のキー） */
  icon: string;
  color: string;
  bg: string;
  /** 悪い効果か（万能薬で治る） */
  harmful: boolean;
  /** 持ち主のフェーズの終わりに受ける継続ダメージ（'stacks' = 数値分、数 = 固定値）。ブロック無視 */
  tickDamage?: 'stacks' | number;
  /** 持ち主のフェーズの終わりに減る数（省略は1。0なら減らない） */
  decay?: number;
  /** 付いている間、与えるダメージ・受けるダメージにかかる倍率 */
  dealtMultiplier?: number;
  takenMultiplier?: number;
  /** 説明文（省略すると数値から自動で作る） */
  description?: string;
}

export interface CardInstance {
  uid: string;
  cardId: string;
  /** 強化済み（名前に＋） */
  upgraded?: boolean;
  /** 武器から一時的に加わったカード */
  fromWeapon?: boolean;
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
  focusMax: number;
  /** 装備・成長を反映した能力値 */
  stats: Stats;
  extraDraw: number;
  /** 装備から得た戦闘の特殊能力 */
  abilities?: GrantedAbility[];
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
  /** ボスの段階（0 = 最初） */
  phase: number;
}

export type Phase = 'ally' | 'enemy' | 'victory' | 'defeat' | 'escaped';

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
  /** 消費アイテムを使う（アイテムの所持の管理は冒険側。ここでは効果だけ） */
  | { type: 'USE_ITEM'; playerId: PlayerId; characterId: string; targetId: string; itemName: string; effect: ConsumableEffect }
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
  | { type: 'enemyPhase'; enemyUid: string; name: string }
  | { type: 'heal'; unitId: string; amount: number }
  | { type: 'phase'; phase: Phase };

export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
  error?: string;
}

/** 消費アイテムの効果 */
export type ConsumableEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'focus'; amount: number }
  | { kind: 'cleanse' }
  | { kind: 'escape' };

export * from './game';
