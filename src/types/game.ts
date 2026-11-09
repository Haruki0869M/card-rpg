// ===== 冒険（ゲーム全体）の型 =====
import type { EncounterState, ScenarioMapDef, ScenarioStory, ShrineVisit, SanctuaryVisit, TownVisit, WorldState } from './world';
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

/** 連れているお供 */
export interface HeroPet {
  petId: string;
  /** 色違いのID */
  color: string;
  name: string;
  /** 懐き度の点数（一緒に歩いたマス・戦闘で増える。♡1〜5の段階は petLoveLevel） */
  love: number;
  /** 戦闘で活躍した回数（戦績に出す） */
  acts: number;
  /** この冒険でもう撫でた（フォーカス+1は1回だけ） */
  patted?: boolean;
  /** 伝承の書のマイペットから呼んだ子（その端末の記録の ID。K5） */
  myPetUid?: string;
  /** この冒険で一緒にダンジョンをクリアした回数（マイペットの登録の条件。K5） */
  dungeonClears?: number;
}

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
  /** 報酬のスマート抽選に使う印（この装備と相性の良いカードが出やすくなる。例: "fire"・"poison"） */
  tags?: string[];
  /** 消費アイテムの効果 */
  use?: ConsumableEffect;
  /** 装備の特殊能力（エピック以上は必ず持つ。spec §12.7） */
  ability?: AbilityDef;
  /** 世界マップでの効果（K2）。vision = 視界+N / campHeal = 野営の回復量の割合を足す（0.25 = +25%） */
  explore?: { vision?: number; campHeal?: number };
  /** このシナリオの冒険でだけ宝箱・ショップに出る（K2/K4。省略は全シナリオ） */
  scenario?: string;
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
  /** 今までのジョブ（転職した順。spec §6.4） */
  jobs?: string[];
  /** 持ち越している戦闘の特殊能力（そのジョブのID） */
  carried?: string;
  /** 転職の条件のための記録（敵を倒した数など。キーは feats の種類） */
  feats?: Record<string, number>;
  /** 転職した直後に選べる専用カード（PICK_JOB_CARD で1枚選ぶ） */
  jobPick?: string[];
  /** 連れているお供（1匹まで） */
  pet?: HeroPet;
  /** この冒険で、もうマイペットを呼んだ（1人1回。K5） */
  myPetCalled?: boolean;
  /** 迎えられるお供の候補（イベントの後。ADOPT_PET で選ぶ） */
  petOffer?: string[];
  /** 候補を出した時点で抽選・保存する毛色。採用時には引き直さない。 */
  petOfferColors?: Record<string, string>;
  /** イベントでカードを1枚選ぶ作業（強化 / 削除 / 変異。CARD_TASK で選ぶ） */
  cardTask?: 'upgrade' | 'remove' | 'mutate';
  /** さすらいの行商人の品物（PEDDLER_BUY で買う） */
  peddler?: { items: { item: ItemInstance; price: number; sold?: boolean }[]; cards: { cardId: string; price: number; sold?: boolean }[] };
  /** 武器に宿った属性（その武器を持っている間だけ） */
  weaponElement?: { uid: string; element: string };
  /** 最後に突発イベントが起きたワールドターン（2手番続けては起きない） */
  lastRandomEvent?: number;
  /** 自分のお金・持ち物（装備していない装備品）・道具袋（M3-C: キャラごと） */
  gold: number;
  stash: ItemInstance[];
  pouch: ItemInstance[];
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
  /** 部屋を選ぶ画面の背景（無ければ background） */
  mapBackground?: string;
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
  /** 制覇した後に出る物語（2〜3行、1行30字まで。何が起きたかを伝える）。最後に鍵の残り数と次の目的地が自動で足される */
  clearStory?: string[];
  /** 入るのに必要な鍵 */
  requiresKeys?: string[];
  /** 制覇すると侵食度がこれだけ下がる（無ければ、鍵のダンジョンは BALANCE.corruptionOnKeyDungeonClear・それ以外は0） */
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
  /** 残りの歩数（この手番で歩ける数。判定前は null。世界マップのあるシナリオだけ。M3-D → 第3段階で「部屋の数」から「歩数」に） */
  explore?: number | null;
  exploreRoll?: ('focus' | 'hit' | 'miss')[];
  /** 通路の地図の上の位置と向き（地図は部屋のつながりから毎回作る。engine/game/dungeonMap.ts） */
  pos?: { x: number; y: number; facing: Facing };
  /** 見たマス（"x,y"。オートマッピング） */
  seen?: string[];
  /** 「周囲の警戒」で気配の分かった部屋（第3段階C1） */
  sensed?: string[];
  /** 「周囲の警戒」を使った通路（今いる部屋のID か 'entrance'。1つの通路で1回だけ） */
  watchedAt?: string;
  /** 最後の「周囲の警戒」の判定（画面に出す） */
  watchRoll?: ('focus' | 'hit' | 'miss')[];
}

/** 向き（0=北・奥 / 1=東 / 2=南 / 3=西） */
export type Facing = 0 | 1 | 2 | 3;

// ---------- 宝箱・イベント・報酬 ----------

export type Loot =
  /** to = 受け取ったキャラ（入れた時に決まる） */
  | { kind: 'item'; item: ItemInstance; to?: string }
  | { kind: 'gold'; amount: number; to?: string[] }
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
  /** 実績を数える用途。能力ボーナスのtagとは分ける。 */
  purpose?: 'mechanism';
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
  /** 場面のだれかがお供を連れている時だけ出す（K7） */
  requiresPet?: boolean;
  /** 必要なゴールド */
  cost?: number;
  /** 必要なフォーカス（選んだキャラが払う） */
  costFocus?: number;
  /** 使う消費アイテム（アイテムのID。持っているキャラが1つ使う） */
  costItem?: string;
  check?: EventCheck;
  success: EventOutcome[];
  fail?: EventOutcome[];
  successText: string;
  failText?: string;
}

export interface EventDef {
  id: string;
  /** どこで起きるか（省略はダンジョンの部屋。random = 世界マップの何もないマスで突然起きる） */
  where?: 'dungeon' | 'map' | 'random';
  /** 突発イベントの出やすさ（省略は10） */
  weight?: number;
  /** 突発イベントの種類（bad = 夜・侵食度が高い時に出やすい） */
  tone?: 'good' | 'bad' | 'pet' | 'shop' | 'battle';
  /** 夜だけ起きる */
  night?: boolean;
  /** 突発イベント: この地形（TerrainDef の id）のマスでだけ起きる（K7） */
  terrain?: string[];
  /** 突発イベント: 移動した仲間のだれかがお供を連れている時だけ起きる（K7） */
  needsPet?: boolean;
  /** 隠しボスの名所（K3 C。where: 'map' と使う）: この地域（地域の id）の空いたマスに必ず1つだけ置く。ふつうのマップのイベントの候補には入れない */
  hiddenIn?: string;
  title: string;
  text: string;
  icon: string;
  options: EventOption[];
}

/** イベントから始まる戦闘（待ち伏せ・黄金のコソ泥・護衛など） */
export interface EventBattle {
  /** 出てくる敵（無ければ今いる地域の敵） */
  enemies?: { defId: string; level?: number }[];
  /** 先制（敵は1ターン目に動けない） */
  surprise?: boolean;
  goldMul?: number;
  onWin?: EventOutcome[];
}

export interface EventState {
  /** ダンジョンの部屋のイベントなら部屋ID、世界マップのイベントならマスの番号 */
  roomId?: string;
  tile?: number;
  eventId: string;
  /** 突発イベント（世界マップを移動中に起きた。終わっても手番は続く） */
  random?: boolean;
  /** イベントの結果で始まる戦闘（「つづける」で始まる） */
  battle?: EventBattle;
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
  /** カード報酬（生き残ったキャラごとに3枚。キャラごとに1枚選べる。M3-C4） */
  cardOffers: { cardId: string; heroId: string }[];
  /** カードを選んだ（または選ばなかった）キャラ */
  cardDone?: string[];
  /** カード報酬の格の確率（%・コモン/レア/エピック。表示用） */
  cardOdds?: number[];
  /** 全員がカードを選び終えた */
  cardPicked: boolean;
  /** ドロップ品（自動で持ち物に入る。表示用） */
  loot: Loot[];
  /** 戦闘後に見つけた隠し宝箱 */
  hiddenChest?: ChestSpec;
  /** 落とした装備の取り合い（2人以上のプレイヤーが生き残った時。M3-C5） */
  claim?: LootClaim;
}

/** 落とした装備の取り合い: 全員が「欲しい / 余れば / いらない」を選び、欲しい人の中で運の判定が一番高い人がもらう */
export interface LootClaim {
  item: ItemInstance;
  /** 選べるキャラ（生き残った参加者） */
  heroes: string[];
  choices: Record<string, 'need' | 'greed' | 'pass'>;
  /** 決まった後: 運の判定（1〜100 ＋ 運の半分）と、もらった人 */
  rolls?: { heroId: string; roll: number }[];
  winner?: string;
}

export type GameMode = 'hub' | 'world' | 'encounter' | 'town' | 'shrine' | 'sanctuary' | 'dungeon' | 'battle' | 'reward' | 'chest' | 'event' | 'rest' | 'gameover' | 'cleared' | 'ending';

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

/**
 * 世界マップと別に進む場面（ダンジョンに入ったキャラたち）。
 * その場面の操作（SCENE コマンド）の間だけ、冒険の dungeon / battle などに載せて、今までと同じ処理で動かす
 */
export interface Expedition {
  id: string;
  heroes: string[];
  mode: GameMode;
  dungeon?: DungeonRun;
  battle?: BattleState;
  reward?: RewardState;
  chest?: ChestState;
  event?: EventState;
  battleInfo?: BattleInfo;
  battleBackground?: string;
  vote?: VoteState;
}

/**
 * みんなで決める操作（M3-C）: 場面にいるプレイヤーがそれぞれ選び、全員そろったら多数決（同じ数なら先頭のキャラの人）。
 * ctx = 選んだ時の場面（部屋・イベントが変わったら無効）
 */
export interface VoteState {
  ctx: string;
  picks: Partial<Record<PlayerId, GameCommand>>;
}

/** 今の戦闘の情報（どこで・何と） */
export interface BattleInfo {
  roomType: string;
  wandererId?: string;
  tile?: number;
  /** 勝った時のお金の倍率（待ち伏せを迎え撃つなど） */
  goldMul?: number;
  /** 勝った時に起きること（護衛を倒してお供を保護するなど） */
  onWin?: EventOutcome[];
  /** 突発イベントの戦闘（終わっても手番は続く） */
  random?: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  scenarioId: string;
  difficulty: Difficulty;
  heroes: Hero[];
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
  battleInfo?: BattleInfo;
  encounter?: EncounterState;
  town?: TownVisit;
  shrine?: ShrineVisit;
  sanctuary?: SanctuaryVisit;
  /** オンライン協力の冒険（戦闘で全員の準備完了を待つ） */
  online?: boolean;
  /** 世界マップと別に進んでいる場面（ダンジョンに入ったキャラたち。M3-C） */
  expeditions?: Expedition[];
  nextExpeditionId?: number;
  /** 内部用: SCENE コマンドを処理している間だけ、その場面のID（保存されない） */
  activeScene?: string;
  /** みんなで決めている途中の選択（世界マップ側の場面。ダンジョンの場面は Expedition に持つ） */
  vote?: VoteState;
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
  /** 世界マップの1巡ごとに増える侵食度（省略は BALANCE.corruptionPerTurn） */
  corruptionPerTurn?: number;
  /** 説明文（省略すると数値から自動で作る） */
  description?: string;
}

export interface NewGameSetup {
  seed: number;
  scenarioId: string;
  difficulty: Difficulty;
  party: { classId: string; gender: Gender; name: string; playerId: PlayerId }[];
  online?: boolean;
}

/** 冒険のコマンド（すべて「誰の操作か」を含む） */
export type GameCommand =
  | { type: 'ENTER_DUNGEON'; playerId: PlayerId; dungeonId: string }
  | { type: 'ENTER_ROOM'; playerId: PlayerId; roomId: string }
  | { type: 'BATTLE'; command: Command }
  | { type: 'USE_POUCH_ITEM'; playerId: PlayerId; itemUid: string; userId: string; targetId: string }
  | { type: 'FINISH_BATTLE'; playerId: PlayerId }
  | { type: 'CHOOSE_GROWTH'; playerId: PlayerId; optionIndex: number; cardUid?: string }
  | { type: 'PICK_CARD'; playerId: PlayerId; offerIndex: number | null; /** 選ばない時: どのキャラの分か（省くと、その人のキャラ全員の分） */ heroId?: string }
  | { type: 'FINISH_REWARD'; playerId: PlayerId }
  /** 転職する（戦闘中以外。spec §6.4） */
  | { type: 'CHANGE_JOB'; playerId: PlayerId; heroId: string; jobId: string }
  | { type: 'PICK_JOB_CARD'; playerId: PlayerId; heroId: string; cardId: string }
  /** お供を迎える（petId を空にすると見送る） */
  | { type: 'ADOPT_PET'; playerId: PlayerId; heroId: string; petId?: string; color?: string; name?: string }
  /** お供を撫でる（野営・休憩部屋。1回の冒険で最初の1回はフォーカス+1） */
  | { type: 'PET_PAT'; playerId: PlayerId; heroId: string }
  /** イベントのカードの作業（cardUid を空にするとやめる） */
  | { type: 'CARD_TASK'; playerId: PlayerId; heroId: string; cardUid?: string }
  /** 行商人の品物を買う（index を省くと店を閉じる） */
  | { type: 'PEDDLER_BUY'; playerId: PlayerId; heroId: string; kind?: 'item' | 'card'; index?: number }
  | { type: 'CLAIM_LOOT'; playerId: PlayerId; heroId: string; choice: 'need' | 'greed' | 'pass' }
  | { type: 'OPEN_CHEST'; playerId: PlayerId; heroId: string; recipientId?: string; focusUsed: number }
  | { type: 'LEAVE_CHEST'; playerId: PlayerId }
  | { type: 'CHOOSE_EVENT'; playerId: PlayerId; optionIndex: number; heroId?: string; focusUsed: number }
  | { type: 'FINISH_EVENT'; playerId: PlayerId }
  | { type: 'REST'; playerId: PlayerId; kind: 'hp' | 'focus' }
  | { type: 'RETREAT'; playerId: PlayerId }
  | { type: 'RETURN_TO_HUB'; playerId: PlayerId }
  | { type: 'EQUIP'; playerId: PlayerId; heroId: string; itemUid: string }
  | { type: 'UNEQUIP'; playerId: PlayerId; heroId: string; slot: EquipSlot }
  /** 同じ場所にいる仲間に、お金か持ち物を渡す */
  | { type: 'GIVE'; playerId: PlayerId; fromHeroId: string; toHeroId: string; itemUid?: string; gold?: number }
  // ---------- 世界マップ（spec §8） ----------
  /** 移動力の判定 */
  | { type: 'WORLD_ROLL_MOVE'; playerId: PlayerId; heroId: string; focusUsed: number }
  /** 移動（同行するキャラも一緒に動く。同行したキャラはこのワールドターンの行動を終える） */
  | { type: 'WORLD_MOVE'; playerId: PlayerId; heroId: string; to: number; companions: string[] }
  /** 他の人のキャラと一緒に動く時: 移動先の提案に同意する / 断る（断ると同行をやめる。M3-D 指摘1） */
  | {
      type: 'WORLD_MOVE_AGREE'; playerId: PlayerId; accept: boolean;
      /** 返事をする担当の、同行しているキャラ（画面から送る時の担当者を決めるだけ。エンジンは playerId で判定する） */
      heroId?: string;
    }
  | { type: 'WORLD_WAIT'; playerId: PlayerId; heroId: string }
  /** 倒れている仲間を助け起こす（同じマスで。手番を使う。M3-C5） */
  | { type: 'WORLD_REVIVE'; playerId: PlayerId; heroId: string; targetId: string }
  | { type: 'WORLD_CAMP'; playerId: PlayerId; heroId: string }
  /** 今いるマスの町・祠・イベント・宝箱・ダンジョンに入る */
  | { type: 'WORLD_INTERACT'; playerId: PlayerId; heroId: string; party?: string[] }
  /** 遭遇: 戦う / 奇襲を狙う / 逃げる */
  | { type: 'ENCOUNTER_CHOOSE'; playerId: PlayerId; choice: 'fight' | 'ambush' | 'flee'; heroId: string; focusUsed: number; participants: string[] }
  /** 遭遇の判定の結果を見た後に進む */
  | { type: 'ENCOUNTER_CONTINUE'; playerId: PlayerId; participants: string[] }
  | { type: 'STORY_CONTINUE'; playerId: PlayerId }
  // ---------- 町・祠 ----------
  | { type: 'TOWN_BUY'; playerId: PlayerId; heroId?: string; kind: 'item' | 'card'; index: number }
  | { type: 'TOWN_INN'; playerId: PlayerId; heroId?: string }
  /** 伝承の書のマイペットを呼ぶ（スタートの町で1人1回・お金。中身はその端末の記録から送る。乱数は使わない。K5） */
  | { type: 'BRING_MY_PET'; playerId: PlayerId; heroId: string; pet: { uid: string; petId: string; color: string; name: string; love: number } }
  | { type: 'TOWN_REMOVE_CARD'; playerId: PlayerId; heroId: string; cardUid: string }
  | { type: 'TOWN_SELL'; playerId: PlayerId; heroId?: string; itemUid: string }
  | { type: 'QUEST_ACCEPT'; playerId: PlayerId; heroId?: string; questId: string }
  | { type: 'QUEST_REPORT'; playerId: PlayerId; heroId?: string; questId: string }
  | { type: 'LEAVE_TOWN'; playerId: PlayerId; heroId?: string }
  | { type: 'SHRINE_CHOOSE'; playerId: PlayerId; optionIndex: number; heroId: string }
  | { type: 'LEAVE_SHRINE'; playerId: PlayerId; heroId?: string }
  | { type: 'LEAVE_SANCTUARY'; playerId: PlayerId; heroId?: string }
  /** 世界マップと別に進んでいる場面（ダンジョン）の中の操作 */
  | { type: 'SCENE'; scene: string; command: GameCommand }
  /** ダンジョンのパーティの手番: 探索力の判定（素早さ）/ 手番を終える */
  | { type: 'EXPLORE_ROLL'; playerId: PlayerId; heroId: string; focusUsed: number }
  | { type: 'EXPLORE_END'; playerId: PlayerId }
  /** ダンジョンの通路を1歩進む（左・右・後ろは、その向きを向いて1歩）。歩くのは手番のキャラの担当の人（第3段階） */
  | { type: 'DUNGEON_STEP'; playerId: PlayerId; heroId: string; dir: 'forward' | 'left' | 'right' | 'back' }
  /** その場で向きを変える（歩数は使わない） */
  | { type: 'DUNGEON_TURN'; playerId: PlayerId; heroId: string; dir: 'left' | 'right' | 'back' }
  /** 周囲の警戒（歩数2。感知の判定。成功1で開けられる扉の場所と気配、完全成功で次の戦闘に応援。第3段階C1） */
  | { type: 'DUNGEON_WATCH'; playerId: PlayerId; heroId: string; focusUsed: number }
  /** 見えているマスまで歩く（歩いた数だけ歩数を使う）。face = 着いた後に向く向き */
  | { type: 'DUNGEON_WALK'; playerId: PlayerId; heroId: string; x: number; y: number; face?: Facing }
  /** みんなで決める操作に1票入れる（command = 選んだ操作。null で取り消し） */
  | { type: 'VOTE'; playerId: PlayerId; command: GameCommand | null }
  /** 遭遇の戦闘に、自分のキャラを加える / 加えない（近くにいる、手番でない人のキャラ） */
  | { type: 'ENCOUNTER_JOIN'; playerId: PlayerId; heroId: string; join: boolean }
  /** 手番のキャラが、同じマスの他の人のキャラを同行に誘う / 誘われた人が答える */
  | { type: 'WORLD_UNFOLLOW'; playerId: PlayerId; heroId: string }
  | { type: 'WORLD_INVITE'; playerId: PlayerId; heroId: string; targetId: string }
  | { type: 'WORLD_INVITE_ANSWER'; playerId: PlayerId; heroId: string; accept: boolean }

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
  /** 選ぶ画面の一枚絵（背景のID。無ければ title） */
  art?: string;
  playTime: string;
  unlocked: boolean;
  /** 解放条件の説明（未解放の時に表示） */
  unlockText?: string;
  /** 4人で遊ぶ時の敵の攻撃倍率（省略すると BALANCE.enemyAttackByPartySize の4人。シナリオごとの難しさの合わせ用） */
  fourPlayerAttack?: number;
  /** 解放の条件（クリア記録で決まる。無ければ従来の unlocked だけで決まる）。K4 */
  unlockRequires?: { cleared: string[] };
  /** 作成中（敵・数値がそろうまで、クリアの記録があっても遊べない。仕上げて登録する時にこの印を外す）。K4 */
  wip?: boolean;
  /** 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉。無ければ TERMS.corruption）。K4 */
  corruptionName?: string;
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
