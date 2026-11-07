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
/** 成功率の補正。カードの種類ごと＋能力値ごと（カードが参照する能力値を決めている時に使う） */
export type Affinity = Record<CardCategory, number> & { byStat?: Partial<Record<StatId, number>> };

// ---------- カード ----------

export type CardTarget = 'enemy' | 'self' | 'allEnemies';

// ---------- 属性（spec §14。火・氷・雷・毒・闇・聖 など） ----------

/** 属性。属性のダメージがHPに当たると、確率で状態異常を与える（完全成功なら必ず） */
export interface ElementDef {
  id: string;
  order?: number;
  name: string;
  color: string;
  /** アイコンの種類（画面側の ELEMENT_ICONS のキー） */
  icon: string;
  /** 与える状態異常と確率（%）・数 */
  status?: string;
  chance?: number;
  amount?: number;
}

// ---------- 効果（カード・敵の行動・消費アイテム・特殊能力で共通の部品。spec §2.4） ----------

/**
 * 効果の対象。
 * target = 選んだ対象（カードの対象の敵 / 敵の行動の対象の味方 / アイテムを使う相手。全体カードなら相手全員）
 * self = 自分 / allies = 自分の側の全員 / otherAllies = 自分以外の自分の側 / foes = 相手の側の全員 / randomFoe = 相手からランダムに1人
 */
export type EffectTarget = 'target' | 'self' | 'allies' | 'otherAllies' | 'foes' | 'randomFoe' | 'lowestAlly';

/**
 * 効果の種類ごとの数値。効果のファイル（src/engine/battle/effects/）が declare module でここに種類を足す。
 * 新しい効果 = ファイルを1つ置くだけで、カード・敵・アイテム・特殊能力のデータから使える
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EffectParams {}

/** 効果1つ（例: { kind: 'damage', amount: 6 } / { kind: 'block', amount: 5, to: 'allies' }） */
export type Effect = { [K in keyof EffectParams]: { kind: K; to?: EffectTarget } & EffectParams[K] }[keyof EffectParams];
export type EffectKind = keyof EffectParams;
/** 互換のための別名 */
export type CardEffect = Effect;

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
  /** カードの特殊能力（エピック以上は必ず持つ。このカードを使っている間だけ働く。spec §13.1） */
  trait?: AbilityDef;
  /** 成功率の基準にする能力値（例: 刀の見切り＝感知）。無ければカードの種類（物理＝力・魔法＝知力・スキル＝器用） */
  stat?: StatId;
}

// ---------- 特殊能力（職業・装備・カード・敵で共通。spec §2.4・§6.2・§12.7・§13.1） ----------

/**
 * 発動のきっかけ。戦闘の流れの決まった場面で呼ばれる。
 * battleStart 戦闘開始時 / turnStart 自分の側のフェーズ開始時 / turnEnd 自分の側のフェーズ終了時 /
 * afterCard カードを使った後 / perfect カードが完全成功した時 / kill 敵を倒した時 / hurt HPにダメージを受けた時
 */
export type AbilityTrigger = 'battleStart' | 'turnStart' | 'turnEnd' | 'afterCard' | 'perfect' | 'kill' | 'hurt';

/** 発動の条件の種類ごとの数値。条件のファイル（src/engine/abilities/conditions/）が declare module で種類を足す */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ConditionParams {}
export type AbilityCondition = { [K in keyof ConditionParams]: { kind: K } & ConditionParams[K] }[keyof ConditionParams];

/**
 * 特殊能力の中身。
 * - 発動型: きっかけ（when）＋ 条件（if。全部満たすと発動。上から順に判定）＋ 効果（do。効果の部品）
 * - 常時型（modifier）: damageDealt = 与えるダメージの倍率 / ignoreBlock = ブロックを無視 / coverLethal = 仲間をかばう
 */
export type AbilityEffect =
  | { when: AbilityTrigger; if?: AbilityCondition[]; do: Effect[] }
  | { modifier: 'damageDealt'; multiplier: number; if?: AbilityCondition[] }
  | { modifier: 'ignoreBlock'; if?: AbilityCondition[] }
  | { modifier: 'coverLethal'; chance: number };

export interface AbilityDef {
  name: string;
  /** 説明文（省略すると中身から自動で作る。雰囲気の文を足したい時だけ書く） */
  description?: string;
  effect: AbilityEffect;
}

/** 探索の特殊能力（世界マップ・イベントで効く） */
export type ExploreAbility =
  | { kind: 'checkBonus'; check: string; bonus: number }
  /** 視界+N（M3）、隠し宝箱を見つける確率+X% */
  | { kind: 'tracking'; vision: number; hiddenFindBonus: number }
  | { kind: 'nightAmbushReduction'; multiplier: number }
  | { kind: 'extraEventOption'; tag: string }
  /** 移動力の判定のスロット+N（武闘家など） */
  | { kind: 'moveSlots'; slots: number }
  /** 野営・休憩の回復の倍率（僧侶など） */
  | { kind: 'restBonus'; multiplier: number }
  /** 祠とイベントのマスが、霧の中でも見える（召喚士など） */
  | { kind: 'sense' };

export interface ExploreAbilityDef {
  id: string;
  name: string;
  description: string;
  effect: ExploreAbility;
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
  battleAbility: AbilityDef;
  exploreAbility: ExploreAbilityDef;
  /** 名前の候補（性別ごと） */
  names: Record<Gender, string[]>;
  /** 最初から選べるか（M4の伝承の書で解放） */
  unlocked: boolean;
  /** レベルが1上がるごとの最大HP */
  hpPerLevel: number;
  /** 得意な武器の種類（初期装備。専用カードが出やすい） */
  weaponType: WeaponType;
  /** 装備できるほかの武器の種類（専用カードは出にくい） */
  subWeapons?: WeaponType[];
  /** ジョブの段（無ければ基本）。転職システム（spec §6.4） */
  tier?: JobTier;
  /** 系統（武・魔・聖・技） */
  lineage?: Lineage;
  /** 転職元のジョブ（このジョブになれる元） */
  from?: string[];
  /** 転職の条件（その冒険の中で達成する。feat はキャラの記録のキー） */
  requires?: { feat: string; count: number; text: string };
  /** 転職した時に山札へ加わるカード（1回きりの決め技など） */
  jobCards?: string[];
  /** 初期装備（アイテムID） */
  startingEquipment: Partial<Record<EquipSlot, string>>;
  /** 報酬で出るカードの候補（カードID） */
  cardPool: string[];
  /** 成長ボーナスで伸びやすい能力値（重み） */
  growthWeights: Partial<Record<StatId, number>>;
}

/** ジョブの段: 基本 / 中位 / 最上位 / 特殊（中位からの脇道） */
export type JobTier = 'base' | 'mid' | 'top' | 'special';
/** 系統: 武・魔・聖・技 */
export type Lineage = 'bu' | 'ma' | 'sei' | 'gi';

/** 武器の種類のID（src/content の weaponTypes に登録したもの） */
export type WeaponType = string;

export interface WeaponTypeDef {
  id: string;
  order?: number;
  name: string;
  /** アイテムのアイコンの種類 */
  icon: string;
}
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
  abilities?: AbilityDef[];
}

// ---------- 敵 ----------

/** 敵の行動の効果（カードと同じ部品。target は行動の対象の味方、foes は味方全員） */
export type EnemyEffect = Effect;

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
  /** 行動の決め方（src/engine/battle/ai/ のID。sequence = 順番 / random = ランダム） */
  pattern: string;
  actions: EnemyActionDef[];
  firstActionId?: string;
  /** レベルが1上がるごとのHP・攻撃の増加率（省略は balance.ts の共通値） */
  hpPerLevel?: number;
  attackPerLevel?: number;
  maxConsecutive?: number;
  /** 戦場での大きさ（1 = 標準、ボスは大きく） */
  size?: number;
  /** 倒した時の経験値・ゴールド（baseLevel の時） */
  exp: number;
  gold: number;
  /** ボスの段階（HPが belowHpPct% 以下になると行動が変わる） */
  phases?: EnemyPhaseDef[];
  /** 敵の特殊能力（味方と同じ書き方） */
  abilities?: AbilityDef[];
  /** 弱点の属性（ダメージ×1.5）・耐性のある属性（ダメージ×0.5・状態異常が効かない） */
  weak?: string[];
  resist?: string[];
}

export interface EnemyPhaseDef {
  belowHpPct: number;
  name: string;
  actions: EnemyActionDef[];
  pattern: string;
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
  /** 持ち主のフェーズの始めに回復する量（'stacks' = 数値分、数 = 固定値。再生など） */
  tickHeal?: 'stacks' | number;
  /** 受ける回復量の倍率（呪いなど） */
  healMultiplier?: number;
  /** 味方: カードの成功率がこれだけ下がる（%。痺れなど） */
  chancePenalty?: number;
  /** 敵: 行動がこの確率（%）で失敗する（痺れなど） */
  actionFailChance?: number;
  /** 敵: 次の行動を1回休む / 味方: 次のフェーズのマナが減る（凍結など）。どちらも起きた時に1減る */
  skipAction?: boolean;
  manaPenalty?: number;
  /** 重ねられる上限（省略は上限なし） */
  maxStacks?: number;
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
  /** この戦闘の記録（転職の条件。敵を倒した数など。戦闘の後でキャラの記録に足す） */
  feats?: Record<string, number>;
  /** このターンに使ったカードの枚数（連撃など） */
  played?: number;
  /** 能力の数え（幻獣ゲージなど。キーは能力ごと） */
  counters?: Record<string, number>;
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
  abilities?: AbilityDef[];
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
  /** このターンにダメージを与えた味方（連携攻撃の判定。M3-C5） */
  hitBy?: string[];
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
  /** 味方が狙っている敵（味方ID → 敵の uid。M3-C5） */
  aims?: Record<string, string>;
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
  /** オンライン協力: 全員が「準備完了」を押すまで敵フェーズに進まない（spec §7.1） */
  readyCheck?: boolean;
  /** 準備完了を押したプレイヤー */
  ready?: PlayerId[];
}

export interface BattleSetup {
  seed: number;
  party: PartyMemberSpec[];
  encounter: EncounterSpec;
  /** 敵のHP・攻撃の倍率（難易度など。省略は1） */
  enemyHpMul?: number;
  enemyAttackMul?: number;
  /** 奇襲成功（敵は1ターン目に行動しない） */
  surprise?: boolean;
  /** オンライン協力: 全員の準備完了を待つ */
  readyCheck?: boolean;
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
  /** 狙っている敵を仲間に見せる（targetId 無しで取り消し。M3-C5） */
  | { type: 'AIM'; playerId: PlayerId; characterId: string; targetId?: string }
  /** 消費アイテムを使う（アイテムの所持の管理は冒険側。ここでは効果だけ） */
  | { type: 'USE_ITEM'; playerId: PlayerId; characterId: string; targetId: string; itemName: string; effects: Effect[] }
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
  | { type: 'phase'; phase: Phase }
  /** オンライン協力: 準備完了を押した */
  | { type: 'ready'; playerId: PlayerId };

export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
  error?: string;
}

/** 消費アイテムの効果（効果の部品の並び） */
export type ConsumableEffect = Effect[];

export * from './game';
export * from './world';
