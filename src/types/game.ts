// ===== 冒険（ゲーム全体）の型 =====
import type { EncounterState, ScenarioMapDef, ScenarioStory, ShrineVisit, TownVisit, WorldState } from './world';
import type {
  AbilityDef,
  BattleState,
  CardInstance,
  Command,
  ConsumableEffect,
  EquipSlot,
  Gender,
  PlayerId,
  Rarity,
  StatId,
  Stats,
  StatusId,
  WeaponType,
} from './index';

// ---------- アイテム ----------

export interface ItemDef {
  id: string;
  name: string;
  slot: EquipSlot | 'consumable';
  rarity: Rarity;
  /** 武器の種類（武器のみ） */
  weaponType?: WeaponType;
  /** 見た目のアイコンの種類 */
  icon: string;
  description: string;
  /** 能力値の加算 */
  stats?: Partial<Stats>;
  maxHp?: number;
  focusMax?: number;
  startBlock?: number;
  extraDraw?: number;
  /** 装備中に山札へ加わるカード（武器） */
  cards?: { cardId: string; count: number }[];
  /** 消費アイテムの効果 */
  use?: ConsumableEffect;
  /** 装備の特殊能力（エピック以上は必ず持つ。spec §12.7） */
  ability?: AbilityDef;
}

export interface ItemInstance {
  uid: string;
  itemId: string;
}

// ---------- 冒険中のキャラ ----------

export interface Hero {
  id: string;
  classId: string;
  gender: Gender;
  name: string;
  playerId: PlayerId;
  level: number;
  exp: number;
  hp: number;
  focus: number;
  /** 成長ボーナスで得た能力値・最大HP・フォーカス最大値 */
  bonusStats: Partial<Stats>;
  bonusMaxHp: number;
  bonusFocusMax: number;
  /** 自分の山札（武器のカードは戦闘開始時に加わる） */
  deck: CardInstance[];
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  /** 次の戦闘の開始時に付く状態異常（イベントの失敗など） */
  nextBattleStatuses: Partial<Record<StatusId, number>>;
  /** 命の灯火が無い時に戦闘に負けて、冒険から退場した（spec §11.4） */
  retired?: boolean;
  /** 祠の永続の加護の数（上限あり） */
  blessings?: number;
}

// ---------- ダンジョン ----------

/** 部屋の種類のID（src/content の roomTypes に登録したもの） */
export type RoomType = string;

/** 部屋の種類（spec §9）。動き（behavior）は src/engine/game/rooms/ の部品、数値と見た目はこのデータ */
export interface RoomTypeDef {
  id: string;
  order?: number;
  name: string;
  /** 見た目（画面側の ROOM_ICONS のキー）と色 */
  icon: string;
  color: string;
  bg: string;
  /** 部屋に入った時の動き（battle / chest / event / rest） */
  behavior: string;
  /** 戦闘の部屋の設定 */
  battle?: {
    /** ダンジョンの敵の組み合わせのどれを使うか */
    pool: 'battle' | 'elite' | 'boss';
    /** 敵のレベルの加算 */
    levelBonus: number;
    /** カード報酬の確率（balance.ts の cardRewardOdds のキー） */
    cardOdds: string;
    /** ボス（倒すと大宝箱 → ダンジョン制覇。逃げられない。隠し宝箱は出ない） */
    boss?: boolean;
    /** 勝った時に装備を落とす（epicChance% でエピック、それ以外はレア） */
    equipmentDrop?: { epicChance: number };
    /** 勝った時に chance% でコモンの消費アイテムを落とす */
    consumableDrop?: { chance: number };
  };
  /** ランダムダンジョンの途中の行での出やすさ（0なら自動生成では出ない） */
  layoutWeight?: number;
}

export interface ChestSpec {
  /** 宝箱の見た目（common=木箱 / rare=鉄箱 / epic=装飾箱 / legend=黄金箱）。中身の格の確率を決める */
  rarity: Rarity;
  locked: boolean;
  /** 大宝箱（ボス撃破後） */
  big?: boolean;
}

export interface Room {
  id: string;
  row: number;
  col: number;
  type: RoomType;
  next: string[];
  /** 戦闘の敵（生成済み） */
  enemies?: { defId: string; level: number }[];
  chest?: ChestSpec;
  eventId?: string;
  cleared: boolean;
}

export interface DungeonDef {
  id: string;
  name: string;
  description: string;
  /** 背景の種類 */
  background: string;
  /** 敵の基準レベル */
  baseLevel: number;
  /** 出現する敵（戦闘・強敵・ボス） */
  pools: { battle: string[][]; elite: string[][]; boss: string[] };
  /** 固定の部屋の並び（行ごと）。無ければ自動生成 */
  layout?: { type: RoomType; next: number[]; chest?: ChestSpec; eventId?: string }[][];
  /** 大宝箱の見た目（中身の格の確率を決める） */
  bossChest: Rarity;
  /** 制覇すると手に入る封印の鍵（シナリオの story.keys のID） */
  rewardKey?: string;
  /** 入るのに必要な鍵 */
  requiresKeys?: string[];
  /** 制覇すると侵食度がこれだけ下がる */
  corruptionOnClear?: number;
  /** 制覇するとシナリオのクリア（ラスボスのダンジョン） */
  finale?: boolean;
  /** ランダムダンジョン（拠点に戻るたびに形が変わる。layout は使わず自動生成） */
  random?: boolean;
  /** 自動生成の時の部屋の行数 */
  rows?: number;
}

export interface DungeonRun {
  dungeonId: string;
  /** ランダムダンジョンの時の名前 */
  name: string;
  random: boolean;
  background: string;
  rooms: Room[];
  /** 今いる部屋（未入場なら undefined） */
  currentRoomId?: string;
  /** このダンジョンで手に入れたもの（撤退時に1つ失う候補） */
  gained: ItemInstance[];
}

// ---------- 宝箱・イベント・報酬 ----------

export type Loot =
  | { kind: 'item'; item: ItemInstance }
  | { kind: 'gold'; amount: number }
  | { kind: 'card'; cardId: string; heroId: string };

export interface ChestState {
  /** ダンジョンの部屋の宝箱なら部屋ID、世界マップの宝箱ならマスの番号 */
  roomId?: string;
  tile?: number;
  spec: ChestSpec;
  /** 鍵開け済み */
  unlocked: boolean;
  /** 開けた後の中身（開ける前は undefined） */
  contents?: Loot[];
  /** 抽選された中身の格（開ける前は undefined） */
  grade?: Rarity;
  /** 判定の結果（演出用） */
  lastRoll?: ChestRoll;
  /** 戦闘の後に見つけた隠し宝箱（マスには残らない） */
  hidden?: boolean;
}

export interface ChestRoll {
  kind: 'lock' | 'luck';
  heroId: string;
  results: ('focus' | 'hit' | 'miss')[];
  success: boolean;
  trap?: string;
  /** 運の判定: スロット前の確率と、成功数で上へずれた後の確率（%・格の順） */
  oddsBefore?: number[];
  odds?: number[];
  /** 運の判定: 抽選された格と、その格が出る確率（%） */
  grade?: Rarity;
  gradeChance?: number;
  /** 先読み予告（レジェンドのときだけ一定の確率で出る） */
  omen?: boolean;
}

export interface EventCheck {
  stat: StatId;
  slots: number;
  /** 成功に必要な成功数 */
  need: number;
  /** 判定の種類（探索の特殊能力のボーナス対象） */
  tag?: string;
}

/**
 * 冒険の効果の種類ごとの数値。冒険の効果のファイル（src/engine/game/outcomes/kinds/）が declare module で種類を足す
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OutcomeParams {}
/** イベントの結果・戦闘の外で使うアイテムなど（例: { kind: 'heal', amount: 25, all: true }） */
export type EventOutcome = { [K in keyof OutcomeParams]: { kind: K } & OutcomeParams[K] }[keyof OutcomeParams];

export interface EventOption {
  label: string;
  /** この選択肢を出すのに必要な探索の特殊能力のタグ */
  requiresTag?: string;
  /** 必要なゴールド */
  cost?: number;
  check?: EventCheck;
  success: EventOutcome[];
  fail?: EventOutcome[];
  successText: string;
  failText?: string;
}

export interface EventDef {
  id: string;
  /** どこで起きるか（省略はダンジョンの部屋） */
  where?: 'dungeon' | 'map';
  /** 夜だけ起きる */
  night?: boolean;
  title: string;
  text: string;
  icon: string;
  options: EventOption[];
}

export interface EventState {
  /** ダンジョンの部屋のイベントなら部屋ID、世界マップのイベントならマスの番号 */
  roomId?: string;
  tile?: number;
  eventId: string;
  /** 選んだ結果（選ぶ前は undefined） */
  result?: { optionIndex: number; heroId?: string; results?: ('focus' | 'hit' | 'miss')[]; success: boolean; text: string; loot: Loot[] };
}

export interface GrowthOption {
  /** 成長ボーナスの種類（src/engine/game/growth/kinds の種類） */
  kind: string;
  stat?: StatId;
  amount: number;
}

export interface RewardState {
  gold: number;
  /** キャラごとの経験値（演出用に、前後の値も持つ） */
  exp: { heroId: string; gained: number; fromLevel: number; toLevel: number; fromExp: number; toExp: number }[];
  /** 未選択のレベルアップ（先頭から順に選ぶ） */
  levelUps: { heroId: string; level: number; options: GrowthOption[] }[];
  /** カード報酬（3枚から1枚） */
  cardOffers: { cardId: string; heroId: string }[];
  /** カード報酬の格の確率（%・コモン/レア/エピック。表示用） */
  cardOdds?: number[];
  cardPicked: boolean;
  /** ドロップ品（自動で持ち物に入る。表示用） */
  loot: Loot[];
  /** 戦闘後に見つけた隠し宝箱 */
  hiddenChest?: ChestSpec;
}

export type GameMode = 'hub' | 'world' | 'encounter' | 'town' | 'shrine' | 'dungeon' | 'battle' | 'reward' | 'chest' | 'event' | 'rest' | 'gameover' | 'cleared' | 'ending';

export interface AdventureStats {
  battlesWon: number;
  dungeonsCleared: number;
  chestsOpened: number;
  bestRarity?: Rarity;
  totalDamage: number;
  perfects: number;
}

export interface GameLog {
  id: number;
  text: string;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  scenarioId: string;
  difficulty: Difficulty;
  heroes: Hero[];
  gold: number;
  /** 装備していない装備品（パーティ共有） */
  stash: ItemInstance[];
  /** 消費アイテムの袋（パーティ共有・上限あり） */
  pouch: ItemInstance[];
  mode: GameMode;
  dungeon?: DungeonRun;
  battle?: BattleState;
  reward?: RewardState;
  chest?: ChestState;
  event?: EventState;
  /** 撃破したダンジョンのID */
  clearedDungeons: string[];
  /** 拠点で選べるランダムダンジョンの種（拠点に戻るたびに変わる） */
  randomDungeonSeed: number;
  stats: AdventureStats;
  log: GameLog[];
  nextUid: number;
  nextLogId: number;
  /** 命の灯火（パーティ共有の残機。spec §11.4） */
  lives: number;
  /** 世界マップ（シナリオにマップがある時） */
  world?: WorldState;
  /** 今の場面に参加しているキャラ（ダンジョン・遭遇の戦闘。無ければ全員） */
  party?: string[];
  /** 今の戦闘の背景 */
  battleBackground?: string;
  /** 今の戦闘の情報（どこで・何と） */
  battleInfo?: { roomType: string; wandererId?: string; tile?: number };
  encounter?: EncounterState;
  town?: TownVisit;
  shrine?: ShrineVisit;
}

/** 難易度のID（src/content の difficulties に登録したもの） */
export type Difficulty = string;

export interface DifficultyDef {
  id: string;
  order?: number;
  name: string;
  /** 敵のレベルの加算 */
  enemyLevel: number;
  /** 命の灯火の数（spec §11.4） */
  lives: number;
  /** 敵のHP・攻撃、戦闘の報酬（経験値・ゴールド）の倍率（省略は1） */
  enemyHp?: number;
  enemyAttack?: number;
  reward?: number;
  /** 説明文（省略すると数値から自動で作る） */
  description?: string;
}

export interface NewGameSetup {
  seed: number;
  scenarioId: string;
  difficulty: Difficulty;
  party: { classId: string; gender: Gender; name: string; playerId: PlayerId }[];
}

/** 冒険のコマンド（すべて「誰の操作か」を含む） */
export type GameCommand =
  | { type: 'ENTER_DUNGEON'; playerId: PlayerId; dungeonId: string }
  | { type: 'ENTER_ROOM'; playerId: PlayerId; roomId: string }
  | { type: 'BATTLE'; command: Command }
  | { type: 'USE_POUCH_ITEM'; playerId: PlayerId; itemUid: string; userId: string; targetId: string }
  | { type: 'FINISH_BATTLE'; playerId: PlayerId }
  | { type: 'CHOOSE_GROWTH'; playerId: PlayerId; optionIndex: number; cardUid?: string }
  | { type: 'PICK_CARD'; playerId: PlayerId; offerIndex: number | null }
  | { type: 'FINISH_REWARD'; playerId: PlayerId }
  | { type: 'OPEN_CHEST'; playerId: PlayerId; heroId: string; focusUsed: number }
  | { type: 'LEAVE_CHEST'; playerId: PlayerId }
  | { type: 'CHOOSE_EVENT'; playerId: PlayerId; optionIndex: number; heroId?: string; focusUsed: number }
  | { type: 'FINISH_EVENT'; playerId: PlayerId }
  | { type: 'REST'; playerId: PlayerId; kind: 'hp' | 'focus' }
  | { type: 'RETREAT'; playerId: PlayerId }
  | { type: 'RETURN_TO_HUB'; playerId: PlayerId }
  | { type: 'EQUIP'; playerId: PlayerId; heroId: string; itemUid: string }
  | { type: 'UNEQUIP'; playerId: PlayerId; heroId: string; slot: EquipSlot }
  // ---------- 世界マップ（spec §8） ----------
  /** 移動力の判定 */
  | { type: 'WORLD_ROLL_MOVE'; playerId: PlayerId; heroId: string; focusUsed: number }
  /** 移動（同行するキャラも一緒に動く。同行したキャラはこのワールドターンの行動を終える） */
  | { type: 'WORLD_MOVE'; playerId: PlayerId; heroId: string; to: number; companions: string[] }
  | { type: 'WORLD_WAIT'; playerId: PlayerId; heroId: string }
  | { type: 'WORLD_CAMP'; playerId: PlayerId; heroId: string }
  /** 今いるマスの町・祠・イベント・宝箱・ダンジョンに入る */
  | { type: 'WORLD_INTERACT'; playerId: PlayerId; heroId: string; party?: string[] }
  /** 遭遇: 戦う / 奇襲を狙う / 逃げる */
  | { type: 'ENCOUNTER_CHOOSE'; playerId: PlayerId; choice: 'fight' | 'ambush' | 'flee'; heroId: string; focusUsed: number; participants: string[] }
  /** 遭遇の判定の結果を見た後に進む */
  | { type: 'ENCOUNTER_CONTINUE'; playerId: PlayerId; participants: string[] }
  | { type: 'STORY_CONTINUE'; playerId: PlayerId }
  // ---------- 町・祠 ----------
  | { type: 'TOWN_BUY'; playerId: PlayerId; kind: 'item' | 'card'; index: number }
  | { type: 'TOWN_INN'; playerId: PlayerId }
  | { type: 'TOWN_REMOVE_CARD'; playerId: PlayerId; heroId: string; cardUid: string }
  | { type: 'TOWN_SELL'; playerId: PlayerId; itemUid: string }
  | { type: 'QUEST_ACCEPT'; playerId: PlayerId; questId: string }
  | { type: 'QUEST_REPORT'; playerId: PlayerId; questId: string }
  | { type: 'LEAVE_TOWN'; playerId: PlayerId }
  | { type: 'SHRINE_CHOOSE'; playerId: PlayerId; optionIndex: number; heroId: string }
  | { type: 'LEAVE_SHRINE'; playerId: PlayerId };

export interface GameResult {
  state: GameState;
  /** 戦闘中なら戦闘のイベント（演出用） */
  battleEvents: import('./index').BattleEvent[];
  error?: string;
}

// ---------- シナリオ ----------

export interface ScenarioDef {
  id: string;
  /** 一覧での並び順（小さいほど先） */
  order?: number;
  name: string;
  synopsis: string;
  recommended: string;
  playTime: string;
  unlocked: boolean;
  /** 解放条件の説明（未解放の時に表示） */
  unlockText?: string;
  /** 冒険の開始条件 */
  /** 世界マップ（無ければ仮の拠点から遊ぶ） */
  map?: ScenarioMapDef;
  story?: ScenarioStory;
  start: {
    gold?: number;
    /** 最初の消費アイテム */
    pouch?: { itemId: string; count: number }[];
    /** 最初の持ち物（装備品） */
    stash?: { itemId: string; count: number }[];
  };
}
